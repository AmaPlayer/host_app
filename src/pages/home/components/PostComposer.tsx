import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMediaUpload } from '../../../hooks/useMediaUpload';
import { filterPostContent, getPostViolationMessage, logPostViolation } from '../../../utils/content/postContentFilter';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Image, Upload, X, Trash2 } from 'lucide-react';
import { User as FirebaseAuthUser } from 'firebase/auth'; // Renamed to avoid conflict
import UserAvatar from '../../../components/common/user/UserAvatar';
import userService from '../../../services/api/userService';
import { User as FirestoreUser } from '../../../types/models/user'; // Import Firestore User type
import PostMediaCropper, { VideoCropData, CropResult } from '../../../components/common/media/PostMediaCropper';
import './PostComposer.css';

interface PostComposerProps {
  currentUser: FirebaseAuthUser | null;
  isGuest: boolean;
  onPostCreated?: () => void;
  disabled?: boolean;
}

interface PostViolation {
  isClean: boolean;
  shouldBlock: boolean;
  shouldWarn: boolean;
  shouldFlag: boolean;
  violations: string[];
  categories: string[];
}

/**
 * PostComposer Component
 * Handles post creation, media upload, and content validation
 */
const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  isGuest,
  onPostCreated,
  disabled = false
}) => {
  const { t } = useLanguage();

  // Local state for post composition
  const [postText, setPostText] = useState<string>('');
  const [postViolation, setPostViolation] = useState<PostViolation | null>(null);
  const [showPostWarning, setShowPostWarning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null); // State for Firestore user profile
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [fileToBeCropped, setFileToBeCropped] = useState<File | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [videoCropData, setVideoCropData] = useState<VideoCropData | null>(null);


  // Fetch Firestore user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser?.uid) {
        setProfileLoading(true);
        try {
          const userProfile = await userService.getUserProfile(currentUser.uid);
          setFirestoreUser(userProfile);
        } catch (error) {
          console.error('Error fetching Firestore user profile:', error);
          setFirestoreUser(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setFirestoreUser(null);
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser?.uid]);


  // Media upload hook
  const {
    selectedMedia,
    mediaPreview,
    uploading,
    uploadProgress,
    error: mediaError,
    selectMedia,
    removeMedia,
    uploadMedia,
    handleFileSelect,
    clearError,
    reset: resetMedia
  } = useMediaUpload();

  /**
   * Handle post text change with real-time content filtering
   */
  const handlePostTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPostText(text);

    // Real-time content filtering
    if (text.trim().length > 3) {
      const filterResult = filterPostContent(text, {
        context: 'sports_post',
        languages: ['english', 'hindi']
      });

      if (!filterResult.isClean && filterResult.shouldBlock) {
        setPostViolation(filterResult);
        setShowPostWarning(true);
      } else {
        setPostViolation(null);
        setShowPostWarning(false);
      }
    } else {
      setPostViolation(null);
      setShowPostWarning(false);
    }
  }, []);

  /**
   * Handle media file selection - Show cropper instead of direct preview
   */
  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before showing cropper
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size must be less than 50MB');
      return;
    }

    // Show cropper modal
    setFileToBeCropped(file);
    setShowCropper(true);

    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, []);

  /**
   * Remove selected media
   */
  const handleRemoveMedia = useCallback(() => {
    removeMedia();
    setCroppedImageBlob(null);
    setVideoCropData(null);
  }, [removeMedia]);

  /**
   * Handle crop completion from PostMediaCropper
   */
  const handleCropComplete = useCallback((result: CropResult) => {
    setShowCropper(false);
    setFileToBeCropped(null);

    if (result.type === 'image') {
      // Store cropped blob for upload
      setCroppedImageBlob(result.blob!);

      // Create File from blob for useMediaUpload hook
      const croppedFile = new File([result.blob!], fileToBeCropped!.name, { type: 'image/jpeg' });
      selectMedia(croppedFile);
    } else {
      // Store video crop metadata
      setVideoCropData(result.cropData!);

      // Select original video file
      selectMedia(fileToBeCropped!);
    }
  }, [fileToBeCropped, selectMedia]);

  /**
   * Handle crop cancellation
   */
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setFileToBeCropped(null);
  }, []);

  /**
   * Create and submit post
   */
  const handleCreatePost = useCallback(async () => {
    if (isGuest) {
      alert(t('pleaseSignUpToCreatePosts'));
      return;
    }

    if (!currentUser || !firestoreUser) { // Check for firestoreUser as well
      alert(t('mustBeLoggedIn'));
      return;
    }

    const text = postText.trim();
    if (!text && !selectedMedia) {
      alert(t('writeOrSelectMedia'));
      return;
    }

    // Content filtering
    if (text) {
      const filterResult = filterPostContent(text, {
        context: 'sports_post',
        languages: ['english', 'hindi']
      });

      if (!filterResult.isClean) {
        setPostViolation(filterResult);
        setShowPostWarning(true);

        if (filterResult.shouldFlag) {
          await logPostViolation(currentUser.uid, text, filterResult.violations, 'home_post');
        }

        if (filterResult.shouldBlock || filterResult.shouldWarn) {
          const violationMsg = getPostViolationMessage(filterResult.violations, filterResult.categories);
          alert(`❌ ${t('cantPostContent')}: ${violationMsg}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | null = null;

      // Upload media if selected
      if (selectedMedia) {
        mediaUrl = await uploadMedia(selectedMedia, currentUser.uid);
        mediaType = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
      }

      // Get user profile data from localStorage with proper null handling
      const profileRole = localStorage.getItem('userRole') || 'athlete';
      // Map profile role to post role format
      const userRole = profileRole === 'parents' ? 'parent' : profileRole === 'coaches' ? 'coach' : profileRole;

      // Helper function to safely get localStorage value (avoids undefined/empty string)
      const getSafeValue = (key: string): string | null => {
        const value = localStorage.getItem(key);
        return value && value.trim() !== '' && value !== '[object Object]' ? value : null;
      };

      // Helper to extract string from object or string
      const extractString = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value !== '[object Object]' ? value : null;
        if (typeof value === 'object' && value !== null && 'name' in value) return value.name;
        return null;
      };

      const userSport = getSafeValue('userSport');
      const userPosition = getSafeValue('userPosition');
      const userPlayerType = getSafeValue('userPlayerType');
      const userOrganizationType = getSafeValue('userOrganizationType');
      // Use firestoreUser's displayName and photoURL
      const userDisplayName = firestoreUser?.displayName || currentUser.displayName || 'Anonymous User';
      const userPhotoURL = firestoreUser?.photoURL || currentUser.photoURL || null;


      const userSpecializationsStr = getSafeValue('userSpecializations');
      const userSpecializations = userSpecializationsStr
        ? JSON.parse(userSpecializationsStr)
        : null;

      // Create post document with all required fields
      const postData: any = {
        userId: currentUser.uid,
        userDisplayName: userDisplayName,
        userPhotoURL: userPhotoURL, // Use firestoreUser's photoURL
        userRole: userRole,
        caption: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        likes: [],
        comments: [],
        shares: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isActive: true,
        visibility: 'public'
      };

      // Only add optional fields if they have values
      if (userSport) postData.userSport = userSport;
      if (userPosition) postData.userPosition = userPosition;
      if (userPlayerType) postData.userPlayerType = userPlayerType;
      if (userOrganizationType) postData.userOrganizationType = userOrganizationType;
      if (userSpecializations) postData.userSpecializations = userSpecializations;

      // Save video crop data (images are already cropped to 1:1)
      if (mediaType === 'video' && videoCropData) {
        postData.mediaSettings = {
          cropData: videoCropData,
          aspectRatio: 1
        };
      }

      await addDoc(collection(db, 'posts'), postData);

      // Reset form
      resetForm();

      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }

      alert(t('postCreatedSuccessfully'));
    } catch (error) {
      console.error('Error creating post:', error);
      alert(t('failedToCreatePost'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isGuest,
    postText,
    selectedMedia,
    currentUser,
    firestoreUser,
    uploadMedia,
    videoCropData,
    onPostCreated,
    t
  ]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setPostText('');
    setPostViolation(null);
    setShowPostWarning(false);
    resetMedia();
    clearError();
    setCroppedImageBlob(null);
    setVideoCropData(null);
    setShowCropper(false);
    setFileToBeCropped(null);
  }, [resetMedia, clearError]);

  // Don't render for guest users
  if (isGuest) {
    return null;
  }

  // Display loading spinner or placeholder while profile is loading
  if (profileLoading) {
    return (
      <div className="post-composer loading">
        {t('loadingProfile')}
      </div>
    );
  }


  const isFormDisabled = disabled || isSubmitting || uploading;
  const canSubmit = (postText.trim() || selectedMedia) && !showPostWarning && !isFormDisabled;

  return (
    <div className="post-composer">
      <div className="composer-header">
        <div className="composer-avatar">
          <UserAvatar
            userId={currentUser?.uid || ''}
            displayName={firestoreUser?.displayName || currentUser?.displayName || 'User'}
            photoURL={firestoreUser?.photoURL || currentUser?.photoURL || undefined}
            size="medium"
            clickable={true}
            className="composer-avatar-image"
          />
        </div>
        <textarea
          className={`composer-input ${showPostWarning ? 'content-warning' : ''}`}
          placeholder={t('whatsOnYourMind')}
          value={postText}
          onChange={handlePostTextChange}
          disabled={isFormDisabled}
          rows={3}
        />
      </div>

      {/* Content Warning */}
      {showPostWarning && postViolation && (
        <div className="composer-warning">
          <div className="warning-header">
            <Trash2 size={16} />
            {t('inappropriateContentDetected')}
          </div>
          <div className="warning-message">
            {getPostViolationMessage(postViolation.violations, postViolation.categories)}
          </div>
          <div className="warning-suggestion">
            💪 {t('trySharingProgress')}
          </div>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className="media-preview">
          <button
            className="remove-media-btn"
            onClick={handleRemoveMedia}
            disabled={isFormDisabled}
          >
            <X size={20} />
          </button>
          {mediaPreview.type === 'image' ? (
            <img
              src={mediaPreview.url}
              alt={t('preview')}
            />
          ) : (
            <video
              src={mediaPreview.url}
              controls
              muted
            />
          )}
          <div className="media-info">
            <span>{mediaPreview.name}</span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span>{uploadProgress}% {t('uploaded')}</span>
        </div>
      )}

      {/* Media Error */}
      {mediaError && (
        <div className="composer-error">
          <span>{mediaError}</span>
          <button onClick={clearError} className="clear-error-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Composer Actions */}
      <div className="composer-actions">
        <div className="media-actions">
          <input
            type="file"
            id="media-upload"
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            style={{ display: 'none' }}
            disabled={isFormDisabled}
          />
          <label htmlFor="media-upload" className={`media-btn ${isFormDisabled ? 'disabled' : ''}`}>
            <Image size={20} />
            {t('photoVideo')}
          </label>
        </div>

        <button
          className="post-btn"
          onClick={handleCreatePost}
          disabled={!canSubmit}
        >
          {isSubmitting || uploading ? (
            <>
              <Upload size={16} />
              {uploading ? t('uploading') : t('posting')}
            </>
          ) : (
            t('post')
          )}
        </button>
      </div>

      {/* Media Cropper Modal */}
      {showCropper && fileToBeCropped && (
        <PostMediaCropper
          file={fileToBeCropped}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default PostComposer;
