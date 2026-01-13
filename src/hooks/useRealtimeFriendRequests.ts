// Real-time friend requests hook using Supabase
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FriendRequest } from '../types/models/friend';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeFriendRequestsReturn {
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching friend requests from Supabase with realtime updates
 * 
 * @param userId - Current user's Firebase UID
 * @returns Object containing incoming/outgoing requests, loading state, error, and refresh function
 */
export const useRealtimeFriendRequests = (
  userId: string | null
): UseRealtimeFriendRequestsReturn => {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch requests function
  const fetchRequests = useCallback(async () => {
    if (!userId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📬 Fetching friend requests for user:', userId);

      // 1. Get my Supabase UUID from Firebase UID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError || !userData) {
        console.warn('⚠️ User not found in Supabase:', userId);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setLoading(false);
        return;
      }

      const myUuid = userData.id;
      console.log('🔑 Resolved UUID:', myUuid);

      // 2. Fetch Incoming Requests (I am receiver)
      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          created_at,
          status,
          sender:sender_id (
             uid,
             display_name,
             photo_url,
             username
          )
        `)
        .eq('receiver_id', myUuid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) {
        console.error('❌ Error fetching incoming requests:', incomingError);
        throw incomingError;
      }

      // 3. Fetch Outgoing Requests (I am sender)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          created_at,
          status,
          receiver:receiver_id (
             uid,
             display_name,
             photo_url,
             username
          )
        `)
        .eq('sender_id', myUuid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (outgoingError) {
        console.error('❌ Error fetching outgoing requests:', outgoingError);
        throw outgoingError;
      }

      // 4. Map to FriendRequest interface
      const mappedIncoming: FriendRequest[] = (incoming || []).map((req: any) => ({
        id: req.id,
        requesterId: req.sender?.uid || 'unknown',
        requesterName: req.sender?.display_name || req.sender?.username || 'Unknown User',
        requesterPhotoURL: req.sender?.photo_url || '',
        recipientId: userId,
        status: req.status,
        timestamp: req.created_at,
        createdAt: req.created_at
      }));

      const mappedOutgoing: FriendRequest[] = (outgoing || []).map((req: any) => ({
        id: req.id,
        requesterId: userId,
        requesterName: '', // Not needed for outgoing (we are the requester)
        requesterPhotoURL: '', // Not needed for outgoing
        recipientId: req.receiver?.uid || 'unknown',
        recipientName: req.receiver?.display_name || req.receiver?.username || 'Unknown User',
        recipientPhotoURL: req.receiver?.photo_url || '',
        status: req.status,
        timestamp: req.created_at,
        createdAt: req.created_at
      }));

      console.log('📬 Loaded Friend Requests:', {
        incoming: mappedIncoming.length,
        outgoing: mappedOutgoing.length
      });

      setIncomingRequests(mappedIncoming);
      setOutgoingRequests(mappedOutgoing);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ Error fetching friend requests:', err);
      setError(err.message || 'Failed to load friend requests');
      setLoading(false);
    }
  }, [userId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!userId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchRequests();

    // Setup realtime subscription
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        // Get user UUID for subscription
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('uid', userId)
          .single();

        if (!userData) return;

        const myUuid = userData.id;

        // Subscribe to changes in friend_requests table
        channel = supabase
          .channel('friend_requests_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'friend_requests',
              filter: `receiver_id=eq.${myUuid}`
            },
            (payload) => {
              console.log('🔔 Friend request change (incoming):', payload);
              fetchRequests();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'friend_requests',
              filter: `sender_id=eq.${myUuid}`
            },
            (payload) => {
              console.log('🔔 Friend request change (outgoing):', payload);
              fetchRequests();
            }
          )
          .subscribe();

        console.log('✅ Realtime subscription active for friend requests');
      } catch (err) {
        console.error('❌ Error setting up realtime subscription:', err);
      }
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from friend requests channel');
        supabase.removeChannel(channel);
      }
    };
  }, [userId, fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh: fetchRequests
  };
};

export default useRealtimeFriendRequests;
