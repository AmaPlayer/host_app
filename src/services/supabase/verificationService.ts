import { supabase } from '../../lib/supabase';

class VerificationService {
  
  static async createVerificationRequest(userId: string, userProfile: any, userVideos: any[]): Promise<any> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      const verificationId = `verify_${userId}_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          verification_id: verificationId,
          user_info: userProfile,
          showcase_videos: userVideos,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getUserVerificationRequest(userId: string): Promise<any | null> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return null;

      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    } catch (error) {
      return null;
    }
  }

  static async submitVerification(verificationId: string, voterInfo: any): Promise<any> {
    try {
      const { data: request } = await supabase.from('verification_requests').select('*').eq('verification_id', verificationId).single();
      if (!request) throw new Error('Not found');

      // 1. Create Vote
      await supabase.from('verifications').insert({
        request_id: request.id,
        voter_ip: voterInfo.ip,
        voter_info: voterInfo
      });

      // 2. Increment Count
      const newCount = request.verification_count + 1;
      const updates: any = { verification_count: newCount };

      if (newCount >= request.verification_goal) {
        updates.status = 'verified';
        // Update user badge
        await supabase.from('users').update({ is_verified: true }).eq('id', request.user_id);
      }

      await supabase.from('verification_requests').update(updates).eq('id', request.id);

      return { success: true, newCount };
    } catch (error) {
      throw error;
    }
  }

  static generateShareableLink(verificationId: string): string {
    return `${window.location.origin}/verify/${verificationId}`;
  }
}

export default VerificationService;
