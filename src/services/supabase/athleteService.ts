import { supabase } from '../../lib/supabase';
import type { Sport, Position, Subcategory } from '../../features/athlete-onboarding/store/onboardingStore';

export interface AthleteProfileData {
  userId: string; // Firebase UID
  sports: Sport[];
  position: Position | null;
  subcategory: Subcategory | null;
  specializations: Record<string, string>;
}

export interface AthletePersonalDetails {
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  height?: string; // in cm
  weight?: string; // in kg
  country: string;
  state: string;
  city: string;
  mobile?: string;
  bio?: string;
}

/**
 * Supabase implementation of AthleteService
 * Handles athlete-specific profile operations
 */
class AthleteService {

  /**
   * Create or update athlete profile with onboarding data
   * This saves: sports, position, specializations
   */
  async saveAthleteProfile(data: AthleteProfileData): Promise<void> {
    try {
      // 1. Get user's internal Supabase ID from Firebase UID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('uid', data.userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      // Verify user is an athlete
      if (userData.role !== 'athlete') {
        throw new Error('User is not an athlete');
      }

      // 2. Prepare athlete data for Supabase
      const athleteData: any = {
        sports: data.sports.map(s => s.name), // Store sport names as TEXT[]
        position: data.position?.id || null,
        position_name: data.position?.name || null,
        stats: {
          subcategory: data.subcategory,
          specializations: data.specializations,
          onboardingCompletedAt: new Date().toISOString()
        }
      };

      // 3. Check if athlete profile already exists
      const { data: existing } = await supabase
        .from('athletes')
        .select('user_id')
        .eq('user_id', userData.id)
        .single();

      if (existing) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('athletes')
          .update(athleteData)
          .eq('user_id', userData.id);

        if (updateError) throw updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('athletes')
          .insert({
            user_id: userData.id,
            ...athleteData
          });

        if (insertError) throw insertError;
      }

      console.log('✅ Athlete onboarding data saved to Supabase successfully');
    } catch (error) {
      console.error('AthleteService.saveAthleteProfile error:', error);
      throw error;
    }
  }

  /**
   * Update athlete personal details
   * This updates: name, DOB, gender, height, weight, location, bio
   */
  async updateAthletePersonalDetails(userId: string, details: AthletePersonalDetails): Promise<void> {
    try {
      // 1. Get user's internal Supabase ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      // 2. Update base user table (basic info only)
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          display_name: details.fullName,
          username: details.username,
          bio: details.bio,
          location: `${details.city}, ${details.state}, ${details.country}`,
          mobile: details.mobile || null
        })
        .eq('id', userData.id);

      if (userUpdateError) throw userUpdateError;

      // 3. Update athletes table with personal details and physical attributes
      const athleteUpdates: any = {
        date_of_birth: details.dateOfBirth,
        gender: details.gender
      };

      if (details.height) athleteUpdates.height = details.height;
      if (details.weight) athleteUpdates.weight = details.weight;

      const { error: athleteUpdateError } = await supabase
        .from('athletes')
        .update(athleteUpdates)
        .eq('user_id', userData.id);

      if (athleteUpdateError) throw athleteUpdateError;

      console.log('✅ Athlete personal details updated in Supabase successfully');
    } catch (error) {
      console.error('AthleteService.updateAthletePersonalDetails error:', error);
      throw error;
    }
  }

  /**
   * Get complete athlete profile
   */
  async getAthleteProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          athlete:athletes(*)
        `)
        .eq('uid', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        ...data,
        athleteProfile: data.athlete
      };
    } catch (error) {
      console.error('AthleteService.getAthleteProfile error:', error);
      throw error;
    }
  }
}

export default new AthleteService();
