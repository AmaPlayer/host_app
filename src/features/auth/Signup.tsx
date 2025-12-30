import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Home, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import './Auth.css';

export default function Signup() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const { signup, googleLogin, appleLogin, currentUser } = useAuth();
  const navigate = useNavigate();

  // Load full name from personal details or coach details if available
  useEffect(() => {
    // First check for coach professional details
    const coachDetails = localStorage.getItem('coachProfessionalDetails');
    if (coachDetails) {
      try {
        const details = JSON.parse(coachDetails);
        if (details.fullName) {
          setDisplayName(details.fullName);
          return; // Exit early if we found coach details
        }
      } catch (err) {
        console.error('Error parsing coach professional details:', err);
      }
    }

    // Check for parent details
    const parentDetails = localStorage.getItem('parentDetails');
    if (parentDetails) {
      try {
        const details = JSON.parse(parentDetails);
        if (details.parentFullName) {
          setDisplayName(details.parentFullName);
          return;
        }
      } catch (err) {
        console.error('Error parsing parent details:', err);
      }
    }

    // Check for organization details
    const organizationDetails = localStorage.getItem('organizationDetails');
    if (organizationDetails) {
      try {
        const details = JSON.parse(organizationDetails);
        if (details.organizationName) {
          setDisplayName(details.organizationName);
          return;
        }
      } catch (err) {
        console.error('Error parsing organization details:', err);
      }
    }

    // Fall back to pending personal details (for athletes)
    const pendingDetails = localStorage.getItem('pendingPersonalDetails');
    if (pendingDetails) {
      try {
        const details = JSON.parse(pendingDetails);
        if (details.fullName) {
          setDisplayName(details.fullName);
        }
      } catch (err) {
        console.error('Error parsing pending personal details:', err);
      }
    }
  }, []);

  // Helper function to save pending details after authentication
  async function savePendingDetails(): Promise<void> {
    const { auth } = await import('../../lib/firebase');
    const user = auth.currentUser;

    if (!user) return;

    const userService = (await import('../../services/api/userService')).default;
    const selectedRole = localStorage.getItem('selectedUserRole');

    const baseUserData = {
      uid: user.uid,
      email: user.email || '',
      photoURL: user.photoURL || null
    };

    try {
      // 1. Handle PARENT registration
      const parentDetailsStr = localStorage.getItem('parentDetails');
      if (parentDetailsStr && selectedRole === 'parent') {
        const parentDetails = JSON.parse(parentDetailsStr);

        const parentData = {
          ...baseUserData,
          role: 'parent',
          parentFullName: parentDetails.parentFullName,
          username: parentDetails.username || undefined,
          relationshipToChild: parentDetails.relationshipToChild.toLowerCase(),
          mobileNumber: parentDetails.mobile,
          child: {
            fullName: parentDetails.childFullName,
            dateOfBirth: parentDetails.childDateOfBirth,
            age: 0, // Will be calculated in parentsService
            gender: parentDetails.childGender.toLowerCase(),
            state: parentDetails.childState,
            city: parentDetails.childCity,
            country: parentDetails.childCountry || 'India'
          },
          sports: {
            primary: parentDetails.primarySport,
            secondary: parentDetails.secondarySport || undefined,
            skillLevel: parentDetails.skillLevel.toLowerCase(),
            playingCategory: parentDetails.playingCategory.toLowerCase().replace(' level', '').replace(' ', '')
          },
          contentConsent: parentDetails.contentConsent,
          ...(parentDetails.schoolName && {
            schoolInfo: {
              schoolName: parentDetails.schoolName,
              board: parentDetails.schoolBoard,
              schoolClass: parentDetails.schoolClass,
              schoolCity: parentDetails.schoolCity,
              schoolCoachName: parentDetails.schoolCoachName,
              teamParticipation: parentDetails.schoolTeamParticipation === 'Yes'
            }
          }),
          ...(parentDetails.achievements && { achievements: parentDetails.achievements }),
          ...(parentDetails.aspirations && { aspirations: parentDetails.aspirations })
        };

        await userService.createRoleSpecificProfile(user.uid, 'parent', parentData);
        localStorage.removeItem('parentDetails');
        return;
      }

      // 2. Handle COACH registration
      const coachDetailsStr = localStorage.getItem('coachProfessionalDetails');
      if (coachDetailsStr && selectedRole === 'coach') {
        const coachDetails = JSON.parse(coachDetailsStr);

        const coachData = {
          ...baseUserData,
          role: 'coach',
          fullName: coachDetails.fullName,
          username: coachDetails.username || undefined,
          phone: coachDetails.phone,
          city: coachDetails.city,
          state: coachDetails.state,
          country: coachDetails.country,
          dateOfBirth: coachDetails.dateOfBirth,
          gender: coachDetails.gender,
          sport: coachDetails.sport,
          yearsOfExperience: parseInt(coachDetails.yearsOfExperience) || 0,
          coachingLevel: coachDetails.coachingLevel,
          certifications: coachDetails.certifications || '',
          bio: coachDetails.bio || ''
        };

        await userService.createRoleSpecificProfile(user.uid, 'coach', coachData);
        localStorage.removeItem('coachProfessionalDetails');
        return;
      }

      // 3. Handle ORGANIZATION registration
      const organizationDetailsStr = localStorage.getItem('organizationDetails');
      if (organizationDetailsStr && selectedRole === 'organization') {
        const orgDetails = JSON.parse(organizationDetailsStr);

        const orgData = {
          ...baseUserData,
          role: 'organization',
          organizationName: orgDetails.organizationName,
          username: orgDetails.username || undefined,
          organizationType: orgDetails.organizationType,
          registrationNumber: orgDetails.registrationNumber,
          yearEstablished: orgDetails.establishedYear,
          website: orgDetails.website,
          contactPerson: orgDetails.contactPersonName,
          designation: orgDetails.designation,
          primaryEmail: orgDetails.email || user.email,
          primaryPhone: orgDetails.phone,
          secondaryPhone: orgDetails.alternatePhone,
          address: {
            line1: orgDetails.street,
            line2: '',
            city: orgDetails.city,
            state: orgDetails.state,
            pincode: orgDetails.pincode,
            country: orgDetails.country || 'India'
          },
          sports: orgDetails.sportsOffered || [],
          numberOfPlayers: orgDetails.numberOfPlayers,
          ageGroups: orgDetails.ageGroups || [],
          facilities: [
            ...(orgDetails.trainingGrounds ? ['Training Grounds'] : []),
            ...(orgDetails.gymFitness ? ['Gym & Fitness'] : []),
            ...(orgDetails.coachingStaff ? ['Coaching Staff'] : []),
            ...(orgDetails.hostel ? ['Hostel'] : [])
          ],
          achievements: orgDetails.achievements || '',
          termsAccepted: orgDetails.declaration || false
        };

        await userService.createRoleSpecificProfile(user.uid, 'organization', orgData);
        localStorage.removeItem('organizationDetails');
        return;
      }

      // 4. Handle ATHLETE registration
      const athleteProfileStr = localStorage.getItem('pendingAthleteProfile');
      const personalDetailsStr = localStorage.getItem('pendingPersonalDetails');

      if ((athleteProfileStr || personalDetailsStr) && selectedRole === 'athlete') {
        const athleteProfile = athleteProfileStr ? JSON.parse(athleteProfileStr) : {};
        const personalDetails = personalDetailsStr ? JSON.parse(personalDetailsStr) : {};

        // Convert height if provided
        const heightInCm = personalDetails.heightFeet || personalDetails.heightInches
          ? Math.round((parseFloat(personalDetails.heightFeet || '0') * 30.48) + (parseFloat(personalDetails.heightInches || '0') * 2.54))
          : null;

        // Calculate age if dateOfBirth provided
        let age = 0;
        if (personalDetails.dateOfBirth) {
          const birthDate = new Date(personalDetails.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        const athleteData = {
          ...baseUserData,
          role: 'athlete',
          fullName: personalDetails.fullName || user.displayName || '',
          username: personalDetails.username || undefined,
          dateOfBirth: personalDetails.dateOfBirth || '',
          age: age,
          gender: personalDetails.gender ? personalDetails.gender.toLowerCase() : '',
          phone: personalDetails.phone || '',
          state: personalDetails.state || '',
          city: personalDetails.city || '',
          country: personalDetails.country || 'India',
          bio: personalDetails.bio || '',
          height: heightInCm ? heightInCm.toString() : undefined,
          weight: personalDetails.weight || undefined,
          sports: {
            primary: athleteProfile.sports?.[0] || '',
            secondary: athleteProfile.sports?.[1] || undefined,
            position: athleteProfile.position || '',
            subcategory: athleteProfile.subcategory || '',
            skillLevel: athleteProfile.skillLevel || 'beginner'
          },
          specializations: athleteProfile.specializations || {}
        };

        await userService.createRoleSpecificProfile(user.uid, 'athlete', athleteData);
        localStorage.removeItem('pendingAthleteProfile');
        localStorage.removeItem('pendingPersonalDetails');
        return;
      }

    } catch (error) {
      console.error('Error saving pending details:', error);
      throw error;
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName);

      // Wait for auth state to update and get the current user
      await new Promise(resolve => setTimeout(resolve, 500));

      // Save pending details if they exist
      await savePendingDetails();

      navigate('/home');
    } catch (error: any) {
      console.error('Signup form error:', error);

      // Display the specific error message from the auth context
      const errorMessage = error.message || 'Failed to create an account';
      setError(errorMessage);
    }
    setLoading(false);
  }

  async function handleGoogleSignup(): Promise<void> {
    try {
      setError('');
      setLoading(true);

      // googleLogin() now uses signInWithPopup - returns user credential directly
      const userCredential = await googleLogin();

      // Save pending athlete profile data and navigate to home
      await savePendingDetails();
      navigate('/home');
    } catch (error) {
      setError('Failed to sign up with Google');
      console.error('Google signup error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignup(): Promise<void> {
    try {
      setError('');
      setLoading(true);
      await appleLogin();

      // Wait for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Save pending details if they exist
      await savePendingDetails();

      navigate('/home');
    } catch (error) {
      console.error('Apple signup error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/operation-not-allowed') {
          setError('Apple Sign-in is not enabled. Please contact support.');
        } else if (firebaseError.code === 'auth/cancelled-popup-request') {
          setError('Sign-in was cancelled');
        } else {
          setError('Failed to sign up with Apple');
        }
      } else {
        setError('Failed to sign up with Apple');
      }
    }
    setLoading(false);
  }

  const handleHomeClick = (): void => {
    // Force full page reload to ensure WelcomePage renders correctly
    window.location.href = '/';
  };

  return (
    <div className="auth-container auth-page">
      <button className="home-btn" onClick={handleHomeClick} title="Go to Welcome Page">
        <Home size={20} />
      </button>
      <div className="auth-controls-only">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <h1>AmaPlayer</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          <div className="form-group">
            <input
              type="text"
              placeholder="Full Name"
              value={displayName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="form-group password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button disabled={loading} type="submit" className="auth-btn">
            Sign Up
          </button>
        </form>
        <div className="social-login">
          <button
            disabled={loading}
            className="auth-btn google-btn"
            onClick={handleGoogleSignup}
          >
            Sign up with Google
          </button>
          <button
            disabled={loading}
            className="auth-btn apple-btn"
            onClick={handleAppleSignup}
          >
            Sign up with Apple
          </button>
        </div>

        <div className="auth-link-section">
          <p>Already have an account?</p>
          <button
            className="auth-link-btn"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
