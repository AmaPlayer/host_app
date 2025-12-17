import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Video, Trash2, MoreVertical, Edit3, Share2, Check } from 'lucide-react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import OptimizedImage from '../../../components/common/media/OptimizedImage';
import VideoPlayer from '../../../components/common/media/VideoPlayer';
import LazyImage from '../../../components/common/ui/LazyImage';
import LazyLoadImage from '../../../components/common/media/LazyLoadImage';
import SafeImage from '../../../components/common/SafeImage';
import ErrorBoundary from '../../../components/common/safety/ErrorBoundary';
import CommentSection from '../../../components/common/comments/CommentSection';
import RoleBadge from '../../../components/common/ui/RoleBadge';
import SportBanner from '../../../features/profile/components/SportBanner';
import { Post as PostType, Like } from '../../../types/models';
import { User } from 'firebase/auth';
import userService from '../../../services/api/userService';
import './Post.css';

interface PostProps {
  post: PostType;
  currentUser: User | null;
  isGuest: boolean;
  showComments: Record<string, boolean>;
  showPostMenus: Record<string, boolean>;
  editingPost: string | null;
  editText: string;
  shareSuccess: Record<string, boolean>;
  onLike: (postId: string, likes: string[], isSample: boolean, post: PostType) => void;
  onToggleComments: (postId: string) => void;
  onTogglePostMenu: (postId: string) => void;
  onEditPost: (postId: string, newCaption: string) => void;
  onSaveEdit: (postId: string) => void;
  onCancelEdit: () => void;
  onSharePost: (postId: string, post: PostType) => void;
  onDeletePost: (postId: string, post: PostType) => void;
  onSetEditText: (text: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
}

/**
 * Post Component
 * 
 * Renders a single post with all interactions (like, comment, share, edit, delete).
 * Optimized for performance with lazy loading and error boundaries.
 */
const Post: React.FC<PostProps> = ({
  post,
  currentUser,
  isGuest,
  showComments,
  showPostMenus,
  editingPost,
  editText,
  shareSuccess,
  onLike,
  onToggleComments,
  onTogglePostMenu,
  onEditPost,
  onSaveEdit,
  onCancelEdit,
  onSharePost,
  onDeletePost,
  onSetEditText,
  onNavigateToPost,
  onUserClick
}) => {
  const { t } = useLanguage();

  // Handle both string[] and Like[] formats for backward compatibility
  const userLiked = Array.isArray(post.likes) && post.likes.length > 0 && typeof post.likes[0] === 'string'
    ? (post.likes as unknown as string[]).includes(currentUser?.uid || '')
    : (post.likes as Like[]).some(like => like.userId === (currentUser?.uid || ''));

  // Handle navigation to individual post
  const handleNavigateToPost = (postId: string) => {
    if (onNavigateToPost) {
      onNavigateToPost(postId);
    } else {}
  };

  // Handle user click to navigate to profile
  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick && post.userId) {
      onUserClick(post.userId);
    }
  };

  // Check if this is the current user's post
  const isCurrentUserPost = currentUser && post.userId === currentUser.uid;

  // State to track user profile data from Firebase
  const [userProfileData, setUserProfileData] = useState<any>(null);

  // State to track real-time comment count from Firestore
  const [realtimeCommentCount, setRealtimeCommentCount] = useState<number>(post.commentsCount || 0);

  // Helper function to safely extract string value from object or string
  const getStringValue = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      if ('name' in value) return value.name;
      if ('id' in value && 'name' in value) return value.name;
    }
    return null;
  };

  // Fetch user profile data from Firebase for current user's posts
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (isCurrentUserPost && currentUser) {
        try {
          const userData = await userService.getById(currentUser.uid);
          if (isMounted && userData) {
            setUserProfileData(userData);
            // Also update localStorage for immediate access - safely extract string values
            // Cast to any to access extended user properties
            const userDataAny = userData as any;

            if (userDataAny.role) localStorage.setItem('userRole', userDataAny.role);

            // Handle display name - use organizationName for organizations, otherwise use displayName or name
            const displayName = userDataAny.role === 'organization'
              ? (userDataAny.organizationName || userDataAny.displayName || userDataAny.name)
              : (userDataAny.displayName || userDataAny.name);
            if (displayName) localStorage.setItem('userDisplayName', displayName);

            // Handle sport - could be string or array of objects
            const sport = Array.isArray(userDataAny.sports)
              ? getStringValue(userDataAny.sports[0])
              : getStringValue(userDataAny.sport);
            if (sport) localStorage.setItem('userSport', sport);

            // Handle position - could be object or string
            const position = getStringValue(userDataAny.position) || getStringValue(userDataAny.positionName);
            if (position) localStorage.setItem('userPosition', position);

            // Handle playerType - could be object or string
            const playerType = getStringValue(userDataAny.playerType);
            if (playerType) localStorage.setItem('userPlayerType', playerType);

            // Handle organization type
            const orgType = getStringValue(userDataAny.organizationType);
            if (orgType) localStorage.setItem('userOrganizationType', orgType);

            // Handle specializations
            if (userDataAny.specializations) localStorage.setItem('userSpecializations', JSON.stringify(userDataAny.specializations));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();

    // Listen for custom profile update event
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [isCurrentUserPost, currentUser]);

  // Real-time listener for comment count from Firestore with debouncing
  useEffect(() => {
    if (!post.id) return;

    let unsubscribe: Unsubscribe | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;

    try {
      // Subscribe to real-time updates of the post document
      unsubscribe = onSnapshot(
        doc(db, 'posts', post.id),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const newCommentCount = data.commentsCount || 0;

            // Debounce updates to prevent rapid re-renders
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
              // Only update if the value has actually changed
              setRealtimeCommentCount(prev =>
                prev !== newCommentCount ? newCommentCount : prev
              );
            }, 300); // 300ms debounce
          }
        },
        (error) => {
          console.error('Error listening to post updates:', error);
          // Fallback to initial value if listener fails
          setRealtimeCommentCount(post.commentsCount || 0);
        }
      );
    } catch (error) {
      console.error('Error setting up comment count listener:', error);
      setRealtimeCommentCount(post.commentsCount || 0);
    }

    // Cleanup listener and timer on unmount
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [post.id, post.commentsCount]);

  // Get current profile data - use Firebase data for current user, post data for others
  // Always extract string values to prevent [object Object] display
  const profileData = userProfileData as any;

  const currentRole = isCurrentUserPost && profileData
    ? (profileData.role || post.userRole || 'athlete')
    : (post.userRole || 'athlete');

  // Only show sport/position/playerType for athletes and parents
  // Organizations should NOT show sport, coaches should only show specializations
  const shouldShowSportData = currentRole === 'athlete' || currentRole === 'parent';

  const currentSport = shouldShowSportData
    ? (isCurrentUserPost && profileData
        ? (getStringValue(Array.isArray(profileData.sports) ? profileData.sports[0] : profileData.sport) || getStringValue(post.userSport))
        : getStringValue(post.userSport))
    : undefined;

  const currentPosition = shouldShowSportData && currentRole === 'athlete'
    ? (isCurrentUserPost && profileData
        ? (getStringValue(profileData.position) || getStringValue(profileData.positionName) || getStringValue(post.userPosition))
        : getStringValue(post.userPosition))
    : undefined;

  const currentPlayerType = shouldShowSportData && currentRole === 'athlete'
    ? (isCurrentUserPost && profileData
        ? (getStringValue(profileData.playerType) || getStringValue(post.userPlayerType))
        : getStringValue(post.userPlayerType))
    : undefined;

  const currentOrganizationType = currentRole === 'organization'
    ? (isCurrentUserPost && profileData
        ? (getStringValue(profileData.organizationType) || getStringValue(post.userOrganizationType))
        : getStringValue(post.userOrganizationType))
    : undefined;

  const currentSpecializations = (currentRole === 'coaches' || currentRole === 'coach')
    ? (isCurrentUserPost && profileData
        ? (profileData.specializations || post.userSpecializations)
        : post.userSpecializations)
    : undefined;

  // Fix display name in case it's showing [object Object]
  const displayName = isCurrentUserPost && profileData
    ? (profileData.role === 'organization'
        ? (profileData.organizationName || profileData.displayName || profileData.name)
        : (profileData.displayName || profileData.name))
    : (typeof post.userDisplayName === 'string' && post.userDisplayName !== '[object Object]'
        ? post.userDisplayName
        : 'User');

  return (
    <div className="post" data-testid={`post-${post.id}`}>
      <div className="post-header">
        <div className="post-user-info">
          <div className="post-username-container">
            <h3
              className="post-username-clickable"
              onClick={handleUserClick}
              style={{ cursor: 'pointer' }}
            >
              {displayName}
            </h3>
            <SportBanner 
              role={currentRole as any} 
              sport={currentSport}
              position={currentPosition}
              playerType={currentPlayerType}
              organizationType={currentOrganizationType}
              specializations={currentSpecializations}
            />
          </div>
          <span className="post-time">
            {post.timestamp ? (
              (post.timestamp as any)?.toDate ?
                (post.timestamp as any).toDate().toLocaleDateString() :
                (post.timestamp instanceof Date ?
                  post.timestamp.toLocaleDateString() :
                  new Date(post.timestamp as any).toLocaleDateString()
                )
            ) : 'now'}
          </span>
        </div>

        {/* Three dots menu */}
        {currentUser && (
          <div className="post-menu-container">
            <button
              className="post-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePostMenu(post.id);
              }}
            >
              <MoreVertical size={20} />
            </button>

            {showPostMenus[post.id] && (
              <div className="post-menu-dropdown">
                {/* Share option */}
                <button
                  className="menu-item share"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSharePost(post.id, post);
                  }}
                >
                  {shareSuccess[post.id] ? (
                    <>
                      <Check size={16} />
                      {t('linkCopied')}
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      {t('sharePost')}
                    </>
                  )}
                </button>

                {/* Edit and Delete options - only for own posts */}
                {post.userId === currentUser.uid && (
                  <>
                    <button
                      className="menu-item edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPost(post.id, post.caption || '');
                      }}
                    >
                      <Edit3 size={16} />
                      {t('edit')}
                    </button>
                    <button
                      className="menu-item delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePost(post.id, post);
                      }}
                    >
                      <Trash2 size={16} />
                      {t('deletePost')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media Display */}
      {(() => {
        // Detect legacy vs new post format for backwards compatibility
        const hasLegacyMediaSettings = post.mediaSettings &&
          ('objectFit' in post.mediaSettings || 'objectPosition' in post.mediaSettings);
        const hasCropData = post.mediaSettings?.cropData;

        return ((post.mediaUrl && post.mediaUrl.trim() !== '') ||
          ((post as any).imageUrl && (post as any).imageUrl.trim() !== '') ||
          ((post as any).videoUrl && (post as any).videoUrl.trim() !== '')) && (
            <div className="post-media">
              {(post.mediaType === 'video' || (post as any).videoUrl) ? (
                <div
                  onClick={(e) => {
                    // Prevent navigation when clicking anywhere on video
                    e.stopPropagation();
                  }}
                >
                  <VideoPlayer
                    src={post.mediaUrl || (post as any).videoUrl}
                    poster={(post as any).mediaMetadata?.thumbnail}
                    controls={true}
                    className="post-video"
                    videoId={`post-${post.id}`}
                    autoPauseOnScroll={true}
                    mediaSettings={post.mediaSettings}
                  />
                </div>
              ) : (
                <LazyLoadImage
                  src={post.mediaUrl || (post as any).imageUrl}
                  alt={post.caption}
                  className="post-image"
                  width={600}
                  height={400}
                  quality={85}
                  webp={true}
                  responsive={true}
                  threshold={0.1}
                  rootMargin="100px"
                  onClick={() => handleNavigateToPost(post.id)}
                  style={hasLegacyMediaSettings ? {
                    cursor: 'pointer',
                    objectFit: post.mediaSettings?.objectFit,
                    objectPosition: post.mediaSettings?.objectPosition
                  } : { cursor: 'pointer' }}
                />
              )}
            </div>
          );
      })()}

      {/* Text-only content */}
      {!((post.mediaUrl && post.mediaUrl.trim() !== '') ||
        ((post as any).imageUrl && (post as any).imageUrl.trim() !== '') ||
        ((post as any).videoUrl && (post as any).videoUrl.trim() !== '')) && post.caption && (
          <div className="post-text-content">
            {editingPost === post.id ? (
              <div className="edit-post-container">
                <textarea
                  className="edit-post-input"
                  value={editText}
                  onChange={(e) => onSetEditText(e.target.value)}
                  placeholder={t('editYourPost')}
                  rows={4}
                  autoFocus
                />
                <div className="edit-post-actions">
                  <button
                    className="save-edit-btn"
                    onClick={() => onSaveEdit(post.id)}
                    disabled={!editText.trim()}
                  >
                    {t('save')}
                  </button>
                  <button
                    className="cancel-edit-btn"
                    onClick={onCancelEdit}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleNavigateToPost(post.id)}
                style={{
                  cursor: 'pointer',
                  padding: '16px',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  margin: '8px 0',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {post.caption}
                {(post as any).editedAt && (
                  <span className="edited-indicator"> {t('edited')}</span>
                )}
              </div>
            )}
          </div>
        )}

      <div className="post-actions">
        <button
          onClick={() => {
            // Convert Like[] to string[] for backward compatibility
            const likesAsStrings = Array.isArray(post.likes) && post.likes.length > 0 && typeof post.likes[0] === 'string'
              ? post.likes as unknown as string[]
              : (post.likes as Like[]).map(like => like.userId);
            onLike(post.id, likesAsStrings, false, post);
          }}
          className={userLiked ? 'liked' : ''}
          disabled={!currentUser}
        >
          <Heart
            size={20}
            fill={userLiked ? '#e74c3c' : 'none'}
            color={userLiked ? '#e74c3c' : 'currentColor'}
            className={userLiked ? 'heart-liked' : ''}
          />
          <span>{post.likes?.length || 0}</span>
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          disabled={!post.id}
          className={showComments[post.id] ? 'active' : ''}
        >
          <MessageCircle size={20} />
          <span>{realtimeCommentCount}</span>
        </button>

        {/* Media type indicator */}
        {(post.mediaType === 'video' || (post as any).videoUrl) && (
          <div className="media-indicator">
            <Video size={16} />
            {(post as any).mediaMetadata?.durationFormatted && (
              <span>{(post as any).mediaMetadata.durationFormatted}</span>
            )}
          </div>
        )}
      </div>

      {/* Caption for posts with media */}
      {((post.mediaUrl && post.mediaUrl.trim() !== '') ||
        ((post as any).imageUrl && (post as any).imageUrl.trim() !== '') ||
        ((post as any).videoUrl && (post as any).videoUrl.trim() !== '')) && (
          <div className="post-caption">
            {editingPost === post.id ? (
              <div className="edit-post-container">
                <textarea
                  className="edit-post-input"
                  value={editText}
                  onChange={(e) => onSetEditText(e.target.value)}
                  placeholder={t('editYourPost')}
                  rows={3}
                  autoFocus
                />
                <div className="edit-post-actions">
                  <button
                    className="save-edit-btn"
                    onClick={() => onSaveEdit(post.id)}
                    disabled={!editText.trim()}
                  >
                    {t('save')}
                  </button>
                  <button
                    className="cancel-edit-btn"
                    onClick={onCancelEdit}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleNavigateToPost(post.id)}
                style={{ cursor: 'pointer' }}
              >
                <strong
                  onClick={handleUserClick}
                  style={{ cursor: 'pointer' }}
                  className="post-username-clickable"
                >
                  {displayName}
                </strong> {post.caption}
                {(post as any).editedAt && (
                  <span className="edited-indicator"> {t('edited')}</span>
                )}
              </div>
            )}
          </div>
        )}

      {/* Comments Section - Using Centralized Real-Time System */}
      <ErrorBoundary name={`Post Comments for post ${post.id}`}>
        {showComments[post.id] && post.id && (
          <CommentSection
            contentId={post.id}
            contentType="post"
            className="feed-post-comments"
          />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Post;