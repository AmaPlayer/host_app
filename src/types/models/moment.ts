import { Timestamp } from 'firebase/firestore';

/**
 * Video quality options for moments
 */
export type VideoQuality = 'low' | 'medium' | 'high' | 'auto';

/**
 * Video moderation status
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Core MomentVideo interface representing a video moment in the system
 */
export interface MomentVideo {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  duration: number; // Duration in seconds
  metadata: VideoMetadata;
  engagement: VideoEngagement;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  isActive: boolean;
  moderationStatus: ModerationStatus;
  // User interaction states (computed fields)
  isLiked?: boolean;
  hasShared?: boolean;
  // Flag to identify if this is a verified talent video
  isTalentVideo?: boolean;
  // Flag to identify if this is a post video (from posts collection)
  isPostVideo?: boolean;
}

/**
 * Video metadata for uploaded video files
 */
export interface VideoMetadata {
  width: number;
  height: number;
  fileSize: number;
  format: string;
  bitrate?: number;
  frameRate?: number;
  aspectRatio: string; // e.g., "9:16", "16:9"
  uploadedAt: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  qualityVersions?: VideoQualityVersion[];
}

/**
 * Video quality versions for adaptive streaming
 */
export interface VideoQualityVersion {
  quality: VideoQuality;
  url: string;
  bitrate: number;
  resolution: string; // e.g., "720p", "1080p"
  fileSize: number;
}

/**
 * Video engagement data structure
 */
export interface VideoEngagement {
  likes: VideoLike[];
  likesCount: number;
  comments: VideoComment[];
  commentsCount: number;
  shares: string[]; // Array of user IDs who shared
  sharesCount: number;
  views: number;
  watchTime: number; // Total watch time in seconds across all users
  completionRate: number; // Percentage of users who watched to completion
}

/**
 * Like data structure for videos
 */
export interface VideoLike {
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  timestamp: string;
}

/**
 * Comment interface for video comments
 */
export interface VideoComment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  timestamp: Timestamp | Date | string;
  likes: string[] | VideoLike[];
  replies?: VideoComment[];
  likesCount?: number;
}

/**
 * User interaction tracking for moments
 */
export interface MomentInteraction {
  momentId: string;
  userId: string;
  type: 'view' | 'like' | 'comment' | 'share' | 'watch_complete';
  timestamp: Timestamp | Date | string;
  metadata?: {
    watchTime?: number; // For view tracking in seconds
    watchPercentage?: number; // Percentage of video watched
    commentId?: string; // For comment interactions
    platform?: string; // For share interactions
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    networkType?: 'wifi' | 'cellular' | 'unknown';
  };
}

/**
 * Video player state interface
 */
export interface VideoPlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  isLoading: boolean;
  hasError: boolean;
  quality: VideoQuality;
  volume: number; // 0-1
  playbackRate: number; // 0.5, 1, 1.25, 1.5, 2
}

/**
 * Data for creating a new moment video
 */
export interface CreateMomentData {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  caption: string;
  videoFile: File;
  thumbnailFile?: File;
  duration?: number;
}

/**
 * Data for updating an existing moment
 */
export interface UpdateMomentData {
  caption?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  metadata?: VideoMetadata;
  moderationStatus?: ModerationStatus;
  isActive?: boolean;
}

/**
 * Data for adding a comment to a moment
 */
export interface CreateVideoCommentData {
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
}

/**
 * Data for updating a video comment
 */
export interface UpdateVideoCommentData {
  text: string;
}

/**
 * Result of like/unlike operation on video
 */
export interface ToggleVideoLikeResult {
  liked: boolean;
  likesCount: number;
}

/**
 * Video upload result
 */
export interface VideoUploadResult {
  videoUrl: string;
  thumbnailUrl: string;
  metadata: VideoMetadata;
}

/**
 * Enhanced video upload result with progress metadata
 */
export interface EnhancedVideoUploadResult extends VideoUploadResult {
  uploadDuration: number;
  bytesTransferred: number;
  totalBytes: number;
}

/**
 * Upload progress callback function signature
 */
export type UploadProgressCallback = (
  progress: number,
  bytesTransferred: number,
  totalBytes: number
) => void;

/**
 * Video processing status
 */
export interface VideoProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  message?: string;
  estimatedTimeRemaining?: number; // seconds
}

/**
 * Moments feed query options
 */
export interface MomentsQueryOptions {
  includeEngagementMetrics?: boolean;
  currentUserId?: string;
  limit?: number;
  page?: number;
  startAfter?: any; // DocumentSnapshot
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  userId?: string; // Filter by specific user
  moderationStatus?: ModerationStatus;
}

/**
 * Paginated moments result
 */
export interface PaginatedMomentsResult {
  moments: MomentVideo[];
  lastDocument: any | null; // DocumentSnapshot
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Video analytics data
 */
export interface VideoAnalytics {
  momentId: string;
  totalViews: number;
  uniqueViews: number;
  totalWatchTime: number; // seconds
  averageWatchTime: number; // seconds
  completionRate: number; // percentage
  engagementRate: number; // (likes + comments + shares) / views
  topRegions: Array<{
    region: string;
    views: number;
    percentage: number;
  }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  peakViewingTimes: Array<{
    hour: number;
    views: number;
  }>;
}

/**
 * Video feed preferences for personalization
 */
export interface VideoFeedPreferences {
  userId: string;
  preferredCategories?: string[];
  blockedUsers?: string[];
  contentFilters: {
    showExplicitContent: boolean;
    minimumQuality: VideoQuality;
    autoPlayEnabled: boolean;
    soundEnabled: boolean;
  };
  algorithmWeights: {
    recency: number; // 0-1
    engagement: number; // 0-1
    similarity: number; // 0-1
    following: number; // 0-1
  };
}

/**
 * Video error types
 */
export interface VideoError {
  code: string;
  message: string;
  type: 'network' | 'format' | 'permission' | 'storage' | 'processing';
  recoverable: boolean;
  retryAfter?: number; // seconds
}

/**
 * Moment with user information populated
 */
export interface PopulatedMoment extends MomentVideo {
  user?: {
    id: string;
    displayName: string;
    photoURL: string | null;
    isVerified: boolean;
    followersCount?: number;
  };
}