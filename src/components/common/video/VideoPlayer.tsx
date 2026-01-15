import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

import { MomentVideo, VideoPlayerState } from '../../../types/models/moment';
import { MomentsService } from '../../../services/api/momentsService';
import PostsService from '../../../services/supabase/postsService';
import CommentsModal from '../../common/comments/CommentsModal';
import VideoShare from './VideoShare';
import { useEngagementActions } from '../../../hooks/useEngagementActions';
import { EngagementBar } from '../../common/engagement/EngagementBar';
import { useTouchGestures } from '../../../hooks/useTouchGestures';
import { useVideoPerformance } from '../../../hooks/useVideoPerformance';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import VideoOptimizationUtils from '../../../utils/videoOptimization';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import LoadingSpinner from '../loading/LoadingSpinner';
import RetryHandler from '../error/RetryHandler';
import UserAvatar from '../user/UserAvatar';
import './VideoPlayer.css';

interface VideoPlayerProps {
  moment: MomentVideo;
  isActive: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhotoURL?: string | null;
  onLike?: (momentId: string, liked: boolean, likesCount: number) => void;
  onComment?: (momentId: string) => void;
  onShare?: (momentId: string) => void;
  onVideoEnd?: () => void;
  onVideoError?: (error: string) => void;
  // Auto-play management props
  onVideoRegister?: (video: HTMLVideoElement, id: string) => void;
  onVideoUnregister?: (id: string) => void;
  autoPlayEnabled?: boolean;
  // Navigation props for swipe gestures
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  // Performance optimization props
  enablePerformanceOptimizations?: boolean;
  preloadDistance?: number;
  // UI props
  controls?: boolean;
  showFullscreenButton?: boolean;
}

/**
 * VideoPlayer Component
 * 
 * Handles video playback with controls, engagement features, and metadata display.
 * Supports auto-play when active, touch controls, and accessibility features.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  moment,
  isActive,
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  onLike,
  onComment,
  onShare,
  onVideoEnd,
  onVideoError,
  onVideoRegister,
  onVideoUnregister,
  autoPlayEnabled = true,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  enablePerformanceOptimizations = true,
  preloadDistance = 2,
  controls = false,
  showFullscreenButton = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Get persisted mute preference from localStorage
  const getInitialMuteState = () => {
    try {
      const saved = localStorage.getItem('videoMutePreference');
      return saved !== null ? saved === 'true' : false; // Default to unmuted if not set
    } catch {
      return false; // Default to unmuted on error
    }
  };

  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    isMuted: getInitialMuteState(), // Use persisted preference
    currentTime: 0,
    duration: 0,
    isFullscreen: false,
    isLoading: true,
    hasError: false,
    quality: 'auto',
    volume: 1,
    playbackRate: 1
  });

  const [showControls, setShowControls] = useState(false);
  const [realtimeCommentCount, setRealtimeCommentCount] = useState<number>(moment.engagement.commentsCount || 0);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<string>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [videoStatus, setVideoStatus] = useState<string>('');
  const haptic = useHapticFeedback();

  // Network status monitoring
  const { networkStatus, isGoodConnection, recommendedVideoQuality } = useNetworkStatus();

  // Initialize performance optimizations
  const {
    registerVideo: registerPerformanceVideo,
    unregisterVideo: unregisterPerformanceVideo,
    getOptimalQuality,
    getCurrentNetworkType,
    setVideoVisible,
    preloadVideo,
    optimizeQuality
  } = useVideoPerformance({
    enableLazyLoading: enablePerformanceOptimizations,
    enablePreloading: enablePerformanceOptimizations,
    enableAdaptiveQuality: enablePerformanceOptimizations,
    preloadDistance,
    memoryThreshold: VideoOptimizationUtils.isLowEndDevice() ? 100 : 200, // More realistic thresholds
    qualityPreferences: {
      wifi: 'high',
      cellular: 'medium',
      slow: 'low'
    }
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor network changes for quality optimization
  useEffect(() => {
    if (!enablePerformanceOptimizations) return;

    const cleanup = VideoOptimizationUtils.monitorNetworkChanges((networkInfo) => {
      setNetworkQuality(networkInfo.effectiveType);

      // Re-optimize video quality when network changes
      if (videoRef.current) {
        optimizeQuality(moment.id).catch(console.warn);
      }
    });

    // Set initial network quality
    setNetworkQuality(getCurrentNetworkType());

    return cleanup;
  }, [enablePerformanceOptimizations, moment.id, optimizeQuality, getCurrentNetworkType]);

  // Show controls temporarily
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || playerState.hasError) return;

    if (playerState.isPlaying) {
      video.pause();
    } else {
      video.play().catch((error) => {
        console.error('Play failed:', error);
      });
    }
  }, [playerState.isPlaying, playerState.hasError]);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !playerState.isMuted;
    video.muted = newMuted;
    setPlayerState(prev => ({ ...prev, isMuted: newMuted }));

    // Persist mute preference to localStorage for all future videos
    try {
      localStorage.setItem('videoMutePreference', String(newMuted));
      // Dispatch custom event to notify other video players
      window.dispatchEvent(new CustomEvent('videoMutePreferenceChanged', {
        detail: { isMuted: newMuted }
      }));
      haptic.light(); // Feedback for mute toggle
    } catch (error) {
      console.error('Failed to save mute preference:', error);
    }

    setAnnouncement(`Video ${newMuted ? 'muted' : 'unmuted'}`);
  }, [playerState.isMuted]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('Toggle fullscreen clicked');

    // Check if we are already in fullscreen
    const isFullscreen = document.fullscreenElement || (video as any).webkitDisplayingFullscreen;

    if (!isFullscreen) {
      console.log('Attempting to enter fullscreen');
      if (video.requestFullscreen) {
        video.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else if ((video as any).webkitEnterFullscreen) {
        // iOS Safari specific
        console.log('Using webkitEnterFullscreen');
        (video as any).webkitEnterFullscreen();
      } else if ((video as any).msRequestFullscreen) {
        // IE11
        (video as any).msRequestFullscreen();
      } else {
        console.warn('Fullscreen API not supported');
      }
    } else {
      console.log('Attempting to exit fullscreen');
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
    }
  }, []);

  // Use shared engagement actions hook
  const {
    isLiking,
    handleLike,
    handleComment: handleCommentClick,
    handleShare: handleShareClick,
    handleShareAction,
    showComments,
    setShowComments,
    showShare,
    setShowShare
  } = useEngagementActions({
    id: moment.id,
    isPostVideo: moment.isPostVideo,
    currentUserId,
    onLike,
    onComment,
    onShare,
    setAnnouncement
  });

  // Touch gesture handlers
  const handleDoubleTap = useCallback(() => {
    haptic.medium();
    handleLike();
  }, [handleLike, haptic]);

  const handleSingleTap = useCallback(() => {
    togglePlayPause();
    // Don't show controls on tap - let the play/pause state determine visibility
    // showControlsTemporarily(); 
  }, [togglePlayPause]);

  const handleLongPress = useCallback(() => {
    // Show video info or additional options on long press
    showControlsTemporarily();
  }, []);

  // Initialize touch gestures
  const { attachGestures } = useTouchGestures({
    onTap: handleSingleTap,
    onDoubleTap: handleDoubleTap,
    onLongPress: handleLongPress,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance: 50,
    maxTapDistance: 15,
    doubleTapDelay: 300,
    longPressDelay: 500,
    preventScroll: false // Allow native scrolling for better iOS experience
  });

  // Attach touch gestures to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    const cleanup = attachGestures(container);
    return cleanup;
  }, [attachGestures, isMobile]);

  // Register/unregister video with auto-play system and performance optimizations
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Register video with auto-play system
    if (autoPlayEnabled) {
      onVideoRegister?.(video, moment.id);
    }

    // Register video with performance optimization system
    if (enablePerformanceOptimizations) {
      registerPerformanceVideo(video, moment.id, moment.metadata?.qualityVersions);
    }

    // Cleanup on unmount
    return () => {
      if (autoPlayEnabled) {
        onVideoUnregister?.(moment.id);
      }
      if (enablePerformanceOptimizations) {
        unregisterPerformanceVideo(moment.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    moment.id,
    autoPlayEnabled,
    enablePerformanceOptimizations
    // Note: Removed registerPerformanceVideo, unregisterPerformanceVideo, onVideoRegister, onVideoUnregister
    // from dependencies as they are stable callbacks and including them causes infinite re-registration
  ]);

  // Handle video visibility for performance optimizations
  useEffect(() => {
    if (enablePerformanceOptimizations) {
      setVideoVisible(moment.id, isActive);
    }
  }, [isActive, moment.id, enablePerformanceOptimizations, setVideoVisible]);

  // Sync comment count from props (Supabase source of truth)
  useEffect(() => {
    setRealtimeCommentCount(moment.engagement.commentsCount || 0);
  }, [moment.engagement.commentsCount]);

  // Handle video play/pause based on isActive prop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleAutoPlay = async () => {
      if (isActive && !playerState.hasError) {
        // Preload video if performance optimizations are enabled
        if (enablePerformanceOptimizations) {
          try {
            await preloadVideo(moment.id);
          } catch (error) {
            console.warn('Preload failed:', error);
          }
        }

        // Auto-play video when active
        // First try to play with current sound settings
        try {
          await video.play();
          setPlayerState(prev => ({ ...prev, isPlaying: true }));
        } catch (error) {
          console.warn('Auto-play with sound failed, trying muted:', error);

          // If autoplay failed (likely due to browser policy with unmuted video),
          // try muting and playing again
          try {
            video.muted = true;
            await video.play();
            setPlayerState(prev => ({ ...prev, isPlaying: true, isMuted: true }));

            // Update localStorage to reflect that autoplay required muting
            try {
              localStorage.setItem('videoMutePreference', 'true');
            } catch (e) {
              console.warn('Failed to save mute preference:', e);
            }
          } catch (mutedError) {
            console.error('Auto-play failed even when muted:', mutedError);
            setPlayerState(prev => ({ ...prev, isPlaying: false }));
          }
        }
      } else {
        video.pause();
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    handleAutoPlay();
  }, [isActive, playerState.hasError, enablePerformanceOptimizations, moment.id, preloadVideo]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerState(prev => ({
      ...prev,
      duration: video.duration,
      isLoading: false,
      hasError: false
    }));
  }, []);

  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerState(prev => ({
      ...prev,
      currentTime: video.currentTime
    }));
  }, []);

  // Handle video play event
  const handlePlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
    setVideoStatus('Playing');
    setAnnouncement(`Video by ${moment.userDisplayName} is now playing`);
  }, [moment.userDisplayName]);

  // Handle video pause event
  const handlePause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
    setVideoStatus('Paused');
    setAnnouncement(`Video by ${moment.userDisplayName} is paused`);
  }, [moment.userDisplayName]);

  // Handle video ended
  const handleEnded = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    setVideoStatus('Ended');
    setAnnouncement(`Video by ${moment.userDisplayName} has ended`);
    onVideoEnd?.();
  }, [onVideoEnd, moment.userDisplayName]);

  // Handle video error
  const handleError = useCallback(() => {
    const video = videoRef.current;
    let errorMessage = 'Video failed to load';

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source not supported';
          break;
        default:
          errorMessage = video.error.message || 'Unknown video error';
      }
    }

    setPlayerState(prev => ({
      ...prev,
      hasError: true,
      isLoading: false,
      isPlaying: false
    }));

    setLastError(errorMessage);
    onVideoError?.(errorMessage);
  }, [onVideoError]);



  // Handle video click (play/pause and show controls) - for non-touch devices
  const handleVideoClick = useCallback(() => {
    if (isMobile) return; // Let touch gestures handle mobile interactions
    togglePlayPause();
    // Don't show controls on click - let the play/pause state determine visibility
  }, [togglePlayPause, isMobile]);

  // Handle retry on error
  const handleRetry = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setRetryCount(prev => prev + 1);
    setLastError(null);

    setPlayerState(prev => ({
      ...prev,
      hasError: false,
      isLoading: true
    }));

    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Try to reload the video
      video.load();

      // If network is poor, try to get a lower quality version
      if (!isGoodConnection && enablePerformanceOptimizations) {
        try {
          await optimizeQuality(moment.id);
        } catch (optimizeError) {
          console.warn('Failed to optimize video quality:', optimizeError);
        }
      }
    } catch (error) {
      console.error('Retry failed:', error);
      setPlayerState(prev => ({
        ...prev,
        hasError: true,
        isLoading: false
      }));
      setLastError('Retry failed. Please check your connection.');
    }
  }, [moment.id, isGoodConnection, enablePerformanceOptimizations, optimizeQuality]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const video = videoRef.current;
    if (!video || playerState.hasError) return;

    // Only handle keyboard events when this video is active
    if (!isActive) return;

    // Ignore keyboard shortcuts when user is typing in input fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause();
        showControlsTemporarily();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        showControlsTemporarily();
        break;
      case 'l':
        e.preventDefault();
        if (currentUserId) {
          handleLike();
        }
        break;
      case 'c':
        e.preventDefault();
        if (currentUserId) {
          handleCommentClick();
        }
        break;
      case 's':
        e.preventDefault();
        handleShareClick();
        break;
      case 'arrowleft':
        e.preventDefault();
        // Seek backward 10 seconds
        video.currentTime = Math.max(0, video.currentTime - 10);
        showControlsTemporarily();
        break;
      case 'arrowright':
        e.preventDefault();
        // Seek forward 10 seconds
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        showControlsTemporarily();
        break;
      case 'arrowup':
        e.preventDefault();
        // Navigate to previous video
        onSwipeDown?.();
        break;
      case 'arrowdown':
        e.preventDefault();
        // Navigate to next video
        onSwipeUp?.();
        break;
      case 'home':
        e.preventDefault();
        // Go to beginning of video
        video.currentTime = 0;
        showControlsTemporarily();
        break;
      case 'end':
        e.preventDefault();
        // Go to end of video
        video.currentTime = video.duration;
        showControlsTemporarily();
        break;
      case 'escape':
        e.preventDefault();
        // Close any open modals
        setShowComments(false);
        setShowShare(false);
        break;
      default:
        break;
    }
  }, [
    isActive,
    playerState.hasError,
    togglePlayPause,
    toggleMute,
    handleLike,
    handleCommentClick,
    handleShareClick,
    showControlsTemporarily,
    currentUserId,
    onSwipeUp,
    onSwipeDown
  ]);

  // Listen for mute preference changes from other videos
  useEffect(() => {
    const handleMutePreferenceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isMuted: boolean }>;
      const video = videoRef.current;
      if (!video) return;

      const newMuted = customEvent.detail.isMuted;
      video.muted = newMuted;
      setPlayerState(prev => ({ ...prev, isMuted: newMuted }));
    };

    window.addEventListener('videoMutePreferenceChanged', handleMutePreferenceChange);

    return () => {
      window.removeEventListener('videoMutePreferenceChanged', handleMutePreferenceChange);
    };
  }, []);

  // Apply mute state to video element when it changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = playerState.isMuted;
    }
  }, [playerState.isMuted]);

  // Add keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add keyboard event listener to container
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${isMobile ? 'mobile' : 'desktop'}`}
      tabIndex={isActive ? 0 : -1}
      role="region"
      aria-label={`Video player for ${moment.userDisplayName}'s moment`}
      aria-describedby={`video-metadata-${moment.id}`}
      onFocus={() => showControlsTemporarily()}
    >
      <div
        className="video-wrapper"
        onClick={handleVideoClick}
        onMouseMove={!isMobile ? showControlsTemporarily : undefined}
      >
        <video
          ref={videoRef}
          className="video-player"
          src={moment.videoUrl}
          poster={moment.thumbnailUrl}
          muted={playerState.isMuted}
          playsInline
          controls={controls}
          preload={enablePerformanceOptimizations ? "none" : "metadata"}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          aria-label={`Video by ${moment.userDisplayName}: ${moment.caption || 'No description'}`}
          aria-describedby={`video-metadata-${moment.id}`}
          role="application"
          tabIndex={0}
        />

        {/* Loading State */}
        {playerState.isLoading && !playerState.hasError && (
          <div className="video-loading">
            <LoadingSpinner
              size="large"
              message="Loading video..."
              overlay={false}
            />
          </div>
        )}

        {/* Error State with Retry Handler */}
        {playerState.hasError && (
          <div className="video-error">
            <RetryHandler
              onRetry={handleRetry}
              error={lastError}
              maxRetries={3}
              retryDelay={1000}
              showNetworkStatus={true}
              className="video-retry-handler"
            />
          </div>
        )}

        {/* Video Controls Overlay */}
        {(showControls || !playerState.isPlaying) && !playerState.hasError && (
          <div className="video-controls-overlay">
            <button
              className="play-pause-btn"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              aria-label={playerState.isPlaying ? 'Pause video' : 'Play video'}
              aria-pressed={playerState.isPlaying}
              title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              tabIndex={0}
            >
              {playerState.isPlaying ? <Pause size={48} /> : <Play size={48} />}
            </button>
          </div>
        )}

        {/* Mute/Unmute Button */}
        <button
          className="mute-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={playerState.isMuted ? 'Unmute video' : 'Mute video'}
          aria-pressed={!playerState.isMuted}
          title={playerState.isMuted ? 'Unmute (M)' : 'Mute (M)'}
          tabIndex={0}
        >
          {playerState.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Fullscreen Button - Top Right */}
        {showFullscreenButton && (
          <button
            className="fullscreen-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            aria-label="Toggle fullscreen"
            title="Fullscreen (F)"
            tabIndex={0}
          >
            <Maximize size={20} />
          </button>
        )}

        {/* Talent Video Badge */}
        {moment.isTalentVideo && (
          <div className="talent-video-badge">
            <span className="talent-badge">
              ✓ Verified Talent
            </span>
          </div>
        )}

        {/* Video Timer - Top Left */}
        <div className="video-timer-top">
          <span className="video-duration" role="text" aria-label={`Video progress: ${formatTime(playerState.currentTime)} of ${formatTime(playerState.duration)}`}>
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </span>
        </div>
      </div>

      {/* Video Metadata */}
      <div className="video-metadata" id={`video-metadata-${moment.id}`} role="region" aria-label="Video information">
        <div className="creator-info">
          <UserAvatar
            userId={moment.userId}
            displayName={moment.userDisplayName}
            photoURL={moment.userPhotoURL || undefined}
            size="medium"
            clickable={true}
            className="creator-avatar"
          />
          <span className="creator-name" role="text" aria-label={`Created by ${moment.userDisplayName}`}>
            {moment.userDisplayName}
          </span>
        </div>

        {moment.caption && (
          <p className="video-description" role="text" aria-label={`Video description: ${moment.caption}`}>
            {moment.caption}
          </p>
        )}

        <div className="video-stats" role="group" aria-label="Video statistics">
          {/* Stats removed from here and moved to top */}
          <span className="video-views" role="text" aria-label={`${moment.engagement.views.toLocaleString()} views`}>
            {moment.engagement.views.toLocaleString()} views
          </span>
        </div>
      </div>

      {/* Engagement Actions */}
      <div className="engagement-actions">
        <EngagementBar
          likesCount={moment.engagement.likesCount}
          commentsCount={realtimeCommentCount}
          sharesCount={moment.engagement.sharesCount}
          isLiked={!!moment.isLiked}
          isLiking={isLiking}
          onLike={handleLike}
          onComment={handleCommentClick}
          onShare={handleShareClick}
          variant="vertical"
          disabled={!currentUserId}
        />
      </div>

      {/* Comments Modal */}
      {/* Comments Modal */}
      <CommentsModal
        contentId={moment.id}
        isVisible={showComments}
        onClose={() => setShowComments(false)}
        contentType={moment.isPostVideo ? 'post' : 'moment'}
      />

      {/* Share Modal */}
      <VideoShare
        momentId={moment.id}
        videoUrl={moment.videoUrl}
        caption={moment.caption}
        creatorName={moment.userDisplayName}
        isVisible={showShare}
        onClose={() => setShowShare(false)}
        onShare={handleShareAction}
      />

      {/* Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {lastError}
      </div>

      {/* Video Status for Screen Readers */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        role="status"
      >
        {videoStatus && `Video status: ${videoStatus}`}
      </div>
    </div>
  );
};

export default VideoPlayer;