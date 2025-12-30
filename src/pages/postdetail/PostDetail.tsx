import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import postsService from '../../services/api/postsService';
import { Heart, MessageCircle, ArrowLeft, Video, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import VideoPlayer from '../../components/common/media/VideoPlayer';
import LazyImage from '../../components/common/ui/LazyImage';
import FooterNav from '../../components/layout/FooterNav';
import { LoadingFallback } from '../../utils/performance/lazyLoading';
import CommentSection from '../../components/common/comments/CommentSection';
import notificationService from '../../services/notificationService';
import './PostDetail.css';
import type { Post, ShareData } from '../../types/models';

// Lazy-loaded components
const ShareModal = lazy(() => import('../../components/common/modals/ShareModal'));

interface ShareNotification {
  type: 'success' | 'error';
  message: string;
  timestamp: number;
}

export default function PostDetail(): React.JSX.Element {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareNotification, setShareNotification] = useState<ShareNotification | null>(null);
  const [engagementError, setEngagementError] = useState<string | null>(null);

  // Initialize post interactions hook for sharing functionality
  const {
    sharePost,
    getShareState,
    clearShareState,
    updateShareCount,
    getShareRateLimit,
    hasUserSharedPost,
    getShareAnalytics
  } = usePostInteractions();

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadPost = async (): Promise<void> => {
    if (!postId) return;

    try {
      setLoading(true);
      setError(null);
      // Use postsService instead of direct Firebase calls (Supabase backend)
      const postData = await postsService.getPostById(postId, currentUser?.uid);

      if (postData) {
        setPost(postData);
      } else {
        console.error('❌ Post not found:', postId);
        setError('Post not found');
      }
    } catch (error) {
      console.error('❌ Error loading post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (): Promise<void> => {
    if (!currentUser || !post || isLiking) return;

    setIsLiking(true);

    // Store original state for error rollback
    const originalPost = { ...post };
    const originalLiked = post.isLiked || false;
    const originalCount = post.likesCount || 0;

    try {
      // Optimistic update
      const newLiked = !originalLiked;
      const newCount = newLiked ? originalCount + 1 : Math.max(0, originalCount - 1);

      setPost(prev => prev ? ({
        ...prev,
        isLiked: newLiked,
        likesCount: newCount
      }) : null);

      // Call API using postsService (Supabase backend)
      // console.log('❤️ Toggling like for:', post.id);
      const result = await postsService.toggleLike(
        post.id,
        currentUser.uid,
        {
          displayName: currentUser.displayName || 'User',
          photoURL: currentUser.photoURL
        }
      );

      // Sync with server result
      if (result.likesCount !== newCount) {
        console.warn('Like count mismatch with server. Correcting...');
        setPost(prev => prev ? ({
          ...prev,
          likesCount: result.likesCount,
          isLiked: result.liked
        }) : null);
      }

      // Send notification to post owner (only when liking, not unliking)
      if (newLiked && post.userId && post.userId !== currentUser.uid) {
        try {
          await notificationService.sendLikeNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            post.userId,
            post.id,
            post
          );
        } catch (notificationError) {
          console.error('Error sending like notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('❌ Like failed:', error);

      // Rollback optimistic update on error
      setPost(originalPost);

      // Show user-friendly error message
      setEngagementError('Failed to update like. Please try again.');
      setTimeout(() => setEngagementError(null), 5000);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle share button click
  const handleShare = useCallback(() => {
    if (!currentUser || isGuest()) {
      if (window.confirm('Please sign up or log in to share posts.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }
    setShowShareModal(true);
  }, [currentUser, isGuest, navigate]);

  // Handle share completion with success/error feedback
  const handleShareComplete = useCallback(async (shareData: ShareData) => {
    if (!currentUser || !post) return;

    try {
      // Execute the share using the post interactions hook
      const result = await sharePost(post.id, shareData.type as "friends" | "groups" | "feeds", shareData.targets);
      
      // Update local share count optimistically
      updateShareCount(post.id, 1);
      
      // Update post state with new share count
      setPost(prev => prev ? ({
        ...prev,
        sharesCount: (prev.sharesCount || 0) + 1
      }) : null);
      
      // Show success notification
      setShareNotification({
        type: 'success',
        message: `Successfully shared to ${shareData.type}!`,
        timestamp: Date.now()
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setShareNotification(null);
        clearShareState(post.id);
      }, 3000);
      
      // Close modal
      setShowShareModal(false);
      
      return result;
    } catch (error) {
      console.error('Share failed:', error);
      
      // Show error notification
      setShareNotification({
        type: 'error',
        message: (error as Error).message || 'Failed to share post. Please try again.',
        timestamp: Date.now()
      });
      
      // Clear error notification after 5 seconds
      setTimeout(() => {
        setShareNotification(null);
        if (post) {
          clearShareState(post.id);
        }
      }, 5000);
      
      throw error;
    }
  }, [currentUser, post, sharePost, updateShareCount, clearShareState]);

  // Close share modal
  const closeShareModal = useCallback(() => {
    setShowShareModal(false);
  }, []);


  if (loading) {
    return (
      <div className="post-detail">
        <nav className="nav-bar">
          <div className="nav-content">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Post</h1>
            <div className="nav-links">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </nav>
        
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Loading post...</span>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail">
        <nav className="nav-bar">
          <div className="nav-content">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Post</h1>
            <div className="nav-links">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </nav>
        
        <div className="main-content">
          <div className="error-container">
            <h2>Post Not Found</h2>
            <p>The post you're looking for doesn't exist or has been removed.</p>
            <button onClick={() => navigate('/home')} className="home-btn">
              Go to Home
            </button>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  const userLiked = post.isLiked || false;

  // Calculate engagement counts from post data
  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const sharesCount = post.sharesCount || 0;

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'now';
    
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="post-detail">
      <nav className="nav-bar">
        <div className="nav-content">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
            Back
          </button>
          <h1>Post</h1>
          <div className="nav-links">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Share Notification */}
      {shareNotification && (
        <div className={`share-notification ${shareNotification.type}`}>
          <div className="notification-content">
            {shareNotification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{shareNotification.message}</span>
          </div>
        </div>
      )}

      {/* Engagement Error Notification */}
      {engagementError && (
        <div className="share-notification error">
          <div className="notification-content">
            <AlertCircle size={20} />
            <span>{engagementError}</span>
          </div>
        </div>
      )}

      <div className="main-content post-detail-content">
        <div className="post-detail-container">
          <div className="post">
            <div className="post-header">
              <h3>{post.userDisplayName}</h3>
              <span className="post-time">
                {formatTimestamp(post.timestamp)}
              </span>
            </div>
            
            {/* Media Display - Only render if media exists */}
            {(post.mediaUrl && post.mediaUrl.trim() !== '') && (
              <div className="post-media">
                {post.mediaType === 'video' ? (
                  <div className="post-video-container">
                    <VideoPlayer 
                      src={post.mediaUrl || ''}
                      poster={post.mediaMetadata?.thumbnail}
                      controls={true}
                      className="post-video"
                      videoId={`post-${post.id}`}
                      autoPauseOnScroll={false}
                    />
                  </div>
                ) : (
                  <div className="post-image-container">
                    <LazyImage 
                      src={post.mediaUrl || ''} 
                      alt={post.caption || 'Post image'}
                      className="post-image"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="post-actions">
              <button 
                onClick={handleLike}
                className={userLiked ? 'liked' : ''}
                disabled={!currentUser || isLiking}
                title={currentUser ? (userLiked ? 'Unlike this post' : 'Like this post') : 'Sign in to like'}
              >
                <Heart 
                  size={20} 
                  fill={userLiked ? '#e74c3c' : 'none'}
                  color={userLiked ? '#e74c3c' : 'currentColor'}
                  className={userLiked ? 'heart-liked' : ''}
                />
                <span>{likesCount}</span>
                {isLiking && <span style={{marginLeft: '5px'}}>...</span>}
              </button>
              <button 
                className="active"
                title="View comments"
              >
                <MessageCircle size={20} />
                <span>{commentsCount}</span>
              </button>
              <button 
                onClick={handleShare}
                className={hasUserSharedPost(post.id, currentUser?.uid) ? 'shared' : ''}
                disabled={!currentUser || getShareState(post.id).loading}
                title={currentUser ? 'Share this post' : 'Sign in to share'}
              >
                <Share2 
                  size={20} 
                  className={getShareState(post.id).loading ? 'spinning' : ''}
                />
                <span>{sharesCount}</span>
                {getShareState(post.id).loading && <span style={{marginLeft: '5px'}}>...</span>}
              </button>
              
              {/* Media type indicator */}
              {post.mediaType === 'video' && (
                <div className="media-indicator">
                  <Video size={16} />
                  {post.mediaMetadata?.durationFormatted && (
                    <span>{post.mediaMetadata.durationFormatted}</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Text-only content - render as main content if no media */}
            {!(post.mediaUrl && post.mediaUrl.trim() !== '') && post.caption && (
              <div 
                className="post-text-content"
                style={{
                  padding: '20px',
                  fontSize: '18px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  margin: '16px 0',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--border-color)'
                }}
              >
                {post.caption}
              </div>
            )}
            
            {/* Caption - only show for posts with media */}
            {(post.mediaUrl && post.mediaUrl.trim() !== '') && post.caption && (
              <div className="post-caption">
                <strong>{post.userDisplayName}</strong> {post.caption}
              </div>
            )}

            {/* Comments Section - Using Centralized Comment System */}
            <CommentSection
              contentId={post.id}
              contentType="post"
              className="post-comments"
            />
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      <Suspense fallback={<LoadingFallback />}>
        {showShareModal && post && (
          <ShareModal
            post={post}
            currentUser={currentUser}
            onClose={closeShareModal}
            onShareComplete={handleShareComplete}
          />
        )}
      </Suspense>
      
      <FooterNav />
    </div>
  );
}