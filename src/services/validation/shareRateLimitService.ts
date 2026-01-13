/**
 * Share Rate Limiting and Spam Prevention Service
 * Handles rate limiting, spam detection, and cooldown periods for sharing
 */

import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { COLLECTIONS, RATE_LIMITS, ERROR_MESSAGES } from '../../constants/sharing';
import spamDetectionUtils from './spamDetectionUtils';

export interface RateLimitCheckResult {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    limitType?: string;
    current?: number;
    max?: number;
    spamType?: string;
    spamDetails?: any;
    cooldownType?: string;
}

interface RateLimitData {
    minute: number[];
    hour: number[];
    day: number[];
    lastUpdated: number;
}

interface SpamDetectionData {
    recentPosts: Array<{ postId: string, timestamp: number }>;
    recentTargets: Array<{ targets: string, timestamp: number }>;
    recentMessages: Array<{ message: string, timestamp: number }>;
    lastUpdated: number;
}

interface CooldownData {
    type: string;
    reason: string;
    startedAt: number;
    expiresAt: number;
    duration: number;
}

class ShareRateLimitService {
    private rateLimitCache: Map<string, RateLimitData>;
    private spamDetectionCache: Map<string, SpamDetectionData>;
    private cooldownCache: Map<string, CooldownData>;
    private cacheCleanupInterval: number;

    constructor() {
        this.rateLimitCache = new Map();
        this.spamDetectionCache = new Map();
        this.cooldownCache = new Map();
        this.cacheCleanupInterval = 60000; // 1 minute

        // Start cache cleanup
        this.startCacheCleanup();
    }

    /**
     * Check if user can perform a share action
     */
    async checkRateLimit(userId: string, action: string = 'share', context: any = {}): Promise<RateLimitCheckResult> {
        try {
            // Check if user is in cooldown
            const cooldownCheck = this.checkCooldown(userId);
            if (!cooldownCheck.allowed) {
                return cooldownCheck;
            }

            // Check minute-based rate limit
            const minuteCheck = await this.checkMinuteRateLimit(userId, action);
            if (!minuteCheck.allowed) {
                return minuteCheck;
            }

            // Check hour-based rate limit
            const hourCheck = await this.checkHourRateLimit(userId, action);
            if (!hourCheck.allowed) {
                return hourCheck;
            }

            // Check daily rate limit
            const dailyCheck = await this.checkDailyRateLimit(userId, action);
            if (!dailyCheck.allowed) {
                return dailyCheck;
            }

            // Check for spam patterns
            const spamCheck = await this.checkSpamPatterns(userId, context);
            if (!spamCheck.allowed) {
                return spamCheck;
            }

            // All checks passed
            return { allowed: true };

        } catch (error) {
            console.error('❌ Error checking rate limit:', error);
            // Fail safe - allow the action but log the error
            return { allowed: true };
        }
    }

    /**
     * Record a share action for rate limiting
     */
    async recordShareAction(userId: string, action: string = 'share', context: any = {}): Promise<void> {
        try {
            const now = Date.now();
            const key = `${userId}_${action}`;

            // Update in-memory cache
            if (!this.rateLimitCache.has(key)) {
                this.rateLimitCache.set(key, {
                    minute: [],
                    hour: [],
                    day: [],
                    lastUpdated: now
                });
            }

            const userLimits = this.rateLimitCache.get(key)!;
            userLimits.minute.push(now);
            userLimits.hour.push(now);
            userLimits.day.push(now);
            userLimits.lastUpdated = now;

            // Clean old entries
            this.cleanUserLimitEntries(userLimits, now);

            // Update persistent storage for cross-session tracking
            await this.updatePersistentRateLimits(userId, action, context);

            // Update spam detection data
            this.updateSpamDetection(userId, context);

        } catch (error) {
            console.error('❌ Error recording share action:', error);
        }
    }

    /**
     * Check minute-based rate limit
     */
    async checkMinuteRateLimit(userId: string, action: string): Promise<RateLimitCheckResult> {
        const key = `${userId}_${action}`;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const maxActions = RATE_LIMITS.SHARES_PER_MINUTE;

        if (!this.rateLimitCache.has(key)) {
            return { allowed: true };
        }

        const userLimits = this.rateLimitCache.get(key)!;
        const windowStart = now - windowMs;

        // Count actions in the current minute
        const recentActions = userLimits.minute.filter(timestamp => timestamp > windowStart);

        if (recentActions.length >= maxActions) {
            const oldestAction = Math.min(...recentActions);
            const retryAfter = Math.ceil((oldestAction + windowMs - now) / 1000);

            return {
                allowed: false,
                reason: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
                retryAfter,
                limitType: 'minute',
                current: recentActions.length,
                max: maxActions
            };
        }

        return { allowed: true };
    }

    /**
     * Check hour-based rate limit
     */
    async checkHourRateLimit(userId: string, action: string): Promise<RateLimitCheckResult> {
        const key = `${userId}_${action}`;
        const now = Date.now();
        const windowMs = 60 * 60 * 1000; // 1 hour
        const maxActions = RATE_LIMITS.SHARES_PER_HOUR;

        if (!this.rateLimitCache.has(key)) {
            return { allowed: true };
        }

        const userLimits = this.rateLimitCache.get(key)!;
        const windowStart = now - windowMs;

        const recentActions = userLimits.hour.filter(timestamp => timestamp > windowStart);

        if (recentActions.length >= maxActions) {
            const oldestAction = Math.min(...recentActions);
            const retryAfter = Math.ceil((oldestAction + windowMs - now) / 1000);

            return {
                allowed: false,
                reason: `Hourly share limit exceeded (${maxActions} per hour)`,
                retryAfter,
                limitType: 'hour',
                current: recentActions.length,
                max: maxActions
            };
        }

        return { allowed: true };
    }

    /**
     * Check daily rate limit
     */
    async checkDailyRateLimit(userId: string, action: string): Promise<RateLimitCheckResult> {
        const key = `${userId}_${action}`;
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000; // 24 hours
        const maxActions = RATE_LIMITS.SHARES_PER_DAY;

        if (!this.rateLimitCache.has(key)) {
            return { allowed: true };
        }

        const userLimits = this.rateLimitCache.get(key)!;
        const windowStart = now - windowMs;

        const recentActions = userLimits.day.filter(timestamp => timestamp > windowStart);

        if (recentActions.length >= maxActions) {
            const oldestAction = Math.min(...recentActions);
            const retryAfter = Math.ceil((oldestAction + windowMs - now) / 1000);

            return {
                allowed: false,
                reason: `Daily share limit exceeded (${maxActions} per day)`,
                retryAfter,
                limitType: 'day',
                current: recentActions.length,
                max: maxActions
            };
        }

        return { allowed: true };
    }

    /**
     * Check for spam patterns using advanced detection
     */
    async checkSpamPatterns(userId: string, context: any): Promise<RateLimitCheckResult> {
        try {
            const spamKey = `spam_${userId}`;
            const now = Date.now();

            if (!this.spamDetectionCache.has(spamKey)) {
                this.spamDetectionCache.set(spamKey, {
                    recentPosts: [],
                    recentTargets: [],
                    recentMessages: [],
                    lastUpdated: now
                });
            }

            const spamData = this.spamDetectionCache.get(spamKey)!;

            // Basic pattern checks (existing logic)
            const basicChecks = await this._performBasicSpamChecks(spamData, context, now);
            if (!basicChecks.allowed) {
                return basicChecks;
            }

            // Advanced message analysis if message is provided
            if (context.message && context.message.length > 5) {
                // Assuming spamDetectionUtils.analyzeMessage exists from previous steps
                const messageAnalysis = spamDetectionUtils.analyzeMessage(context.message, {
                    userHistory: this._getUserHistoryForAnalysis(spamData)
                });

                if (messageAnalysis.isSpam) {
                    // Apply cooldown based on spam confidence
                    const cooldownDuration = this._calculateSpamCooldown(messageAnalysis.confidence);
                    this.applyCooldown(userId, 'spam_detection', cooldownDuration,
                        `Spam detected: ${messageAnalysis.reasons.join(', ')}`);

                    return {
                        allowed: false,
                        reason: 'Message flagged as potential spam. Please review your content.',
                        spamType: 'content_analysis',
                        spamDetails: {
                            confidence: messageAnalysis.confidence,
                            score: messageAnalysis.score,
                            violations: messageAnalysis.reasons
                        }
                    };
                }

                // Apply warning for medium-risk content
                if (messageAnalysis.score >= 25) {
                    console.warn(`⚠️ Medium-risk content detected for user ${userId}:`, {
                        score: messageAnalysis.score,
                        reasons: messageAnalysis.reasons
                    });
                }
            }

            // Check for behavioral spam patterns
            const behaviorCheck = await this._checkBehavioralSpamPatterns(userId, spamData, context, now);
            if (!behaviorCheck.allowed) {
                return behaviorCheck;
            }

            return { allowed: true };

        } catch (error) {
            console.error('❌ Error checking spam patterns:', error);
            return { allowed: true };
        }
    }

    /**
     * Perform basic spam pattern checks
     */
    async _performBasicSpamChecks(spamData: SpamDetectionData, context: any, now: number): Promise<RateLimitCheckResult> {
        // Check for rapid sharing of the same post
        if (context.postId) {
            const recentSamePosts = spamData.recentPosts.filter(
                entry => entry.postId === context.postId && (now - entry.timestamp) < 300000 // 5 minutes
            );

            if (recentSamePosts.length >= 3) {
                return {
                    allowed: false,
                    reason: 'Detected rapid sharing of the same post. Please wait before sharing again.',
                    spamType: 'duplicate_post'
                };
            }
        }

        // Check for sharing to the same targets repeatedly
        if (context.targets && Array.isArray(context.targets)) {
            const targetString = context.targets.sort().join(',');
            const recentSameTargets = spamData.recentTargets.filter(
                entry => entry.targets === targetString && (now - entry.timestamp) < 600000 // 10 minutes
            );

            if (recentSameTargets.length >= 5) {
                return {
                    allowed: false,
                    reason: 'Detected repetitive sharing to the same recipients. Please vary your sharing.',
                    spamType: 'duplicate_targets'
                };
            }
        }

        // Check for identical messages
        if (context.message && context.message.length > 10) {
            const recentSameMessages = spamData.recentMessages.filter(
                entry => entry.message === context.message && (now - entry.timestamp) < 1800000 // 30 minutes
            );

            if (recentSameMessages.length >= 3) {
                return {
                    allowed: false,
                    reason: 'Detected repetitive sharing with identical messages. Please vary your messages.',
                    spamType: 'duplicate_message'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Check behavioral spam patterns
     */
    async _checkBehavioralSpamPatterns(userId: string, spamData: SpamDetectionData, context: any, now: number): Promise<RateLimitCheckResult> {
        // Check for burst sharing behavior
        const recentActivity = [
            ...spamData.recentPosts,
            ...spamData.recentTargets,
            ...spamData.recentMessages
        ].filter(entry => (now - entry.timestamp) < 300000); // Last 5 minutes

        if (recentActivity.length >= 10) {
            const cooldownDuration = 300000; // 5 minutes
            this.applyCooldown(userId, 'burst_activity', cooldownDuration,
                'Excessive sharing activity detected');

            return {
                allowed: false,
                reason: 'Sharing too rapidly. Please slow down and try again later.',
                spamType: 'burst_activity'
            };
        }

        // Check for suspicious timing patterns (e.g., exactly timed intervals)
        if (spamData.recentPosts.length >= 3) {
            const intervals: number[] = [];
            for (let i = 1; i < spamData.recentPosts.length; i++) {
                intervals.push(spamData.recentPosts[i - 1].timestamp - spamData.recentPosts[i].timestamp);
            }

            // Check if intervals are suspiciously regular (within 1 second of each other)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const regularIntervals = intervals.filter(interval =>
                Math.abs(interval - avgInterval) < 1000
            );

            if (regularIntervals.length >= 3) {
                return {
                    allowed: false,
                    reason: 'Automated sharing behavior detected. Please share manually.',
                    spamType: 'automated_behavior'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Get user history formatted for spam analysis
     */
    _getUserHistoryForAnalysis(spamData: SpamDetectionData) {
        const history: any[] = [];

        // Convert recent messages to analysis format
        spamData.recentMessages.forEach(entry => {
            history.push({
                message: entry.message,
                timestamp: entry.timestamp,
                targets: [] // Cant easily link back targets, using empty for now
            });
        });

        return history;
    }

    /**
     * Calculate cooldown duration based on spam confidence
     */
    _calculateSpamCooldown(confidence: number): number {
        if (confidence >= 0.9) return 3600000; // 1 hour for high confidence
        if (confidence >= 0.7) return 1800000; // 30 minutes for medium-high
        if (confidence >= 0.5) return 600000;  // 10 minutes for medium
        return 300000; // 5 minutes for low-medium
    }

    /**
     * Check if user is in cooldown period
     */
    checkCooldown(userId: string): RateLimitCheckResult {
        const cooldownKey = `cooldown_${userId}`;

        if (this.cooldownCache.has(cooldownKey)) {
            const cooldownData = this.cooldownCache.get(cooldownKey)!;
            const now = Date.now();

            if (now < cooldownData.expiresAt) {
                const retryAfter = Math.ceil((cooldownData.expiresAt - now) / 1000);

                return {
                    allowed: false,
                    reason: `Account temporarily restricted due to ${cooldownData.reason}. Please wait.`,
                    retryAfter,
                    cooldownType: cooldownData.type
                };
            } else {
                // Cooldown expired, remove it
                this.cooldownCache.delete(cooldownKey);
            }
        }

        return { allowed: true };
    }

    /**
     * Apply cooldown to user
     */
    applyCooldown(userId: string, type: string, durationMs: number, reason: string): void {
        const cooldownKey = `cooldown_${userId}`;
        const now = Date.now();

        this.cooldownCache.set(cooldownKey, {
            type,
            reason,
            startedAt: now,
            expiresAt: now + durationMs,
            duration: durationMs
        });

        console.log(`🚫 Applied ${type} cooldown to user ${userId} for ${durationMs}ms: ${reason}`);
    }

    /**
     * Update spam detection data
     */
    updateSpamDetection(userId: string, context: any): void {
        const spamKey = `spam_${userId}`;
        const now = Date.now();

        if (!this.spamDetectionCache.has(spamKey)) {
            this.spamDetectionCache.set(spamKey, {
                recentPosts: [],
                recentTargets: [],
                recentMessages: [],
                lastUpdated: now
            });
        }

        const spamData = this.spamDetectionCache.get(spamKey)!;

        // Add current action to spam detection data
        if (context.postId) {
            spamData.recentPosts.push({
                postId: context.postId,
                timestamp: now
            });

            // Keep only recent entries (last hour)
            spamData.recentPosts = spamData.recentPosts.filter(
                entry => (now - entry.timestamp) < 3600000
            );
        }

        if (context.targets) {
            const targetString = Array.isArray(context.targets)
                ? context.targets.sort().join(',')
                : context.targets;

            spamData.recentTargets.push({
                targets: targetString,
                timestamp: now
            });

            spamData.recentTargets = spamData.recentTargets.filter(
                entry => (now - entry.timestamp) < 3600000
            );
        }

        if (context.message && context.message.length > 10) {
            spamData.recentMessages.push({
                message: context.message,
                timestamp: now
            });

            spamData.recentMessages = spamData.recentMessages.filter(
                entry => (now - entry.timestamp) < 3600000
            );
        }

        spamData.lastUpdated = now;
    }

    /**
     * Update persistent rate limit data in Firestore
     */
    async updatePersistentRateLimits(userId: string, action: string, context: any): Promise<void> {
        try {
            const userStatsRef = doc(db, COLLECTIONS.USERS, userId);
            const now = new Date();
            const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentHour = now.getHours();

            // Update user's share statistics
            await updateDoc(userStatsRef, {
                [`shareStats.${action}.total`]: increment(1),
                [`shareStats.${action}.today.${today}`]: increment(1),
                [`shareStats.${action}.hourly.${currentHour}`]: increment(1),
                [`shareStats.lastShareAt`]: serverTimestamp(),
                [`shareStats.lastAction`]: action
            });

        } catch (error) {
            console.error('❌ Error updating persistent rate limits:', error);
        }
    }

    /**
     * Clean old entries from user limit data
     */
    cleanUserLimitEntries(userLimits: RateLimitData, now: number): void {
        const minuteWindow = 60 * 1000;
        const hourWindow = 60 * 60 * 1000;
        const dayWindow = 24 * 60 * 60 * 1000;

        userLimits.minute = userLimits.minute.filter(
            timestamp => (now - timestamp) < minuteWindow
        );

        userLimits.hour = userLimits.hour.filter(
            timestamp => (now - timestamp) < hourWindow
        );

        userLimits.day = userLimits.day.filter(
            timestamp => (now - timestamp) < dayWindow
        );
    }

    /**
     * Get user's current rate limit status
     */
    async getUserRateLimitStatus(userId: string, action: string = 'share'): Promise<any> {
        try {
            const key = `${userId}_${action}`;
            const now = Date.now();

            if (!this.rateLimitCache.has(key)) {
                return {
                    minute: { current: 0, max: RATE_LIMITS.SHARES_PER_MINUTE, remaining: RATE_LIMITS.SHARES_PER_MINUTE },
                    hour: { current: 0, max: RATE_LIMITS.SHARES_PER_HOUR, remaining: RATE_LIMITS.SHARES_PER_HOUR },
                    day: { current: 0, max: RATE_LIMITS.SHARES_PER_DAY, remaining: RATE_LIMITS.SHARES_PER_DAY },
                    cooldown: null
                };
            }

            const userLimits = this.rateLimitCache.get(key)!;

            // Clean old entries first
            this.cleanUserLimitEntries(userLimits, now);

            // Calculate current usage
            const minuteUsage = userLimits.minute.length;
            const hourUsage = userLimits.hour.length;
            const dayUsage = userLimits.day.length;

            // Check cooldown status
            const cooldownCheck = this.checkCooldown(userId);

            return {
                minute: {
                    current: minuteUsage,
                    max: RATE_LIMITS.SHARES_PER_MINUTE,
                    remaining: Math.max(0, RATE_LIMITS.SHARES_PER_MINUTE - minuteUsage)
                },
                hour: {
                    current: hourUsage,
                    max: RATE_LIMITS.SHARES_PER_HOUR,
                    remaining: Math.max(0, RATE_LIMITS.SHARES_PER_HOUR - hourUsage)
                },
                day: {
                    current: dayUsage,
                    max: RATE_LIMITS.SHARES_PER_DAY,
                    remaining: Math.max(0, RATE_LIMITS.SHARES_PER_DAY - dayUsage)
                },
                cooldown: cooldownCheck.allowed ? null : {
                    active: true,
                    reason: cooldownCheck.reason,
                    retryAfter: cooldownCheck.retryAfter
                }
            };

        } catch (error) {
            console.error('❌ Error getting rate limit status:', error);
            return null;
        }
    }

    /**
     * Reset user's rate limits (admin function)
     */
    async resetUserRateLimits(userId: string, action: string | null = null): Promise<boolean> {
        try {
            if (action) {
                const key = `${userId}_${action}`;
                this.rateLimitCache.delete(key);
            } else {
                // Reset all actions for user
                const keysToDelete: string[] = [];
                for (const key of this.rateLimitCache.keys()) {
                    if (key.startsWith(`${userId}_`)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this.rateLimitCache.delete(key));
            }

            // Clear cooldowns
            this.cooldownCache.delete(`cooldown_${userId}`);

            // Clear spam detection
            this.spamDetectionCache.delete(`spam_${userId}`);

            console.log(`✅ Reset rate limits for user ${userId}${action ? ` (action: ${action})` : ''}`);
            return true;

        } catch (error) {
            console.error('❌ Error resetting rate limits:', error);
            return false;
        }
    }

    /**
     * Start cache cleanup interval
     */
    startCacheCleanup(): void {
        setInterval(() => {
            this.cleanupCaches();
        }, this.cacheCleanupInterval);
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCaches(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        // Clean rate limit cache
        for (const [key, data] of this.rateLimitCache.entries()) {
            if (now - data.lastUpdated > maxAge) {
                this.rateLimitCache.delete(key);
            } else {
                this.cleanUserLimitEntries(data, now);
            }
        }

        // Clean spam detection cache
        for (const [key, data] of this.spamDetectionCache.entries()) {
            if (now - data.lastUpdated > maxAge) {
                this.spamDetectionCache.delete(key);
            }
        }

        // Clean expired cooldowns
        for (const [key, data] of this.cooldownCache.entries()) {
            if (now >= data.expiresAt) {
                this.cooldownCache.delete(key);
            }
        }
    }

    /**
     * Generate spam detection report for a message
     */
    generateSpamReport(userId: string, message: string, context: any = {}): any {
        try {
            const spamKey = `spam_${userId}`;
            const spamData = this.spamDetectionCache.get(spamKey) || {
                recentMessages: [],
                recentPosts: [],
                recentTargets: [],
                lastUpdated: Date.now()
            };

            const userHistory = this._getUserHistoryForAnalysis(spamData);

            return spamDetectionUtils.generateReport(message, {
                userHistory,
                userId,
                ...context
            });
        } catch (error) {
            console.error('❌ Error generating spam report:', error);
            return {
                message: message?.substring(0, 100) || '',
                timestamp: new Date().toISOString(),
                isSpam: false,
                confidence: 0,
                error: 'Failed to generate report'
            };
        }
    }

    getCacheStats() {
        return {
            rateLimitCacheSize: this.rateLimitCache.size,
            spamDetectionCacheSize: this.spamDetectionCache.size,
            cooldownCacheSize: this.cooldownCache.size
        };
    }

    /**
     * Get spam detection statistics for monitoring
     */
    getSpamDetectionStats(timeframe: 'hour' | 'day' | 'week' = 'day'): any {
        const now = Date.now();
        const timeframes = {
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000
        };

        const windowMs = timeframes[timeframe] || timeframes.day;
        const windowStart = now - windowMs;

        let totalChecks = 0;
        let spamDetected = 0;
        let cooldownsApplied = 0;
        const spamTypes: Record<string, number> = {};

        // Analyze spam detection cache
        for (const [key, data] of this.spamDetectionCache.entries()) {
            if (data.lastUpdated > windowStart) {
                totalChecks++;

                // Count recent activity as potential spam checks
                const recentActivity = [
                    ...data.recentPosts,
                    ...data.recentTargets,
                    ...data.recentMessages
                ].filter(entry => entry.timestamp > windowStart);

                totalChecks += recentActivity.length;
            }
        }

        // Analyze cooldown cache for spam-related cooldowns
        for (const [key, data] of this.cooldownCache.entries()) {
            if (data.startedAt > windowStart && data.type.includes('spam')) {
                cooldownsApplied++;
                spamTypes[data.type] = (spamTypes[data.type] || 0) + 1;
            }
        }

        return {
            timeframe,
            period: {
                start: new Date(windowStart).toISOString(),
                end: new Date(now).toISOString()
            },
            totalChecks,
            spamDetected,
            cooldownsApplied,
            spamTypes,
            detectionRate: totalChecks > 0 ? (spamDetected / totalChecks) * 100 : 0,
            cacheStats: this.getCacheStats()
        };
    }

    /**
     * Update spam detection patterns (admin function)
     */
    updateSpamDetectionPatterns(newKeywords: string[] = [], newPatterns: RegExp[] = []): boolean {
        try {
            spamDetectionUtils.updatePatterns(newKeywords, newPatterns);
            return true;
        } catch (e) {
            console.error('Error updating patterns', e);
            return false;
        }
    }
}

export default new ShareRateLimitService();
