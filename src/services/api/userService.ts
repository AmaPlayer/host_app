// User service with business logic
import { supabase } from '../../lib/supabase';
import { User, UserRole } from '../../types/models/user';
import { parentsService } from './parentsService';
import { coachesService } from './coachesService';
import { organizationsService } from './organizationsService';
import { athletesService } from './athletesService';
import { storageService } from '../storage';

/**
 * User profile creation data
 */
interface CreateUserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  role?: string;
  username?: string;
}

/**
 * User profile update data
 */
type UpdateUserProfileData = Partial<Omit<User, 'id' | 'uid'>>;

/**
 * User activity summary
 */
interface UserActivitySummary {
  postsCount: number;
  storiesCount: number;
  isVerified: boolean;
  joinDate: Date | any | undefined;
  lastActive: Date | any | undefined;
}

/**
 * User stats update
 */
interface UserStatsUpdate {
  postsCount?: number;
  storiesCount?: number;
}

/**
 * User service providing business logic for user operations
 */
class UserService {

  /**
   * Get browser's default language
   */
  private getBrowserDefaultLanguage(): string {
    const browserLang = navigator.language?.split('-')[0].toLowerCase() || 'en';
    const supportedLanguages = ['en', 'hi', 'pa', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'or', 'as'];
    return supportedLanguages.includes(browserLang) ? browserLang : 'en';
  }

  /**
   * Create user profile (Base User)
   */
  async createUserProfile(userData: CreateUserProfileData & { languagePreference?: string }): Promise<User> {
    try {
      const defaultLanguage = userData.languagePreference || this.getBrowserDefaultLanguage();

      // Generate unique email if not provided to avoid duplicate key violations
      const email = userData.email && userData.email.trim() !== ''
        ? userData.email
        : `${userData.uid}@placeholder.amaplayer.com`;

      const { data, error } = await supabase
        .from('users')
        .insert({
          uid: userData.uid,
          email: email,
          display_name: userData.displayName,
          photo_url: userData.photoURL || null,
          username: userData.username || null,
          role: userData.role,
          language_preference: defaultLanguage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          is_verified: false,
          posts_count: 0,
          stories_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapSupabaseUserToModel(data);
    } catch (error: any) {
      // Handle duplicate key error gracefully
      if (error?.code === '23505') {
        console.log('⚠️ Duplicate email detected, checking for existing account...');

        // Check if email exists (might have different UID)
        const existingUser = await this.getUserByEmail(userData.email);

        if (existingUser && existingUser.uid !== userData.uid) {
          console.log(`🔄 Merging accounts: updating UID ${existingUser.uid} → ${userData.uid}`);
          // Update the existing record's UID to match the new Firebase UID
          const merged = await this.updateUserUID(existingUser.uid, userData.uid);
          console.log('✅ Account merged successfully');
          return merged;
        }

        // If same UID, just return existing user
        if (existingUser) {
          console.log('✅ User already exists with same UID');
          return existingUser;
        }

        // Unknown duplicate error - re-throw
        console.error('❌ Unknown duplicate key error:', error);
        throw error;
      }
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Ensure user exists in Supabase (Idempotent Sync)
   * Checks if user exists, if not creates them using provided auth data.
   * IMPORTANT: If email exists with different UID, merges accounts by updating UID
   */
  async ensureUserExists(uid: string, authData: { email?: string | null; displayName?: string | null; photoURL?: string | null; role?: string }): Promise<User> {
    try {
      // Step 1: Check if user exists by current UID
      const existingUser = await this.getUserProfile(uid);
      if (existingUser) {
        return existingUser;
      }

      console.log(`👤 User ${uid} not found by UID in Supabase.`);

      // Step 2: Check if user exists by EMAIL (might have different UID)
      if (authData.email && authData.email.trim() !== '') {
        const userByEmail = await this.getUserByEmail(authData.email);

        if (userByEmail && userByEmail.uid !== uid) {
          console.log(`🔄 Found existing user with same email but different UID. Merging accounts...`);
          // Update the existing record's UID to match the new Firebase UID
          const merged = await this.updateUserUID(userByEmail.uid, uid);
          console.log('✅ Account merged successfully in ensureUserExists');
          return merged;
        }
      }

      // Step 3: Create new user if doesn't exist by UID or email
      console.log('Creating new user profile...');
      return await this.createUserProfile({
        uid,
        email: authData.email || '', // Empty string will be replaced with unique placeholder
        displayName: authData.displayName || 'User',
        photoURL: authData.photoURL,
        role: authData.role || 'athlete'
      });
    } catch (error: any) {
      // This should rarely happen now since we check email first
      console.error('❌ Error in ensureUserExists:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID (Supabase)
   */
  async getUserProfile(userId: string, role?: UserRole): Promise<User | null> {
    try {
      // 1. Determine if userId is text (Firebase) or UUID (Supabase)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      let query = supabase.from('users').select('*');

      if (isUuid) {
        query = query.eq('id', userId);
      } else {
        query = query.eq('uid', userId);
      }

      const { data: userData, error: userError } = await query.maybeSingle();

      if (userError || !userData) {
        console.warn(`⚠️ User profile not found for ${isUuid ? 'ID' : 'UID'}:`, userId);
        return null;
      }

      const user = this.mapSupabaseUserToModel(userData);
      const userRole = role || user.role as UserRole;

      // 2. Fetch role-specific details
      if (userRole) {
        let roleProfile = null;
        // Pass the Supabase UUID (user.id) to role services
        switch (userRole) {
          case 'parent':
            roleProfile = await parentsService.getParentProfile(user.id);
            break;
          case 'coach':
            roleProfile = await coachesService.getCoachProfile(user.id);
            break;
          case 'organization':
            roleProfile = await organizationsService.getOrganizationProfile(user.id);
            break;
          case 'athlete':
            roleProfile = await athletesService.getAthleteProfile(user.id);
            break;
        }

        if (roleProfile) {
          // Merge role profile with base user profile
          return { ...user, ...roleProfile } as User;
        }
      }

      return user;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Alias for getUserProfile to maintain backward compatibility
   */
  async getById(userId: string): Promise<User | null> {
    return this.getUserProfile(userId);
  }

  /**
   * Get user profile by EMAIL address
   * Used for detecting duplicate accounts with different UIDs
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email || email.trim() === '') {
        return null;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (userError || !userData) {
        return null;
      }

      return this.mapSupabaseUserToModel(userData);
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Update user's Firebase UID (for account merging)
   * When a user logs in with a different auth provider, Firebase may create a new UID
   * This updates the existing record's UID to the new Firebase UID
   */
  async updateUserUID(oldUID: string, newUID: string): Promise<User> {
    try {
      console.log(`🔄 Updating UID: ${oldUID} → ${newUID}`);

      const { data, error } = await supabase
        .from('users')
        .update({
          uid: newUID,
          updated_at: new Date().toISOString()
        })
        .eq('uid', oldUID)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user UID:', error);
        throw error;
      }

      console.log('✅ UID updated successfully');
      return this.mapSupabaseUserToModel(data);
    } catch (error) {
      console.error('❌ Error in updateUserUID:', error);
      throw error;
    }
  }

  /**
   * Update role-specific profile data
   */
  async updateRoleSpecificProfile(userId: string, role: UserRole, data: any): Promise<void> {
    try {
      // 1. Resolve Firebase UID to Supabase UUID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError || !userData) {
        console.warn(`User not found for UID: ${userId}, skipping role update`);
        return;
      }

      const supabaseId = userData.id;

      switch (role) {
        case 'parent':
          await parentsService.updateParentProfile(supabaseId, data);
          break;
        case 'coach':
          await coachesService.updateCoachProfile(supabaseId, data);
          break;
        case 'organization':
          await organizationsService.updateOrganizationProfile(supabaseId, data);
          break;
        case 'athlete':
          await athletesService.updateAthleteProfile(supabaseId, data);
          break;
        default:
          console.warn(`Unknown role for update: ${role}`);
      }
    } catch (error) {
      console.error('❌ Error updating role-specific profile:', error);
      throw error;
    }
  }

  /**
   * Create user profile in role-specific collection
   */
  async createRoleSpecificProfile(uid: string, role: UserRole, data: any): Promise<void> {
    try {
      // 1. Create Base User in Supabase 'users' table
      const baseUserData: CreateUserProfileData = {
        uid: uid,
        email: data.email,
        displayName: data.displayName || data.fullName || data.organizationName || data.parentFullName, // Fallbacks
        photoURL: data.photoURL,
        role: role,
        username: data.username
      };

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('uid', uid)
        .single();

      let supabaseUserId = existingUser?.id;

      if (!supabaseUserId) {
        const newUser = await this.createUserProfile(baseUserData);
        supabaseUserId = newUser.id;
      } else {
        // Update existing user with base details (role, username, etc.)
        await this.updateUserProfile(uid, {
          role: role,
          username: data.username,
          displayName: baseUserData.displayName
        });
      }

      // 2. Create Role Specific Profile using Supabase UUID
      switch (role) {
        case 'parent':
          await parentsService.createParentProfile(supabaseUserId, data);
          break;
        case 'coach':
          await coachesService.createCoachProfile(supabaseUserId, data);
          break;
        case 'organization':
          await organizationsService.createOrganizationProfile(supabaseUserId, data);
          break;
        case 'athlete':
          await athletesService.createAthleteProfile(supabaseUserId, data);
          break;
        default:
          throw new Error(`Unknown role: ${role}`);
      }
    } catch (error) {
      console.error('❌ Error creating role-specific profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: UpdateUserProfileData): Promise<Partial<User>> {
    try {
      const updates = this.mapModelToSupabaseUser(updateData);

      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', userId); // Assuming userId is Firebase UID

      if (error) throw error;

      return { id: userId, ...updateData };
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Advanced User Search (Supabase)
   * Supports text search on name/username/email and multiple filters
   */
  async searchUsersAdvanced(params: {
    searchTerm?: string;
    filters?: {
      role?: string;
      location?: string;
      sport?: string;
      skill?: string;
      sex?: string;
      age?: string;
      eventType?: string;
      position?: string;
      subcategory?: string;
    };
    limit?: number;
  }): Promise<User[]> {
    try {
      let query = supabase.from('users').select('*');

      // 1. Text Search (Username, Name, Email)
      if (params.searchTerm && params.searchTerm.trim().length > 0) {
        const term = params.searchTerm.toLowerCase().trim();
        // Uses OR logic for multiple fields
        // Note: For best performance, consider a dedicated text_search column in DB
        query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`);
      }

      // 2. Filters
      if (params.filters) {
        const { role, location, sex, age, sport, eventType, position, subcategory } = params.filters;

        if (role) query = query.eq('role', role);
        if (sex) query = query.eq('sex', sex);
        if (location) query = query.ilike('location', `%${location}%`);

        // Exact age match (consider range in future)
        if (age) query = query.eq('age', parseInt(age));

        // Array/JSON fields - Note: These depend on DB column types
        // Assuming 'sports' is a text[] or similar. 
        if (sport) query = query.contains('sports', [sport.toLowerCase()]);

        // Detailed athlete filters (might need to join 'athletes' table if columns aren't on 'users')
        // Checks 'users' table columns first based on schema assumption
        if (eventType) query = query.contains('event_types', [eventType.toLowerCase()]);
        if (position) query = query.eq('position_name', position); // or eq('position', ...)
        if (subcategory) query = query.eq('subcategory', subcategory);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapSupabaseUserToModel);
    } catch (error) {
      console.error('❌ Error in searchUsersAdvanced:', error);
      throw error;
    }
  }

  /**
   * Search users by name or username
   */
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .limit(limit);

      if (error) throw error;

      return data.map(this.mapSupabaseUserToModel);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get multiple user profiles
   */
  async getUserProfiles(userIds: string[]): Promise<User[]> {
    try {
      if (!userIds.length) return [];

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('uid', userIds);

      if (error) throw error;

      return data.map(this.mapSupabaseUserToModel);
    } catch (error) {
      console.error('❌ Error getting user profiles:', error);
      throw error;
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(userId: string, statsUpdate: UserStatsUpdate): Promise<UserStatsUpdate> {
    try {
      const updates: any = {};
      if (statsUpdate.postsCount !== undefined) updates.posts_count = statsUpdate.postsCount;
      if (statsUpdate.storiesCount !== undefined) updates.stories_count = statsUpdate.storiesCount;

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('uid', userId);

      if (error) throw error;

      return statsUpdate;
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string): Promise<UserActivitySummary | null> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) {
        return null;
      }

      return {
        postsCount: user.postsCount || 0,
        storiesCount: user.storiesCount || 0,
        isVerified: user.isVerified || false,
        joinDate: user.createdAt,
        lastActive: user.updatedAt,
      };
    } catch (error) {
      console.error('❌ Error getting user activity summary:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   * @param username - Username to search for
   * @returns User or null if not found
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapSupabaseUserToModel(data);
    } catch (error) {
      console.error('❌ Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Check if username is available
   * @param username - Username to check
   * @param excludeUid - Optional Firebase UID to exclude (when updating own username)
   * @returns True if available, false if taken
   */
  async checkUsernameAvailability(username: string, excludeUid?: string): Promise<boolean> {
    try {
      const lowerUsername = username.toLowerCase().trim();

      let query = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('username', lowerUsername);

      if (excludeUid) {
        query = query.neq('uid', excludeUid);
      }

      const { count, error } = await query;

      if (error) {
        console.error('❌ Error checking username availability:', error);
        throw error;
      }

      return count === 0;
    } catch (error) {
      console.error('❌ Error in checkUsernameAvailability:', error);
      throw error;
    }
  }

  /**
   * Get user's language preference
   */
  async getLanguagePreference(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('language_preference')
        .eq('uid', userId)
        .single();

      if (error) return null;
      return data?.language_preference || null;
    } catch (error) {
      console.error('❌ Error getting language preference:', error);
      throw error;
    }
  }

  /**
   * Set user's language preference
   */
  async setLanguagePreference(userId: string, languageCode: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          language_preference: languageCode,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', userId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error setting language preference:', error);
      throw error;
    }
  }

  /**
   * Save language preference when user is created
   */
  async setUserLanguagePreference(userId: string, userData: CreateUserProfileData & { languagePreference?: string }): Promise<void> {
    // Handled in createUserProfile now
  }

  // --- Storage Helpers ---

  async uploadProfilePicture(userId: string, file: Blob | File): Promise<string> {
    const filename = `profile-picture.jpg`; // Consistent naming or unique? users often overwrite.
    const path = `users/${userId}/${filename}`;
    const result = await storageService.uploadFile(path, file);
    return result.url;
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    const path = `users/${userId}/profile-picture.jpg`;
    await storageService.deleteFile(path);
  }

  async uploadCoverPhoto(userId: string, file: Blob | File): Promise<string> {
    const filename = `cover-photo.jpg`;
    const path = `users/${userId}/${filename}`;
    const result = await storageService.uploadFile(path, file);
    return result.url;
  }

  async deleteCoverPhoto(userId: string): Promise<void> {
    const path = `users/${userId}/cover-photo.jpg`;
    await storageService.deleteFile(path);
  }

  // --- Mappers ---

  private mapSupabaseUserToModel(data: any): User {
    return {
      id: data.id, // Supabase UUID
      uid: data.uid, // Firebase UID
      email: data.email,
      displayName: data.display_name,
      photoURL: data.photo_url,
      username: data.username,
      bio: data.bio,
      location: data.location,
      website: data.website,
      role: data.role,
      isVerified: data.is_verified,
      isActive: data.is_active,
      postsCount: data.posts_count,
      storiesCount: data.stories_count,
      languagePreference: data.language_preference,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      settings: data.settings || {},
      privacy: data.privacy || {}
    } as User;
  }

  /**
   * Deep delete user data from Supabase
   * Deletes all records associated with the user in correct order
   */
  async deleteUserDeep(userId: string): Promise<void> {
    try {
      console.log(`🗑️ Starting deep deletion for user ${userId}...`);

      // 1. Delete Role Profiles
      // We try to delete from all role tables - checks are cheap
      await parentsService.deleteParentProfile(userId).catch(() => { });
      await coachesService.deleteCoachProfile(userId).catch(() => { });
      await organizationsService.deleteOrganizationProfile(userId).catch(() => { });
      await athletesService.deleteAthleteProfile(userId).catch(() => { });

      // 2. Delete User Content
      // Delete Comments
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('user_id', userId);

      if (commentsError) console.warn('Error deleting comments:', commentsError);

      // Delete Likes
      await supabase.from('likes').delete().eq('user_id', userId);

      // Delete Posts (and their storage files if we had a way to list them easily, 
      // typically Supabase storage cascade triggers should handle files if configured,
      // otherwise we leave orphaned files to avoid complex listing here)
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('user_id', userId);

      if (postsError) console.warn('Error deleting posts:', postsError);

      // 3. Delete Storage Files (Profile/Cover)
      try {
        await this.deleteProfilePicture(userId);
        await this.deleteCoverPhoto(userId);
      } catch (e) {
        console.warn('Error deleting storage files:', e);
      }

      // 4. Delete User Base Record
      // Note: We delete by UID since that's our primary key in 'users' table usually,
      // but let's check if we need to delete by ID if it's UUID.
      // Based on typical schema, we delete by uid or id.
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('uid', userId);

      if (userError) throw userError;

      console.log('✅ User data deleted from Supabase');
    } catch (error) {
      console.error('❌ Error in deleteUserDeep:', error);
      throw error;
    }
  }

  private mapModelToSupabaseUser(user: Partial<User>): any { // Context for placement
    const map: any = {};
    if (user.displayName !== undefined) map.display_name = user.displayName;
    if (user.photoURL !== undefined) map.photo_url = user.photoURL;
    if (user.username !== undefined) map.username = user.username;
    if (user.bio !== undefined) map.bio = user.bio;
    if (user.location !== undefined) map.location = user.location;
    if (user.website !== undefined) map.website = user.website;
    if (user.role !== undefined) map.role = user.role;
    if (user.isVerified !== undefined) map.is_verified = user.isVerified;
    if (user.settings !== undefined) map.settings = user.settings;
    if (user.privacy !== undefined) map.privacy = user.privacy;
    return map;
  }
}

export default new UserService();
