import { supabase } from '../../lib/supabase';
import { Event } from '@/types/models';

export interface EventManagementResult {
  success: boolean;
  message: string;
  updatedEvent?: Partial<Event>;
}

export interface BulkEventManagementResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ eventId: string; error: string; }>;
}

class EventsManagementService {
  
  async activateEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const updates = {
        is_active: true,
        status: 'active',
        activated_at: new Date().toISOString(),
        activation_reason: reason,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('events').update(updates).eq('id', eventId);
      if (error) throw error;

      return { success: true, message: 'Activated', updatedEvent: { id: eventId, ...updates } as any };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async deactivateEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const updates = {
        is_active: false,
        status: 'inactive',
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('events').update(updates).eq('id', eventId);
      if (error) throw error;

      return { success: true, message: 'Deactivated', updatedEvent: { id: eventId, ...updates } as any };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async cancelEvent(eventId: string, reason?: string): Promise<EventManagementResult> {
    try {
      const updates = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        is_active: false,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('events').update(updates).eq('id', eventId);
      if (error) throw error;

      return { success: true, message: 'Cancelled', updatedEvent: { id: eventId, ...updates } as any };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Bulk operations can reuse the single logic or batch update
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulk(eventIds, 'activate', reason);
  }

  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulk(eventIds, 'deactivate', reason);
  }

  async bulkCancelEvents(eventIds: string[], reason?: string): Promise<BulkEventManagementResult> {
    return this.executeBulk(eventIds, 'cancel', reason);
  }

  private async executeBulk(ids: string[], operation: string, reason?: string): Promise<BulkEventManagementResult> {
    try {
      let updates: any = { updated_at: new Date().toISOString() };
      
      if (operation === 'activate') {
        updates = { ...updates, is_active: true, status: 'active', activation_reason: reason, activated_at: new Date().toISOString() };
      } else if (operation === 'deactivate') {
        updates = { ...updates, is_active: false, status: 'inactive', deactivation_reason: reason, deactivated_at: new Date().toISOString() };
      } else if (operation === 'cancel') {
        updates = { ...updates, is_active: false, status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() };
      }

      const { error } = await supabase.from('events').update(updates).in('id', ids);
      if (error) throw error;

      return { success: true, processedCount: ids.length, failedCount: 0, errors: [] };
    } catch (e: any) {
      return { success: false, processedCount: 0, failedCount: ids.length, errors: [{ eventId: 'batch', error: e.message }] };
    }
  }

  async getEventManagementStats(): Promise<any> {
    const { count: total } = await supabase.from('events').select('*', { count: 'exact', head: true });
    const { count: active } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: inactive } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_active', false);
    const { count: cancelled } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'cancelled');
    
    // Upcoming
    const now = new Date().toISOString();
    const { count: upcoming } = await supabase.from('events').select('*', { count: 'exact', head: true }).gt('date', now).eq('is_active', true);

    return {
      totalEvents: total || 0,
      activeEvents: active || 0,
      inactiveEvents: inactive || 0,
      cancelledEvents: cancelled || 0,
      upcomingEvents: upcoming || 0
    };
  }

  async getEventsByStatus(status: 'active' | 'inactive' | 'cancelled', limit = 50): Promise<Event[]> {
    let query = supabase.from('events').select('*').limit(limit);
    if (status === 'cancelled') query = query.eq('status', 'cancelled');
    else query = query.eq('is_active', status === 'active');
    
    const { data } = await query;
    return (data || []).map(this.mapToModel);
  }

  async getUpcomingEvents(limit = 50): Promise<Event[]> {
    const now = new Date().toISOString();
    const { data } = await supabase.from('events').select('*').gt('date', now).eq('is_active', true).order('date', { ascending: true }).limit(limit);
    return (data || []).map(this.mapToModel);
  }

  validateEventOperation(operation: string, eventIds: string[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }

  private mapToModel(data: any): Event {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      date: data.date,
      // ... map other fields
      status: data.status,
      isActive: data.is_active
    } as Event;
  }
}

export default new EventsManagementService();
