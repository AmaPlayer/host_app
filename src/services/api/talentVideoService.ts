import { supabase } from '../../lib/supabase';
import { TalentVideo, VideoVerification } from '../../features/profile/types/TalentVideoTypes';
import { storageService } from '../storage';

class TalentVideoService {

  /**
   * Add a new talent video
   */
  async addTalentVideo(userId: string, videoData: TalentVideo): Promise<string> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      // Upload video if file exists in videoData (usually handled by UI but we check)
      // If videoData just has metadata and no file, we assume URL is provided?
      // The interface TalentVideo has `videoUrl`.
      // The previous service `addTalentVideo` took `videoData` which matched the Firestore doc structure.
      // We assume the file upload happened before or is not part of this service method?
      // Wait, previous `addTalentVideo` just did `setDoc`. It did NOT upload.
      // So we assume `videoData.videoUrl` is populated.

      const { data, error } = await supabase
        .from('talent_videos')
        .insert({
          user_id: user.id,
          title: videoData.title,
          description: videoData.description,
          video_url: videoData.videoUrl,
          thumbnail_url: videoData.thumbnailUrl,
          sport: videoData.sport,
          skills: videoData.skills,
          verification_status: 'pending',
          verification_deadline: videoData.verificationDeadline,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('❌ Error adding talent video:', error);
      throw error;
    }
  }

  /**
   * Update talent video
   */
  async updateTalentVideo(videoId: string, updates: Partial<TalentVideo>): Promise<void> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.skills) updateData.skills = updates.skills;

      const { error } = await supabase
        .from('talent_videos')
        .update(updateData)
        .eq('id', videoId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error updating talent video:', error);
      throw error;
    }
  }

  /**
   * Delete talent video
   */
  async deleteTalentVideo(videoId: string): Promise<void> {
    try {
      // Get URL to delete from storage
      const { data } = await supabase.from('talent_videos').select('video_url').eq('id', videoId).single();

      if (data?.video_url) {
        try {
          await storageService.deleteFile(data.video_url);
        } catch (e) {
          console.warn('Failed to delete video from storage', e);
        }
      }

      const { error } = await supabase.from('talent_videos').delete().eq('id', videoId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error deleting talent video:', error);
      throw error;
    }
  }

  /**
   * Get all talent videos for a user
   */
  async getUserTalentVideos(userId: string): Promise<TalentVideo[]> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      const { data, error } = await supabase
        .from('talent_videos')
        .select(`
          *,
          user:users!user_id (
            uid
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSupabaseToTalentVideo);
    } catch (error) {
      console.error('❌ Error fetching user talent videos:', error);
      return [];
    }
  }

  /**
   * Listen to user videos (Polling fallback or Realtime)
   */
  listenToUserTalentVideos(
    userId: string,
    onVideosUpdate: (videos: TalentVideo[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    // Basic implementation: fetch once then return dummy unsub
    this.getUserTalentVideos(userId).then(onVideosUpdate).catch(e => onError?.(e));
    return () => { };
  }

  /**
   * Get specific video
   */
  async getTalentVideo(videoId: string): Promise<TalentVideo | null> {
    try {
      const { data, error } = await supabase
        .from('talent_videos')
        .select(`
          *,
          user:users!user_id (
            uid
          )
        `)
        .eq('id', videoId)
        .single();

      if (error) return null;
      return this.mapSupabaseToTalentVideo(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Add verification
   */
  async addVerification(videoId: string, verification: VideoVerification): Promise<void> {
    try {
      // Calls the secure Postgres function (RPC)
      // This handles: Locking, Duplicate Check, Append, Status Update, and User Profile Sync
      const { data, error } = await supabase.rpc('verify_talent_video_secure', {
        p_video_id: videoId,
        p_verifier_data: verification
      });

      if (error) throw error;

    } catch (error) {
      console.error('❌ Error adding verification:', error);
      throw error;
    }
  }

  /**
   * Update status
   */
  async updateVerificationStatus(
    videoId: string,
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          verification_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error updating verification status:', error);
      throw error;
    }
  }

  async incrementViewCount(videoId: string): Promise<void> {
    // RPC or fetch-update
    // Using simple update
    const { data } = await supabase.from('talent_videos').select('views_count').eq('id', videoId).single();
    const { error } = await supabase.from('talent_videos').update({ views_count: (data?.views_count || 0) + 1 }).eq('id', videoId);
    if (error) console.error('Error incrementing view count:', error);
  }

  private mapSupabaseToTalentVideo(data: any): TalentVideo {
    return {
      id: data.id,
      userId: data.user?.uid || data.user_id, // Prefer joined UID, fallback to internal ID
      title: data.title,
      description: data.description,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      sport: data.sport,
      skills: data.skills || [],
      uploadDate: new Date(data.created_at),
      verificationDeadline: data.verification_deadline ? new Date(data.verification_deadline) : undefined,
      verificationStatus: data.verification_status,
      verifications: data.verifications,
      viewCount: data.views_count
    } as TalentVideo;
  }
}

export const talentVideoService = new TalentVideoService();
export default talentVideoService;
