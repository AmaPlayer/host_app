import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3 } from 'lucide-react';
import FooterNav from '../../../components/layout/FooterNav';
import RoleSelector from '../components/RoleSelector';
import AchievementsSection from '../components/AchievementsSection';
import CertificatesSection from '../components/CertificatesSection';
import RoleSpecificSections from '../components/RoleSpecificSections';
import AchievementModal from '../components/AchievementModal';
import CertificateModal from '../components/CertificateModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import EditProfileModal, { EditProfileData } from '../components/EditProfileModal';
import PersonalDetailsModal from '../components/PersonalDetailsModal';
import PhysicalAttributesModal from '../components/PhysicalAttributesModal';
import TrackBestSection from '../components/TrackBestSection';
import TrackBestModal from '../components/TrackBestModal';
import AchievementsSectionModal from '../components/AchievementsSectionModal';
import CertificatesSectionModal from '../components/CertificatesSectionModal';
import { UserRole, PersonalDetails, PhysicalAttributes, TrackBest, ProfileEnhancedState, roleConfigurations, Achievement, Certificate } from '../types/ProfileTypes';
import { TalentVideo } from '../types/TalentVideoTypes';
import { useAuth } from '../../../contexts/AuthContext';
import userService from '../../../services/api/userService';
import '../styles/Profile.css';
import '../styles/ProfileEnhanced.css';

const ProfileEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Initialize state with default values
  const [profileState, setProfileState] = useState<ProfileEnhancedState>({
    currentRole: 'athlete',
    isEditing: false,
    editingSection: null,
    achievements: [],
    certificates: [],
    talentVideos: [],
    posts: [],
    personalDetails: {
      name: 'baboo yogi',
      dateOfBirth: '1999-05-15',
      gender: 'Male',
      mobile: '+1234567890',
      email: 'baboo@example.com',
      city: 'Los Angeles',
      district: 'Central LA',
      state: 'California',
      playerType: 'Professional',
      sport: 'Basketball',
      position: 'Point Guard',
      // Organization-specific fields
      organizationName: 'Elite Sports Academy',
      organizationType: 'Training Facility',
      location: 'Los Angeles, CA',
      contactEmail: 'info@elitesports.com',
      website: 'www.elitesports.com',
      // Parent-specific fields
      relationship: 'Father',
      connectedAthletes: ['Alex Johnson', 'Sarah Johnson'],
      // Coach-specific fields
      specializations: ['Basketball', 'Strength Training', 'Youth Development'],
      yearsExperience: 8,
      coachingLevel: 'Level 3 Certified'
    },
    physicalAttributes: {
      height: 188, // cm
      weight: 82, // kg
      dominantSide: 'Right',
      personalBest: '32 points',
      seasonBest: '28 points avg',
      coachName: 'John Smith',
      coachContact: '+1987654321',
      trainingAcademy: 'Elite Basketball Academy',
      schoolName: 'LA Sports High',
      clubName: 'Lakers Youth'
    },
    trackBest: {
      points: '35',
      rebounds: '12',
      gameTime: '40',
      matchDate: '2024-03-15',
      opponent: 'Warriors Youth',
      venue: 'Staples Center'
    }
  });

  // Modal states
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAchievementId, setDeletingAchievementId] = useState<string | null>(null);
  const [deletingCertificateId, setDeletingCertificateId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'achievement' | 'certificate'>('achievement');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editModalInitialTab, setEditModalInitialTab] = useState<'personal' | 'physicalAttributes' | 'trackBest' | 'achievements' | 'certificates' | 'videos' | 'posts' | 'organization' | 'coaching' | 'parent'>('personal');
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);
  const [isPhysicalAttributesModalOpen, setIsPhysicalAttributesModalOpen] = useState(false);
  const [isTrackBestModalOpen, setIsTrackBestModalOpen] = useState(false);
  const [isAchievementsSectionModalOpen, setIsAchievementsSectionModalOpen] = useState(false);
  const [isCertificatesSectionModalOpen, setIsCertificatesSectionModalOpen] = useState(false);

  // Load user profile data from Firebase on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        try {
          // Fetch user data from Firebase
          const userData = await userService.getUserProfile(currentUser.uid);
          
          if (userData) {
            // Map user role to profile role format
            let profileRole: UserRole = 'athlete';
            if (userData.role === 'parent') profileRole = 'parent';
            else if (userData.role === 'coach') profileRole = 'coach';
            else if (userData.role) profileRole = userData.role as UserRole;
            
            // Update state with Firebase data
            setProfileState(prev => ({
              ...prev,
              currentRole: profileRole
            }));
            
            // Save to localStorage for immediate access
            localStorage.setItem('userRole', profileRole);
            if (userData.sports && userData.sports[0]) {
              localStorage.setItem('userSport', userData.sports[0]);
            }
            if (userData.position) {
              localStorage.setItem('userPosition', userData.position);
            }
            if (userData.specializations) {
              localStorage.setItem('userSpecializations', JSON.stringify(userData.specializations));
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Fallback to localStorage if Firebase fetch fails
          const savedRole = localStorage.getItem('userRole') as UserRole;
          if (savedRole && roleConfigurations[savedRole]) {
            setProfileState(prev => ({
              ...prev,
              currentRole: savedRole
            }));
          }
        }
      }
    };
    
    loadUserProfile();
  }, [currentUser]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    setProfileState(prev => ({
      ...prev,
      currentRole: newRole
    }));
    
    // Persist role selection to localStorage for immediate UI update
    localStorage.setItem('userRole', newRole);
    
    // Save to Firebase
    if (currentUser) {
      try {
        // Map profile role to user role format (already in correct format)
        const userRole = newRole;
        await userService.updateUserProfile(currentUser.uid, {
          role: userRole as any
        });
} catch (error) {
        console.error('❌ Error saving role to Firebase:', error);
      }
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
      detail: { role: newRole } 
    }));
  };

  const handleEditProfile = (section: 'personal' | 'physicalAttributes' | 'trackBest' | 'achievements' | 'certificates' | 'videos' | 'posts' | 'organization' | 'coaching' | 'parent' = 'personal') => {
    // Route to specific section modals instead of the big modal
    switch (section) {
      case 'personal':
        setIsPersonalDetailsModalOpen(true);
        break;
      case 'physicalAttributes':
        setIsPhysicalAttributesModalOpen(true);
        break;
      case 'trackBest':
        setIsTrackBestModalOpen(true);
        break;
      case 'achievements':
        setIsAchievementsSectionModalOpen(true);
        break;
      case 'certificates':
        setIsCertificatesSectionModalOpen(true);
        break;
      default:
        setEditModalInitialTab(section);
        setIsEditProfileModalOpen(true);
        break;
    }
  };

  const handleSaveProfile = async (data: EditProfileData) => {
    setProfileState(prev => ({
      ...prev,
      personalDetails: data.personalDetails,
      physicalAttributes: data.physicalAttributes,
      achievements: data.achievements,
      certificates: data.certificates,
      talentVideos: data.talentVideos,
      posts: data.posts
    }));
    
    // Save user profile data to localStorage for immediate UI update
    localStorage.setItem('userSport', data.personalDetails.sport || '');
    localStorage.setItem('userPosition', data.personalDetails.position || '');
    localStorage.setItem('userPlayerType', data.personalDetails.playerType || '');
    localStorage.setItem('userOrganizationType', data.personalDetails.organizationType || '');
    if (data.personalDetails.specializations) {
      localStorage.setItem('userSpecializations', JSON.stringify(data.personalDetails.specializations));
    }
    
    // Save to Firebase
    if (currentUser) {
      try {
        await userService.updateUserProfile(currentUser.uid, {
          sports: data.personalDetails.sport ? [data.personalDetails.sport] : undefined,
          position: data.personalDetails.position,
          specializations: data.personalDetails.specializations
        } as any);
} catch (error) {
        console.error('❌ Error saving profile to Firebase:', error);
      }
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    
    setIsEditProfileModalOpen(false);
  };

  const handleCloseEditProfile = () => {
    setIsEditProfileModalOpen(false);
  };

  // Handler for personal details modal
  const handleSavePersonalDetails = async (updatedPersonalDetails: PersonalDetails) => {
    setProfileState(prev => ({
      ...prev,
      personalDetails: updatedPersonalDetails
    }));
    
    // Save user profile data to localStorage for immediate UI update
    localStorage.setItem('userSport', updatedPersonalDetails.sport || '');
    localStorage.setItem('userPosition', updatedPersonalDetails.position || '');
    localStorage.setItem('userPlayerType', updatedPersonalDetails.playerType || '');
    localStorage.setItem('userOrganizationType', updatedPersonalDetails.organizationType || '');
    if (updatedPersonalDetails.specializations) {
      localStorage.setItem('userSpecializations', JSON.stringify(updatedPersonalDetails.specializations));
    }
    
    // Save to Firebase
    if (currentUser) {
      try {
        await userService.updateUserProfile(currentUser.uid, {
          sports: updatedPersonalDetails.sport ? [updatedPersonalDetails.sport] : undefined,
          position: updatedPersonalDetails.position,
          specializations: updatedPersonalDetails.specializations
        } as any);
} catch (error) {
        console.error('❌ Error saving personal details to Firebase:', error);
      }
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    
    setIsPersonalDetailsModalOpen(false);
  };

  // Handler for physical attributes modal
  const handleSavePhysicalAttributes = async (updatedPhysicalAttributes: PhysicalAttributes) => {
    setProfileState(prev => ({
      ...prev,
      physicalAttributes: updatedPhysicalAttributes
    }));
    
    // Save to Firebase
    if (currentUser) {
      try {
        // Physical attributes would be saved as part of user profile
} catch (error) {
        console.error('❌ Error saving physical attributes:', error);
      }
    }
    
    setIsPhysicalAttributesModalOpen(false);
  };

  // Handler for organization info modal
  const handleSaveOrganizationInfo = async (updatedPersonalDetails: PersonalDetails) => {
    setProfileState(prev => ({
      ...prev,
      personalDetails: updatedPersonalDetails
    }));

    // Save to Firebase
    if (currentUser) {
      try {
        await userService.updateUserProfile(currentUser.uid, {
          organizationName: updatedPersonalDetails.organizationName,
          organizationType: updatedPersonalDetails.organizationType,
          location: updatedPersonalDetails.location,
          contactEmail: updatedPersonalDetails.contactEmail,
          website: updatedPersonalDetails.website
        } as any);
} catch (error) {
        console.error('❌ Error saving organization info to Firebase:', error);
      }
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('userProfileUpdated'));
  };

  // Handler for achievements section modal
  const handleSaveAchievements = async (updatedAchievements: Achievement[]) => {
    setProfileState(prev => ({
      ...prev,
      achievements: updatedAchievements
    }));
    
    // Save to Firebase
    if (currentUser) {
      try {
        // Achievements would be saved as part of user profile
} catch (error) {
        console.error('❌ Error saving achievements:', error);
      }
    }
    
    setIsAchievementsSectionModalOpen(false);
  };

  // Handler for certificates section modal
  const handleSaveCertificates = async (updatedCertificates: Certificate[]) => {
    setProfileState(prev => ({
      ...prev,
      certificates: updatedCertificates
    }));
    
    // Save to Firebase
    if (currentUser) {
      try {
        // Certificates would be saved as part of user profile
} catch (error) {
        console.error('❌ Error saving certificates:', error);
      }
    }
    
    setIsCertificatesSectionModalOpen(false);
  };

  // Handler for track best modal
  const handleSaveTrackBest = async (updatedTrackBest: TrackBest) => {
    setProfileState(prev => ({
      ...prev,
      trackBest: updatedTrackBest
    }));
    
    // Save to Firebase
    if (currentUser) {
      try {
        // Track best would be saved as part of user profile
} catch (error) {
        console.error('❌ Error saving track best:', error);
      }
    }
    
    setIsTrackBestModalOpen(false);
  };

  const handleAddAthlete = () => {
    // TODO: Implement add athlete functionality
};

  // Achievement management functions
  const handleAddAchievement = () => {
    setEditingAchievement(null);
    setIsAchievementModalOpen(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setIsAchievementModalOpen(true);
  };

  const handleDeleteAchievement = (achievementId: string) => {
    setDeletingAchievementId(achievementId);
    setDeleteType('achievement');
    setIsDeleteModalOpen(true);
  };

  const handleSaveAchievement = (achievementData: Omit<Achievement, 'id'>) => {
    if (editingAchievement) {
      // Update existing achievement
      const updatedAchievement: Achievement = {
        ...achievementData,
        id: editingAchievement.id
      };
      
      setProfileState(prev => ({
        ...prev,
        achievements: prev.achievements.map(achievement =>
          achievement.id === editingAchievement.id ? updatedAchievement : achievement
        )
      }));
    } else {
      // Add new achievement
      const newAchievement: Achievement = {
        ...achievementData,
        id: `achievement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      setProfileState(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement]
      }));
    }
    
    setIsAchievementModalOpen(false);
    setEditingAchievement(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAchievementId && !deletingCertificateId) return;
    
    setIsDeleting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (deleteType === 'achievement' && deletingAchievementId) {
        setProfileState(prev => ({
          ...prev,
          achievements: prev.achievements.filter(achievement => achievement.id !== deletingAchievementId)
        }));
        setDeletingAchievementId(null);
      } else if (deleteType === 'certificate' && deletingCertificateId) {
        setProfileState(prev => ({
          ...prev,
          certificates: prev.certificates.filter(certificate => certificate.id !== deletingCertificateId)
        }));
        setDeletingCertificateId(null);
      }
      
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error(`Error deleting ${deleteType}:`, error);
      // In a real app, you'd show an error message to the user
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setDeletingAchievementId(null);
      setDeletingCertificateId(null);
    }
  };

  const handleCloseAchievementModal = () => {
    setIsAchievementModalOpen(false);
    setEditingAchievement(null);
  };

  // Certificate management functions
  const handleAddCertificate = () => {
    setEditingCertificate(null);
    setIsCertificateModalOpen(true);
  };

  const handleEditCertificate = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setIsCertificateModalOpen(true);
  };

  const handleDeleteCertificate = (certificateId: string) => {
    setDeletingCertificateId(certificateId);
    setDeleteType('certificate');
    setIsDeleteModalOpen(true);
  };

  const handleSaveCertificate = (certificateData: Omit<Certificate, 'id'>) => {
    if (editingCertificate) {
      // Update existing certificate
      const updatedCertificate: Certificate = {
        ...certificateData,
        id: editingCertificate.id
      };
      
      setProfileState(prev => ({
        ...prev,
        certificates: prev.certificates.map(certificate =>
          certificate.id === editingCertificate.id ? updatedCertificate : certificate
        )
      }));
    } else {
      // Add new certificate
      const newCertificate: Certificate = {
        ...certificateData,
        id: `certificate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      };
      
      setProfileState(prev => ({
        ...prev,
        certificates: [...prev.certificates, newCertificate]
      }));
    }
    
    setIsCertificateModalOpen(false);
    setEditingCertificate(null);
  };

  const handleCloseCertificateModal = () => {
    setIsCertificateModalOpen(false);
    setEditingCertificate(null);
  };

  // Get item name for delete confirmation
  const getDeletingItemName = (): string => {
    if (deleteType === 'achievement' && deletingAchievementId) {
      const achievement = profileState.achievements.find(a => a.id === deletingAchievementId);
      return achievement?.title || '';
    } else if (deleteType === 'certificate' && deletingCertificateId) {
      const certificate = profileState.certificates.find(c => c.id === deletingCertificateId);
      return certificate?.name || '';
    }
    return '';
  };

  const currentRoleConfig = roleConfigurations[profileState.currentRole];

  // Get role-specific field value
  const getFieldValue = (field: string): string => {
    const value = profileState.personalDetails[field as keyof PersonalDetails];
    if (value === undefined || value === null || value === '') {
      return 'Not specified';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Not specified';
    }
    return String(value);
  };

  // Render role-specific fields
  const renderPersonalDetailsFields = () => {
    const { editableFields } = currentRoleConfig;
    
    return editableFields.map((field) => {
      let label = field.toUpperCase();
      let fieldId = `${field}-label`;
      
      // Custom labels for better UX
      switch (field) {
        case 'organizationName':
          label = 'ORGANIZATION NAME';
          break;
        case 'organizationType':
          label = 'ORGANIZATION TYPE';
          break;
        case 'contactEmail':
          label = 'CONTACT EMAIL';
          break;
        case 'yearsExperience':
          label = 'YEARS OF EXPERIENCE';
          break;
        case 'coachingLevel':
          label = 'COACHING LEVEL';
          break;
        case 'connectedAthletes':
          label = 'CONNECTED ATHLETES';
          break;
        default:
          label = field.replace(/([A-Z])/g, ' $1').toUpperCase();
      }

      return (
        <div key={field} className="field-row">
          <span className="field-label" id={fieldId}>{label}</span>
          <span className="field-value" aria-labelledby={fieldId}>
            {getFieldValue(field)}
          </span>
        </div>
      );
    });
  };

  return (
    <main className="profile-page profile-enhanced" role="main">
      {/* Top Navigation Bar */}
      <nav className="profile-nav" role="navigation" aria-label="Profile navigation">
        <div className="profile-nav-content">
          <button
            className="back-button"
            onClick={handleGoBack}
            aria-label="Go back to previous page"
            type="button"
          >
            <ArrowLeft size={24} aria-hidden="true" />
            <span className="back-text">Back</span>
          </button>
          
          <h1 className="profile-nav-title">Profile</h1>
          
          <button
            className="edit-profile-nav-button"
            onClick={() => handleEditProfile('personal')}
            aria-label="Edit profile"
            type="button"
          >
            <Edit3 size={20} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <header className="profile-header" role="banner">
        <div className="profile-avatar">
          <div className="avatar-placeholder" role="img" aria-label="Profile avatar placeholder">
            <span className="avatar-icon" aria-hidden="true">👤</span>
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-username">{profileState.personalDetails.name}</h1>
          
          {/* Role Selector */}
          <RoleSelector
            currentRole={profileState.currentRole}
            onRoleChange={handleRoleChange}
            className="profile-role-selector"
          />
          
          <div className="profile-stats" role="group" aria-label="Profile statistics">
            <div className="stat-item">
              <span className="stat-number" aria-label="4 posts">4</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" aria-label="1 follower">1</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" aria-label="0 following">0</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
          
          <button 
            className="follow-button"
            type="button"
            aria-label="Follow this user"
          >
            Not Following
          </button>
        </div>
      </header>

      {/* Track Best Section */}
      <TrackBestSection
        trackBest={profileState.trackBest}
        sport={profileState.personalDetails.sport}
        isOwner={true}
        onEditSection={() => setIsTrackBestModalOpen(true)}
      />

      <section className="personal-details" aria-labelledby="personal-details-heading">
        <div className="section-header">
          <h2 id="personal-details-heading" className="section-title">
            Personal Details ({currentRoleConfig.displayName})
          </h2>
          <button
            className="section-edit-button"
            onClick={() => handleEditProfile('personal')}
            aria-label="Edit personal details"
            type="button"
          >
            <Edit3 size={16} aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>
        
        <div className="details-card" role="group" aria-labelledby="personal-details-heading">
          {renderPersonalDetailsFields()}
          
          {/* Always show current role */}
          <div className="field-row">
            <span className="field-label" id="current-role-label">CURRENT ROLE</span>
            <span className="field-value" aria-labelledby="current-role-label">
              {currentRoleConfig.displayName}
            </span>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      {currentRoleConfig.sections.includes('achievements') && (
        <AchievementsSection
          achievements={profileState.achievements}
          isOwner={true} // TODO: Determine ownership based on current user vs profile user
          onAddAchievement={handleAddAchievement}
          onEditAchievement={handleEditAchievement}
          onDeleteAchievement={handleDeleteAchievement}
          onEditSection={() => handleEditProfile('achievements')}
        />
      )}

      {/* Certificates Section */}
      {currentRoleConfig.sections.includes('certificates') && (
        <CertificatesSection
          certificates={profileState.certificates}
          isOwner={true} // TODO: Determine ownership based on current user vs profile user
          onAddCertificate={handleAddCertificate}
          onEditCertificate={handleEditCertificate}
          onDeleteCertificate={handleDeleteCertificate}
          onEditSection={() => handleEditProfile('certificates')}
        />
      )}

      {/* Role-specific sections */}
      <RoleSpecificSections
        currentRole={profileState.currentRole}
        personalDetails={profileState.personalDetails}
        isOwner={true} // TODO: Determine ownership based on current user vs profile user
        onEditProfile={handleEditProfile}
        onSaveOrganizationInfo={handleSaveOrganizationInfo}
        onAddAthlete={handleAddAthlete}
      />

      {currentRoleConfig.sections.includes('talentVideos') && (
        <section className="profile-section talent-videos-section" aria-labelledby="talent-videos-heading">
          <div className="section-header">
            <h2 id="talent-videos-heading" className="section-title">Talent Videos</h2>
          </div>
          <div className="section-placeholder">
            <p>Talent Videos section will be implemented in task 4</p>
          </div>
        </section>
      )}

      {currentRoleConfig.sections.includes('posts') && (
        <section className="profile-section posts-section" aria-labelledby="posts-heading">
          <div className="section-header">
            <h2 id="posts-heading" className="section-title">Posts</h2>
          </div>
          <div className="section-placeholder">
            <p>Posts section will be implemented in task 5</p>
          </div>
        </section>
      )}

      {/* Footer Navigation */}
      <FooterNav />

      {/* Achievement Modal */}
      <AchievementModal
        isOpen={isAchievementModalOpen}
        achievement={editingAchievement}
        onClose={handleCloseAchievementModal}
        onSave={handleSaveAchievement}
      />

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateModalOpen}
        certificate={editingCertificate}
        onClose={handleCloseCertificateModal}
        onSave={handleSaveCertificate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title={`Delete ${deleteType === 'achievement' ? 'Achievement' : 'Certificate'}`}
        message={`Are you sure you want to delete this ${deleteType}?`}
        itemName={getDeletingItemName()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={handleCloseEditProfile}
        onSave={handleSaveProfile}
        currentRole={profileState.currentRole}
        personalDetails={profileState.personalDetails}
        physicalAttributes={profileState.physicalAttributes}
        achievements={profileState.achievements}
        certificates={profileState.certificates}
        talentVideos={profileState.talentVideos}
        posts={profileState.posts}
        initialTab={editModalInitialTab}
      />

      {/* Personal Details Modal */}
      <PersonalDetailsModal
        isOpen={isPersonalDetailsModalOpen}
        personalDetails={profileState.personalDetails}
        currentRole={profileState.currentRole}
        onSave={handleSavePersonalDetails}
        onClose={() => setIsPersonalDetailsModalOpen(false)}
      />

      {/* Physical Attributes Modal */}
      <PhysicalAttributesModal
        isOpen={isPhysicalAttributesModalOpen}
        physicalAttributes={profileState.physicalAttributes}
        onSave={handleSavePhysicalAttributes}
        onClose={() => setIsPhysicalAttributesModalOpen(false)}
      />

      {/* Track Best Modal */}
      <TrackBestModal
        isOpen={isTrackBestModalOpen}
        trackBest={profileState.trackBest}
        sport={profileState.personalDetails.sport || 'basketball'}
        onSave={handleSaveTrackBest}
        onClose={() => setIsTrackBestModalOpen(false)}
      />

      {/* Achievements Section Modal */}
      <AchievementsSectionModal
        isOpen={isAchievementsSectionModalOpen}
        achievements={profileState.achievements}
        onSave={handleSaveAchievements}
        onClose={() => setIsAchievementsSectionModalOpen(false)}
      />

      {/* Certificates Section Modal */}
      <CertificatesSectionModal
        isOpen={isCertificatesSectionModalOpen}
        certificates={profileState.certificates}
        onSave={handleSaveCertificates}
        onClose={() => setIsCertificatesSectionModalOpen(false)}
      />
    </main>
  );
};

export default ProfileEnhanced;