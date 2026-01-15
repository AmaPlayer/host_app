import { supabase } from '../lib/supabase';
import { User } from '../types/models';

export interface BulkOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class UserManagementService {
  /**
   * Suspend a single user
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          // status: 'suspended', // Map to column if exists
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to suspend user: ${error}`);
    }
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .in('id', userIds);

      if (error) throw error;
      result.processedCount = userIds.length;
    } catch (error: any) {
      result.failedCount = userIds.length;
      result.errors.push({ userId: 'batch', error: error.message });
    }
    return result;
  }

  /**
   * Verify a single user
   */
  async verifyUser(userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to verify user: ${error}`);
    }
  }

  /**
   * Bulk verify users
   */
  async bulkVerifyUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .in('id', userIds);

      if (error) throw error;
      result.processedCount = userIds.length;
    } catch (error: any) {
      result.failedCount = userIds.length;
      result.errors.push({ userId: 'batch', error: error.message });
    }
    return result;
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { processedCount: 0, failedCount: 0, errors: [] };
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true, status: 'active', suspended_at: null, suspension_reason: null })
        .in('id', userIds);

      if (error) throw error;
      result.processedCount = userIds.length;
    } catch (error: any) {
      result.failedCount = userIds.length;
      result.errors.push({ userId: 'batch', error: error.message });
    }
    return result;
  }

  /**
   * Activate a single user
   */
  async activateUser(userId: string): Promise<void> {
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', userId);
    if (error) throw error;
  }

  async deleteUser(userId: string, reason?: string): Promise<void> {
    try {
      // 1. Try Hard Delete first
      const { error } = await supabase.from('users').delete().eq('id', userId);

      if (error) {
        // Check for Foreign Key Violation (Postgres Error 23503)
        // Note: Supabase JS might return a specific error structure
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          console.warn('Hard delete blocked by dependencies. Falling back to Secure Soft Delete (PII Redaction).');

          // 2. Fallback: Secure Soft Delete (Scrub PII)
          const { error: updateError } = await supabase
            .from('users')
            .update({
              is_active: false,
              display_name: 'Deleted User',
              email: `deleted_${userId.substring(0, 8)}@deleted.amaplayer.com`, // Pseudo-anonymize
              photo_url: null,
              bio: null,
              location: null,
              is_verified: false,
              username: `deleted_${userId.substring(0, 8)}`,
              status: 'deleted',
              suspension_reason: reason || 'Account deleted by admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (updateError) throw updateError;
          return; // Soft delete successful
        }
        throw error; // Throw other errors
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          posts:posts(count),
          stories:stories(count),
          followers:followers!following_id(count),
          following:followers!follower_id(count)
        `)
        .eq('id', userId)
        .single();

      if (error) return null;
      return this.mapToModel(data);
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return this.mapToModel(data);
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<any> {
    try {
      const { count: total } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: active } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: verified } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_verified', true);
      const { count: athletes } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'athlete');
      const { count: coaches } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'coach');
      const { count: organizations } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'organization');

      return {
        total: total || 0,
        active: active || 0,
        suspended: (total || 0) - (active || 0),
        verified: verified || 0,
        athletes: athletes || 0,
        coaches: coaches || 0,
        organizations: organizations || 0
      };
    } catch (error) {
      return { total: 0, active: 0, suspended: 0, verified: 0, athletes: 0, coaches: 0, organizations: 0 };
    }
  }

  /**
   * Get all users
   */
  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          posts:posts(count),
          stories:stories(count),
          followers:followers!following_id(count),
          following:followers!follower_id(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  }

  private mapToModel(data: any): User {
    // Helper to safely extract count from Supabase relation array
    const getCount = (field: any) => {
      if (Array.isArray(field) && field.length > 0) {
        return field[0].count || 0;
      }
      return 0;
    };

    return {
      uid: data.uid,
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      username: data.username,
      role: data.role || 'athlete',
      isActive: data.is_active,
      isVerified: data.is_verified,
      photoURL: data.photo_url,
      bio: data.bio,
      // Use dynamic counts if available, fallback to static columns if needed (or 0)
      postsCount: data.posts ? getCount(data.posts) : (data.posts_count || 0),
      storiesCount: data.stories ? getCount(data.stories) : (data.stories_count || 0),
      followersCount: data.followers ? getCount(data.followers) : (data.followers_count || 0),
      followingCount: data.following ? getCount(data.following) : (data.following_count || 0),
      sports: data.sports || [],
      location: data.location || '',
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      status: data.status,
      suspension_reason: data.suspension_reason
    } as any;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;
