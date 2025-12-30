import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboardingStore } from '../store/onboardingStore';
import { indianStates, getCitiesByState } from '../data/indianLocations';
import { athleteService } from '../../../services/supabase';
import userService from '../../../services/api/userService';
import { usernameValidationService } from '../../../services/username/usernameValidationService';
import './PersonalDetailsForm.css';

interface PersonalDetails {
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  country: string;
  state: string;
  city: string;
  phone: string;
  bio: string;
}

export default function PersonalDetailsForm() {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile } = useAuth();
  const { selectedSports, selectedPosition, selectedSubcategory, selectedSpecializations, saveProfile } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);

  // Username validation state
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  // Load saved data from localStorage or use defaults
  const [formData, setFormData] = useState<PersonalDetails>(() => {
    const saved = localStorage.getItem('pendingPersonalDetails');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved personal details:', e);
      }
    }
    return {
      fullName: currentUser?.displayName || '',
      username: '',
      dateOfBirth: '',
      gender: '',
      heightFeet: '',
      heightInches: '',
      weight: '',
      country: 'India',
      state: '',
      city: '',
      phone: '',
      bio: ''
    };
  });

  const [errors, setErrors] = useState<Partial<PersonalDetails>>({});

  useEffect(() => {
    if (formData.state) {
      const stateCities = getCitiesByState(formData.state);
      setCities(stateCities);
      // Reset city if state changes
      if (!stateCities.includes(formData.city)) {
        setFormData(prev => ({ ...prev, city: '' }));
      }
    } else {
      setCities([]);
    }
  }, [formData.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof PersonalDetails]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Debounced username availability check
  const debouncedCheckUsername = useCallback(
    debounce(async (username: string) => {
      if (!username) return;

      setUsernameLoading(true);
      try {
        const available = await userService.checkUsernameAvailability(username, currentUser?.uid);
        setUsernameAvailable(available);

        if (!available) {
          setUsernameError('Username is already taken');
          const suggestions = await usernameValidationService.suggestAlternativeUsernames(username);
          setUsernameSuggestions(suggestions);
        } else {
          setUsernameError('');
          setUsernameSuggestions([]);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameError('Unable to verify username. Try again.');
      } finally {
        setUsernameLoading(false);
      }
    }, 500),
    [currentUser]
  );

  // Handle username input change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim();
    setFormData(prev => ({ ...prev, username: value }));
    setUsernameError('');
    setUsernameSuggestions([]);
    setUsernameAvailable(null);

    // Clear error for username field
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }

    // Format validation (instant)
    const formatResult = usernameValidationService.validateUsername(value);
    if (!formatResult.valid && value.length > 0) {
      setUsernameError(formatResult.error || '');
      setUsernameAvailable(false);
      return;
    }

    // Availability check (debounced 500ms)
    if (value.length >= 3) {
      debouncedCheckUsername(value);
    }
  };

  // Handle username blur - auto-generate if empty
  const handleUsernameBlur = () => {
    if (!formData.username && formData.fullName) {
      const generated = usernameValidationService.generateUsernameFromDisplayName(formData.fullName);
      setFormData(prev => ({ ...prev, username: generated }));
      debouncedCheckUsername(generated);
    }
  };

  // Handle suggestion click
  const handleSelectSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, username: suggestion }));
    setUsernameSuggestions([]);
    setUsernameAvailable(true);
    setUsernameError('');
  };

  // Debounce utility function
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalDetails> = {};

// Username validation
    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    } else {
      const formatResult = usernameValidationService.validateUsername(formData.username);
      if (!formatResult.valid) {
        newErrors.username = formatResult.error;
      } else if (usernameAvailable === false) {
        newErrors.username = 'Username is already taken';
      }
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 13) {
        newErrors.dateOfBirth = 'You must be at least 13 years old';
      }
      if (age > 100) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.state) {
      newErrors.state = 'State is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (formData.heightFeet && (parseFloat(formData.heightFeet) < 1 || parseFloat(formData.heightFeet) > 8)) {
      newErrors.heightFeet = 'Please enter a valid height (1-8 feet)';
    }

    if (formData.heightInches && (parseFloat(formData.heightInches) < 0 || parseFloat(formData.heightInches) >= 12)) {
      newErrors.heightInches = 'Inches must be between 0-11';
    }

    if (formData.weight && (parseFloat(formData.weight) < 10 || parseFloat(formData.weight) > 150)) {
      newErrors.weight = 'Please enter a valid weight (10-150 kg)';
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // If user is already authenticated, save everything to Supabase
      if (currentUser) {
        // Update Firebase Auth display name
        await updateUserProfile({
          displayName: formData.fullName
        });

        // Save athlete profile (sport/position/specializations) to Firestore
        await saveProfile(currentUser.uid);

        // Convert feet and inches to cm for storage
        const heightInCm = formData.heightFeet || formData.heightInches
          ? Math.round((parseFloat(formData.heightFeet || '0') * 30.48) + (parseFloat(formData.heightInches || '0') * 2.54))
          : null;

        // Build profile data object, only including fields with values
        const profileData: any = {
          fullName: formData.fullName,
          username: formData.username.toLowerCase().trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          location: `${formData.city}, ${formData.state}, ${formData.country}`
        };

        // Only add optional fields if they have values
        if (formData.bio) profileData.bio = formData.bio;
        if (heightInCm) profileData.height = heightInCm.toString();
        if (formData.weight) profileData.weight = formData.weight;
        if (formData.phone) profileData.mobile = formData.phone;

        // Save personal details to Firestore
        await athleteService.updateAthletePersonalDetails(currentUser.uid, profileData);

        // Clear saved data from localStorage
        localStorage.removeItem('pendingPersonalDetails');navigate('/home');
      } else {
        // No user authenticated - save to localStorage and navigate to login
        localStorage.setItem('pendingPersonalDetails', JSON.stringify(formData));

        // Also save athlete profile data to localStorage for after login
        localStorage.setItem('pendingAthleteProfile', JSON.stringify({
          sports: selectedSports,
          position: selectedPosition,
          subcategory: selectedSubcategory,
          specializations: selectedSpecializations
        }));
        localStorage.setItem('selectedUserRole', 'athlete');
        navigate('/auth-choice/athlete');
      }
    } catch (error) {
      console.error('Error saving personal details:', error);
      alert('Failed to save personal details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Clear any saved data and navigate to auth choice for new users
    localStorage.removeItem('pendingPersonalDetails');
    localStorage.setItem('selectedUserRole', 'athlete');
    navigate('/auth-choice/athlete');
  };

  const handleBack = () => {
    // Navigate back to subcategory selection (or specialization if no subcategories)
    const { selectedSports, selectedPosition } = useOnboardingStore.getState();

    // Check if the current position has subcategories
    if (selectedPosition) {
      navigate('/athlete-onboarding/subcategory');
    } else {
      navigate('/athlete-onboarding/specialization');
    }
  };

  return (
    <div className="personal-details-container">
      <div className="personal-details-card">
        <div className="personal-details-header">
          <h1>Complete Your Profile</h1>
          <p>Help us personalize your experience</p>
        </div>

        <form onSubmit={handleSubmit} className="personal-details-form">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="fullName">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? 'error' : ''}
              placeholder="Enter your full name"
            />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">
              Username <span className="required">*</span>
              {usernameAvailable === true && <span className="success-check"> ✓</span>}
              {usernameAvailable === false && <span className="error-x"> ✗</span>}
            </label>
            <div className="username-input-wrapper">
              <span className="username-prefix">@</span>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleUsernameChange}
                onBlur={handleUsernameBlur}
                placeholder="john_doe"
                className={
                  usernameAvailable === true
                    ? 'valid'
                    : usernameAvailable === false || errors.username
                    ? 'error'
                    : ''
                }
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

          {/* Date of Birth */}
          <div className="form-group">
            <label htmlFor="dateOfBirth">
              Date of Birth <span className="required">*</span>
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={errors.dateOfBirth ? 'error' : ''}
              max={new Date().toISOString().split('T')[0]}
              placeholder="dd/mm/yyyy"
              title="dd/mm/yyyy"
            />
            {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
          </div>

          {/* Gender */}
          <div className="form-group">
            <label htmlFor="gender">
              Gender <span className="required">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={errors.gender ? 'error' : ''}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          {/* Height and Weight */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="heightFeet">Height (Feet)</label>
              <select
                id="heightFeet"
                name="heightFeet"
                value={formData.heightFeet}
                onChange={handleChange}
                className={errors.heightFeet ? 'error' : ''}
              >
                <option value="">Select Feet</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(feet => (
                  <option key={feet} value={feet.toString()}>{feet}</option>
                ))}
              </select>
              {errors.heightFeet && <span className="error-message">{errors.heightFeet}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="heightInches">Height (Inches)</label>
              <select
                id="heightInches"
                name="heightInches"
                value={formData.heightInches}
                onChange={handleChange}
                className={errors.heightInches ? 'error' : ''}
              >
                <option value="">Select Inches</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inches => (
                  <option key={inches} value={inches.toString()}>{inches}</option>
                ))}
              </select>
              {errors.heightInches && <span className="error-message">{errors.heightInches}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <select
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={errors.weight ? 'error' : ''}
              >
                <option value="">Select Weight</option>
                {Array.from({ length: 141 }, (_, i) => i + 10).map(weight => (
                  <option key={weight} value={weight.toString()}>{weight}</option>
                ))}
              </select>
              {errors.weight && <span className="error-message">{errors.weight}</span>}
            </div>
            <div className="form-group"></div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled
              className="disabled"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="state">
                State <span className="required">*</span>
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={errors.state ? 'error' : ''}
              >
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && <span className="error-message">{errors.state}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="city">
                City <span className="required">*</span>
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={errors.city ? 'error' : ''}
                disabled={!formData.state}
              >
                <option value="">Select City</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Mobile Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error' : ''}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          {/* Bio */}
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself, your sports journey, achievements..."
              rows={4}
              maxLength={500}
            />
            <span className="character-count">{formData.bio.length}/500</span>
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="btn-secondary"
              disabled={loading}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
