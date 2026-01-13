import { useState, useRef } from 'react';
import { Settings } from 'lucide-react';
import SettingsMenu from '../../../components/common/settings/SettingsMenu';
import { User } from 'firebase/auth';
import './NavigationBar.css';

interface NavigationBarProps {
  currentUser: User | null;
  isGuest: boolean;
  onTitleClick: () => void;
  title?: string;
}

/**
 * NavigationBar Component
 * 
 * Handles top navigation, user actions, and app branding.
 */
const NavigationBar = ({ currentUser, isGuest, onTitleClick, title = "AmaPlayer" }: NavigationBarProps) => {
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return (
    <nav className="nav-bar" role="navigation" aria-label="Main navigation">
      <div className="nav-content">
        <h1
          className="app-title"
          onClick={onTitleClick}
          role="button"
          tabIndex={0}
          aria-label={`${title} - Click to refresh and scroll to top`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTitleClick();
            }
          }}
        >
          <img src="/logo2.png" alt={title} className="app-logo" />
        </h1>

        <div className="nav-links">
          {isGuest && (
            <span
              className="guest-indicator"
              role="status"
              aria-label="Currently in guest mode"
            >
              Guest Mode
            </span>
          )}

          <div className="settings-container">
            <button
              ref={settingsButtonRef}
              className="settings-btn"
              onClick={handleSettingsToggle}
              aria-label="Open settings menu"
              aria-expanded={settingsOpen}
              aria-haspopup="true"
              title="Settings"
              type="button"
            >
              <Settings size={24} aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </button>

            <SettingsMenu
              isOpen={settingsOpen}
              onClose={handleSettingsClose}
              isGuest={isGuest}
              triggerButtonRef={settingsButtonRef}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;