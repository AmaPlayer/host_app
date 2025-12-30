import { supabase } from '../lib/supabase';
import { Announcement, CreateAnnouncementData, AnnouncementStats } from '../types/models/announcement';

class AnnouncementService {
  /**
   * Create a new announcement
   */
  async createAnnouncement(
    data: CreateAnnouncementData,
    adminId: string,
    adminName: string // ignored in relational, but kept for signature
  ): Promise<string> {
    try {
      // Resolve admin UID to UUID
      const { data: admin } = await supabase.from('users').select('id').eq('uid', adminId).single();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          title: data.title.trim(),
          message: data.message.trim(),
          expires_at: data.expiresAt.toISOString(),
          created_by: admin?.id,
          priority: data.priority || 'normal',
          action_url: data.actionUrl?.trim() || null
        })
        .select('id')
        .single();

      if (error) throw error;
      return announcement.id;
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      throw new Error('Failed to create announcement');
    }
  }

  /**
   * Get all announcements
   */
  async getAllAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      throw new Error('Failed to fetch announcements');
    }
  }

  /**
   * Get active, non-expired announcements
   */
  async getActiveAnnouncements(): Promise<Announcement[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      throw new Error('Failed to fetch active announcements');
    }
  }

  /**
   * Update an existing announcement
   */
  async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>
  ): Promise<void> {
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.title) dbUpdates.title = updates.title.trim();
      if (updates.message) dbUpdates.message = updates.message.trim();
      if (updates.expiresAt) dbUpdates.expires_at = updates.expiresAt instanceof Date ? updates.expiresAt.toISOString() : updates.expiresAt;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.priority) dbUpdates.priority = updates.priority;
      if (updates.actionUrl) dbUpdates.action_url = updates.actionUrl.trim();

      const { error } = await supabase
        .from('announcements')
        .update(dbUpdates)
        .eq('id', announcementId);

      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to update announcement');
    }
  }

  /**
   * Delete a single announcement
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to delete announcement');
    }
  }

  /**
   * Toggle active status of an announcement
   */
  async toggleActive(announcementId: string, isActive: boolean): Promise<void> {
    await this.updateAnnouncement(announcementId, { isActive });
  }

  /**
   * Bulk delete expired announcements
   */
  async bulkDeleteExpired(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('id')
        .lte('expires_at', now);
      
      if (!data?.length) return 0;
      
      const ids = data.map(a => a.id);
      const { error, count } = await supabase
        .from('announcements')
        .delete({ count: 'exact' })
        .in('id', ids);
        
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error('Failed to bulk delete expired announcements');
    }
  }

  async getStats(): Promise<AnnouncementStats> {
    try {
      const announcements = await this.getAllAnnouncements();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const stats: AnnouncementStats = {
        total: announcements.length,
        active: 0,
        expired: 0,
        expiringSoon: 0
      };

      announcements.forEach(a => {
        const expiresAt = new Date(a.expiresAt as any);
        if (a.isActive && expiresAt > now) {
          stats.active++;
          if (expiresAt <= tomorrow) stats.expiringSoon++;
        } else if (expiresAt <= now) {
          stats.expired++;
        }
      });

      return stats;
    } catch (error) {
      throw new Error('Failed to calculate stats');
    }
  }

  private mapToModel(data: any): Announcement {
    return {
      id: data.id,
      title: data.title,
      message: data.message,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      createdBy: data.created_by,
      // In a real app we might join created_by to get name, but schema doesn't have created_by_name column
      // We can fetch it or use a placeholder. Assuming data might have it if joined.
      // For now, using 'Admin' as fallback.
      createdByName: data.created_by_name || 'Admin', 
      isActive: data.is_active,
      priority: data.priority,
      actionUrl: data.action_url
    };
  }
}

export const announcementService = new AnnouncementService();
export default announcementService;