import { supabase } from '../lib/supabase';
import { WinnerEntry, LeaderboardEntry, Event, EventRequirements } from '../types/models/event';

// Re-export types for use in components
export type { Event, EventRequirements } from '../types/models/event';
export type { WinnerEntry, LeaderboardEntry } from '../types/models/event';

export interface EventSubmission {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted';
  rank?: number;
  uploadedAt?: any;
  updatedAt?: any;
}

class EventsService {
  
  // Create new event
  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'participants'>): Promise<string> {
    try {
      // Remove undefined values
      const cleanedData: any = {};
      Object.keys(eventData).forEach(key => {
        const value = (eventData as any)[key];
        if (value !== undefined) {
          cleanedData[key] = value;
        }
      });

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...cleanedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organizer: cleanedData.organizer || 'Admin',
          contact_email: cleanedData.contactEmail || 'admin@amaplayer.com',
          // Default fields
          is_active: true,
          status: 'upcoming'
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log('Event created successfully with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Get all events
  async getAllEvents(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(this.mapToModel);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get active events
  async getActiveEvents(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return data.map(this.mapToModel);
    } catch (error) {
      console.error('Error fetching active events:', error);
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    try {
      // Map camelCase to snake_case for Supabase
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.status) dbUpdates.status = updates.status;
      // Add other fields as needed

      const { error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', eventId);

      if (error) throw error;
      console.log('Event updated successfully:', eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
        
      if (error) throw error;
      console.log('Event deleted successfully:', eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Toggle event active status
  async toggleEventStatus(eventId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: isActive })
        .eq('id', eventId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error toggling event status:', error);
      throw error;
    }
  }

  // Bulk activate events
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<any> {
    const result = { processedCount: 0, failedCount: 0, errors: [] as any[] };
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: true, activation_reason: reason })
        .in('id', eventIds);
        
      if (error) throw error;
      result.processedCount = eventIds.length;
    } catch (e: any) {
      result.failedCount = eventIds.length;
      result.errors.push({ eventId: 'batch', error: e.message });
    }
    return result;
  }

  // Bulk deactivate events
  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<any> {
    const result = { processedCount: 0, failedCount: 0, errors: [] as any[] };
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: false, deactivation_reason: reason })
        .in('id', eventIds);
        
      if (error) throw error;
      result.processedCount = eventIds.length;
    } catch (e: any) {
      result.failedCount = eventIds.length;
      result.errors.push({ eventId: 'batch', error: e.message });
    }
    return result;
  }

  // Get all submissions for an event
  async getEventSubmissions(eventId: string): Promise<EventSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('event_submissions')
        .select(`
          *,
          user:users!user_id(uid, display_name, photo_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(sub => ({
        id: sub.id,
        eventId: sub.event_id,
        userId: sub.user?.uid,
        userName: sub.user?.display_name,
        userAvatar: sub.user?.photo_url,
        videoUrl: sub.video_url,
        thumbnail: sub.thumbnail_url,
        title: sub.title,
        description: sub.description,
        status: sub.status,
        rank: sub.rank,
        uploadedAt: sub.created_at,
        updatedAt: sub.updated_at
      }));
    } catch (error) {
      console.error('Error fetching event submissions:', error);
      return [];
    }
  }

  // Get event with submissions
  async getEventWithSubmissions(eventId: string): Promise<{ event: Event | null; submissions: EventSubmission[] }> {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (eventError || !eventData) return { event: null, submissions: [] };
      
      const event = this.mapToModel(eventData);
      const submissions = await this.getEventSubmissions(eventId);
      
      return { event, submissions };
    } catch (error) {
      console.error('Error fetching event with submissions:', error);
      return { event: null, submissions: [] };
    }
  }

  // Declare winners
  async declareWinners(eventId: string, winners: WinnerEntry[], adminId: string): Promise<Event | null> {
    try {
      // Logic for declaring winners via Supabase
      // 1. Clear existing winners
      await supabase.from('event_winners').delete().eq('event_id', eventId);
      
      // 2. Insert new winners
      // Need to map user IDs (UID -> UUID)
      // For now assume winners has UIDs.
      const uids = winners.map(w => w.userId);
      const { data: users } = await supabase.from('users').select('id, uid').in('uid', uids);
      const uidMap = new Map(users?.map(u => [u.uid, u.id]));

      const winnersInsert = winners.map(w => ({
        event_id: eventId,
        submission_id: w.submissionId,
        user_id: uidMap.get(w.userId),
        rank: w.rank
      }));
      
      await supabase.from('event_winners').insert(winnersInsert);
      
      // 3. Update event status
      const { data: updated, error } = await supabase
        .from('events')
        .update({ status: 'completed', event_state: 'results_declared' })
        .eq('id', eventId)
        .select()
        .single();
        
      if (error) throw error;
      
      return this.mapToModel(updated);
    } catch (error) {
      console.error('Error declaring winners:', error);
      throw error;
    }
  }

  private mapToModel(data: any): Event {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      date: data.date,
      location: data.location,
      imageUrl: data.image_url,
      category: data.category,
      status: data.status,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // ... map other fields
      organizer: data.organizer,
      contactEmail: data.contact_email
    } as Event;
  }
}

export const eventsService = new EventsService();
export default eventsService; // Default export for compatibility
