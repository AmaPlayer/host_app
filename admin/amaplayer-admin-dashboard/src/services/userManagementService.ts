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

    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', userId);
    if (error) throw error;
  }

  async deleteUser(userId: string, reason?: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
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
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (error) {
      return [];
    }
  }

  private mapToModel(data: any): User {
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
      location: data.location,
      bio: data.bio,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    } as any;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;
