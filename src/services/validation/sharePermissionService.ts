/**
 * Share Permission Validation Service
 * Handles privacy checking, permission validation, and content filtering for shares
 */

import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, PRIVACY_LEVELS, ERROR_MESSAGES } from '../../constants/sharing';
import { Post } from '../../types/models/post';
import friendsService from '../api/friendsService';
import groupsService from '../supabase/groupsService';

export interface PermissionCheckResult {
    canShare: boolean;
    reason?: string;
    allowedTargets: string[];
    post?: Post;
}

export interface FriendValidationResult {
    validFriends: string[];
    invalidFriends: string[];
}

export interface GroupValidationResult {
    validGroups: string[];
    invalidGroups: string[];
    groupPermissions: Record<string, { canPost: boolean; userRole?: string; reason?: string }>;
}

export interface MessageFilterResult {
    filteredMessage: string;
    hasViolations: boolean;
    violations: string[];
}

export interface ContentTypeValidationResult {
    hasPermission: boolean;
    reason?: string;
}

interface SpamCheckResult {
    isSpam: boolean;
    violations: string[];
}

interface ContentCheckResult {
    hasViolations: boolean;
    violations: string[];
    filteredContent: string;
}

class SharePermissionService {
    private contentFilterCache: Map<string, any>;
    private permissionCache: Map<string, any>;
    // @ts-ignore - unused but kept for potential future use
    private cacheTimeout: number;

    constructor() {
        this.contentFilterCache = new Map();
        this.permissionCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if a post can be shared by a user
     */
    async validatePostSharingPermissions(postId: string, userId: string): Promise<PermissionCheckResult> {
        try {
            // Get post data
            const postRef = doc(db, COLLECTIONS.POSTS, postId);
            const postDoc = await getDoc(postRef);

            if (!postDoc.exists()) {
                return {
                    canShare: false,
                    reason: ERROR_MESSAGES.POST_NOT_FOUND,
                    allowedTargets: []
                };
            }

            const post = { id: postDoc.id, ...postDoc.data() } as unknown as Post;

            // Check basic sharing permissions based on post privacy
            const privacyCheck = await this._checkPostPrivacyPermissions(post, userId);
            if (!privacyCheck.canShare) {
                return privacyCheck;
            }

            // Check if post author has disabled sharing
            if (post.sharingDisabled === true) {
                return {
                    canShare: false,
                    reason: 'The author has disabled sharing for this post',
                    allowedTargets: []
                };
            }

            // Check if user is blocked by post author
            const isBlocked = await this._checkIfUserBlocked(post.userId, userId);
            if (isBlocked) {
                return {
                    canShare: false,
                    reason: 'You cannot share posts from this user',
                    allowedTargets: []
                };
            }

            // Determine allowed share targets based on post privacy and user relationship
            const allowedTargets = await this._determineAllowedShareTargets(post, userId);

            return {
                canShare: true,
                allowedTargets,
                post
            };

        } catch (error) {
            console.error('❌ Error validating post sharing permissions:', error);
            return {
                canShare: false,
                reason: 'Error checking permissions',
                allowedTargets: []
            };
        }
    }

    /**
     * Validate friend relationships for sharing
     */
    async validateFriendRelationships(userId: string, friendIds: string[]): Promise<FriendValidationResult> {
        try {
            const validFriends: string[] = [];
            const invalidFriends: string[] = [];

            // Check each friend relationship
            for (const friendId of friendIds) {
                try {
                    // Check if friendship exists and is active using areFriends
                    const areFriends = await friendsService.areFriends(userId, friendId);

                    if (areFriends) {
                        // Check if friend allows receiving shares
                        const friendAllowsShares = await this._checkFriendSharingPreferences(friendId);

                        if (friendAllowsShares) {
                            validFriends.push(friendId);
                        } else {
                            invalidFriends.push(friendId);
                        }
                    } else {
                        invalidFriends.push(friendId);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error validating friendship with ${friendId}:`, error);
                    invalidFriends.push(friendId);
                }
            }

            return { validFriends, invalidFriends };

        } catch (error) {
            console.error('❌ Error validating friend relationships:', error);
            return { validFriends: [], invalidFriends: friendIds };
        }
    }

    /**
     * Validate group posting permissions
     */
    async validateGroupPermissions(userId: string, groupIds: string[]): Promise<GroupValidationResult> {
        try {
            const validGroups: string[] = [];
            const invalidGroups: string[] = [];
            const groupPermissions: Record<string, { canPost: boolean; userRole?: string; reason?: string }> = {};

            for (const groupId of groupIds) {
                try {
                    const group = await groupsService.getGroupDetails(groupId);
                    if (!group) {
                        invalidGroups.push(groupId);
                        groupPermissions[groupId] = { canPost: false, reason: 'Group not found' };
                        continue;
                    }

                    const isMember = await groupsService.isMember(userId, groupId);
                    // Determine if user can post based on group settings and membership
                    // This is a simplified logic as GroupsService doesn't expose granular permissions yet
                    const canPost = isMember || group.privacy === 'public';

                    if (canPost) {
                        validGroups.push(groupId);
                        groupPermissions[groupId] = {
                            canPost: true,
                            userRole: isMember ? 'member' : 'guest' // Simplified role
                        };
                    } else {
                        invalidGroups.push(groupId);
                        groupPermissions[groupId] = {
                            canPost: false,
                            reason: 'You do not have permission to post in this group'
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️ Error validating group permission for ${groupId}:`, error);
                    invalidGroups.push(groupId);
                    groupPermissions[groupId] = {
                        canPost: false,
                        reason: 'Error checking group permissions'
                    };
                }
            }

            return { validGroups, invalidGroups, groupPermissions };

        } catch (error) {
            console.error('❌ Error validating group permissions:', error);
            return {
                validGroups: [],
                invalidGroups: groupIds,
                groupPermissions: {}
            };
        }
    }

    /**
     * Filter and sanitize share message content
     */
    async filterShareMessage(message: string, options: any = {}): Promise<MessageFilterResult> {
        try {
            if (!message || typeof message !== 'string') {
                return {
                    filteredMessage: '',
                    hasViolations: false,
                    violations: []
                };
            }

            const violations: string[] = [];
            let filteredMessage = message.trim();

            // Check message length
            if (filteredMessage.length > 500) {
                filteredMessage = filteredMessage.substring(0, 500);
                violations.push('Message truncated to 500 characters');
            }

            // Check for spam patterns
            const spamCheck = this._detectSpamPatterns(filteredMessage);
            if (spamCheck.isSpam) {
                violations.push(...spamCheck.violations);
            }

            // Check for inappropriate content
            const contentCheck = await this._checkInappropriateContent(filteredMessage);
            if (contentCheck.hasViolations) {
                violations.push(...contentCheck.violations);
                filteredMessage = contentCheck.filteredContent;
            }

            // Remove excessive whitespace and normalize
            filteredMessage = this._normalizeMessage(filteredMessage);

            return {
                filteredMessage,
                hasViolations: violations.length > 0,
                violations
            };

        } catch (error) {
            console.error('❌ Error filtering share message:', error);
            return {
                filteredMessage: message?.substring(0, 500) || '',
                hasViolations: true,
                violations: ['Error processing message']
            };
        }
    }

    /**
     * Check if user has permission to share specific content type
     */
    async validateContentTypePermissions(userId: string, contentType: string, contentData: any): Promise<ContentTypeValidationResult> {
        try {
            // Check user's sharing permissions
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                return {
                    hasPermission: false,
                    reason: ERROR_MESSAGES.USER_NOT_FOUND
                };
            }

            const userData = userDoc.data();
            const sharingSettings = userData.sharingSettings || {};

            // Check if user has disabled sharing entirely
            if (sharingSettings.sharingDisabled === true) {
                return {
                    hasPermission: false,
                    reason: 'Sharing is disabled for your account'
                };
            }

            // Check content-type specific permissions
            switch (contentType) {
                case 'media':
                    if (sharingSettings.allowMediaSharing === false) {
                        return {
                            hasPermission: false,
                            reason: 'Media sharing is disabled for your account'
                        };
                    }
                    break;

                case 'external_link':
                    if (sharingSettings.allowLinkSharing === false) {
                        return {
                            hasPermission: false,
                            reason: 'Link sharing is disabled for your account'
                        };
                    }
                    break;

                default:
                    // Allow other content types by default
                    break;
            }

            return { hasPermission: true };

        } catch (error) {
            console.error('❌ Error validating content type permissions:', error);
            return {
                hasPermission: false,
                reason: 'Error checking content permissions'
            };
        }
    }

    // Private helper methods

    /**
     * Check post privacy permissions
     */
    private async _checkPostPrivacyPermissions(post: Post, userId: string): Promise<PermissionCheckResult> {
        // User can always share their own posts (unless explicitly disabled)
        if (post.userId === userId) {
            return {
                canShare: true,
                allowedTargets: ['friends', 'feed', 'groups']
            };
        }

        // Check based on post privacy level
        switch (post.visibility) {
            case PRIVACY_LEVELS.PUBLIC:
                return {
                    canShare: true,
                    allowedTargets: ['friends', 'feed', 'groups']
                };

            case PRIVACY_LEVELS.FRIENDS: {
                // Check if sharer is friends with post author
                const areFriends = await friendsService.areFriends(userId, post.userId);
                if (areFriends) {
                    return {
                        canShare: true,
                        allowedTargets: ['friends'] // Friends-only posts can only be shared to friends
                    };
                } else {
                    return {
                        canShare: false,
                        reason: 'You can only share posts from your friends',
                        allowedTargets: []
                    };
                }
            }

            case PRIVACY_LEVELS.PRIVATE:
                return {
                    canShare: false,
                    reason: 'Private posts cannot be shared',
                    allowedTargets: []
                };

            default:
                return {
                    canShare: false,
                    reason: 'Unknown privacy level',
                    allowedTargets: []
                };
        }
    }

    /**
     * Check if user is blocked by post author
     */
    private async _checkIfUserBlocked(authorId: string, userId: string): Promise<boolean> {
        // This would check a blocks collection in a real implementation
        // For now, return false (no blocking system implemented)
        return false;
    }

    /**
     * Determine allowed share targets based on post and user relationship
     */
    private async _determineAllowedShareTargets(post: Post, userId: string): Promise<string[]> {
        const targets: string[] = [];

        // Check if user can share to friends
        if (post.visibility === PRIVACY_LEVELS.PUBLIC ||
            (post.visibility === PRIVACY_LEVELS.FRIENDS && await friendsService.areFriends(userId, post.userId))) {
            targets.push('friends');
        }

        // Check if user can share to their own feed
        if (post.visibility === PRIVACY_LEVELS.PUBLIC ||
            (post.visibility === PRIVACY_LEVELS.FRIENDS && await friendsService.areFriends(userId, post.userId))) {
            targets.push('feed');
        }

        // Check if user can share to groups (only public posts typically)
        if (post.visibility === PRIVACY_LEVELS.PUBLIC) {
            targets.push('groups');
        }

        return targets;
    }

    /**
     * Check friend's sharing preferences
     */
    private async _checkFriendSharingPreferences(friendId: string): Promise<boolean> {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, friendId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                return false;
            }

            const userData = userDoc.data();
            const privacySettings = userData.privacySettings || {};

            // Default to allowing shares if not explicitly disabled
            return privacySettings.allowFriendShares !== false;
        } catch (error) {
            console.error('❌ Error checking friend sharing preferences:', error);
            return false;
        }
    }

    /**
     * Detect spam patterns in message
     */
    private _detectSpamPatterns(message: string): SpamCheckResult {
        const violations: string[] = [];
        const lowerMessage = message.toLowerCase();

        // Check for excessive repetition
        const words = message.split(/\s+/);
        const wordCounts: Record<string, number> = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

        const maxWordCount = Math.max(...Object.values(wordCounts));
        if (maxWordCount > 5) {
            violations.push('Excessive word repetition detected');
        }

        // Check for excessive capitalization
        const capsCount = (message.match(/[A-Z]/g) || []).length;
        const capsRatio = capsCount / message.length;
        if (capsRatio > 0.7 && message.length > 10) {
            violations.push('Excessive capitalization detected');
        }

        // Check for excessive punctuation
        const punctCount = (message.match(/[!?]{3,}/g) || []).length;
        if (punctCount > 0) {
            violations.push('Excessive punctuation detected');
        }

        // Check for common spam phrases
        const spamPhrases = [
            'click here', 'free money', 'limited time', 'act now',
            'guaranteed', 'no risk', 'urgent', 'congratulations you won'
        ];

        const foundSpamPhrases = spamPhrases.filter(phrase =>
            lowerMessage.includes(phrase)
        );

        if (foundSpamPhrases.length > 0) {
            violations.push(`Potential spam content detected: ${foundSpamPhrases.join(', ')}`);
        }

        return {
            isSpam: violations.length > 0,
            violations
        };
    }

    /**
     * Check for inappropriate content
     */
    private async _checkInappropriateContent(message: string): Promise<ContentCheckResult> {
        try {
            // Basic inappropriate content detection
            const violations: string[] = [];
            let filteredContent = message;

            // Simple profanity filter (basic implementation)
            const profanityWords = [
                'badword1', 'badword2'
            ];

            const lowerMessage = message.toLowerCase();
            const foundProfanity = profanityWords.filter(word =>
                lowerMessage.includes(word)
            );

            if (foundProfanity.length > 0) {
                violations.push('Inappropriate language detected');
                // Replace with asterisks
                foundProfanity.forEach(word => {
                    const regex = new RegExp(word, 'gi');
                    filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
                });
            }

            // Check for potential harassment patterns
            const harassmentPatterns = [
                /you\s+(are|r)\s+(stupid|dumb|idiot)/gi,
                /kill\s+yourself/gi,
                /go\s+die/gi
            ];

            const foundHarassment = harassmentPatterns.some(pattern =>
                pattern.test(message)
            );

            if (foundHarassment) {
                violations.push('Potential harassment content detected');
            }

            return {
                hasViolations: violations.length > 0,
                violations,
                filteredContent
            };

        } catch (error) {
            console.error('❌ Error checking inappropriate content:', error);
            return {
                hasViolations: false,
                violations: [],
                filteredContent: message
            };
        }
    }

    /**
     * Normalize message content
     */
    private _normalizeMessage(message: string): string {
        return message
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .trim();
    }

    /**
     * Clear permission cache
     */
    clearCache(): void {
        this.permissionCache.clear();
        this.contentFilterCache.clear();
    }
}

export default new SharePermissionService();
