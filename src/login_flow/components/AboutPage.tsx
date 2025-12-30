import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@hooks/useLanguage';
import { TranslationKey } from '../../types/contexts/language';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import { SPORTS_CONFIG } from '../../features/athlete-onboarding/data/sportsConfig';
import { indianStates, getCitiesByState } from '../../features/athlete-onboarding/data/indianLocations';
import { usernameValidationService } from '../../services/username/usernameValidationService';
import OrganizationRegistrationForm from './OrganizationRegistrationForm';
import ParentRegistrationForm from './ParentRegistrationForm';
import './AboutPage.css';

interface RoleInfo {
  title: string;
  image: string;
}

interface RoleInfoMap {
  [key: string]: RoleInfo;
}

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();
  const { t } = useLanguage();

  // Coach professional details form state
  const [coachDetails, setCoachDetails] = useState({
    fullName: '',
    username: '',
    sport: '',
    yearsOfExperience: '',
    coachingLevel: '',
    certifications: '',
    bio: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    state: '',
    country: 'India'
  });

  const [cities, setCities] = useState<string[]>([]);

  // Username validation state (for coach form)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (coachDetails.state) {
      const stateCities = getCitiesByState(coachDetails.state);
      setCities(stateCities);
      if (!stateCities.includes(coachDetails.city)) {
        setCoachDetails(prev => ({ ...prev, city: '' }));
      }
    } else {
      setCities([]);
    }
  }, [coachDetails.state, coachDetails.city]);

  const roleInfo: RoleInfoMap = {
    athlete: { 
      title: 'athlete', 
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    coach: { 
      title: 'coach', 
      image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    organization: { 
      title: 'organization', 
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    spouse: { 
      title: 'spouse', 
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    parent: { 
      title: 'parent', 
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    }
  };

  const currentRole = role ? roleInfo[role] : undefined;

  const handleCoachDetailsChange = (field: string, value: string): void => {
    setCoachDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Username validation for coach
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
    handleCoachDetailsChange('username', value);

    // Format validation (instant)
    const formatResult = usernameValidationService.validateUsername(value);
    if (!formatResult.valid && value.length > 0) {
      setUsernameError(formatResult.error || '');
      setUsernameAvailable(false);
      return;
    }

    // Clear error and check availability (debounced)
    setUsernameError('');
    const timeoutId = setTimeout(() => checkUsernameAvailability(value), 500);
    return () => clearTimeout(timeoutId);
  };

  const handleUsernameBlur = () => {
    if (!coachDetails.username && coachDetails.fullName) {
      const generated = usernameValidationService.generateUsernameFromDisplayName(coachDetails.fullName);
      handleCoachDetailsChange('username', generated);
      checkUsernameAvailability(generated);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    handleCoachDetailsChange('username', suggestion);
    setUsernameSuggestions([]);
    setUsernameError('');
    setUsernameAvailable(true);
  };

  const handleContinue = (): void => {
    // For coaches, validate and store their professional details
    if (role === 'coach') {
      // Store coach details in localStorage for later use during registration
      localStorage.setItem('coachProfessionalDetails', JSON.stringify(coachDetails));
      // Store the role for signup page
      localStorage.setItem('selectedUserRole', role);
    }
    // Navigate to auth choice page for all roles
    navigate(`/auth-choice/${role}`);
  };

  const handleOrganizationContinue = (organizationData: any): void => {
    // Store organization details in localStorage for later use during registration
    localStorage.setItem('organizationDetails', JSON.stringify(organizationData));
    // Store the role for signup page
    localStorage.setItem('selectedUserRole', 'organization');
    // Navigate to auth choice page
    navigate('/auth-choice/organization');
  };

  const handleParentContinue = (parentData: any): void => {
    // Store parent details in localStorage for later use during registration
    localStorage.setItem('parentDetails', JSON.stringify(parentData));
    // Store the role for signup page
    localStorage.setItem('selectedUserRole', 'parent');
    // Navigate to auth choice page
    navigate('/auth-choice/parent');
  };

  const handleBack = (): void => {
    navigate('/');
  };

  // For organization role, return the form directly without the usual wrapper
  if (role === 'organization') {
    return (
      <div className="about-container">
        <div className="about-page-header">
          <div className="about-page-controls">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
        <OrganizationRegistrationForm
          onContinue={handleOrganizationContinue}
          onBack={handleBack}
        />
      </div>
    );
  }

  // For parent role, return the form directly without the usual wrapper
  if (role === 'parent') {
    return (
      <div className="about-container">
        <div className="about-page-header">
          <div className="about-page-controls">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
        <ParentRegistrationForm
          onContinue={handleParentContinue}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="about-container">
      <div className="about-page-header">
        <div className="about-page-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <div className="about-content">
        <div className="about-header">
          <div className="role-badge">
            <img
              src={currentRole?.image}
              alt={currentRole ? t(currentRole.title as TranslationKey) : ''}
              className="role-badge-image"
            />
            <span className="role-badge-text">
              {t('joiningAs', 'Joining as')} {currentRole ? t(currentRole.title as TranslationKey) : ''}
            </span>
          </div>
          <h1 className="about-title">{t('welcomeToAmaplayer')}</h1>
          <p className="about-subtitle">{role === 'coach' ? t('coachDetailsSubtitle', 'Please provide your professional details') : t('yourJourney')}</p>
        </div>

        {role === 'coach' ? (
          // Coach Professional Details Form
          <div className="coach-details-form">
            <h2 className="form-section-title">{t('professionalDetails', 'Professional Details')}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  {t('fullName', 'Full Name')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  className="form-input"
                  value={coachDetails.fullName}
                  onChange={(e) => handleCoachDetailsChange('fullName', e.target.value)}
                  placeholder={t('enterFullName', 'Enter your full name')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username <span className="required">*</span>
                </label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    id="username"
                    className={`form-input ${usernameAvailable === true ? 'valid' : usernameAvailable === false ? 'error' : ''}`}
                    value={coachDetails.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={handleUsernameBlur}
                    placeholder="john_coach"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {usernameLoading && <span className="loading-text">Checking availability...</span>}
                {usernameError && <span className="error-message">{usernameError}</span>}
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

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t('email', 'Email')} <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={coachDetails.email}
                  onChange={(e) => handleCoachDetailsChange('email', e.target.value)}
                  placeholder={t('enterEmail', 'Enter your email')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  {t('phone', 'Phone Number')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  value={coachDetails.phone}
                  onChange={(e) => handleCoachDetailsChange('phone', e.target.value)}
                  placeholder={t('enterPhone', 'Enter your phone number')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth" className="form-label">
                  {t('dateOfBirth', 'Date of Birth')} <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  className="form-input"
                  value={coachDetails.dateOfBirth}
                  onChange={(e) => handleCoachDetailsChange('dateOfBirth', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender" className="form-label">
                  {t('gender', 'Gender')} <span className="required">*</span>
                </label>
                <select
                  id="gender"
                  className="form-input"
                  value={coachDetails.gender}
                  onChange={(e) => handleCoachDetailsChange('gender', e.target.value)}
                >
                  <option value="">{t('selectGender', 'Select Gender')}</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="state" className="form-label">
                  {t('state', 'State')} <span className="required">*</span>
                </label>
                <select
                  id="state"
                  className="form-input"
                  value={coachDetails.state}
                  onChange={(e) => handleCoachDetailsChange('state', e.target.value)}
                >
                  <option value="">{t('selectState', 'Select State')}</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city" className="form-label">
                  {t('city', 'City')} <span className="required">*</span>
                </label>
                <select
                  id="city"
                  className="form-input"
                  value={coachDetails.city}
                  onChange={(e) => handleCoachDetailsChange('city', e.target.value)}
                  disabled={!coachDetails.state}
                >
                  <option value="">{coachDetails.state ? t('selectCity', 'Select City') : t('selectStateFirst', 'Select State First')}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="country" className="form-label">
                  {t('country', 'Country')}
                </label>
                <input
                  type="text"
                  id="country"
                  className="form-input disabled"
                  value={coachDetails.country}
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="sport" className="form-label">
                  {t('sport', 'Sport')} <span className="required">*</span>
                </label>
                <select
                  id="sport"
                  className="form-input"
                  value={coachDetails.sport}
                  onChange={(e) => handleCoachDetailsChange('sport', e.target.value)}
                >
                  <option value="">{t('selectSport', 'Select sport')}</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="yearsOfExperience" className="form-label">
                  {t('yearsOfExperience', 'Years of Experience')} <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="yearsOfExperience"
                  className="form-input"
                  value={coachDetails.yearsOfExperience}
                  onChange={(e) => handleCoachDetailsChange('yearsOfExperience', e.target.value)}
                  placeholder={t('enterYears', 'Enter years')}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="coachingLevel" className="form-label">
                  {t('coachingLevel', 'Coaching Level')} <span className="required">*</span>
                </label>
                <select
                  id="coachingLevel"
                  className="form-input"
                  value={coachDetails.coachingLevel}
                  onChange={(e) => handleCoachDetailsChange('coachingLevel', e.target.value)}
                >
                  <option value="">{t('selectLevel', 'Select level')}</option>
                  <option value="beginner">{t('beginner', 'Beginner')}</option>
                  <option value="intermediate">{t('intermediate', 'Intermediate')}</option>
                  <option value="advanced">{t('advanced', 'Advanced')}</option>
                  <option value="professional">{t('professional', 'Professional')}</option>
                  <option value="elite">{t('elite', 'Elite/Olympic')}</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="certifications" className="form-label">
                  {t('certifications', 'Certifications')}
                </label>
                <input
                  type="text"
                  id="certifications"
                  className="form-input"
                  value={coachDetails.certifications}
                  onChange={(e) => handleCoachDetailsChange('certifications', e.target.value)}
                  placeholder={t('enterCertifications', 'e.g., UEFA A License, NASM-CPT')}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="bio" className="form-label">
                  {t('bio', 'Professional Bio')}
                </label>
                <textarea
                  id="bio"
                  className="form-input form-textarea"
                  value={coachDetails.bio}
                  onChange={(e) => handleCoachDetailsChange('bio', e.target.value)}
                  placeholder={t('enterBio', 'Tell us about your coaching experience and philosophy')}
                  rows={4}
                />
              </div>
            </div>
          </div>
        ) : (
          // Original vision/mission and video for other roles
          <>
            <div className="mission-vision-grid">
              <div className="mission-card">
                <div className="card-icon mission-icon">🎯</div>
                <h3 className="card-title">{t('ourMission')}</h3>
                <p className="card-description">
                  {t('missionDescription', "To help India produce champions by connecting talent with the right opportunities.")}
                </p>
              </div>

              <div className="vision-card">
                <div className="card-icon vision-icon">🌟</div>
                <h3 className="card-title">{t('ourVision')}</h3>
                <p className="card-description">
                  {t('visionDescription', 'To unlock India’s untapped sporting talent by creating a platform that connects players with national and global sports ecosystems.Strengthening India’s sporting future by turning potential into performance.')}
                </p>
              </div>
            </div>

            {/* Video section disabled - video file not found */}
            {/* <div className="video-section">
              <h2 className="video-title">{t('watchOurStory')}</h2>
              <div className="video-container">
                <video
                  width="100%"
                  height="auto"
                  controls
                  controlsList="nodownload"
                  poster=""
                  className="about-video"
                >
                  <source src={videoSource} type="video/mp4" />
                  <p>{t('videoLoadError', "If you're seeing this, the video failed to load. Please check the console for errors.")}</p>
                  {t('videoNotSupported', 'Your browser does not support the video tag.')}
                </video>
              </div>
            </div> */}
          </>
        )}

        <div className="about-actions">
          <button className="continue-btn" onClick={handleContinue}>
            {role === 'coach' ? t('continue', 'Continue') : t('continueToLogin')}
          </button>
          <button className="back-btn" onClick={handleBack}>
            ← {t('chooseDifferentRole')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
