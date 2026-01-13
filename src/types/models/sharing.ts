import type { Post } from './post';
import type { PrivacyLevel } from '../../constants/sharing';
import { SHARE_TYPES } from '../../constants/sharing';

export type ShareType = typeof SHARE_TYPES[keyof typeof SHARE_TYPES];

/**
 * Data structure for sharing operations
 */
export interface ShareData {
  type: ShareType;
  postId: string;
  targets: string[];
  message: string;
  privacy?: PrivacyLevel;
  originalPost: Post;
}

/**
 * Share operation result
 */
export interface ShareResult {
  success: boolean;
  shareId?: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Share analytics data
 */
export interface ShareAnalytics {
  shareId: string;
  postId: string;
  userId: string;
  shareType: ShareType;
  targetCount: number;
  hasMessage: boolean;
  timestamp: Date;
  success: boolean;
  errorCode?: string;
}

/**
 * Share notification data
 */
export interface ShareNotification {
  id: string;
  postId: string;
  sharerId: string;
  shareType: ShareType;
  targets: string[];
  message?: string;
  timestamp: Date;
  read: boolean;
}

/**
 * Share error context
 */
export interface ShareErrorContext {
  postId: string;
  userId: string;
  shareType: ShareType;
  targets: string[];
  timestamp: Date;
  retryCount: number;
}

/**
 * Share validation result
 */
export interface ShareValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Share rate limit info
 */
export interface ShareRateLimit {
  userId: string;
  sharesInLastMinute: number;
  sharesInLastHour: number;
  sharesInLastDay: number;
  nextAllowedShare: Date | null;
  rateLimited: boolean;
}

/**
 * Share target validation
 */
export interface ShareTargetValidation {
  targetId: string;
  targetType: 'user' | 'group';
  valid: boolean;
  reason?: string;
}

/**
 * Share privacy settings
 */
export interface SharePrivacySettings {
  allowFriendShares: boolean;
  allowGroupShares: boolean;
  allowFeedShares: boolean;
  requireApproval: boolean;
  blockedUsers: string[];
  blockedGroups: string[];
}