import { supabase } from '../../lib/supabase';

class VerificationService {

  static async createVerificationRequest(userId: string, userProfile: any, userVideos: any[]): Promise<any> {
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
    const { data: request } = await supabase.from('verification_requests').select('*').eq('verification_id', verificationId).single();
    if (!request) throw new Error('Not found');

    // DUPLICATE CHECK: Check if this user has already verified
    // We check both IP and Device Fingerprint (if available)

    // Simplest Robust Approach: Fetch recent verifications for this request and check in memory
    // (Assuming verification count isn't millions, this is fine and safer given limitations)
    const { data: existingVotes } = await supabase
      .from('verifications')
      .select('voter_ip, voter_info')
      .eq('request_id', request.id);

    if (existingVotes && existingVotes.length > 0) {
      const isDuplicate = existingVotes.some(vote => {
        // Check IP match
        if (vote.voter_ip === voterInfo.ip) return true;

        // Check Fingerprint match
        const voteFingerprint = vote.voter_info?.deviceFingerprint;
        const currentFingerprint = voterInfo.deviceFingerprint;

        if (voteFingerprint && currentFingerprint && voteFingerprint === currentFingerprint) {
          return true;
        }

        return false;
      });

      if (isDuplicate) {
        throw new Error('You have already verified this user.');
      }
    }

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
  }

  static async getVerificationRequest(verificationId: string): Promise<any | null> {
    try {
      const { data } = await supabase.from('verification_requests').select('*').eq('verification_id', verificationId).single();
      return data;
    } catch (e) {
      return null;
    }
  }

  static async getVerificationStats(verificationId: string): Promise<any | null> {
    const data = await this.getVerificationRequest(verificationId);
    if (!data) return null;
    return {
      current: data.verification_count,
      goal: data.verification_goal,
      remaining: Math.max(0, data.verification_goal - data.verification_count),
      percentage: Math.min(100, (data.verification_count / data.verification_goal) * 100),
      isComplete: data.verification_count >= data.verification_goal,
      status: data.status
    };
  }

  static async canRequestVerification(userId: string): Promise<{ canRequest: boolean; reason?: string }> {
    const existing = await this.getUserVerificationRequest(userId);
    if (existing && existing.status === 'pending') {
      return { canRequest: false, reason: 'Already pending' };
    }
    // Check if user verified
    const { data: user } = await supabase.from('users').select('is_verified').eq('uid', userId).single();
    if (user?.is_verified) return { canRequest: false, reason: 'Already verified' };

    return { canRequest: true };
  }

  static getRoleBadge(role: string): any {
    const badges: any = {
      athlete: { icon: '🏆', label: 'Verified Athlete' },
      coach: { icon: '🏃‍♂️', label: 'Verified Coach' },
      organization: { icon: '🏢', label: 'Verified Organization' }
    };
    return badges[role] || badges.athlete;
  }

  static generateShareableLink(verificationId: string): string {
    return `${window.location.origin}/verify/${verificationId}`;
  }
}

export default VerificationService;
