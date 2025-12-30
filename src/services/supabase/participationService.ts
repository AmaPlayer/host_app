import { supabase } from '../../lib/supabase';
import { ParticipationType } from '../../types/models/event';

export interface EventParticipation {
  userId: string;
  userName: string;
  userAvatar?: string;
  eventId: string;
  type: ParticipationType;
  timestamp: Date;
}

class ParticipationService {
  
  async joinEvent(eventId: string, userId: string, userName: string, type: ParticipationType): Promise<any> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase
        .from('event_participations')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          type: type,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async leaveEvent(eventId: string, userId: string): Promise<void> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return;

      await supabase.from('event_participations').delete().eq('event_id', eventId).eq('user_id', user.id);
    } catch (error) {
      throw error;
    }
  }

  async getParticipation(eventId: string, userId: string): Promise<any | null> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return null;

      const { data } = await supabase
        .from('event_participations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    } catch (error) {
      return null;
    }
  }

  async getParticipants(eventId: string): Promise<any[]> {
    const { data } = await supabase
      .from('event_participations')
      .select('*, user:users!user_id(uid, display_name, photo_url)')
      .eq('event_id', eventId);
    return data || [];
  }

  async getParticipationCounts(eventId: string): Promise<any> {
    const { data } = await supabase
      .from('event_participations')
      .select('type');
    
    const counts = { going: 0, interested: 0, maybe: 0, total: 0 };
    (data || []).forEach((p: any) => {
      if (p.type === 'going') counts.going++;
      else if (p.type === 'interested') counts.interested++;
      else if (p.type === 'maybe') counts.maybe++;
      counts.total++;
    });
    return counts;
  }
}

export const participationService = new ParticipationService();
export default participationService;
