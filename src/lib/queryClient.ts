// React Query configuration for offline-first caching
import { QueryClient, InvalidateQueryFilters } from '@tanstack/react-query';

/**
 * Query configuration options for different content types
 */
export interface QueryConfig {
  staleTime: number;
  cacheTime: number;
}

/**
 * Custom query options for different content types
 */
export const QUERY_CONFIGS: Record<string, QueryConfig> = {
  // User data - longer cache times
  USER_PROFILE: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Posts - medium cache times
  POSTS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Real-time data - shorter cache times
  MESSAGES: {
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Static data - long cache times
  SPORTS_DATA: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Events - medium-long cache times
  EVENTS: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
};

// Create QueryClient with improved configuration (Fix Issue #6)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh (reduced from 5)
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention time (formerly cacheTime)
      retry: 3, // Retry failed requests 3 times
      networkMode: 'offlineFirst', // Offline-first strategy
      refetchOnWindowFocus: true, // ✅ Refetch on window focus (was false)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: 'always', // ✅ Always refetch on mount (was false)
    },
    mutations: {
      retry: 2, // Retry failed mutations 2 times
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Query key factory type for consistent key management
 */
export type QueryKeyFactory<T extends unknown[] = unknown[]> = (...args: T) => (string | number | undefined)[];

/**
 * Query key factories for consistent key management
 */
export const queryKeys = {
  // User-related queries
  user: (userId: string): string[] => ['user', userId],
  userProfile: (userId: string): string[] => ['user', 'profile', userId],
  userPosts: (userId: string): string[] => ['user', 'posts', userId],
  userFollowers: (userId: string): string[] => ['user', 'followers', userId],
  userFollowing: (userId: string): string[] => ['user', 'following', userId],
  
  // Friends-related queries
  userFriends: (userId: string): string[] => ['friends', 'list', userId],
  friendRequests: (userId: string, type: string): string[] => ['friendRequests', type, userId],
  friendshipStatus: (userId1: string, userId2: string): string[] => ['friendship', 'status', userId1, userId2],
  mutualFriends: (userId1: string, userId2: string): string[] => ['friends', 'mutual', userId1, userId2],
  friendsCount: (userId: string): string[] => ['friends', 'count', userId],
  
  // Groups-related queries
  userGroups: (userId: string): string[] => ['groups', 'user', userId],
  groupDetail: (groupId: string): string[] => ['groups', groupId],
  groupMembers: (groupId: string): string[] => ['groups', groupId, 'members'],
  
  // Posts queries
  posts: (): string[] => ['posts'],
  postsByUser: (userId: string): string[] => ['posts', 'user', userId],
  postDetail: (postId: string): string[] => ['posts', postId],
  postComments: (postId: string): string[] => ['posts', postId, 'comments'],
  
  // Messages queries
  conversations: (userId: string): string[] => ['messages', 'conversations', userId],
  messages: (conversationId: string): string[] => ['messages', conversationId],
  
  // Events queries
  events: (): string[] => ['events'],
  eventsByDate: (date: string): string[] => ['events', 'date', date],
  eventDetail: (eventId: string): string[] => ['events', eventId],
  
  // Sports data queries
  sports: (): string[] => ['sports'],
  athletes: (): string[] => ['athletes'],
  athleteProfile: (athleteId: string): string[] => ['athletes', athleteId],
  
  // Search queries
  searchUsers: (query: string): string[] => ['search', 'users', query],
  searchPosts: (query: string): string[] => ['search', 'posts', query],
} as const;

/**
 * Cache invalidation helpers
 */
export const invalidateQueries = {
  // Invalidate all user-related data
  userData: (userId: string): Promise<void> => {
    return queryClient.invalidateQueries({ 
      queryKey: ['user', userId] 
    } as InvalidateQueryFilters);
  },
  
  // Invalidate posts data
  posts: (): Promise<void> => {
    return queryClient.invalidateQueries({ 
      queryKey: ['posts'] 
    } as InvalidateQueryFilters);
  },
  
  // Invalidate specific post
  post: (postId: string): Promise<void> => {
    return queryClient.invalidateQueries({ 
      queryKey: ['posts', postId] 
    } as InvalidateQueryFilters);
  },
  
  // Invalidate messages
  messages: (userId: string): Promise<void> => {
    return queryClient.invalidateQueries({ 
      queryKey: ['messages', 'conversations', userId] 
    } as InvalidateQueryFilters);
  },
} as const;

export default queryClient;
