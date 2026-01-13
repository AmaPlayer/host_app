/**
 * Constants for Social Sharing Feature
 */

// Share Types
export const SHARE_TYPES = {
  FRIENDS: 'friends',
  FEED: 'feed',
  GROUPS: 'groups'
} as const;

export type ShareType = typeof SHARE_TYPES[keyof typeof SHARE_TYPES];

// Share Tabs
export const SHARE_TABS = {
  FRIENDS: 'friends',
  FEED: 'feed',
  GROUPS: 'groups'
} as const;

export type ShareTab = typeof SHARE_TABS[keyof typeof SHARE_TABS];

// Privacy Levels
export const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private'
} as const;

export type PrivacyLevel = typeof PRIVACY_LEVELS[keyof typeof PRIVACY_LEVELS];

// Friend Status
export const FRIEND_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked'
} as const;

export type FriendStatus = typeof FRIEND_STATUS[keyof typeof FRIEND_STATUS];

// Group Privacy
export const GROUP_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const;

export type GroupPrivacy = typeof GROUP_PRIVACY[keyof typeof GROUP_PRIVACY];

// Group Posting Permissions
export const GROUP_POSTING_PERMISSIONS = {
  ALL: 'all',
  ADMINS: 'admins',
  APPROVED: 'approved'
} as const;

export type GroupPostingPermission = typeof GROUP_POSTING_PERMISSIONS[keyof typeof GROUP_POSTING_PERMISSIONS];

// User Status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away'
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Collection Names
export const COLLECTIONS = {
  SHARES: 'shares',
  GROUPS: 'groups',
  FRIENDSHIPS: 'friendships',
  POSTS: 'posts',
  USERS: 'users',
  NOTIFICATIONS: 'notifications'
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// Rate Limiting
export const RATE_LIMITS = {
  SHARES_PER_MINUTE: 5,
  SHARES_PER_HOUR: 50,
  SHARES_PER_DAY: 200
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

// Cache TTL (Time To Live) in milliseconds
export const CACHE_TTL = {
  FRIENDS_LIST: 5 * 60 * 1000, // 5 minutes
  GROUPS_LIST: 10 * 60 * 1000, // 10 minutes
  SHARE_COUNTS: 2 * 60 * 1000, // 2 minutes
  SHARE_ANALYTICS: 15 * 60 * 1000 // 15 minutes
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;

// UI Constants
export const UI_CONSTANTS = {
  MODAL_ANIMATION_DURATION: 200,
  SHARE_SUCCESS_DISPLAY_DURATION: 3000,
  SEARCH_DEBOUNCE_DELAY: 300,
  PAGINATION_SIZE: 20
} as const;

export type UIConstantKey = keyof typeof UI_CONSTANTS;

// Error Messages
export const ERROR_MESSAGES = {
  SHARE_FAILED: 'Failed to share post. Please try again.',
  PERMISSION_DENIED: 'You do not have permission to share this post.',
  RATE_LIMIT_EXCEEDED: 'You are sharing too frequently. Please wait before sharing again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  INVALID_TARGET: 'Invalid share destination. Please select valid friends or groups.',
  POST_NOT_FOUND: 'The post you are trying to share no longer exists.',
  USER_NOT_FOUND: 'User not found.',
  GROUP_NOT_FOUND: 'Group not found.',
  FRIENDSHIP_NOT_FOUND: 'Friendship not found.'
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type ErrorMessage = typeof ERROR_MESSAGES[ErrorMessageKey];

// Success Messages
export const SUCCESS_MESSAGES = {
  SHARED_TO_FRIENDS: 'Post shared with friends successfully!',
  SHARED_TO_FEED: 'Post shared to your feed successfully!',
  SHARED_TO_GROUPS: 'Post shared to groups successfully!',
  SHARE_REMOVED: 'Share removed successfully.'
} as const;

export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
export type SuccessMessage = typeof SUCCESS_MESSAGES[SuccessMessageKey];

// Notification Types for Sharing
export const NOTIFICATION_TYPES = {
  SHARE_TO_FRIEND: 'share_to_friend',
  SHARE_TO_GROUP: 'share_to_group',
  POST_SHARED: 'post_shared'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Analytics Event Types
export const ANALYTICS_EVENTS = {
  SHARE_BUTTON_CLICKED: 'share_button_clicked',
  SHARE_MODAL_OPENED: 'share_modal_opened',
  SHARE_COMPLETED: 'share_completed',
  SHARE_CANCELLED: 'share_cancelled',
  SHARE_FAILED: 'share_failed'
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Validation Rules
export const VALIDATION_RULES = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_GROUP_NAME_LENGTH: 100,
  MAX_GROUP_DESCRIPTION_LENGTH: 500,
  MIN_GROUP_ADMINS: 1,
  MAX_FRIENDS_PER_SHARE: 50,
  MAX_GROUPS_PER_SHARE: 10
} as const;

export type ValidationRuleKey = keyof typeof VALIDATION_RULES;
