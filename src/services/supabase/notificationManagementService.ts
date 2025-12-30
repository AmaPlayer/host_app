import { supabase } from '../../lib/supabase';

export interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  type: string;
  message: string;
  timestamp: any;
  read: boolean;
  [key: string]: any;
}

export interface NotificationQueryOptions {
  limitCount?: number;
  onlyUnread?: boolean;
  afterTimestamp?: any;
}

export const notificationManagementService = {
  
  async getUserNotifications(userId: string, options: NotificationQueryOptions = {}): Promise<Notification[]> {
    try {
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      let query = supabase
        .from('notifications')
        .select('*, sender:users!sender_id(uid, display_name, photo_url)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(options.limitCount || 20);

      if (options.onlyUnread) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(n => ({
        id: n.id,
        receiverId: userId,
        senderId: n.sender?.uid,
        senderName: n.sender?.display_name,
        senderPhotoURL: n.sender?.photo_url,
        type: n.type,
        message: n.message,
        read: n.is_read,
        timestamp: n.created_at,
        // ... map other fields
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      const { data } = await supabase.from('notifications').select('*').eq('id', notificationId).single();
      if (!data) return null;
      return { id: data.id, read: data.is_read, ...data } as any;
    } catch (e) {
      return null;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('receiver_id', user.id);
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await supabase.from('notifications').delete().eq('id', notificationId);
  },

  async deleteAllRead(userId: string): Promise<void> {
    const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
    if (!user) return;
    await supabase.from('notifications').delete().eq('receiver_id', user.id).eq('is_read', true);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
    if (!user) return 0;
    
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);
      
    return count || 0;
  },

  async deleteAllNotifications(userId: string): Promise<void> {
    const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
    if (!user) return;
    await supabase.from('notifications').delete().eq('receiver_id', user.id);
  }
};

export default notificationManagementService;
