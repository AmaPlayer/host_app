import { useState, useCallback } from 'react';
import { UsePostInteractionsReturn } from '../types/hooks/custom';
import { useAuth } from '../contexts/AuthContext';

import { SHARE_TYPES, ShareType } from '../constants/sharing';

const SHARING_RATE_LIMITS = {
  SHARES_PER_MINUTE: 5
};

type ActionType = 'like' | 'share' | 'save' | 'report';

interface RateLimit {
  maxActions: number;
  windowMs: number;
}

interface RateLimitState {
  actions: number[];
}

interface InteractionState {
  [key: string]: boolean;
}

interface InteractionCounts {
  [postId: string]: {
    [action: string]: number;
  };
}

interface HistoryEntry {
  id: string;
  postId: string;
  action: ActionType;
  userId: string;
  timestamp: number;
  type: 'add' | 'remove';
  undone?: boolean;
  undoneAt?: number;
  [key: string]: any;
}

interface ShareOptions {
  shareType?: ShareType;
  targets?: string[];
  message?: string;
  privacy?: string;
}

interface ShareState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface ShareAnalytics {
  totalShares: number;
  shareBreakdown: {
    [key in ShareType]: number;
  };
  lastSharedAt: Date | null;
  recentShares: Array<{
    shareType: ShareType;
    targets: string[];
    message: string;
    timestamp: Date;
    userId: string;
  }>;
}

/**
 * Custom hook for managing post interactions and UI states
 * Handles likes, shares, saves, reports, and UI state management
 */
export const usePostInteractions = (): UsePostInteractionsReturn & {
  // Additional properties not in the interface
  showComments: { [postId: string]: boolean };
  showPostMenus: { [postId: string]: boolean };
  editingPost: string | null;
  editText: string;
  shareSuccess: { [postId: string]: boolean };
  interactions: { [key: string]: InteractionState };
  interactionCounts: InteractionCounts;
  rateLimitState: { [key: string]: RateLimitState };
  interactionHistory: HistoryEntry[];
  shareStates: { [postId: string]: ShareState };
  shareAnalytics: { [postId: string]: ShareAnalytics };
  toggleComments: (postId: string) => void;
  togglePostMenu: (postId: string) => void;
  closeAllMenus: () => void;
  startEditingPost: (postId: string, currentText?: string) => void;
  cancelEditingPost: () => void;
  updateEditText: (text: string) => void;
  setShareSuccessState: (postId: string, success: boolean, duration?: number) => void;
  clearShareSuccess: (postId: string) => void;
  hideComments: (postId: string) => void;
  showCommentsForPost: (postId: string) => void;
  closePostMenu: (postId: string) => void;
  resetAllStates: () => void;
  resetPostStates: (postId: string) => void;
  areCommentsVisible: (postId: string) => boolean;
  isPostMenuVisible: (postId: string) => boolean;
  isPostBeingEdited: (postId: string) => boolean;
  isShareSuccessVisible: (postId: string) => boolean;
  getInteractionState: (postId: string, userId: string) => InteractionState;
  getInteractionCounts: (postId: string) => { [action: string]: number };
  getInteractionHistory: (userId: string, filters?: any) => HistoryEntry[];
  getRateLimitInfo: (action: ActionType, userId: string) => { remaining: number; resetTime: number | null };
  isRateLimited: (action: ActionType, userId: string) => boolean;
  getShareState: (postId: string) => ShareState;
  getShareAnalytics: (postId: string) => ShareAnalytics;
  clearShareState: (postId: string) => void;
  updateShareCount: (postId: string, increment?: number) => void;
  updateShareAnalytics: (analyticsData: { [postId: string]: ShareAnalytics }) => void;
  getShareHistory: (userId: string, filters?: any) => HistoryEntry[];
  hasUserSharedPost: (postId: string, userId: string) => boolean;
  getShareRateLimit: (userId: string) => { remaining: number; resetTime: number | null };
  savePost: (postId: string, userId: string) => Promise<any>;
  reportPost: (postId: string, userId: string, reportOptions?: any) => Promise<any>;
  undoInteraction: (historyId: string) => Promise<any>;
  batchUndoInteractions: (historyIds: string[]) => Promise<{ results: any[]; errors: any[] }>;
} => {
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  const [showPostMenus, setShowPostMenus] = useState<{ [postId: string]: boolean }>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState<{ [postId: string]: boolean }>({});

  // Interaction states
  const [interactions, setInteractions] = useState<{ [key: string]: InteractionState }>({});
  const [interactionCounts, setInteractionCounts] = useState<InteractionCounts>({});
  const [rateLimitState, setRateLimitState] = useState<{ [key: string]: RateLimitState }>({});
  const [interactionHistory, setInteractionHistory] = useState<HistoryEntry[]>([]);

  // Enhanced sharing states
  const [shareStates, setShareStates] = useState<{ [postId: string]: ShareState }>({});
  const [shareAnalytics, setShareAnalytics] = useState<{ [postId: string]: ShareAnalytics }>({});

  // Rate limiting configuration
  const RATE_LIMITS: { [key in ActionType]: RateLimit } = {
    like: { maxActions: 10, windowMs: 60000 },
    share: { maxActions: SHARING_RATE_LIMITS.SHARES_PER_MINUTE, windowMs: 60000 },
    save: { maxActions: 20, windowMs: 60000 },
    report: { maxActions: 3, windowMs: 300000 }
  };

  /**
   * Check if action is rate limited
   */
  const isRateLimited = useCallback((action: ActionType, userId: string): boolean => {
    const key = `${userId}_${action}`;
    const limit = RATE_LIMITS[action];
    const state = rateLimitState[key];

    if (!state || !limit) return false;

    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Filter actions within the time window
    const actionsInWindow = state.actions.filter(timestamp => timestamp > windowStart);

    return actionsInWindow.length >= limit.maxActions;
  }, [rateLimitState]);

  /**
   * Record action for rate limiting
   */
  const recordAction = useCallback((action: ActionType, userId: string): void => {
    const key = `${userId}_${action}`;
    const now = Date.now();

    setRateLimitState(prev => ({
      ...prev,
      [key]: {
        actions: [...(prev[key]?.actions || []), now]
      }
    }));
  }, []);

  /**
   * Get rate limit info for an action
   */
  const getRateLimitInfo = useCallback((action: ActionType, userId: string) => {
    const key = `${userId}_${action}`;
    const limit = RATE_LIMITS[action];
    const state = rateLimitState[key];

    if (!state || !limit) {
      return { remaining: limit?.maxActions || 0, resetTime: null };
    }

    const now = Date.now();
    const windowStart = now - limit.windowMs;
    const actionsInWindow = state.actions.filter(timestamp => timestamp > windowStart);
    const remaining = Math.max(0, limit.maxActions - actionsInWindow.length);
    const oldestAction = actionsInWindow[0];
    const resetTime = oldestAction ? oldestAction + limit.windowMs : null;

    return { remaining, resetTime };
  }, [rateLimitState]);

  /**
   * Handle post interaction (like, share, save, report)
   */
  const handleInteraction = useCallback(async (
    postId: string,
    action: ActionType,
    userId: string,
    options: any = {}
  ) => {
    // Check rate limiting
    if (isRateLimited(action, userId)) {
      const rateLimitInfo = getRateLimitInfo(action, userId);
      throw new Error(`Rate limited. Try again in ${Math.ceil((rateLimitInfo.resetTime! - Date.now()) / 1000)} seconds`);
    }

    const interactionKey = `${postId}_${userId}`;
    const currentInteractions = interactions[interactionKey] || {};
    const isCurrentlyActive = currentInteractions[action];

    // Optimistic update
    const newInteractionState = {
      ...currentInteractions,
      [action]: !isCurrentlyActive
    };

    setInteractions(prev => ({
      ...prev,
      [interactionKey]: newInteractionState
    }));

    // Update counts optimistically
    setInteractionCounts(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [action]: (prev[postId]?.[action] || 0) + (isCurrentlyActive ? -1 : 1)
      }
    }));

    // Record action for rate limiting
    recordAction(action, userId);

    // Add to history
    const historyEntry: HistoryEntry = {
      id: `${Date.now()}_${Math.random()}`,
      postId,
      action,
      userId,
      timestamp: Date.now(),
      type: isCurrentlyActive ? 'remove' : 'add',
      ...options
    };

    setInteractionHistory(prev => [historyEntry, ...prev]);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        postId,
        action,
        isActive: !isCurrentlyActive,
        count: (interactionCounts[postId]?.[action] || 0) + (isCurrentlyActive ? -1 : 1)
      };
    } catch (error) {
      // Rollback optimistic update on error
      setInteractions(prev => ({
        ...prev,
        [interactionKey]: currentInteractions
      }));

      setInteractionCounts(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          [action]: (prev[postId]?.[action] || 0) + (isCurrentlyActive ? 1 : -1)
        }
      }));

      throw error;
    }
  }, [interactions, interactionCounts, isRateLimited, getRateLimitInfo, recordAction]);

  /**
   * Like a post
   */
  const likePost = useCallback(async (postId: string): Promise<void> => {
    // This implementation needs userId - will be provided by the component
    throw new Error('likePost requires userId parameter');
  }, []);

  /**
   * Unlike a post
   */
  const unlikePost = useCallback(async (postId: string): Promise<void> => {
    throw new Error('unlikePost requires userId parameter');
  }, []);

  /**
   * Toggle like on a post
   */
  const toggleLike = useCallback(async (postId: string, isLiked: boolean): Promise<void> => {
    // Implementation will be handled by component with userId
    throw new Error('toggleLike requires userId parameter');
  }, []);

  const { currentUser } = useAuth();

  /**
   * Enhanced share post function with detailed share options
   * Fixed to accept message and privacy parameters properly
   */
  const sharePost = useCallback(async (
    postId: string,
    shareType: ShareType,
    targets?: string[],
    message?: string,
    privacy?: string
  ): Promise<void> => {
    // Set loading state
    setShareStates(prev => ({
      ...prev,
      [postId]: { loading: true, error: null, success: false }
    }));

    try {
      if (!currentUser) {
        throw new Error('You must be logged in to share posts');
      }

      // Validate share type
      if (!Object.values(SHARE_TYPES).includes(shareType)) {
        throw new Error(`Invalid share type: ${shareType}`);
      }

      // Validate targets for specific share types
      if (shareType !== SHARE_TYPES.FEED && (!targets || targets.length === 0)) {
        throw new Error(`Targets are required for ${shareType} shares`);
      }

      // Get share service instance
      const { default: shareService } = await import('../services/api/ShareService');

      // Execute appropriate share method
      switch (shareType) {
        case SHARE_TYPES.FEED:
          // Fixed: Pass message and privacy correctly
          await shareService.shareToFeed(
            postId,
            currentUser.uid,
            message || '',
            privacy || 'public'
          );
          break;
        case SHARE_TYPES.FRIENDS:
          if (targets) {
            await shareService.shareToFriends(
              postId,
              currentUser.uid,
              targets,
              message || ''
            );
          }
          break;
        case SHARE_TYPES.GROUPS:
          if (targets) {
            await shareService.shareToGroups(
              postId,
              currentUser.uid,
              targets,
              message || ''
            );
          }
          break;
      }

      // Set success state
      setShareStates(prev => ({
        ...prev,
        [postId]: { loading: false, error: null, success: true }
      }));

    } catch (error: any) {
      // Set error state
      setShareStates(prev => ({
        ...prev,
        [postId]: { loading: false, error: error.message, success: false }
      }));

      throw error;
    }
  }, [currentUser]);

  /**
   * Unshare a post
   */
  const unsharePost = useCallback(async (postId: string): Promise<void> => {
    throw new Error('unsharePost not yet implemented');
  }, []);

  /**
   * Save a post
   */
  const savePost = useCallback((postId: string, userId: string) => {
    return handleInteraction(postId, 'save', userId);
  }, [handleInteraction]);

  /**
   * Report a post
   */
  const reportPost = useCallback((postId: string, userId: string, reportOptions: any = {}) => {
    return handleInteraction(postId, 'report', userId, reportOptions);
  }, [handleInteraction]);

  /**
   * Undo an interaction
   */
  const undoInteraction = useCallback(async (historyId: string) => {
    const historyEntry = interactionHistory.find(entry => entry.id === historyId);
    if (!historyEntry) {
      throw new Error('History entry not found');
    }

    const { postId, action, userId } = historyEntry;

    try {
      const result = await handleInteraction(postId, action, userId, { isUndo: true });

      // Mark history entry as undone
      setInteractionHistory(prev =>
        prev.map(entry =>
          entry.id === historyId
            ? { ...entry, undone: true, undoneAt: Date.now() }
            : entry
        )
      );

      return { ...result, undone: true };
    } catch (error: any) {
      throw new Error(`Failed to undo interaction: ${error.message}`);
    }
  }, [interactionHistory, handleInteraction]);

  /**
   * Batch undo multiple interactions
   */
  const batchUndoInteractions = useCallback(async (historyIds: string[]) => {
    const results: any[] = [];
    const errors: any[] = [];

    if (!historyIds || !Array.isArray(historyIds)) {
      return { results, errors };
    }

    for (const historyId of historyIds) {
      try {
        const result = await undoInteraction(historyId);
        results.push(result);
      } catch (error: any) {
        errors.push({ historyId, error: error.message });
      }
    }

    return { results, errors };
  }, [undoInteraction]);

  // UI state getters and setters
  const toggleComments = useCallback((postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  const togglePostMenu = useCallback((postId: string) => {
    setShowPostMenus(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setShowPostMenus({});
  }, []);

  const startEditingPost = useCallback((postId: string, currentText: string = '') => {
    setEditingPost(postId);
    setEditText(currentText);
    setShowPostMenus(prev => ({
      ...prev,
      [postId]: false
    }));
  }, []);

  const cancelEditingPost = useCallback(() => {
    setEditingPost(null);
    setEditText('');
  }, []);

  const updateEditText = useCallback((text: string) => {
    setEditText(text);
  }, []);

  const setShareSuccessState = useCallback((postId: string, success: boolean, duration: number = 2000) => {
    setShareSuccess(prev => ({
      ...prev,
      [postId]: success
    }));

    if (success && duration > 0) {
      setTimeout(() => {
        setShareSuccess(prev => ({
          ...prev,
          [postId]: false
        }));
      }, duration);
    }
  }, []);

  const clearShareSuccess = useCallback((postId: string) => {
    setShareSuccess(prev => ({
      ...prev,
      [postId]: false
    }));
  }, []);

  const areCommentsVisible = useCallback((postId: string): boolean => {
    return Boolean(showComments[postId]);
  }, [showComments]);

  const isPostMenuVisible = useCallback((postId: string): boolean => {
    return Boolean(showPostMenus[postId]);
  }, [showPostMenus]);

  const isPostBeingEdited = useCallback((postId: string): boolean => {
    return editingPost === postId;
  }, [editingPost]);

  const isShareSuccessVisible = useCallback((postId: string): boolean => {
    return Boolean(shareSuccess[postId]);
  }, [shareSuccess]);

  const hideComments = useCallback((postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: false
    }));
  }, []);

  const showCommentsForPost = useCallback((postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: true
    }));
  }, []);

  const closePostMenu = useCallback((postId: string) => {
    setShowPostMenus(prev => ({
      ...prev,
      [postId]: false
    }));
  }, []);

  const resetAllStates = useCallback(() => {
    setShowComments({});
    setShowPostMenus({});
    setEditingPost(null);
    setEditText('');
    setShareSuccess({});
  }, []);

  const resetPostStates = useCallback((postId: string) => {
    setShowComments(prev => {
      const newState = { ...prev };
      delete newState[postId];
      return newState;
    });

    setShowPostMenus(prev => {
      const newState = { ...prev };
      delete newState[postId];
      return newState;
    });

    setShareSuccess(prev => {
      const newState = { ...prev };
      delete newState[postId];
      return newState;
    });

    if (editingPost === postId) {
      setEditingPost(null);
      setEditText('');
    }
  }, [editingPost]);

  const getInteractionState = useCallback((postId: string, userId: string): InteractionState => {
    const interactionKey = `${postId}_${userId}`;
    return interactions[interactionKey] || {};
  }, [interactions]);

  const getInteractionCounts = useCallback((postId: string) => {
    return interactionCounts[postId] || {};
  }, [interactionCounts]);

  const getInteractionHistory = useCallback((userId: string, filters: any = {}) => {
    let filtered = interactionHistory.filter(entry => entry.userId === userId);

    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }

    if (filters.postId) {
      filtered = filtered.filter(entry => entry.postId === filters.postId);
    }

    if (filters.excludeUndone) {
      filtered = filtered.filter(entry => !entry.undone);
    }

    return filtered;
  }, [interactionHistory]);

  const getShareState = useCallback((postId: string): ShareState => {
    return shareStates[postId] || { loading: false, error: null, success: false };
  }, [shareStates]);

  const getShareAnalytics = useCallback((postId: string): ShareAnalytics => {
    return shareAnalytics[postId] || {
      totalShares: 0,
      shareBreakdown: {
        friends: 0,
        feed: 0,
        groups: 0
      },
      lastSharedAt: null,
      recentShares: []
    };
  }, [shareAnalytics]);

  const clearShareState = useCallback((postId: string) => {
    setShareStates(prev => ({
      ...prev,
      [postId]: { loading: false, error: null, success: false }
    }));
  }, []);

  const updateShareCount = useCallback((postId: string, increment: number = 1) => {
    setInteractionCounts(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        share: Math.max(0, (prev[postId]?.share || 0) + increment)
      }
    }));

    setShareAnalytics(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        totalShares: Math.max(0, (prev[postId]?.totalShares || 0) + increment)
      } as ShareAnalytics
    }));
  }, []);

  const updateShareAnalytics = useCallback((analyticsData: { [postId: string]: ShareAnalytics }) => {
    setShareAnalytics(prev => ({
      ...prev,
      ...analyticsData
    }));
  }, []);

  const getShareHistory = useCallback((userId: string, filters: any = {}) => {
    return getInteractionHistory(userId, { ...filters, action: 'share' });
  }, [getInteractionHistory]);

  const hasUserSharedPost = useCallback((postId: string, userId: string): boolean => {
    const interactionKey = `${postId}_${userId}`;
    return Boolean(interactions[interactionKey]?.share);
  }, [interactions]);

  const getShareRateLimit = useCallback((userId: string) => {
    return getRateLimitInfo('share', userId);
  }, [getRateLimitInfo]);

  return {
    likePost,
    unlikePost,
    toggleLike,
    sharePost,
    unsharePost,
    isLiking: false,
    isSharing: false,
    error: null,
    // Additional properties
    showComments,
    showPostMenus,
    editingPost,
    editText,
    shareSuccess,
    interactions,
    interactionCounts,
    rateLimitState,
    interactionHistory,
    shareStates,
    shareAnalytics,
    toggleComments,
    togglePostMenu,
    closeAllMenus,
    startEditingPost,
    cancelEditingPost,
    updateEditText,
    setShareSuccessState,
    clearShareSuccess,
    hideComments,
    showCommentsForPost,
    closePostMenu,
    resetAllStates,
    resetPostStates,
    areCommentsVisible,
    isPostMenuVisible,
    isPostBeingEdited,
    isShareSuccessVisible,
    getInteractionState,
    getInteractionCounts,
    getInteractionHistory,
    getRateLimitInfo,
    isRateLimited,
    getShareState,
    getShareAnalytics,
    clearShareState,
    updateShareCount,
    updateShareAnalytics,
    getShareHistory,
    hasUserSharedPost,
    getShareRateLimit,
    savePost,
    reportPost,
    undoInteraction,
    batchUndoInteractions
  };
};
