import { supabase } from '../../lib/supabase';
import { Group, GroupDetails, GroupPrivacy } from '../../types/models/group';
import { groupsCache } from '../cache/shareCacheService';

interface GetGroupsListOptions {
  skipCache?: boolean;
  includePrivate?: boolean;
}

class GroupsService {
  /**
   * Helper to resolve Firebase UID to Supabase Internal User ID (UUID)
   */
  private async _getInternalUserId(uid: string): Promise<string> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('uid', uid)
      .single();

    if (error || !data) throw new Error('User not found');
    return data.id;
  }

  /**
   * Get user's groups list
   */
  /**
   * Get user's groups list
   */
  async getGroupsList(userId: string, options: GetGroupsListOptions = {}): Promise<Group[]> {
    const { skipCache = false, includePrivate = true } = options;
    // ... rest of implementation
    try {
      if (!skipCache) {
        const cached = groupsCache.get(userId);
        if (cached) return cached;
      }
      const internalUserId = await this._getInternalUserId(userId);
      if (!internalUserId) return [];
      const { data, error } = await supabase.from('group_members').select('group:groups(id, name, description, member_count, created_at, creator_id, privacy), role').eq('user_id', internalUserId);
      if (error) throw error;
      const groups: Group[] = (data || []).map((m: any) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description || '',
        photoURL: '',
        privacy: m.group.privacy || 'public',
        memberCount: m.group.member_count || 0,
        admins: m.role === 'admin' ? [userId] : [],
        isAdmin: m.role === 'admin',
        postingPermissions: 'all',
        createdAt: m.group.created_at,
        updatedAt: m.group.created_at
      }));
      const filteredGroups = includePrivate ? groups : groups.filter(g => g.privacy === 'public');
      filteredGroups.sort((a, b) => a.name.localeCompare(b.name));
      groupsCache.set(userId, filteredGroups);
      return filteredGroups;
    } catch (error) {
      console.error('Error getting groups list:', error);
      throw error;
    }
  }

  async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
    try {
      const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        photoURL: '',
        privacy: 'public' as GroupPrivacy,
        members: [],
        memberCount: data.member_count || 0,
        admins: [],
        isAdmin: false,
        postingPermissions: 'all',
        createdAt: data.created_at,
        updatedAt: data.created_at
      };
    } catch (error) {
      return null;
    }
  }

  async isMember(userId: string, groupId: string): Promise<boolean> {
    const groups = await this.getGroupsList(userId);
    return groups.some(g => g.id === groupId);
  }

  async createGroup(userId: string, groupData: any): Promise<string> {
    // ... real implementation
    try {
      const internalUserId = await this._getInternalUserId(userId);
      const { data, error } = await supabase.from('groups').insert({
        name: groupData.name,
        description: groupData.description,
        privacy: groupData.privacy,
        photo_url: groupData.photoURL || null,
        creator_id: internalUserId,
        member_count: 1
      }).select('id').single();
      if (error) throw error;
      await supabase.from('group_members').insert({ group_id: data.id, user_id: internalUserId, role: 'admin' });
      groupsCache.invalidate(userId);
      return data.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Add members to group
   */
  async addMembers(groupId: string, userIds: string[]): Promise<void> {
    if (!userIds.length) return;

    try {
      const { data: members, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('uid', userIds);

      if (usersError) throw usersError;
      if (!members || !members.length) return;

      const rows = members.map(u => ({
        group_id: groupId,
        user_id: u.id,
        role: 'member'
      }));

      const { error } = await supabase.from('group_members').insert(rows);
      if (error) throw error;

      await this._incrementMemberCount(groupId, members.length);

      // Invalidate caches for all added users
      userIds.forEach(uid => groupsCache.invalidate(uid));

      // Invalidate group details cache
      groupsCache.invalidateGroupDetails(groupId);
    } catch (error) {
      console.error('Error adding members:', error);
      throw error;
    }
  }

  /**
   * Update group details
   */
  async updateGroup(groupId: string, updates: any): Promise<void> {
    try {
      // Filter distinct fields to update
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.privacy) dbUpdates.privacy = updates.privacy;
      if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;

      const { error } = await supabase
        .from('groups')
        .update(dbUpdates)
        .eq('id', groupId);

      if (error) throw error;
      groupsCache.invalidateAll(); // Clear all caches as names/details changed
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      groupsCache.invalidateAll();
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  /**
   * Join group
   */
  async joinGroup(userId: string, groupId: string): Promise<void> {
    try {
      // Check if already member (isMember uses getGroupsList which handles mapping)
      const isMember = await this.isMember(userId, groupId);
      if (isMember) return;

      const internalUserId = await this._getInternalUserId(userId);

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: internalUserId,
          role: 'member'
        });

      if (error) throw error;

      // Increment member count
      await this._incrementMemberCount(groupId, 1);
      groupsCache.invalidate(userId);
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave group
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    try {
      const internalUserId = await this._getInternalUserId(userId);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', internalUserId);

      if (error) throw error;

      await this._incrementMemberCount(groupId, -1);
      groupsCache.invalidate(userId);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user:users (uid, display_name, photo_url),
          role,
          created_at
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      return (data || []).map((m: any) => ({
        userId: m.user.uid,
        displayName: m.user.display_name,
        photoURL: m.user.photo_url,
        isAdmin: m.role === 'admin',
        joinedAt: m.created_at
      }));
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  }

  private async _incrementMemberCount(groupId: string, amount: number) {
    // Minimal RPC or atomic update best, but simple update for MVP
    // Suppose we have an rpc 'increment_group_count', else fetch-update
    const { data } = await supabase.from('groups').select('member_count').eq('id', groupId).single();
    const newCount = (data?.member_count || 0) + amount;
    await supabase.from('groups').update({ member_count: newCount }).eq('id', groupId);
  }

  async searchGroups(userId: string, searchTerm: string): Promise<Group[]> {
    const groups = await this.getGroupsList(userId);
    if (!searchTerm) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(term));
  }
}

export default new GroupsService();
