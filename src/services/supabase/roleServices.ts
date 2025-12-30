import { supabase } from '../../lib/supabase';

export const coachesService = {
  async createCoachProfile(userId: string, data: any) {
    return supabase.from('coaches').insert({
      user_id: userId,
      specializations: data.specializations,
      years_experience: data.yearsExperience,
      certifications: data.certifications,
      coaching_philosophy: data.philosophy,
      details: data
    });
  },
  async getCoachProfile(userId: string) {
    const { data } = await supabase.from('coaches').select('*').eq('user_id', userId).single();
    return data;
  },
  async updateCoachProfile(userId: string, data: any) {
    return supabase.from('coaches').update({ details: data }).eq('user_id', userId);
  }
};

export const parentsService = {
  async createParentProfile(userId: string, data: any) {
    return supabase.from('parents').insert({
      user_id: userId,
      child_names: data.childNames,
      child_sports: data.childSports,
      aspirations: data.aspirations,
      details: data
    });
  },
  async getParentProfile(userId: string) {
    const { data } = await supabase.from('parents').select('*').eq('user_id', userId).single();
    return data;
  },
  async updateParentProfile(userId: string, data: any) {
    return supabase.from('parents').update({ details: data }).eq('user_id', userId);
  }
};

export const organizationsService = {
  async createOrganizationProfile(userId: string, data: any) {
    return supabase.from('organizations').insert({
      user_id: userId,
      org_type: data.orgType,
      founded_year: data.foundedYear,
      facilities: data.facilities,
      contact_info: data.contactInfo
    });
  },
  async getOrganizationProfile(userId: string) {
    const { data } = await supabase.from('organizations').select('*').eq('user_id', userId).single();
    return data;
  },
  async updateOrganizationProfile(userId: string, data: any) {
    return supabase.from('organizations').update({ contact_info: data.contactInfo }).eq('user_id', userId);
  }
};
