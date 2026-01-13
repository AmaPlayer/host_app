import { supabase } from '../../lib/supabase';
import { Friend, FriendStatus } from '../../types/models/friend';
import { friendsCache } from '../cache/shareCacheService';
import notificationService from '../notificationService';

interface GetFriendsListOptions {
  skipCache?: boolean;
  status?: FriendStatus;
}

class FriendsService {
  /**
   * Get user's friends list
   */
  async getFriendsList(userId: string, options: GetFriendsListOptions = {}): Promise<Friend[]> {
    const { skipCache = false } = options;

    try {
      if (!skipCache) {
        const cached = friendsCache.get(userId);
        if (cached) return cached;
      }

      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      // Fetch friendships where user is user1 or user2
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          user1:users!user1_id(uid, display_name, photo_url),
          user2:users!user2_id(uid, display_name, photo_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'active');

      if (error) throw error;

      const friends: Friend[] = (friendships || []).map((f: any) => {
        // Determine which user is the friend
        const isUser1 = f.user1.uid === userId; // Checking UID match might fail if join returns null, but we selected it
        // Wait, f.user1 returns the JOINED user. user.id is the INTERNAL id.
        // We know 'user1_id' and 'user2_id' are foreign keys.
        // If we are user1, friend is user2.

        // Let's rely on checking UIDs from the joined objects.
        // If the joined user1.uid == userId, then friend is user2.
        // Note: We need to be careful if we didn't select user1_id explicitly in the query?
        // Supabase returns the relation object.

        // Better logic: Compare internal ID if we had it in the response, but we didn't select it.
        // Let's select IDs.

        // Actually, let's just check: is user1 me?
        // But we queried by user.id (internal).
        // And the response contains user1 object (with uid).
        // So we compare user1.uid with userId.

        const friendUser = (f.user1?.uid === userId) ? f.user2 : f.user1;

        return {
          id: friendUser?.uid || 'unknown',
          friendshipId: f.id,
          userId: friendUser?.uid || 'unknown',
          displayName: friendUser?.display_name || 'Unknown',
          photoURL: friendUser?.photo_url || '',
          status: 'accepted',
          createdAt: f.created_at
        };
      });

      friends.sort((a, b) => a.displayName.localeCompare(b.displayName));
      friendsCache.set(userId, friends);
      return friends;

    } catch (error) {
      console.error('❌ Error getting friends list:', error);
      throw error;
    }
  }

  async getFriendDetails(userId: string, friendId: string): Promise<Friend | null> {
    try {
      const friends = await this.getFriendsList(userId);
      return friends.find(f => f.id === friendId) || null;
    } catch (error) {
      console.error('❌ Error getting friend details:', error);
      return null;
    }
  }

  async areFriends(userId: string, friendId: string, currentUserId?: string): Promise<boolean> {
    try {
      // Helper to handle mixed ID types
      const getUserQuery = (query: any, id: string) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        return isUuid ? query.eq('id', id) : query.eq('uid', id);
      };

      let u1, u2;

      {
        const q = supabase.from('users').select('id');
        const { data } = await getUserQuery(q, userId).single();
        u1 = data;
      }

      {
        const q = supabase.from('users').select('id');
        const { data } = await getUserQuery(q, friendId).single();
        u2 = data;
      }

      if (!u1 || !u2) return false;

      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`and(user1_id.eq.${u1.id},user2_id.eq.${u2.id}),and(user1_id.eq.${u2.id},user2_id.eq.${u1.id})`)
        .eq('status', 'active');

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error) {
      console.error('❌ Error checking friendship:', error);
      return false;
    }
  }

  invalidateCache(userId: string): void {
    friendsCache.invalidate(userId);
  }

  invalidateAllCaches(): void {
    friendsCache.invalidateAll();
  }

  async searchFriends(userId: string, searchTerm: string): Promise<Friend[]> {
    const friends = await this.getFriendsList(userId);
    if (!searchTerm) return friends;
    const term = searchTerm.toLowerCase();
    return friends.filter(f => f.displayName.toLowerCase().includes(term));
  }

  async getFriendsCount(userId: string): Promise<number> {
    const friends = await this.getFriendsList(userId);
    return friends.length;
  }

  async checkFriendRequestExists(userId: string, targetUserId: string): Promise<any | null> {
    try {
      // Helper to handle mixed ID types
      const getUserQuery = (query: any, id: string) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        return isUuid ? query.eq('id', id) : query.eq('uid', id);
      };

      let u1, u2;

      {
        const q = supabase.from('users').select('id');
        const { data } = await getUserQuery(q, userId).single();
        u1 = data;
      }

      {
        const q = supabase.from('users').select('id');
        const { data } = await getUserQuery(q, targetUserId).single();
        u2 = data;
      }

      if (!u1 || !u2) return null; // Or throw? Standard is null here.

      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${u1.id},receiver_id.eq.${u2.id}),and(sender_id.eq.${u2.id},receiver_id.eq.${u1.id})`)
        .neq('status', 'rejected') // Match Firebase logic
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error checking friend request:', error);
      return null;
    }
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(
    senderUid: string,
    senderRole: string,
    receiverUid: string,
    receiverRole: string
  ): Promise<void> {
    try {
      // Helper to handle mixed ID types (UUID vs Firebase UID)
      const getUserQuery = (query: any, id: string) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        return isUuid ? query.eq('id', id) : query.eq('uid', id);
      };

      let sender, receiver;

      // Get Sender
      {
        const q = supabase.from('users').select('id, display_name, photo_url');
        const { data } = await getUserQuery(q, senderUid).single();
        sender = data;
      }

      // Get Receiver
      {
        const q = supabase.from('users').select('id');
        const { data } = await getUserQuery(q, receiverUid).single();
        receiver = data;
      }

      if (!sender || !receiver) throw new Error('User not found');

      // Check for existing request
      const existing = await this.checkFriendRequestExists(senderUid, receiverUid);
      if (existing) {
        if (existing.status === 'pending') throw new Error('Friend request already pending');
        if (existing.status === 'accepted') throw new Error('Already friends');
      }

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: sender.id,
        receiver_id: receiver.id,
        sender_role: senderRole,
        receiver_role: receiverRole,
        status: 'pending'
      });

      if (error) throw error;

      // Log Activity (Friend Request Sent)
      await supabase.from('connection_activity').insert({
        connection_id: null,
        action: 'friend_request_sent',
        actor_id: sender.id,
        target_id: receiver.id,
        sender_role: senderRole,
        receiver_role: receiverRole
      });

      // Send notification to receiver
      console.log('📬 Sending friend request notification...');
      await notificationService.sendNotificationToUser(receiverUid, {
        senderId: senderUid,
        senderName: sender.display_name || 'Someone',
        senderPhotoURL: sender.photo_url || '',
        type: 'friend_request',
        message: `${sender.display_name || 'Someone'} sent you a friend request`,
        url: '/messages?tab=requests'
      });
      console.log('✅ Friend request notification sent');

    } catch (error) {
      console.error('❌ Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      // 1. Get the request with user details
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:sender_id(uid, display_name, photo_url),
          receiver:receiver_id(uid, display_name, photo_url)
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !request) throw new Error('Friend request not found');

      // 2. Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Log Activity (Friend Request Accepted)
      await supabase.from('connection_activity').insert({
        connection_id: requestId,
        action: 'friend_request_accepted',
        actor_id: request.receiver_id,
        target_id: request.sender_id,
        sender_role: request.sender_role,
        receiver_role: request.receiver_role
      });

      // 3. Create Friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user1_id: request.sender_id,
          user2_id: request.receiver_id,
          status: 'active'
        });

      if (friendshipError) {
        // Rollback request status (best effort)
        await supabase.from('friend_requests').update({ status: 'pending' }).eq('id', requestId);
        throw friendshipError;
      }

      // 4. Send notification to original sender
      console.log('📬 Sending acceptance notification...');
      await notificationService.sendNotificationToUser((request as any).sender.uid, {
        senderId: (request as any).receiver.uid,
        senderName: (request as any).receiver.display_name || 'Someone',
        senderPhotoURL: (request as any).receiver.photo_url || '',
        type: 'connection_accepted',
        message: `${(request as any).receiver.display_name || 'Someone'} accepted your friend request`,
        url: '/messages?tab=friends'
      });
      console.log('✅ Acceptance notification sent');

      // Invalidate caches
      this.invalidateAllCaches();
    } catch (error) {
      console.error('❌ Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    try {
      // 1. Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:sender_id(uid),
          receiver:receiver_id(uid)
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !request) throw new Error('Friend request not found');

      // 2. Update status to rejected
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      // 3. Log Activity (Friend Request Rejected)
      await supabase.from('connection_activity').insert({
        connection_id: requestId,
        action: 'friend_request_rejected',
        actor_id: request.receiver_id,
        target_id: request.sender_id
      });

      // Note: We don't send notification for rejection (privacy/UX decision)
      // The sender will simply see their request disappear from "Sent Requests"

    } catch (error) {
      console.error('❌ Error rejecting friend request:', error);
      throw error;
    }
  }

  /**
   * Cancel a sent friend request (Delete)
   */
  /**
   * Cancel a sent friend request (Delete)
   * Handles optimistic "temp-id" by using sender/receiver UIDs to look up the request
   */
  async cancelFriendRequest(requestId: string, senderUid?: string, receiverUid?: string): Promise<void> {
    try {
      // Check if requestId is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);

      if (isValidUUID) {
        // Standard delete by ID
        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', requestId);
        if (error) throw error;
      } else {
        // Fallback: Delete by sender/receiver if provided (Case: Optimistic UI or Temp ID)
        if (!senderUid || !receiverUid) {
          console.warn('⚠️ Cannot cancel request: Invalid ID and missing user UIDs');
          return;
        }

        // Get Supabase IDs
        const { data: sender } = await supabase.from('users').select('id').eq('uid', senderUid).single();
        const { data: receiver } = await supabase.from('users').select('id').eq('uid', receiverUid).single();

        if (!sender || !receiver) throw new Error('User not found');

        // Delete matching request
        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .eq('sender_id', sender.id)
          .eq('receiver_id', receiver.id)
          .eq('status', 'pending'); // Only delete pending

        if (error) throw error;
      }
    } catch (error) {
      console.error('❌ Error cancelling friend request:', error);
      throw error;
    }
  }
}

export const friendsService = new FriendsService();
export default friendsService;
