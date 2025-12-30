import React, { useCallback, useMemo } from 'react';
import { UserRole, PersonalDetails, Achievement, Certificate, Post } from '../types/ProfileTypes';
import { TalentVideo } from '../types/TalentVideoTypes';

interface ProfileSectionIntegrationProps {
  currentRole: UserRole;
  personalDetails: PersonalDetails;
  achievements: Achievement[];
  certificates: Certificate[];
  talentVideos: TalentVideo[];
  posts: Post[];
  isOwner: boolean;
  onOpenEditModal: (initialTab: string) => void;
  onDataChange: (data: {
    personalDetails?: PersonalDetails;
    achievements?: Achievement[];
    certificates?: Certificate[];
    talentVideos?: TalentVideo[];
    posts?: Post[];
  }) => void;
}

/**
 * ProfileSectionIntegration provides centralized integration between
 * profile sections and the edit modal, handling real-time updates
 * and data synchronization across all profile components.
 */
const ProfileSectionIntegration: React.FC<ProfileSectionIntegrationProps> = ({
  currentRole,
  personalDetails,
  achievements,
  certificates,
  talentVideos,
  posts,
  isOwner,
  onOpenEditModal,
  onDataChange
}) => {
  // Memoized handlers for achievements
  const achievementHandlers = useMemo(() => ({
    onAddAchievement: () => {
      onOpenEditModal('achievements');
    },
    onEditAchievement: (achievement: Achievement) => {
      // Store the achievement to edit in session storage for the modal
      sessionStorage.setItem('editingAchievement', JSON.stringify(achievement));
      onOpenEditModal('achievements');
    },
    onDeleteAchievement: (id: string) => {
      const updatedAchievements = achievements.filter(a => a.id !== id);
      onDataChange({ achievements: updatedAchievements });
    }
  }), [achievements, onOpenEditModal, onDataChange]);

  // Memoized handlers for certificates
  const certificateHandlers = useMemo(() => ({
    onAddCertificate: () => {
      onOpenEditModal('certificates');
    },
    onEditCertificate: (certificate: Certificate) => {
      sessionStorage.setItem('editingCertificate', JSON.stringify(certificate));
      onOpenEditModal('certificates');
    },
    onDeleteCertificate: (id: string) => {
      const updatedCertificates = certificates.filter(c => c.id !== id);
      onDataChange({ certificates: updatedCertificates });
    }
  }), [certificates, onOpenEditModal, onDataChange]);

  // Memoized handlers for talent videos
  const videoHandlers = useMemo(() => ({
    onAddVideo: () => {
      onOpenEditModal('videos');
    },
    onEditVideo: (video: TalentVideo) => {
      sessionStorage.setItem('editingVideo', JSON.stringify(video));
      onOpenEditModal('videos');
    },
    onDeleteVideo: (id: string) => {
      const updatedVideos = talentVideos.filter(v => v.id !== id);
      onDataChange({ talentVideos: updatedVideos });
    },
    onVideoClick: (video: TalentVideo) => {
      // Handle video playback - could open video player modal}
  }), [talentVideos, onOpenEditModal, onDataChange]);

  // Memoized handlers for posts
  const postHandlers = useMemo(() => ({
    onPostClick: (post: Post) => {
      // Handle post click - could navigate to post detail},
    onAddPost: (postData: Omit<Post, 'id' | 'createdDate' | 'likes' | 'comments'>) => {
      const newPost: Post = {
        ...postData,
        id: Date.now().toString(),
        createdDate: new Date(),
        likes: 0,
        comments: 0
      };
      const updatedPosts = [newPost, ...posts];
      onDataChange({ posts: updatedPosts });
    },
    onEditPost: (id: string, postData: Omit<Post, 'id' | 'createdDate' | 'likes' | 'comments'>) => {
      const updatedPosts = posts.map(p => p.id === id ? { ...p, ...postData } : p);
      onDataChange({ posts: updatedPosts });
    },
    onDeletePost: (id: string) => {
      const updatedPosts = posts.filter(p => p.id !== id);
      onDataChange({ posts: updatedPosts });
    }
  }), [posts, onDataChange]);

  // Quick edit handlers for inline editing
  const quickEditHandlers = useMemo(() => ({
    onQuickEditPersonalDetail: (field: keyof PersonalDetails, value: any) => {
      const updatedDetails = { ...personalDetails, [field]: value };
      onDataChange({ personalDetails: updatedDetails });
    },
    onBulkUpdateAchievements: (updatedAchievements: Achievement[]) => {
      onDataChange({ achievements: updatedAchievements });
    },
    onBulkUpdateCertificates: (updatedCertificates: Certificate[]) => {
      onDataChange({ certificates: updatedCertificates });
    },
    onBulkUpdateVideos: (updatedVideos: TalentVideo[]) => {
      onDataChange({ talentVideos: updatedVideos });
    },
    onBulkUpdatePosts: (updatedPosts: Post[]) => {
      onDataChange({ posts: updatedPosts });
    }
  }), [personalDetails, onDataChange]);

  // Real-time data validation
  const validateData = useCallback(() => {
    const errors: string[] = [];
    
    // Validate personal details
    if (!personalDetails.username || personalDetails.username.trim() === '') {
      errors.push('Username is required');
    }
    
    // Validate achievements
    achievements.forEach((achievement, index) => {
      if (!achievement.title || achievement.title.trim() === '') {
        errors.push(`Achievement ${index + 1}: Title is required`);
      }
      if (!achievement.dateEarned) {
        errors.push(`Achievement ${index + 1}: Date is required`);
      }
    });
    
    // Validate certificates
    certificates.forEach((certificate, index) => {
      if (!certificate.name || certificate.name.trim() === '') {
        errors.push(`Certificate ${index + 1}: Name is required`);
      }
      if (!certificate.issuingOrganization || certificate.issuingOrganization.trim() === '') {
        errors.push(`Certificate ${index + 1}: Issuing organization is required`);
      }
    });
    
    return errors;
  }, [personalDetails, achievements, certificates]);

  // Data statistics for analytics
  const dataStats = useMemo(() => ({
    totalItems: achievements.length + certificates.length + talentVideos.length + posts.length,
    completionPercentage: calculateProfileCompleteness(),
    lastUpdated: getLastUpdateTime(),
    validationErrors: validateData()
  }), [achievements.length, certificates.length, talentVideos.length, posts.length, validateData]);

  function calculateProfileCompleteness(): number {
    let totalFields = 0;
    let filledFields = 0;
    
    // Count personal details fields
    const requiredPersonalFields = ['username'];
    const optionalPersonalFields = ['name', 'age', 'height', 'weight', 'sex', 'sport', 'position'];
    
    requiredPersonalFields.forEach(field => {
      totalFields++;
      if (personalDetails[field as keyof PersonalDetails]) filledFields++;
    });
    
    optionalPersonalFields.forEach(field => {
      totalFields++;
      if (personalDetails[field as keyof PersonalDetails]) filledFields++;
    });
    
    // Count section content
    totalFields += 4; // achievements, certificates, videos, posts sections
    if (achievements.length > 0) filledFields++;
    if (certificates.length > 0) filledFields++;
    if (talentVideos.length > 0) filledFields++;
    if (posts.length > 0) filledFields++;
    
    return Math.round((filledFields / totalFields) * 100);
  }

  function getLastUpdateTime(): Date | null {
    const timestamps = [
      ...achievements.map(a => new Date(a.dateEarned)),
      ...certificates.map(c => new Date(c.dateIssued)),
      ...talentVideos.map(v => new Date(v.uploadDate)),
      ...posts.map(p => new Date(p.createdDate))
    ];
    
    return timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : null;
  }

  // Export handlers and data for use by parent components
  return {
    achievementHandlers,
    certificateHandlers,
    videoHandlers,
    postHandlers,
    quickEditHandlers,
    dataStats,
    validateData
  } as any; // This component acts as a hook-like provider
};

export default ProfileSectionIntegration;

// Custom hook version for easier usage
export const useProfileSectionIntegration = (props: ProfileSectionIntegrationProps) => {
  return ProfileSectionIntegration(props);
};