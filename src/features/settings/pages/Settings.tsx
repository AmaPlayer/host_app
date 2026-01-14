import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Shield, Eye, Bell, Sun, Globe, Mail, Lock, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../hooks/useLanguage';
import PasswordChangeSection from '../components/PasswordChangeSection';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ThemeToggle from '../../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../../components/common/forms/LanguageSelector';
import '../styles/Settings.css';

interface SettingsPageProps {
  initialTab?: 'account' | 'security' | 'privacy' | 'notifications' | 'preferences';
}

const Settings: React.FC<SettingsPageProps> = ({ initialTab = 'account' }) => {
  const { currentUser, isGuest } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isLoading] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const tabs = [
    { id: 'account', label: t('accountSettings'), icon: User },
    { id: 'preferences', label: t('preferences'), icon: SettingsIcon },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'privacy', label: t('privacy'), icon: Eye },
    { id: 'notifications', label: t('notifications'), icon: Bell }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="settings-tab-content">
            <h3>{t('accountSettings')}</h3>
            <p>{t('manageAccount')}</p>

            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <User size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('displayName')}</h4>
                  <p>{t('publicDisplayName')}</p>
                  <input
                    type="text"
                    placeholder={t('enterDisplayName')}
                    value={currentUser?.displayName || ''}
                    className="setting-input"
                  />
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-icon">
                  <Mail size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('emailAddress')}</h4>
                  <p>{t('accountEmail')}</p>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    className="setting-input"
                    disabled
                  />
                </div>
              </div>

              <div className="setting-actions">
                <button className="save-btn">
                  <Check size={16} />
                  {t('saveChanges')}
                </button>
              </div>
            </div>

            <div className="settings-section danger-zone">
              <div className="setting-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={20} color="#ef4444" />
                <h4 style={{ color: '#ef4444', margin: 0 }}>{t('dangerZone') || 'Danger Zone'}</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                {t('dangerZoneDescription') || 'Irreversible actions for your account.'}
              </p>

              <div className="setting-item" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div className="setting-content">
                  <h4 style={{ color: '#ef4444' }}>{t('deleteAccount') || 'Delete Account'}</h4>
                  <p>{t('deleteAccountWarning') || 'Permanently remove your account and all data.'}</p>
                </div>
                <button
                  className="delete-account-btn"
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('deleteAccount') || 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="settings-tab-content">
            <h3>{t('appPreferences')}</h3>
            <p>{t('customizeExperience')}</p>

            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Sun size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('theme')}</h4>
                  <p>{t('chooseTheme')}</p>
                  <div className="setting-control">
                    <ThemeToggle inline={false} showLabel={true} />
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-icon">
                  <Globe size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('language')}</h4>
                  <p>{t('selectLanguage')}</p>
                  <div className="setting-control">
                    <LanguageSelector inline={false} showLabel={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="settings-tab-content">
            <h3>{t('securitySettings')}</h3>
            <p>{t('manageSecurity')}</p>

            {!isGuest() && currentUser ? (
              <PasswordChangeSection />
            ) : (
              <div className="settings-section">
                <div className="setting-item">
                  <div className="setting-icon">
                    <Lock size={20} />
                  </div>
                  <div className="setting-content">
                    <h4>{t('passwordManagement')}</h4>
                    <p>{t('signInToManage')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'privacy':
        return (
          <div className="settings-tab-content">
            <h3>{t('privacySettings')}</h3>
            <p>{t('controlPrivacy')}</p>

            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Eye size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('profileVisibility')}</h4>
                  <p>{t('chooseWhoCanSee')}</p>
                  <select className="setting-select">
                    <option value="public">{t('public')}</option>
                    <option value="friends">{t('friendsOnly')}</option>
                    <option value="private">{t('private')}</option>
                  </select>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-content">
                  <h4>{t('activityStatus')}</h4>
                  <p>{t('showActive')}</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{t('showActive')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-tab-content">
            <h3>{t('notificationPreferences')}</h3>
            <p>{t('manageNotifications')}</p>

            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Bell size={20} />
                </div>
                <div className="setting-content">
                  <h4>{t('emailNotifications')}</h4>
                  <p>{t('receiveEmailNotifications')}</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{t('enableEmailNotifications')}</span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-content">
                  <h4>{t('pushNotifications')}</h4>
                  <p>{t('receivePushNotifications')}</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{t('enablePushNotifications')}</span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-content">
                  <h4>{t('achievementNotifications')}</h4>
                  <p>{t('notifyAchievements')}</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{t('enableAchievementNotifications')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="settings-tab-content">
            <h3>{t('settings')}</h3>
            <p>{t('selectTab')}</p>
          </div>
        );
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title">
          <SettingsIcon size={24} />
          <h1>{t('settings')}</h1>
        </div>
      </div>

      <div className="settings-container">
        <nav className="settings-nav">
          <ul className="settings-tabs">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    type="button"
                    aria-label={`Switch to ${tab.label} settings`}
                  >
                    <IconComponent size={18} />
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="settings-content">
          {isLoading ? (
            <div className="settings-loading">
              <div className="loading-spinner"></div>
              <p>Loading settings...</p>
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default Settings;