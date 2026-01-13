import React, { useState, useRef, useEffect, memo, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, X } from 'lucide-react';
import './VideoPlayer.css';
import SimpleProgressBar from './SimpleProgressBar';
import { useVideoManager } from '../../../hooks/useVideoManager';
import { VideoCropData } from '../../../types/models/post';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void | null;
  onPause?: () => void | null;
  onEnded?: () => void | null;
  autoPauseOnScroll?: boolean;
  videoId?: string | null;
  useGlobalVideoManager?: boolean;
  mediaSettings?: {
    objectFit?: 'cover' | 'contain';
    objectPosition?: string;
    cropData?: VideoCropData;
    aspectRatio?: number;
  };
}

const VideoPlayer: React.FC<VideoPlayerProps> = memo(function VideoPlayer({
  src,
  poster = null,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
  onPlay = null,
  onPause = null,
  onEnded = null,
  autoPauseOnScroll = true,
  videoId = null,
  useGlobalVideoManager = true,
  mediaSettings
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [showAutoPauseIndicator, setShowAutoPauseIndicator] = useState<boolean>(false);

  const { registerVideo } = useVideoManager();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  useEffect(() => {
    if (!autoPauseOnScroll || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (!visible && isPlaying && videoRef.current) {
          videoRef.current.pause();
          setTimeout(() => {
            setShowAutoPauseIndicator(false);
          }, 2000);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0.2, 0.8]
      }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [autoPauseOnScroll, isPlaying]);

  useEffect(() => {
    if (useGlobalVideoManager && videoRef.current && videoId) {
      const cleanup = registerVideo(videoId, videoRef.current);
      return cleanup;
    }
  }, [useGlobalVideoManager, videoId, registerVideo]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };


  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log('VideoPlayer: Toggle fullscreen clicked');

    // Check if we are already in fullscreen (standard or iOS)
    const isFullscreen = document.fullscreenElement || (video as any).webkitDisplayingFullscreen;

    if (!isFullscreen) {
      console.log('VideoPlayer: Attempting to enter fullscreen');

      // Try standard Fullscreen API on container first (for desktop/Android)
      // Note: iOS Safari does NOT support requestFullscreen on div, only on video
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.warn('VideoPlayer: Container fullscreen failed, trying video fallback:', err);
          // Fallback for iOS Safari or other browsers if container fails
          if ((video as any).webkitEnterFullscreen) {
            console.log('VideoPlayer: Using webkitEnterFullscreen');
            (video as any).webkitEnterFullscreen();
          }
        });
      } else if ((video as any).webkitEnterFullscreen) {
        // iOS Safari direct support
        console.log('VideoPlayer: Using direct webkitEnterFullscreen');
        (video as any).webkitEnterFullscreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      } else {
        console.warn('VideoPlayer: Fullscreen API not supported');
      }
    } else {
      console.log('VideoPlayer: Attempting to exit fullscreen');
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(console.error);
      } else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
    }
  };
  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };


  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (onPlay) onPlay();
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (onPause) onPause();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  return (
    <div
      ref={containerRef}
      className={`video-player ${className} ${isFullscreen ? 'fullscreen' : ''} ${!isVisible ? 'out-of-view' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      {loading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}

      {error && (
        <div className="video-error">
          <p>Error loading video</p>
          <button onClick={() => window.location.reload()} aria-label="Retry">Retry</button>
        </div>
      )}

      {showAutoPauseIndicator && (
        <div className="auto-pause-indicator">
          Video paused (scrolled away)
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        className="video-element"
        style={
          mediaSettings?.cropData ? {
            // New format: Apply clip-path based on crop coordinates
            objectFit: 'cover',
            clipPath: `inset(
              ${mediaSettings.cropData.y * 100}%
              ${(1 - mediaSettings.cropData.x - mediaSettings.cropData.width) * 100}%
              ${(1 - mediaSettings.cropData.y - mediaSettings.cropData.height) * 100}%
              ${mediaSettings.cropData.x * 100}%
            )`
          } : mediaSettings?.objectFit || mediaSettings?.objectPosition ? {
            // Legacy format: Use objectFit and objectPosition
            objectFit: mediaSettings.objectFit,
            objectPosition: mediaSettings.objectPosition
          } : {
            // Default: No crop
            objectFit: 'cover'
          }
        }
      />

      {/* Close button for fullscreen mode */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fullscreen-close-btn"
          aria-label="Exit fullscreen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 1,
            transform: 'scale(1)',
            animation: 'fadeInScale 0.3s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'scale(1.15)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <X size={24} strokeWidth={2.5} />
        </button>
      )}

      {controls && !loading && !error && (
        <div className={`video-controls ${showControls ? 'visible' : ''}`} data-testid="video-controls">
          <div className="play-overlay" onClick={togglePlayPause} data-testid="play-overlay">
            {!isPlaying && (
              <div className="play-button-center">
                <Play size={60} fill="currentColor" />
              </div>
            )}
          </div>

          <div className="controls-bottom">
            <SimpleProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={(time) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
              showTime={true}
            />

            <div className="controls-row">
              <div className="controls-left">
                <button
                  onClick={togglePlayPause}
                  className="control-btn"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button onClick={restart} className="control-btn" aria-label="Restart">
                  <RotateCcw size={20} />
                </button>

                <div className="volume-container">
                  <button onClick={toggleMute} className="control-btn" aria-label="Volume">
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                </div>
              </div>

              <div className="controls-right">
                <button onClick={toggleFullscreen} className="control-btn" aria-label="Fullscreen">
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
