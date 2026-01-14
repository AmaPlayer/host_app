import { supabase } from '../../lib/supabase';
import { COLLECTIONS } from '../../constants/firebase';
import { ParentProfile, Parent, CreateParentData } from '../../types/models/parent';

class ParentsService {

  /**
   * Calculate child's age from date of birth in DD-MM-YYYY format
   */
  private calculateAge(dateOfBirth: string): number {
    const [day, month, year] = dateOfBirth.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Create a new parent profile in the parents table
   * @param userId - The Supabase UUID of the user
   * @param data - The parent profile data
   */
  async createParentProfile(userId: string, data: Partial<CreateParentData>): Promise<void> {
    try {
      // Calculate child's age from date of birth
      const age = this.calculateAge(data.child?.dateOfBirth || '');

      const childData = {
        ...data.child,
        age
      };

      const details = {
        relationshipToChild: data.relationshipToChild,
        mobileNumber: data.mobileNumber,
        child: childData,
        schoolInfo: data.schoolInfo,
        contentConsent: data.contentConsent,
        achievements: data.achievements,
        aspirations: data.aspirations, // Also stored in top-level column
        sports: data.sports
      };

      const { error } = await supabase
        .from('parents')
        .insert({
          user_id: userId,
          child_names: [data.child?.fullName || ''],
          child_sports: [data.sports?.primary, data.sports?.secondary].filter(Boolean) as string[],
          aspirations: data.aspirations || '',
          details: details
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating parent profile:', error);
      throw error;
    }
  }

  /**
   * Get parent profile by User ID (UUID)
   */
  async getParentProfile(userId: string): Promise<Parent | null> {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      // Map Supabase data back to application model
      const details = data.details || {};

      const profile: any = {
        id: userId,
        uid: userId, // Keeping compatibility, but this is UUID now
        role: 'parent',
        relationshipToChild: details.relationshipToChild,
        mobileNumber: details.mobileNumber,
        child: details.child,
        sports: details.sports,
        schoolInfo: details.schoolInfo,
        contentConsent: details.contentConsent,
        achievements: details.achievements,
        aspirations: data.aspirations || details.aspirations,
        isActive: true,
        isVerified: false
      };

      // Only add these if they have values to avoid overwriting base user data in userService merge
      if (details.parentFullName) profile.parentFullName = details.parentFullName;
      if (details.email) profile.email = details.email;

      return profile as unknown as Parent;
    } catch (error) {
      console.error('Error getting parent profile:', error);
      throw error;
    }
  }

  /**
   * Update parent profile
   */
  async updateParentProfile(userId: string, updates: Partial<ParentProfile>): Promise<void> {
    try {
      // We need to fetch current details to merge, or use jsonb_set in SQL
      // For simplicity, we'll just update the specific fields if they map to columns,
      // or update the 'details' JSONB. 
      // This is a simplified implementation.

      const { data: currentData } = await supabase
        .from('parents')
        .select('details')
        .eq('user_id', userId)
        .single();

      const currentDetails = currentData?.details || {};
      const newDetails = { ...currentDetails, ...updates }; // Naive merge

      // Recalculate age if date of birth is updated
      if (updates.child?.dateOfBirth) {
        // Logic to update age inside newDetails.child
        newDetails.child.age = this.calculateAge(updates.child.dateOfBirth);
      }

      const dbUpdates: any = {
        details: newDetails
      };

      if (updates.child?.fullName) dbUpdates.child_names = [updates.child.fullName];
      if (updates.sports) dbUpdates.child_sports = [updates.sports.primary, updates.sports.secondary].filter(Boolean);
      if (updates.aspirations) dbUpdates.aspirations = updates.aspirations;

      const { error } = await supabase
        .from('parents')
        .update(dbUpdates)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating parent profile:', error);
      throw error;
    }
  }

  /**
   * Delete parent profile
   */
  async deleteParentProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting parent profile:', error);
      throw error;
    }
  }
}

export const parentsService = new ParentsService();
