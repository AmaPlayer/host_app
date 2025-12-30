// Comments hook using Supabase
import { useEffect, useState, useCallback } from 'react';
import CommentService, { Comment, ContentType } from '../services/api/commentService';

interface UseSupabaseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching comments from Supabase
 * Works for all content types: posts, stories, moments
 */
export const useSupabaseComments = (
  contentId: string | null,
  contentType: ContentType = 'post'
): UseSupabaseCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!contentId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchedComments = await CommentService.getComments(contentId, contentType);
      setComments(fetchedComments);
    } catch (err: any) {
      console.error('❌ Error fetching comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  // Fetch comments on mount and when contentId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refresh
  };
};

/**
 * Hook specifically for post comments
 */
export const useSupabasePostComments = (
  postId: string | null
): UseSupabaseCommentsReturn => {
  return useSupabaseComments(postId, 'post');
};

/**
 * Hook specifically for moment comments
 */
export const useSupabaseMomentComments = (
  momentId: string | null
): UseSupabaseCommentsReturn => {
  return useSupabaseComments(momentId, 'moment');
};

/**
 * Hook specifically for story comments
 */
export const useSupabaseStoryComments = (
  storyId: string | null
): UseSupabaseCommentsReturn => {
  return useSupabaseComments(storyId, 'story');
};
