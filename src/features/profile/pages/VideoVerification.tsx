import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, AlertCircle, Video, Users } from 'lucide-react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { TalentVideo, VideoVerification } from '../types/TalentVideoTypes';
import { useAuth } from '../../../contexts/AuthContext';
// CSS injected directly in component to ensure Portal rendering consistency

interface VerificationFormData {
  verifierName: string;
  verifierEmail: string;
  verifierRelationship: 'coach' | 'teammate' | 'parent' | 'friend' | 'witness' | 'other';
  verificationMessage: string;
}

// Helper function to remove undefined values from objects
const cleanObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  if (typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanObject(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};



const VideoVerificationPage: React.FC = () => {
  const { userId, videoId } = useParams<{ userId: string; videoId: string }>();
  const { currentUser } = useAuth();

  const [searchParams] = useSearchParams();
  const [video, setVideo] = useState<TalentVideo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [userAgent, setUserAgent] = useState<string>('');

  const [formData, setFormData] = useState<VerificationFormData>({
    verifierName: '',
    verifierEmail: '',
    verifierRelationship: 'witness',
    verificationMessage: ''
  });

  // Generate device fingerprint and get IP address on mount
  useEffect(() => {
    const initializeAntiCheat = async () => {
      try {
        // Get device fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (err) {
        console.error('Error generating fingerprint:', err);
        // Fallback to a random ID if fingerprinting fails
        setDeviceFingerprint(`fallback-${Date.now()}-${Math.random()}`);
      }

      try {
        // Get IP address from multiple services (fallback chain)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setIpAddress(ipData.ip || 'unknown');
      } catch (err) {
        console.error('Error fetching IP:', err);
        try {
          // Fallback to alternative service
          const ipResponse = await fetch('https://api64.ipify.org?format=json');
          const ipData = await ipResponse.json();
          setIpAddress(ipData.ip || 'unknown');
        } catch (err2) {
          console.error('Error fetching IP from fallback:', err2);
          setIpAddress('unknown');
        }
      }

      // Get user agent
      setUserAgent(navigator.userAgent);
    };

    initializeAntiCheat();

    // Lock body scroll to prevent background scrolling and layout shifts
    document.body.style.overflow = 'hidden';
    // Ensure no padding is added by other libs (prevents right shift)
    document.body.style.paddingRight = '0px';

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    };
  }, []);

  // Load video data
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        setIsLoading(true);

        if (!userId || !videoId) {
          setError('Invalid verification link');
          setIsLoading(false);
          return;
        }

        // Fetch talent video from Supabase service
        const { talentVideoService } = await import('../../../services/api/talentVideoService');
        const targetVideoData = await talentVideoService.getTalentVideo(videoId);

        if (!targetVideoData) {
          setError('Video not found');
          setIsLoading(false);
          return;
        }

        // Verify userId matches (optional security check)
        if (targetVideoData.userId !== userId) {
          // In a real app we might want to be strict, but for now we trust the ID lookup
          // Or we could strict check:
          // setError('Video does not belong to this user');
          // setIsLoading(false);
          // return;
          // Warn if mismatch, but don't block (legacy links might use UUID instead of UID)
          console.debug('Video owner ID formatted differently from URL param', targetVideoData.userId, userId);
        }

        setVideo(targetVideoData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video');
        setIsLoading(false);
      }
    };

    loadVideoData();
  }, [userId, videoId]);

  // Check ownership
  useEffect(() => {
    if (currentUser && userId && currentUser.uid === userId) {
      setIsOwner(true);
    }
  }, [currentUser, userId]);

  // Check for duplicate device/IP after video, fingerprint, and IP are loaded
  useEffect(() => {
    if (video && deviceFingerprint && ipAddress) {
      const existingVerifications = video.verifications || [];

      // Check for duplicate device fingerprint
      const isDuplicateDevice = existingVerifications.some(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint
      );

      // Check for duplicate IP address
      const isDuplicateIP = existingVerifications.some(
        (v: VideoVerification) => v.ipAddress === ipAddress
      );

      // Block if EITHER device fingerprint OR IP address matches
      if (isDuplicateDevice || isDuplicateIP) {
        setAlreadyVerified(true);
      }
    }
  }, [video, deviceFingerprint, ipAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!video || !userId) return;

    // Validation
    if (!formData.verifierName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!formData.verifierEmail.trim() || !formData.verifierEmail.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    if (!deviceFingerprint || !ipAddress) {
      alert('Device and network verification is in progress. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Multi-layer ANTI-CHEAT: Check device fingerprint AND IP address
      const existingVerifications = video.verifications || [];

      // Check for duplicate device fingerprint
      const isDuplicateDevice = existingVerifications.some(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint
      );

      // Check for duplicate IP address
      const isDuplicateIP = existingVerifications.some(
        (v: VideoVerification) => v.ipAddress === ipAddress
      );

      // Find which verification matched for better error message
      const matchedVerification = existingVerifications.find(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint || v.ipAddress === ipAddress
      );

      // Block if EITHER condition is true
      if (isDuplicateDevice || isDuplicateIP) {
        const reason = isDuplicateDevice && isDuplicateIP
          ? 'same device and network'
          : isDuplicateDevice
            ? 'same device'
            : 'same network/IP address';

        alert(`This video has already been verified from the ${reason}. Each device and network can only verify once to prevent fraud.\n\nPrevious verification by: ${matchedVerification?.verifierName || 'Unknown'}`);
        setIsSubmitting(false);
        setAlreadyVerified(true);
        return;
      }

      // Create verification object with multi-layer anti-cheat data
      const verificationBase = {
        verifierId: `anon-${Date.now()}`, // Anonymous ID
        verifierName: formData.verifierName.trim(),
        verifierEmail: formData.verifierEmail.trim(),
        verifierRelationship: formData.verifierRelationship,
        verifiedAt: new Date(),
        deviceFingerprint: deviceFingerprint, // Device fingerprint for anti-cheat
        ipAddress: ipAddress, // IP address for anti-cheat
        userAgent: userAgent // Browser/device info for tracking
      };

      // Only add optional fields if they have values
      const newVerification: VideoVerification = {
        ...verificationBase,
        ...(formData.verificationMessage.trim() && { verificationMessage: formData.verificationMessage.trim() })
      };

      // Import Services
      const { talentVideoService } = await import('../../../services/api/talentVideoService');
      const userService = (await import('../../../services/api/userService')).default;

      // Add Verification via Service (Secure RPC)
      // This single call will:
      // 1. Check for duplicates (IP/Device) SERVER-SIDE
      // 2. Add verification
      // 3. Update video status if threshold is met
      // 4. Update user profile if video is verified
      await talentVideoService.addVerification(videoId, newVerification);

      // Verify success (UI update only)
      setVerificationSuccess(true);
    } catch (err: any) {
      console.error('Error submitting verification:', err);

      // Check for specific backend errors
      if (err.message && err.message.includes('Duplicate verification')) {
        setAlreadyVerified(true);
        // Optional: still alert or just silent transition? 
        // Transition is better UX, maybe with a toast, but here setState triggers the UI change.
        alert('You have already verified this video (detected by secure server check).');
      } else {
        alert(`Failed to verify: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render to portal to escape any parent layout constraints
  const content = (
    <div className="verify-root">
      <style>{`
        .verify-root {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100vw; height: 100vh;
          z-index: 2147483647;
          background: linear-gradient(135deg, #1a1c23 0%, #2d3748 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 40px 20px;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
        }
        .verify-card {
          width: 100%;
          max-width: 650px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          padding: 32px;
          margin: auto;
          position: relative;
          color: #1a202c;
        }
        .verify-header { 
          text-align: center; margin-bottom: 24px; 
        }
        .verify-title { 
          font-size: 24px; font-weight: 800; color: #1a202c; 
          margin: 0 0 8px 0; letter-spacing: -0.02em; 
        }
        .verify-subtitle { 
          font-size: 15px; color: #718096; margin: 0; 
        }
        .verify-video-wrapper {
          width: 100%; border-radius: 12px; overflow: hidden;
          background: #000; aspect-ratio: 16/9; margin-bottom: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .verify-video { width: 100%; height: 100%; object-fit: contain; }
        .verify-video-title { 
          font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 8px; 
        }
        .verify-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
        .verify-tag { 
          padding: 4px 12px; border-radius: 9999px; font-size: 12px; 
          font-weight: 600; background: #edf2f7; color: #4a5568; 
        }
        .verify-tag.highlight { background: #e6fffa; color: #2c7a7b; }
        .verify-form-group { margin-bottom: 16px; }
        .verify-label { 
          display: block; font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 6px; 
        }
        .verify-input, .verify-select, .verify-textarea {
          width: 100%; padding: 10px 14px;
          border: 1px solid #e2e8f0; border-radius: 8px;
          font-family: inherit; font-size: 14px; color: #2d3748;
          background: #f7fafc;
        }
        .verify-input:focus, .verify-select:focus, .verify-textarea:focus {
          outline: none; border-color: #38b2ac; background: #fff;
          box-shadow: 0 0 0 3px rgba(56, 178, 172, 0.1);
        }
        .verify-btn {
          width: 100%; padding: 12px; border-radius: 8px;
          font-weight: 700; font-size: 15px; border: none; cursor: pointer;
          transition: all 0.2s;
        }
        .verify-btn-primary { background: #38b2ac; color: white; margin-top: 12px; }
        .verify-btn-primary:hover:not(:disabled) { background: #319795; transform: translateY(-1px); }
        .verify-state-container { text-align: center; padding: 20px; color: #4a5568; }
        .verify-state-icon { margin: 0 auto 16px; color: #38b2ac; }
        .verify-error { color: #e53e3e; } .verify-error .verify-state-icon { color: #e53e3e; }
        .verify-progress-section { 
            background: #f7fafc; border-radius: 8px; padding: 12px; margin-bottom: 24px; 
            border: 1px solid #edf2f7; 
        }
        .verify-progress-header { 
            display: flex; justify-content: space-between; font-size: 13px; 
            font-weight: 600; color: #4a5568; margin-bottom: 6px; 
        }
        .verify-progress-track { 
            width: 100%; height: 8px; background: #cbd5e0; border-radius: 9999px; overflow: hidden; 
        }
        .verify-progress-bar { 
            height: 100%; background: #38b2ac; border-radius: 9999px; 
        }
      `}</style>

      <div className="verify-card">
        {isLoading && (
          <div className="verify-state-container">
            <div className="loading-spinner"></div>
            <p>Loading verification details...</p>
          </div>
        )}

        {error && (
          <div className="verify-state-container verify-error">
            <div className="verify-state-icon">
              <AlertCircle size={40} />
            </div>
            <h2>Unable to Verify</h2>
            <p>{error}</p>
          </div>
        )}

        {verificationSuccess && (
          <div className="verify-state-container verify-success">
            <div className="verify-state-icon">
              <Check size={48} />
            </div>
            <h2>Verification Submitted!</h2>
            <p className="success-message">Thank you for helping verify this talent.</p>

            <div className="verify-progress-section">
              <div className="verify-progress-header">
                <span>Current Progress</span>
                <span>{(video?.verifications?.length || 0) + 1} / 1</span>
              </div>
              <div className="verify-progress-track">
                <div
                  className="verify-progress-bar"
                  style={{ width: `${Math.min(100, (((video?.verifications?.length || 0) + 1) / 1) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button className="verify-btn verify-btn-primary" onClick={() => window.close()}>
              Close Window
            </button>
          </div>
        )}

        {alreadyVerified && !verificationSuccess && (
          <div className="verify-state-container verify-success">
            <div className="verify-state-icon">
              <Check size={48} />
            </div>
            <h2>Already Verified</h2>
            <p>You have already verified this video. Thank you!</p>
            <button className="verify-btn verify-btn-primary" onClick={() => window.close()}>
              Close Window
            </button>
          </div>
        )}

        {isOwner && (
          <div className="verify-state-container verify-error">
            <div className="verify-state-icon">
              <AlertCircle size={48} />
            </div>
            <h2>Self-Verification Not Allowed</h2>
            <p>You cannot verify your own talent video. Please share this link with a coach, teammate, or witness.</p>
            <button className="verify-btn verify-btn-primary" onClick={() => window.close()}>
              Close Window
            </button>
          </div>
        )}

        {!isLoading && !error && !verificationSuccess && !alreadyVerified && !isOwner && (
          <>
            <div className="verify-header">
              <div className="verify-icon-wrapper">
                <Video size={32} />
              </div>
              <h1 className="verify-title">Verify Talent</h1>
              <p className="verify-subtitle">Confirm this athlete's performance involves real skill.</p>
            </div>

            <div className="verify-video-wrapper">
              <video
                controls
                className="verify-video"
                poster={video?.thumbnailUrl}
              >
                <source src={video?.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="verify-content">
              <h3 className="verify-video-title">{video?.title}</h3>
              <div className="verify-tags">
                <span className="verify-tag highlight">{video?.sport}</span>
                <span className="verify-tag">{video?.skillCategory}</span>
              </div>

              <div className="verify-progress-section">
                <div className="verify-progress-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} />
                    <span>Community Verification</span>
                  </div>
                  <span>{video?.verifications?.length || 0} / 1</span>
                </div>
                <div className="verify-progress-track">
                  <div
                    className="verify-progress-bar"
                    style={{ width: `${Math.min(100, ((video?.verifications?.length || 0) / 1) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <form onSubmit={handleSubmitVerification}>
                <div className="verify-form-group">
                  <label className="verify-label" htmlFor="verifierName">Your Name</label>
                  <input
                    className="verify-input"
                    type="text"
                    id="verifierName"
                    name="verifierName"
                    value={formData.verifierName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="verify-form-group">
                  <label className="verify-label" htmlFor="verifierEmail">Your Email</label>
                  <input
                    className="verify-input"
                    type="email"
                    id="verifierEmail"
                    name="verifierEmail"
                    value={formData.verifierEmail}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div className="verify-form-group">
                  <label className="verify-label" htmlFor="verifierRelationship">Relationship</label>
                  <select
                    className="verify-select"
                    id="verifierRelationship"
                    name="verifierRelationship"
                    value={formData.verifierRelationship}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="witness">I witnessed this performance</option>
                    <option value="coach">Coach</option>
                    <option value="teammate">Teammate</option>
                    <option value="parent">Parent/Guardian</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="verify-form-group">
                  <label className="verify-label" htmlFor="verificationMessage">Comments (Optional)</label>
                  <textarea
                    className="verify-textarea"
                    id="verificationMessage"
                    name="verificationMessage"
                    value={formData.verificationMessage}
                    onChange={handleInputChange}
                    placeholder="Any specific details..."
                    rows={3}
                  />
                </div>

                <div className="form-disclaimer" style={{ marginBottom: '24px' }}>
                  <AlertCircle size={16} />
                  <p>By submitting, you confirm this video is authentic and not manipulated.</p>
                </div>

                <button
                  type="submit"
                  className="verify-btn verify-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Submit Verification'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default VideoVerificationPage;
