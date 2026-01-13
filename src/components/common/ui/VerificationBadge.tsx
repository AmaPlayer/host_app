// Verification Badge Component - Shows verification status next to profile image
import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import VerificationService from '../../../services/api/verificationService';
import ShareVerificationModal from '../modals/ShareVerificationModal';
import './VerificationBadge.css';

interface VerificationBadgeProps {
  profile?: {
    isVerified?: boolean;
    verificationBadge?: {
      icon: string;
      label: string;
    };
    role?: string;
  } | null;
  isOwnProfile?: boolean;
  onVerificationRequest?: () => void;
  showTooltip?: boolean;
  inline?: boolean;
}

interface VerificationRequest {
  status: string;
  verificationCount: number;
  verificationGoal: number;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  profile,
  isOwnProfile,
  onVerificationRequest,
  showTooltip = true,
  inline = false
}) => {
  const { currentUser, isGuest } = useAuth();
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  useEffect(() => {
    if (isOwnProfile && currentUser && !profile?.isVerified) {
      fetchVerificationRequest().catch(error => {
        console.error('Failed to fetch verification request:', error);
        // Don't crash the component on network errors
      });
    }
  }, [isOwnProfile, currentUser, profile?.isVerified]);

  const fetchVerificationRequest = async () => {
    try {
      const request = await VerificationService.getUserVerificationRequest(currentUser.uid);
      setVerificationRequest(request);
    } catch (error) {
      console.error('Error fetching verification request:', error);
    }
  };

  const handleRequestVerification = async () => {
    if (!currentUser || (isGuest && isGuest())) {
      alert('Please sign up or log in to request verification');
      return;
    }

    setLoading(true);
    try {
      // Check eligibility first
      const eligibility = await VerificationService.canRequestVerification(currentUser.uid);
      if (!eligibility.canRequest) {
        alert(eligibility.reason);
        setLoading(false);
        return;
      }

      // Call parent handler to open verification request modal
      if (onVerificationRequest) {
        onVerificationRequest();
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      alert('Failed to request verification. Please try again.');
    }
    setLoading(false);
  };

  const handleShareVerification = () => {
    if (verificationRequest && verificationRequest.status === 'pending') {
      setShowShareModal(true);
    }
  };

  const getRoleIcon = (role: string): string => {
    const icons: Record<string, string> = {
      athlete: '🏆',
      coach: '🏃‍♂️',
      organisation: '🏢'
    };
    return icons[role] || '🏆';
  };

  const getVerificationProgress = (): {
    current: number;
    goal: number;
    percentage: number;
    remaining: number;
  } | null => {
    if (!verificationRequest) return null;

    const { verificationCount, verificationGoal } = verificationRequest;
    const percentage = Math.min(100, (verificationCount / verificationGoal) * 100);

    return {
      current: verificationCount,
      goal: verificationGoal,
      percentage,
      remaining: Math.max(0, verificationGoal - verificationCount)
    };
  };

  // Verified user badge
  if (profile?.isVerified) {
    const badge = profile.verificationBadge || VerificationService.getRoleBadge(profile.role || 'athlete');

    return (
      <div className={`verification-container verified ${inline ? 'inline' : ''}`}>
        <div className="verification-badge verified-shield" title={badge.label}>
          {/* Blue fill with white tick (lucide ShieldCheck has a tick cut-out or stroke) */}
          <ShieldCheck size={28} color="#1D9BF0" fill="#1D9BF0" className="shield-icon" />
          <div className="check-mark" style={{
            position: 'absolute',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}>✓</div>
        </div>
        {showTooltip && (
          <div className="verification-tooltip">
            {badge.label}
          </div>
        )}
      </div>
    );
  }

  // Own profile - show request button or pending status
  if (isOwnProfile && (!isGuest || !isGuest())) {
    // Has pending verification request
    if (verificationRequest && verificationRequest.status === 'pending') {
      const progress = getVerificationProgress();

      return (
        <>
          <div className="verification-container pending">
            <button
              className="verification-badge pending-badge clickable"
              title="Click to share verification link"
              onClick={handleShareVerification}
            >
              <span className="badge-icon">⏳</span>
              <div className="progress-ring">
                <div
                  className="progress-fill"
                  style={{ '--progress': `${progress.percentage}%` } as React.CSSProperties}
                ></div>
              </div>
              <span className="progress-count">{progress.current}/{progress.goal}</span>
            </button>
            {showTooltip && (
              <div className="verification-tooltip">
                Verification in progress<br />
                {progress.remaining} more verification{progress.remaining !== 1 ? 's' : ''} needed<br />
                <strong>Click to share link again</strong>
              </div>
            )}
          </div>

          <ShareVerificationModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            verificationRequest={verificationRequest as any}
          />
        </>
      );
    }

    // Show request verification button
    return (
      <div className="verification-container request">
        <button
          className="verification-badge request-badge"
          onClick={handleRequestVerification}
          disabled={loading}
          title="Request verification"
        >
          <span className="badge-icon">{loading ? '⏳' : '⭐'}</span>
        </button>
        {showTooltip && (
          <div className="verification-tooltip">
            {loading ? 'Checking eligibility...' : 'Please verify your profile by sharing the talent video link to others'}
          </div>
        )}
      </div>
    );
  }

  // Other user's profile - don't show anything if not verified
  return null;
};

export default VerificationBadge;