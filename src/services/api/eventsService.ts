import { supabase } from '../../lib/supabase';
import { Event, EventStatus, LeaderboardEntry, WinnerEntry, CompetitionStatus } from '../../types/models/event';

/**
 * Supabase implementation of EventsService
 */
class EventsService {

  /**
   * Get all active events
   */
  async getActiveEvents(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'cancelled')
        .order('date', { ascending: true });

      if (error) throw error;

      return data.map(this.mapSupabaseEventToModel);
    } catch (error) {
      console.error('EventsService.getActiveEvents error:', error);
      return [];
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<Event[]> {
     return this.getActiveEvents(); // Simplification
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(): Promise<Event[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gt('date', now)
        .neq('status', 'cancelled')
        .order('date', { ascending: true });

      if (error) throw error;
      return data.map(this.mapSupabaseEventToModel);
    } catch (error) {
       return [];
    }
  }
  
  /**
   * Get live events
   */
  async getLiveEvents(): Promise<Event[]> {
     // Simplistic implementation: events today
     return [];
  }

  /**
   * Get completed events
   */
  async getCompletedEvents(): Promise<Event[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .lt('date', now)
        .neq('status', 'cancelled')
        .order('date', { ascending: false });

      if (error) throw error;
      return data.map(this.mapSupabaseEventToModel);
    } catch (error) {
       return [];
    }
  }

  /**
   * Get single event with full details including leaderboard
   */
  async getEventWithLeaderboard(eventId: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!organizer_id (uid, display_name, photo_url),
          winners:event_winners (
            rank, score, prize,
            user:users (uid, display_name, photo_url),
            submission:event_submissions (video_url)
          )
        `)
        .eq('id', eventId) // Assuming UUID
        .single();

      if (error) throw error;

      const event = this.mapSupabaseEventToModel(data);
      
      // Map relational winners to leaderboard array
      if (data.winners) {
        event.leaderboard = data.winners.map((w: any) => ({
          rank: w.rank,
          userId: w.user?.uid,
          userName: w.user?.display_name,
          userAvatar: w.user?.photo_url,
          submissionId: w.submission?.id, // or w.submission_id
          score: w.score,
          prize: w.prize
        }));
      }

      return event;
    } catch (error) {
      console.error('EventsService.getEventWithLeaderboard error:', error);
      return null;
    }
  }

  /**
   * Declare winners for an event
   */
  async declareWinners(
    eventId: string,
    winners: WinnerEntry[],
    currentUserId: string
  ): Promise<Event> {
    try {
      if (winners.length > 5) throw new Error('Max 5 winners');

      const uids = winners.map(w => w.userId);
      const { data: users } = await supabase.from('users').select('id, uid').in('uid', uids);
      const uidMap = new Map(users?.map(u => [u.uid, u.id]));

      const winnersToInsert = winners.map(w => ({
        event_id: eventId,
        submission_id: w.submissionId,
        user_id: uidMap.get(w.userId),
        rank: w.rank,
        prize: w.prize
      }));

      await supabase.from('event_winners').delete().eq('event_id', eventId);

      const { error: insertError } = await supabase
        .from('event_winners')
        .insert(winnersToInsert);

      if (insertError) throw insertError;

      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({
          status: 'completed',
        })
        .eq('id', eventId)
        .select()
        .single();

      if (updateError) throw updateError;

      return this.mapSupabaseEventToModel(updatedEvent);
    } catch (error) {
      console.error('EventsService.declareWinners error:', error);
      throw error;
    }
  }
  
  canDeclareWinners(userId: string, adminIds?: string[]): boolean {
    if (adminIds && Array.isArray(adminIds)) {
      return adminIds.includes(userId);
    }
    return false;
  }

  getEventStatus(event: Event): EventStatus {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    // Simple logic: if date is past, completed. If today, live. Else upcoming.
    // Enhanced: check duration
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + (event.duration || 2)); // Default 2 hours

    if (now < eventDate) return 'upcoming';
    if (now >= eventDate && now <= endDate) return 'live';
    return 'completed';
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private mapSupabaseEventToModel(data: any): Event {
    const event: Event = {
      id: data.id,
      title: data.title,
      description: data.description,
      date: data.date,
      location: data.location,
      imageUrl: data.image_url,
      category: data.category,
      status: data.status as EventStatus, 
      priority: 'medium', 
      organizer: data.organizer?.display_name || 'AmaPlayer',
      requirements: data.requirements,
      prizes: data.prizes,
      isActive: data.status !== 'cancelled',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      submissionDeadline: data.submission_deadline,
      maxParticipants: data.max_participants,
      registrationUrl: data.registration_url,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      tags: data.tags
    };
    return event;
  }
}

export const eventsService = new EventsService();
export default eventsService;