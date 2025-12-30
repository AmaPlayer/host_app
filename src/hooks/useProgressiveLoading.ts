import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  createThrottledScrollHandler,
  PERFORMANCE_DELAYS
} from '../utils/performance/debounceThrottle';
import {
  useLoadingStateManager,
  LoadingState
} from '../utils/performance/loadingStateManager';

interface ProgressiveLoadingConfig {
  useIntersectionObserver?: boolean;
  scrollThreshold?: number;
  rootMargin?: string;
}

interface UseProgressiveLoadingReturn<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
  loadingState: LoadingState;
  isInitialLoad: boolean;
}

interface ProgressiveLoadingState<T> {
  visibleItems: T[];
  currentBatch: number;
  isLoadingMore: boolean;
  hasMoreToLoad: boolean;
  error: string | null;
}

type ProgressiveLoadingAction<T> =
  | { type: 'INITIALIZE'; payload: { items: T[]; initialBatchSize: number } }
  | { type: 'START_LOADING' }
  | { type: 'LOAD_MORE_SUCCESS'; payload: { newItems: T[]; hasMore: boolean } }
  | { type: 'LOAD_MORE_ERROR'; payload: { error: string } }
  | { type: 'RESET' }
  | { type: 'REFRESH'; payload: { items: T[]; initialBatchSize: number } }
  | { type: 'UPDATE_ITEMS'; payload: { items: T[] } }; // New action

function progressiveLoadingReducer<T>(
  state: ProgressiveLoadingState<T>,
  action: ProgressiveLoadingAction<T>
): ProgressiveLoadingState<T> {
  switch (action.type) {
    case 'INITIALIZE': {
      const { items, initialBatchSize } = action.payload;
      const initialItems = items.slice(0, initialBatchSize);
      return {
        ...state,
        visibleItems: initialItems,
        currentBatch: 1,
        hasMoreToLoad: items.length > initialBatchSize,
        isLoadingMore: false,
        error: null,
      };
    }

    // New case to handle updates without resetting scroll/batch
    case 'UPDATE_ITEMS': {
      const { items } = action.payload;

      // Check if we were previously showing all items
      // If so, we should continue showing all items (expand to fit new ones)
      const isShowingAll = !state.hasMoreToLoad;

      let updatedVisibleItems;
      if (isShowingAll) {
        // If we were showing everything, show the new full list
        updatedVisibleItems = items;
      } else {
        // If we were paginating, preserve the count (or slightly adjust if needed)
        // For now, preserving count is safer to prevent scroll jumps in long lists
        const currentVisibleCount = state.visibleItems.length;
        updatedVisibleItems = items.slice(0, Math.max(currentVisibleCount, 1));
      }

      return {
        ...state,
        visibleItems: updatedVisibleItems,
        // Recalculate hasMore based on new full list vs new visible list
        hasMoreToLoad: items.length > updatedVisibleItems.length,
      };
    }

    case 'START_LOADING':
      return {
        ...state,
        isLoadingMore: true,
        error: null,
      };

    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        visibleItems: [...state.visibleItems, ...action.payload.newItems],
        currentBatch: state.currentBatch + 1,
        hasMoreToLoad: action.payload.hasMore,
        isLoadingMore: false,
        error: null,
      };

    case 'LOAD_MORE_ERROR':
      return {
        ...state,
        isLoadingMore: false,
        error: action.payload.error,
      };

    case 'RESET':
      return {
        visibleItems: [],
        currentBatch: 1,
        isLoadingMore: false,
        hasMoreToLoad: false,
        error: null,
      };

    case 'REFRESH': {
      const refreshItems = action.payload.items.slice(0, action.payload.initialBatchSize);
      return {
        visibleItems: refreshItems,
        currentBatch: 1,
        hasMoreToLoad: action.payload.items.length > action.payload.initialBatchSize,
        isLoadingMore: false,
        error: null,
      };
    }

    default:
      return state;
  }
}

/**
 * Progressive Loading Hook
 * 
 * Manages progressive loading of posts in batches for better performance.
 * Shows initial batch, then loads more as user scrolls or requests.
 * 
 * Optimizations:
 * - Uses useReducer for batched state updates to prevent flickering
 * - Stable callback references with useCallback and proper dependencies
 * - Throttled scroll event handling to reduce update frequency
 * - Intersection Observer API as alternative to scroll events for better performance
 * - Proper cleanup for event listeners and observers
 */
export const useProgressiveLoading = <T,>(
  allPosts: T[] = [],
  initialBatchSize: number = 5,
  batchSize: number = 5,
  config: ProgressiveLoadingConfig = {}
): UseProgressiveLoadingReturn<T> => {
  const {
    useIntersectionObserver = true,
    scrollThreshold = 0.8,
    rootMargin = '100px'
  } = config;
  const [state, dispatch] = useReducer(progressiveLoadingReducer<T>, {
    visibleItems: [],
    currentBatch: 1,
    isLoadingMore: false,
    hasMoreToLoad: false,
    error: null,
  });

  // Use the new loading state manager for stable transitions
  const {
    loadingState,
    startInitialLoad,
    startLoadMore,
    markLoadSuccess,
    markLoadError,
    reset: resetLoadingState,
    isLoading: isLoadingFromManager,
    canLoadMore
  } = useLoadingStateManager();

  // Refs for stable references
  const allPostsRef = useRef(allPosts);
  const configRef = useRef({ initialBatchSize, batchSize });
  const scrollHandlerRef = useRef<((event: Event) => void) | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when props change
  useEffect(() => {
    allPostsRef.current = allPosts;
    configRef.current = { initialBatchSize, batchSize };
  }, [allPosts, initialBatchSize, batchSize]);

  // Handle allPosts changes - INTELLIGENT UPDATE vs INITIALIZE
  useEffect(() => {
    if (allPosts.length > 0) {
      // If we already have visible items, this is likely an update (like a like/comment)
      // So we update the items in place instead of resetting the view.
      if (state.visibleItems.length > 0) {
        dispatch({
          type: 'UPDATE_ITEMS',
          payload: { items: allPosts }
        });
      } else {
        // Initial load or reset
        startInitialLoad();
        dispatch({
          type: 'INITIALIZE',
          payload: { items: allPosts, initialBatchSize }
        });
        // Mark as success after initialization
        setTimeout(() => markLoadSuccess(), 100);
      }
    } else {
      dispatch({ type: 'RESET' });
      resetLoadingState();
    }
  }, [allPosts, initialBatchSize, startInitialLoad, markLoadSuccess, resetLoadingState]);

  // Load more posts progressively with stable loading state management
  const loadMore = useCallback(async (): Promise<void> => {
    if (!canLoadMore || !state.hasMoreToLoad) return;

    // Clear any pending loading timeout to prevent duplicate calls
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    const currentPosts = allPostsRef.current;
    const config = configRef.current;

    // Calculate what posts we would load
    const startIndex = state.currentBatch * config.initialBatchSize;
    const endIndex = startIndex + config.batchSize;

    // Don't start loading if there are no more posts to load
    if (startIndex >= currentPosts.length) {
      dispatch({
        type: 'LOAD_MORE_SUCCESS',
        payload: { newItems: [], hasMore: false }
      });
      return;
    }

    startLoadMore();
    dispatch({ type: 'START_LOADING' });

    try {
      // Optimized loading delay - shorter for better perceived performance
      await new Promise(resolve => setTimeout(resolve, 150));

      const newPosts = currentPosts.slice(startIndex, endIndex);

      if (newPosts.length > 0) {
        const totalAfterLoad = state.visibleItems.length + newPosts.length;
        const hasMore = totalAfterLoad < currentPosts.length;

        dispatch({
          type: 'LOAD_MORE_SUCCESS',
          payload: { newItems: newPosts, hasMore }
        });
        markLoadSuccess();
      } else {
        // No more posts available
        dispatch({
          type: 'LOAD_MORE_SUCCESS',
          payload: { newItems: [], hasMore: false }
        });
        markLoadSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more posts';
      dispatch({
        type: 'LOAD_MORE_ERROR',
        payload: { error: errorMessage }
      });
      markLoadError(errorMessage);
    }
  }, [canLoadMore, state.hasMoreToLoad, state.currentBatch, state.visibleItems.length, startLoadMore, markLoadSuccess, markLoadError]);

  // Optimized scroll handler with stable loading state checks
  const handleScroll = useCallback(() => {
    if (!canLoadMore || !state.hasMoreToLoad) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    const scrollPercentage = (scrollTop + windowHeight) / documentHeight;

    // Only trigger loading if we've scrolled past the threshold and have sufficient content height
    if (scrollPercentage > scrollThreshold && documentHeight > windowHeight * 1.5) {
      // Debounce the loading call to prevent excessive triggers
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      loadingTimeoutRef.current = setTimeout(() => {
        loadMore();
      }, PERFORMANCE_DELAYS.LOADING_CHECK);
    }
  }, [loadMore, canLoadMore, state.hasMoreToLoad, scrollThreshold]);

  // Create throttled scroll handler with stable reference
  const throttledScrollHandler = useMemo(() => {
    return createThrottledScrollHandler(handleScroll, PERFORMANCE_DELAYS.SCROLL_HANDLER);
  }, [handleScroll]);

  // Intersection Observer callback with stable loading state management
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;

    if (entry.isIntersecting && state.hasMoreToLoad && canLoadMore && !state.isLoadingMore) {
      const currentPosts = allPostsRef.current;
      const config = configRef.current;
      const startIndex = state.currentBatch * config.initialBatchSize;

      // Only trigger if there are actually more posts to load
      if (startIndex < currentPosts.length) {
        // Debounce the loading call
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        loadingTimeoutRef.current = setTimeout(() => {
          loadMore();
        }, PERFORMANCE_DELAYS.LOADING_CHECK);
      }
    }
  }, [loadMore, state.hasMoreToLoad, state.isLoadingMore, state.currentBatch, canLoadMore]);

  // Set up intersection observer or scroll listener based on configuration
  useEffect(() => {
    if (useIntersectionObserver && 'IntersectionObserver' in window) {
      // Use Intersection Observer for better performance
      observerRef.current = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin,
        threshold: 0.1
      });

      if (sentinelRef.current) {
        observerRef.current.observe(sentinelRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    } else {
      // Fallback to scroll listener for older browsers
      scrollHandlerRef.current = throttledScrollHandler;
      window.addEventListener('scroll', throttledScrollHandler, { passive: true });

      return () => {
        if (scrollHandlerRef.current) {
          window.removeEventListener('scroll', scrollHandlerRef.current);
          scrollHandlerRef.current = null;
        }
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [throttledScrollHandler, handleIntersection, useIntersectionObserver, rootMargin]);

  // Refresh with stable loading state management
  const refresh = useCallback((): Promise<void> => {
    const currentPosts = allPostsRef.current;
    const config = configRef.current;

    if (currentPosts.length > 0) {
      startInitialLoad();
      dispatch({
        type: 'REFRESH',
        payload: { items: currentPosts, initialBatchSize: config.initialBatchSize }
      });
      // Mark as success after refresh
      setTimeout(() => markLoadSuccess(), 100);
    } else {
      dispatch({ type: 'RESET' });
      resetLoadingState();
    }

    return Promise.resolve();
  }, [startInitialLoad, markLoadSuccess, resetLoadingState]);

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
    resetLoadingState();
  }, [resetLoadingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollHandlerRef.current) {
        window.removeEventListener('scroll', scrollHandlerRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    items: state.visibleItems,
    loading: state.isLoadingMore,
    hasMore: state.hasMoreToLoad,
    error: state.error,
    loadMore,
    refresh,
    reset,
    sentinelRef,
    loadingState,
    isInitialLoad: loadingState.isInitialLoad
  };
};
