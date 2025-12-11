import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Star, ChevronRight } from 'lucide-react';
import { useOnboardingStore, AthleteProfile } from '../store/onboardingStore';
import ThemeToggle from '../../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../../components/common/forms/LanguageSelector';
import useTranslation from '../../../login_flow/hooks/useTranslation';
import '../styles/AthleteAboutPage.css';

const AthleteAboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getAthleteProfile, resetOnboarding } = useOnboardingStore();
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);

  useEffect(() => {
    // Get the athlete profile from the store or localStorage
    const profile = getAthleteProfile();
    
    // If no profile in store, try to get from localStorage
    if (!profile.sports || profile.sports.length === 0 || !profile.position) {
      try {
        const savedProfile = localStorage.getItem('athlete-profile');
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          setAthleteProfile(parsedProfile);
        } else {
          // No profile found, redirect to onboarding
          navigate('/athlete-onboarding/sport');
          return;
        }
      } catch (error) {
        console.error('Failed to load athlete profile:', error);
        navigate('/athlete-onboarding/sport');
        return;
      }
    } else {
      setAthleteProfile(profile);
    }
  }, [getAthleteProfile, navigate]);

  const handleContinue = (): void => {
    navigate('/athlete-onboarding/personal-details');
  };

  const handleEditProfile = (): void => {
    // Reset onboarding and go back to sport selection
    resetOnboarding();
    navigate('/athlete-onboarding/sport');
  };

  const getSpecializationDisplay = (specializations: Record<string, string>): string => {
    const values = Object.values(specializations);
    if (values.length === 0) return 'No specializations selected';
    return values.join(', ');
  };

  if (!athleteProfile) {
    return (
      <div className="athlete-about-loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="athlete-about-container">
      <div className="athlete-about-header">
        <div className="athlete-about-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      
      <div className="athlete-about-content">
        <div className="athlete-profile-header">
          <div className="athlete-badge">
            <img 
              src={athleteProfile.sports?.[0]?.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'} 
              alt={athleteProfile.sports?.[0]?.name || 'Athlete'} 
              className="athlete-badge-image" 
            />
            <div className="athlete-badge-info">
              <span className="athlete-badge-text">
                {t('joiningAs', 'Joining as')} Athlete
              </span>
              <div className="athlete-sport-position">
                <span className="sport-name">
                  {athleteProfile.sports?.map(sport => sport.name).join(', ') || 'Multiple Sports'}
                </span>
                <span className="position-separator">•</span>
                <span className="position-name">{athleteProfile.position?.name}</span>
                {athleteProfile.subcategory && (
                  <>
                    <span className="position-separator">•</span>
                    <span className="subcategory-name">{athleteProfile.subcategory.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <h1 className="athlete-about-title">
            Welcome to AmaPlayer!
          </h1>
          <p className="athlete-about-subtitle">
            Your personalized sports journey starts here
          </p>
        </div>

        <div className="athlete-profile-summary">
          <div className="profile-card">
            <div className="card-icon sport-icon">
              <Trophy size={32} />
            </div>
            <h3 className="card-title">Your Sports</h3>
            <p className="card-description">
              <strong>{athleteProfile.sports?.map(sport => sport.name).join(', ') || 'Multiple Sports'}</strong>
            </p>
            <p className="card-subdescription">
              Ready to connect with fellow athletes
            </p>
          </div>

          <div className="profile-card">
            <div className="card-icon position-icon">
              <Target size={32} />
            </div>
            <h3 className="card-title">Your Position & Specialty</h3>
            <p className="card-description">
              <strong>{athleteProfile.position?.name}</strong>
              {athleteProfile.subcategory && (
                <>
                  <br />
                  <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    {athleteProfile.subcategory.name}
                  </span>
                </>
              )}
            </p>
            <p className="card-subdescription">
              Your specialized area of expertise
            </p>
          </div>

          {Object.keys(athleteProfile.specializations).length > 0 && (
            <div className="profile-card">
              <div className="card-icon specialization-icon">
                <Star size={32} />
              </div>
              <h3 className="card-title">Your Specializations</h3>
              <p className="card-description">
                <strong>{getSpecializationDisplay(athleteProfile.specializations)}</strong>
              </p>
              <p className="card-subdescription">
                Your unique playing style and preferences
              </p>
            </div>
          )}
        </div>

        <div className="mission-vision-grid">
          <div className="mission-card">
            <div className="card-icon mission-icon">🎯</div>
            <h3 className="card-title">{t('ourMission')}</h3>
            <p className="card-description">
              {t('missionDescription', "To create the world's most comprehensive platform that connects athletes, coaches, and organizations, fostering talent development and creating opportunities for athletic excellence across all sports disciplines.")}
            </p>
          </div>

          <div className="vision-card">
            <div className="card-icon vision-icon">🌟</div>
            <h3 className="card-title">{t('ourVision')}</h3>
            <p className="card-description">
              {t('visionDescription', 'To revolutionize the sports industry by building a global ecosystem where every athlete has access to world-class coaching, every coach can discover exceptional talent, and every organization can build championship-winning teams.')}
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

        <div className="athlete-about-actions">
          <button className="continue-btn" onClick={handleContinue}>
            {t('continueToLogin')}
            <ChevronRight size={20} />
          </button>
          <button className="edit-profile-btn" onClick={handleEditProfile}>
            Edit My Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default AthleteAboutPage;