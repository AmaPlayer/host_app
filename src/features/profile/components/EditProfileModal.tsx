import React, { useState, useEffect, lazy, Suspense } from 'react';
import { X, Save, User, Award, FileText, Video, MessageSquare, Building, Users, UserCheck, Plus, Edit3, Activity } from 'lucide-react';
import { UserRole, PersonalDetails, PhysicalAttributes, Achievement, Certificate, Post, roleConfigurations } from '../types/ProfileTypes';
import { TalentVideo } from '../types/TalentVideoTypes';
import RealTimePreview from './RealTimePreview';
import '../styles/EditProfileModal.css';

// Lazy load modal components for better performance
const AchievementModal = lazy(() => import('./AchievementModal'));
const CertificateModal = lazy(() => import('./CertificateModal'));
const VideoManagementModal = lazy(() => import('./VideoManagementModal'));
const PostManagementModal = lazy(() => import('./PostManagementModal'));

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditProfileData) => void;
  currentRole: UserRole;
  personalDetails: PersonalDetails;
  physicalAttributes: PhysicalAttributes;
  achievements: Achievement[];
  certificates: Certificate[];
  talentVideos: TalentVideo[];
  posts: Post[];
  initialTab?: TabType;
}

export interface EditProfileData {
  personalDetails: PersonalDetails;
  physicalAttributes: PhysicalAttributes;
  achievements: Achievement[];
  certificates: Certificate[];
  talentVideos: TalentVideo[];
  posts: Post[];
}

type TabType = 'personal' | 'physicalAttributes' | 'trackBest' | 'achievements' | 'certificates' | 'videos' | 'posts' | 'organization' | 'coaching' | 'parent';

interface FormErrors {
  [key: string]: string;
}

interface SectionModalState {
  type: 'achievement' | 'certificate' | 'video' | 'post' | null;
  isOpen: boolean;
  editingItem: Achievement | Certificate | TalentVideo | Post | null;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentRole,
  personalDetails,
  physicalAttributes,
  achievements,
  certificates,
  talentVideos,
  posts,
  initialTab = 'personal'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [formData, setFormData] = useState<EditProfileData>({
    personalDetails,
    physicalAttributes,
    achievements,
    certificates,
    talentVideos,
    posts
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRealTimePreview, setShowRealTimePreview] = useState(true);
  const [sectionModal, setSectionModal] = useState<SectionModalState>({
    type: null,
    isOpen: false,
    editingItem: null
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      personalDetails,
      physicalAttributes,
      achievements,
      certificates,
      talentVideos,
      posts
    });
  }, [personalDetails, physicalAttributes, achievements, certificates, talentVideos, posts]);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Auto-save functionality with improved timing
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    if (hasUnsavedChanges) {
      const timeout = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity (reduced from 3)
      
      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [hasUnsavedChanges, formData]);

  const handleAutoSave = () => {
// Save to localStorage as draft with enhanced data
    try {
      const draftData = {
        formData,
        timestamp: Date.now(),
        role: currentRole,
        activeTab,
        version: '1.0' // Version for future compatibility
      };
      
      localStorage.setItem('profileEditDraft', JSON.stringify(draftData));
// Show brief success indicator (could be a toast in real app)
      const saveIndicator = document.getElementById('auto-save-indicator');
      if (saveIndicator) {
        saveIndicator.textContent = 'Draft saved';
        saveIndicator.style.opacity = '1';
        setTimeout(() => {
          saveIndicator.style.opacity = '0';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Show error indicator
      const saveIndicator = document.getElementById('auto-save-indicator');
      if (saveIndicator) {
        saveIndicator.textContent = 'Save failed';
        saveIndicator.style.opacity = '1';
        saveIndicator.style.color = '#ef4444';
        setTimeout(() => {
          saveIndicator.style.opacity = '0';
          saveIndicator.style.color = '#10b981';
        }, 3000);
      }
    }
    
    setHasUnsavedChanges(false);
  };

  // Load draft on component mount with enhanced loading
  useEffect(() => {
    if (isOpen) {
      try {
        const draft = localStorage.getItem('profileEditDraft');
        if (draft) {
          const { formData: draftData, timestamp, role, activeTab: draftTab, version } = JSON.parse(draft);
          
          // Only load draft if it's for the same role and less than 24 hours old
          const isRecentDraft = Date.now() - timestamp < 24 * 60 * 60 * 1000;
          const isSameRole = role === currentRole;
          const isCompatibleVersion = !version || version === '1.0'; // Handle version compatibility
          
          if (isRecentDraft && isSameRole && isCompatibleVersion) {
            setFormData(draftData);
            setHasUnsavedChanges(true);
            setLastSaved(new Date(timestamp));
            
            // Restore the active tab if it was saved
            if (draftTab && draftTab !== initialTab) {
              setActiveTab(draftTab);
            }

            // Show draft loaded indicator
            const saveIndicator = document.getElementById('auto-save-indicator');
            if (saveIndicator) {
              saveIndicator.textContent = 'Draft loaded';
              saveIndicator.style.opacity = '1';
              setTimeout(() => {
                saveIndicator.style.opacity = '0';
              }, 3000);
            }
          } else {
            // Clear old or incompatible drafts
            localStorage.removeItem('profileEditDraft');
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
        // Clear corrupted draft
        localStorage.removeItem('profileEditDraft');
      }
    }
  }, [isOpen, currentRole, initialTab]);

  const handlePersonalDetailsChange = (field: keyof PersonalDetails, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePhysicalAttributesChange = (field: keyof PhysicalAttributes, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      physicalAttributes: {
        ...prev.physicalAttributes,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validatePersonalDetails = (): boolean => {
    const newErrors: FormErrors = {};
    const roleConfig = roleConfigurations[currentRole];
    
    // Validate required fields based on role
    roleConfig.editableFields.forEach(field => {
      const value = formData.personalDetails[field as keyof PersonalDetails];
      
      if (field === 'name' && (!value || String(value).trim() === '')) {
        newErrors[field] = 'Name is required';
      }
      if (field === 'username' && (!value || String(value).trim() === '')) {
        newErrors[field] = 'Username is required';
      }
      
      if (field === 'contactEmail' && value && String(value).trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          newErrors[field] = 'Please enter a valid email address';
        }
      }
      
      if (field === 'age' && value && (Number(value) < 1 || Number(value) > 120)) {
        newErrors[field] = 'Please enter a valid age between 1 and 120';
      }
      
      if (field === 'yearsExperience' && value && Number(value) < 0) {
        newErrors[field] = 'Years of experience cannot be negative';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validatePersonalDetails()) {
      setActiveTab('personal');
      return;
    }
    
    onSave(formData);
    setHasUnsavedChanges(false);
    
    // Clear draft after successful save
    try {
      localStorage.removeItem('profileEditDraft');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setHasUnsavedChanges(false);
    setShowConfirmClose(false);
    
    // Clear draft when discarding changes
    try {
      localStorage.removeItem('profileEditDraft');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
    
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  // Section management handlers
  const handleOpenSectionModal = (type: 'achievement' | 'certificate' | 'video' | 'post', editingItem?: any) => {
    setSectionModal({
      type,
      isOpen: true,
      editingItem: editingItem || null
    });
  };

  const handleCloseSectionModal = () => {
    setSectionModal({
      type: null,
      isOpen: false,
      editingItem: null
    });
  };

  const handleSaveAchievement = (achievementData: Omit<Achievement, 'id'>) => {
    const newAchievement: Achievement = {
      ...achievementData,
      id: sectionModal.editingItem?.id || Date.now().toString()
    };

    if (sectionModal.editingItem) {
      // Edit existing achievement
      setFormData(prev => ({
        ...prev,
        achievements: prev.achievements.map(a => 
          a.id === sectionModal.editingItem?.id ? newAchievement : a
        )
      }));
    } else {
      // Add new achievement
      setFormData(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement]
      }));
    }
    
    setHasUnsavedChanges(true);
    handleCloseSectionModal();
  };

  const handleDeleteAchievement = (achievementId: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(a => a.id !== achievementId)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveCertificate = (certificateData: Omit<Certificate, 'id'>) => {
    const newCertificate: Certificate = {
      ...certificateData,
      id: sectionModal.editingItem?.id || Date.now().toString()
    };

    if (sectionModal.editingItem) {
      // Edit existing certificate
      setFormData(prev => ({
        ...prev,
        certificates: prev.certificates.map(c => 
          c.id === sectionModal.editingItem?.id ? newCertificate : c
        )
      }));
    } else {
      // Add new certificate
      setFormData(prev => ({
        ...prev,
        certificates: [...prev.certificates, newCertificate]
      }));
    }
    
    setHasUnsavedChanges(true);
    handleCloseSectionModal();
  };

  const handleDeleteCertificate = (certificateId: string) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter(c => c.id !== certificateId)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveVideo = (videoData: any) => {
    const editingVideo = sectionModal.editingItem as TalentVideo;
    const newVideo: TalentVideo = {
      ...videoData,
      id: editingVideo?.id || Date.now().toString(),
      uploadDate: editingVideo?.uploadDate || new Date(),
      viewCount: editingVideo?.viewCount || 0,
      duration: editingVideo?.duration || 0,
      videoUrl: editingVideo?.videoUrl || '',
      thumbnailUrl: editingVideo?.thumbnailUrl || ''
    };

    if (sectionModal.editingItem) {
      // Edit existing video
      setFormData(prev => ({
        ...prev,
        talentVideos: prev.talentVideos.map(v => 
          v.id === sectionModal.editingItem?.id ? newVideo : v
        )
      }));
    } else {
      // Add new video
      setFormData(prev => ({
        ...prev,
        talentVideos: [...prev.talentVideos, newVideo]
      }));
    }
    
    setHasUnsavedChanges(true);
    handleCloseSectionModal();
  };

  const handleDeleteVideo = (videoId: string) => {
    setFormData(prev => ({
      ...prev,
      talentVideos: prev.talentVideos.filter(v => v.id !== videoId)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSavePost = (postData: Omit<Post, 'id' | 'createdDate' | 'likes' | 'comments'>) => {
    const editingPost = sectionModal.editingItem as Post;
    const newPost: Post = {
      ...postData,
      id: editingPost?.id || Date.now().toString(),
      createdDate: editingPost?.createdDate || new Date(),
      likes: editingPost?.likes || 0,
      comments: editingPost?.comments || 0
    };

    if (sectionModal.editingItem) {
      // Edit existing post
      setFormData(prev => ({
        ...prev,
        posts: prev.posts.map(p => 
          p.id === sectionModal.editingItem?.id ? newPost : p
        )
      }));
    } else {
      // Add new post
      setFormData(prev => ({
        ...prev,
        posts: [...prev.posts, newPost]
      }));
    }
    
    setHasUnsavedChanges(true);
    handleCloseSectionModal();
  };

  const handleDeletePost = (postId: string) => {
    setFormData(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.id !== postId)
    }));
    setHasUnsavedChanges(true);
  };

  const getTabsForRole = (): { id: TabType; label: string; icon: React.ReactNode }[] => {
    const roleConfig = roleConfigurations[currentRole];
    const tabs = [
      { id: 'personal' as TabType, label: 'Personal', icon: <User size={16} /> }
    ];

    if (roleConfig.sections.includes('physicalAttributes')) {
      tabs.push({ id: 'physicalAttributes' as TabType, label: 'Physical', icon: <Activity size={16} /> });
    }

    if (roleConfig.sections.includes('achievements')) {
      tabs.push({ id: 'achievements' as TabType, label: 'Achievements', icon: <Award size={16} /> });
    }
    
    if (roleConfig.sections.includes('certificates')) {
      tabs.push({ id: 'certificates' as TabType, label: 'Certificates', icon: <FileText size={16} /> });
    }
    
    if (roleConfig.sections.includes('talentVideos')) {
      tabs.push({ id: 'videos' as TabType, label: 'Videos', icon: <Video size={16} /> });
    }
    
    if (roleConfig.sections.includes('organizationInfo')) {
      tabs.push({ id: 'organization' as TabType, label: 'Organization', icon: <Building size={16} /> });
    }
    
    if (roleConfig.sections.includes('connectedAthletes')) {
      tabs.push({ id: 'parent' as TabType, label: 'Athletes', icon: <Users size={16} /> });
    }
    
    if (roleConfig.sections.includes('coachingInfo')) {
      tabs.push({ id: 'coaching' as TabType, label: 'Coaching', icon: <UserCheck size={16} /> });
    }
    
    if (roleConfig.sections.includes('posts')) {
      tabs.push({ id: 'posts' as TabType, label: 'Posts', icon: <MessageSquare size={16} /> });
    }

    return tabs;
  };

  const renderPersonalDetailsForm = () => {
    const roleConfig = roleConfigurations[currentRole];
    
    return (
      <div className="form-section">
        <div className="section-header-with-preview">
          <h3 className="form-section-title">Personal Information</h3>
          <button
            type="button"
            className={`preview-toggle ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        
        {/* Photo Upload Section */}
        <div className="photo-upload-section">
          <h4 className="photo-section-title">Profile Photos</h4>
          <div className="photo-upload-grid">
            <div className="photo-upload-item">
              <label className="photo-upload-label">Profile Picture</label>
              <div className="photo-upload-placeholder">
                <span>Click to upload profile picture</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} />
              </div>
            </div>
            <div className="photo-upload-item">
              <label className="photo-upload-label">Cover Photo</label>
              <div className="photo-upload-placeholder cover">
                <span>Click to upload cover photo</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} />
              </div>
            </div>
          </div>
        </div>
        
        {showPreview && (
          <div className="preview-section">
            <h4 className="preview-title">Live Preview</h4>
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-avatar">
                  <span className="avatar-icon">👤</span>
                </div>
                <div className="preview-info">
                  <h3 className="preview-name">{formData.personalDetails.name || 'Your Name'}</h3>
                  <span className="preview-role">{roleConfigurations[currentRole].displayName}</span>
                </div>
              </div>
              <div className="preview-details">
                {roleConfig.editableFields.map(field => {
                  const value = formData.personalDetails[field as keyof PersonalDetails];
                  const displayValue = getPreviewValue(field, value);
                  
                  // Skip username as it's shown in header
                  if (field === 'username') return null;
                  
                  return (
                    <div key={field} className="preview-field">
                      <span className="preview-label">{getFieldLabel(field).toUpperCase()}</span>
                      <span className="preview-value">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
              <div className="preview-stats">
                <div className="preview-stat">
                  <span className="stat-number">{formData.achievements.length}</span>
                  <span className="stat-label">Achievements</span>
                </div>
                <div className="preview-stat">
                  <span className="stat-number">{formData.certificates.length}</span>
                  <span className="stat-label">Certificates</span>
                </div>
                <div className="preview-stat">
                  <span className="stat-number">{formData.posts.length}</span>
                  <span className="stat-label">Posts</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="form-grid">
          {roleConfig.editableFields.map(field => {
            const value = formData.personalDetails[field as keyof PersonalDetails];
            const error = errors[field];
            
            return (
              <div key={field} className="form-field">
                                    <label htmlFor={field} className="form-label">
                                      {getFieldLabel(field)}
                                      {(field === 'name' || field === 'username') && <span className="required">*</span>}
                                    </label>                
                {renderFormInput(field, value, error)}
                
                {error && <span className="form-error">{error}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPhysicalAttributesForm = () => {
    const physicalFields: (keyof PhysicalAttributes)[] = ['height', 'weight', 'dominantSide', 'personalBest', 'seasonBest', 'coachName', 'coachContact', 'trainingAcademy', 'schoolName', 'clubName'];

    return (
      <div className="form-section">
        <h3 className="form-section-title">Physical Attributes</h3>
        <p className="form-section-description">
          Add your physical measurements, performance metrics, and training information.
        </p>

        <div className="form-grid">
          {/* Height */}
          <div className="form-field">
            <label htmlFor="height" className="form-label">Height</label>
            <input
              id="height"
              type="text"
              className="form-input"
              placeholder="e.g., 5'10&quot; or 178cm"
              value={formData.physicalAttributes.height || ''}
              onChange={(e) => handlePhysicalAttributesChange('height', e.target.value)}
            />
          </div>

          {/* Weight */}
          <div className="form-field">
            <label htmlFor="weight" className="form-label">Weight</label>
            <input
              id="weight"
              type="text"
              className="form-input"
              placeholder="e.g., 150lbs or 68kg"
              value={formData.physicalAttributes.weight || ''}
              onChange={(e) => handlePhysicalAttributesChange('weight', e.target.value)}
            />
          </div>

          {/* Hand Preference */}
          <div className="form-field">
            <label htmlFor="dominantSide" className="form-label">Hand Preference</label>
            <select
              id="dominantSide"
              className="form-input"
              value={formData.physicalAttributes.dominantSide || ''}
              onChange={(e) => handlePhysicalAttributesChange('dominantSide', e.target.value)}
            >
              <option value="">Select hand preference</option>
              <option value="Left">Left-Handed</option>
              <option value="Right">Right-Handed</option>
            </select>
          </div>

          {/* Personal Best */}
          <div className="form-field">
            <label htmlFor="personalBest" className="form-label">Personal Best</label>
            <input
              id="personalBest"
              type="text"
              className="form-input"
              placeholder="e.g., 100m in 10.5s"
              value={formData.physicalAttributes.personalBest || ''}
              onChange={(e) => handlePhysicalAttributesChange('personalBest', e.target.value)}
            />
          </div>

          {/* Season Best */}
          <div className="form-field">
            <label htmlFor="seasonBest" className="form-label">Season Best</label>
            <input
              id="seasonBest"
              type="text"
              className="form-input"
              placeholder="e.g., 200m in 21.2s"
              value={formData.physicalAttributes.seasonBest || ''}
              onChange={(e) => handlePhysicalAttributesChange('seasonBest', e.target.value)}
            />
          </div>
        </div>

        <h4 className="form-subsection-title">Training Information</h4>
        <div className="form-grid">
          {/* Coach Name */}
          <div className="form-field">
            <label htmlFor="coachName" className="form-label">Coach Name</label>
            <input
              id="coachName"
              type="text"
              className="form-input"
              placeholder="Enter coach's name"
              value={formData.physicalAttributes.coachName || ''}
              onChange={(e) => handlePhysicalAttributesChange('coachName', e.target.value)}
            />
          </div>

          {/* Coach Contact */}
          <div className="form-field">
            <label htmlFor="coachContact" className="form-label">Coach Contact</label>
            <input
              id="coachContact"
              type="text"
              className="form-input"
              placeholder="Phone or email"
              value={formData.physicalAttributes.coachContact || ''}
              onChange={(e) => handlePhysicalAttributesChange('coachContact', e.target.value)}
            />
          </div>

          {/* Training Academy */}
          <div className="form-field">
            <label htmlFor="trainingAcademy" className="form-label">Training Academy</label>
            <input
              id="trainingAcademy"
              type="text"
              className="form-input"
              placeholder="Enter academy name"
              value={formData.physicalAttributes.trainingAcademy || ''}
              onChange={(e) => handlePhysicalAttributesChange('trainingAcademy', e.target.value)}
            />
          </div>

          {/* School Name */}
          <div className="form-field">
            <label htmlFor="schoolName" className="form-label">School</label>
            <input
              id="schoolName"
              type="text"
              className="form-input"
              placeholder="Enter school name"
              value={formData.physicalAttributes.schoolName || ''}
              onChange={(e) => handlePhysicalAttributesChange('schoolName', e.target.value)}
            />
          </div>

          {/* Club Name */}
          <div className="form-field">
            <label htmlFor="clubName" className="form-label">Club</label>
            <input
              id="clubName"
              type="text"
              className="form-input"
              placeholder="Enter club name"
              value={formData.physicalAttributes.clubName || ''}
              onChange={(e) => handlePhysicalAttributesChange('clubName', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  const getPreviewValue = (field: string, value: any): string => {
    if (value === undefined || value === null || value === '') {
      return 'Not specified';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Not specified';
    }
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Name',
      username: 'Username',
      age: 'Age',
      height: 'Height',
      weight: 'Weight',
      sex: 'Sex',
      sport: 'Sport',
      position: 'Position',
      organizationName: 'Organization Name',
      organizationType: 'Organization Type',
      location: 'Location',
      contactEmail: 'Contact Email',
      website: 'Website',
      relationship: 'Relationship',
      specializations: 'Specializations',
      yearsExperience: 'Years of Experience',
      coachingLevel: 'Coaching Level'
    };
    
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

  const getFieldPlaceholder = (field: string): string => {
    const placeholders: Record<string, string> = {
      name: 'Enter your full name',
      age: 'Enter your age',
      height: 'Enter height (e.g., 5\'10" or 178cm)',
      weight: 'Enter weight (e.g., 150lbs or 68kg)',
      sport: 'Enter your sport (e.g., Basketball, Soccer)',
      position: 'Enter your position (e.g., Point Guard, Striker)',
      organizationName: 'Enter organization name',
      location: 'Enter city, state/country',
      contactEmail: 'Enter email address',
      website: 'Enter website URL',
      specializations: 'Enter specializations separated by commas'
    };
    
    return placeholders[field] || `Enter ${getFieldLabel(field).toLowerCase()}`;
  };

  const renderFormInput = (field: string, value: any, error: string) => {
    const commonProps = {
      id: field,
      className: `form-input ${error ? 'error' : ''}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let newValue: string | number | string[] = e.target.value;
        
        if (field === 'age' || field === 'yearsExperience') {
          newValue = e.target.value ? parseInt(e.target.value) : '';
        } else if (field === 'specializations') {
          newValue = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        }
        
        handlePersonalDetailsChange(field as keyof PersonalDetails, newValue);
      }
    };

    switch (field) {
      case 'sex':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">Select your sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        );
      
      case 'organizationType':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">Select organization type</option>
            <option value="Training Facility">Training Facility</option>
            <option value="Sports Club">Sports Club</option>
            <option value="Academy">Academy</option>
            <option value="School">School</option>
            <option value="Professional Team">Professional Team</option>
            <option value="Other">Other</option>
          </select>
        );
      
      case 'relationship':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">Select relationship</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
        );
      
      case 'coachingLevel':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">Select coaching level</option>
            <option value="Level 1 Certified">Level 1 Certified</option>
            <option value="Level 2 Certified">Level 2 Certified</option>
            <option value="Level 3 Certified">Level 3 Certified</option>
            <option value="Master Level">Master Level</option>
            <option value="Professional">Professional</option>
          </select>
        );
      
      case 'age':
      case 'yearsExperience':
        return (
          <input
            {...commonProps}
            type="number"
            min="0"
            max={field === 'age' ? '120' : '50'}
            placeholder={field === 'age' ? 'Enter your age (1-120)' : 'Enter years of experience'}
            value={value || ''}
          />
        );
      
      case 'specializations':
        return (
          <textarea
            {...commonProps}
            placeholder="Enter specializations separated by commas"
            value={Array.isArray(value) ? value.join(', ') : String(value || '')}
            rows={3}
          />
        );
      
      case 'website':
        return (
          <input
            {...commonProps}
            type="url"
            placeholder="https://example.com"
            value={String(value || '')}
          />
        );
      
      case 'contactEmail':
        return (
          <input
            {...commonProps}
            type="email"
            placeholder="email@example.com"
            value={String(value || '')}
          />
        );
      
      default:
        return (
          <input
            {...commonProps}
            type="text"
            placeholder={getFieldPlaceholder(field)}
            value={String(value || '')}
          />
        );
    }
  };

  const renderAchievementsSection = () => (
    <div className="form-section">
      <div className="section-header-with-actions">
        <h3 className="form-section-title">Achievements</h3>
        <button
          type="button"
          className="section-add-button"
          onClick={() => handleOpenSectionModal('achievement')}
        >
          <Plus size={16} />
          Add Achievement
        </button>
      </div>
      
      {formData.achievements.length === 0 ? (
        <div className="empty-section-state">
          <Award size={32} />
          <p>No achievements added yet</p>
          <button
            type="button"
            className="empty-state-button"
            onClick={() => handleOpenSectionModal('achievement')}
          >
            Add Your First Achievement
          </button>
        </div>
      ) : (
        <div className="section-items-list">
          {formData.achievements.map((achievement) => (
            <div key={achievement.id} className="section-item">
              <div className="item-content">
                <h4 className="item-title">{achievement.title}</h4>
                <p className="item-subtitle">{achievement.category} • {new Date(achievement.dateEarned).toLocaleDateString()}</p>
                {achievement.description && (
                  <p className="item-description">{achievement.description}</p>
                )}
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  className="item-action-button"
                  onClick={() => handleOpenSectionModal('achievement', achievement)}
                  aria-label={`Edit ${achievement.title}`}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="item-action-button delete"
                  onClick={() => handleDeleteAchievement(achievement.id)}
                  aria-label={`Delete ${achievement.title}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCertificatesSection = () => (
    <div className="form-section">
      <div className="section-header-with-actions">
        <h3 className="form-section-title">Certificates</h3>
        <button
          type="button"
          className="section-add-button"
          onClick={() => handleOpenSectionModal('certificate')}
        >
          <Plus size={16} />
          Add Certificate
        </button>
      </div>
      
      {formData.certificates.length === 0 ? (
        <div className="empty-section-state">
          <FileText size={32} />
          <p>No certificates added yet</p>
          <button
            type="button"
            className="empty-state-button"
            onClick={() => handleOpenSectionModal('certificate')}
          >
            Add Your First Certificate
          </button>
        </div>
      ) : (
        <div className="section-items-list">
          {formData.certificates.map((certificate) => (
            <div key={certificate.id} className="section-item">
              <div className="item-content">
                <h4 className="item-title">{certificate.name}</h4>
                <p className="item-subtitle">{certificate.issuingOrganization} • {new Date(certificate.dateIssued).toLocaleDateString()}</p>
                {certificate.expirationDate && (
                  <p className="item-description">
                    Expires: {new Date(certificate.expirationDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  className="item-action-button"
                  onClick={() => handleOpenSectionModal('certificate', certificate)}
                  aria-label={`Edit ${certificate.name}`}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="item-action-button delete"
                  onClick={() => handleDeleteCertificate(certificate.id)}
                  aria-label={`Delete ${certificate.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVideosSection = () => (
    <div className="form-section">
      <div className="section-header-with-actions">
        <h3 className="form-section-title">Talent Videos</h3>
        <button
          type="button"
          className="section-add-button"
          onClick={() => handleOpenSectionModal('video')}
        >
          <Plus size={16} />
          Add Video
        </button>
      </div>
      
      {formData.talentVideos.length === 0 ? (
        <div className="empty-section-state">
          <Video size={32} />
          <p>No videos added yet</p>
          <button
            type="button"
            className="empty-state-button"
            onClick={() => handleOpenSectionModal('video')}
          >
            Add Your First Video
          </button>
        </div>
      ) : (
        <div className="section-items-list">
          {formData.talentVideos.map((video) => (
            <div key={video.id} className="section-item">
              <div className="item-content">
                <h4 className="item-title">{video.title}</h4>
                <p className="item-subtitle">{video.sport} • {video.skillCategory}</p>
                {video.description && (
                  <p className="item-description">{video.description}</p>
                )}
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  className="item-action-button"
                  onClick={() => handleOpenSectionModal('video', video)}
                  aria-label={`Edit ${video.title}`}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="item-action-button delete"
                  onClick={() => handleDeleteVideo(video.id)}
                  aria-label={`Delete ${video.title}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPostsSection = () => (
    <div className="form-section">
      <div className="section-header-with-actions">
        <h3 className="form-section-title">Posts</h3>
        <button
          type="button"
          className="section-add-button"
          onClick={() => handleOpenSectionModal('post')}
        >
          <Plus size={16} />
          Add Post
        </button>
      </div>
      
      {formData.posts.length === 0 ? (
        <div className="empty-section-state">
          <MessageSquare size={32} />
          <p>No posts added yet</p>
          <button
            type="button"
            className="empty-state-button"
            onClick={() => handleOpenSectionModal('post')}
          >
            Create Your First Post
          </button>
        </div>
      ) : (
        <div className="section-items-list">
          {formData.posts.map((post) => (
            <div key={post.id} className="section-item">
              <div className="item-content">
                <h4 className="item-title">{post.title || 'Untitled Post'}</h4>
                <p className="item-subtitle">{post.type} • {new Date(post.createdDate).toLocaleDateString()}</p>
                <p className="item-description">{post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  className="item-action-button"
                  onClick={() => handleOpenSectionModal('post', post)}
                  aria-label={`Edit ${post.title || 'post'}`}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="item-action-button delete"
                  onClick={() => handleDeletePost(post.id)}
                  aria-label={`Delete ${post.title || 'post'}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlaceholderSection = (sectionName: string) => (
    <div className="form-section">
      <h3 className="form-section-title">{sectionName}</h3>
      <div className="placeholder-content">
        <p>This section will be integrated with existing {sectionName.toLowerCase()} management functionality.</p>
        <p>Users will be able to add, edit, and organize their {sectionName.toLowerCase()} directly from this modal.</p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const availableTabs = getTabsForRole();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="edit-profile-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <h2 className="modal-title">Edit Profile</h2>
            <div 
              id="auto-save-indicator" 
              className="auto-save-indicator"
              style={{ opacity: 0, transition: 'opacity 0.3s ease', color: '#10b981', fontSize: '12px', marginLeft: '12px' }}
            >
              {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
            </div>
          </div>
          <button
            className="modal-close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-tabs">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="modal-body-container">
            <div className="modal-body">
              {activeTab === 'personal' && renderPersonalDetailsForm()}
              {activeTab === 'physicalAttributes' && renderPhysicalAttributesForm()}
              {activeTab === 'achievements' && renderAchievementsSection()}
              {activeTab === 'certificates' && renderCertificatesSection()}
              {activeTab === 'videos' && renderVideosSection()}
              {activeTab === 'organization' && renderPlaceholderSection('Organization Info')}
              {activeTab === 'coaching' && renderPlaceholderSection('Coaching Info')}
              {activeTab === 'parent' && renderPlaceholderSection('Connected Athletes')}
              {activeTab === 'posts' && renderPostsSection()}
            </div>
            
            <RealTimePreview
              currentRole={currentRole}
              personalDetails={formData.personalDetails}
              achievements={formData.achievements}
              certificates={formData.certificates}
              talentVideos={formData.talentVideos}
              posts={formData.posts}
              isVisible={showRealTimePreview}
              onToggleVisibility={setShowRealTimePreview}
              className="modal-preview"
            />
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            {hasUnsavedChanges && (
              <span className="unsaved-indicator">
                Unsaved changes (auto-saving...)
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="saved-indicator">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="modal-footer-right">
            <button
              className="modal-button secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="modal-button primary"
              onClick={handleSave}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog for unsaved changes */}
      {showConfirmClose && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes. Are you sure you want to close without saving?</p>
            <div className="confirmation-buttons">
              <button
                className="modal-button secondary"
                onClick={handleCancelClose}
              >
                Keep Editing
              </button>
              <button
                className="modal-button danger"
                onClick={handleConfirmClose}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Management Modals */}
      {sectionModal.isOpen && (
        <Suspense fallback={<div className="modal-loading">Loading...</div>}>
          {sectionModal.type === 'achievement' && (
            <AchievementModal
              isOpen={sectionModal.isOpen}
              achievement={sectionModal.editingItem as Achievement}
              onClose={handleCloseSectionModal}
              onSave={handleSaveAchievement}
            />
          )}
          {sectionModal.type === 'certificate' && (
            <CertificateModal
              isOpen={sectionModal.isOpen}
              certificate={sectionModal.editingItem as Certificate}
              onClose={handleCloseSectionModal}
              onSave={handleSaveCertificate}
            />
          )}
          {sectionModal.type === 'video' && (
            <VideoManagementModal
              isOpen={sectionModal.isOpen}
              editingVideo={sectionModal.editingItem as TalentVideo}
              onClose={handleCloseSectionModal}
              onSave={handleSaveVideo}
              isLoading={false}
            />
          )}
          {sectionModal.type === 'post' && (
            <PostManagementModal
              isOpen={sectionModal.isOpen}
              post={sectionModal.editingItem as Post}
              onClose={handleCloseSectionModal}
              onSave={handleSavePost}
            />
          )}
        </Suspense>
      )}
    </div>
  );
};

export default EditProfileModal;