import { supabase } from '../../lib/supabase';
import { Friend, FriendStatus } from '../../types/models/friend';
import { friendsCache } from '../cache/shareCacheService';

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
      const { data: u1 } = await supabase.from('users').select('id').eq('uid', userId).single();
      const { data: u2 } = await supabase.from('users').select('id').eq('uid', friendId).single();

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
      const { data: u1 } = await supabase.from('users').select('id').eq('uid', userId).single();
      const { data: u2 } = await supabase.from('users').select('id').eq('uid', targetUserId).single();

      if (!u1 || !u2) return null;

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
}

export const friendsService = new FriendsService();
export default friendsService;
