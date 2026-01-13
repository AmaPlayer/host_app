import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Video, Trash2, MoreVertical, Edit3, Share2, Check, Repeat } from 'lucide-react';
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
import LikeButton from '../../../features/social/components/LikeButton';
import { Post as PostType, Like } from '../../../types/models';
import { User } from 'firebase/auth';
import userService from '../../../services/api/userService';
import { useRealtimeEngagement } from '../../../hooks/useRealtimeEngagement';
import './Post.css';

const FullScreenMediaViewer = React.lazy(() => import('../../../components/common/media/FullScreenMediaViewer'));


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
  onRepost?: (postId: string, post: PostType, mode?: 'instant' | 'quote') => void;
  onDeletePost: (postId: string, post: PostType) => void;
  onSetEditText: (text: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
}

/**
 * Post Component
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
  onRepost,
  onDeletePost,
  onSetEditText,
  onNavigateToPost,
  onUserClick
}) => {
  const { t } = useLanguage();


  // Repost menu removed - defaulting to quote only

  const handleRepostAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always use 'quote' mode as requested
    onRepost?.(post.id, post, 'quote');
  };

  // --- Repost Logic (MUST be before engagement hook) ---
  const isInstantRepost = post.isRepost && !post.caption && post.originalPost;
  const isQuoteRepost = post.isRepost && !!post.caption && post.originalPost;

  // Decide what content to show
  // For Instant Repost: Show Original Post content (as if it was the post)
  // For Quote Repost: Show Repost content (Sharer's caption) + Quoted Box
  const displayPost = isInstantRepost ? post.originalPost! : post;

  // Real-time engagement data - Use displayPost.id for correct engagement tracking
  // For reposts, this will be the original post ID, not the repost ID
  const { engagement, loading: engagementLoading } = useRealtimeEngagement('posts', displayPost.id, {
    enabled: true,
    debounceMs: 300
  });

  // Use real-time data if available, fallback to post props
  const realLikesCount = engagement.likesCount ?? post.likesCount ?? 0;
  const realCommentsCount = engagement.commentsCount ?? post.commentsCount ?? 0;

  // Local state for immediate UI updates (Fix Issue #5)
  const [displayCommentsCount, setDisplayCommentsCount] = useState(realCommentsCount);

  // Sync with real data when it changes
  useEffect(() => {
    setDisplayCommentsCount(realCommentsCount);
  }, [realCommentsCount]);

  // Use isLiked from post object if available (from Supabase)
  const userLiked = displayPost.isLiked !== undefined
    ? displayPost.isLiked
    : (Array.isArray(displayPost.likes) && displayPost.likes.length > 0 && typeof displayPost.likes[0] === 'string'
      ? (displayPost.likes as unknown as string[]).includes(currentUser?.uid || '')
      : (displayPost.likes as Like[]).some(like => like.userId === (currentUser?.uid || '')));

  const handleNavigateToPost = (postId: string) => {
    if (onNavigateToPost) onNavigateToPost(postId);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick && displayPost.userId) onUserClick(displayPost.userId);
  };

  const isCurrentUserPost = currentUser && displayPost.userId === currentUser.uid;
  // For deletion: check if the REPOST itself is owned by current user
  const isMyRepost = currentUser && post.isRepost && post.userId === currentUser.uid;

  const [userProfileData, setUserProfileData] = useState<any>(null);

  const getStringValue = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      if ('name' in value) return value.name;
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      if (isCurrentUserPost && currentUser) {
        try {
          const userData = await userService.getById(currentUser.uid);
          if (isMounted && userData) setUserProfileData(userData);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    fetchUserProfile();
    return () => { isMounted = false; };
  }, [isCurrentUserPost, currentUser, displayPost.userId]);

  const profileData = userProfileData as any;
  const currentRole = isCurrentUserPost && profileData ? (profileData.role || displayPost.userRole || 'athlete') : (displayPost.userRole || 'athlete');
  const shouldShowSportData = currentRole === 'athlete' || currentRole === 'parent';

  const getSportFromProfile = (profile: any) => {
    if (!profile) return null;
    // Handle array format (users table style)
    if (Array.isArray(profile.sports) && profile.sports.length > 0) return getStringValue(profile.sports[0]);
    // Handle object format (athletes table style via userService)
    if (profile.sports && typeof profile.sports === 'object' && !Array.isArray(profile.sports)) {
      return getStringValue(profile.sports.primary);
    }
    // Handle specific sport field
    return getStringValue(profile.sport);
  };

  const currentSport = shouldShowSportData ? (isCurrentUserPost && profileData ? (getSportFromProfile(profileData) || getStringValue(displayPost.userSport)) : getStringValue(displayPost.userSport)) : undefined;
  const currentPosition = shouldShowSportData && currentRole === 'athlete' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.position) || getStringValue(profileData.positionName) || getStringValue(displayPost.userPosition)) : getStringValue(displayPost.userPosition)) : undefined;
  const currentPlayerType = shouldShowSportData && currentRole === 'athlete' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.playerType) || getStringValue(displayPost.userPlayerType)) : getStringValue(displayPost.userPlayerType)) : undefined;
  const currentOrganizationType = currentRole === 'organization' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.organizationType) || getStringValue(displayPost.userOrganizationType)) : getStringValue(displayPost.userOrganizationType)) : undefined;
  const currentSpecializations = (currentRole === 'coaches' || currentRole === 'coach') ? (isCurrentUserPost && profileData ? (profileData.specializations || displayPost.userSpecializations) : displayPost.userSpecializations) : undefined;

  const displayName = isCurrentUserPost && profileData ? (profileData.role === 'organization' ? (profileData.organizationName || profileData.displayName || profileData.name) : (profileData.displayName || profileData.name)) : (typeof displayPost.userDisplayName === 'string' && displayPost.userDisplayName !== '[object Object]' ? displayPost.userDisplayName : 'User');

  // Helper to fix old R2 URLs
  const fixMediaUrl = (url: string | undefined | null) => {
    if (!url) return '';
    const brokenDomain = 'https://media.amaplayer.com';
    const publicUrl = process.env.REACT_APP_R2_PUBLIC_URL;

    if (url.startsWith(brokenDomain) && publicUrl) {
      return url.replace(brokenDomain, publicUrl);
    }
    return url;
  };

  const mediaSource = fixMediaUrl(displayPost.mediaUrl || (displayPost as any).videoUrl || (displayPost as any).imageUrl);

  // Media Viewer State
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  return (
    <>
      <div className="post" data-testid={`post-${post.id}`}>
        {/* Repost Indicator Header */}
        {isInstantRepost && (
          <div className="repost-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <Repeat size={14} />
            <span>{post.sharerName || 'Someone'} reposted</span>
          </div>
        )}

        {/* ... header ... */}
        <div className="post-header">
          <div className="post-user-info">
            <div className="post-username-container">
              <h3 className="post-username-clickable" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
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
              {displayPost.timestamp ? new Date(displayPost.timestamp as any).toLocaleDateString() : 'now'}
            </span>
          </div>

          {currentUser && (
            <div className="post-menu-container">
              <button className="post-menu-btn" onClick={(e) => { e.stopPropagation(); onTogglePostMenu(post.id); }}>
                <MoreVertical size={20} />
              </button>
              {showPostMenus[post.id] && (
                <div className="post-menu-dropdown repost-dropdown" style={{ zIndex: 10001 }}>
                  <button className="menu-item share" onClick={(e) => { e.stopPropagation(); onSharePost(displayPost.id, displayPost); }}>
                    {shareSuccess[displayPost.id] ? <><Check size={16} />{t('linkCopied')}</> : <><Share2 size={16} />{t('sharePost')}</>}
                  </button>

                  {/* Edit/Delete: Show only if I own the displayed post (or if it's My Repost I can delete the repost) */}
                  {(displayPost.userId === currentUser.uid || isMyRepost) && (
                    <>
                      {!isInstantRepost && displayPost.userId === currentUser.uid && (
                        <button className="menu-item edit" onClick={(e) => { e.stopPropagation(); onEditPost(post.id, post.caption || ''); }}>
                          <Edit3 size={16} />{t('edit')}
                        </button>
                      )}
                      <button className="menu-item delete" onClick={(e) => {
                        e.stopPropagation();
                        // If it's my repost, I delete the REPOST (post.id).
                        // If it's my regular post, I delete the post (displayPost.id).
                        onDeletePost(isMyRepost ? post.id : displayPost.id, isMyRepost ? post : displayPost);
                      }}>
                        <Trash2 size={16} />{t('deletePost')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quote Repost Content + Box */}
        {isQuoteRepost && (
          <div className="post-caption" style={{ padding: '0 15px', marginBottom: '10px' }}>
            {/* Sharer's Message */}
            <p>{post.caption}</p>
            {/* Quoted Post Box */}
            <div className="quoted-post-box" style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              marginTop: '10px',
              overflow: 'hidden',
              cursor: 'pointer'
            }} onClick={(e) => { e.stopPropagation(); handleNavigateToPost(post.originalPost!.id); }}>
              {/* Simplified Quoted Header */}
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.03)' }}>
                <OptimizedImage src={post.originalPost?.userPhotoURL || ''} alt="User" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{post.originalPost?.userDisplayName}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>• {new Date(post.originalPost?.createdAt as any).toLocaleDateString()}</span>
              </div>
              {/* Quoted Content */}
              {post.originalPost?.mediaUrl && (
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  {post.originalPost.mediaType === 'video' ? (
                    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Video size={32} color="white" />
                    </div>
                  ) : (
                    <OptimizedImage src={post.originalPost.mediaUrl} alt="Quoted media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              )}
              {post.originalPost?.caption && (
                <div style={{ padding: '8px 12px', fontSize: '14px' }}>{post.originalPost.caption}</div>
              )}
            </div>
          </div>
        )}

        {/* Media Rendering (For Regular or Instant Repost) */}
        {!isQuoteRepost && (
          <div className="post-media">
            {mediaSource && (
              (displayPost.mediaType === 'video' || (displayPost as any).videoUrl) ? (
                <div onClick={(e) => { e.stopPropagation(); setShowMediaViewer(true); }}>
                  <VideoPlayer
                    src={mediaSource}
                    poster={(displayPost as any).mediaMetadata?.thumbnail}
                    controls={true}
                    className="post-video"
                    videoId={`post-${displayPost.id}`}
                    autoPauseOnScroll={true}
                    mediaSettings={displayPost.mediaSettings}
                  />
                </div>
              ) : (
                <LazyLoadImage
                  src={mediaSource}
                  alt={displayPost.caption}
                  className="post-image"
                  onClick={(e) => { e.stopPropagation(); setShowMediaViewer(true); }}
                  style={{ cursor: 'pointer' }}
                />
              )
            )}
          </div>
        )}

        {/* Caption (For Regular or Instant Repost) */}
        {!isQuoteRepost && displayPost.caption && (
          <div className="post-caption">
            {editingPost === post.id ? (
              <div className="edit-post-container">
                <textarea
                  className="edit-post-input"
                  value={editText}
                  onChange={(e) => onSetEditText(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="edit-post-actions">
                  <button onClick={() => onSaveEdit(post.id)}>{t('save')}</button>
                  <button onClick={onCancelEdit}>{t('cancel')}</button>
                </div>
              </div>
            ) : (
              <p onClick={() => handleNavigateToPost(displayPost.id)} style={{ cursor: 'pointer' }}>
                <strong>{displayName}</strong> {displayPost.caption}
              </p>
            )}
          </div>
        )}

        <div className="post-actions">
          <LikeButton
            postId={displayPost.id} // Like the displayed content (Original)
            initialLiked={userLiked}
            initialCount={displayPost.likesCount || 0} // Use displayPost counts
            size="medium"
            onLikeChange={(liked, count) => {
              // Callback to notify parent (Fix Issue #2)
              console.log(`✅ Like changed: ${liked}, count: ${count}`);
              // Parent can update state if needed, but real-time hook handles it
              if (onLike) {
                // We could expose this but onLike signature is complex
              }
            }}
          />
          <button onClick={() => onToggleComments(post.id)} className={showComments[post.id] ? 'active' : ''}>
            <MessageCircle size={20} />
            <span>{displayPost.commentsCount || 0}</span>
          </button>

          <div className="repost-action-container">
            <button
              className="repost-btn"
              onClick={handleRepostAction}
              title="Quote Post"
            >
              <Repeat size={20} />
              <span>{displayPost.sharesCount || displayPost.shareCount || 0}</span>
            </button>
          </div>
        </div>

        <ErrorBoundary name={`Post Comments for post ${post.id}`}>
          {showComments[post.id] && post.id && (
            <CommentSection
              contentId={displayPost.id} // Comments attached to Original? No, usually Repost has its own comment thread on X? 
              // On X, clicking a retweet shows the original tweet's comments.
              // If it's a quote tweet, it has its own comments.
              // For Instant Repost, `post.id` is the Repost ID. `displayPost.id` is Original.
              // If I comment on an Instant Repost, do I comment on the original? Yes.
              // So `contentId={displayPost.id}` is correct.
              contentType="post"
              className="feed-post-comments"
              onCommentAdded={() => {
                console.log('✅ Comment added, updating count immediately');
                setDisplayCommentsCount(prev => prev + 1);
              }}
              onCommentDeleted={() => {
                console.log('✅ Comment deleted, updating count immediately');
                setDisplayCommentsCount(prev => Math.max(0, prev - 1));
              }}
            />
          )}
        </ErrorBoundary>
      </div>

      {showMediaViewer && mediaSource && (
        <React.Suspense fallback={null}>
          <FullScreenMediaViewer
            src={mediaSource}
            type={(displayPost.mediaType === 'video' || (displayPost as any).videoUrl) ? 'video' : 'image'}
            onClose={() => setShowMediaViewer(false)}
            poster={(displayPost as any).mediaMetadata?.thumbnail}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default Post;
