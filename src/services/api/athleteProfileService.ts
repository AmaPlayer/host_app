// Athlete profile service for managing athlete onboarding data
import { supabase } from '../../lib/supabase';
import { Sport, Position, Subcategory, AthleteProfile } from '../../features/athlete-onboarding/store/onboardingStore';

/**
 * Athlete profile data for creation
 */
interface CreateAthleteProfileData {
  userId: string;
  sports: Sport[];
  position: Position;
  subcategory: Subcategory;
  specializations: Record<string, string>;
}

/**
 * Athlete profile update data
 */
type UpdateAthleteProfileData = Partial<Omit<AthleteProfile, 'completedOnboarding' | 'onboardingCompletedAt'>>;

/**
 * Athlete profile service providing business logic for athlete profile operations
 */
class AthleteProfileService {

  /**
   * Create or update athlete profile data in Supabase
   */
  async createAthleteProfile(data: CreateAthleteProfileData): Promise<AthleteProfile> {
    const { userId, sports, position, subcategory, specializations } = data;

    // Validate required data
    if (!sports || sports.length === 0 || !position || !subcategory) {
      throw new Error('Sports, position, and subcategory are required for athlete profile creation');
    }

    const athleteProfile: AthleteProfile = {
      sports,
      position,
      subcategory,
      specializations,
      completedOnboarding: true,
      onboardingCompletedAt: new Date()
    };

    try {
      // 1. Get the Supabase UUID from Firebase UID (if userId is Firebase UID)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError || !userData) throw new Error('User not found in Supabase');
      const supabaseUuid = userData.id;

      // 2. Insert/Update into athletes table
      const { error: athleteError } = await supabase
        .from('athletes')
        .upsert({
          user_id: supabaseUuid,
          sports: sports.map(s => s.id),
          position: position.id,
          position_name: position.name,
          player_type: subcategory.name,
          stats: {
            subcategory,
            specializations,
            onboardingCompletedAt: athleteProfile.onboardingCompletedAt
          }
        });

      if (athleteError) throw athleteError;

      // 3. Update users table with role
      await supabase
        .from('users')
        .update({ role: 'athlete', updated_at: new Date().toISOString() })
        .eq('id', supabaseUuid);

      return athleteProfile;
    } catch (error) {
      console.error('❌ Error creating athlete profile:', error);
      throw error;
    }
  }

  /**
   * Get athlete profile by user ID (Firebase UID)
   */
  async getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          athletes (*)
        `)
        .eq('uid', userId)
        .single();

      if (error || !data || !data.athletes) {
        console.warn('⚠️ No athlete profile found for user:', userId);
        return null;
      }

      // Handle potential array response for joined table
      const athleteRecord = Array.isArray(data.athletes) ? data.athletes[0] : data.athletes;
      
      if (!athleteRecord) return null;

      const stats = athleteRecord.stats || {};

      return {
        sports: (athleteRecord.sports || []).map((id: string) => ({ 
          id, 
          name: '', // We don't have sport names stored in basic column, ideally fetch from separate sports table or config
          icon: '',
          image: '',
          description: ''
        })), 
        position: { 
          id: athleteRecord.position, 
          name: athleteRecord.position_name,
          description: '' 
        },
        subcategory: stats.subcategory || { id: '', name: athleteRecord.player_type },
        specializations: stats.specializations || {},
        completedOnboarding: true,
        onboardingCompletedAt: stats.onboardingCompletedAt ? new Date(stats.onboardingCompletedAt) : null
      } as AthleteProfile;
    } catch (error) {
      console.error('❌ Error getting athlete profile:', error);
      return null;
    }
  }

  /**
   * Update athlete profile data
   */
  async updateAthleteProfile(userId: string, updateData: UpdateAthleteProfileData): Promise<AthleteProfile> {
    const currentProfile = await this.getAthleteProfile(userId);
    if (!currentProfile) {
      throw new Error('Athlete profile not found for user: ' + userId);
    }

    try {
      const { data: userData } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!userData) throw new Error('User not found');

      const dbUpdate: any = {};
      const statsUpdate: any = {};

      if (updateData.sports) {
        dbUpdate.sports = updateData.sports.map(s => s.id);
      }
      if (updateData.position) {
        dbUpdate.position = updateData.position.id;
        dbUpdate.position_name = updateData.position.name;
      }
      if (updateData.subcategory) {
        dbUpdate.player_type = updateData.subcategory.name;
        statsUpdate.subcategory = updateData.subcategory;
      }
      if (updateData.specializations) {
        statsUpdate.specializations = updateData.specializations;
      }

      if (Object.keys(statsUpdate).length > 0) {
        const { data: currentAthleteData } = await supabase
          .from('athletes')
          .select('stats')
          .eq('user_id', userData.id)
          .single();
        
        const currentStats = currentAthleteData?.stats || {};
        dbUpdate.stats = { ...currentStats, ...statsUpdate };
      }

      if (Object.keys(dbUpdate).length > 0) {
        const { error } = await supabase
          .from('athletes')
          .update(dbUpdate)
          .eq('user_id', userData.id);

        if (error) throw error;
      }

      const updatedProfile: AthleteProfile = {
        ...currentProfile,
        ...updateData,
      };

      return updatedProfile;
    } catch (error) {
      console.error('❌ Error updating athlete profile:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed athlete onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const profile = await this.getAthleteProfile(userId);
      return !!profile;
    } catch (error) {
      console.error('❌ Error checking onboarding completion:', error);
      return false;
    }
  }

  /**
   * Validate athlete profile data integrity
   */
  validateAthleteProfile(profile: Partial<AthleteProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.sports || profile.sports.length === 0) {
      errors.push('At least one sport is required');
    }

    if (!profile.position) {
      errors.push('Position is required');
    }

    if (!profile.subcategory) {
      errors.push('Subcategory is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get athlete profiles by sport
   */
  async getAthletesBySport(sportId: string, limitCount: number = 50): Promise<AthleteProfile[]> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .contains('sports', [sportId])
        .limit(limitCount);

      if (error) throw error;

      return (data || []).map(athlete => ({
        sports: (athlete.sports || []).map((id: string) => ({ 
          id, 
          name: '',
          icon: '',
          image: '',
          description: ''
        })),
        position: { 
          id: athlete.position, 
          name: athlete.position_name,
          description: '' 
        },
        subcategory: athlete.stats?.subcategory || { id: '', name: athlete.player_type },
        specializations: athlete.stats?.specializations || {},
        completedOnboarding: true,
        onboardingCompletedAt: athlete.stats?.onboardingCompletedAt ? new Date(athlete.stats.onboardingCompletedAt) : null
      }));
    } catch (error) {
      console.error('❌ Error getting athletes by sport:', error);
      throw error;
    }
  }

  /**
   * Search athletes with filters
   */
  async searchAthletes(filters: {
    sportId?: string;
    eventType?: string;
    position?: string;
    subcategory?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase.from('athletes').select('*, users(*)');

      if (filters.sportId) query = query.contains('sports', [filters.sportId]);
      if (filters.position) query = query.eq('position', filters.position);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        userId: (item.users as any).uid,
        profile: {
          sports: item.sports.map((id: string) => ({ 
            id, 
            name: '',
            icon: '',
            image: '',
            description: ''
          })),
          position: { 
            id: item.position, 
            name: item.position_name,
            description: '' 
          },
          subcategory: item.stats?.subcategory || { id: '', name: item.player_type },
          specializations: item.stats?.specializations || {},
          completedOnboarding: true,
          onboardingCompletedAt: item.stats?.onboardingCompletedAt ? new Date(item.stats.onboardingCompletedAt) : null
        },
        user: item.users
      }));
    } catch (error) {
      console.error('❌ Error searching athletes:', error);
      throw error;
    }
  }

  /**
   * Delete athlete profile data
   */
  async deleteAthleteProfile(userId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.from('users').select('id').eq('uid', userId).single();
      if (!userData) return false;

      const { error } = await supabase
        .from('athletes')
        .delete()
        .eq('user_id', userData.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting athlete profile:', error);
      throw error;
    }
  }
}

export default new AthleteProfileService();