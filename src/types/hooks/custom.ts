import { Post, User, Comment, Group, Friend } from '../models';
import { ApiError } from '../api/responses';
import { UpdatePostData, ShareMetadata } from '../models/post';
import { ShareType } from '../../constants/sharing';

// usePostOperations return type
export interface UsePostOperationsReturn {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadPosts: (loadMore?: boolean) => Promise<void>;
  refreshPosts: () => Promise<void>;
  createPost: (postData: {
    text: string;
    mediaFile?: File;
    currentUser: User;
  }) => Promise<void>;
  updatePost: (postId: string, updates: UpdatePostData & { currentUser?: User }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (
    postId: string,
    currentLikes: string[],
    currentUser: User,
    postData?: Post | null
  ) => Promise<void>;
  updatePostShareData: (
    postId: string,
    userId: string,
    shareType: ShareType,
    isAdding?: boolean
  ) => Promise<void>;
  getPostShareInfo: (postId: string) => {
    shares: string[];
    shareCount: number;
    shareMetadata: ShareMetadata;
  } | null;
  hasUserSharedPost: (postId: string, userId: string) => boolean;
}

// usePostQueries return types
export interface UsePostsFeedReturn {
  data: { pages: Array<{ posts: Post[]; nextPageToken: string | null }> } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  refetch: () => Promise<void>;
}

export interface UseUserPostsReturn {
  posts: Post[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export interface UsePostDetailReturn {
  post: Post | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

// useMediaUpload return type
export interface MediaPreview {
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

export interface UseMediaUploadReturn {
  selectedMedia: File | null;
  mediaPreview: MediaPreview | null;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  selectMedia: (file: File) => void;
  removeMedia: () => void;
  uploadMedia: (file: File, userId: string) => Promise<string>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  validateFile: (file: File) => { isValid: boolean; error?: string };
  clearError: () => void;
  reset: () => void;
}

// usePostInteractions return type
export interface UsePostInteractionsReturn {
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string, isLiked: boolean) => Promise<void>;
  sharePost: (postId: string, shareType: ShareType, targets?: string[]) => Promise<void>;
  unsharePost: (postId: string) => Promise<void>;
  isLiking: boolean;
  isSharing: boolean;
  error: string | null;
}

// useNotifications return type
export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'share' | 'follow' | 'mention';
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

// usePerformanceMonitor return type
export interface PerformanceMonitorMetrics {
  apiCalls: Array<{
    name: string;
    duration: number;
    timestamp: Date;
    success: boolean;
  }>;
  renderTimes: Array<{
    component: string;
    duration: number;
    timestamp: Date;
  }>;
  memoryUsage?: {
    used: number;
    total: number;
    timestamp: Date;
  };
}

export interface UsePerformanceMonitorReturn {
  metrics: PerformanceMonitorMetrics;
  measureApiCall: <T>(apiCall: () => Promise<T>, name: string) => Promise<T>;
  measureRender: (component: string, duration: number) => void;
  clearMetrics: () => void;
  getAverageApiTime: (name?: string) => number;
  getAverageRenderTime: (component?: string) => number;
}

// useFriendsManagement return type
export interface UseFriendsManagementReturn {
  friends: Friend[];
  loading: boolean;
  error: string | null;
  loadFriends: (userId: string) => Promise<void>;
  addFriend: (userId: string, friendId: string) => Promise<void>;
  removeFriend: (userId: string, friendId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  sendFriendRequest: (userId: string, targetUserId: string) => Promise<void>;
  getFriendStatus: (userId: string, targetUserId: string) => 'friends' | 'pending' | 'none';
}

// useGroupsManagement return type
export interface UseGroupsManagementReturn {
  groups: Group[];
  loading: boolean;
  error: string | null;
  loadGroups: (userId: string) => Promise<void>;
  createGroup: (groupData: Partial<Group>) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  joinGroup: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string, userId: string) => Promise<void>;
  inviteToGroup: (groupId: string, userIds: string[]) => Promise<void>;
}

// useLazyFriends return type
export interface UseLazyFriendsReturn {
  friends: Friend[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  searchFriends: (query: string) => Friend[];
}

// useLazyGroups return type
export interface UseLazyGroupsReturn {
  groups: Group[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  searchGroups: (query: string) => Group[];
}

// useVideoManager return type
export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  buffered: number;
  error: string | null;
}

export interface UseVideoManagerReturn {
  videoState: VideoState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  reset: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  registerVideo: (videoId: string, videoElement: HTMLVideoElement) => () => void;
}

// useProgressiveLoading return type
export interface UseProgressiveLoadingReturn<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

// useUserQueries return types
export interface UseUserProfileReturn {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export interface UseUserFollowersReturn {
  followers: User[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export interface UseUserFollowingReturn {
  following: User[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}
