import { supabase } from '../lib/supabase';
import { Event } from '../types/models';

export interface BulkEventOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ eventId: string; error: string }>;
}

export class EventsManagementService {
  /**
   * Activate a single event
   */
  async activateEvent(eventId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          is_active: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to activate event: ${error}`);
    }
  }

  /**
   * Bulk activate events
   */
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<BulkEventOperationResult> {
    const result: BulkEventOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: true, status: 'active' })
        .in('id', eventIds);
      
      if (error) throw error;
      result.processedCount = eventIds.length;
    } catch (error: any) {
      result.failedCount = eventIds.length;
      result.errors.push({ eventId: 'batch', error: error.message });
    }
    return result;
  }

  /**
   * Deactivate a single event
   */
  async deactivateEvent(eventId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to deactivate event: ${error}`);
    }
  }

  /**
   * Bulk deactivate events
   */
  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<BulkEventOperationResult> {
    const result: BulkEventOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: false, status: 'inactive' })
        .in('id', eventIds);
      
      if (error) throw error;
      result.processedCount = eventIds.length;
    } catch (error: any) {
      result.failedCount = eventIds.length;
      result.errors.push({ eventId: 'batch', error: error.message });
    }
    return result;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) return null;
      return this.mapToModel(data);
    } catch (error) {
      throw new Error(`Failed to fetch event: ${error}`);
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return this.mapToModel(data);
    } catch (error) {
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      throw new Error(`Failed to get all events: ${error}`);
    }
  }

  private mapToModel(data: any): Event {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      location: data.location,
      category: data.category,
      status: data.status,
      priority: data.priority || 'medium',
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const eventsManagementService = new EventsManagementService();
export default eventsManagementService;
