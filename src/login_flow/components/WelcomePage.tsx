import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@hooks/useLanguage';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import './WelcomePage.css';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to hide/show header controls
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past 50px - hide header
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const handleLetsPlayClick = (): void => {
    navigate('/role-selection');
  };

  return (
    <div className="welcome-container">
      <div className={`welcome-header ${isHeaderVisible ? 'visible' : 'hidden'}`}>
        <div className="welcome-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <div className="background-graphic">
        <div className="glowing-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="content">
        <div className="tagline">{t('tagline')}</div>
        <h1 className="main-title">AmaPlayer</h1>
        <p className="subtitle">{t('subtitle')}</p>

        <div className="button-group">
          <button className="login-btn" onClick={handleLetsPlayClick}>
            {t('letsPlay')}
          </button>
          <button className="secondary-btn" onClick={() => navigate('/login')}>
            {t('login')}
          </button>
        </div>

        {/* Vision and Mission Section */}
        <div className="vision-mission-section">
          <div className="vision-mission-card">
            <div className="card-icon vision-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <h3 className="card-title">{t('vision') || 'Our Vision'}</h3>
            <p className="card-description">
              {t('visionText') || 'To unlock India’s untapped sporting talent by creating a platform that connects players with national and global sports ecosystems. Strengthening India’s sporting future by turning potential into performance.'}
            </p>
          </div>

          <div className="vision-mission-card">
            <div className="card-icon mission-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="card-title">{t('mission') || 'Our Mission'}</h3>
            <p className="card-description">
              {t('missionText') || 'To help India produce champions by connecting talent with the right opportunities.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
