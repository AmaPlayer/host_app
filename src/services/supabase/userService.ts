import { supabase } from '../../lib/supabase';
import { User, UserRole } from '../../types/models/user';

/**
 * Supabase implementation of UserService
 */
class UserService {
  
  /**
   * Get user profile by Firebase UID
   * Fetches base user data joined with role-specific data in a single query
   */
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          athlete:athletes(*),
          coach:coaches(*),
          parent:parents(*),
          organization:organizations(*)
        `)
        .eq('uid', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found code
        console.error('Error fetching user profile from Supabase:', error);
        throw error;
      }

      return this.mapSupabaseUserToModel(data);
    } catch (error) {
      console.error('UserService.getUserProfile error:', error);
      throw error;
    }
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(userData: Partial<User> & { uid: string; email: string }): Promise<User> {
    try {
      // 1. Insert into base users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          uid: userData.uid,
          email: userData.email,
          display_name: userData.displayName,
          photo_url: userData.photoURL,
          bio: userData.bio,
          location: userData.location,
          role: userData.role,
          settings: userData.settings || {},
          privacy: userData.privacy || {},
          language_preference: userData.languagePreference || 'en'
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Insert into role-specific table if role is provided
      if (userData.role) {
        const roleTable = this.getRoleTableName(userData.role);
        if (roleTable) {
           // Insert empty row to initialize role profile
           // The trigger or app logic will handle detailed updates later
           const { error: roleError } = await supabase
             .from(roleTable)
             .insert({ user_id: user.id });
           
           if (roleError) console.warn(`Failed to create ${roleTable} entry:`, roleError);
        }
      }

      return this.mapSupabaseUserToModel(user);
    } catch (error) {
      console.error('UserService.createUserProfile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    try {
      // 1. Separate base fields from role-specific fields
      const { 
        displayName, photoURL, bio, location, website, 
        settings, privacy, languagePreference,
        ...rest 
      } = data;

      const baseUpdates: any = {};
      if (displayName !== undefined) baseUpdates.display_name = displayName;
      if (photoURL !== undefined) baseUpdates.photo_url = photoURL;
      if (bio !== undefined) baseUpdates.bio = bio;
      if (location !== undefined) baseUpdates.location = location;
      if (website !== undefined) baseUpdates.website = website;
      if (settings !== undefined) baseUpdates.settings = settings;
      if (privacy !== undefined) baseUpdates.privacy = privacy;
      if (languagePreference !== undefined) baseUpdates.language_preference = languagePreference;

      // Update base user
      if (Object.keys(baseUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(baseUpdates)
          .eq('uid', uid);
        
        if (error) throw error;
      }

      // Handle role-specific updates if needed
      // (This would require mapping specific fields to the role tables)
      // For now, we assume role updates happen via specific methods or we add logic here
    } catch (error) {
      console.error('UserService.updateUserProfile error:', error);
      throw error;
    }
  }

  /**
   * Search users using Full Text Search
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          athlete:athletes(*),
          coach:coaches(*)
        `)
        .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.mapSupabaseUserToModel);
    } catch (error) {
      console.error('UserService.searchUsers error:', error);
      return [];
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Map Supabase DB response to User model
   */
  private mapSupabaseUserToModel(data: any): User {
    if (!data) return {} as User;

    const user: User = {
      id: data.id, // Supabase UUID
      uid: data.uid, // Firebase UID
      email: data.email,
      displayName: data.display_name,
      photoURL: data.photo_url,
      bio: data.bio,
      location: data.location,
      website: data.website,
      username: data.username,
      role: data.role as UserRole,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      postsCount: data.posts_count || 0,
      storiesCount: data.stories_count || 0,
      isVerified: data.is_verified,
      isActive: data.is_active,
      languagePreference: data.language_preference,
      
      // JSON fields
      settings: data.settings,
      privacy: data.privacy,
    };

    // Attach role-specific data
    if (data.athlete) user.athleteProfile = data.athlete;
    if (data.coach) user.coachProfile = data.coach;
    if (data.parent) user.parentProfile = data.parent;
    if (data.organization) user.organizationProfile = data.organization;

    return user;
  }

  private getRoleTableName(role: string): string | null {
    switch (role) {
      case 'athlete': return 'athletes';
      case 'coach': return 'coaches';
      case 'parent': return 'parents';
      case 'organization': return 'organizations';
      default: return null;
    }
  }
}

export default new UserService();
