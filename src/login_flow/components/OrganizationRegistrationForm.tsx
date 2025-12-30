import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@hooks/useLanguage';
import { indianStates, getCitiesByState } from '../../features/athlete-onboarding/data/indianLocations';
import { usernameValidationService } from '../../services/username/usernameValidationService';
import './OrganizationRegistrationForm.css';

interface OrganizationDetails {
  // Basic Information
  organizationName: string;
  username: string;
  organizationType: string;
  establishedYear: string;
  registrationNumber: string;

  // Contact Details
  contactPersonName: string;
  designation: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;

  // Address Details
  street: string;
  state: string;
  city: string;
  pincode: string;
  country: string;

  // Sports & Players
  sportsOffered: string[];
  numberOfPlayers: string;
  ageGroups: string[];

  // Facilities
  trainingGrounds: boolean;
  gymFitness: boolean;
  coachingStaff: boolean;
  hostel: boolean;

  // Additional Info
  achievements: string;
  specialNotes: string;

  // Declaration
  declaration: boolean;
}

interface OrganizationRegistrationFormProps {
  onContinue: (data: OrganizationDetails) => void;
  onBack: () => void;
}

const OrganizationRegistrationForm: React.FC<OrganizationRegistrationFormProps> = ({ onContinue, onBack }) => {
  const { t } = useLanguage();
  const [cities, setCities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof OrganizationDetails, string>>>({});

  // Username validation state
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState<OrganizationDetails>({
    // Basic Information
    organizationName: '',
    username: '',
    organizationType: '',
    establishedYear: '',
    registrationNumber: '',

    // Contact Details
    contactPersonName: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',

    // Address Details
    street: '',
    state: '',
    city: '',
    pincode: '',
    country: 'India',

    // Sports & Players
    sportsOffered: [],
    numberOfPlayers: '',
    ageGroups: [],

    // Facilities
    trainingGrounds: false,
    gymFitness: false,
    coachingStaff: false,
    hostel: false,

    // Additional Info
    achievements: '',
    specialNotes: '',

    // Declaration
    declaration: false
  });

  const organizationTypes = [
    'Sports Academy',
    'School',
    'College/University',
    'Sports Club',
    'Training Center',
    'Government Organization',
    'NGO',
    'Private Organization',
    'Other'
  ];

  const availableSports = [
    'Athletics',
    'Cricket',
    'Football',
    'Basketball',
    'Hockey',
    'Swimming',
    'Volleyball',
    'Field events',
    'Kabaddi',
    'Kho-Kho',
    'Wrestling',
    'Weight Lifting',
    'Cycling',
    'Badminton',
    'Table Tennis',
    'Archery',
    'Shooting',
    'Boxing',
    'Golf'
  ];

  const ageGroupOptions = ['U-10', 'U-12', 'U-14', 'U-16', 'U-18', 'Adults'];

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
  }, [formData.state, formData.city]);

  const handleChange = (field: keyof OrganizationDetails, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sportsOffered: prev.sportsOffered.includes(sport)
        ? prev.sportsOffered.filter(s => s !== sport)
        : [...prev.sportsOffered, sport]
    }));
  };

  const handleAgeGroupToggle = (ageGroup: string) => {
    setFormData(prev => ({
      ...prev,
      ageGroups: prev.ageGroups.includes(ageGroup)
        ? prev.ageGroups.filter(ag => ag !== ageGroup)
        : [...prev.ageGroups, ageGroup]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof OrganizationDetails, string>> = {};

    // Basic Information
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    if (!formData.organizationType) {
      newErrors.organizationType = 'Type of organization is required';
    }

    // Contact Details
    if (!formData.contactPersonName.trim()) {
      newErrors.contactPersonName = 'Contact person name is required';
    }
    if (!formData.phone || !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (formData.alternatePhone && !/^[6-9]\d{9}$/.test(formData.alternatePhone)) {
      newErrors.alternatePhone = 'Please enter a valid 10-digit mobile number';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Address Details
    if (!formData.state) {
      newErrors.state = 'State is required';
    }
    if (!formData.city) {
      newErrors.city = 'City is required';
    }
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    // Sports & Players
    if (formData.sportsOffered.length === 0) {
      newErrors.sportsOffered = 'Please select at least one sport';
    }

    // Declaration
    if (!formData.declaration) {
      newErrors.declaration = 'You must accept the declaration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onContinue(formData);
  };

  return (
    <div className="organization-form-container">
      <div className="organization-form-card">
        <h1 className="organization-form-title">Organization Registration</h1>
        <p className="organization-form-subtitle">Complete your organization profile</p>

        <form onSubmit={handleSubmit} className="organization-form">
          {/* 1. Basic Information */}
          <div className="form-section">
            <h2 className="section-title">1. Basic Information</h2>

            <div className="form-group">
              <label htmlFor="organizationName">
                Organisation Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) => handleChange('organizationName', e.target.value)}
                placeholder="Enter organisation name"
                className={errors.organizationName ? 'error' : ''}
              />
              {errors.organizationName && <span className="error-message">{errors.organizationName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="organizationType">
                Type of Organisation <span className="required">*</span>
              </label>
              <select
                id="organizationType"
                value={formData.organizationType}
                onChange={(e) => handleChange('organizationType', e.target.value)}
                className={errors.organizationType ? 'error' : ''}
              >
                <option value="">Select type</option>
                {organizationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.organizationType && <span className="error-message">{errors.organizationType}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="establishedYear">Established Year</label>
                <input
                  type="number"
                  id="establishedYear"
                  value={formData.establishedYear}
                  onChange={(e) => handleChange('establishedYear', e.target.value)}
                  placeholder="e.g., 2010"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registrationNumber">Registration Number (Optional)</label>
                <input
                  type="text"
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  placeholder="Enter registration number"
                />
              </div>
            </div>
          </div>

          {/* 2. Contact Details */}
          <div className="form-section">
            <h2 className="section-title">2. Contact Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contactPersonName">
                  Contact Person Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={(e) => handleChange('contactPersonName', e.target.value)}
                  placeholder="Enter contact person name"
                  className={errors.contactPersonName ? 'error' : ''}
                />
                {errors.contactPersonName && <span className="error-message">{errors.contactPersonName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="designation">Designation/Role</label>
                <input
                  type="text"
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="e.g., Manager, Director"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">
                  Phone Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  maxLength={10}
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="alternatePhone">Alternate Phone (Optional)</label>
                <input
                  type="tel"
                  id="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  placeholder="Enter alternate phone"
                  maxLength={10}
                  className={errors.alternatePhone ? 'error' : ''}
                />
                {errors.alternatePhone && <span className="error-message">{errors.alternatePhone}</span>}
              </div>
            </div>

            <div className="form-row">
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

              <div className="form-group">
                <label htmlFor="website">Website / Social Media Link</label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* 3. Address Details */}
          <div className="form-section">
            <h2 className="section-title">3. Address Details</h2>

            <div className="form-group">
              <label htmlFor="street">Street / Area</label>
              <input
                type="text"
                id="street"
                value={formData.street}
                onChange={(e) => handleChange('street', e.target.value)}
                placeholder="Enter street/area"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="state">
                  State <span className="required">*</span>
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className={errors.state ? 'error' : ''}
                >
                  <option value="">Select state</option>
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
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={!formData.state}
                  className={errors.city ? 'error' : ''}
                >
                  <option value="">Select state first</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <span className="error-message">{errors.city}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pincode">
                  Pincode <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="Enter pincode"
                  maxLength={6}
                  className={errors.pincode ? 'error' : ''}
                />
                {errors.pincode && <span className="error-message">{errors.pincode}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  disabled
                  className="disabled"
                />
              </div>
            </div>
          </div>

          {/* 4. Sports & Players */}
          <div className="form-section">
            <h2 className="section-title">4. Sports & Players</h2>

            <div className="form-group">
              <label>
                Sports Offered <span className="required">*</span>
              </label>
              <div className="checkbox-grid">
                {availableSports.map(sport => (
                  <label key={sport} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.sportsOffered.includes(sport)}
                      onChange={() => handleSportToggle(sport)}
                    />
                    <span>{sport}</span>
                  </label>
                ))}
              </div>
              {errors.sportsOffered && <span className="error-message">{errors.sportsOffered}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="numberOfPlayers">Number of Players Currently Enrolled</label>
              <input
                type="number"
                id="numberOfPlayers"
                value={formData.numberOfPlayers}
                onChange={(e) => handleChange('numberOfPlayers', e.target.value)}
                placeholder="Enter number"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Age Groups</label>
              <div className="checkbox-grid">
                {ageGroupOptions.map(ageGroup => (
                  <label key={ageGroup} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.ageGroups.includes(ageGroup)}
                      onChange={() => handleAgeGroupToggle(ageGroup)}
                    />
                    <span>{ageGroup}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Facilities Available */}
          <div className="form-section">
            <h2 className="section-title">5. Facilities Available</h2>

            <div className="checkbox-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.trainingGrounds}
                  onChange={(e) => handleChange('trainingGrounds', e.target.checked)}
                />
                <span>Training Grounds</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.gymFitness}
                  onChange={(e) => handleChange('gymFitness', e.target.checked)}
                />
                <span>Gym / Fitness Area</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.coachingStaff}
                  onChange={(e) => handleChange('coachingStaff', e.target.checked)}
                />
                <span>Coaching Staff</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.hostel}
                  onChange={(e) => handleChange('hostel', e.target.checked)}
                />
                <span>Hostel / Accommodation</span>
              </label>
            </div>
          </div>

          {/* 6. Additional Info */}
          <div className="form-section">
            <h2 className="section-title">6. Additional Info (Optional)</h2>

            <div className="form-group">
              <label htmlFor="achievements">Achievements / Awards</label>
              <textarea
                id="achievements"
                value={formData.achievements}
                onChange={(e) => handleChange('achievements', e.target.value)}
                placeholder="List any notable achievements or awards"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="specialNotes">Special Notes</label>
              <textarea
                id="specialNotes"
                value={formData.specialNotes}
                onChange={(e) => handleChange('specialNotes', e.target.value)}
                placeholder="Any additional information"
                rows={4}
              />
            </div>
          </div>

          {/* 7. Declaration */}
          <div className="form-section">
            <h2 className="section-title">7. Declaration</h2>

            <div className="form-group">
              <label className="checkbox-label declaration-label">
                <input
                  type="checkbox"
                  checked={formData.declaration}
                  onChange={(e) => handleChange('declaration', e.target.checked)}
                  className={errors.declaration ? 'error' : ''}
                />
                <span>
                  I hereby confirm that all the information provided is true and correct. <span className="required">*</span>
                </span>
              </label>
              {errors.declaration && <span className="error-message">{errors.declaration}</span>}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
            >
              ← Choose Different Role
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Register Organisation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationRegistrationForm;
