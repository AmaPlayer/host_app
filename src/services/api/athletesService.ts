import { supabase } from '../../lib/supabase';
import { COLLECTIONS } from '../../constants/firebase';
import { Timestamp } from 'firebase/firestore'; // Keeping for type defs if needed, or better replace with string/Date

export interface AthleteProfile {
  uid: string;
  email: string;
  role: 'athlete';
  createdAt: any;
  updatedAt: any;

  // Personal Details
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string;
  photoURL?: string;
  coverPhotoURL?: string;

  // Location
  state: string;
  city: string;
  country: string;

  // Sports Details
  sports: {
    primary: string;
    secondary?: string;
    position?: string;
    skillLevel?: string;
  };

  // Additional
  bio?: string;

  // System fields
  isActive: boolean;
  isVerified: boolean;
}

export interface Athlete extends AthleteProfile {
  id: string;
}

export interface CreateAthleteData {
  uid: string;
  email: string;
  photoURL?: string | null;
  role: 'athlete';

  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string;
  state: string;
  city: string;
  country: string;
  sports: {
    primary: string;
    secondary?: string;
    position?: string;
    skillLevel?: string;
  };
  bio?: string;
  coverPhotoURL?: string;
  height?: string;
  weight?: string;
  specializations?: any;
}

class AthletesService {

  /**
   * Create a new athlete profile in the athletes table
   * @param userId - The Supabase UUID
   * @param data - The athlete profile data
   */
  async createAthleteProfile(userId: string, data: Partial<CreateAthleteData>): Promise<void> {
    try {
      const stats = {
        phone: data.phone,
        state: data.state,
        city: data.city,
        country: data.country,
        skillLevel: data.sports?.skillLevel,
        specializations: data.specializations
      };

      const { error } = await supabase
        .from('athletes')
        .insert({
          user_id: userId,
          gender: data.gender,
          date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null, // Assuming YYYY-MM-DD or parseable
          height: data.height,
          weight: data.weight,
          sports: [data.sports?.primary, data.sports?.secondary].filter(Boolean) as string[],
          position: data.sports?.position,
          stats: stats
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating athlete profile:', error);
      throw error;
    }
  }

  /**
   * Get athlete profile by User ID (UUID)
   */
  async getAthleteProfile(userId: string): Promise<Athlete | null> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', userId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const stats = data.stats || {};

      const profile: any = {
        id: userId,
        uid: userId,
        role: 'athlete',
        dateOfBirth: data.date_of_birth,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        sports: {
          primary: data.sports?.[0],
          secondary: data.sports?.[1],
          position: data.position,
          skillLevel: stats.skillLevel
        },
        isActive: true,
        isVerified: false
      };

      // Only add these if they have values to avoid overwriting base user data in userService merge
      if (stats.phone) profile.phone = stats.phone;
      if (stats.city) profile.city = stats.city;
      if (stats.state) profile.state = stats.state;
      if (stats.country) profile.country = stats.country;
      if (stats.specializations) profile.specializations = stats.specializations;

      return profile as unknown as Athlete;
    } catch (error) {
      console.error('Error getting athlete profile:', error);
      throw error;
    }
  }

  /**
   * Update athlete profile
   */
  async updateAthleteProfile(userId: string, updates: Partial<AthleteProfile>): Promise<void> {
    try {
      const { data: currentData } = await supabase
        .from('athletes')
        .select('stats')
        .eq('user_id', userId)
        .single();

      const currentStats = currentData?.stats || {};
      const newStats = { ...currentStats, ...updates }; // Naive merge

      const dbUpdates: any = {
        stats: newStats
      };

      if (updates.gender) dbUpdates.gender = updates.gender;
      if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;
      // height/weight not in AthleteProfile interface explicitly but used in Create? 
      // Assuming updates might contain them if casted
      const anyUpdates = updates as any;
      if (anyUpdates.height) dbUpdates.height = anyUpdates.height;
      if (anyUpdates.weight) dbUpdates.weight = anyUpdates.weight;
      if (updates.sports) {
        dbUpdates.sports = [updates.sports.primary, updates.sports.secondary].filter(Boolean);
        dbUpdates.position = updates.sports.position;
      }

      const { error } = await supabase
        .from('athletes')
        .update(dbUpdates)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating athlete profile:', error);
      throw error;
    }
  }
}

export const athletesService = new AthletesService();
