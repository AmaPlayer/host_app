import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Video, Trash2, MoreVertical, Edit3, Share2, Check } from 'lucide-react';
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

  // Real-time engagement data (Fix Issue #4)
  const { engagement, loading: engagementLoading } = useRealtimeEngagement('posts', post.id, {
    enabled: true,
    debounceMs: 300
  });

  // Use real-time data if available, fallback to post props
  const likesCount = engagement.likesCount ?? post.likesCount ?? 0;
  const commentsCount = engagement.commentsCount ?? post.commentsCount ?? 0;

  // Use isLiked from post object if available (from Supabase)
  const userLiked = post.isLiked !== undefined
    ? post.isLiked
    : (Array.isArray(post.likes) && post.likes.length > 0 && typeof post.likes[0] === 'string'
        ? (post.likes as unknown as string[]).includes(currentUser?.uid || '')
        : (post.likes as Like[]).some(like => like.userId === (currentUser?.uid || '')));

  const handleNavigateToPost = (postId: string) => {
    if (onNavigateToPost) onNavigateToPost(postId);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick && post.userId) onUserClick(post.userId);
  };

  const isCurrentUserPost = currentUser && post.userId === currentUser.uid;
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
  }, [isCurrentUserPost, currentUser]);

  const profileData = userProfileData as any;
  const currentRole = isCurrentUserPost && profileData ? (profileData.role || post.userRole || 'athlete') : (post.userRole || 'athlete');
  const shouldShowSportData = currentRole === 'athlete' || currentRole === 'parent';

  const currentSport = shouldShowSportData ? (isCurrentUserPost && profileData ? (getStringValue(Array.isArray(profileData.sports) ? profileData.sports[0] : profileData.sport) || getStringValue(post.userSport)) : getStringValue(post.userSport)) : undefined;
  const currentPosition = shouldShowSportData && currentRole === 'athlete' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.position) || getStringValue(profileData.positionName) || getStringValue(post.userPosition)) : getStringValue(post.userPosition)) : undefined;
  const currentPlayerType = shouldShowSportData && currentRole === 'athlete' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.playerType) || getStringValue(post.userPlayerType)) : getStringValue(post.userPlayerType)) : undefined;
  const currentOrganizationType = currentRole === 'organization' ? (isCurrentUserPost && profileData ? (getStringValue(profileData.organizationType) || getStringValue(post.userOrganizationType)) : getStringValue(post.userOrganizationType)) : undefined;
  const currentSpecializations = (currentRole === 'coaches' || currentRole === 'coach') ? (isCurrentUserPost && profileData ? (profileData.specializations || post.userSpecializations) : post.userSpecializations) : undefined;

  const displayName = isCurrentUserPost && profileData ? (profileData.role === 'organization' ? (profileData.organizationName || profileData.displayName || profileData.name) : (profileData.displayName || profileData.name)) : (typeof post.userDisplayName === 'string' && post.userDisplayName !== '[object Object]' ? post.userDisplayName : 'User');

  return (
    <div className="post" data-testid={`post-${post.id}`}>
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
            {post.timestamp ? new Date(post.timestamp as any).toLocaleDateString() : 'now'}
          </span>
        </div>

        {currentUser && (
          <div className="post-menu-container">
            <button className="post-menu-btn" onClick={(e) => { e.stopPropagation(); onTogglePostMenu(post.id); }}>
              <MoreVertical size={20} />
            </button>
            {showPostMenus[post.id] && (
              <div className="post-menu-dropdown">
                <button className="menu-item share" onClick={(e) => { e.stopPropagation(); onSharePost(post.id, post); }}>
                  {shareSuccess[post.id] ? <><Check size={16} />{t('linkCopied')}</> : <><Share2 size={16} />{t('sharePost')}</>}
                </button>
                {post.userId === currentUser.uid && (
                  <>
                    <button className="menu-item edit" onClick={(e) => { e.stopPropagation(); onEditPost(post.id, post.caption || ''); }}>
                      <Edit3 size={16} />{t('edit')}
                    </button>
                    <button className="menu-item delete" onClick={(e) => { e.stopPropagation(); onDeletePost(post.id, post); }}>
                      <Trash2 size={16} />{t('deletePost')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="post-media">
        {(post.mediaUrl || (post as any).imageUrl || (post as any).videoUrl) && (
          (post.mediaType === 'video' || (post as any).videoUrl) ? (
            <div onClick={(e) => e.stopPropagation()}>
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
              onClick={() => handleNavigateToPost(post.id)}
              style={{ cursor: 'pointer' }}
            />
          )
        )}
      </div>

      {post.caption && (
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
            <p onClick={() => handleNavigateToPost(post.id)} style={{ cursor: 'pointer' }}>
              <strong>{displayName}</strong> {post.caption}
            </p>
          )}
        </div>
      )}

      <div className="post-actions">
        <LikeButton
          postId={post.id}
          initialLiked={userLiked}
          initialCount={likesCount}
          size="medium"
          onLikeChange={(liked, count) => {
            // Callback to notify parent (Fix Issue #2)
            console.log(`✅ Like changed: ${liked}, count: ${count}`);
            // Parent can update state if needed, but real-time hook handles it
          }}
        />
        <button onClick={() => onToggleComments(post.id)} className={showComments[post.id] ? 'active' : ''}>
          <MessageCircle size={20} />
          <span>{commentsCount}</span>
        </button>
      </div>

      <ErrorBoundary name={`Post Comments for post ${post.id}`}>
        {showComments[post.id] && post.id && (
          <CommentSection
            contentId={post.id}
            contentType="post"
            className="feed-post-comments"
            onCommentAdded={() => {
              console.log('✅ Comment added, real-time hook will update count');
              // Real-time hook automatically updates commentsCount
            }}
            onCommentDeleted={() => {
              console.log('✅ Comment deleted, real-time hook will update count');
              // Real-time hook automatically updates commentsCount
            }}
          />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Post;
