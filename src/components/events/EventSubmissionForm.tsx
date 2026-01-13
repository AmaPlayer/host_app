/**
 * Event Submission Form Component
 * Allows users to upload talent videos for events
 * Supports video upload with deadline countdown timer
 */

import React, { useRef, useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { storageService } from '../../services/storage';
import submissionService from '../../services/api/submissionService';
import { EventSubmission } from '../../types/models/submission';
import './EventSubmissionForm.css';

interface EventSubmissionFormProps {
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  submissionDeadline?: Date | string | Timestamp;
  onSubmissionSuccess?: (submission: EventSubmission) => void;
  existingSubmission?: EventSubmission;
}

export function EventSubmissionForm({
  eventId,
  userId,
  userName,
  userAvatar,
  submissionDeadline,
  onSubmissionSuccess,
  existingSubmission,
}: EventSubmissionFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [title, setTitle] = useState(existingSubmission?.title || '');
  const [description, setDescription] = useState(existingSubmission?.description || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

  // Calculate time remaining until deadline
  useEffect(() => {
    if (!submissionDeadline) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      // Handle Timestamp, Date, or string - safely
      let deadlineMs: number = 0;

      if (!submissionDeadline) return;

      if (submissionDeadline instanceof Timestamp) {
        deadlineMs = submissionDeadline.toDate().getTime();
      } else if (submissionDeadline instanceof Date) {
        deadlineMs = submissionDeadline.getTime();
      } else if (typeof submissionDeadline === 'string') {
        deadlineMs = new Date(submissionDeadline).getTime();
      }

      const difference = deadlineMs - now;

      if (difference <= 0) {
        setTimeRemaining('Deadline passed');
        setIsDeadlinePassed(true);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h remaining`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m remaining`);
        } else {
          setTimeRemaining(`${minutes}m remaining`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [submissionDeadline]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        setError('Video size must be less than 100MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }

      setVideoFile(file);
      setError(null);

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setVideoPreview(preview);
    }
  };

  const uploadVideo = async (): Promise<string> => {
    if (!videoFile) throw new Error('No video selected');

    try {
      const storagePath = `events/${eventId}/submissions/${userId}/${Date.now()}-${videoFile.name}`;
      const result = await storageService.uploadFile(storagePath, videoFile);
      return result.url;
    } catch (err) {
      console.error('❌ Error uploading video:', err);
      throw new Error('Failed to upload video');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!videoFile && !existingSubmission) {
      setError('Please select a video');
      return;
    }

    if (isDeadlinePassed) {
      setError('Submission deadline has passed');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let videoUrl = existingSubmission?.videoUrl;

      // Upload new video if selected
      if (videoFile) {
        videoUrl = await uploadVideo();
      }

      const submissionData = {
        eventId,
        userId,
        userName,
        userAvatar,
        videoUrl: videoUrl!,
        title: title.trim(),
        description: description.trim(),
        status: 'submitted' as const,
      };

      if (existingSubmission) {
        // Update existing submission
        await submissionService.updateSubmission(existingSubmission.id, {
          ...submissionData,
          status: 'submitted',
        });
        setSuccess(true);
      } else {
        // Create new submission
        await submissionService.createSubmission(submissionData);
        setSuccess(true);
      }

      // Reset form
      setVideoFile(null);
      setVideoPreview('');
      setTitle('');
      setDescription('');

      // Call callback with a small delay to allow Firestore to persist
      if (onSubmissionSuccess) {
        // Wait briefly for Firestore to persist the document
        await new Promise(resolve => setTimeout(resolve, 500));
        const submission = await submissionService.getUserSubmissionForEvent(eventId, userId);
        if (submission) {
          onSubmissionSuccess(submission);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit video';
      setError(message);
      console.error('❌ Submission error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="event-submission-form">
      <div className="submission-header">
        <h3>Submit Your Talent Video</h3>
        {submissionDeadline && (
          <div className={`deadline-info ${isDeadlinePassed ? 'expired' : ''}`}>
            <span className="deadline-label">⏰ Deadline:</span>
            <span className={`deadline-time ${isDeadlinePassed ? 'error' : ''}`}>
              {timeRemaining}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="submission-form">
        {/* Edit Mode Banner */}
        {existingSubmission && (
          <div className="edit-mode-banner">
            <span className="edit-icon">✏️</span>
            <div>
              <p className="edit-title">Updating Your Submission</p>
              <p className="edit-hint">Changes will replace your existing submission</p>
            </div>
          </div>
        )}

        {/* Video Upload */}
        <div className="form-group">
          <label>Video *</label>
          <div className="video-upload-area">
            {videoPreview || existingSubmission?.videoUrl ? (
              <div className="video-preview">
                <video
                  src={videoPreview || existingSubmission?.videoUrl}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
                {videoPreview && <p className="new-video-indicator">✨ New video selected</p>}
              </div>
            ) : (
              <div
                className="video-upload-placeholder"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="upload-icon" />
                <p className="upload-text">Click to upload or drag video here</p>
                <p className="upload-hint">MP4, WebM, AVI (max 100MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden-input"
              disabled={uploading || isDeadlinePassed}
            />
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., My Best Sprint"
            maxLength={100}
            disabled={uploading || isDeadlinePassed}
            className="form-input"
          />
          <span className="char-count">{title.length}/100</span>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any details about your submission..."
            maxLength={500}
            disabled={uploading || isDeadlinePassed}
            className="form-textarea"
            rows={4}
          />
          <span className="char-count">{description.length}/500</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="success-message">
            <CheckCircle className="success-icon" />
            <span>{existingSubmission ? 'Video updated successfully!' : 'Video submitted successfully!'}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || isDeadlinePassed}
          className="submit-button"
        >
          {uploading ? (
            <>
              <div className="spinner" />
              Uploading...
            </>
          ) : (
            <>
              {existingSubmission ? '🔄 Update Video' : '📤 Submit Video'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default EventSubmissionForm;
