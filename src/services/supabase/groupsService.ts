import { supabase } from '../../lib/supabase';
import { Group, GroupDetails, GroupPrivacy } from '../../types/models/group';
import { groupsCache } from '../cache/shareCacheService';

interface GetGroupsListOptions {
  skipCache?: boolean;
}

class GroupsService {
  /**
   * Get user's groups list
   */
  async getGroupsList(userId: string, options: GetGroupsListOptions = {}): Promise<Group[]> {
    const { skipCache = false } = options;

    try {
      if (!skipCache) {
        const cached = groupsCache.get(userId);
        if (cached) return cached;
      }

      // 1. Get user internal ID
      const { data: user } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!user) return [];

      // 2. Fetch groups where user is a member
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group:groups (
            id, name, description, member_count, created_at, creator_id
          ),
          role
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const groups: Group[] = (data || []).map((m: any) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description || '',
        photoURL: '',
        privacy: 'public' as GroupPrivacy,
        memberCount: m.group.member_count || 0,
        admins: m.role === 'admin' ? [userId] : [],
        isAdmin: m.role === 'admin',
        postingPermissions: 'all',
        createdAt: m.group.created_at,
        updatedAt: m.group.created_at
      }));

      groups.sort((a, b) => a.name.localeCompare(b.name));
      groupsCache.set(userId, groups);
      return groups;
    } catch (error) {
      console.error('❌ Error getting groups list:', error);
      throw error;
    }
  }

  async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        photoURL: '',
        privacy: 'public' as GroupPrivacy,
        members: [], // Lazy load members
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

  async searchGroups(userId: string, searchTerm: string): Promise<Group[]> {
    const groups = await this.getGroupsList(userId);
    if (!searchTerm) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(term));
  }
}

export default new GroupsService();
