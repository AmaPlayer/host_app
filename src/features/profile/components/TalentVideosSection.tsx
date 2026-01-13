import React, { useState, useMemo } from 'react';
import { Play, Plus, MoreVertical, Edit, Trash2, Share2, Check } from 'lucide-react';
import { TalentVideo, TalentVideosSectionProps, VideoFormData } from '../types/TalentVideoTypes';
import VideoPlayerModal from './VideoPlayerModal';
import VideoManagementModal from './VideoManagementModal';
import VideoFilters from './VideoFilters';
import '../styles/TalentVideosSection.css';

const TalentVideosSection: React.FC<TalentVideosSectionProps> = ({
  videos,
  isOwner,
  athleteSports = [],
  onAddVideo,
  onEditVideo,
  onDeleteVideo,
  onVideoClick
}) => {
  const [selectedVideo, setSelectedVideo] = useState<TalentVideo | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TalentVideo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Share link states
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  // Filter and sort videos
  const { filteredVideos, availableSports, availableCategories } = useMemo(() => {
    let filtered = [...videos];

    // Apply filters
    if (selectedSport) {
      filtered = filtered.filter(video => video.sport === selectedSport);
    }

    if (selectedCategory) {
      // Support both sport-specific skills and generic categories
      filtered = filtered.filter(video =>
        video.specificSkill === selectedCategory ||
        video.mainCategory === selectedCategory ||
        video.skillCategory === selectedCategory
      );
    }

    // Sort by upload date (newest first)
    filtered.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    // Get unique sports for filter options (use sportName if available)
    const sports = [...new Set(videos.map(video => video.sport))].sort();

    // Get unique categories/skills for filter options
    // Combine specific skills, main categories, and generic skill categories
    const categoriesSet = new Set<string>();
    videos.forEach(video => {
      if (video.specificSkill) categoriesSet.add(video.specificSkill);
      if (video.mainCategory) categoriesSet.add(video.mainCategory);
      if (video.skillCategory) categoriesSet.add(video.skillCategory);
    });
    const categories = [...categoriesSet].sort();

    return {
      filteredVideos: filtered,
      availableSports: sports,
      availableCategories: categories
    };
  }, [videos, selectedSport, selectedCategory]);

  const handleVideoClick = (video: TalentVideo) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
    onVideoClick?.(video);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
  };

  const handleAddVideo = () => {
    setEditingVideo(null);
    setIsManagementModalOpen(true);
    onAddVideo?.();
  };

  const handleEditVideoClick = (video: TalentVideo) => {
    setEditingVideo(video);
    setIsManagementModalOpen(true);
  };

  const handleSaveVideo = async (videoData: VideoFormData) => {
    setIsLoading(true);
    try {
      if (editingVideo) {
        // Update existing video (metadata only, not the video file)
        const { talentVideoService } = await import('../../../services/api/talentVideoService');

        await talentVideoService.updateTalentVideo(editingVideo.id, {
          title: videoData.title,
          description: videoData.description,
          sport: videoData.sport,
          sportName: videoData.sportName,
          mainCategory: videoData.mainCategory,
          mainCategoryName: videoData.mainCategoryName,
          specificSkill: videoData.specificSkill,
          skillCategory: videoData.skillCategory,
        });

        // Notify parent component
        const updatedVideo: TalentVideo = {
          ...editingVideo,
          title: videoData.title,
          description: videoData.description,
          sport: videoData.sport,
          sportName: videoData.sportName,
          mainCategory: videoData.mainCategory,
          mainCategoryName: videoData.mainCategoryName,
          specificSkill: videoData.specificSkill,
          skillCategory: videoData.skillCategory,
        };
        onEditVideo?.(updatedVideo);
      } else {
        // Check if user has reached the 5-video limit
        if (videos.length >= 5) {
          alert('You can only upload a maximum of 5 talent videos. Please delete an existing video before uploading a new one.');
          setIsManagementModalOpen(false);
          setEditingVideo(null);
          setIsLoading(false);
          return;
        }

        // Upload new video to Firebase Storage
        if (!videoData.videoFile) {
          throw new Error('No video file provided');
        }

        // Import Firebase modules dynamically
        const { getAuth } = await import('firebase/auth');
        const { talentVideoService } = await import('../../../services/api/talentVideoService');
        const { storageService } = await import('../../../services/storage');

        // Get current user ID from auth
        const auth = getAuth();
        const userId = auth.currentUser?.uid;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const videoFileName = `${timestamp}-${videoData.videoFile.name}`;
        const thumbnailFileName = `${timestamp}-thumbnail.jpg`;

        // Upload video file
        const videoUploadResult = await storageService.uploadFile(`talent-videos/${userId}/${videoFileName}`, videoData.videoFile);
        const videoUrl = videoUploadResult.url;

        // Generate thumbnail from video (using canvas)
        const thumbnailUrl = await generateVideoThumbnail(videoData.videoFile, userId, thumbnailFileName);

        // Get video duration
        const videoDuration = await getVideoDuration(videoData.videoFile);

        // Generate shareable verification link
        const videoId = `video-${timestamp}`;
        const shareableLink = `${window.location.origin}/verify/${userId}/${videoId}`;

        // Create new video object with community verification fields
        const newVideo: TalentVideo = {
          id: videoId,
          title: videoData.title,
          description: videoData.description,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          sport: videoData.sport,
          sportName: videoData.sportName,
          mainCategory: videoData.mainCategory,
          mainCategoryName: videoData.mainCategoryName,
          specificSkill: videoData.specificSkill,
          skillCategory: videoData.skillCategory,
          uploadDate: new Date(),
          duration: Math.round(videoDuration),
          viewCount: 0,
          verificationStatus: 'pending',
          verificationLink: shareableLink,
          userId: userId,
          verifications: [],
          verificationThreshold: 1, // Needs 1 community verification (User Request)
          verificationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        // Save to talentVideos collection (NOT to user document)
        await talentVideoService.addTalentVideo(userId, newVideo);

        // Notify parent component (will trigger re-render)
        // Close modal and reload
        setIsManagementModalOpen(false);
        setEditingVideo(null);
        setIsLoading(false);

        // Reload the page to fetch updated videos from Firestore
        window.location.reload();
      }
      setIsManagementModalOpen(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('❌ Error saving video:', error);
      alert(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate video thumbnail
  const generateVideoThumbnail = async (videoFile: File, userId: string, thumbnailFileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = async () => {
        try {
          // Seek to 1 second or 10% of video, whichever is smaller
          video.currentTime = Math.min(1, video.duration * 0.1);
        } catch (error) {
          reject(error);
        }
      };

      video.onseeked = async () => {
        try {
          // Create canvas and draw video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }

            try {
              // Upload thumbnail to Firebase Storage
              const { storageService } = await import('../../../services/storage');

              const thumbnailUploadResult = await storageService.uploadFile(`thumbnails/${userId}/${thumbnailFileName}`, blob);
              const thumbnailUrl = thumbnailUploadResult.url;

              // Clean up
              URL.revokeObjectURL(video.src);
              resolve(thumbnailUrl);
            } catch (error) {
              reject(error);
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      // Load video
      video.src = URL.createObjectURL(videoFile);
    });
  };

  // Helper function to get video duration
  const getVideoDuration = (videoFile: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setEditingVideo(null);
  };

  const handleClearFilters = () => {
    setSelectedSport('');
    setSelectedCategory('');
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const toggleDropdown = (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(activeDropdown === videoId ? null : videoId);
  };

  const handleEdit = (video: TalentVideo, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(null);
    handleEditVideoClick(video);
  };

  const handleDelete = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(null);
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        setIsLoading(true);
        const { talentVideoService } = await import('../../../services/api/talentVideoService');

        // Delete from talentVideos collection
        await talentVideoService.deleteTalentVideo(videoId);

        // Notify parent component
        onDeleteVideo?.(videoId);

        // Reload page to refresh video list
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopyShareLink = async (video: TalentVideo, event: React.MouseEvent) => {
    event.stopPropagation();

    // Generate verification link format: /verify/{userId}/{videoId}
    // Use video.userId if available, otherwise get from auth
    const getUserId = async () => {
      if (video.userId) return video.userId;

      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      return auth.currentUser?.uid || '';
    };

    try {
      const userId = await getUserId();

      // Always generate verification link in new format
      const shareLink = video.verificationLink || `${window.location.origin}/verify/${userId}/${video.id}`;

      await navigator.clipboard.writeText(shareLink);
      setCopiedVideoId(video.id);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedVideoId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  return (
    <div className="talent-videos-section" id="talent-videos-section">
      <div className="section-header">
        <h3 className="section-title">
          Talent Videos {isOwner && `(${videos.length}/5)`}
        </h3>
        {isOwner && (
          <button
            className="add-video-btn"
            onClick={handleAddVideo}
            aria-label="Add talent video"
            disabled={videos.length >= 5}
            title={videos.length >= 5 ? 'Maximum 5 videos allowed' : 'Add talent video'}
          >
            <Plus size={16} />
            Add Video {videos.length >= 5 && '(Limit Reached)'}
          </button>
        )}
      </div>

      {videos.length > 0 && (
        <VideoFilters
          selectedSport={selectedSport}
          selectedSkillCategory={selectedCategory}
          onSportChange={setSelectedSport}
          onSkillCategoryChange={setSelectedCategory}
          availableSports={availableSports}
          availableSkillCategories={availableCategories}
          totalVideos={videos.length}
          filteredVideos={filteredVideos.length}
        />
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Play size={48} />
          </div>
          <h4 className="empty-title">No talent videos yet</h4>
          <p className="empty-description">
            {isOwner
              ? "Showcase your skills by uploading talent videos"
              : "No videos have been shared yet"
            }
          </p>
          {isOwner && (
            <button
              className="empty-action-btn"
              onClick={handleAddVideo}
            >
              Upload Your First Video
            </button>
          )}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Play size={48} />
          </div>
          <h4 className="empty-title">No videos match your filters</h4>
          <p className="empty-description">
            Try adjusting your filters to see more videos
          </p>
          <button
            className="empty-action-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="talent-videos-grid">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => handleVideoClick(video)}
            >
              <div className="video-thumbnail-container">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="video-thumbnail"
                />
                <div className="video-play-overlay">
                  <Play size={24} fill="white" />
                </div>
                <div className="video-duration">
                  {formatDuration(video.duration)}
                </div>
                {isOwner && (
                  <div className="video-actions">
                    <button
                      className="video-menu-btn"
                      onClick={(e) => toggleDropdown(video.id, e)}
                      aria-label="Video options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeDropdown === video.id && (
                      <div className="video-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={(e) => handleEdit(video, e)}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          className="dropdown-item delete"
                          onClick={(e) => handleDelete(video.id, e)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="video-info">
                <div className="video-title-row">
                  <h4 className="video-title">{video.title}</h4>
                  {video.verificationStatus && (
                    <span
                      className={`video-verification-badge ${video.verificationStatus}`}
                      title={
                        video.verificationStatus === 'verified'
                          ? `Verified by ${video.verifications?.length || 0} people`
                          : `${video.verifications?.length || 0}/${video.verificationThreshold || 1} verifications`
                      }
                    >
                      {video.verificationStatus === 'verified' && '✓ Verified'}
                      {video.verificationStatus === 'pending' && `⏳ ${video.verifications?.length || 0}/${video.verificationThreshold || 1}`}
                      {video.verificationStatus === 'rejected' && '✗ Rejected'}
                    </span>
                  )}
                </div>
                <div className="video-meta">
                  <span className="video-sport">
                    {video.specificSkill
                      ? `${video.sportName || video.sport} • ${video.specificSkill}`
                      : video.sportName || video.sport}
                  </span>
                  <span className="video-separator">•</span>
                  <span className="video-views">{formatViewCount(video.viewCount)}</span>
                  <span className="video-separator">•</span>
                  <button
                    className="video-share-btn"
                    onClick={(e) => handleCopyShareLink(video, e)}
                    title="Copy shareable link"
                  >
                    {copiedVideoId === video.id ? (
                      <>
                        <Check size={12} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 size={12} />
                        Share
                      </>
                    )}
                  </button>
                </div>
                <p className="video-description">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoPlayerModal
        video={selectedVideo}
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
      />

      <VideoManagementModal
        isOpen={isManagementModalOpen}
        onClose={handleCloseManagementModal}
        onSave={handleSaveVideo}
        editingVideo={editingVideo}
        isLoading={isLoading}
        athleteSports={athleteSports}
      />
    </div>
  );
};

export default TalentVideosSection;