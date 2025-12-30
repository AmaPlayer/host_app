import { supabase } from '../../lib/supabase';
import { COLLECTIONS } from '../../constants/firebase';
import { OrganizationProfile, Organization, CreateOrganizationData } from '../../types/models/organization';

class OrganizationsService {
  
  /**
   * Create a new organization profile in the organizations table
   * @param userId - The Supabase UUID
   * @param data - The organization profile data
   */
  async createOrganizationProfile(userId: string, data: Partial<CreateOrganizationData>): Promise<void> {
    try {
      const contactInfo = {
        organizationName: data.organizationName,
        registrationNumber: data.registrationNumber,
        website: data.website,
        contactPerson: data.contactPerson,
        designation: data.designation,
        primaryEmail: data.primaryEmail,
        primaryPhone: data.primaryPhone,
        secondaryPhone: data.secondaryPhone,
        address: data.address,
        sports: data.sports,
        ageGroups: data.ageGroups,
        achievements: data.achievements,
        socialMedia: data.socialMedia,
        termsAccepted: data.termsAccepted
      };

      const { error } = await supabase
        .from('organizations')
        .insert({
          user_id: userId,
          org_type: data.organizationType,
          founded_year: data.yearEstablished,
          facilities: data.facilities || [],
          member_count: data.numberOfPlayers || 0,
          contact_info: contactInfo
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating organization profile:', error);
      throw error;
    }
  }

  /**
   * Get organization profile by User ID (UUID)
   */
  async getOrganizationProfile(userId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const info = data.contact_info || {};

      const profile: any = {
        id: userId,
        uid: userId,
        role: 'organization',
        organizationName: info.organizationName,
        organizationType: data.org_type,
        registrationNumber: info.registrationNumber,
        yearEstablished: data.founded_year,
        website: info.website,
        contactPerson: info.contactPerson,
        designation: info.designation,
        primaryEmail: info.primaryEmail,
        primaryPhone: info.primaryPhone,
        secondaryPhone: info.secondaryPhone,
        address: info.address,
        sports: info.sports,
        numberOfPlayers: data.member_count,
        ageGroups: info.ageGroups,
        facilities: data.facilities,
        achievements: info.achievements,
        socialMedia: info.socialMedia,
        termsAccepted: info.termsAccepted,
        isActive: true,
        isVerified: false
      };

      // Only add these if they have values to avoid overwriting base user data in userService merge
      if (info.email) profile.email = info.email;

      return profile as unknown as Organization;
    } catch (error) {
      console.error('Error getting organization profile:', error);
      throw error;
    }
  }

  /**
   * Update organization profile
   */
  async updateOrganizationProfile(userId: string, updates: Partial<OrganizationProfile>): Promise<void> {
    try {
      const { data: currentData } = await supabase
        .from('organizations')
        .select('contact_info')
        .eq('user_id', userId)
        .single();
        
      const currentInfo = currentData?.contact_info || {};
      const newInfo = { ...currentInfo, ...updates }; // Naive merge

      const dbUpdates: any = {
        contact_info: newInfo
      };

      if (updates.organizationType) dbUpdates.org_type = updates.organizationType;
      if (updates.yearEstablished) dbUpdates.founded_year = updates.yearEstablished;
      if (updates.facilities) dbUpdates.facilities = updates.facilities;
      if (updates.numberOfPlayers) dbUpdates.member_count = updates.numberOfPlayers;

      const { error } = await supabase
        .from('organizations')
        .update(dbUpdates)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating organization profile:', error);
      throw error;
    }
  }
}

export const organizationsService = new OrganizationsService();
