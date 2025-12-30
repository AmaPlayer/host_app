import { supabase } from '../lib/supabase';
import { TalentVideo } from '../types/models/search';

export interface BulkVideoOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ videoId: string; error: string }>;
}

export class VideoVerificationService {
  private readonly TABLE_NAME = 'talent_videos';

  async approveVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          approval_reason: reason || 'Administrative approval',
          is_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to approve video: ${error}`);
    }
  }

  async bulkApproveVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          is_approved: true
        })
        .in('id', videoIds);
      
      if (error) throw error;
      result.processedCount = videoIds.length;
    } catch (error: any) {
      result.failedCount = videoIds.length;
      result.errors.push({ videoId: 'batch', error: error.message });
    }
    return result;
  }

  async bulkRejectVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          is_approved: false
        })
        .in('id', videoIds);
      
      if (error) throw error;
      result.processedCount = videoIds.length;
    } catch (error: any) {
      result.failedCount = videoIds.length;
      result.errors.push({ videoId: 'batch', error: error.message });
    }
    return result;
  }

  async bulkFlagVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          is_flagged: true,
          flagged_at: new Date().toISOString(),
          flag_reason: reason,
          verification_status: 'pending'
        })
        .in('id', videoIds);
      
      if (error) throw error;
      result.processedCount = videoIds.length;
    } catch (error: any) {
      result.failedCount = videoIds.length;
      result.errors.push({ videoId: 'batch', error: error.message });
    }
    return result;
  }

  async rejectVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || 'Administrative rejection',
          is_approved: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to reject video: ${error}`);
    }
  }

  async flagVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          is_flagged: true,
          flagged_at: new Date().toISOString(),
          flag_reason: reason || 'Administrative flag',
          verification_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to flag video: ${error}`);
    }
  }

  async getVideoById(videoId: string): Promise<TalentVideo | null> {
    try {
      const { data, error } = await supabase.from(this.TABLE_NAME).select('*').eq('id', videoId).single();
      if (error) return null;
      return this.mapToModel(data);
    } catch (error) {
      return null;
    }
  }

  async getVerificationStats(): Promise<any> {
    try {
      const { count: total } = await supabase.from(this.TABLE_NAME).select('*', { count: 'exact', head: true });
      const { count: pending } = await supabase.from(this.TABLE_NAME).select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
      const { count: approved } = await supabase.from(this.TABLE_NAME).select('*', { count: 'exact', head: true }).eq('verification_status', 'approved');
      const { count: rejected } = await supabase.from(this.TABLE_NAME).select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected');

      return {
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0
      };
    } catch (error) {
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }
  }

  async getAllVideos(): Promise<TalentVideo[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select(`
          *,
          user:users!user_id(uid, display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      return [];
    }
  }

  private mapToModel(data: any): TalentVideo {
    return {
      id: data.id,
      title: data.title || 'Untitled Video',
      description: data.description || '',
      videoUrl: data.video_url || '',
      thumbnail: data.thumbnail_url || '',
      category: data.sport || '',
      userName: data.user?.display_name || data.user_id,
      userId: data.user?.uid || data.user_id,
      userEmail: data.user?.email || '',
      verificationStatus: data.verification_status || 'pending',
      isFlagged: data.is_flagged || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isVerified: data.verification_status === 'verified',
      isActive: data.verification_status !== 'rejected'
    } as any;
  }
}

export const videoVerificationService = new VideoVerificationService();
export default videoVerificationService;
