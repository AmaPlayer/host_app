import React, { useState } from 'react';
import { Post } from '../types/ProfileTypes';
import '../styles/PostViewModal.css';

interface PostViewModalProps {
  post: Post;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

const PostViewModal: React.FC<PostViewModalProps> = ({
  post,
  isOwner,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
      onClose();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatEngagementCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getPostTypeLabel = (type: Post['type']) => {
    switch (type) {
      case 'photo':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'text':
        return 'Text';
      case 'mixed':
        return 'Mixed Media';
      default:
        return 'Post';
    }
  };

  // Repost Logic - similar to main Post component
  const isInstantRepost = post.isRepost && !post.content && post.originalPost;
  const isQuoteRepost = post.isRepost && !!post.content && post.originalPost;

  // For instant reposts, show original post content
  // For quote reposts, show both sharer's message and original content
  const displayPost = isInstantRepost ? post.originalPost! : post;

  return (
    <div
      className="post-view-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-view-title"
    >
      <div className="post-view-modal">
        <div className="post-view-header">
          <div className="post-view-info">
            <span className="post-type-badge">{getPostTypeLabel(post.type)}</span>
            <span className="post-date">{formatDate(post.createdDate)}</span>
          </div>
          <div className="post-view-actions">
            {isOwner && (
              <>
                {onEdit && (
                  <button
                    className="post-action-btn edit-btn"
                    onClick={handleEdit}
                    aria-label="Edit post"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button
                    className="post-action-btn delete-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete post"
                  >
                    🗑️
                  </button>
                )}
              </>
            )}
            <button
              className="post-action-btn close-btn"
              onClick={onClose}
              aria-label="Close post view"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="post-view-content">
          {/* Repost Header */}
          {post.isRepost && post.sharerName && (
            <div style={{
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>🔁</span>
              <span style={{ fontWeight: 500, color: '#666' }}>
                {post.sharerName} reposted
              </span>
            </div>
          )}

          {/* Quote Repost Message */}
          {isQuoteRepost && post.content && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '16px', lineHeight: '1.5' }}>{post.content}</p>
            </div>
          )}

          {/* Original Post Title (for quote reposts, show in quoted box) */}
          {'title' in displayPost && displayPost.title && (
            <h2 id="post-view-title" className="post-title" style={isQuoteRepost ? {
              padding: '12px',
              background: '#f8f9fa',
              borderLeft: '3px solid #1da1f2',
              marginBottom: '12px'
            } : {}}>
              {displayPost.title}
            </h2>
          )}

          {/* Media Display - use displayPost for correct media */}
          {displayPost.mediaUrls && displayPost.mediaUrls.length > 0 && (
            <div className="post-media" style={isQuoteRepost ? {
              border: '1px solid #e1e8ed',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px'
            } : {}}>
              {displayPost.type === 'video' ? (
                <video
                  controls
                  className="post-video"
                  poster={displayPost.thumbnailUrl}
                  aria-label={`Video: ${'title' in displayPost ? displayPost.title || 'Post video' : 'Post video'}`}
                >
                  <source src={displayPost.mediaUrls[0]} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="post-images">
                  {displayPost.mediaUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${'title' in displayPost ? displayPost.title || 'Post image' : 'Post image'} ${index + 1}`}
                      className="post-image"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content - use displayPost for instant reposts */}
          {displayPost.content && !isQuoteRepost && (
            <div className="post-text-content" style={isQuoteRepost ? {
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px'
            } : {}}>
              <p>{displayPost.content}</p>
            </div>
          )}

          {/* Engagement Stats - use displayPost for accurate counts */}
          <div className="post-engagement-stats">
            <div className="engagement-stat">
              <span className="engagement-icon">❤️</span>
              <span className="engagement-count">{formatEngagementCount('likes' in displayPost ? displayPost.likes : 0)}</span>
              <span className="engagement-label">likes</span>
            </div>
            <div className="engagement-stat">
              <span className="engagement-icon">💬</span>
              <span className="engagement-count">{formatEngagementCount('comments' in displayPost ? displayPost.comments : 0)}</span>
              <span className="engagement-label">comments</span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-confirmation">
            <div className="delete-confirmation-content">
              <h3>Delete Post</h3>
              <p>Are you sure you want to delete this post? This action cannot be undone.</p>
              <div className="delete-confirmation-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostViewModal;