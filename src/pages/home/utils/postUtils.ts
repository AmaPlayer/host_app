import { Post } from '../../../types/models';
import { User } from 'firebase/auth';

export const handlePostLike = async (
  postId: string,
  currentLikes: string[],
  isSamplePost: boolean = false,
  postData: Post | null = null,
  currentUser: User | null,
  trackBehavior: ((event: string, data: any) => void) | null,
  trackInteraction: (type: string, id: string, data: any) => void,
  likePost: (postId: string, currentLikes: string[], currentUser: User, postData?: Post | null) => Promise<void>
): Promise<void> => {
  if (!currentUser) return;

  if (trackBehavior) {
    trackBehavior('post_like', {
      userId: currentUser.uid,
      contentId: postId,
      contentType: 'post',
      mediaType: postData?.mediaType || 'text',
      duration: 0
    });
  }

  trackInteraction('like', postId, {
    postId,
    userId: currentUser.uid,
    isSamplePost,
    mediaType: postData?.mediaType
  });

  try {
    await likePost(postId, currentLikes, currentUser, postData);
  } catch (error) {
    console.error('Error liking post:', error);
  }
};

export const handlePostEdit = (
  postId: string,
  postData: Post,
  currentUser: User | null,
  startEditingPost: (postId: string, caption: string) => void
): void => {
  if (!currentUser || postData.userId !== currentUser.uid) {
    alert('You can only edit your own posts');
    return;
  }
  startEditingPost(postId, postData.caption || '');
};

export const handlePostSave = async (
  postId: string,
  editText: string,
  updatePost: (postId: string, data: { caption: string; currentUser: User }) => Promise<void>,
  cancelEditingPost: () => void,
  currentUser: User | null
): Promise<void> => {
  if (!editText.trim()) {
    alert('Post content cannot be empty');
    return;
  }

  if (!currentUser) {
    alert('You must be logged in to edit posts');
    return;
  }

  try {
    // Optimistically cancel edit mode immediately for better UX
    cancelEditingPost();

    // Update in background without blocking UI
    updatePost(postId, {
      caption: editText.trim(),
      currentUser
    }).catch(error => {
      // Only show error if update fails
      console.error('Failed to update post:', error);
      alert('Failed to update post: ' + error.message);
    });
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    }
  }
};

export const handlePostDeletion = async (
  postId: string,
  postData: Post,
  currentUser: User | null,
  deletePost: (postId: string) => Promise<void>,
  togglePostMenu: (postId: string) => void
): Promise<void> => {
  if (!currentUser || postData.userId !== currentUser.uid) {
    alert('You can only delete your own posts');
    return;
  }

  if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }

  try {
    await deletePost(postId);
    togglePostMenu(postId);
    alert('Post deleted successfully!');
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    }
  }
};

export const handlePostCreation = async (
  refreshPosts: () => Promise<void>,
  trackBehavior: ((event: string, data: any) => void) | null,
  trackAnalytics: (event: string, data: any) => void,
  notifyContent: ((type: string, data: any) => void) | null | undefined,
  currentUser: User | null
): Promise<void> => {
  if (!currentUser) return;

  try {
    // await refreshPosts(); // Removed to prevent list reset/flashing, handled by optimistic update

    if (trackBehavior && typeof trackBehavior === 'function') {
      trackBehavior('post_create', {
        userId: currentUser.uid,
        contentId: 'new_post',
        contentType: 'post',
        duration: Date.now()
      });
    }

    if (trackAnalytics && typeof trackAnalytics === 'function') {
      trackAnalytics('POST_CREATED', {
        userId: currentUser.uid,
        timestamp: Date.now()
      });
    }

    if (notifyContent && typeof notifyContent === 'function') {
      notifyContent('ready', { contentCount: 1 });
    }
  } catch (error) {
    console.error('Error after post creation:', error);
  }
};
