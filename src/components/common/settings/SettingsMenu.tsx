import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Sun,
  Globe,
  Lock,
  FileText,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSelector from '../forms/LanguageSelector';
import Portal from '../ui/Portal';
import './SettingsMenu.css';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest: boolean;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
  currentUser?: User | null;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  isGuest,
  triggerButtonRef,
  currentUser,
}) => {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting'>('entering');

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerButtonRef?.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Add slight delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerButtonRef]);

  // Close menu on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  // Handle animation state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Start with entering state
      setAnimationState('entering');
      // Immediately transition to entered state to trigger smooth animation
      const timer = setTimeout(() => {
        setAnimationState('entered');
      }, 10); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer);
    } else {
      setAnimationState('entering'); // Reset for next open
    }
  }, [isOpen]);

  const handleNavigateToSettings = () => {
    onClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout failed:', error);
    }
  };

  const handlePrivacyPolicy = () => {
    window.open('/privacy-policy.html', '_blank');
  };

  if (!isOpen) return null;

  // Render modal to document body using Portal
  return (
    <Portal containerId="settings-modal-root">
      {/* Dark Overlay */}
      <div 
        className={`settings-menu-overlay ${animationState}`} 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        className={`settings-menu-modal ${animationState}`} 
        ref={menuRef} 
        role="dialog" 
        aria-label="Settings menu"
      >
        {/* Close Button */}
        <button
          className="settings-menu-close-btn"
          onClick={onClose}
          aria-label="Close settings menu"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="settings-menu-modal-header">
          <Settings size={28} />
          <h2>{t('settings')}</h2>
        </div>

        {/* Content */}
        <div className="settings-menu-modal-content">
          {/* Account Settings - Authenticated users only */}
          {!isGuest && (
            <div className="settings-menu-section">
              <button
                className="settings-menu-option"
                onClick={handleNavigateToSettings}
              >
                <div className="settings-option-icon">
                  <Settings size={24} />
                </div>
                <div className="settings-option-text">
                  <h3>{t('accountSettings')}</h3>
                  <p>{t('manageProfile')}</p>
                </div>
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <div className="settings-menu-section">
            <h4 className="settings-section-title">{t('appearance')}</h4>
            <div className="settings-menu-option theme-option">
              <div className="settings-option-icon">
                <Sun size={24} />
              </div>
              <div className="settings-option-text">
                <h3>{t('theme')}</h3>
                <p>{t('choosePreferredTheme')}</p>
              </div>
              <div className="settings-option-control">
                <ThemeToggle inline={true} showLabel={false} />
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="settings-menu-section">
            <h4 className="settings-section-title">{t('language')}</h4>
            <div className="settings-menu-option language-option">
              <div className="settings-option-icon">
                <Globe size={24} />
              </div>
              <div className="settings-option-text">
                <h3>{t('language')}</h3>
                <p>{t('selectPreferredLanguage')}</p>
              </div>
              <div className="settings-option-control">
                <LanguageSelector inline={true} showLabel={false} dropdownPosition="left" />
              </div>
            </div>
          </div>

          {/* Change Password - Authenticated users only */}
          {!isGuest && (
            <div className="settings-menu-section">
              <button
                className="settings-menu-option"
                onClick={() => {
                  onClose();
                  navigate('/settings?tab=security');
                }}
              >
                <div className="settings-option-icon">
                  <Lock size={24} />
                </div>
                <div className="settings-option-text">
                  <h3>{t('changePassword')}</h3>
                  <p>{t('updatePassword')}</p>
                </div>
              </button>
            </div>
          )}

          {/* Privacy Policy */}
          <div className="settings-menu-section">
            <button
              className="settings-menu-option"
              onClick={handlePrivacyPolicy}
            >
              <div className="settings-option-icon">
                <FileText size={24} />
              </div>
              <div className="settings-option-text">
                <h3>{t('privacyPolicy')}</h3>
                <p>{t('readPrivacyTerms')}</p>
              </div>
            </button>
          </div>

          {/* Logout / Sign In */}
          <div className="settings-menu-section logout-section">
            <button
              className="settings-menu-option logout-option"
              onClick={handleLogout}
            >
              <div className="settings-option-icon">
                <LogOut size={24} />
              </div>
              <div className="settings-option-text">
                <h3>{isGuest ? t('signIn') : t('logout')}</h3>
                <p>{isGuest ? t('signInToAccount') : t('signOutFromAccount')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default SettingsMenu;
