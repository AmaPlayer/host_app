import { supabase } from '../../lib/supabase';
import notificationService from '../notificationService';

export type ContentType = 'post' | 'story' | 'moment';

class CommentService {
  
  static async addComment(contentId: string, contentType: ContentType, commentData: any): Promise<any> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', commentData.userId).single();
      if (!user) throw new Error('User not found');

      const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';
      const foreignKey = contentType === 'moment' ? 'moment_id' : 'post_id';

      const { data: comment, error } = await supabase
        .from(table)
        .insert({
          [foreignKey]: contentId,
          user_id: user.id,
          text: commentData.text
        })
        .select()
        .single();

      if (error) throw error;

      // Notifications
      // ... logic to notify owner ...

      return {
        id: comment.id,
        ...commentData,
        timestamp: comment.created_at
      };
    } catch (error) {
      throw error;
    }
  }

  static async getCommentsByContentId(contentId: string, contentType: ContentType): Promise<any[]> {
    const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';
    const foreignKey = contentType === 'moment' ? 'moment_id' : 'post_id';

    const { data } = await supabase
      .from(table)
      .select('*, user:users!user_id(uid, display_name, photo_url)')
      .eq(foreignKey, contentId)
      .order('created_at', { ascending: true });

    return (data || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      userId: c.user.uid,
      userDisplayName: c.user.display_name,
      userPhotoURL: c.user.photo_url,
      timestamp: c.created_at
    }));
  }

  static async deleteComment(commentId: string, contentId: string, contentType: ContentType, userId: string): Promise<void> {
    const table = contentType === 'moment' ? 'moment_comments' : 'post_comments';
    await supabase.from(table).delete().eq('id', commentId);
  }
}

export default CommentService;
