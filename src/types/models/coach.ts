import { Timestamp } from 'firebase/firestore';

// Coach profile for role-specific collection (coaches/{uid})
export interface CoachProfile {
  uid: string;
  email: string;
  role: 'coach';
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Professional Details
  fullName: string;
  phone: string;
  photoURL?: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  sport: string;
  yearsOfExperience: number;
  coachingLevel: string;
  certifications: string;
  bio: string;

  // System fields
  isActive: boolean;
  isVerified: boolean;
}

// Full coach user type with ID (for queries)
export interface Coach extends CoachProfile {
  id: string;
}

// Legacy coach profile structure (for backward compatibility with users collection)
export interface LegacyCoachProfile {
  fullName: string;
  sport: string;
  yearsOfExperience: string;
  coachingLevel: string;
  certifications?: string;
  bio?: string;
  phone?: string;
  email: string;
}

// Legacy coach user type (for backward compatibility)
export interface LegacyCoach {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'coach';

  // Coach-specific profile (nested structure)
  coachProfile: LegacyCoachProfile;

  // Standard user fields
  postsCount: number;
  storiesCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;

  // Language preference
  languagePreference?: string;
  languagePreferenceUpdatedAt?: Timestamp | Date | string;
}

// Data for creating coach profile
export interface CreateCoachData {
  uid: string;
  email: string;
  photoURL?: string | null;
  role: 'coach';

  fullName: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  sport: string;
  yearsOfExperience: number;
  coachingLevel: string;
  certifications?: string;
  bio?: string;
}
