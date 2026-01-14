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
  refreshTrigger?: number; // External trigger to force refresh
  onReply?: (comment: Comment) => void; // Callback for reply action
}

const CommentSection = memo<CommentSectionProps>(({
  contentId,
  contentType,
  className = '',
  hideCommentForm = false,
  onCommentAdded,
  onCommentDeleted,
  refreshTrigger = 0,
  onReply
}) => {
  const { currentUser, isGuest } = useAuth();
  // Ensure useSupabaseComments returns nested comments (CommentService does the nesting)
  const { comments, loading, error, refresh } = useSupabaseComments(contentId, contentType);

  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // State for threaded replies
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);

  // Load user profile from Firestore instead of using Firebase Auth
  useEffect(() => {
    if (currentUser && !isGuest()) {
      userService
        .getUserProfile(currentUser.uid)
        .then(profile => {
          setUserProfile(profile);
          console.log('✅ User profile loaded for comments:', profile?.displayName);
        })
        .catch(err => {
          console.error('❌ Error loading user profile:', err);
          setUserProfile(null);
        });
    }
  }, [currentUser, isGuest]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 External refresh trigger received, refreshing comments...');
      refresh();
    }
  }, [refreshTrigger, refresh]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
  };

  const startReply = (comment: Comment) => {
    if (onReply) {
      onReply(comment);
    } else {
      setReplyingTo({ id: comment.id, displayName: comment.userDisplayName });
      const input = document.querySelector('.comment-input') as HTMLInputElement;
      if (input) input.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

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

      const displayName = userProfile?.displayName || currentUser.displayName || 'Anonymous User';
      const photoURL = userProfile?.photoURL || currentUser.photoURL || null;

      console.log('📝 Submitting comment with profile data:', {
        displayName,
        photoURL,
        userId: currentUser.uid,
        parentId: replyingTo?.id
      });

      await CommentService.addComment(contentId, contentType, {
        text: newComment.trim(),
        userId: currentUser.uid,
        userDisplayName: displayName,
        userPhotoURL: photoURL,
        parentId: replyingTo?.id // Pass parent ID for replies
      });

      setNewComment('');
      setReplyingTo(null); // Clear reply state

      // Refresh comments list to show the new comment
      refresh();

      console.log('🔄 Invalidating cache after comment added...');
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['posts', contentId] });

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setLocalError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [currentUser, isGuest, newComment, submitting, contentId, contentType, userProfile, refresh, replyingTo, onCommentAdded]);

  // Handle comment deletion
  const handleDeleteComment = useCallback(async (comment: Comment) => {
    if (!currentUser) return;
    if (!window.confirm('Delete this comment?')) return;

    try {
      setLocalError(null);
      await CommentService.deleteComment(comment.id, contentId, contentType, currentUser.uid);
      refresh();

      console.log('🔄 Invalidating cache after comment deleted...');
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['posts', contentId] });

      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setLocalError(err.message || 'Failed to delete comment');
    }
  }, [currentUser, contentId, contentType, refresh, onCommentDeleted]);

  // Handle comment edit submission
  const handleEditSubmit = useCallback(async (comment: Comment) => {
    if (!currentUser || !editText.trim()) return;
    try {
      setLocalError(null);
      await CommentService.editComment(comment.id, editText.trim(), currentUser.uid);
      setEditingId(null);
      setEditText('');
      refresh();
    } catch (err: any) {
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
      refresh();
    } catch (err: any) {
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

  // Helper to render comments recursively
  const renderComment = (comment: Comment, depth = 0) => {
    const isOwner = currentUser?.uid === comment.userId;
    const isLiked = currentUser ? comment.likes.includes(currentUser.uid) : false;
    const isEditing = editingId === comment.id;

    // Resolve depth class for responsive indentation
    let depthClass = 'reply-depth-0';
    if (depth > 0) {
      if (depth === 1) depthClass = 'reply-depth-1';
      else if (depth === 2) depthClass = 'reply-depth-2';
      else if (depth === 3) depthClass = 'reply-depth-3';
      else depthClass = 'reply-depth-max';
    }

    return (
      <div key={comment.id} className={`comment-thread ${depthClass}`}>
        <div className="comment-item">
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
                <button onClick={() => handleEditSubmit(comment)} className="save-btn">Save</button>
                <button onClick={() => { setEditingId(null); setEditText(''); }} className="cancel-btn">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="comment-text">{comment.text}</p>
          )}

          {/* Comment footer with like button AND Reply button */}
          <div className="comment-footer">
            {currentUser && (
              <>
                <button
                  className={`like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => handleToggleLike(comment)}
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                  {comment.likesCount > 0 && <span className="like-count">{comment.likesCount}</span>}
                </button>
                <button
                  className="reply-btn small-text"
                  onClick={() => startReply(comment)}
                  style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}
                >
                  Reply
                </button>
              </>
            )}
          </div>
        </div>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
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
            {comments.map(comment => renderComment(comment))}
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {replyingTo && (
              <div className="replying-to-indicator" style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center' }}>
                <span>Replying to <strong>{replyingTo.displayName}</strong></span>
                <button type="button" onClick={cancelReply} style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            )}
            <div className="comment-input-wrapper">
              <input
                type="text"
                placeholder={replyingTo ? `Reply to ${replyingTo.displayName}...` : "Add a comment..."}
                value={newComment}
                onChange={handleInputChange}
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
