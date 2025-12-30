// Reusable comment section component for all content types
import React, { useState, useCallback, memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Heart, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSupabaseComments } from '../../../hooks/useSupabaseComments';
import CommentService, { Comment, ContentType } from '../../../services/api/commentService';
import LoadingSpinner from '../feedback/LoadingSpinner';
import ErrorMessage from '../feedback/ErrorMessage';
import userService from '../../../services/api/userService';
import { User } from '../../../types/models/user';
import UserAvatar from '../user/UserAvatar';
import { queryClient } from '../../../lib/queryClient';
import './CommentSection.css';

interface CommentSectionProps {
  contentId: string;
  contentType: ContentType;
  className?: string;
  hideCommentForm?: boolean; // Hide form when using separate CommentInputForm
  onCommentAdded?: () => void; // Callback when comment is added (Fix Issue #5)
  onCommentDeleted?: () => void; // Callback when comment is deleted (Fix Issue #5)
}

const CommentSection = memo<CommentSectionProps>(({
  contentId,
  contentType,
  className = '',
  hideCommentForm = false,
  onCommentAdded,
  onCommentDeleted
}) => {
  const { currentUser, isGuest } = useAuth();
  const { comments, loading, error, refresh } = useSupabaseComments(contentId, contentType);

  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // Load user profile from Firestore instead of using Firebase Auth
  useEffect(() => {
    if (currentUser && !isGuest()) {
      userService
        .getUserProfile(currentUser.uid)
        .then(profile => {
          setUserProfile(profile);
          // eslint-disable-next-line no-console
          console.log('✅ User profile loaded for comments:', profile?.displayName);
        })
        .catch(err => {
          // eslint-disable-next-line no-console
          console.error('❌ Error loading user profile:', err);
          // Fallback to Firebase Auth data if Firestore fetch fails
          setUserProfile(null);
        });
    }
  }, [currentUser, isGuest]);

  // Handle comment submission
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !newComment.trim() || submitting) return;

    if (isGuest()) {
      setLocalError('Please sign in to comment');
      return;
    }

    try {
      setSubmitting(true);
      setLocalError(null);

      // Use Firestore profile data instead of Firebase Auth
      // This ensures the comment displays with the correct name and picture from the user's profile
      const displayName = userProfile?.displayName || currentUser.displayName || 'Anonymous User';
      const photoURL = userProfile?.photoURL || currentUser.photoURL || null;

      // eslint-disable-next-line no-console
      console.log('📝 Submitting comment with profile data:', {
        displayName,
        photoURL,
        userId: currentUser.uid
      });

      await CommentService.addComment(contentId, contentType, {
        text: newComment.trim(),
        userId: currentUser.uid,
        userDisplayName: displayName,
        userPhotoURL: photoURL
      });

      setNewComment('');
      // Refresh comments list to show the new comment
      refresh();

      // Invalidate cache and notify parent (Fix Issue #3 & #5)
      console.log('🔄 Invalidating cache after comment added...');
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['posts', contentId] });

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error submitting comment:', err);
      setLocalError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [currentUser, isGuest, newComment, submitting, contentId, contentType, userProfile, refresh]);

  // Handle comment deletion
  const handleDeleteComment = useCallback(async (comment: Comment) => {
    if (!currentUser) return;

    if (!window.confirm('Delete this comment?')) return;

    try {
      setLocalError(null);
      await CommentService.deleteComment(comment.id, contentId, contentType, currentUser.uid);
      // Refresh comments list after deletion
      refresh();

      // Invalidate cache and notify parent (Fix Issue #3 & #5)
      console.log('🔄 Invalidating cache after comment deleted...');
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['posts', contentId] });

      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error deleting comment:', err);
      setLocalError(err.message || 'Failed to delete comment');
    }
  }, [currentUser, contentId, contentType, refresh]);

  // Handle comment edit submission
  const handleEditSubmit = useCallback(async (comment: Comment) => {
    if (!currentUser || !editText.trim()) return;

    try {
      setLocalError(null);
      await CommentService.editComment(comment.id, editText.trim(), currentUser.uid);
      setEditingId(null);
      setEditText('');
      // Refresh comments list after edit
      refresh();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error editing comment:', err);
      setLocalError(err.message || 'Failed to edit comment');
    }
  }, [currentUser, editText, refresh]);

  // Handle comment like toggle
  const handleToggleLike = useCallback(async (comment: Comment) => {
    if (!currentUser) return;

    try {
      setLocalError(null);
      await CommentService.toggleCommentLike(comment.id, currentUser.uid);
      // Refresh comments list after like
      refresh();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error toggling like:', err);
      setLocalError(err.message || 'Failed to like comment');
    }
  }, [currentUser, refresh]);

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return time.toLocaleDateString();
  };

  return (
    <div className={`comment-section ${className}`}>
      {/* Error message */}
      {(error || localError) && (
        <ErrorMessage
          message={error || localError || ''}
          type="error"
          onDismiss={() => setLocalError(null)}
          onRetry={refresh}
        />
      )}

      {/* Comments list */}
      <div className="comments-list-container">
        {loading ? (
          <div className="comments-loading">
            <LoadingSpinner size="small" text="Loading comments..." />
          </div>
        ) : comments.length === 0 ? (
          <div className="comments-empty">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map(comment => {
              const isOwner = currentUser?.uid === comment.userId;
              const isLiked = currentUser ? comment.likes.includes(currentUser.uid) : false;
              const isEditing = editingId === comment.id;

              return (
                <div key={comment.id} className="comment-item">
                  {/* Comment header */}
                  <div className="comment-header">
                    <div className="comment-avatar">
                      <UserAvatar
                        userId={comment.userId}
                        displayName={comment.userDisplayName}
                        photoURL={comment.userPhotoURL || undefined}
                        size="small"
                        clickable={true}
                      />
                    </div>
                    <div className="comment-meta">
                      <Link
                        to={`/profile/${comment.userId}`}
                        className="comment-author-link"
                        title={`View ${comment.userDisplayName}'s profile`}
                      >
                        <h4 className="comment-author">{comment.userDisplayName}</h4>
                      </Link>
                      <span className="comment-time">{formatTime(comment.timestamp)}</span>
                      {comment.edited && <span className="edited-tag">(edited)</span>}
                    </div>
                    {isOwner && (
                      <div className="comment-actions-menu">
                        <button
                          className="edit-btn"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.text);
                          }}
                          title="Edit comment"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteComment(comment)}
                          title="Delete comment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment content or edit form */}
                  {isEditing ? (
                    <div className="comment-edit-form">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="edit-input"
                        maxLength={500}
                      />
                      <div className="edit-actions">
                        <button
                          onClick={() => handleEditSubmit(comment)}
                          className="save-btn"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText('');
                          }}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{comment.text}</p>
                  )}

                  {/* Comment footer with like button */}
                  <div className="comment-footer">
                    {currentUser && (
                      <button
                        className={`like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleToggleLike(comment)}
                        title={isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                        {comment.likesCount > 0 && (
                          <span className="like-count">{comment.likesCount}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment input form - hidden if hideCommentForm prop is true */}
      {!hideCommentForm && currentUser && !isGuest() && (
        <form className="comment-input-form" onSubmit={handleSubmitComment}>
          <div className="user-avatar-small-container">
            <UserAvatar
              userId={currentUser.uid}
              displayName={userProfile?.displayName || currentUser.displayName || 'User'}
              photoURL={userProfile?.photoURL || currentUser.photoURL || undefined}
              size="small"
              clickable={false}
              className="user-avatar-small"
            />
          </div>
          <div className="comment-input-wrapper">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
              maxLength={500}
              className="comment-input"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="send-btn"
              title="Send comment"
            >
              {submitting ? (
                <div className="spinner-small" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>
      )}

      {!hideCommentForm && !currentUser && (
        <div className="comment-login-prompt">
          <p>Sign in to join the conversation</p>
        </div>
      )}
    </div>
  );
});

CommentSection.displayName = 'CommentSection';

export default CommentSection;
