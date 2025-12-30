import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMediaUpload } from '../../../hooks/useMediaUpload';
import { usePostOperations } from '../../../hooks/usePostOperations'; // Import hook
import { filterPostContent, getPostViolationMessage, logPostViolation } from '../../../utils/content/postContentFilter';
import { Image, Upload, X, Trash2 } from 'lucide-react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import UserAvatar from '../../../components/common/user/UserAvatar';
import userService from '../../../services/api/userService';
import { User as FirestoreUser } from '../../../types/models/user';
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
  const { createPost } = usePostOperations(); // Use hook

  // Local state for post composition
  const [postText, setPostText] = useState<string>('');
  const [postViolation, setPostViolation] = useState<PostViolation | null>(null);
  const [showPostWarning, setShowPostWarning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
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
    error: mediaError,
    selectMedia,
    removeMedia,
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

    if (!currentUser || !firestoreUser) {
      alert(t('mustBeLoggedIn'));
      return;
    }

    const text = postText.trim();
    if (!text && !selectedMedia) {
      alert(t('writeOrSelectMedia'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the cropped blob if available (converted to File), otherwise selectedMedia
      let fileToUpload: File | undefined = undefined;
      if (selectedMedia) {
        fileToUpload = selectedMedia;
      } else if (croppedImageBlob) {
         // Should have been selected already, but double check
         fileToUpload = new File([croppedImageBlob], "image.jpg", { type: "image/jpeg" });
      }

      await createPost({
        text,
        mediaFile: fileToUpload,
        currentUser: { ...firestoreUser, uid: currentUser.uid } as any // Ensure basic user props
      });

      // Reset form
      resetForm();

      // Notify parent component (Home will refresh)
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
    croppedImageBlob,
    currentUser,
    firestoreUser,
    createPost,
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


  const isFormDisabled = disabled || isSubmitting;
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
          {isSubmitting ? (
            <>
              <Upload size={16} />
              {t('posting')}
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
