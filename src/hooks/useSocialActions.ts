import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import postsService from '@/services/api/postsService';

interface LikeState {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  error: string | null;
}

interface SocialActionsState {
  [postId: string]: LikeState;
}

interface QueuedAction {
  postId: string;
  action: 'like' | 'unlike';
  timestamp: number;
  retryCount: number;
}

interface UseSocialActionsReturn {
  getLikeState: (postId: string) => LikeState;
  toggleLike: (postId: string, currentLiked: boolean, currentCount: number) => Promise<void>;
  isLoading: (postId: string) => boolean;
  getError: (postId: string) => string | null;
  clearError: (postId: string) => void;
  retryFailedActions: () => Promise<void>;
  initializePostState: (postId: string, isLiked: boolean, likesCount: number) => void;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const DEBOUNCE_DELAY = 300;

/**
 * Enhanced social actions hook with optimistic updates and error handling
 * Provides reliable like/unlike functionality with immediate UI feedback
 * Now unified on Supabase via postsService
 */
export const useSocialActions = (): UseSocialActionsReturn => {
  const { currentUser: user } = useAuth();
  const [state, setState] = useState<SocialActionsState>({});
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const debounceTimers = useRef<{ [postId: string]: NodeJS.Timeout }>({});
  const processingQueue = useRef<boolean>(false);

  /**
   * Get like state for a specific post
   */
  const getLikeState = useCallback((postId: string): LikeState => {
    return state[postId] || {
      isLiked: false,
      likesCount: 0,
      isLoading: false,
      error: null
    };
  }, [state]);

  /**
   * Update state for a specific post
   */
  const updatePostState = useCallback((postId: string, updates: Partial<LikeState>) => {
    setState(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        ...updates
      }
    }));
  }, []);

  /**
   * Initialize post state if not exists
   */
  const initializePostState = useCallback((postId: string, isLiked: boolean, likesCount: number) => {
    setState(prev => {
      // Always update initialization to match latest server data if provided
      // or if it doesn't exist yet.
      // But be careful not to overwrite user interaction in progress?
      // For now, if it doesn't exist, set it.
      if (!prev[postId]) {
        return {
          ...prev,
          [postId]: {
            isLiked,
            likesCount,
            isLoading: false,
            error: null
          }
        };
      }
      return prev;
    });
  }, []);

  /**
   * Perform actual like/unlike operation with the backend (Supabase)
   */
  const performLikeOperation = useCallback(async (postId: string): Promise<{ success: boolean; newCount: number; liked: boolean }> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Use the unified postsService (Supabase)
      const result = await postsService.toggleLike(postId, user.uid, {
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null
      });
      
      return {
        success: true,
        newCount: result.likesCount,
        liked: result.liked
      };
    } catch (error) {
      console.error('Like operation failed:', error);
      throw error;
    }
  }, [user]);

  /**
   * Process queued actions with retry logic
   */
  const processActionQueue = useCallback(async () => {
    if (processingQueue.current || actionQueue.length === 0) {
      return;
    }

    processingQueue.current = true;

    try {
      const actionsToProcess = [...actionQueue];
      const failedActions: QueuedAction[] = [];

      // We only process the LATEST action for a post to avoid flip-flopping
      // Map postID -> latest action
      const uniqueActions = new Map<string, QueuedAction>();
      actionsToProcess.forEach(action => {
        uniqueActions.set(action.postId, action);
      });

      for (const queuedAction of uniqueActions.values()) {
        const { postId, retryCount } = queuedAction;
        
        try {
          updatePostState(postId, { isLoading: true, error: null });
          
          const result = await performLikeOperation(postId);
          
          // Update state with server response
          updatePostState(postId, {
            isLiked: result.liked,
            likesCount: result.newCount,
            isLoading: false,
            error: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            // Retry with exponential backoff
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            setTimeout(() => {
              failedActions.push({
                ...queuedAction,
                retryCount: retryCount + 1
              });
            }, delay);
          } else {
            // Max retries reached, show error
            updatePostState(postId, {
              isLoading: false,
              error: `Failed to update like: ${errorMessage}`
            });
          }
        }
      }

      // Update queue with failed actions for retry
      // Be careful: if we processed only unique actions, what about the intermediate ones?
      // In a debounce/toggle scenario, only the last state matters.
      setActionQueue(failedActions);

    } finally {
      processingQueue.current = false;
    }
  }, [actionQueue, performLikeOperation, updatePostState]);

  /**
   * Add action to queue for processing
   */
  const queueAction = useCallback((postId: string, action: 'like' | 'unlike') => {
    const newAction: QueuedAction = {
      postId,
      action,
      timestamp: Date.now(),
      retryCount: 0
    };

    setActionQueue(prev => {
      // Remove any existing actions for this post to avoid conflicts
      const filtered = prev.filter(a => a.postId !== postId);
      return [...filtered, newAction];
    });

    // Process queue after a short delay
    setTimeout(processActionQueue, 100);
  }, [processActionQueue]);


  /**
   * Toggle like with optimistic updates and debouncing
   */
  const toggleLike = useCallback(async (postId: string, currentLiked: boolean, currentCount: number) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Initialize state if needed
    initializePostState(postId, currentLiked, currentCount);

    // Clear existing debounce timer
    if (debounceTimers.current[postId]) {
      clearTimeout(debounceTimers.current[postId]);
    }

    // Optimistic update
    const newLiked = !currentLiked;
    const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    updatePostState(postId, {
      isLiked: newLiked,
      likesCount: newCount,
      error: null
    });

    // Debounce the actual API call
    debounceTimers.current[postId] = setTimeout(() => {
      const action = newLiked ? 'like' : 'unlike';
      queueAction(postId, action);
    }, DEBOUNCE_DELAY);

  }, [user, initializePostState, updatePostState, queueAction]);

  /**
   * Check if a post is currently loading
   */
  const isLoading = useCallback((postId: string): boolean => {
    return state[postId]?.isLoading || false;
  }, [state]);

  /**
   * Get error for a specific post
   */
  const getError = useCallback((postId: string): string | null => {
    return state[postId]?.error || null;
  }, [state]);

  /**
   * Clear error for a specific post
   */
  const clearError = useCallback((postId: string) => {
    updatePostState(postId, { error: null });
  }, [updatePostState]);

  /**
   * Retry all failed actions
   */
  const retryFailedActions = useCallback(async () => {
    const failedPosts = Object.keys(state).filter(postId => state[postId].error);
    
    for (const postId of failedPosts) {
      const postState = state[postId];
      updatePostState(postId, { error: null });
      
      // Re-queue the action based on current state
      const action = postState.isLiked ? 'like' : 'unlike';
      queueAction(postId, action);
    }
  }, [state, updatePostState, queueAction]);

  return {
    getLikeState,
    toggleLike,
    isLoading,
    getError,
    clearError,
    retryFailedActions,
    initializePostState
  };
};
