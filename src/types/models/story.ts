import { Timestamp } from 'firebase/firestore';

/**
 * Media type for stories
 */
export type StoryMediaType = 'image' | 'video';

/**
 * Core Story interface
 */
export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaType: StoryMediaType;
  mediaUrl: string;
  thumbnail?: string | null;
  caption: string;
  timestamp: Timestamp | Date | string;
  expiresAt: Timestamp | Date | string;
  viewCount: number;
  viewers: string[];
  likes?: string[];
  likesCount?: number;
  isHighlight: boolean;
  highlightId: string | null;
  sharingEnabled: boolean;
  publicLink: string;
}

/**
 * Story view record
 */
export interface StoryView {
  storyId: string;
  viewerId: string;
  viewedAt: Timestamp | Date | string;
  viewDuration: number;
}

/**
 * Highlight collection of stories
 */
export interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverImage: string;
  storyIds: string[];
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  isPublic: boolean;
}

/**
 * Data for creating a new story
 */
export interface CreateStoryData {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaFile: File;
  caption?: string;
  mediaType: StoryMediaType;
}

/**
 * Grouped stories by user
 */
export interface UserStories {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  stories: Story[];
  hasUnviewed: boolean;
  latestStoryTimestamp: Timestamp | Date | string;
}

/**
 * Data for creating a highlight
 */
export interface CreateHighlightData {
  userId: string;
  title: string;
  coverImage?: string;
  storyIds?: string[];
}
