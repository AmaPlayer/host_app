import { supabase } from '../../lib/supabase';
import { 
  MomentVideo, 
  CreateMomentData, 
  UpdateMomentData, 
  MomentsQueryOptions, 
  PaginatedMomentsResult, 
  VideoComment, 
  CreateVideoCommentData, 
  ToggleVideoLikeResult, 
  VideoUploadResult,
  EnhancedVideoUploadResult,
  MomentInteraction,
  UploadProgressCallback
} from '../../types/models/moment';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';
import notificationService from '../notificationService';

class MomentsService {
  private static readonly STORAGE_PATH = 'moments';

  /**
   * Fetch paginated moments
   */
  static async getMoments(options: MomentsQueryOptions = {}): Promise<PaginatedMomentsResult> {
    try {
      const { limit = 20, page = 0, currentUserId, userId, moderationStatus } = options;
      const offset = page * limit;

      let query = supabase
        .from('moments')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        const { data: u } = await supabase.from('users').select('id').eq('uid', userId).single();
        if (u) query = query.eq('user_id', u.id);
        else return { moments: [], hasMore: false, lastDocument: null };
      }

      if (moderationStatus) {
        query = query.eq('moderation_status', moderationStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return { moments: [], hasMore: false, lastDocument: null };

      // Batch fetch likes
      let likedIds = new Set<string>();
      if (currentUserId && data.length > 0) {
        const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).single();
        if (user) {
          const ids = data.map(m => m.id);
          const { data: likes } = await supabase
            .from('moment_likes')
            .select('moment_id')
            .eq('user_id', user.id)
            .in('moment_id', ids);
          likes?.forEach(l => likedIds.add(l.moment_id));
        }
      }

      const moments = data.map(m => this.mapMomentToModel(m, likedIds.has(m.id)));

      return {
        moments,
        hasMore: data.length === limit,
        lastDocument: null // Not needed for offset pagination but kept for interface compat
      };
    } catch (error) {
      console.error('Error fetching moments:', error);
      return { moments: [], hasMore: false, lastDocument: null };
    }
  }

  /**
   * Get single moment
   */
  static async getMomentById(momentId: string, currentUserId?: string): Promise<MomentVideo | null> {
    try {
      const { data, error } = await supabase
        .from('moments')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('id', momentId)
        .single();

      if (error) return null;

      let isLiked = false;
      if (currentUserId) {
        const { data: user } = await supabase.from('users').select('id').eq('uid', currentUserId).single();
        if (user) {
          const { data: like } = await supabase
            .from('moment_likes')
            .select('id')
            .eq('moment_id', momentId)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!like;
        }
      }

      return this.mapMomentToModel(data, isLiked);
    } catch (error) {
      console.error('Error fetching moment:', error);
      return null;
    }
  }

  /**
   * Create moment (Uploads to Firebase Storage, saves to Supabase)
   */
  static async createMoment(momentData: CreateMomentData): Promise<string> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', momentData.userId).single();
      if (!user) throw new Error('User not found');

      // Note: Video upload handled separately via uploadVideo usually, 
      // but if creating the record requires the URL, it should be passed in momentData 
      // OR we create a placeholder record then update it.
      // The interface CreateMomentData has `videoFile`.
      // We'll assume the UI calls uploadVideo first? No, the previous service did it here.
      // But uploadVideo returns a result.
      // Let's implement basic placeholder creation here if we follow the previous pattern,
      // BUT the previous pattern returned docRef.id before upload finished? No.
      // It created the doc.
      // Actually, standard pattern is: Upload first, then create record.
      // But for compatibility, let's look at the previous service. 
      // It did: addDoc -> return ID. Then presumably the caller handles upload?
      // Wait, the previous service `createMoment` took `CreateMomentData` which has `videoFile`.
      // It created the doc with empty videoUrl, then returned ID.
      // The Caller `useVideoManager` likely handles the upload.
      
      const { data: moment, error } = await supabase
        .from('moments')
        .insert({
          user_id: user.id,
          video_url: '',
          thumbnail_url: '',
          caption: momentData.caption,
          duration: momentData.duration || 0,
          metadata: {
            fileSize: momentData.videoFile.size,
            format: momentData.videoFile.type,
            processingStatus: 'pending'
          },
          moderation_status: 'pending',
          is_active: true
        })
        .select('id')
        .single();

      if (error) throw error;
      return moment.id;
    } catch (error) {
      console.error('Error creating moment:', error);
      throw error;
    }
  }

  /**
   * Update moment (e.g. after upload)
   */
  static async updateMoment(momentId: string, updateData: UpdateMomentData): Promise<void> {
    try {
      // Map fields
      const updates: any = { updated_at: new Date().toISOString() };
      if (updateData.videoUrl) updates.video_url = updateData.videoUrl;
      if (updateData.thumbnailUrl) updates.thumbnail_url = updateData.thumbnailUrl;
      if (updateData.metadata) updates.metadata = updateData.metadata;
      if (updateData.moderationStatus) updates.moderation_status = updateData.moderationStatus;

      const { error } = await supabase
        .from('moments')
        .update(updates)
        .eq('id', momentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating moment:', error);
      throw error;
    }
  }

  /**
   * Delete moment
   */
  static async deleteMoment(momentId: string): Promise<void> {
    try {
      // Get video URL to delete from storage
      const { data } = await supabase.from('moments').select('video_url').eq('id', momentId).single();
      
      if (data?.video_url) {
        // Try delete from Firebase Storage
        // We need to parse the path from the URL or reconstruct it
        // The previous service used `moments/${momentId}/video`
        try {
          const videoRef = ref(storage, `${this.STORAGE_PATH}/${momentId}/video`);
          await deleteObject(videoRef);
        } catch (e) {
          console.warn('Failed to delete video from storage', e);
        }
      }

      await supabase.from('moments').delete().eq('id', momentId);
    } catch (error) {
      console.error('Error deleting moment:', error);
      throw error;
    }
  }

  /**
   * Toggle Like
   */
  static async toggleLike(momentId: string, userId: string, userDisplayName: string, userPhotoURL: string | null): Promise<ToggleVideoLikeResult> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      const { data: existing } = await supabase
        .from('moment_likes')
        .select('id')
        .eq('moment_id', momentId)
        .eq('user_id', user.id)
        .maybeSingle();

      let liked = false;
      if (existing) {
        await supabase.from('moment_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('moment_likes').insert({ moment_id: momentId, user_id: user.id });
        liked = true;

        // Notification
        try {
          const { data: moment } = await supabase
            .from('moments')
            .select('user:users!user_id(uid)')
            .eq('id', momentId)
            .single();
            
          if ((moment?.user as any)?.uid) {
            await notificationService.sendLikeNotification(
              userId, userDisplayName, userPhotoURL || '', 
              (moment.user as any).uid, momentId, { contentType: 'moment' }
            );
          }
        } catch (e) {
          console.error('Notification failed', e);
        }
      }

      // Fetch updated count
      const { data: moment } = await supabase.from('moments').select('likes_count').eq('id', momentId).single();
      
      return {
        liked,
        likesCount: moment?.likes_count || 0
      };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add Comment
   */
  static async addComment(momentId: string, commentData: CreateVideoCommentData): Promise<string> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', commentData.userId).single();
      if (!user) throw new Error('User not found');

      const { data: comment, error } = await supabase
        .from('moment_comments')
        .insert({
          moment_id: momentId,
          user_id: user.id,
          text: commentData.text
        })
        .select('id')
        .single();

      if (error) throw error;

      // Counter is automatically updated by database trigger (moment_counters_trigger.sql)
      // No manual increment needed - prevents double-counting

      return comment.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get Comments
   */
  static async getComments(momentId: string, limit = 20): Promise<VideoComment[]> {
    try {
      const { data, error } = await supabase
        .from('moment_comments')
        .select(`
          id, text, created_at,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('moment_id', momentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        momentId,
        userId: c.user.uid,
        userDisplayName: c.user.display_name,
        userPhotoURL: c.user.photo_url,
        timestamp: c.created_at,
        likes: [],
        likesCount: 0,
        replies: []
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Toggle Comment Like
   */
  static async toggleCommentLike(commentId: string, userId: string): Promise<void> {
    // Not implemented in SQL yet
    return;
  }

  /**
   * Track Interaction
   */
  static async trackInteraction(interaction: MomentInteraction): Promise<void> {
    if (interaction.type === 'view') {
       const { data } = await supabase.from('moments').select('views_count').eq('id', interaction.momentId).single();
       await supabase.from('moments').update({ views_count: (data?.views_count || 0) + 1 }).eq('id', interaction.momentId);
    }
  }

  /**
   * Upload Video (Firebase)
   * Kept largely identical to preserve logic
   */
  static async uploadVideo(
    file: File,
    momentId: string,
    onProgress?: UploadProgressCallback,
    onTaskCreated?: (task: UploadTask) => void,
    timeoutMs: number = 5 * 60 * 1000
  ): Promise<EnhancedVideoUploadResult> {
    const startTime = Date.now();
    try {
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const videoRef = ref(storage, `${this.STORAGE_PATH}/${momentId}/video.${fileExtension}`);
      const uploadTask = uploadBytesResumable(videoRef, file);

      if (onTaskCreated) onTaskCreated(uploadTask);

      return new Promise<EnhancedVideoUploadResult>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress, snapshot.bytesTransferred, snapshot.totalBytes);
          },
          (error) => reject(error),
          async () => {
            const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              videoUrl,
              thumbnailUrl: videoUrl, // Generate actual thumb if possible
              metadata: {
                width: 0, height: 0, fileSize: file.size, format: file.type,
                aspectRatio: '9:16', uploadedAt: new Date().toISOString(),
                processingStatus: 'completed'
              },
              uploadDuration: Date.now() - startTime,
              bytesTransferred: uploadTask.snapshot.bytesTransferred,
              totalBytes: uploadTask.snapshot.totalBytes
            });
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  static async cleanupFailedUpload(momentId: string): Promise<void> {
    await this.deleteMoment(momentId);
  }

  static async getMomentsByUser(userId: string, limit = 20): Promise<MomentVideo[]> {
    const { moments } = await this.getMoments({ userId, limit, moderationStatus: 'approved' });
    return moments;
  }

  static async searchMoments(searchTerm: string, limit = 20): Promise<MomentVideo[]> {
    const { data } = await supabase
      .from('moments')
      .select(`*, user:users!user_id(uid, display_name, photo_url)`)
      .textSearch('caption', searchTerm)
      .limit(limit);
    return (data || []).map(m => this.mapMomentToModel(m, false));
  }

  static async getVerifiedTalentVideos(limit = 10): Promise<MomentVideo[]> {
    try {
      const { data } = await supabase
        .from('talent_videos')
        .select(`*, user:users!user_id(uid, display_name, photo_url)`)
        .eq('is_approved', true)
        .limit(limit);
      
      return (data || []).map(m => ({
        id: m.id,
        userId: m.user.uid,
        userDisplayName: m.user.display_name,
        userPhotoURL: m.user.photo_url,
        videoUrl: m.video_url,
        thumbnailUrl: m.video_url, // fallback
        caption: m.title || '',
        duration: 0,
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.created_at),
        isActive: true,
        moderationStatus: 'approved',
        engagement: { likes: [], likesCount: 0, comments: [], commentsCount: 0, shares: [], sharesCount: 0, views: 0, watchTime: 0, completionRate: 0 },
        metadata: { width: 0, height: 0, fileSize: 0, format: 'mp4', aspectRatio: '9:16', uploadedAt: m.created_at, processingStatus: 'completed' },
        isTalentVideo: true,
        isLiked: false
      }));
    } catch (e) {
      return [];
    }
  }

  static async getShortVideoPosts(limit = 10, currentUserId?: string): Promise<MomentVideo[]> {
    // Implement using posts table
    try {
       const { data } = await supabase
         .from('posts')
         .select(`*, user:users!user_id(uid, display_name, photo_url)`)
         .eq('media_type', 'video')
         .limit(limit);
         
       return (data || []).map(p => ({
         id: p.id,
         userId: p.user.uid,
         userDisplayName: p.user.display_name,
         userPhotoURL: p.user.photo_url,
         videoUrl: p.media_url,
         thumbnailUrl: p.media_url,
         caption: p.caption,
         duration: (p.metadata as any)?.duration || 0,
         createdAt: new Date(p.created_at),
         updatedAt: new Date(p.updated_at),
         isActive: true,
         moderationStatus: 'approved',
         engagement: { 
            likes: [], likesCount: p.likes_count, 
            comments: [], commentsCount: p.comments_count, 
            shares: [], sharesCount: p.shares_count, 
            views: 0, watchTime: 0, completionRate: 0 
         },
         metadata: p.metadata || {},
         isPostVideo: true,
         isLiked: false // logic to check likes needed if currentUserId passed
       }));
    } catch(e) {
      return [];
    }
  }

  static async getCombinedFeed(options: MomentsQueryOptions = {}): Promise<PaginatedMomentsResult> {
    const { limit = 20, currentUserId } = options;
    const [moments, talent, posts] = await Promise.all([
      this.getMoments({ ...options, limit: limit / 2 }),
      this.getVerifiedTalentVideos(limit / 4),
      this.getShortVideoPosts(limit / 4, currentUserId)
    ]);
    
    // Sort combined
    const combined = [...moments.moments, ...talent, ...posts].sort((a, b) => 
      new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()
    );
    
    return {
      moments: combined,
      hasMore: moments.hasMore,
      lastDocument: null
    };
  }

  // Helper
  private static mapMomentToModel(row: any, isLiked: boolean): MomentVideo {
    return {
      id: row.id,
      userId: row.user?.uid || '',
      userDisplayName: row.user?.display_name || 'Unknown',
      userPhotoURL: row.user?.photo_url || '',
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url || row.video_url,
      caption: row.caption,
      duration: row.duration,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isActive: row.is_active,
      moderationStatus: row.moderation_status,
      engagement: {
        likes: [],
        likesCount: row.likes_count || 0,
        comments: [],
        commentsCount: row.comments_count || 0,
        shares: [],
        sharesCount: row.shares_count || 0,
        views: row.views_count || 0,
        watchTime: 0,
        completionRate: 0
      },
      metadata: row.metadata,
      isLiked
    };
  }
}

export default MomentsService;
