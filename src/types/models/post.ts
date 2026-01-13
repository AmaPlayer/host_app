import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user';

/**
 * Media type for posts
 */
export type MediaType = 'image' | 'video';

/**
 * Video crop data for 1:1 square posts
 * Coordinates are normalized (0-1) for display flexibility
 */
export interface VideoCropData {
  x: number;        // Normalized 0-1 (left position)
  y: number;        // Normalized 0-1 (top position)
  width: number;    // Normalized 0-1
  height: number;   // Normalized 0-1
  aspectRatio: 1;   // Always 1:1 for posts
}

/**
 * Post visibility options
 */
export type PostVisibility = 'public' | 'friends' | 'private';

/**
 * Core Post interface representing a post in the system
 */
export interface Post {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  userRole?: UserRole;
  userSport?: string;
  userPosition?: string;
  userPlayerType?: string;
  userOrganizationType?: string;
  userSpecializations?: string[];
  caption: string;
  mediaUrl?: string | null;
  mediaType?: MediaType;
  mediaMetadata?: MediaMetadata;
  mediaSettings?: {
    // Legacy format (for old posts)
    objectFit?: 'cover' | 'contain';
    objectPosition?: string;
    // New format (for videos with crop data)
    cropData?: VideoCropData;
    aspectRatio?: number;
  };
  // Video-specific fields for moments feed compatibility
  videoUrl?: string | null;
  type?: 'image' | 'video' | 'text';
  duration?: number; // Video duration in seconds
  videoDuration?: number; // Alternative video duration field
  mediaUrls?: string[]; // Array of media URLs
  timestamp: Timestamp | Date | string;
  editedAt?: Timestamp | Date | string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  likes: Like[];
  likesCount: number;
  comments: Comment[];
  commentsCount: number;
  shares: string[];
  sharesCount: number;
  shareCount?: number;
  shareMetadata?: ShareMetadata;
  metadata?: any;
  visibility: PostVisibility;
  location?: string;
  tags?: string[];
  isActive: boolean;
  deletedAt?: string;
  // User interaction states (computed fields)
  isLiked?: boolean;
  hasShared?: boolean;
  sharingDisabled?: boolean;
  // Repost specific fields
  isRepost?: boolean;
  sharerId?: string;
  sharerName?: string;
  sharerPhotoURL?: string | null;
  originalPostId?: string;
  originalPost?: Post; // Recursively contain the original post data
}

/**
 * Media metadata for uploaded files
 */
export interface MediaMetadata {
  size: number;
  type: string;
  name: string;
  uploadedAt: string;
  thumbnail?: string;
  durationFormatted?: string;
}

/**
 * Like data structure
 */
export interface Like {
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  timestamp: string;
}

/**
 * Comment interface for post comments
 */
export interface Comment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  timestamp: Timestamp | Date | string;
  likes: string[] | Like[];
  replies?: Comment[];
  likesCount?: number;
}

/**
 * Share metadata tracking share statistics
 */
export interface ShareMetadata {
  lastSharedAt: Date | string;
  shareBreakdown: {
    friends: number;
    feeds: number;
    groups: number;
  };
}

/**
 * Data for creating a new post
 */
export interface CreatePostData {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  caption: string;
  mediaFile?: File;
  mediaUrl?: string | null;
  mediaMetadata?: any;
  mediaType?: MediaType;
  type?: 'image' | 'video' | 'text';
  duration?: number; // Video duration in seconds
  visibility?: PostVisibility;
  location?: string;
  tags?: string[];
  timestamp?: Timestamp | Date | string;
}

/**
 * Data for updating an existing post
 */
export interface UpdatePostData {
  caption?: string;
  visibility?: PostVisibility;
  location?: string;
  tags?: string[];
}

/**
 * Data for adding a comment to a post
 */
export interface CreateCommentData {
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
}

/**
 * Data for updating a comment
 */
export interface UpdateCommentData {
  text: string;
}

/**
 * Result of like/unlike operation
 */
export interface ToggleLikeResult {
  liked: boolean;
  likesCount: number;
}

/**
 * Post with user information populated
 */
export interface PopulatedPost extends Post {
  user?: {
    id: string;
    displayName: string;
    photoURL: string | null;
    isVerified: boolean;
  };
}
