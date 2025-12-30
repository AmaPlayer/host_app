import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@hooks/useLanguage';
import { TranslationKey } from '../../types/contexts/language';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import './AuthChoicePage.css';

interface RoleImages {
  [key: string]: string;
}

const AuthChoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();
  const { t } = useLanguage();

  // Role images (same as AboutPage)
  const roleImages: RoleImages = {
    athlete: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    coach: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    organization: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    parent: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  };

  // Validate role and redirect if invalid
  useEffect(() => {
    const validRoles = ['athlete', 'coach', 'organization', 'parent'];
    if (!role || !validRoles.includes(role)) {
      console.warn('Invalid role provided to AuthChoicePage:', role);
      navigate('/');
    }
  }, [role, navigate]);

  const handleLogin = (): void => {
    if (role) {
      localStorage.setItem('selectedUserRole', role);
      navigate(`/login/${role}`);
    }
  };

  const handleSignup = (): void => {
    if (role) {
      localStorage.setItem('selectedUserRole', role);
      navigate('/signup');
    }
  };

  const handleBack = (): void => {
    navigate('/');
  };

  // Don't render if role is invalid (will redirect)
  if (!role || !roleImages[role]) {
    return null;
  }

  return (
    <div className="auth-choice-container">
      <div className="auth-choice-header">
        <div className="auth-choice-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <div className="auth-choice-content">
        <div className="role-badge">
          <img
            src={roleImages[role]}
            alt={t(role as TranslationKey)}
            className="role-badge-image"
          />
          <span className="role-badge-text">
            {t('joiningAs', 'Joining as')} {t(role as TranslationKey)}
          </span>
        </div>

        <h1 className="auth-choice-title">{t('welcomeToAmaplayer', 'Welcome to AmaPlayer!')}</h1>
        <p className="auth-choice-subtitle">{t('howToContinue', 'How would you like to continue?')}</p>

        <div className="auth-choice-buttons">
          <button className="auth-choice-btn login-btn" onClick={handleLogin}>
            {t('loginToExisting', 'Login to Existing Account')}
          </button>
          <button className="auth-choice-btn signup-btn" onClick={handleSignup}>
            {t('createNewAccount', 'Create New Account')}
          </button>
        </div>

        <button className="back-link" onClick={handleBack}>
          ← {t('backToRoleSelection', 'Back to Role Selection')}
        </button>
      </div>
    </div>
  );
};

export default AuthChoicePage;
