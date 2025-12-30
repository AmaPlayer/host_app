import { supabase } from '../../lib/supabase';
import notificationService from '../notificationService';

export type ContentType = 'post' | 'story' | 'moment';

export interface CommentData {
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
}

export interface Comment extends CommentData {
  id: string;
  contentType: ContentType;
  contentId: string;
  timestamp: string;
  likes: string[];
  likesCount: number;
  replies: unknown[];
  edited?: boolean;
  editedAt?: string;
}

/**
 * Unified Comment Service
 * Manages all comments across posts, stories, and moments using Supabase
 */
class CommentService {

  /**
   * Add a comment to a content (post, moment, story)
   */
  static async addComment(
    contentId: string,
    contentType: ContentType,
    commentData: CommentData
  ): Promise<Comment> {
    try {
      // Get user's internal ID from Firebase UID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('uid', commentData.userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';
      const foreignKey = contentType === 'moment' ? 'moment_id' : 'post_id';

      // Insert comment
      const { data: comment, error: insertError } = await supabase
        .from(table)
        .insert({
          [foreignKey]: contentId,
          user_id: user.id,
          text: commentData.text
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // The trigger will auto-update comments_count in the posts/moments table

      // Send notification to content owner
      try {
        const ownerId = await this.getContentOwnerId(contentId, contentType);

        if (ownerId && ownerId !== commentData.userId) {
          if (contentType === 'post') {
            await notificationService.sendCommentNotification(
              commentData.userId,
              commentData.userDisplayName,
              commentData.userPhotoURL || '',
              ownerId,
              contentId,
              commentData.text
            );
          }
        }
      } catch (notificationError) {
        console.error('[CommentService] Failed to send comment notification:', {
          contentId,
          contentType,
          error: notificationError
        });
      }

      return {
        id: comment.id,
        ...commentData,
        contentId,
        contentType,
        timestamp: comment.created_at,
        likes: [],
        likesCount: 0,
        replies: [],
        edited: false
      } as Comment;
    } catch (error) {
      console.error(`❌ Error adding comment to ${contentType}:`, error);
      throw error;
    }
  }

  /**
   * Get comments for content
   */
  static async getComments(
    contentId: string,
    contentType: ContentType
  ): Promise<Comment[]> {
    try {
      const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';
      const foreignKey = contentType === 'moment' ? 'moment_id' : 'post_id';

      const { data: comments, error } = await supabase
        .from(table)
        .select(`
          id,
          text,
          created_at,
          user:users!${table}_user_id_fkey (
            uid,
            display_name,
            photo_url
          )
        `)
        .eq(foreignKey, contentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (comments || []).map((comment: any) => ({
        id: comment.id,
        contentId,
        contentType,
        text: comment.text,
        timestamp: comment.created_at,
        userId: comment.user?.uid || '',
        userDisplayName: comment.user?.display_name || 'Unknown',
        userPhotoURL: comment.user?.photo_url || null,
        likes: [],
        likesCount: 0,
        replies: [],
        edited: false
      })) as Comment[];
    } catch (error) {
      console.error(`❌ Error getting comments for ${contentType}:`, error);
      return [];
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(
    commentId: string,
    contentId: string,
    contentType: ContentType,
    userId: string
  ): Promise<void> {
    try {
      // Get user's internal ID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (!user) throw new Error('User not found');

      const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';

      // Delete the comment (trigger will auto-update comments_count)
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error(`❌ Error deleting comment:`, error);
      throw error;
    }
  }

  /**
   * Edit a comment (not implemented yet - comments are immutable for now)
   */
  static async editComment(
    commentId: string,
    newText: string,
    userId: string
  ): Promise<void> {
    console.warn('Edit comment not implemented yet');
    throw new Error('Editing comments is not supported yet');
  }

  /**
   * Toggle like on a comment (not implemented yet)
   */
  static async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<void> {
    console.warn('Like comment not implemented yet');
    throw new Error('Liking comments is not supported yet');
  }

  /**
   * Get the owner ID of the content
   */
  private static async getContentOwnerId(
    contentId: string,
    contentType: ContentType
  ): Promise<string | null> {
    try {
      if (contentType === 'post') {
        const { data: post } = await supabase
          .from('posts')
          .select(`
            user_id,
            user:users!posts_user_id_fkey (
              uid
            )
          `)
          .eq('id', contentId)
          .single();

        if (!post) return null;
        const user = post.user as any;
        if (user && typeof user === 'object' && 'uid' in user) {
          return user.uid || null;
        }
        return null;
      }
      
      if (contentType === 'moment') {
        const { data: moment } = await supabase
           .from('moments')
           .select(`
             user_id,
             user:users!moments_user_id_fkey (
               uid
             )
           `)
           .eq('id', contentId)
           .single();
           
         if (!moment) return null;
         const user = moment.user as any;
         if (user && typeof user === 'object' && 'uid' in user) {
           return user.uid || null;
         }
         return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting content owner:', error);
      return null;
    }
  }
}

export default CommentService;