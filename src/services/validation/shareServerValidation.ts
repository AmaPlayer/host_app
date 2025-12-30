/**
 * Server-Side Share Validation Service
 * Provides comprehensive validation and error handling for share operations
 */

import { supabase } from '../../lib/supabase';
import { SHARE_TYPES, PRIVACY_LEVELS, VALIDATION_RULES } from '../../constants/sharing';
import errorHandler from '../../utils/error/errorHandler';

class ShareServerValidation {
    private validationCache = new Map();
    private cacheTimeout = 2 * 60 * 1000; // 2 minutes

    async validateShareOperation(shareData: any, userId: string) {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate required fields
            if (!shareData.postId || !shareData.sharerId || !shareData.shareType) {
                errors.push('Missing required fields');
            }

            // Validate post exists
            const postValidation = await this.validatePost(shareData.postId);
            if (!postValidation.isValid) errors.push(...postValidation.errors);

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            return {
                isValid: false,
                errors: ['Validation error'],
                warnings: []
            };
        }
    }

    async validatePost(postId: string) {
        // Check Supabase
        const { data, error } = await supabase
            .from('posts')
            .select('id, metadata') // check if sharing_disabled is in metadata
            .eq('id', postId)
            .single();

        if (error || !data) {
            return { isValid: false, errors: ['Post not found'] };
        }

        // Check if sharing is disabled
        if (data.metadata?.sharing_disabled) {
            return { isValid: false, errors: ['Sharing disabled for this post'] };
        }

        return { isValid: true, errors: [] };
    }
}

export default new ShareServerValidation();
