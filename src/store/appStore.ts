// Centralized App Store using Zustand
import { create, StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PostsStore,
  UIStore,
  UserStore,
  SettingsStore,
  LegacyPerformanceStore
} from '../types/store/app';
import type { Post, User } from '../types/models';

// Posts Store - Manages all post-related state
const postsStoreCreator: StateCreator<
  PostsStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  PostsStore
> = (set, get) => ({
  // State
  posts: [],
  loading: false,
  hasMore: true,
  lastDoc: null,
  error: null,

  // Actions
  setPosts: (posts: Post[]) => set({ posts }),
  addPosts: (newPosts: Post[]) => set((state) => {
    // Edge case: if no new posts, return current state
    if (!newPosts || newPosts.length === 0) {
      return state;
    }

    // Create a Set of existing post IDs for O(1) lookup
    const existingIds = new Set(state.posts.map(post => post.id).filter(Boolean));

    // Filter out duplicates from new posts
    // Also deduplicate within the new posts array itself
    const seenIds = new Set<string>();
    const uniqueNewPosts = newPosts.filter(post => {
      // Skip posts without valid IDs
      if (!post || !post.id) {
        return false;
      }

      // Skip if already exists in current posts
      if (existingIds.has(post.id)) {
        return false;
      }

      // Skip if already seen in this batch
      if (seenIds.has(post.id)) {
        return false;
      }

      // Mark as seen and include
      seenIds.add(post.id);
      return true;
    });

    // Development logging for duplicate detection
    if (process.env.NODE_ENV === 'development') {
      const duplicateCount = newPosts.length - uniqueNewPosts.length;
      // Only warn if ALL new posts were duplicates (might indicate a loop or bad pagination)
      if (duplicateCount > 0 && uniqueNewPosts.length === 0) {
        console.warn(`[PostsStore] All ${duplicateCount} fetched posts were duplicates. Checking pagination...`);
      }
    }

    return {
      posts: [...state.posts, ...uniqueNewPosts]
    };
  }),
  addPost: (post: Post) => set((state) => ({
    posts: [post, ...state.posts]
  })),
  updatePost: (postId: string, updates: Partial<Post>) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    )
  })),
  removePost: (postId: string) => set((state) => ({
    posts: state.posts.filter(post => post.id !== postId)
  })),
  setLoading: (loading: boolean) => set({ loading }),
  setHasMore: (hasMore: boolean) => set({ hasMore }),
  setLastDoc: (lastDoc: any | null) => set({ lastDoc }),
  setError: (error: string | null) => set({ error }),

  // Computed values
  getPostById: (postId: string) => get().posts.find(post => post.id === postId),
  getPostsByUser: (userId: string) => get().posts.filter(post => post.userId === userId),

  // Reset
  reset: () => set({
    posts: [],
    loading: false,
    hasMore: true,
    lastDoc: null,
    error: null
  })
});

export const usePostsStore = create<PostsStore>()(
  subscribeWithSelector(
    persist(postsStoreCreator, {
      name: 'posts-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        posts: state.posts.slice(0, 50) // Only persist last 50 posts
      })
    })
  )
);

// UI Store - Manages UI state and interactions
const uiStoreCreator: StateCreator<
  UIStore,
  [['zustand/subscribeWithSelector', never]],
  [],
  UIStore
> = (set, get) => ({
  // State
  showComments: {},
  showPostMenus: {},
  selectedMedia: null,
  mediaPreview: null,
  uploading: false,
  uploadProgress: 0,

  // Modal states
  modals: {
    profile: false,
    settings: false,
    imageViewer: false,
    videoPlayer: false
  },

  // Form states
  forms: {
    newComment: {},
    postText: '',
    postViolation: null,
    showPostWarning: false
  },

  // Actions
  toggleComments: (postId: string) => set((state) => ({
    showComments: {
      ...state.showComments,
      [postId]: !state.showComments[postId]
    }
  })),

  togglePostMenu: (postId: string) => set((state) => ({
    showPostMenus: {
      ...state.showPostMenus,
      [postId]: !state.showPostMenus[postId]
    }
  })),

  closeAllMenus: () => set({ showPostMenus: {} }),

  setSelectedMedia: (media: any | null) => set({ selectedMedia: media }),
  setMediaPreview: (preview: string | null) => set({ mediaPreview: preview }),
  setUploading: (uploading: boolean) => set({ uploading }),
  setUploadProgress: (progress: number) => set({ uploadProgress: progress }),

  // Modal actions
  openModal: (modalName: string) => set((state) => ({
    modals: { ...state.modals, [modalName]: true }
  })),
  closeModal: (modalName: string) => set((state) => ({
    modals: { ...state.modals, [modalName]: false }
  })),
  closeAllModals: () => set((state) => {
    const modals = Object.keys(state.modals).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    return { modals } as Partial<UIStore>;
  }),

  // Form actions
  setNewComment: (postId: string, comment: string) => set((state) => ({
    forms: {
      ...state.forms,
      newComment: { ...state.forms.newComment, [postId]: comment }
    }
  })),

  setPostText: (text: string) => set((state) => ({
    forms: { ...state.forms, postText: text }
  })),

  setPostViolation: (violation: string | null) => set((state) => ({
    forms: { ...state.forms, postViolation: violation }
  })),

  setShowPostWarning: (show: boolean) => set((state) => ({
    forms: { ...state.forms, showPostWarning: show }
  })),

  // Reset form
  resetPostForm: () => set((state) => ({
    forms: {
      ...state.forms,
      postText: '',
      postViolation: null,
      showPostWarning: false
    },
    selectedMedia: null,
    mediaPreview: null,
    uploading: false,
    uploadProgress: 0
  }))
});

export const useUIStore = create<UIStore>()(
  subscribeWithSelector(uiStoreCreator)
);

// User Store - Manages user data and cache
const userStoreCreator: StateCreator<
  UserStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  UserStore
> = (set, get) => ({
  // State
  users: new Map<string, User>(),
  currentUser: null,
  loading: false,

  // Actions
  setCurrentUser: (user: User | null) => set({ currentUser: user }),
  addUser: (user: User) => set((state) => {
    const newUsers = new Map(state.users);
    newUsers.set(user.uid, user);
    return { users: newUsers };
  }),
  addUsers: (users: User[]) => set((state) => {
    const newUsers = new Map(state.users);
    users.forEach(user => newUsers.set(user.uid, user));
    return { users: newUsers };
  }),
  updateUser: (userId: string, updates: Partial<User>) => set((state) => {
    const newUsers = new Map(state.users);
    const existingUser = newUsers.get(userId);
    if (existingUser) {
      newUsers.set(userId, { ...existingUser, ...updates });
    }
    return { users: newUsers };
  }),

  // Getters
  getUser: (userId: string) => get().users.get(userId),
  getUsersArray: () => Array.from(get().users.values()),

  setLoading: (loading: boolean) => set({ loading }),

  // Clear cache
  clearUserCache: () => set({ users: new Map<string, User>() })
});

export const useUserStore = create<UserStore>()(
  subscribeWithSelector(
    persist(userStoreCreator, {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: Array.from(state.users.entries()).slice(0, 100) // Convert Map to array for storage
      }),
      onRehydrateStorage: () => (state) => {
        // Convert array back to Map on rehydration
        if (state && Array.isArray(state.users)) {
          state.users = new Map(state.users as [string, User][]);
        }
      }
    })
  )
);

// Legacy Performance Store - Kept for backward compatibility
export const useLegacyPerformanceStore = create<LegacyPerformanceStore>()((set, get) => ({
  // State
  metrics: {
    pageLoadTime: 0,
    renderTime: 0,
    apiResponseTimes: [],
    memoryUsage: 0,
    cacheHitRate: 0
  },

  // Actions
  recordPageLoad: (time: number) => set((state) => ({
    metrics: { ...state.metrics, pageLoadTime: time }
  })),

  recordRenderTime: (time: number) => set((state) => ({
    metrics: { ...state.metrics, renderTime: time }
  })),

  recordApiResponse: (time: number) => set((state) => ({
    metrics: {
      ...state.metrics,
      apiResponseTimes: [...state.metrics.apiResponseTimes.slice(-9), time] // Keep last 10
    }
  })),

  updateMemoryUsage: () => {
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      set((state) => ({
        metrics: {
          ...state.metrics,
          memoryUsage: perfMemory.usedJSHeapSize / 1024 / 1024 // MB
        }
      }));
    }
  },

  // Get average API response time
  getAverageApiTime: () => {
    const times = get().metrics.apiResponseTimes;
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
}));

// App Settings Store
const settingsStoreCreator: StateCreator<
  SettingsStore,
  [['zustand/persist', unknown]],
  [],
  SettingsStore
> = (set, get) => ({
  // State
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: false,
    likes: true,
    comments: true,
    follows: true
  },
  performance: {
    enableAnimations: true,
    enableAutoplay: true,
    imageQuality: 'high',
    cacheSize: 100
  },

  // Actions
  setTheme: (theme: 'light' | 'dark') => set({ theme }),
  setLanguage: (language: string) => set({ language }),
  updateNotificationSettings: (settings) => set((state) => ({
    notifications: { ...state.notifications, ...settings }
  })),
  updatePerformanceSettings: (settings) => set((state) => ({
    performance: { ...state.performance, ...settings }
  }))
});

export const useSettingsStore = create<SettingsStore>()(
  persist(settingsStoreCreator, {
    name: 'settings-storage',
    storage: createJSONStorage(() => localStorage)
  })
);

// Re-export the enhanced performance store from performanceStore.ts
export { usePerformanceStore } from './performanceStore';
