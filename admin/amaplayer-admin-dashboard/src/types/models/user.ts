import { Timestamp } from 'firebase/firestore';

/**
 * User role types
 */
export type UserRole = 'athlete' | 'parent' | 'organization' | 'coach';

/**
 * Core User interface representing a user in the system
 */
export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  postsCount: number;
  storiesCount: number;
  followersCount: number;
  followingCount: number;
  followers?: string[];
  following?: string[];
  isVerified: boolean;
  isActive: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | Date | string;
  privacy?: UserPrivacy;
  settings?: UserNotificationSettings;

  // Denormalized athlete fields for efficient querying
  role?: UserRole; // User role: 'athlete', 'parent', 'organization', 'coach'
  sports?: string[]; // Array of sport IDs for querying: ['marathon', 'track', 'swimming']
  sportDetails?: Array<{ id: string; name: string; icon?: string }>; // Full sport objects
  eventTypes?: string[]; // Event/distance types: ['5000m', '10000m', 'marathon']
  position?: string; // Position ID for querying: 'distance-runner', 'sprinter'
  positionName?: string; // Position display name: 'Distance Runner', 'Sprinter'
  subcategory?: string; // Subcategory ID: 'long-distance', 'middle-distance'
  subcategoryName?: string; // Subcategory display name: 'Long Distance', 'Middle Distance'
  specializations?: string[]; // Array of specialization values for querying
  athleteProfile?: any; // Full nested athlete profile (kept for compatibility)

  // Personal details
  dateOfBirth?: string;
  gender?: string;
  height?: string; // in cm
  weight?: string; // in kg
  country?: string;
  state?: string;
  city?: string;
  phone?: string;
  mobile?: string;
  status?: string; // 'active', 'suspended', 'deleted'
  suspension_reason?: string;
}

/**
 * Extended user profile with additional information
 */
export interface UserProfile extends User {
  coverPhoto?: string;
  interests?: string[];
  favoriteTeams?: string[];
  favoriteSports?: string[];
}

/**
 * User privacy settings
 */
export interface UserPrivacy {
  profileVisibility: 'public' | 'friends' | 'private';
  followingVisible: boolean;
  followersVisible: boolean;
}

/**
 * User notification settings
 */
export interface UserNotificationSettings {
  notifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Comprehensive user settings including privacy and notifications
 */
export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    allowMessages: 'everyone' | 'friends' | 'none';
  };
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  storiesCount: number;
  isVerified: boolean;
  joinDate: Timestamp | Date | string;
  lastActive: Timestamp | Date | string;
}

/**
 * Data for creating a new user profile
 */
export interface CreateUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
}

/**
 * Data for updating an existing user profile
 */
export interface UpdateUserData {
  displayName?: string;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  coverPhoto?: string;
  interests?: string[];
  favoriteTeams?: string[];
  favoriteSports?: string[];
  privacy?: Partial<UserPrivacy>;
  settings?: Partial<UserNotificationSettings>;
}

/**
 * User stats update data
 */
export interface UserStatsUpdate {
  postsCount?: number;
  storiesCount?: number;
  followersCount?: number;
  followingCount?: number;
}

/**
 * Result of follow/unfollow operation
 */
export interface ToggleFollowResult {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}
