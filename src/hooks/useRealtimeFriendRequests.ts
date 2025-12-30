// Real-time friend requests hook using Supabase and React Query
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FriendRequest } from '../types/models/friend';

interface UseRealtimeFriendRequestsReturn {
  incomingRequests: FriendRequest[];  // Requests I received
  outgoingRequests: FriendRequest[];  // Requests I sent
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching friend requests from Supabase
 * Polling/Subscription replacement for Friend Requests
 *
 * @param userId - Current user's UID (Supabase user.uid column)
 * @returns Object containing incoming/outgoing requests, loading state, error, and refresh function
 */
export const useRealtimeFriendRequests = (
  userId: string | null
): UseRealtimeFriendRequestsReturn => {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch requests
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

      // 1. Get my UUID from my UID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError || !userData) throw new Error('User not found');

      const myUuid = userData.id;

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

      if (incomingError) throw incomingError;

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

      if (outgoingError) throw outgoingError;

      // Map to FriendRequest type
      const mappedIncoming: FriendRequest[] = (incoming || []).map((req: any) => ({
        id: req.id,
        requesterId: req.sender?.uid,
        requesterName: req.sender?.display_name || req.sender?.username || 'Unknown',
        requesterPhotoURL: req.sender?.photo_url,
        recipientId: userId, // me
        status: req.status,
        timestamp: req.created_at, // Use created_at as timestamp
        createdAt: req.created_at
      } as any));

      const mappedOutgoing: FriendRequest[] = (outgoing || []).map((req: any) => ({
        id: req.id,
        requesterId: userId, // me
        recipientId: req.receiver?.uid,
        recipientName: req.receiver?.display_name || req.receiver?.username || 'Unknown',
        recipientPhotoURL: req.receiver?.photo_url,
        status: req.status,
        timestamp: req.created_at,
        createdAt: req.created_at
      } as any));

      setIncomingRequests(mappedIncoming);
      setOutgoingRequests(mappedOutgoing);

    } catch (err: any) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();

    // Optional: Setup interval polling or Refetch on focus
    // For now, fetch once on mount/userId change. 
    // Realtime subscriptions could be added here later.
    const interval = setInterval(fetchRequests, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh: fetchRequests
  };
};

export default useRealtimeFriendRequests;
