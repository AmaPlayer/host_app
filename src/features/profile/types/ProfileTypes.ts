// TypeScript interfaces for enhanced profile functionality
import { TalentVideo } from './TalentVideoTypes';

export type UserRole = 'athlete' | 'organization' | 'parent' | 'coach';

export interface PersonalDetails {
  // Common fields
  name: string;
  dateOfBirth?: string;
  gender?: string;

  // Contact Details
  mobile?: string;
  email?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;

  // Athlete-specific
  playerType?: 'Amateur' | 'Professional' | 'Student Athlete';
  sport?: string;
  position?: string;

  // Organization-specific
  organizationName?: string;
  organizationType?: string;
  location?: string;
  contactEmail?: string;
  website?: string;

  // Parent-specific
  relationship?: string;
  connectedAthletes?: string[];

  // Coach-specific
  specializations?: string[];
  yearsExperience?: number;
  coachingLevel?: string;
}

export interface PhysicalAttributes {
  // Physical measurements
  height?: number; // in cm
  weight?: number; // in kg
  dominantSide?: 'Left' | 'Right';

  // Performance metrics
  personalBest?: string;
  seasonBest?: string;

  // Training details
  coachName?: string;
  coachContact?: string;
  trainingAcademy?: string;
  schoolName?: string;
  clubName?: string;
}

export interface TrackBest {
  // Cricket specific
  runs?: string;
  overs?: string;
  strikeRate?: string;
  
  // Football specific
  goals?: string;
  minutes?: string;
  assists?: string;
  
  // Basketball specific
  points?: string;
  rebounds?: string;
  gameTime?: string;
  
  // Tennis specific
  aces?: string;
  winners?: string;
  matchDuration?: string;
  
  // Generic fields for other sports
  field1?: string;
  field2?: string;
  field3?: string;
  
  // Meta info
  sport?: string;
  matchDate?: string;
  opponent?: string;
  venue?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  dateEarned: Date;
  category: string;
  imageUrl?: string;
  verificationStatus?: 'verified' | 'pending' | 'unverified';
}

export interface Certificate {
  id: string;
  name: string;
  issuingOrganization: string;
  dateIssued: Date;
  expirationDate?: Date;
  verificationUrl?: string;
  certificateImageUrl?: string;
}

export interface Post {
  id: string;
  type: 'photo' | 'video' | 'text' | 'mixed';
  title?: string;
  content: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  createdDate: Date;
  likes: number;
  comments: number;
  isPublic: boolean;
}

export interface ProfileEnhancedState {
  currentRole: UserRole;
  isEditing: boolean;
  editingSection: string | null;
  achievements: Achievement[];
  certificates: Certificate[];
  talentVideos: TalentVideo[];
  posts: Post[];
  personalDetails: PersonalDetails;
  physicalAttributes: PhysicalAttributes;
  trackBest: TrackBest;
}

export interface RoleConfig {
  role: UserRole;
  sections: ProfileSection[];
  editableFields: string[];
  displayName: string;
}

export type ProfileSection =
  | 'personal'
  | 'physicalAttributes'
  | 'achievements'
  | 'certificates'
  | 'talentVideos'
  | 'posts'
  | 'organizationInfo'
  | 'connectedAthletes'
  | 'coachingInfo';

export const roleConfigurations: Record<UserRole, RoleConfig> = {
  athlete: {
    role: 'athlete',
    sections: ['personal', 'physicalAttributes', 'achievements', 'certificates', 'talentVideos', 'posts'],
    editableFields: ['name', 'dateOfBirth', 'gender', 'mobile', 'email', 'city', 'state', 'country'],
    displayName: 'Player'
  },
  organization: {
    role: 'organization',
    sections: ['personal', 'organizationInfo', 'certificates', 'posts'],
    editableFields: ['name', 'dateOfBirth', 'gender', 'mobile', 'email', 'city', 'state', 'country'],
    displayName: 'Organization'
  },
  parent: {
    role: 'parent',
    sections: ['personal', 'connectedAthletes', 'posts'],
    editableFields: ['name', 'dateOfBirth', 'gender', 'mobile', 'email', 'city', 'state', 'country'],
    displayName: 'Parent'
  },
  coach: {
    role: 'coach',
    sections: ['personal', 'coachingInfo', 'certificates', 'posts'],
    editableFields: ['name', 'dateOfBirth', 'gender', 'mobile', 'email', 'city', 'state', 'country'],
    displayName: 'Coach'
  }
};