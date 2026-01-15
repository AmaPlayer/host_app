import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Save, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { UserRole, PersonalDetails, roleConfigurations } from '../types/ProfileTypes';
import '../styles/SectionModal.css';

export interface PersonalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personalDetails: PersonalDetails) => void;
  currentRole: UserRole;
  personalDetails: PersonalDetails;
}

interface FormErrors {
  [key: string]: string;
}

const PersonalDetailsModal: React.FC<PersonalDetailsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentRole,
  personalDetails
}) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<PersonalDetails>(personalDetails);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  const { t } = useLanguage();

  // Update form data when props change
  useEffect(() => {
    setFormData(personalDetails);
    setHasUnsavedChanges(false);
  }, [personalDetails, isOpen]);

  const handleFieldChange = (field: keyof PersonalDetails, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const roleConfig = roleConfigurations[currentRole];

    // Validate required fields based on role
    roleConfig.editableFields.forEach(field => {
      const value = formData[field as keyof PersonalDetails];

      if (field === 'username' && (!value || String(value).trim() === '')) {
        newErrors[field] = t('usernameRequired');
      }

      if ((field === 'email' || field === 'contactEmail') && value && String(value).trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          newErrors[field] = t('validEmailRequired');
        }
      }

      if (field === 'yearsExperience' && value && Number(value) < 0) {
        newErrors[field] = t('yearsExperiencePositive');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to check if username is unique
  const checkUsernameUnique = async (username: string): Promise<boolean> => {
    try {
      setIsCheckingName(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      // If no results, username is unique
      if (querySnapshot.empty) {
        return true;
      }

      // If results exist, check if it's the current user's own username
      for (const docSnap of querySnapshot.docs) {
        if (docSnap.id !== currentUser?.uid) {
          return false; // Username is taken by another user
        }
      }

      return true; // It's the user's own current username
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return false;
    } finally {
      setIsCheckingName(false);
    }
  };

  // Function to validate that name and username are different
  const validateNameAndUsername = useCallback((): boolean => {
    if (formData.name && formData.username &&
      formData.name.toLowerCase().trim() === formData.username.toLowerCase().trim()) {
      setErrors(prev => ({
        ...prev,
        name: t('nameUsernameDifferent')
      }));
      return false;
    }
    return true;
  }, [formData.name, formData.username]);

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Validate that name and username are different
    if (!validateNameAndUsername()) {
      return;
    }

    // Check if username has changed
    const newUsername = formData.username?.trim().toLowerCase() || '';
    const currentUsername = personalDetails.username?.trim().toLowerCase() || '';
    const usernameHasChanged = newUsername !== currentUsername;

    // If username has changed, check if it's unique
    if (usernameHasChanged && newUsername) {
      const isUnique = await checkUsernameUnique(newUsername);
      if (!isUnique) {
        setErrors(prev => ({
          ...prev,
          username: t('usernameTaken')
        }));
        return;
      }
    }

    onSave(formData);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm(t('unsavedChangesWarning'))) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getFieldLabel = (field: string): string => {
    // Map internal field names to translation keys
    // We can use a convention or map them explicitly
    const labelKeyMap: Record<string, string> = {
      name: 'nameLabel',
      username: 'usernameLabel',
      dateOfBirth: 'dateOfBirthLabel',
      gender: 'genderLabel',
      mobile: 'mobileLabel',
      email: 'emailLabel',
      city: 'cityLabel',
      district: 'districtLabel', // Ensure this exists in translations or defaults
      state: 'stateLabel',
      country: 'countryLabel',
      playerType: 'playerType', // Using general keys as labels if specific label keys don't exist
      sport: 'sport',
      position: 'position',
      organizationName: 'organizationName',
      organizationType: 'organizationType',
      location: 'location',
      contactEmail: 'contactEmail',
      website: 'website',
      relationship: 'relationship',
      specializations: 'specializations',
      yearsExperience: 'yearsExperience',
      coachingLevel: 'coachingLevel'
    };

    // Try to find a translation key
    const key = labelKeyMap[field];
    if (key) {
      // Check if it's a specific label key (like nameLabel) or just a general key
      const translation = t(key as any);
      // If t returns the key itself, it means translation is missing, fallback to capitalized field
      if (translation !== key) return translation;
    }

    return field.charAt(0).toUpperCase() + field.slice(1);
  };

  const getFieldPlaceholder = (field: string): string => {
    // Return translated placeholders
    switch (field) {
      case 'name': return t('enterYourName');
      case 'username': return t('enterYourUsername');
      case 'dateOfBirth': return 'YYYY-MM-DD'; // Universal format
      case 'mobile': return t('mobileLabel'); // Using label as placeholder for simplicity if no specific key
      case 'email': return t('enterDisplayName'); // Reusing existing or need new key
      case 'city': return t('cityLabel');
      case 'district': return t('district');
      case 'state': return t('stateLabel');
      case 'country': return t('countryLabel');
      case 'sport': return t('sport');
      case 'position': return t('position');
      case 'organizationName': return t('organizationName');
      case 'location': return t('location');
      case 'contactEmail': return t('contactEmail');
      case 'website': return t('website');
      case 'specializations': return t('specializations');
      default: return t('enterDisplayName').replace('display name', getFieldLabel(field).toLowerCase());
    }
  };

  const renderFormInput = (field: string, value: any, error: string) => {
    const commonProps = {
      id: field,
      className: `form-input ${error ? 'error' : ''}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let newValue: string | number | string[] = e.target.value;

        if (field === 'yearsExperience') {
          newValue = e.target.value ? parseInt(e.target.value) : '';
        } else if (field === 'specializations') {
          newValue = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        }

        handleFieldChange(field as keyof PersonalDetails, newValue);
      }
    };

    switch (field) {
      case 'gender':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">{t('selectGender')}</option>
            <option value="Male">{t('male')}</option>
            <option value="Female">{t('female')}</option>
            <option value="Other">{t('other')}</option>
            <option value="Prefer not to say">{t('preferNotToSay')}</option>
          </select>
        );

      case 'playerType':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">{t('selectPlayerType')}</option>
            <option value="Amateur">{t('amateur')}</option>
            <option value="Professional">{t('professional')}</option>
            <option value="Student Athlete">{t('studentAthlete')}</option>
          </select>
        );

      case 'organizationType':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">{t('selectOrganizationType')}</option>
            <option value="Training Facility">{t('trainingFacility')}</option>
            <option value="Sports Club">{t('sportsClub')}</option>
            <option value="Academy">{t('academy')}</option>
            <option value="School">{t('school')}</option>
            <option value="Professional Team">{t('professionalTeam')}</option>
            <option value="Other">{t('other')}</option>
          </select>
        );

      case 'relationship':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">{t('selectRelationship')}</option>
            <option value="Father">{t('father')}</option>
            <option value="Mother">{t('mother')}</option>
            <option value="Guardian">{t('guardian')}</option>
            <option value="Other">{t('other')}</option>
          </select>
        );

      case 'coachingLevel':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">{t('selectCoachingLevel')}</option>
            <option value="Level 1 Certified">{t('level1')}</option>
            <option value="Level 2 Certified">{t('level2')}</option>
            <option value="Level 3 Certified">{t('level3')}</option>
            <option value="Master Level">{t('masterLevel')}</option>
            <option value="Professional">{t('professional')}</option>
          </select>
        );

      case 'yearsExperience':
        return (
          <input
            {...commonProps}
            type="number"
            min="0"
            max="50"
            placeholder="Enter years of experience"
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
      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
            placeholder="email@example.com"
            value={String(value || '')}
          />
        );

      case 'dateOfBirth':
        return (
          <input
            {...commonProps}
            type="date"
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

  if (!isOpen) return null;

  const roleConfig = roleConfigurations[currentRole];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="section-modal personal-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <User size={20} />
            <h2 className="modal-title">{t('editPersonalDetails')}</h2>
          </div>
          <button
            className="modal-close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <div className="form-grid">
              {roleConfig.editableFields.map(field => {
                const value = formData[field as keyof PersonalDetails];
                const error = errors[field];

                return (
                  <div key={field} className="form-field">
                    <label htmlFor={field} className="form-label">
                      {getFieldLabel(field)}
                      {field === 'username' && <span className="required">*</span>}
                    </label>

                    {renderFormInput(field, value, error)}

                    {error && <span className="form-error">{error}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            {hasUnsavedChanges && (
              <span className="unsaved-indicator">
                {t('unsavedChanges')}
              </span>
            )}
          </div>
          <div className="modal-footer-right">
            <button
              className="modal-button secondary"
              onClick={handleClose}
            >
              {t('cancel')}
            </button>
            <button
              className="modal-button primary"
              onClick={handleSave}
            >
              <Save size={16} />
              {t('saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsModal;