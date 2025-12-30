import { supabase } from '../../lib/supabase';
import { TalentVideo } from '@/types/models/search';

export interface VideoVerificationResult {
  success: boolean;
  message: string;
  updatedVideo?: Partial<TalentVideo>;
}

export interface BulkVideoVerificationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ videoId: string; error: string; }>;
}

class VideoVerificationService {
  
  async approveVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          approval_reason: reason || 'Administrative approval',
          is_approved: true, // Legacy column sync
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
      return { success: true, message: 'Approved' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async rejectVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          is_approved: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
      return { success: true, message: 'Rejected' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async flagVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          is_flagged: true,
          flagged_at: new Date().toISOString(),
          flag_reason: reason,
          verification_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
      return { success: true, message: 'Flagged' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async bulkApproveVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          approval_reason: reason,
          is_approved: true
        })
        .in('id', videoIds);

      if (error) throw error;
      return { success: true, processedCount: videoIds.length, failedCount: 0, errors: [] };
    } catch (e: any) {
      return { success: false, processedCount: 0, failedCount: videoIds.length, errors: [{ videoId: 'batch', error: e.message }] };
    }
  }

  async bulkRejectVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          is_approved: false
        })
        .in('id', videoIds);

      if (error) throw error;
      return { success: true, processedCount: videoIds.length, failedCount: 0, errors: [] };
    } catch (e: any) {
      return { success: false, processedCount: 0, failedCount: videoIds.length, errors: [{ videoId: 'batch', error: e.message }] };
    }
  }

  async bulkFlagVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    try {
      const { error } = await supabase
        .from('talent_videos')
        .update({
          is_flagged: true,
          flagged_at: new Date().toISOString(),
          flag_reason: reason,
          verification_status: 'pending'
        })
        .in('id', videoIds);

      if (error) throw error;
      return { success: true, processedCount: videoIds.length, failedCount: 0, errors: [] };
    } catch (e: any) {
      return { success: false, processedCount: 0, failedCount: videoIds.length, errors: [{ videoId: 'batch', error: e.message }] };
    }
  }

  async getVideoVerificationStats(): Promise<any> {
    // Count queries
    // Supabase simplified
    const { count: pending } = await supabase.from('talent_videos').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
    const { count: approved } = await supabase.from('talent_videos').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved');
    const { count: rejected } = await supabase.from('talent_videos').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected');
    const { count: flagged } = await supabase.from('talent_videos').select('*', { count: 'exact', head: true }).eq('is_flagged', true);

    return {
      totalVideos: (pending || 0) + (approved || 0) + (rejected || 0),
      pendingVideos: pending || 0,
      approvedVideos: approved || 0,
      rejectedVideos: rejected || 0,
      flaggedVideos: flagged || 0
    };
  }

  async getVideosByStatus(status: 'pending' | 'approved' | 'rejected', limit: number = 50): Promise<TalentVideo[]> {
    const { data } = await supabase
      .from('talent_videos')
      .select('*')
      .eq('verification_status', status)
      .limit(limit);
    return (data || []).map(this.mapToModel);
  }

  async getFlaggedVideos(limit: number = 50): Promise<TalentVideo[]> {
    const { data } = await supabase
      .from('talent_videos')
      .select('*')
      .eq('is_flagged', true)
      .limit(limit);
    return (data || []).map(this.mapToModel);
  }

  validateVideoOperation(operation: string, videoIds: string[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }

  private mapToModel(data: any): TalentVideo {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      verificationStatus: data.verification_status,
      // ... map other fields as needed
    } as TalentVideo;
  }
}

export default new VideoVerificationService();
