import { supabase } from '../../lib/supabase';
import { User } from '@/types/models';

export interface UserManagementResult {
  success: boolean;
  message: string;
  updatedUser?: Partial<User>;
}

export interface BulkUserManagementResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ userId: string; error: string; }>;
}

/**
 * Enhanced user management service with bulk operations support using Supabase
 */
class UserManagementService {
  /**
   * Suspend a single user
   */
  async suspendUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const updateData = {
        is_active: false,
        settings: { status: 'suspended', suspensionReason: reason || 'Administrative action', suspendedAt: new Date().toISOString() },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('uid', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'User suspended successfully',
        updatedUser: { uid: userId, isActive: false } as any
      };
    } catch (error) {
      console.error('Error suspending user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to suspend user'
      };
    }
  }

  /**
   * Verify a single user
   */
  async verifyUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('uid', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'User verified successfully',
        updatedUser: { uid: userId, isVerified: true } as any
      };
    } catch (error) {
      console.error('Error verifying user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify user'
      };
    }
  }

  /**
   * Activate a single user
   */
  async activateUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('uid', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'User activated successfully',
        updatedUser: { uid: userId, isActive: true } as any
      };
    } catch (error) {
      console.error('Error activating user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate user'
      };
    }
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('uid', userIds);

      if (error) throw error;

      return {
        success: true,
        processedCount: userIds.length,
        failedCount: 0,
        errors: []
      };
    } catch (error) {
      console.error('Bulk suspend failed:', error);
      return { success: false, processedCount: 0, failedCount: userIds.length, errors: [{ userId: 'multiple', error: String(error) }] };
    }
  }

  /**
   * Bulk verify users
   */
  async bulkVerifyUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .in('uid', userIds);

      if (error) throw error;

      return {
        success: true,
        processedCount: userIds.length,
        failedCount: 0,
        errors: []
      };
    } catch (error) {
      return { success: false, processedCount: 0, failedCount: userIds.length, errors: [{ userId: 'multiple', error: String(error) }] };
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .in('uid', userIds);

      if (error) throw error;

      return {
        success: true,
        processedCount: userIds.length,
        failedCount: 0,
        errors: []
      };
    } catch (error) {
      return { success: false, processedCount: 0, failedCount: userIds.length, errors: [{ userId: 'multiple', error: String(error) }] };
    }
  }

  /**
   * Get user management statistics
   */
  async getUserManagementStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    verifiedUsers: number;
  }> {
    try {
      const { count: total } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: active } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: verified } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_verified', true);

      return {
        totalUsers: total || 0,
        activeUsers: active || 0,
        suspendedUsers: (total || 0) - (active || 0),
        verifiedUsers: verified || 0
      };
    } catch (error) {
      console.error('Error getting user management stats:', error);
      return { totalUsers: 0, activeUsers: 0, suspendedUsers: 0, verifiedUsers: 0 };
    }
  }

  /**
   * Validate user operation
   */
  validateUserOperation(operation: string, userIds: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    if (userIds.length === 0) errors.push('No users selected');
    const validOperations = ['suspend', 'verify', 'activate'];
    if (!validOperations.includes(operation)) errors.push(`Invalid operation: ${operation}`);
    return { isValid: errors.length === 0, errors };
  }
}

export default new UserManagementService();
