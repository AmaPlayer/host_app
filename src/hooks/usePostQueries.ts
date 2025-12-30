// React Query hooks for posts data with offline-first caching
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Post, Comment } from '../types/models';

// Import the enhanced posts service
import postsService from '../services/supabase/postsService';

const queryKeys = {
  posts: () => ['posts'],
  postsByUser: (userId: string) => ['posts', 'user', userId],
  postDetail: (postId: string) => ['posts', 'detail', postId],
  postComments: (postId: string) => ['posts', 'comments', postId],
  searchPosts: (searchTerm: string) => ['posts', 'search', searchTerm]
};

const QUERY_CONFIGS = {
  POSTS: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  }
};

const getUserCacheManager = (userId: string) => null;

interface PaginatedResponse<T> {
  posts?: T[];
  nextPageToken: string | null;
}

interface PostsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface PostQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface InfinitePostsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  limit?: number;
}

interface ShareAnalyticsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface ShareAnalytics {
  totalShares: number;
  shareBreakdown: {
    friends: number;
    feeds: number;
    groups: number;
  };
  timeline: any[];
  topSharers: any[];
  recentShares: any[];
}

interface CacheOperations<T> {
  clearCache: () => Promise<boolean>;
  cacheData: (data: T, key?: string) => Promise<boolean>;
  getCachedData: (key?: string) => Promise<T | null>;
}

interface CreatePostMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UpdatePostMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface DeletePostMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface TogglePostLikeMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface TogglePostShareMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface AddCommentMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

// Hook for getting posts feed with infinite scrolling and enhanced engagement metrics
export const usePostsFeed = (userId: string, options: InfinitePostsQueryOptions = {}) => {
  return useInfiniteQuery<PaginatedResponse<Post>>({
    queryKey: queryKeys.posts(),
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      // Try cache first
      const cacheManager = getUserCacheManager(userId);
      if (!pageParam && cacheManager) {
        const cached = await cacheManager.getCachedUserData('USER_POSTS', 'feed');
        if (cached) {return cached as PaginatedResponse<Post>;
        }
      }

      // Fetch from API with enhanced engagement metrics
      const result = await postsService.getPosts({ 
        limit: options.limit || 10,
        startAfter: pageParam as any,
        includeEngagementMetrics: true,
        currentUserId: userId
      });
      
      // Transform to expected format
      const response: PaginatedResponse<Post> = {
        posts: result.posts,
        nextPageToken: result.lastDocument ? result.lastDocument.id : null
      };
      
      // Cache first page
      if (!pageParam && cacheManager && result.posts) {
        await cacheManager.cacheUserData('USER_POSTS', response, 'feed');
      }
      
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.nextPageToken || null,
    ...QUERY_CONFIGS.POSTS,
    ...options,
  });
};

// Hook for getting posts by specific user with enhanced engagement metrics
export const useUserPosts = (userId: string, currentUserId?: string, options: PostsQueryOptions = {}) => {
  return useQuery<Post[]>({
    queryKey: queryKeys.postsByUser(userId),
    queryFn: async () => {
      const cacheManager = getUserCacheManager(currentUserId || userId);
      if (cacheManager) {
        const cached = await cacheManager.getCachedUserData('USER_POSTS', 'userPosts');
        if (cached) {
          return cached as Post[];
        }
      }

      const posts = await postsService.getUserPosts(userId, (options as any).limit || 20, currentUserId);
      
      if (cacheManager && posts) {
        await cacheManager.cacheUserData('USER_POSTS', posts, 'userPosts');
      }
      
      return posts;
    },
    enabled: !!userId,
    ...QUERY_CONFIGS.POSTS,
    ...options,
  });
};

// Hook for getting following users' posts with enhanced engagement metrics
export const useFollowingPosts = (userId: string, options: PostsQueryOptions = {}) => {
  return useQuery<Post[]>({
    queryKey: ['posts', 'following', userId],
    queryFn: async () => {
      const cacheManager = getUserCacheManager(userId);
      if (cacheManager) {
        const cached = await cacheManager.getCachedUserData('FOLLOWED_CONTENT', 'posts');
        if (cached) {
          return cached as Post[];
        }
      }

      //       const posts = await postsService.getFollowingPosts(userId, (options as any).limit || 20);
      const posts: any[] = []; // Follow system removed
      
      if (cacheManager && posts) {
        await cacheManager.cacheUserData('FOLLOWED_CONTENT', posts, 'posts');
      }
      
      return posts;
    },
    enabled: !!userId,
    ...QUERY_CONFIGS.POSTS,
    ...options,
  });
};

// Hook for getting single post details with enhanced engagement metrics
export const usePostDetail = (postId: string, currentUserId?: string, options: PostQueryOptions = {}) => {
  return useQuery<Post>({
    queryKey: queryKeys.postDetail(postId),
    queryFn: () => postsService.getPostById(postId, currentUserId),
    enabled: !!postId,
    ...QUERY_CONFIGS.POSTS,
    ...options,
  });
};

// Hook for getting post comments (extracted from post data)
export const usePostComments = (postId: string, currentUserId?: string, options: PostsQueryOptions = {}) => {
  return useQuery<Comment[]>({
    queryKey: queryKeys.postComments(postId),
    queryFn: async () => {
      const post = await postsService.getPostById(postId, currentUserId);
      return post?.comments || [];
    },
    enabled: !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes - comments change frequently
    cacheTime: 5 * 60 * 1000, // 5 minutes cache retention
    ...options,
  });
};

// Hook for getting trending posts with enhanced engagement metrics
export const useTrendingPosts = (currentUserId?: string, options: PostsQueryOptions = {}) => {
  return useQuery<Post[]>({
    queryKey: ['posts', 'trending'],
    queryFn: () => postsService.getTrendingPosts((options as any).limit || 20, currentUserId),
    staleTime: 10 * 60 * 1000, // 10 minutes for trending posts
    cacheTime: 15 * 60 * 1000, // 15 minutes cache retention
    ...options,
  });
};

// Hook for searching posts with enhanced engagement metrics
export const useSearchPosts = (searchTerm: string, currentUserId?: string, options: PostsQueryOptions = {}) => {
  return useQuery<Post[]>({
    queryKey: queryKeys.searchPosts(searchTerm),
    queryFn: () => postsService.searchPosts(searchTerm, (options as any).limit || 20, currentUserId),
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 3 * 60 * 1000, // 3 minutes for search results
    cacheTime: 5 * 60 * 1000, // 5 minutes cache retention
    ...options,
  });
};

// Mutation for creating a new post
export const useCreatePost = (userId: string, options: CreatePostMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: (postData: any) => {
      // Placeholder - createPost method not yet implementedreturn Promise.resolve({ ...postData, id: `temp-${Date.now()}` } as Post);
    },
    onSuccess: async (data) => {
      // Invalidate posts queries to refetch with new post
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.postsByUser(userId) });
      
      // Update user-specific cache
      if (cacheManager) {
        await cacheManager.clearUserCache('USER_POSTS');
      }
      
      // Update user posts count
      queryClient.setQueryData(['user', 'profile', userId], (old: any) => ({
        ...old,
        postsCount: (old?.postsCount || 0) + 1,
      }));
    },
    ...options,
  });
};

// Mutation for updating a post
export const useUpdatePost = (userId: string, options: UpdatePostMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: ({ postId, updateData }: { postId: string; updateData: any }) => {
      // Placeholder - updatePost method not yet implementedreturn Promise.resolve({ postId, ...updateData } as Post);
    },
    onMutate: async ({ postId, updateData }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.postDetail(postId) });
      
      const previousPost = queryClient.getQueryData<Post>(queryKeys.postDetail(postId));
      
      queryClient.setQueryData<Post>(queryKeys.postDetail(postId), (old) => ({
        ...old!,
        ...updateData,
        updatedAt: new Date(),
      }));

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Revert optimistic update
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.postDetail(postId), context.previousPost);
      }
    },
    onSettled: async (data, error, { postId }) => {
      // Refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: queryKeys.postDetail(postId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      
      if (cacheManager) {
        await cacheManager.clearUserCache('USER_POSTS');
      }
    },
    ...options,
  });
};

// Mutation for deleting a post
export const useDeletePost = (userId: string, options: DeletePostMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: (postId: string) => {
      // Placeholder - deletePost method not yet implementedreturn Promise.resolve();
    },
    onSuccess: async (data, postId) => {
      // Remove from all queries
      queryClient.removeQueries({ queryKey: queryKeys.postDetail(postId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.postsByUser(userId) });
      
      // Clear user cache
      if (cacheManager) {
        await cacheManager.clearUserCache('USER_POSTS');
      }
      
      // Update user posts count
      queryClient.setQueryData(['user', 'profile', userId], (old: any) => ({
        ...old,
        postsCount: Math.max(0, (old?.postsCount || 0) - 1),
      }));
    },
    ...options,
  });
};

// Mutation for liking/unliking a post
export const useTogglePostLike = (userId: string, options: TogglePostLikeMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      // Placeholder - togglePostLike method not yet implementedreturn Promise.resolve({ postId, isLiked: !isLiked });
    },
    onMutate: async ({ postId, isLiked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.postDetail(postId) });
      
      const previousPost = queryClient.getQueryData<Post>(queryKeys.postDetail(postId));
      
      if (previousPost) {
        queryClient.setQueryData<Post>(queryKeys.postDetail(postId), {
          ...previousPost,
          likes: isLiked 
            ? (previousPost.likes || []).filter((like: any) => (typeof like === 'string' ? like : like.userId) !== userId) as any[]
            : [...(previousPost.likes || []), userId] as any[],
          likesCount: isLiked 
            ? Math.max(0, (previousPost.likesCount || 0) - 1)
            : (previousPost.likesCount || 0) + 1,
        });
      }

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Revert optimistic update
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.postDetail(postId), context.previousPost);
      }
    },
    onSettled: (data, error, { postId }) => {
      // Update all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
    },
    ...options,
  });
};

// Mutation for sharing/unsharing a post
export const useTogglePostShare = (userId: string, options: TogglePostShareMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, shareType, targets, message, isShared }: { 
      postId: string; 
      shareType: string; 
      targets: string[]; 
      message: string; 
      isShared: boolean 
    }) => {
      // Placeholder - togglePostShare method not yet implementedreturn Promise.resolve({ 
        postId, 
        shareType, 
        targets, 
        message, 
        isShared: !isShared,
        shareId: `temp-share-${Date.now()}`
      });
    },
    onMutate: async ({ postId, shareType, isShared }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.postDetail(postId) });
      
      const previousPost = queryClient.getQueryData<Post>(queryKeys.postDetail(postId));
      
      if (previousPost) {
        const shareIncrement = isShared ? -1 : 1;
        const newShares = isShared 
          ? (previousPost.shares || []).filter(id => id !== userId)
          : [...(previousPost.shares || []), userId];
        
        queryClient.setQueryData<Post>(queryKeys.postDetail(postId), {
          ...previousPost,
          shares: newShares,
          shareCount: Math.max(0, (previousPost.shareCount || 0) + shareIncrement),
          shareMetadata: {
            ...previousPost.shareMetadata,
            lastSharedAt: isShared ? previousPost.shareMetadata?.lastSharedAt || null : new Date(),
            shareBreakdown: {
              ...previousPost.shareMetadata?.shareBreakdown,
              [shareType]: Math.max(0, (previousPost.shareMetadata?.shareBreakdown?.[shareType] || 0) + shareIncrement)
            }
          }
        });
      }

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Revert optimistic update
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.postDetail(postId), context.previousPost);
      }
    },
    onSettled: (data, error, { postId }) => {
      // Update all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
    },
    ...options,
  });
};

// Mutation for adding a comment
export const useAddComment = (userId: string, options: AddCommentMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, comment }: { postId: string; comment: any }) => {
      // Placeholder - addComment method not yet implementedreturn Promise.resolve({ ...comment, userId, id: `temp-comment-${Date.now()}` } as Comment);
    },
    onSuccess: (data, { postId }) => {
      // Invalidate comments and post details
      queryClient.invalidateQueries({ queryKey: queryKeys.postComments(postId) });
      
      // Update post comments count optimistically
      queryClient.setQueryData<Post>(queryKeys.postDetail(postId), (old) => ({
        ...old!,
        commentsCount: (old?.commentsCount || 0) + 1,
      }));
    },
    ...options,
  });
};

// Hook for prefetching posts data
export const usePrefetchPosts = () => {
  const queryClient = useQueryClient();

  const prefetchPostsFeed = async (): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.posts(),
      queryFn: () => postsService.getPosts({ limit: 10 }),
      ...QUERY_CONFIGS.POSTS,
    });
  };

  const prefetchUserPosts = async (userId: string): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.postsByUser(userId),
      queryFn: () => postsService.getUserPosts(userId, 20),
      ...QUERY_CONFIGS.POSTS,
    });
  };

  const prefetchPostDetail = async (postId: string): Promise<void> => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.postDetail(postId),
      queryFn: () => postsService.getPostById(postId),
      ...QUERY_CONFIGS.POSTS,
    });
  };

  return {
    prefetchPostsFeed,
    prefetchUserPosts,
    prefetchPostDetail,
  };
};

// Hook for getting post share analytics
export const usePostShareAnalytics = (postId: string, options: ShareAnalyticsQueryOptions = {}) => {
  return useQuery<ShareAnalytics>({
    queryKey: ['posts', 'shareAnalytics', postId],
    queryFn: () => {
      // Placeholder - getPostShareAnalytics method not yet implementedreturn {
        totalShares: 0,
        shareBreakdown: {
          friends: 0,
          feeds: 0,
          groups: 0
        },
        timeline: [],
        topSharers: [],
        recentShares: []
      };
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes cache retention
    ...options,
  });
};

// Hook for managing posts cache
export const usePostsCache = (userId: string): CacheOperations<Post[]> & {
  cacheShareAnalytics: (postId: string, analytics: ShareAnalytics) => Promise<boolean>;
  getCachedShareAnalytics: (postId: string) => Promise<ShareAnalytics | null>;
} => {
  const cacheManager = getUserCacheManager(userId);

  const clearCache = async (): Promise<boolean> => {
    if (cacheManager) {
      return await cacheManager.clearUserCache('USER_POSTS');
    }
    return false;
  };

  const cacheData = async (data: Post[], key: string = 'feed'): Promise<boolean> => {
    if (cacheManager) {
      return await cacheManager.cacheUserData('USER_POSTS', data, key);
    }
    return false;
  };

  const getCachedData = async (key: string = 'feed'): Promise<Post[] | null> => {
    if (cacheManager) {
      return await cacheManager.getCachedUserData('USER_POSTS', key) as Post[] | null;
    }
    return null;
  };

  const cacheShareAnalytics = async (postId: string, analytics: ShareAnalytics): Promise<boolean> => {
    if (cacheManager) {
      return await cacheManager.cacheUserData('SHARE_ANALYTICS', analytics, postId);
    }
    return false;
  };

  const getCachedShareAnalytics = async (postId: string): Promise<ShareAnalytics | null> => {
    if (cacheManager) {
      return await cacheManager.getCachedUserData('SHARE_ANALYTICS', postId) as ShareAnalytics | null;
    }
    return null;
  };

  return {
    clearCache,
    cacheData,
    getCachedData,
    cacheShareAnalytics,
    getCachedShareAnalytics,
  };
};
