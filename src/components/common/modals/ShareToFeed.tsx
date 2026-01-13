// ShareToFeed component for sharing posts to user's personal feed
import React, { memo, useState, useCallback, ChangeEvent, MouseEvent } from 'react';
import { Globe, Users, Lock, Loader2, Eye, MessageSquare, Heart } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import { SHARE_TYPES, PRIVACY_LEVELS } from '../../../constants/sharing';
import { Post } from '../../../types/models';
import { User } from 'firebase/auth';

interface PrivacyOption {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface ShareData {
  type: string;
  postId: string;
  targets: string[];
  message: string;
  privacy: string;
  originalPost: Post;
}

interface ShareToFeedProps {
  post: Post;
  currentUser: User | null;
  onShare: (shareData: ShareData) => Promise<void>;
  isSubmitting: boolean;
  shareMessage: string;
  onMessageChange: (message: string) => void;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: PRIVACY_LEVELS.PUBLIC,
    label: 'Public',
    description: 'Anyone can see this post',
    icon: Globe
  },
  {
    value: PRIVACY_LEVELS.FRIENDS,
    label: 'Friends',
    description: 'Only your friends can see this post',
    icon: Users
  },
  {
    value: PRIVACY_LEVELS.PRIVATE,
    label: 'Only Me',
    description: 'Only you can see this post',
    icon: Lock
  }
];

const ShareToFeed = memo<ShareToFeedProps>(({
  post,
  currentUser,
  onShare,
  isSubmitting,
  shareMessage,
  onMessageChange
}) => {
  const [privacyLevel, setPrivacyLevel] = useState<string>(PRIVACY_LEVELS.FRIENDS);

  // Handle privacy level change
  const handlePrivacyChange = useCallback((level: string) => {
    if (isSubmitting) return;
    setPrivacyLevel(level);
  }, [isSubmitting]);

  // Handle share submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const shareData: ShareData = {
      type: SHARE_TYPES.FEED,
      postId: post.id,
      targets: ['feed'], // Special target for feed sharing
      message: shareMessage.trim(),
      privacy: privacyLevel,
      originalPost: post
    };

    await onShare(shareData);
  }, [isSubmitting, post, shareMessage, privacyLevel, onShare]);

  // Format time for post preview
  const formatTime = useCallback((timestamp: Date): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  // Get privacy icon
  const getPrivacyIcon = (level: string): React.ComponentType<{ size?: number }> => {
    const option = PRIVACY_OPTIONS.find(opt => opt.value === level);
    return option ? option.icon : Globe;
  };

  return (
    <div className="share-to-feed">
      {/* Privacy Selection */}
      <div className="privacy-section">
        <h4>Who can see this shared post?</h4>
        <div className="privacy-options">
          {PRIVACY_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                className={`privacy-option ${privacyLevel === option.value ? 'selected' : ''}`}
                onClick={() => handlePrivacyChange(option.value)}
                disabled={isSubmitting}
              >
                <div className="privacy-icon">
                  <IconComponent size={20} />
                </div>
                <div className="privacy-info">
                  <h5>{option.label}</h5>
                  <p>{option.description}</p>
                </div>
                <div className="privacy-radio">
                  {privacyLevel === option.value && <div className="radio-dot" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      <div className="share-message-section">
        <h4>Add your thoughts (optional)</h4>
        <textarea
          placeholder="What do you think about this post?"
          value={shareMessage}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onMessageChange(e.target.value)}
          className="share-message-input"
          rows={4}
          maxLength={500}
          disabled={isSubmitting}
        />
        <div className="message-counter">
          {shareMessage.length}/500
        </div>
      </div>

      {/* Post Preview */}
      <div className="shared-post-preview">
        <h4>Preview of shared post</h4>
        <div className="preview-container">
          {/* Your post header */}
          <div className="share-header">
            <LazyImage
              src={currentUser?.photoURL || ''}
              alt={currentUser?.displayName || ''}
              className="user-avatar small"
              placeholder="/default-avatar.jpg"
            />
            <div className="share-info">
              <h5>{currentUser?.displayName}</h5>
              <div className="share-meta">
                <span>Just now</span>
                <span className="privacy-indicator">
                  {React.createElement(getPrivacyIcon(privacyLevel), { size: 12 })}
                  {PRIVACY_OPTIONS.find(opt => opt.value === privacyLevel)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Your message */}
          {shareMessage.trim() && (
            <div className="share-message-preview">
              <p>{shareMessage}</p>
            </div>
          )}

          {/* Original post */}
          <div className="original-post-preview">
            <div className="original-post-header">
              <LazyImage
                src={post.userPhotoURL}
                alt={post.userDisplayName}
                className="user-avatar small"
                placeholder="/default-avatar.jpg"
              />
              <div className="original-user-info">
                <h6>{post.userDisplayName}</h6>
                <span className="original-post-time">{formatTime(post.createdAt && typeof (post.createdAt as any).toDate === 'function' ? (post.createdAt as any).toDate() : new Date(post.createdAt as any))}</span>
              </div>
            </div>

            {post.caption && (
              <div className="original-post-content">
                <p>{post.caption}</p>
              </div>
            )}

            {/* Mock engagement stats */}
            <div className="original-post-stats">
              <span className="stat">
                <Heart size={14} />
                {post.likesCount || 0}
              </span>
              <span className="stat">
                <MessageSquare size={14} />
                {post.commentsCount || 0}
              </span>
              <span className="stat">
                <Eye size={14} />
                {(post as any).viewsCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Actions */}
      <div className="share-actions">
        <div className="share-info">
          <p>This will repost this content to your profile and feed.</p>
        </div>

        <button
          className="share-submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spinning" />
              Reposting...
            </>
          ) : (
            <>
              Repost
            </>
          )}
        </button>
      </div>
    </div>
  );
});

ShareToFeed.displayName = 'ShareToFeed';

export default ShareToFeed;
