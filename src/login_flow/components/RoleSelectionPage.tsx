import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@hooks/useLanguage';
import { TranslationKey } from '../../types/contexts/language';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import './RoleSelectionPage.css';

interface Role {
  id: string;
  title: string;
  image: string;
  description: string;
}

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const roles: Role[] = [
    {
      id: 'athlete',
      title: 'athlete',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      description: 'athleteDescription'
    },
    {
      id: 'coach',
      title: 'coach',
      image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      description: 'coachDescription'
    },
    {
      id: 'organization',
      title: 'organization',
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      description: 'organizationDescription'
    },
    {
      id: 'parent',
      title: 'parent',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      description: 'parentDescription'
    }
  ];

  const handleRoleSelect = (roleId: string): void => {
    if (roleId === 'athlete') {
      // Redirect athletes to the onboarding flow
      navigate('/athlete-onboarding/sport');
    } else {
      // Other roles go directly to about page
      navigate(`/about/${roleId}`);
    }
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-header">
        <div className="role-selection-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      
      <div className="header">
        <h1 className="welcome-title">{t('welcomeToAmaplayer')}</h1>
        <p className="welcome-subtitle">{t('chooseYourRole')}</p>
      </div>

      <div className="roles-grid">
        {roles.map((role) => (
          <div 
            key={role.id} 
            className="role-card"
            onClick={() => handleRoleSelect(role.id)}
          >
            <div className="role-image-container">
              <img
                src={role.image}
                alt={t(role.title as TranslationKey)}
                className="role-image"
                loading="lazy"
              />
            </div>
            <div className="role-content">
              <h3 className="role-title">{t(role.title as TranslationKey)}</h3>
              <p className="role-description">{t(role.description as TranslationKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <button 
        className="back-button"
        onClick={() => navigate('/')}
      >
        ← {t('backToHome', 'Back to Home')}
      </button>
    </div>
  );
};

export default RoleSelectionPage;
