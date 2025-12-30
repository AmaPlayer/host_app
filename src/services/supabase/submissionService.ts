import { supabase } from '../../lib/supabase';
import { EventSubmission, CreateSubmissionData, UpdateSubmissionData } from '../../types/models/submission';

class SubmissionService {
  
  async createSubmission(data: CreateSubmissionData): Promise<string> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', data.userId).single();
      if (!user) throw new Error('User not found');

      const { data: submission, error } = await supabase
        .from('event_submissions')
        .insert({
          event_id: data.eventId,
          user_id: user.id,
          video_url: data.videoUrl,
          thumbnail_url: data.thumbnail,
          title: data.title,
          description: data.description,
          status: 'submitted',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return submission.id;
    } catch (error) {
      console.error('❌ Error creating submission:', error);
      throw error;
    }
  }

  async updateSubmission(submissionId: string, updates: UpdateSubmissionData): Promise<void> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.rank) updateData.rank = updates.rank;
      if (updates.prize) updateData.prize = updates.prize;

      const { error } = await supabase
        .from('event_submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error updating submission:', error);
      throw error;
    }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      const { error } = await supabase.from('event_submissions').delete().eq('id', submissionId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error deleting submission:', error);
      throw error;
    }
  }

  async getEventSubmissions(eventId: string): Promise<EventSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('event_submissions')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSupabaseSubmission);
    } catch (error) {
      console.error('❌ Error fetching event submissions:', error);
      throw error;
    }
  }

  async getUserSubmissionForEvent(eventId: string, userId: string): Promise<EventSubmission | null> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return null;

      const { data, error } = await supabase
        .from('event_submissions')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return null;
      if (!data) return null;

      return this.mapSupabaseSubmission(data);
    } catch (error) {
      return null;
    }
  }

  async getSubmittedSubmissions(eventId: string): Promise<EventSubmission[]> {
    return this.getEventSubmissions(eventId); // Filtering logic usually same if we default to submitted
  }

  async getUserSubmissions(userId: string): Promise<EventSubmission[]> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      const { data, error } = await supabase
        .from('event_submissions')
        .select(`
          *,
          user:users!user_id (uid, display_name, photo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSupabaseSubmission);
    } catch (error) {
      return [];
    }
  }

  async hasUserSubmitted(eventId: string, userId: string): Promise<boolean> {
    const submission = await this.getUserSubmissionForEvent(eventId, userId);
    return !!submission;
  }

  async updateSubmissionRank(submissionId: string, rank: 1 | 2 | 3, prize: string): Promise<void> {
    await this.updateSubmission(submissionId, { rank, prize });
  }

  async getSubmissionCount(eventId: string): Promise<number> {
    const { count } = await supabase
      .from('event_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);
    return count || 0;
  }

  private mapSupabaseSubmission(data: any): EventSubmission {
    return {
      id: data.id,
      eventId: data.event_id,
      userId: data.user?.uid || '',
      userName: data.user?.display_name,
      userAvatar: data.user?.photo_url,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      title: data.title,
      description: data.description,
      status: data.status,
      uploadedAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      rank: data.rank,
      prize: data.prize,
      scores: data.scores
    } as EventSubmission;
  }
}

export const submissionService = new SubmissionService();
export default submissionService;
