import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import ThemeToggle from '../../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../../components/common/forms/LanguageSelector';
import SimpleProgressBar from '../../../components/common/media/SimpleProgressBar';
import { useOnboardingNavigation } from '../hooks/useOnboardingNavigation';
import { useOnboardingStore } from '../store/onboardingStore';
import OnboardingErrorBoundary from './OnboardingErrorBoundary';
import '../styles/AthleteOnboardingLayout.css';
import '../styles/OnboardingErrorBoundary.css';

interface AthleteOnboardingLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const AthleteOnboardingLayout: React.FC<AthleteOnboardingLayoutProps> = ({
  children,
  title,
  showBackButton,
  onBack
}) => {
  const navigation = useOnboardingNavigation();
  const { error, setError, isLoading } = useOnboardingStore();

  const currentStep = navigation.getCurrentStep();
  const currentStepNumber = navigation.getCurrentStepNumber();
  const totalSteps = navigation.getTotalSteps();
  const canGoBack = navigation.canGoBack();

  const progressPercentage = (currentStepNumber / totalSteps) * 100;
  const displayTitle = title || currentStep?.title || 'Athlete Onboarding';
  const shouldShowBackButton = showBackButton === true || (showBackButton !== false && canGoBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  return (
    <OnboardingErrorBoundary
      showRetry={true}
      showNavigation={true}
      onError={(error, errorInfo) => {
        console.error('AthleteOnboardingLayout Error:', error, errorInfo);
        // Could send to error reporting service here
      }}
    >
      <div className="athlete-onboarding-container">
        {/* Header with controls */}
        <div className="onboarding-header">
          <div className="header-left">
            {shouldShowBackButton && (
              <button 
                className="back-btn" 
                onClick={handleBack}
                aria-label="Go back to previous step"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>
          
          <div className="header-right">
            <div className="header-controls">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
            <button 
              className="error-dismiss"
              onClick={handleDismissError}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Progress indicator */}
        <div className="progress-section">
          <div className="progress-info">
            <h1 className="onboarding-title">{displayTitle}</h1>
            <span className="step-counter">
              Step {currentStepNumber} of {totalSteps}
            </span>
          </div>

          <div className="progress-bar-container">
            <SimpleProgressBar
              percentage={progressPercentage}
              showPercentage={true}
              interactive={false}
              className="onboarding-progress"
            />
          </div>
        </div>

        {/* Main content area */}
        <div className={`onboarding-content ${isLoading ? 'loading-state' : ''}`}>
          {children}
        </div>
      </div>
    </OnboardingErrorBoundary>
  );
};

export default AthleteOnboardingLayout;