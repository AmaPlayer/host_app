// Share modal for internal sharing (friends, feed, groups) with tab navigation
import React, { memo, useState, useCallback, useEffect, ReactNode, MouseEvent } from 'react';
import { X, Users, Rss, MessageCircle, Loader2 } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import ShareToFriends from './ShareToFriends';
import ShareToFeed from './ShareToFeed';
import ShareToGroups from './ShareToGroups';
import ShareErrorBoundary from '../safety/ShareErrorBoundary';
import ShareNetworkFallback from '../ui/ShareNetworkFallback';
import { handleShareError, retryShareOperation } from '../../../utils/sharing/shareErrorHandler';
import { Post } from '../../../types/models';
import { User } from 'firebase/auth';
import './Modal.css';
import './ShareModalMobile.css'; // Mobile-responsive styles

import { SHARE_TABS, ShareTab } from '../../../constants/sharing';

interface ShareData {
  type: string;
  postId: string;
  targets: string[];
  message: string;
  privacy?: string;
  originalPost: Post;
}

interface ErrorInfo {
  error: string;
  category: string;
  canRetry: boolean;
}

interface ShareModalProps {
  post: Post;
  currentUser: User | null;
  onClose: () => void;
  onShareComplete: (shareData: any) => Promise<void>;
  initialTab?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  post,
  currentUser,
  onClose,
  onShareComplete,
  initialTab = SHARE_TABS.FRIENDS
}) => {
  const [activeTab, setActiveTab] = useState<ShareTab>(initialTab as ShareTab);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shareMessage, setShareMessage] = useState<string>('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showNetworkFallback, setShowNetworkFallback] = useState<boolean>(false);

  // Handle tab switching
  const handleTabChange = useCallback((tab: ShareTab) => {
    if (isSubmitting) return;
    setActiveTab(tab);
    setSelectedTargets([]);
    setShareMessage('');
  }, [isSubmitting]);

  // Handle share completion with error handling and retry
  const handleShare = useCallback(async (shareData: ShareData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setShowNetworkFallback(false);

    try {
      // Wrap share operation with retry logic
      await retryShareOperation(
        async () => {
          const result = await onShareComplete?.(shareData);
          return result;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt: number, delay: number, retryError: Error) => {
            setRetryCount(attempt);

            // Show network fallback for network errors
            const errorInfo = handleShareError(retryError, {
              shareType: shareData.type,
              postId: shareData.postId
            });

            if (errorInfo.category === 'network') {
              setShowNetworkFallback(true);
            }
          }
        }
      );

      // Success - close modal
      onClose();
    } catch (error) {
      console.error('Share failed:', error);

      // Handle error with user-friendly messages
      const errorInfo = handleShareError(error as Error, {
        shareType: shareData.type,
        postId: shareData.postId,
        targets: shareData.targets
      });

      setError(errorInfo);

      // Show network fallback for network errors
      if (errorInfo.category === 'network') {
        setShowNetworkFallback(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onShareComplete, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

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

  // Get tab icon
  const getTabIcon = (tab: ShareTab): ReactNode => {
    switch (tab) {
      case SHARE_TABS.FRIENDS:
        return <Users size={18} />;
      case SHARE_TABS.FEED:
        return <Rss size={18} />;
      case SHARE_TABS.GROUPS:
        return <MessageCircle size={18} />;
      default:
        return null;
    }
  };

  // Render active tab content
  const renderTabContent = (): ReactNode => {
    if (isLoading) {
      return (
        <div className="share-loading">
          <Loader2 size={24} className="spinning" />
          <p>Loading...</p>
        </div>
      );
    }

    switch (activeTab) {
      case SHARE_TABS.FRIENDS:
        return (
          <ShareToFriends
            post={post}
            currentUser={currentUser}
            onShare={handleShare}
            isSubmitting={isSubmitting}
            selectedTargets={selectedTargets}
            onTargetsChange={setSelectedTargets}
            shareMessage={shareMessage}
            onMessageChange={setShareMessage}
          />
        );
      case SHARE_TABS.FEED:
        return (
          <ShareToFeed
            post={post}
            currentUser={currentUser}
            onShare={handleShare}
            isSubmitting={isSubmitting}
            shareMessage={shareMessage}
            onMessageChange={setShareMessage}
          />
        );
      case SHARE_TABS.GROUPS:
        return (
          <ShareToGroups
            post={post}
            currentUser={currentUser}
            onShare={handleShare}
            isSubmitting={isSubmitting}
            selectedTargets={selectedTargets}
            onTargetsChange={setSelectedTargets}
            shareMessage={shareMessage}
            onMessageChange={setShareMessage}
          />
        );
      default:
        return null;
    }
  };

  // Handle retry from network fallback
  const handleRetryFromFallback = useCallback(() => {
    setShowNetworkFallback(false);
    setError(null);
    setRetryCount(0);
  }, []);

  // Handle error boundary errors
  const handleErrorBoundaryError = useCallback((error: Error, _errorInfo: React.ErrorInfo, errorType: string) => {
    console.error('ShareModal error boundary caught:', error, errorType);

    const errorResult = handleShareError(error, {
      component: 'ShareModal',
      activeTab,
      postId: post?.id
    });

    setError(errorResult);
  }, [activeTab, post]);

  return (
    <ShareErrorBoundary
      componentName="ShareModal"
      shareContext={{ postId: post?.id, activeTab }}
      onError={handleErrorBoundaryError}
      onRetry={handleRetryFromFallback}
      onClose={onClose}
    >
      <div className="modal-overlay" onClick={onClose}>
        <div className="share-modal" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <h3>Share Post</h3>
            <button
              className="close-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          {/* Error Display */}
          {error && !showNetworkFallback && (
            <div className="share-modal-error">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <div className="error-title">Share Failed</div>
                <div className="error-message">
                  {error.error}
                </div>
              </div>
              {error.canRetry && retryCount < 3 && (
                <button
                  className="error-retry-btn"
                  onClick={handleRetryFromFallback}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Post Preview */}
          <div className="post-preview">
            <div className="user-info">
              <LazyImage
                src={post.userPhotoURL || '/default-avatar.jpg'}
                alt={post.userDisplayName || 'User'}
                className="user-avatar small"
                placeholder="/default-avatar.jpg"
              />
              <div className="user-details">
                <h4>{post.userDisplayName}</h4>
                <span className="post-time">{formatTime(post.createdAt && typeof (post.createdAt as any).toDate === 'function' ? (post.createdAt as any).toDate() : new Date(post.createdAt as any))}</span>
              </div>
            </div>
            {post.caption && <p className="post-caption">{post.caption}</p>}
            <div className="share-stats">
              <span>{post.shareCount || 0} shares</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="share-tabs">
            {Object.values(SHARE_TABS).map((tab) => (
              <button
                key={tab}
                className={`share-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
                disabled={isSubmitting}
              >
                {getTabIcon(tab)}
                <span>{tab === 'feed' ? 'Repost' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="share-content">
            {showNetworkFallback ? (
              <ShareNetworkFallback
                onRetry={handleRetryFromFallback}
                onCancel={onClose}
                isRetrying={isSubmitting}
                retryCount={retryCount}
                maxRetries={3}
                autoRetry={true}
                retryDelay={3000}
              />
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
    </ShareErrorBoundary>
  );
};

ShareModal.displayName = 'ShareModal';

export default ShareModal;
