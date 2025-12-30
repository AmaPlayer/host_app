/**
 * Share Analytics Service
 * Comprehensive analytics tracking for social sharing functionality
 */

import { supabase } from '../../lib/supabase';
import { SHARE_TYPES } from '../../constants/sharing';

export interface ShareAnalyticsEvent {
    eventType: string;
    sharerId: string;
    postId?: string;
    shareType?: string;
    metadata?: any;
    targetCount?: number;
    hasMessage?: boolean;
    privacy?: string;
    shareId?: string;
    newShareCount?: number;
    processingTime?: number;
    error?: any;
}

class ShareAnalyticsService {
    private analyticsTable = 'share_analytics';

    /**
     * Track share event for analytics
     */
    async trackShareEvent(eventData: ShareAnalyticsEvent): Promise<string | null> {
        try {
            const analyticsEvent = {
                event_type: eventData.eventType,
                sharer_id: eventData.sharerId,
                post_id: eventData.postId,
                share_type: eventData.shareType,
                metadata: {
                    ...eventData.metadata,
                    targetCount: eventData.targetCount,
                    hasMessage: eventData.hasMessage,
                    privacy: eventData.privacy,
                    shareId: eventData.shareId,
                    error: eventData.error,
                    processingTime: eventData.processingTime,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                    platform: this._detectPlatform()
                }
            };

            const { data, error } = await supabase
                .from(this.analyticsTable)
                .insert(analyticsEvent)
                .select('id')
                .single();

            if (error) throw error;

            console.log('📊 Share analytics event tracked:', data.id);
            return data.id;
        } catch (error) {
            console.error('❌ Error tracking share event:', error);
            // Don't throw to avoid breaking the app flow
            return null;
        }
    }

    /**
     * Track share success metrics
     */
    async trackShareSuccess(shareData: any, result: any) {
        const eventData: ShareAnalyticsEvent = {
            eventType: 'share_success',
            postId: shareData.postId,
            sharerId: shareData.sharerId,
            shareType: shareData.shareType,
            targetCount: shareData.targets?.length || 0,
            hasMessage: Boolean(shareData.message && shareData.message.trim()),
            privacy: shareData.privacy,
            shareId: result.shareId,
            newShareCount: result.newShareCount,
            processingTime: result.processingTime || null,
            metadata: {
                originalAuthorId: shareData.originalAuthorId,
                shareContext: shareData.metadata?.shareContext
            }
        };

        return await this.trackShareEvent(eventData);
    }

    /**
     * Track share failure metrics
     */
    async trackShareFailure(shareData: any, error: any) {
        const eventData: ShareAnalyticsEvent = {
            eventType: 'share_failure',
            postId: shareData.postId,
            sharerId: shareData.sharerId,
            shareType: shareData.shareType,
            targetCount: shareData.targets?.length || 0,
            hasMessage: Boolean(shareData.message && shareData.message.trim()),
            error: {
                message: error.message,
                code: error.code || 'unknown',
                type: error.constructor.name
            },
            metadata: {
                originalAuthorId: shareData.originalAuthorId
            }
        };

        return await this.trackShareEvent(eventData);
    }

    /**
     * Track interaction
     */
    async trackShareInteraction(userId: string, action: string, context: any = {}) {
        const eventData: ShareAnalyticsEvent = {
            eventType: 'share_interaction',
            sharerId: userId,
            postId: context.postId,
            metadata: {
                action,
                ...context,
                url: typeof window !== 'undefined' ? window.location.href : '',
                referrer: typeof document !== 'undefined' ? document.referrer : ''
            }
        };

        return await this.trackShareEvent(eventData);
    }

    /**
     * Get post share analytics
     */
    async getPostShareAnalytics(postId: string, options: any = {}) {
        try {
            const { timeRange = 30 } = options; // days

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - timeRange);

            const { data: events, error } = await supabase
                .from(this.analyticsTable)
                .select('*')
                .eq('post_id', postId)
                .gte('created_at', cutoffDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;

            return this._processAnalytics(postId, events || [], timeRange);
        } catch (error) {
            console.error('❌ Error getting post share analytics:', error);
            throw error;
        }
    }

    /**
     * Detect user platform
     */
    _detectPlatform() {
        if (typeof navigator === 'undefined') return 'unknown';
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
            return 'mobile';
        } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Process raw events into analytics stats
     * (Simplified version of original logic)
     */
    _processAnalytics(postId: string, events: any[], timeRange: number) {
        const successfulShares = events.filter(e => e.event_type === 'share_success').length;
        const failedShares = events.filter(e => e.event_type === 'share_failure').length;
        const totalEvents = events.length;

        // Breakdown by type
        const shareBreakdown: Record<string, number> = {
            friends: 0,
            feed: 0,
            groups: 0,
            external: 0
        };

        // Timeline
        const timelineMap = new Map<string, number>();

        // Unique sharers
        const uniqueSharersSet = new Set<string>();

        // Message usage
        let messageCount = 0;
        let totalTargets = 0;

        // Hourly distribution
        const hourlyDistribution = new Array(24).fill(0);

        events.forEach(e => {
            if (e.event_type === 'share_success') {
                // Type
                const type = e.share_type || 'unknown';
                shareBreakdown[type] = (shareBreakdown[type] || 0) + 1;

                // Timeline
                const date = new Date(e.created_at).toISOString().split('T')[0];
                timelineMap.set(date, (timelineMap.get(date) || 0) + 1);

                // Sharer
                if (e.sharer_id) uniqueSharersSet.add(e.sharer_id);

                // Metadata
                if (e.metadata?.hasMessage) messageCount++;
                if (e.metadata?.targetCount) totalTargets += e.metadata.targetCount;

                // Hour
                const hour = new Date(e.created_at).getHours();
                hourlyDistribution[hour]++;
            }
        });

        const shareTimeline = Array.from(timelineMap.entries())
            .map(([date, shares]) => ({ date, shares }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const peakTimes = hourlyDistribution
            .map((count, hour) => ({ hour, count, percentage: successfulShares > 0 ? Math.round((count / successfulShares) * 100) : 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            postId,
            timeRange,
            totalEvents,
            successfulShares,
            failedShares,
            successRate: totalEvents > 0 ? Math.round((successfulShares / totalEvents) * 100) : 0,
            recentEvents: events.slice(0, 10),
            shareBreakdown,
            shareTimeline,
            uniqueSharers: uniqueSharersSet.size,
            averageTargetsPerShare: successfulShares > 0 ? Number((totalTargets / successfulShares).toFixed(1)) : 0,
            messageUsageRate: successfulShares > 0 ? Math.round((messageCount / successfulShares) * 100) : 0,
            shareVelocity: 0, // Simplified
            peakTimes
        };
    }
}

export default new ShareAnalyticsService();
