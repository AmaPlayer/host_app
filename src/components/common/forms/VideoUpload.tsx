import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video, X, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { validateVideoFile, SUPPORTED_VIDEO_TYPES, MAX_VIDEO_SIZE } from '../../../services/api/videoService';
import SimpleProgressBar from '../media/SimpleProgressBar';
import './VideoUpload.css';

interface VideoUploadProps {
  onVideoSelect?: (file: File) => void;
  onVideoRemove?: () => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  showPreview?: boolean;
  className?: string;
}

export default function VideoUpload({ 
  onVideoSelect, 
  onVideoRemove,
  acceptedTypes = SUPPORTED_VIDEO_TYPES,
  showPreview = true,
  className = ''
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls] = useState<boolean>(true);

  const handleFileSelect = (file: File) => {
    setError('');
    
    console.log('VideoUpload: File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Validate video file
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      console.error('VideoUpload: Validation failed:', validation.error);
      setError(validation.error || 'Invalid video file');
      return;
    }

    console.log('VideoUpload: Validation passed');

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      console.log('VideoUpload: Preview URL created:', previewUrl);
      
      setVideoPreview(previewUrl);
      setSelectedVideo(file);
      
      // Call parent callback
      if (onVideoSelect) {
        console.log('VideoUpload: Calling onVideoSelect callback');
        onVideoSelect(file);
      }
    } catch (error) {
      console.error('VideoUpload: Error creating preview:', error);
      setError('Failed to create video preview. Please try again.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    setSelectedVideo(null);
    setIsPlaying(false);
    setError('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (onVideoRemove) {
      onVideoRemove();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };


  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };


  // Handle video events and auto-play
  useEffect(() => {
    const video = videoRef.current;
    if (video && videoPreview) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [videoPreview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`video-upload ${className}`}>
      {!selectedVideo ? (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content">
            <div className="upload-icon">
              <Video size={48} />
            </div>
            <h3>Upload Video</h3>
            <p>Drag and drop your video here, or click to browse</p>
            <div className="upload-info">
              <p>Supported formats: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
              <p>Maximum size: {Math.floor(MAX_VIDEO_SIZE / (1024 * 1024))}MB</p>
            </div>
            <button type="button" className="upload-btn">
              <Upload size={20} />
              Choose Video
            </button>
          </div>
        </div>
      ) : (
        <div className="video-preview-container">
          {showPreview && videoPreview && (
            <div className="video-preview">
              <video
                ref={videoRef}
                src={videoPreview}
                onEnded={handleVideoEnded}
                controls={false}
                className="preview-video"
                muted={isMuted}
                autoPlay
                loop
              />
              
              {showControls && (
                <div className="video-controls">
                  <SimpleProgressBar
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={(time) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = time;
                      }
                    }}
                    showTime={true}
                    className="video-upload-progress"
                  />

                  <div className="controls-row">
                    <button
                      type="button"
                      className="control-btn play-pause-btn"
                      onClick={togglePlayPause}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <div className="volume-control">
                      <button
                        type="button"
                        className="control-btn volume-btn"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                      />
                    </div>

                    <button
                      type="button"
                      className="control-btn fullscreen-btn"
                      onClick={toggleFullscreen}
                      aria-label="Fullscreen"
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="video-info">
            <div className="video-details">
              <h4>{selectedVideo.name}</h4>
              <p>Size: {formatFileSize(selectedVideo.size)}</p>
              <p>Type: {selectedVideo.type}</p>
            </div>
            <button
              type="button"
              className="remove-btn"
              onClick={removeVideo}
              title="Remove video"
              aria-label="Remove video"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
