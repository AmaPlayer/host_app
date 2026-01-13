import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NavigationBar from '../../components/layout/NavigationBar';
import FooterNav from '../../components/layout/FooterNav';
import VideoPlayer from '../../components/common/video/VideoPlayer';
import VideoErrorBoundary from '../../components/common/error/VideoErrorBoundary';
import VideoSkeleton from '../../components/common/loading/VideoSkeleton';

import RetryHandler from '../../components/common/error/RetryHandler';
import { MomentVideo } from '../../types/models/moment';
import { MomentsService } from '../../services/api/momentsService';
import { useVideoAutoPlay } from '../../hooks/useVideoAutoPlay';
import { useVideoPerformance } from '../../hooks/useVideoPerformance';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useScrollVelocity } from '../../hooks/useScrollVelocity';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import VideoOptimizationUtils from '../../utils/videoOptimization';
import { diversifyFeed } from '../../utils/feedDiversity';
import './MomentsPage.css';

/**
 * MomentsPage Component
 * 
 * Displays video content in a vertical feed format similar to Instagram Reels.
 * Features auto-play functionality and video engagement features.
 */
const MomentsPage: React.FC = () => {
  const { currentUser, isGuest } = useAuth();
  const [moments, setMoments] = useState<MomentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Network status monitoring
  const { networkStatus, isGoodConnection } = useNetworkStatus();
  const videoFeedRef = useRef<HTMLDivElement>(null);
  const [performanceSettings, setPerformanceSettings] = useState(
    VideoOptimizationUtils.getRecommendedSettings()
  );

  // Track scroll velocity for adaptive preloading
  const scrollVelocity = useScrollVelocity({
    container: videoFeedRef.current,
    debounceMs: 150,
    calculateInterval: 150
  });

  // Dynamically adjust preload distance based on scroll speed
  const adaptivePreloadDistance = useMemo(() => {
    const basePreloadDistance = performanceSettings.preloadDistance;

    // Adjust based on scroll speed
    if (scrollVelocity.speed === 'fast') {
      // Fast scrolling: reduce preload to save bandwidth/memory
      return Math.max(1, basePreloadDistance - 1);
    } else if (scrollVelocity.speed === 'slow') {
      // Slow scrolling: increase preload for smoother experience
      return Math.min(3, basePreloadDistance + 1);
    }

    // Medium speed: use base settings
    return basePreloadDistance;
  }, [scrollVelocity.speed, performanceSettings.preloadDistance]);

  // Initialize virtual scrolling for performance optimization
  // FIX: Increased bufferSize from 1 to 2 to reduce mount/unmount frequency during scrolling
  // This reduces Firestore listener churn during rapid scrolling transitions
  const { startIndex, endIndex, offsetY } = useVirtualScroll({
    containerRef: videoFeedRef,
    itemHeight: 100, // Each video is 100vh (100% of viewport height)
    totalItems: moments.length,
    bufferSize: 2, // Render 2 videos above and below visible area (increased from 1)
    throttleMs: 16 // ~60fps throttle
  });

  // Initialize auto-play functionality
  const {
    registerVideo,
    unregisterVideo,
    isVideoInView,
    getActiveVideoId,
    pauseAllVideos,
    resumeActiveVideo
  } = useVideoAutoPlay({
    threshold: 0.6, // Video needs to be 60% visible
    rootMargin: '-10% 0px -10% 0px', // Slight margin for better UX
    root: null, // Use viewport as root for better compatibility
    playDelay: 150, // Small delay to prevent rapid play/pause
    pauseDelay: 300, // Longer delay for pause to prevent flickering
    enableMemoryManagement: true,
    maxConcurrentVideos: performanceSettings.enablePreloading ? 2 : 1 // Adjust based on device capabilities
  });

  // Initialize performance optimizations with adaptive preload distance
  const {
    getMemoryUsage,
    cleanupMemory
  } = useVideoPerformance({
    enableLazyLoading: performanceSettings.enableLazyLoading,
    enablePreloading: performanceSettings.enablePreloading,
    enableAdaptiveQuality: true,
    preloadDistance: adaptivePreloadDistance, // Use dynamic preload distance
    memoryThreshold: 200 // More reasonable threshold: 200MB instead of device-based
  });

  // Update performance settings based on network changes
  useEffect(() => {
    const cleanup = VideoOptimizationUtils.monitorNetworkChanges(() => {
      const newSettings = VideoOptimizationUtils.getRecommendedSettings();
      setPerformanceSettings(newSettings);
    });

    return cleanup;
  }, []);

  // Monitor memory usage and cleanup when needed
  useEffect(() => {
    const interval = setInterval(() => {
      const memoryUsage = getMemoryUsage();
      if (memoryUsage > 200) { // 200MB threshold
        cleanupMemory().catch(console.warn);
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [getMemoryUsage, cleanupMemory]);

  // Fetch moments data
  const fetchMoments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Adjust fetch limit based on device capabilities and network
      let fetchLimit = VideoOptimizationUtils.isLowEndDevice() ? 5 : 10;
      if (!isGoodConnection) {
        fetchLimit = Math.min(fetchLimit, 3); // Reduce for poor connections
      }

      // Use combined feed to show both moments and verified talent videos
      const result = await MomentsService.getCombinedFeed({
        limit: fetchLimit,
        currentUserId: currentUser?.uid,
        includeEngagementMetrics: true,
        // For development: show all moments (pending and approved)
        // In production, only approved moments should be shown
        moderationStatus: process.env.NODE_ENV === 'development' ? undefined : 'approved'
      });

      // Apply feed diversity if enabled
      const enableFeedDiversity = process.env.REACT_APP_ENABLE_FEED_DIVERSITY !== 'false';
      let processedMoments = result.moments;

      // Only apply diversity filter if we have enough videos (10+)
      // With small feeds, the diversity algorithm is too restrictive
      if (enableFeedDiversity && processedMoments.length >= 10) {
        // Get custom config from environment or use defaults
        const maxConsecutive = parseInt(process.env.REACT_APP_FEED_MAX_CONSECUTIVE || '2', 10);
        const maxPercentage = parseFloat(process.env.REACT_APP_FEED_MAX_PERCENTAGE || '0.3');

        processedMoments = diversifyFeed(processedMoments, {
          maxConsecutiveFromSameUser: maxConsecutive,
          maxPercentageFromSingleUser: maxPercentage
        });

        if (process.env.NODE_ENV === 'development') {
        }
      }

      setMoments(processedMoments);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch moments:', err);
      }
      let errorMessage = 'Failed to load videos. Please try again.';

      if (!networkStatus.isOnline) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, isGoodConnection, networkStatus.isOnline]);

  // Fetch moments on component mount and when network status changes
  useEffect(() => {
    fetchMoments();
  }, [fetchMoments]);

  // Auto-retry when network comes back online
  useEffect(() => {
    if (error && networkStatus.isOnline && isGoodConnection && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        fetchMoments();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [error, networkStatus.isOnline, isGoodConnection, retryCount, fetchMoments]);

  const handleTitleClick = () => {
    // Scroll to top and refresh functionality
    const videoFeedElement = videoFeedRef.current;
    if (videoFeedElement) {
      videoFeedElement.scrollTo({ top: 0, behavior: 'auto' });
    }
  };


  // Handle like action
  const handleLike = (momentId: string, liked: boolean, likesCount: number) => {
    setMoments(prevMoments =>
      prevMoments.map(moment =>
        moment.id === momentId
          ? { ...moment, isLiked: liked, engagement: { ...moment.engagement, likesCount } }
          : moment
      )
    );
  };

  // Handle video error
  const handleVideoError = (error: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Video error:', error);
    }
  };

  // Handle page visibility changes to pause/resume videos
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause all videos
        pauseAllVideos();
      } else {
        // Page is visible, resume active video
        setTimeout(() => {
          resumeActiveVideo();
        }, 100); // Small delay to ensure page is fully visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseAllVideos, resumeActiveVideo]);

  // Handle window focus/blur for additional video management
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        resumeActiveVideo();
      }, 100);
    };

    const handleBlur = () => {
      pauseAllVideos();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pauseAllVideos, resumeActiveVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Pause all videos and cleanup when component unmounts
      pauseAllVideos();
    };
  }, [pauseAllVideos]);

  // Pause videos immediately on route change
  useEffect(() => {
    const handleRouteChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname: string }>;
      const newPath = customEvent.detail.pathname;

      // If navigating away from /moments, pause all videos immediately
      if (newPath !== '/moments') {
        // Direct synchronous pause - bypass async pauseAllVideos for immediate effect
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          try {
            if (!video.paused) {
              video.pause();
            }
          } catch (error) {
            console.warn('Failed to pause video on route change:', error);
          }
        });

        // Also call hook's pauseAllVideos for proper cleanup
        pauseAllVideos().catch(console.warn);
      }
    };

    window.addEventListener('routeChange', handleRouteChange);

    return () => {
      window.removeEventListener('routeChange', handleRouteChange);
    };
  }, [pauseAllVideos]);

  return (
    <div className="moments-page">
      <NavigationBar
        currentUser={currentUser}
        isGuest={isGuest()}
        onTitleClick={handleTitleClick}
        title="Real Moments"
      />

      <div className="moments-content">
        <div className="moments-container">
          {loading && (
            <div className="moments-loading">
              <VideoSkeleton
                count={3}
                showMetadata={true}
                showEngagement={true}
                className="moments-skeleton"
              />
            </div>
          )}

          {error && !loading && (
            <div className="moments-error">
              <RetryHandler
                onRetry={fetchMoments}
                error={error}
                maxRetries={3}
                retryDelay={2000}
                showNetworkStatus={true}
                className="moments-retry-handler"
              />
            </div>
          )}

          {!loading && !error && moments.length === 0 && (
            <div className="moments-empty">
              <div className="empty-content">
                <h2>No Moments to Discover</h2>
                <p>The community hasn't shared any moments yet. Be the first to create and share content!</p>
              </div>
            </div>
          )}

          {!loading && !error && moments.length > 0 && (
            <VideoErrorBoundary
              onError={(error, errorInfo) => {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Video component error:', error, errorInfo);
                }
              }}
            >
              <div
                ref={videoFeedRef}
                className="video-feed-container"
                role="main"
                aria-label="Video moments feed"
                tabIndex={-1}
              >
                {/* Top spacer for virtual scrolling */}
                {offsetY > 0 && (
                  <div
                    style={{
                      height: `${offsetY * 100}vh`,
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Render only visible items + buffer */}
                {moments.slice(startIndex, endIndex + 1).map((moment, relativeIndex) => {
                  const absoluteIndex = startIndex + relativeIndex;
                  return (
                    <div
                      key={moment.id}
                      className="video-item"
                      data-video-index={absoluteIndex}
                      data-video-id={moment.id}
                      role="article"
                      aria-label={`Video ${absoluteIndex + 1} of ${moments.length} by ${moment.userDisplayName}`}
                    >
                      <VideoErrorBoundary
                        fallback={
                          <div className="video-error-fallback">
                            <p>This video couldn't be loaded</p>
                            <button onClick={() => window.location.reload()}>
                              Refresh Page
                            </button>
                          </div>
                        }
                      >
                        <div className="video-player-wrapper">
                          <VideoPlayer
                            moment={moment}
                            isActive={isVideoInView(moment.id)}
                            currentUserId={currentUser?.uid}
                            currentUserName={currentUser?.displayName || undefined}
                            currentUserPhotoURL={currentUser?.photoURL || null}
                            onLike={handleLike}
                            onVideoError={handleVideoError}
                            onVideoRegister={registerVideo}
                            onVideoUnregister={unregisterVideo}
                            autoPlayEnabled={true}
                            enablePerformanceOptimizations={true}
                            preloadDistance={performanceSettings.preloadDistance}
                            showFullscreenButton={false}
                          />
                        </div>
                      </VideoErrorBoundary>
                    </div>
                  );
                })}

                {/* Bottom spacer for virtual scrolling */}
                {endIndex < moments.length - 1 && (
                  <div
                    style={{
                      height: `${(moments.length - endIndex - 1) * 100}vh`,
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </VideoErrorBoundary>
          )}
        </div>
      </div>

      <FooterNav />
    </div>
  );
};

export default MomentsPage;