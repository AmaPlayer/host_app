import { useCallback } from 'react';
import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Post, User } from '../types/models';
import { usePostsStore } from '../store/appStore';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import postsService from '../services/supabase/postsService';
import { sanitizeEngagementData } from '../utils/validation/engagementValidation';
import notificationService from '../services/notificationService';

const filterPostContent = (text: string, options?: any) => ({
  isClean: true,
  shouldFlag: false,
  shouldBlock: false,
  shouldWarn: false,
  violations: [],
  categories: []
});

const getPostViolationMessage = (violations: any[], categories: any[]) => '';
const logPostViolation = async (...args: any[]) => { };

interface UpdatePostData {
  caption?: string;
  [key: string]: any;
}

interface UsePostOperationsReturn {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadPosts: (loadMore?: boolean) => Promise<void>;
  refreshPosts: () => Promise<void>;
  createPost: (postData: { text: string; mediaFile?: File; currentUser: User }) => Promise<void>;
  updatePost: (postId: string, updates: UpdatePostData & { currentUser?: User }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string, currentLikes: string[], currentUser: User, postData?: Post | null) => Promise<void>;
  updatePostShareData: (postId: string, userId: string, shareType: 'friends' | 'feeds' | 'groups', isAdding?: boolean) => Promise<void>;
  getPostShareInfo: (postId: string) => any;
  hasUserSharedPost: (postId: string, userId: string) => boolean;
}

const POSTS_PER_PAGE = 10;

/**
 * Custom hook for handling all post CRUD operations
 * Extracts post-related logic from Home component
 * @param {string} currentUserId - Optional current user ID for engagement metrics
 */
export const usePostOperations = (currentUserId?: string): UsePostOperationsReturn => {
  const { measureApiCall } = usePerformanceMonitor('usePostOperations');

  const {
    posts,
    hasMore,
    lastDoc,
    loading: storeLoading,
    error: storeError,
    setPosts,
    addPosts,
    addPost,
    updatePost: updatePostInStore,
    removePost,
    setHasMore,
    setLastDoc,
    setLoading: setStoreLoading,
    setError: setStoreError
  } = usePostsStore();

  /**
   * Load posts with pagination support using enhanced service
   * @param {boolean} loadMore - Whether to load more posts or refresh
   */
  const loadPosts = useCallback(async (loadMore: boolean = false): Promise<void> => {
    if (storeLoading) return;

    setStoreLoading(true);
    setStoreError(null);

    try {
      const apiCall = async () => {
        return await postsService.getPostsWithEngagement({
          limit: POSTS_PER_PAGE,
          startAfter: loadMore ? lastDoc : undefined,
          includeEngagementMetrics: true,
          currentUserId: currentUserId // Pass the currentUserId from hook parameter
        });
      };

      const result = await measureApiCall(apiCall, 'loadPosts');
      const postsData = result.posts.map(post => sanitizeEngagementData(post));
      if (loadMore) {
        addPosts(postsData);
      } else {
        // Initial load
        setPosts(postsData);
      }

      // Update pagination state
      if (result.posts.length > 0) {
        setLastDoc(result.lastDocument);
        setHasMore(result.hasMore);
      } else {
        // No more posts available
        setHasMore(false);
      }

    } catch (err: any) {
      setStoreError(err.message);
      // On error, stop trying to load more posts
      if (loadMore) {
        setHasMore(false);
      }
    } finally {
      setStoreLoading(false);
    }
  }, [storeLoading, lastDoc, measureApiCall, setPosts, addPosts, setHasMore, setLastDoc, setStoreLoading, setStoreError]);

  /**
   * Refresh posts - reset pagination and load fresh posts
   */
  const refreshPosts = useCallback(async (): Promise<void> => {
    setLastDoc(null);
    setHasMore(true);
    await loadPosts(false);
  }, [loadPosts, setLastDoc, setHasMore]);

  /**
   * Create a new post
   * @param {Object} postData - Post creation data
   */
  const createPost = useCallback(async (postData: {
    text: string;
    mediaFile?: File;
    currentUser: User;
  }): Promise<void> => {
    const { text, mediaFile, currentUser } = postData;

    if (!text?.trim() && !mediaFile) {
      throw new Error('Please write something or select media to share');
    }

    setStoreLoading(true);
    setStoreError(null);

    try {
      // Content filtering
      if (text) {
        const filterResult = filterPostContent(text, {
          context: 'sports_post',
          languages: ['english', 'hindi']
        });

        if (!filterResult.isClean) {
          if (filterResult.shouldFlag) {
            await logPostViolation(currentUser.uid, text, filterResult.violations, 'home_post');
          }

          if (filterResult.shouldBlock || filterResult.shouldWarn) {
            const violationMsg = getPostViolationMessage(filterResult.violations, filterResult.categories);
            throw new Error(`You can't post this content: ${violationMsg}`);
          }
        }
      }

      // Delegate creation to service (handles upload + db insert)
      const newPost = await postsService.createPost({
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Unknown',
        userPhotoURL: currentUser.photoURL,
        caption: text,
        mediaFile: mediaFile || undefined,
        visibility: 'public'
      }, currentUser.uid);

      // Optimistically add the new post to the top of the list
      addPost(newPost);

      // Removed refreshPosts() to prevent list flashing/disappearance
      // await refreshPosts();

    } catch (err: any) {
      setStoreError(err.message);
      throw err;
    } finally {
      setStoreLoading(false);
    }
  }, [refreshPosts, setStoreError, setStoreLoading]);

  /**
   * Update an existing post
   * @param {string} postId - Post ID to update
   * @param {Object} updates - Updates to apply
   */
  const updatePost = useCallback(async (
    postId: string,
    updates: UpdatePostData & { currentUser?: User }
  ): Promise<void> => {
    setStoreLoading(true);
    setStoreError(null);

    try {
      // Content filtering for edited posts
      if (updates.caption) {
        const filterResult = filterPostContent(updates.caption, {
          context: 'sports_post',
          languages: ['english', 'hindi']
        });

        if (!filterResult.isClean) {
          if (filterResult.shouldFlag) {
            await logPostViolation(updates.currentUser?.uid || '', updates.caption, filterResult.violations, 'edit_post');
          }

          if (filterResult.shouldBlock || filterResult.shouldWarn) {
            const violationMsg = getPostViolationMessage(filterResult.violations, filterResult.categories);
            throw new Error(`You can't save this content: ${violationMsg}`);
          }
        }
      }

      if (!updates.currentUser) {
        throw new Error('Current user is required for updates');
      }

      // Call service update
      const updatedPost = await postsService.updatePost(
        postId,
        { caption: updates.caption },
        updates.currentUser.uid
      );

      // Update local state
      updatePostInStore(postId, {
        caption: updatedPost.caption,
        editedAt: new Date()
      } as any);

    } catch (err: any) {
      setStoreError(err.message);
      throw err;
    } finally {
      setStoreLoading(false);
    }
  }, [updatePostInStore, setStoreError, setStoreLoading]);

  /**
   * Delete a post
   * @param {string} postId - Post ID to delete
   */
  const deletePost = useCallback(async (postId: string): Promise<void> => {
    // Need current user to delete - simplified for hook, ideally passed in
    // Assuming the user viewing is the one deleting for now, or we need to pass user
    // The service requires userId.
    // For now, we'll try to find the post in local state to get userId or assume store owner
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setStoreLoading(true);
    setStoreError(null);

    try {
      await (postsService as any).deletePost(postId, post.userId);

      // Update local state to remove the deleted post
      removePost(postId);

    } catch (err: any) {
      setStoreError(err.message);
      throw err;
    } finally {
      setStoreLoading(false);
    }
  }, [posts, removePost, setStoreError, setStoreLoading]);

  /**
   * Like or unlike a post
   */
  const likePost = useCallback(async (
    postId: string,
    currentLikes: string[],
    currentUser: User,
    postData: Post | null = null
  ): Promise<void> => {
    if (!currentUser) return;

    console.log('❤️ likePost called for:', postId, 'by', currentUser.uid);

    setStoreError(null);

    const userLiked = currentLikes.includes(currentUser.uid);

    // Calculate the new likes count
    const currentLikesCount = postData?.likesCount || currentLikes.length || 0;
    const newLikesCount = userLiked ? Math.max(0, currentLikesCount - 1) : currentLikesCount + 1;

    // Store original data for rollback
    const originalLikes = currentLikes;
    const originalLikesCount = currentLikesCount;

    // Calculate new likes array
    const newLikes = userLiked
      ? currentLikes.filter(id => id !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    try {
      // OPTIMISTIC UPDATE FIRST
      const optimisticUpdateId = Date.now();
      console.log('👍 Optimistic update applied for:', postId, 'newIsLiked:', !userLiked);

      updatePostInStore(postId, {
        likes: newLikes,
        likesCount: newLikesCount,
        isLiked: !userLiked,  // ✅ Toggle isLiked immediately for instant UI update
        _optimisticUpdateId: optimisticUpdateId
      } as any);

      // Call service
      await postsService.toggleLike(postId, currentUser.uid, {
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
      });

      // Send notification (only when liking)
      if (!userLiked && postData && postData.userId && postData.userId !== currentUser.uid) {
        try {
          await notificationService.sendLikeNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            postData.userId,
            postId,
            postData
          );
        } catch (notificationError) {
          console.warn('Failed to send like notification:', notificationError);
        }
      }

      // Clear optimistic flag
      setTimeout(() => {
        updatePostInStore(postId, {
          _optimisticUpdateId: undefined
        } as any);
      }, 500);

    } catch (err: any) {
      // Rollback optimistic update on error
      updatePostInStore(postId, {
        likes: originalLikes,
        likesCount: originalLikesCount,
        _optimisticUpdateId: undefined
      } as any);

      setStoreError(err.message);
      throw err;
    }
  }, [setStoreError, updatePostInStore]);

  /**
   * Update post share data
   */
  const updatePostShareData = useCallback(async (
    postId: string,
    userId: string,
    shareType: 'friends' | 'feeds' | 'groups',
    isAdding: boolean = true
  ): Promise<void> => {
    if (!userId) return;

    setStoreError(null);

    try {
      const increment = isAdding ? 1 : -1;

      // Update via service
      await (postsService as any).updateShare(postId, userId, shareType, isAdding);

      // Update local state
      const post = posts.find(p => p.id === postId);
      if (post) {
        updatePostInStore(postId, {
          shares: isAdding
            ? [...(post.shares || []), userId]
            : (post.shares || []).filter(id => id !== userId),
          shareCount: Math.max(0, (post.shareCount || 0) + increment),
          shareMetadata: {
            ...post.shareMetadata,
            lastSharedAt: isAdding ? new Date() : post.shareMetadata?.lastSharedAt || null,
            shareBreakdown: {
              ...post.shareMetadata?.shareBreakdown,
              [shareType]: Math.max(0, (post.shareMetadata?.shareBreakdown?.[shareType] || 0) + increment)
            }
          }
        } as any);
      }

    } catch (err: any) {
      setStoreError(err.message);
      throw err;
    }
  }, [posts, updatePostInStore, setStoreError]);

  /**
   * Get share information for a post
   */
  const getPostShareInfo = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    return {
      shares: post.shares || [],
      shareCount: post.shareCount || 0,
      shareMetadata: post.shareMetadata || {
        lastSharedAt: null,
        shareBreakdown: {
          friends: 0,
          feeds: 0,
          groups: 0
        }
      }
    };
  }, [posts]);

  /**
   * Check if user has shared a post
   */
  const hasUserSharedPost = useCallback((postId: string, userId: string): boolean => {
    const post = posts.find(p => p.id === postId);
    return post?.shares?.includes(userId) || false;
  }, [posts]);

  return {
    posts,
    loading: storeLoading,
    hasMore,
    error: storeError,
    loadPosts,
    refreshPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
    // Enhanced sharing operations
    updatePostShareData,
    getPostShareInfo,
    hasUserSharedPost
  };
};
