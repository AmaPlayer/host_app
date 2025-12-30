import { supabase } from '../../lib/supabase';
import { COLLECTIONS } from '../../constants/firebase';
import { CoachProfile, Coach, CreateCoachData } from '../../types/models/coach';

class CoachesService {
  
  /**
   * Create a new coach profile in the coaches table
   * @param userId - The Supabase UUID
   * @param data - The coach profile data
   */
  async createCoachProfile(userId: string, data: Partial<CreateCoachData>): Promise<void> {
    try {
      const details = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: data.country,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        coachingLevel: data.coachingLevel,
        sport: data.sport,
        certifications: data.certifications,
        bio: data.bio
      };

      const { error } = await supabase
        .from('coaches')
        .insert({
          user_id: userId,
          full_name: data.fullName,
          phone: data.phone,
          city: data.city,
          state: data.state,
          country: data.country,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          specializations: data.sport ? [data.sport] : [],
          years_experience: data.yearsOfExperience || 0,
          certifications: data.certifications ? [data.certifications] : [],
          coaching_philosophy: data.bio || '',
          details: details
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating coach profile:', error);
      throw error;
    }
  }

  /**
   * Get coach profile by User ID (UUID)
   */
  async getCoachProfile(userId: string): Promise<Coach | null> {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const details = data.details || {};

      const profile: any = {
        id: userId,
        uid: userId,
        role: 'coach',
        fullName: data.full_name || details.fullName,
        name: data.full_name || details.fullName || details.name,
        email: details.email,
        phone: data.phone || details.phone,
        city: data.city || details.city,
        state: data.state || details.state,
        country: data.country || details.country,
        dateOfBirth: data.date_of_birth || details.dateOfBirth,
        gender: data.gender || details.gender,
        yearsExperience: data.years_experience || 0,
        specializations: data.specializations || [],
        coachingLevel: details.coachingLevel || '',
        certifications: details.certifications || (data.certifications && data.certifications[0]) || '',
        bio: data.coaching_philosophy || details.bio || '',
        sport: details.sport || (data.specializations && data.specializations[0]) || '',
        isActive: true,
        isVerified: false
      };

      return profile as unknown as Coach;
    } catch (error) {
      console.error('Error getting coach profile:', error);
      throw error;
    }
  }

  /**
   * Update coach profile
   */
  async updateCoachProfile(userId: string, updates: Partial<any>): Promise<void> {
    try {
      const { data: currentData } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      const currentDetails = currentData?.details || {};
      
      // Synchronize name and fullName
      if (updates.name && !updates.fullName) updates.fullName = updates.name;
      if (updates.fullName && !updates.name) updates.name = updates.fullName;

      const newDetails = { ...currentDetails, ...updates };

      const dbUpdates: any = {
        details: newDetails
      };

      // Map camelCase app fields to snake_case DB columns
      if (updates.fullName) dbUpdates.full_name = updates.fullName;
      if (updates.name) dbUpdates.full_name = updates.name;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.city) dbUpdates.city = updates.city;
      if (updates.state) dbUpdates.state = updates.state;
      if (updates.country) dbUpdates.country = updates.country;
      if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.gender) dbUpdates.gender = updates.gender;

      if (updates.sport) dbUpdates.specializations = [updates.sport];
      if (updates.specializations) dbUpdates.specializations = updates.specializations;
      
      if (updates.yearsExperience !== undefined) dbUpdates.years_experience = updates.yearsExperience;
      if (updates.yearsOfExperience !== undefined) dbUpdates.years_experience = updates.yearsOfExperience;
      
      if (updates.bio) dbUpdates.coaching_philosophy = updates.bio;
      if (updates.certifications) dbUpdates.certifications = Array.isArray(updates.certifications) ? updates.certifications : [updates.certifications];

      const { error } = await supabase
        .from('coaches')
        .update(dbUpdates)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating coach profile:', error);
      throw error;
    }
  }
}

export const coachesService = new CoachesService();
