/**
 * Advanced Spam Detection Utilities
 * Provides sophisticated spam detection algorithms and patterns
 */

interface SpamAnalysisResult {
    isSpam: boolean;
    confidence: number;
    reasons: string[];
    score: number;
    details?: SpamAnalysisDetails;
}

interface SpamAnalysisDetails {
    characters?: any;
    patterns?: any;
    keywords?: any;
    repetition?: any;
    context?: any;
}

interface SpamReport extends SpamAnalysisResult {
    message: string;
    timestamp: string;
    riskLevel: string;
    recommendations: string[];
    error?: string;
    details?: SpamAnalysisDetails;
    violations?: string[];
}

class SpamDetectionUtils {
    private suspiciousPatterns: RegExp[];
    private spamKeywords: string[];
    private suspiciousCharacterRatios: {
        caps: number;
        numbers: number;
        punctuation: number;
        spaces: number;
    };

    constructor() {
        this.suspiciousPatterns = [
            // URL patterns
            /https?:\/\/[^\s]+/gi,
            // Email patterns
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
            // Phone number patterns
            /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/gi,
            // Cryptocurrency addresses (simplified)
            /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/gi,
            // Excessive emoji patterns
            /[\u{1F600}-\u{1F64F}]{5,}/gu,
            // Repeated characters
            /(.)\1{4,}/gi
        ];

        this.spamKeywords = [
            // Financial spam
            'free money', 'easy money', 'make money fast', 'get rich quick',
            'guaranteed income', 'work from home', 'no experience needed',

            // Urgency spam
            'act now', 'limited time', 'expires today', 'urgent', 'hurry',
            'don\'t wait', 'last chance', 'final notice',

            // Prize/lottery spam
            'you won', 'congratulations', 'winner', 'prize', 'lottery',
            'claim now', 'selected', 'lucky',

            // Medical/health spam
            'lose weight fast', 'miracle cure', 'doctor approved',
            'clinical trial', 'fda approved',

            // Investment spam
            'investment opportunity', 'high returns', 'risk free',
            'guaranteed profit', 'insider information',

            // Social media spam
            'follow for follow', 'like for like', 'subscribe',
            'check out my profile', 'dm me'
        ];

        this.suspiciousCharacterRatios = {
            caps: 0.7,        // More than 70% uppercase
            numbers: 0.5,     // More than 50% numbers
            punctuation: 0.3, // More than 30% punctuation
            spaces: 0.05      // Less than 5% spaces (packed text)
        };
    }

    /**
     * Analyze message for spam characteristics
     */
    analyzeMessage(message: string, context: any = {}): SpamAnalysisResult {
        if (!message || typeof message !== 'string') {
            return {
                isSpam: false,
                confidence: 0,
                reasons: [],
                score: 0
            };
        }

        const analysis: SpamAnalysisResult = {
            isSpam: false,
            confidence: 0,
            reasons: [],
            score: 0,
            details: {}
        };

        // Character analysis
        const charAnalysis = this._analyzeCharacterDistribution(message);
        analysis.details!.characters = charAnalysis;

        if (charAnalysis.violations.length > 0) {
            analysis.score += charAnalysis.violations.length * 10;
            analysis.reasons.push(...charAnalysis.violations);
        }

        // Pattern analysis
        const patternAnalysis = this._analyzeSuspiciousPatterns(message);
        analysis.details!.patterns = patternAnalysis;

        if (patternAnalysis.matches.length > 0) {
            analysis.score += patternAnalysis.matches.length * 15;
            analysis.reasons.push(...patternAnalysis.matches.map(m => `Suspicious pattern: ${m.type}`));
        }

        // Keyword analysis
        const keywordAnalysis = this._analyzeSpamKeywords(message);
        analysis.details!.keywords = keywordAnalysis;

        if (keywordAnalysis.matches.length > 0) {
            analysis.score += keywordAnalysis.matches.length * 20;
            analysis.reasons.push(`Spam keywords detected: ${keywordAnalysis.matches.join(', ')}`);
        }

        // Repetition analysis
        const repetitionAnalysis = this._analyzeRepetition(message);
        analysis.details!.repetition = repetitionAnalysis;

        if (repetitionAnalysis.score > 0) {
            analysis.score += repetitionAnalysis.score;
            analysis.reasons.push(...repetitionAnalysis.violations);
        }

        // Context analysis (if provided)
        if (context.userHistory) {
            const contextAnalysis = this._analyzeUserContext(message, context);
            analysis.details!.context = contextAnalysis;

            if (contextAnalysis.score > 0) {
                analysis.score += contextAnalysis.score;
                analysis.reasons.push(...contextAnalysis.violations);
            }
        }

        // Calculate final confidence and spam determination
        analysis.confidence = Math.min(analysis.score / 100, 1.0);
        analysis.isSpam = analysis.score >= 50; // Threshold for spam classification

        return analysis;
    }

    /**
     * Analyze character distribution in message
     */
    private _analyzeCharacterDistribution(message: string) {
        const length = message.length;
        const violations: string[] = [];

        if (length === 0) {
            return { violations, ratios: {}, counts: {} };
        }

        const counts = {
            uppercase: (message.match(/[A-Z]/g) || []).length,
            lowercase: (message.match(/[a-z]/g) || []).length,
            numbers: (message.match(/[0-9]/g) || []).length,
            punctuation: (message.match(/[^\w\s]/g) || []).length,
            spaces: (message.match(/\s/g) || []).length
        };

        const ratios = {
            caps: counts.uppercase / length,
            numbers: counts.numbers / length,
            punctuation: counts.punctuation / length,
            spaces: counts.spaces / length
        };

        // Check against thresholds
        if (ratios.caps > this.suspiciousCharacterRatios.caps && length > 10) {
            violations.push('Excessive uppercase characters');
        }

        if (ratios.numbers > this.suspiciousCharacterRatios.numbers && length > 10) {
            violations.push('Excessive numeric characters');
        }

        if (ratios.punctuation > this.suspiciousCharacterRatios.punctuation && length > 10) {
            violations.push('Excessive punctuation');
        }

        if (ratios.spaces < this.suspiciousCharacterRatios.spaces && length > 20) {
            violations.push('Suspiciously packed text');
        }

        return { violations, ratios, counts };
    }

    /**
     * Analyze message for suspicious patterns
     */
    private _analyzeSuspiciousPatterns(message: string) {
        // Define match interface
        interface PatternMatch {
            type: string;
            count: number;
            examples: string[];
        }
        const matches: PatternMatch[] = [];

        this.suspiciousPatterns.forEach((pattern, index) => {
            const patternMatches = message.match(pattern);
            if (patternMatches) {
                const patternTypes = [
                    'URL', 'Email', 'Phone', 'Crypto Address',
                    'Excessive Emoji', 'Repeated Characters'
                ];

                matches.push({
                    type: patternTypes[index] || 'Unknown',
                    count: patternMatches.length,
                    examples: patternMatches.slice(0, 3) // First 3 matches
                });
            }
        });

        return { matches };
    }

    /**
     * Analyze message for spam keywords
     */
    private _analyzeSpamKeywords(message: string) {
        const lowerMessage = message.toLowerCase();
        const matches: string[] = [];

        this.spamKeywords.forEach(keyword => {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                matches.push(keyword);
            }
        });

        return { matches, count: matches.length };
    }

    /**
     * Analyze repetition patterns
     */
    private _analyzeRepetition(message: string) {
        const violations: string[] = [];
        let score = 0;

        // Word repetition
        const words = message.toLowerCase().split(/\s+/);
        const wordCounts: Record<string, number> = {};

        words.forEach(word => {
            if (word.length > 2) { // Ignore very short words
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });

        const maxWordCount = Object.values(wordCounts).length > 0 ? Math.max(...Object.values(wordCounts)) : 0;
        if (maxWordCount > 3) {
            violations.push(`Word repeated ${maxWordCount} times`);
            score += (maxWordCount - 3) * 5;
        }

        // Character sequence repetition
        const sequenceMatches = message.match(/(.{2,})\1{2,}/gi);
        if (sequenceMatches) {
            violations.push(`Repeated character sequences detected`);
            score += sequenceMatches.length * 10;
        }

        // Excessive punctuation repetition
        const punctuationMatches = message.match(/[!?]{3,}/g);
        if (punctuationMatches) {
            violations.push('Excessive punctuation repetition');
            score += punctuationMatches.length * 5;
        }

        return { violations, score, wordCounts };
    }

    /**
     * Analyze user context for spam patterns
     */
    private _analyzeUserContext(message: string, context: any) {
        const violations: string[] = [];
        let score = 0;

        const { userHistory = [] } = context;

        // Check for identical or very similar messages
        const similarMessages = userHistory.filter((historyItem: any) => {
            if (!historyItem.message) return false;

            const similarity = this._calculateStringSimilarity(message, historyItem.message);
            return similarity > 0.8; // 80% similarity threshold
        });

        if (similarMessages.length > 0) {
            violations.push(`Similar message sent ${similarMessages.length} times recently`);
            score += similarMessages.length * 15;
        }

        // Check message frequency
        const recentMessages = userHistory.filter((item: any) => {
            const messageTime = new Date(item.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - messageTime.getTime();
            return timeDiff < 300000; // Last 5 minutes
        });

        if (recentMessages.length > 10) {
            violations.push('High message frequency detected');
            score += 25;
        }

        // Check for rapid-fire identical targets
        const recentTargets = userHistory
            .filter((item: any) => {
                const messageTime = new Date(item.timestamp);
                const now = new Date();
                return (now.getTime() - messageTime.getTime()) < 600000; // Last 10 minutes
            })
            .map((item: any) => JSON.stringify(item.targets?.sort() || []))
            .filter((target: string, index: number, arr: string[]) => arr.indexOf(target) !== index);

        if (recentTargets.length > 0) {
            violations.push('Repetitive targeting pattern detected');
            score += 20;
        }

        return { violations, score, similarMessages: similarMessages.length };
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    private _calculateStringSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1,     // deletion
                    matrix[j][i - 1] + 1,     // insertion
                    matrix[j - 1][i - 1] + cost // substitution
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len2][len1]) / maxLen;
    }

    /**
     * Generate spam detection report
     */
    generateReport(message: string, context: any = {}): SpamReport {
        const analysis = this.analyzeMessage(message, context);

        return {
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString(),
            isSpam: analysis.isSpam,
            confidence: Math.round(analysis.confidence * 100),
            score: analysis.score,
            riskLevel: this._getRiskLevel(analysis.score),
            reasons: analysis.reasons, // Inherited from SpamAnalysisResult properties but mapped to violations in usage sometimes? Interface says reasons.
            recommendations: this._getRecommendations(analysis),
            details: analysis.details,
            violations: analysis.reasons // Alias for backward compatibility if needed
        };
    }

    /**
     * Get risk level based on spam score
     */
    private _getRiskLevel(score: number): string {
        if (score >= 80) return 'HIGH';
        if (score >= 50) return 'MEDIUM';
        if (score >= 25) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Get recommendations based on analysis
     */
    private _getRecommendations(analysis: SpamAnalysisResult): string[] {
        const recommendations: string[] = [];

        if (analysis.score >= 50) {
            recommendations.push('Block or flag this message for review');
        } else if (analysis.score >= 25) {
            recommendations.push('Apply additional scrutiny to this user');
        }

        if (analysis.details?.patterns?.matches.length > 0) {
            recommendations.push('Review for suspicious links or contact information');
        }

        if (analysis.details?.repetition?.score > 20) {
            recommendations.push('Monitor user for repetitive behavior');
        }

        if (analysis.details?.context?.score > 15) {
            recommendations.push('Implement temporary rate limiting for this user');
        }

        return recommendations;
    }

    /**
     * Update spam detection patterns (for learning/adaptation)
     */
    updatePatterns(newKeywords: string[] = [], newPatterns: RegExp[] = []): void {
        this.spamKeywords.push(...newKeywords);
        this.suspiciousPatterns.push(...newPatterns);

        // Remove duplicates
        this.spamKeywords = [...new Set(this.spamKeywords)];

        console.log(`Updated spam detection with ${newKeywords.length} keywords and ${newPatterns.length} patterns`);
    }

    /**
     * Get current detection statistics
     */
    getDetectionStats() {
        return {
            keywordCount: this.spamKeywords.length,
            patternCount: this.suspiciousPatterns.length,
            thresholds: this.suspiciousCharacterRatios,
            version: '1.0.0'
        };
    }
}

export default new SpamDetectionUtils();
