import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import './NotificationPrompt.css';

interface NotificationPromptProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * NotificationPrompt component - displays a notification permission request prompt
 */
const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  visible,
  onEnable,
  onDismiss,
  loading = false,
  error = null
}) => {
  const { t } = useLanguage();

  if (!visible) return null;

  return (
    <div className="notification-prompt">
      <div className="notification-prompt-header">
        <span className="notification-prompt-icon">🔔</span>
        <h3 className="notification-prompt-title">{t('stayUpdated')}</h3>
      </div>

      <p className="notification-prompt-message">
        {t('getNotifiedWhenSomeoneLikes')}
      </p>

      {error && (
        <div className="notification-prompt-error">
          {error}
        </div>
      )}

      <div className="notification-prompt-actions">
        <button
          onClick={onEnable}
          disabled={loading}
          className="notification-prompt-enable-btn"
          aria-label="Enable notifications"
        >
          {loading ? t('enabling') : t('enable')}
        </button>
        <button
          onClick={onDismiss}
          disabled={loading}
          className="notification-prompt-dismiss-btn"
          aria-label="Dismiss notification prompt"
        >
          {t('maybelater')}
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;