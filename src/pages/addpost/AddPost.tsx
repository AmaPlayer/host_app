import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { usePostOperations } from '../../hooks/usePostOperations';
import { Image, Video, Upload, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import VideoUpload from '../../components/common/forms/VideoUpload';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { storageService } from '../../services/storage';
import { uploadVideoFile, generateVideoMetadata, VIDEO_PATHS } from '../../services/api/videoService';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import FooterNav from '../../components/layout/FooterNav';
import { errorTracker, getErrorSolution } from '../../utils/debug/errorTracker';
import { filterPostContent, getPostViolationMessage, logPostViolation } from '../../utils/content/postContentFilter';
import { validateImageContent } from '../../utils/content/imageContentFilter';
import { createOfflinePost } from '../../utils/caching/offlinePostManager';
import NetworkStatus from '../../components/common/network/NetworkStatus';
import OfflinePostCreator from '../../components/common/offline/OfflinePostCreator';
import './AddPost.css';
import type { MediaType } from '../../types/models/post';

interface NewPostState {
  caption: string;
  image: File | null;
  video: File | null;
  mediaType: MediaType;
}

interface ContentViolation {
  isClean: boolean;
  shouldBlock: boolean;
  shouldWarn: boolean;
  shouldFlag: boolean;
  violations: any[];
  categories: string[];
  maxSeverity?: string;
}

interface ImageAnalysis {
  isClean: boolean;
  shouldBlock?: boolean;
  shouldWarn?: boolean;
  warnings: any;
  recommendations?: string[];
  riskLevel?: string;
  analysis?: any;
}

interface OfflinePost {
  id: string;
  caption: string;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  timestamp: Date;
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AddPost(): React.JSX.Element {
  const { currentUser, isGuest } = useAuth();
  const { t } = useLanguage();
  const [newPost, setNewPost] = useState<NewPostState>({
    caption: '',
    image: null,
    video: null,
    mediaType: 'image'
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [contentViolation, setContentViolation] = useState<ContentViolation | null>(null);
  const [showViolationWarning, setShowViolationWarning] = useState<boolean>(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [showImageWarning, setShowImageWarning] = useState<boolean>(false);
  const [analyzingImage, setAnalyzingImage] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showOfflineCreator, setShowOfflineCreator] = useState<boolean>(false);
  const [offlinePostCreated, setOfflinePostCreated] = useState<OfflinePost | null>(null);

  // Compression state
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [compressedFileSize, setCompressedFileSize] = useState<number>(0);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);

  const navigate = useNavigate();

  // Cleanup effect for image preview
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setNewPost({ ...newPost, image: file, video: null, mediaType: 'image' });

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Analyze image content
      setAnalyzingImage(true);
      try {
        const analysis = await validateImageContent(file, {
          strictMode: false,
          quickCheck: false
        });
        // Type guard to ensure we have the full analysis result
        if ('isClean' in analysis) {
          setImageAnalysis(analysis);

          if (!analysis.isClean) {
            setShowImageWarning(true);

            if (analysis.shouldBlock) {
              alert(`❌ Image blocked: This image may contain inappropriate content.\n\nReasons: ${analysis.warnings.join(', ')}\n\nPlease upload sports-related images like action shots, team photos, or training moments.`);
              handleImageRemove();
              return;
            }

            if (analysis.shouldWarn) {
              const proceed = window.confirm(`⚠️ Image Warning: This image may contain questionable content.\n\nReasons: ${analysis.warnings.join(', ')}\n\nRecommendation: ${analysis.recommendations?.join(', ')}\n\nDo you want to continue with this image?`);
              if (!proceed) {
                handleImageRemove();
                return;
              }
            }
          } else {
            setShowImageWarning(false);
          }
        } else {
          // Handle quick validation result (fallback)
          setImageAnalysis({
            isClean: (analysis as any).isValid,
            warnings: (analysis as any).warnings,
            riskLevel: 'medium'
          });
          setShowImageWarning(!(analysis as any).isValid);
        }

      } catch (error) {
        console.error('❌ Image analysis failed:', error);
        setImageAnalysis({
          warnings: ['Could not analyze image content'],
          shouldWarn: true,
          isClean: false,
          riskLevel: 'high'
        });
        setShowImageWarning(true);
      }

      setAnalyzingImage(false);
    }
  };

  const handleImageRemove = (): void => {
    setNewPost({ ...newPost, image: null });
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setImageAnalysis(null);
    setShowImageWarning(false);
    setAnalyzingImage(false);

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleVideoSelect = (videoFile: File): void => {
    setNewPost({ ...newPost, video: videoFile, image: null, mediaType: 'video' });
  };

  const handleVideoRemove = (): void => {
    setNewPost({ ...newPost, video: null });
  };

  const toggleMediaType = (type: MediaType): void => {
    setMediaType(type);
    setNewPost({ ...newPost, image: null, video: null, mediaType: type });

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newCaption = e.target.value;
    setNewPost({ ...newPost, caption: newCaption });

    if (newCaption.trim().length > 10) {
      const sportsKeywords = ['performance', 'training', 'workout', 'talent', 'skills', 'competition', 'match', 'game', 'victory', 'win'];
      const isSportsContent = sportsKeywords.some(keyword =>
        newCaption.toLowerCase().includes(keyword)
      );

      const filterResult = filterPostContent(newCaption, {
        strictMode: false,
        checkPatterns: true,
        languages: ['english', 'hindi'],
        context: isSportsContent ? 'sports_post' : 'general'
      });

      if (!filterResult.isClean && filterResult.shouldBlock) {
        setContentViolation(filterResult);
        setShowViolationWarning(true);
      } else {
        setContentViolation(null);
        setShowViolationWarning(false);
      }
    } else {
      setContentViolation(null);
      setShowViolationWarning(false);
    }
  };

  const handleOfflinePost = async (): Promise<void> => {
    if (!currentUser) {
      alert('You must be logged in to create posts.');
      return;
    }

    if (isGuest()) {
      if (window.confirm('Please sign up or log in to create posts. Guest accounts have read-only access.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    setShowOfflineCreator(true);
  };

  const handleOfflinePostCreated = (offlinePost: OfflinePost): void => {
    setOfflinePostCreated(offlinePost);
    setShowOfflineCreator(false);

    setTimeout(() => {
      if (window.confirm('Post saved offline! It will sync when you\'re back online.\n\nWould you like to create another post?')) {
        setNewPost({ caption: '', image: null, video: null, mediaType: 'image' });
        setImagePreview(null);
        setOfflinePostCreated(null);
      } else {
        navigate('/home');
      }
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (isOffline || !navigator.onLine) {
      await handleOfflineSubmit();
      return;
    }

    errorTracker.startRecording();

    if (!newPost.caption.trim()) {
      errorTracker.trackError(new Error('No caption provided'), { step: 'validation' });
      alert('Please enter a caption for your post.');
      return;
    }

    if (!newPost.image && !newPost.video) {
      errorTracker.trackError(new Error('No media file selected'), { step: 'validation' });
      alert('Please select an image or video to upload.');
      return;
    }

    if (!currentUser) {
      errorTracker.trackError(new Error('User not authenticated'), { step: 'auth_check' });
      alert('You must be logged in to create a post.');
      return;
    }

    if (isGuest()) {
      if (window.confirm('Please sign up or log in to create posts. Guest accounts have read-only access.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }
    const sportsKeywords = ['performance', 'training', 'workout', 'talent', 'skills', 'competition', 'match', 'game', 'victory', 'win', 'congrats', 'fire', 'beast', 'crush'];
    const isSportsContent = sportsKeywords.some(keyword =>
      newPost.caption.toLowerCase().includes(keyword)
    );

    const filterResult = filterPostContent(newPost.caption, {
      strictMode: true,
      checkPatterns: true,
      languages: ['english', 'hindi'],
      context: isSportsContent ? 'sports_post' : 'general'
    });
    if (!filterResult.isClean) {
      setContentViolation(filterResult);
      setShowViolationWarning(true);

      if (filterResult.shouldFlag) {
        await logPostViolation(currentUser.uid, newPost.caption, filterResult.violations, 'post');
      }

      if (filterResult.shouldBlock || filterResult.shouldWarn) {
        const violationMsg = getPostViolationMessage(filterResult.violations, filterResult.categories);
        alert(`❌ You can't post this content: ${violationMsg}`);
        errorTracker.trackError(new Error('Content blocked by filter'), {
          step: 'content_filter',
          violations: filterResult.violations
        });
        errorTracker.stopRecording();
        return;
      }
    } else {
      setContentViolation(null);
      setShowViolationWarning(false);
    }

    setUploading(true);
    setUploadProgress(0);


    const selectedFile = newPost.image || newPost.video;
    if (selectedFile) {
      errorTracker.trackUploadAttempt(selectedFile, newPost.mediaType);
    }

    try {
      let mediaUrl = '';
      let mediaMetadata: any = {};
      if (newPost.mediaType === 'image' && newPost.image) {
        if (!newPost.image.type.startsWith('image/')) {
          throw new Error('Selected file is not a valid image.');
        }

        if (newPost.image.size > 10 * 1024 * 1024) {
          throw new Error('Image file is too large. Maximum size is 10MB.');
        }

        // Track original file size
        setOriginalFileSize(newPost.image.size);

        const safeFileName = newPost.image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `posts/images/${currentUser.uid}/${Date.now()}-${safeFileName}`;

        // Upload with compression and progress tracking
        const result = await storageService.uploadFile(
          path,
          newPost.image,
          undefined,
          {
            compress: true,
            onProgress: (progress) => {
              setUploadProgress(progress);
              if (progress < 50) {
                setCompressing(true);
                setCompressionProgress(progress * 2);
              } else {
                setCompressing(false);
                setCompressionProgress(100);
              }
            }
          }
        );

        mediaUrl = result.url;

        // Track compression stats
        if (result.metadata?.compressed) {
          setCompressedFileSize(result.metadata.size);
          setCompressionRatio(result.metadata.compressionRatio || 0);
        } else {
          setCompressedFileSize(newPost.image.size);
          setCompressionRatio(0);
        }

        mediaMetadata = {
          type: 'image',
          mimeType: newPost.image.type,
          size: result.metadata?.size || newPost.image.size,
          fileName: newPost.image.name,
          uploadedAt: new Date().toISOString(),
          path: path,
          compressed: result.metadata?.compressed || false,
          originalSize: result.metadata?.originalSize,
          compressionRatio: result.metadata?.compressionRatio
        };

      } else if (newPost.mediaType === 'video' && newPost.video) {
        mediaUrl = await uploadVideoFile(
          newPost.video,
          currentUser.uid,
          VIDEO_PATHS.POSTS,
          (progress: number) => {
            setUploadProgress(progress);
            errorTracker.trackUploadProgress(progress, { type: 'video' });
          }
        );
        mediaMetadata = await generateVideoMetadata(newPost.video, mediaUrl, currentUser.uid);
      }
      const postData = {
        caption: newPost.caption.trim(),
        mediaUrl,
        mediaMetadata,
        mediaType: newPost.mediaType,
        imageUrl: newPost.mediaType === 'image' ? mediaUrl : null,
        videoUrl: newPost.mediaType === 'video' ? mediaUrl : null,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous User',
        timestamp: Timestamp.now(),
        likes: [],
        comments: []
      };

      const docRef = await addDoc(collection(db, 'posts'), postData);
      if (selectedFile) {
        errorTracker.trackSuccess('post_creation', {
          postId: docRef.id,
          mediaType: newPost.mediaType,
          fileSize: selectedFile.size
        });
      }

      setNewPost({ caption: '', image: null, video: null, mediaType: 'image' });
      setMediaType('image');

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      setUploadProgress(0);

      alert('Post created successfully!');
      errorTracker.stopRecording();
      navigate('/home');

    } catch (error) {
      console.error('Detailed error creating post:', error);

      errorTracker.trackError(error as Error, {
        step: 'upload_execution',
        mediaType: newPost.mediaType,
        fileSize: selectedFile?.size,
        fileName: selectedFile?.name
      });

      const solution = getErrorSolution((error as any).code);

      let errorMessage = 'Failed to create post. ';

      if ((error as any).code === 'storage/unauthorized') {
        errorMessage += 'You do not have permission to upload files. Please check your account permissions.';
      } else if ((error as any).code === 'storage/canceled') {
        errorMessage += 'Upload was canceled.';
      } else if ((error as any).code === 'storage/unknown') {
        errorMessage += 'An unknown error occurred during upload.';
      } else if ((error as any).code === 'storage/invalid-format') {
        errorMessage += 'Invalid file format.';
      } else if ((error as any).code === 'storage/invalid-event-name') {
        errorMessage += 'Invalid upload configuration.';
      } else if ((error as Error).message && (error as Error).message.includes('ERR_FAILED')) {
        errorMessage += 'Firebase Storage is not properly configured. Please contact the administrator to set up Firebase Storage in the Firebase Console.';
      } else if ((error as Error).message) {
        errorMessage += (error as Error).message;
      } else {
        errorMessage += 'Please check your internet connection and try again.';
      }

      if (solution.solution) {
        errorMessage += `\n\n💡 Suggested fix: ${solution.solution}`;
      }

      alert(errorMessage);
      errorTracker.stopRecording();
    }

    setUploading(false);
  };

  const handleOfflineSubmit = async (): Promise<void> => {
    if (!newPost.caption.trim()) {
      alert('Please enter a caption for your post.');
      return;
    }

    if (!newPost.image && !newPost.video) {
      alert('Please select an image or video to upload.');
      return;
    }

    if (!currentUser) {
      alert('You must be logged in to create posts.');
      return;
    }

    if (isGuest()) {
      if (window.confirm('Please sign up or log in to create posts. Guest accounts have read-only access.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    setUploading(true);

    try {
      let mediaUrl: string | null = null;
      let mediaTypeValue: MediaType | null = null;

      const mediaFile = newPost.image || newPost.video;
      if (mediaFile) {
        const base64Data = await convertFileToBase64(mediaFile);
        mediaUrl = base64Data;
        mediaTypeValue = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const postData = {
        caption: newPost.caption.trim(),
        mediaUrl,
        mediaType: mediaTypeValue,
        originalFileName: mediaFile?.name || null,
        originalFileSize: mediaFile?.size || null
      };

      await createOfflinePost(postData, currentUser.uid);

      setNewPost({ caption: '', image: null, video: null, mediaType: 'image' });
      setMediaType('image');

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      alert('Post saved offline! It will sync automatically when you\'re back online.');
      navigate('/home');

    } catch (error) {
      console.error('Failed to create offline post:', error);
      alert('Failed to save post offline. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  if (showOfflineCreator) {
    return (
      <div className="add-post">
        <nav className="nav-bar">
          <div className="nav-content">
            <button onClick={() => setShowOfflineCreator(false)} className="back-btn">
              <ArrowLeft size={20} />
              Cancel
            </button>
            <h1>Create Post (Offline)</h1>
            <div className="nav-controls">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <div className="main-content add-post-content">
          <OfflinePostCreator
            onPostCreated={handleOfflinePostCreated}
            onCancel={() => setShowOfflineCreator(false)}
            showOfflineIndicator={true}
          />
        </div>

        <FooterNav />
      </div>
    );
  }

  return (
    <div className="add-post">
      <nav className="nav-bar">
        <div className="nav-content">
          <button onClick={() => navigate('/home')} className="back-btn">
            <ArrowLeft size={20} />
            Cancel
          </button>
          <h1>
            {t('createPost')}
            {isOffline && (
              <span className="offline-indicator">
                <WifiOff size={16} /> Offline Mode
              </span>
            )}
          </h1>
          <div className="nav-controls">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <NetworkStatus />

      <div className="main-content add-post-content">
        {offlinePostCreated && (
          <div className="offline-success-banner">
            <div className="success-content">
              <span className="success-icon">✅</span>
              <div className="success-text">
                <strong>Post saved offline!</strong>
                <p>Your post will sync automatically when you're back online.</p>
              </div>
            </div>
          </div>
        )}

        {isGuest() && (
          <div className="guest-post-restriction">
            <span>
              🔒 Guest accounts have read-only access.
              <button
                className="sign-in-link"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
              to create posts.
            </span>
          </div>
        )}

        {isOffline && (
          <div className="offline-mode-notice">
            <div className="offline-notice-content">
              <WifiOff size={20} />
              <div className="offline-text">
                <strong>You're offline</strong>
                <p>Posts will be saved locally and synced when you reconnect.</p>
              </div>
              <button
                className="offline-create-btn"
                onClick={handleOfflinePost}
                disabled={isGuest()}
              >
                Create Offline Post
              </button>
            </div>
          </div>
        )}

        <div className="create-post">
          <div className="media-type-toggle">
            <button
              type="button"
              className={`media-btn ${mediaType === 'image' ? 'active' : ''}`}
              onClick={() => toggleMediaType('image')}
            >
              <Image size={20} />
              Image
            </button>
            <button
              type="button"
              className={`media-btn ${mediaType === 'video' ? 'active' : ''}`}
              onClick={() => toggleMediaType('video')}
            >
              <Video size={20} />
              Video
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              placeholder={t('whatsOnYourMind')}
              value={newPost.caption}
              onChange={handleCaptionChange}
              required
              className={showViolationWarning ? 'content-warning' : ''}
            />

            {showViolationWarning && contentViolation && (
              <div className="content-violation-warning">
                <div className="warning-header">
                  ⚠️ Content Warning
                </div>
                <div className="warning-message">
                  {getPostViolationMessage(contentViolation.violations, contentViolation.categories)}
                </div>
                <div className="warning-suggestion">
                  💡 Try focusing on sports achievements, training tips, or positive team interactions.
                </div>
              </div>
            )}

            {mediaType === 'image' ? (
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  id="file-input"
                  required
                  style={{ display: 'none' }}
                />

                {!imagePreview ? (
                  <label htmlFor="file-input" className="image-upload-label">
                    <Image size={48} />
                    <span>Choose an image</span>
                    <small>JPG, PNG, GIF up to 10MB</small>
                  </label>
                ) : (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                    <div className="image-preview-overlay">
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="remove-image-btn"
                      >
                        ×
                      </button>
                      <label htmlFor="file-input" className="change-image-btn">
                        Change
                      </label>
                    </div>

                    {analyzingImage && (
                      <div className="image-analysis-indicator">
                        <div className="analysis-spinner"></div>
                        <span>Analyzing content...</span>
                      </div>
                    )}

                    {showImageWarning && imageAnalysis && (
                      <div className="image-analysis-warning">
                        <div className="analysis-header">
                          📷 Image Content Analysis
                        </div>
                        <div className="analysis-status">
                          Risk Level: <span className={`risk-${imageAnalysis.riskLevel}`}>
                            {imageAnalysis.riskLevel?.toUpperCase()}
                          </span>
                        </div>
                        {imageAnalysis.warnings && imageAnalysis.warnings.length > 0 && (
                          <div className="analysis-warnings">
                            <strong>Concerns:</strong>
                            <ul>
                              {imageAnalysis.warnings.slice(0, 3).map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {imageAnalysis.recommendations && imageAnalysis.recommendations.length > 0 && (
                          <div className="analysis-recommendations">
                            <strong>💡 Suggestions:</strong>
                            <p>{imageAnalysis.recommendations[0]}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <VideoUpload
                onVideoSelect={handleVideoSelect}
                onVideoRemove={handleVideoRemove}
                showPreview={true}
              />
            )}

            {/* Compression Progress Indicator */}
            {compressing && compressionProgress > 0 && (
              <div className="compression-indicator">
                <div className="compression-header">
                  <span className="compression-icon">🗜️</span>
                  <span>Compressing image...</span>
                </div>
                <div className="compression-progress">
                  <div
                    className="compression-progress-fill"
                    style={{ width: `${compressionProgress}%` }}
                  />
                </div>
                <span className="compression-progress-text">
                  {Math.round(compressionProgress)}%
                </span>
              </div>
            )}

            {/* Compression Statistics */}
            {compressionRatio > 0 && !compressing && !uploading && (
              <div className="compression-stats">
                <div className="stats-icon">✅</div>
                <div className="stats-content">
                  <strong>Image compressed successfully!</strong>
                  <div className="stats-details">
                    <span className="stat-item">
                      {formatFileSize(originalFileSize)} → {formatFileSize(compressedFileSize)}
                    </span>
                    <span className="stat-badge">{compressionRatio.toFixed(1)}% smaller</span>
                  </div>
                </div>
              </div>
            )}

            {uploading && uploadProgress > 0 && (
              <div className="upload-progress">
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="upload-progress-text">
                  {compressing ? 'Compressing...' : 'Uploading...'} {Math.round(uploadProgress)}%
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !newPost.caption.trim() || (!newPost.image && !newPost.video)}
              className="submit-btn"
            >
              {uploading ? (
                <>
                  <Upload size={20} className="spinning" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  {t('sharePost')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <FooterNav />
    </div>
  );
}
