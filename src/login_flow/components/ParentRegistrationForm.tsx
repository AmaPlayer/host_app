import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@hooks/useLanguage';
import { indianStates, getCitiesByState } from '@features/athlete-onboarding/data/indianLocations';
import { SPORTS_CONFIG } from '@features/athlete-onboarding/data/sportsConfig';
import { usernameValidationService } from '../../services/username/usernameValidationService';
import './ParentRegistrationForm.css';

interface ParentFormData {
  // 1. Parent/Guardian Information
  parentFullName: string;
  username: string;
  relationshipToChild: string;
  mobile: string;
  email: string;

  // 2. Child Information
  childFullName: string;
  childDateOfBirth: string;
  childGender: string;
  childState: string;
  childCity: string;
  childCountry: string;

  // 3. School Information (Optional)
  schoolName: string;
  schoolBoard: string;
  schoolClass: string;
  schoolCity: string;
  schoolCoachName: string;
  schoolTeamParticipation: string;

  // 4. Sports Details
  primarySport: string;
  secondarySport: string;
  skillLevel: string;
  playingCategory: string;

  // 5. Additional Details
  achievements: string;
  aspirations: string;

  // 6. Consent
  contentConsent: boolean;
}

interface ParentRegistrationFormProps {
  onContinue: (data: ParentFormData) => void;
  onBack: () => void;
}

const ParentRegistrationForm: React.FC<ParentRegistrationFormProps> = ({ onContinue, onBack }) => {
  const { t } = useLanguage();
  const [cities, setCities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof ParentFormData, string>>>({});

  // Username validation state
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState<ParentFormData>({
    parentFullName: '',
    username: '',
    relationshipToChild: '',
    mobile: '',
    email: '',
    childFullName: '',
    childDateOfBirth: '',
    childGender: '',
    childState: '',
    childCity: '',
    childCountry: 'India',
    schoolName: '',
    schoolBoard: '',
    schoolClass: '',
    schoolCity: '',
    schoolCoachName: '',
    schoolTeamParticipation: '',
    primarySport: '',
    secondarySport: '',
    skillLevel: '',
    playingCategory: '',
    achievements: '',
    aspirations: '',
    contentConsent: false
  });

  // Dynamic city loading based on state selection
  useEffect(() => {
    if (formData.childState) {
      const stateCities = getCitiesByState(formData.childState);
      setCities(stateCities);
      if (!stateCities.includes(formData.childCity)) {
        setFormData(prev => ({ ...prev, childCity: '' }));
      }
    } else {
      setCities([]);
    }
  }, [formData.childState, formData.childCity]);

  const handleChange = (field: keyof ParentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Username validation logic
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.trim().length === 0) {
      setUsernameAvailable(null);
      setUsernameError('');
      setUsernameSuggestions([]);
      return;
    }

    setUsernameLoading(true);
    setUsernameSuggestions([]);

    try {
      const available = await usernameValidationService.checkUsernameAvailability(username);

      if (!available) {
        setUsernameError('Username is already taken');
        const suggestions = await usernameValidationService.suggestAlternativeUsernames(username);
        setUsernameSuggestions(suggestions);
      } else {
        setUsernameError('');
        setUsernameSuggestions([]);
      }

      setUsernameAvailable(available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking availability');
      setUsernameAvailable(false);
    } finally {
      setUsernameLoading(false);
    }
  }, []);

  const handleUsernameChange = (value: string) => {
    handleChange('username', value);

    const formatResult = usernameValidationService.validateUsername(value);
    if (!formatResult.valid && value.length > 0) {
      setUsernameError(formatResult.error || '');
      setUsernameAvailable(false);
      return;
    }

    setUsernameError('');
    const timeoutId = setTimeout(() => checkUsernameAvailability(value), 500);
    return () => clearTimeout(timeoutId);
  };

  const handleUsernameBlur = () => {
    if (!formData.username && formData.parentFullName) {
      const generated = usernameValidationService.generateUsernameFromDisplayName(formData.parentFullName);
      handleChange('username', generated);
      checkUsernameAvailability(generated);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    handleChange('username', suggestion);
    setUsernameSuggestions([]);
    setUsernameError('');
    setUsernameAvailable(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ParentFormData, string>> = {};

    // Validate required fields
    if (!formData.parentFullName.trim()) {
      newErrors.parentFullName = 'Parent name is required';
    }
    if (!formData.relationshipToChild) {
      newErrors.relationshipToChild = 'Relationship is required';
    }
    if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Valid 10-digit mobile number required';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email address required';
    }
    if (!formData.childFullName.trim()) {
      newErrors.childFullName = "Child's name is required";
    }
    if (!formData.childDateOfBirth) {
      newErrors.childDateOfBirth = 'Date of birth is required';
    }
    if (!formData.childGender) {
      newErrors.childGender = 'Gender is required';
    }
    if (!formData.childState) {
      newErrors.childState = 'State is required';
    }
    if (!formData.childCity) {
      newErrors.childCity = 'City is required';
    }
    if (!formData.primarySport) {
      newErrors.primarySport = 'Primary sport is required';
    }
    if (!formData.skillLevel) {
      newErrors.skillLevel = 'Skill level is required';
    }
    if (!formData.playingCategory) {
      newErrors.playingCategory = 'Playing category is required';
    }
    if (!formData.contentConsent) {
      newErrors.contentConsent = 'You must accept the consent';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onContinue(formData);
  };

  return (
    <div className="parent-form-container">
      <div className="parent-form-card">
        <h1 className="parent-form-title">Parent Registration</h1>
        <p className="parent-form-subtitle">Please provide your details and your child's information</p>

        <form onSubmit={handleSubmit} className="parent-form">
          {/* Section 1: Parent/Guardian Information */}
          <div className="form-section">
            <h2 className="section-title">1. Parent/Guardian Information</h2>

            <div className="form-group">
              <label htmlFor="parentFullName">
                Parent Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="parentFullName"
                value={formData.parentFullName}
                onChange={(e) => handleChange('parentFullName', e.target.value)}
                placeholder="Enter parent's full name"
                className={errors.parentFullName ? 'error' : ''}
              />
              {errors.parentFullName && <span className="error-message">{errors.parentFullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <div className="username-input-wrapper">
                <span className="username-prefix">@</span>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  onBlur={handleUsernameBlur}
                  placeholder="parent_john"
                  className={usernameAvailable === true ? 'valid' : usernameAvailable === false || errors.username ? 'error' : ''}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {usernameLoading && <span className="loading-text">Checking availability...</span>}
              {usernameError && !errors.username && <span className="error-message">{usernameError}</span>}
              {errors.username && <span className="error-message">{errors.username}</span>}
              {usernameSuggestions.length > 0 && (
                <div className="suggestions-box">
                  <p className="suggestions-label">Try these instead:</p>
                  <div className="suggestions-list">
                    {usernameSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        className="suggestion-button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        @{suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="relationshipToChild">
                  Relationship to Child <span className="required">*</span>
                </label>
                <select
                  id="relationshipToChild"
                  value={formData.relationshipToChild}
                  onChange={(e) => handleChange('relationshipToChild', e.target.value)}
                  className={errors.relationshipToChild ? 'error' : ''}
                >
                  <option value="">Select relationship</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
                {errors.relationshipToChild && <span className="error-message">{errors.relationshipToChild}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="mobile">
                  Mobile Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  placeholder="Enter mobile number"
                  maxLength={10}
                  className={errors.mobile ? 'error' : ''}
                />
                {errors.mobile && <span className="error-message">{errors.mobile}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          {/* Section 2: Child Information */}
          <div className="form-section">
            <h2 className="section-title">2. Child (Player) Information</h2>

            <div className="form-group">
              <label htmlFor="childFullName">
                Child's Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="childFullName"
                value={formData.childFullName}
                onChange={(e) => handleChange('childFullName', e.target.value)}
                placeholder="Enter child's full name"
                className={errors.childFullName ? 'error' : ''}
              />
              {errors.childFullName && <span className="error-message">{errors.childFullName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="childDateOfBirth">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="childDateOfBirth"
                  value={formData.childDateOfBirth}
                  onChange={(e) => handleChange('childDateOfBirth', e.target.value)}
                  className={errors.childDateOfBirth ? 'error' : ''}
                />
                {errors.childDateOfBirth && <span className="error-message">{errors.childDateOfBirth}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="childGender">
                  Gender <span className="required">*</span>
                </label>
                <select
                  id="childGender"
                  value={formData.childGender}
                  onChange={(e) => handleChange('childGender', e.target.value)}
                  className={errors.childGender ? 'error' : ''}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.childGender && <span className="error-message">{errors.childGender}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="childState">
                  State <span className="required">*</span>
                </label>
                <select
                  id="childState"
                  value={formData.childState}
                  onChange={(e) => handleChange('childState', e.target.value)}
                  className={errors.childState ? 'error' : ''}
                >
                  <option value="">Select state</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.childState && <span className="error-message">{errors.childState}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="childCity">
                  City <span className="required">*</span>
                </label>
                <select
                  id="childCity"
                  value={formData.childCity}
                  onChange={(e) => handleChange('childCity', e.target.value)}
                  disabled={!formData.childState}
                  className={errors.childCity ? 'error' : ''}
                >
                  <option value="">{formData.childState ? 'Select city' : 'Select state first'}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.childCity && <span className="error-message">{errors.childCity}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="childCountry">
                Country <span className="required">*</span>
              </label>
              <input
                type="text"
                id="childCountry"
                value={formData.childCountry}
                onChange={(e) => handleChange('childCountry', e.target.value)}
                disabled
                className="disabled"
              />
            </div>
          </div>

          {/* Section 3: School Information */}
          <div className="form-section">
            <h2 className="section-title">3. Child's School Information (Optional)</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schoolName">School Name</label>
                <input
                  type="text"
                  id="schoolName"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolBoard">Board</label>
                <select
                  id="schoolBoard"
                  value={formData.schoolBoard}
                  onChange={(e) => handleChange('schoolBoard', e.target.value)}
                >
                  <option value="">Select board</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                  <option value="International">International</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schoolClass">School Class</label>
                <input
                  type="text"
                  id="schoolClass"
                  value={formData.schoolClass}
                  onChange={(e) => handleChange('schoolClass', e.target.value)}
                  placeholder="e.g., 4th, 7th, 10th"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolCity">School City</label>
                <input
                  type="text"
                  id="schoolCity"
                  value={formData.schoolCity}
                  onChange={(e) => handleChange('schoolCity', e.target.value)}
                  placeholder="Enter school city"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schoolCoachName">School Coach Name (Optional)</label>
                <input
                  type="text"
                  id="schoolCoachName"
                  value={formData.schoolCoachName}
                  onChange={(e) => handleChange('schoolCoachName', e.target.value)}
                  placeholder="Enter coach name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolTeamParticipation">School Team Participation</label>
                <select
                  id="schoolTeamParticipation"
                  value={formData.schoolTeamParticipation}
                  onChange={(e) => handleChange('schoolTeamParticipation', e.target.value)}
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Sports Details */}
          <div className="form-section">
            <h2 className="section-title">4. Child's Sports Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="primarySport">
                  Primary Sport <span className="required">*</span>
                </label>
                <select
                  id="primarySport"
                  value={formData.primarySport}
                  onChange={(e) => handleChange('primarySport', e.target.value)}
                  className={errors.primarySport ? 'error' : ''}
                >
                  <option value="">Select primary sport</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
                {errors.primarySport && <span className="error-message">{errors.primarySport}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="secondarySport">Secondary Sport (Optional)</label>
                <select
                  id="secondarySport"
                  value={formData.secondarySport}
                  onChange={(e) => handleChange('secondarySport', e.target.value)}
                >
                  <option value="">Select secondary sport</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="skillLevel">
                  Skill Level <span className="required">*</span>
                </label>
                <select
                  id="skillLevel"
                  value={formData.skillLevel}
                  onChange={(e) => handleChange('skillLevel', e.target.value)}
                  className={errors.skillLevel ? 'error' : ''}
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
                {errors.skillLevel && <span className="error-message">{errors.skillLevel}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="playingCategory">
                  Playing Category <span className="required">*</span>
                </label>
                <select
                  id="playingCategory"
                  value={formData.playingCategory}
                  onChange={(e) => handleChange('playingCategory', e.target.value)}
                  className={errors.playingCategory ? 'error' : ''}
                >
                  <option value="">Select category</option>
                  <option value="Recreational">Recreational</option>
                  <option value="School Level">School Level</option>
                  <option value="District Level">District Level</option>
                  <option value="State Level">State Level</option>
                  <option value="National Level">National Level</option>
                </select>
                {errors.playingCategory && <span className="error-message">{errors.playingCategory}</span>}
              </div>
            </div>
          </div>

          {/* Section 5: Additional Details */}
          <div className="form-section">
            <h2 className="section-title">5. Additional Details (Optional)</h2>

            <div className="form-group">
              <label htmlFor="achievements">Achievements / Trophies</label>
              <textarea
                id="achievements"
                value={formData.achievements}
                onChange={(e) => handleChange('achievements', e.target.value)}
                placeholder="List any achievements or trophies"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="aspirations">Aspirations</label>
              <textarea
                id="aspirations"
                value={formData.aspirations}
                onChange={(e) => handleChange('aspirations', e.target.value)}
                placeholder="What are your child's sports aspirations?"
                rows={4}
              />
            </div>
          </div>

          {/* Section 6: Parent Consent */}
          <div className="form-section">
            <h2 className="section-title">6. Parent Consent</h2>

            <div className="form-group">
              <label className="checkbox-label declaration-label">
                <input
                  type="checkbox"
                  checked={formData.contentConsent}
                  onChange={(e) => handleChange('contentConsent', e.target.checked)}
                  className={errors.contentConsent ? 'error' : ''}
                />
                <span>
                  I allow AmaPlayer to use my child's content. <span className="required">*</span>
                </span>
              </label>
              {errors.contentConsent && <span className="error-message">{errors.contentConsent}</span>}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" onClick={onBack} className="btn-secondary">
              ← Choose Different Role
            </button>
            <button type="submit" className="btn-primary">
              Register as Parent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParentRegistrationForm;
