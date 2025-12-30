// User service with business logic
import { supabase } from '../../lib/supabase';
import { User, UserRole } from '../../types/models/user';
import { parentsService } from './parentsService';
import { coachesService } from './coachesService';
import { organizationsService } from './organizationsService';
import { athletesService } from './athletesService';

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

      const { data, error } = await supabase
        .from('users')
        .insert({
          uid: userData.uid,
          email: userData.email,
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
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID (Supabase)
   */
  async getUserProfile(userId: string, role?: UserRole): Promise<User | null> {
    try {
      // 1. Fetch base user from 'users' table using Firebase UID (uid column)
      // We assume userId passed here is the Firebase UID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();

      if (userError || !userData) {
        console.warn('⚠️ User profile not found for UID:', userId);
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

  private mapModelToSupabaseUser(user: Partial<User>): any {
    const map: any = {};
    if (user.displayName !== undefined) map.display_name = user.displayName;
    if (user.photoURL !== undefined) map.photo_url = user.photoURL;
    if (user.username !== undefined) map.username = user.username;
    if (user.bio !== undefined) map.bio = user.bio;
    if (user.location !== undefined) map.location = user.location;
    if (user.website !== undefined) map.website = user.website;
    if (user.role !== undefined) map.role = user.role;
    if (user.settings !== undefined) map.settings = user.settings;
    if (user.privacy !== undefined) map.privacy = user.privacy;
    return map;
  }
}

export default new UserService();
