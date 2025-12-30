import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, User } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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
        newErrors[field] = 'Username is required';
      }

      if ((field === 'email' || field === 'contactEmail') && value && String(value).trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          newErrors[field] = 'Please enter a valid email address';
        }
      }

      if (field === 'yearsExperience' && value && Number(value) < 0) {
        newErrors[field] = 'Years of experience cannot be negative';
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
        name: 'Display name should be different from username'
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
          username: 'This username is already taken by another user. Please choose a different username.'
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
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Full Name',
      username: 'Username',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      mobile: 'Mobile',
      email: 'Email',
      city: 'City',
      district: 'District',
      state: 'State',
      country: 'Country',
      playerType: 'Player Type',
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
      username: 'Enter your username',
      dateOfBirth: 'YYYY-MM-DD',
      mobile: 'Enter your mobile number',
      email: 'Enter your email address',
      city: 'Enter your city',
      district: 'Enter your district',
      state: 'Enter your state',
      country: 'Enter your country',
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
            <option value="">Select your gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        );
      
      case 'playerType':
        return (
          <select {...commonProps} value={String(value || '')}>
            <option value="">Select player type</option>
            <option value="Amateur">Amateur</option>
            <option value="Professional">Professional</option>
            <option value="Student Athlete">Student Athlete</option>
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
            <h2 className="modal-title">Edit Personal Details</h2>
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
                Unsaved changes
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
    </div>
  );
};

export default PersonalDetailsModal;