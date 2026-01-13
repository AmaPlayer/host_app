import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types/models/notification';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeNotificationsResult {
  notifications: Notification[];
  loading: boolean;
  error: Error | null;
}

export const useRealtimeNotifications = (limitCount: number = 20): UseRealtimeNotificationsResult => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch notifications function
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔔 Fetching notifications for user:', currentUser.uid);

      // 1. Get my Supabase UUID from Firebase UID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', currentUser.uid)
        .single();

      if (userError || !userData) {
        console.warn('⚠️ User not found in Supabase:', currentUser.uid);
        setNotifications([]);
        setLoading(false);
        return;
      }

      const myUuid = userData.id;

      // 2. Fetch notifications
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          message,
          is_read,
          created_at,
          content_id,
          metadata,
          sender:sender_id (
            uid,
            display_name,
            photo_url
          )
        `)
        .eq('receiver_id', myUuid)
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (fetchError) {
        console.error('❌ Error fetching notifications:', fetchError);
        throw fetchError;
      }

      // 2.1 Fetch active announcements
      const { data: announcements, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5); // Reasonable limit

      if (announcementError) {
        console.warn('⚠️ Error fetching announcements:', announcementError);
      }

      // 3. Map to Notification interface
      const mappedNotifications: Notification[] = (data || []).map((notif: any) => ({
        id: notif.id,
        userId: currentUser.uid,
        type: notif.type,
        title: getTitleForType(notif.type),
        message: notif.message,
        read: notif.is_read || false,
        timestamp: notif.created_at,
        actionUrl: notif.metadata?.url,
        actorId: notif.sender?.uid,
        actorName: notif.metadata?.senderName || notif.sender?.display_name,
        actorPhotoURL: notif.metadata?.senderPhoto || notif.sender?.photo_url,
        relatedId: notif.content_id,
        metadata: notif.metadata
      }));

      // 3.1 Map Announcements to Notification Interface
      const mappedAnnouncements: Notification[] = (announcements || []).map((ann: any) => ({
        id: ann.id,
        userId: currentUser.uid,
        type: 'announcement', // New type
        title: ann.title || 'Announcement',
        message: ann.message,
        read: false,
        timestamp: ann.created_at,
        actionUrl: ann.action_url,
        actorName: 'Admin Team',
        metadata: { priority: ann.priority }
      }));

      // Helper to safely get time from Date, string, or Firestore Timestamp
      const getTime = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts === 'object' && typeof ts.toDate === 'function') {
          return ts.toDate().getTime();
        }
        return new Date(ts).getTime();
      };

      // Merge and Sort
      const combined = [...mappedAnnouncements, ...mappedNotifications].sort((a, b) =>
        getTime(b.timestamp) - getTime(a.timestamp)
      );

      console.log(`🔔 Loaded ${combined.length} items (${mappedAnnouncements.length} announcements)`);
      setNotifications(combined);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ Error fetching notifications:', err);
      setError(err);
      setLoading(false);
    }
  }, [currentUser, limitCount]);

  // Setup realtime subscription
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Setup realtime subscription
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        // Get user UUID for subscription
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('uid', currentUser.uid)
          .single();

        if (!userData) return;

        const myUuid = userData.id;

        // Subscribe to changes in notifications table
        channel = supabase
          .channel('notifications_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `receiver_id=eq.${myUuid}`
            },
            (payload) => {
              console.log('🔔 Notification change:', payload);
              fetchNotifications();
            }
          )
          .subscribe();

        console.log('✅ Realtime subscription active for notifications');
      } catch (err) {
        console.error('❌ Error setting up realtime subscription:', err);
      }
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from notifications channel');
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, fetchNotifications]);

  return { notifications, loading, error };
};

function getTitleForType(type: string): string {
  switch (type) {
    case 'like': return 'New Like';
    case 'comment': return 'New Comment';
    case 'follow': return 'New Follower';
    case 'message': return 'New Message';
    case 'friend_request': return 'Friend Request';
    case 'connection_request': return 'Connection Request';
    case 'connection_accepted': return 'Request Accepted';
    case 'connection_rejected': return 'Request Rejected';
    default: return 'Notification';
  }
}
