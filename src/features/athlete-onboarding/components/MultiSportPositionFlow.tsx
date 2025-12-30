import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import AthleteOnboardingLayout from './AthleteOnboardingLayout';
import { useOnboardingStore, Sport, Position } from '../store/onboardingStore';
import { getPositionsBySportId } from '../data/positionsConfig';
import { SportPositionPair } from '../types/MultiSportProfile';
import '../styles/MultiSportPositionFlow.css';

const MultiSportPositionFlow: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSports, setPosition, setError, error } = useOnboardingStore();
  
  const [currentSportIndex, setCurrentSportIndex] = useState(0);
  const [sportPositions, setSportPositions] = useState<SportPositionPair[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentSport = selectedSports[currentSportIndex];
  const isLastSport = currentSportIndex === selectedSports.length - 1;
  const currentSportPosition = sportPositions.find(sp => sp.sport.id === currentSport?.id);

  // Load positions for current sport
  useEffect(() => {
    if (!currentSport) {
      navigate('/athlete-onboarding/sport');
      return;
    }

    const sportPositions = getPositionsBySportId(currentSport.id);
    setPositions(sportPositions);
    setValidationErrors([]);
    setError(null);
  }, [currentSport, setError, navigate]);

  const handlePositionSelect = (position: Position) => {
    if (!currentSport) return;

    // Update or add sport-position pair
    setSportPositions(prev => {
      const existingIndex = prev.findIndex(sp => sp.sport.id === currentSport.id);
      const newPair: SportPositionPair = {
        sport: currentSport,
        position,
        isPrimary: currentSportIndex === 0 // First sport is primary
      };

      if (existingIndex >= 0) {
        // Update existing pair
        const updated = [...prev];
        updated[existingIndex] = newPair;
        return updated;
      } else {
        // Add new pair
        return [...prev, newPair];
      }
    });

    setValidationErrors([]);
    setError(null);
  };

  const handleContinue = () => {
    if (!currentSportPosition) {
      setValidationErrors([`Please select a position for ${currentSport.name}`]);
      setError(`Please select a position for ${currentSport.name}`);
      return;
    }

    if (isLastSport) {
      // All sports completed, save to store and continue to subcategory
      // Save primary position to store (or first one) to ensure it appears in the profile banner
      const primary = sportPositions.find(sp => sp.isPrimary) || sportPositions[0];
      if (primary) {
        setPosition(primary.position);
      }

      navigate('/athlete-onboarding/subcategory');
    } else {
      // Move to next sport
      setCurrentSportIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSportIndex > 0) {
      // Go to previous sport
      setCurrentSportIndex(prev => prev - 1);
    } else {
      // Go back to sport selection
      navigate('/athlete-onboarding/sport');
    }
  };

  const getProgressText = () => {
    const completed = sportPositions.length;
    const total = selectedSports.length;
    return `${completed}/${total} sports configured`;
  };

  if (!currentSport) {
    return (
      <AthleteOnboardingLayout title="Loading..." showBackButton={false}>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading sport information...</p>
        </div>
      </AthleteOnboardingLayout>
    );
  }

  return (
    <AthleteOnboardingLayout
      title={`Choose Position for ${currentSport.name}`}
      showBackButton={true}
      onBack={handleBack}
    >
      <div className="multi-sport-position-container">
        {/* Progress indicator */}
        <div className="sport-progress">
          <div className="progress-text">
            <span className="current-sport">Sport {currentSportIndex + 1} of {selectedSports.length}</span>
            <span className="progress-summary">{getProgressText()}</span>
          </div>
          
          {/* Sport progress dots */}
          <div className="sport-dots">
            {selectedSports.map((sport, index) => {
              const isCompleted = sportPositions.some(sp => sp.sport.id === sport.id);
              const isCurrent = index === currentSportIndex;
              
              return (
                <div 
                  key={sport.id}
                  className={`sport-dot ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
                  title={sport.name}
                >
                  {isCompleted ? <Check size={12} /> : index + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current sport info */}
        <div className="current-sport-header">
          <div className="sport-info">
            <h2>{currentSport.name}</h2>
            <p>Select your position in {currentSport.name}</p>
          </div>
          
          {currentSportPosition && (
            <div className="selected-position-preview">
              <span className="label">Selected:</span>
              <span className="position-name">{currentSportPosition.position.name}</span>
            </div>
          )}
        </div>

        {/* Error display */}
        {(error || validationErrors.length > 0) && (
          <div className="validation-error-container" role="alert">
            <div className="validation-error">
              <AlertCircle size={20} className="error-icon" />
              <span>{error || validationErrors.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Positions list */}
        <div className="positions-list">
          {positions.map((position) => (
            <div
              key={position.id}
              className={`position-item ${currentSportPosition?.position.id === position.id ? 'selected' : ''}`}
              onClick={() => handlePositionSelect(position)}
            >
              <div className="position-radio">
                <input
                  type="radio"
                  checked={currentSportPosition?.position.id === position.id}
                  onChange={() => {}} // Handled by parent click
                  tabIndex={-1}
                />
                <div className="radio-custom">
                  {currentSportPosition?.position.id === position.id && (
                    <span className="radio-dot"></span>
                  )}
                </div>
              </div>
              
              <div className="position-content">
                <div className="position-name">{position.name}</div>
                {position.description && (
                  <div className="position-description">{position.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="navigation-section">
          <button
            className={`continue-btn ${!currentSportPosition ? 'disabled' : ''}`}
            onClick={handleContinue}
            disabled={!currentSportPosition || isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner" />
                Loading...
              </>
            ) : isLastSport ? (
              <>
                Complete Position Selection
                <ChevronRight size={20} />
              </>
            ) : (
              <>
                Next Sport ({selectedSports[currentSportIndex + 1]?.name})
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* Summary of completed sports */}
        {sportPositions.length > 0 && (
          <div className="completed-sports-summary">
            <h3>Your Sports & Positions:</h3>
            <div className="sport-position-list">
              {sportPositions.map((sp, index) => (
                <div key={sp.sport.id} className="sport-position-item">
                  <span className="sport-name">{sp.sport.name}</span>
                  <span className="separator">•</span>
                  <span className="position-name">{sp.position.name}</span>
                  {sp.isPrimary && <span className="primary-badge">Primary</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AthleteOnboardingLayout>
  );
};

export default MultiSportPositionFlow;