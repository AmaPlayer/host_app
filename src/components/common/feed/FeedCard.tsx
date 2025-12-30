// Memoized feed card components for optimal performance
import { memo, useState, useCallback, useEffect } from 'react';
import { MessageCircle, MoreHorizontal, Play } from 'lucide-react';
import { useInViewport } from '../../../utils/performance/infiniteScroll';
import { useToast } from '../../../hooks/useToast';
import LoadingSpinner from '../feedback/LoadingSpinner';
import LikeButton from '../../../features/social/components/LikeButton';
import RoleBadge from '../ui/RoleBadge';
// @ts-ignore - JS component not yet migrated
import LazyImage from '../ui/LazyImage';
// @ts-ignore - JS component not yet migrated
import LazyVideo from '../media/LazyVideo';
// @ts-ignore - JS component not yet migrated
import ShareButton from '../ui/ShareButton';
import './FeedCard.css';

interface FeedItem {
  id: string;
  userId: string;
  userPhotoURL: string;
  userDisplayName: string;
  userRole?: 'athlete' | 'parent' | 'organization' | 'coach';
  createdAt: string | Date;
  caption?: string;
  type: 'image' | 'video' | 'talent' | 'profile';
  mediaUrl?: string;
  thumbnailUrl?: string;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  title?: string;
  category?: string;
  views?: number;
  rating?: number;
  mediaType?: 'video' | 'image';
}

interface FeedCardProps {
  item: FeedItem;
  onLike?: (itemId: string, liked: boolean) => Promise<void>;
  onComment?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  onUserClick?: (userId: string) => void;
  onCommentAdded?: (itemId: string) => void;
  currentUserId?: string;
  isLikeLoading?: boolean;
  isCommentLoading?: boolean;
}

interface TalentCardProps {
  talent: FeedItem;
}

interface ProfileCardProps {
  profile: {
    id: string;
    photoURL: string;
    displayName: string;
    bio: string;
    followersCount: number;
    postsCount: number;
    isFollowing: boolean;
  };
  onFollow?: (profileId: string, following: boolean) => Promise<void>;
  currentUserId?: string;
  item?: FeedItem; // Add item prop for consistency
  onLike?: (itemId: string, liked: boolean) => Promise<void>;
  onComment?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  onUserClick?: (userId: string) => void;
  onCommentAdded?: (itemId: string) => void;
  isLikeLoading?: boolean;
  isCommentLoading?: boolean;
}

// Base feed card with memoization
const FeedCard: React.FC<FeedCardProps> = memo(({ 
  item, 
  onLike, 
  onComment, 
  onShare, 
  onUserClick,
  onCommentAdded,
  currentUserId,
  isLikeLoading = false,
  isCommentLoading = false
}) => {
  const { elementRef, hasBeenInViewport } = useInViewport({ 
    rootMargin: '100px',
    threshold: 0.1 
  }) as { elementRef: React.RefObject<HTMLDivElement>; hasBeenInViewport: boolean };

  const { showToast } = useToast();
  const [commentCount, setCommentCount] = useState<number>(item.commentsCount || 0);

  // Update local state when item props change (for real-time updates)
  useEffect(() => {
    setCommentCount(item.commentsCount || 0);
  }, [item.commentsCount]);

  // Handle like state changes from the LikeButton component
  const handleLikeChange = useCallback((liked: boolean, count: number) => {
    console.log('👍 FeedCard handleLikeChange:', { itemId: item.id, liked, count });
    // Notify parent component if needed
    if (onLike) {
      onLike(item.id, liked);
    }
  }, [item.id, onLike]);

  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    
    if (isCommentLoading) return; // Respect external loading state
    
    onComment?.(item.id);
  }, [item.id, onComment, isCommentLoading]);

  // Handle comment count updates when comments are added
  const handleCommentCountUpdate = useCallback(() => {
    setCommentCount(prev => prev + 1);
    onCommentAdded?.(item.id);
  }, [item.id, onCommentAdded]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    onShare?.(item.id);
  }, [item.id, onShare]);

  const handleUserClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    onUserClick?.(item.userId);
  }, [item.userId, onUserClick]);

  if (!hasBeenInViewport) {
    return (
      <div 
        ref={elementRef} 
        className="feed-card-placeholder"
        style={{ height: '400px' }}
      >
        <div className="loading-skeleton" />
      </div>
    );
  }

  // Handle card content clicks (prevent navigation to post detail)
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Only prevent default if the click is not on an interactive element
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, a, .user-info, .action-btn, .more-options, .share-btn, .play-overlay');
    
    if (!isInteractiveElement) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div ref={elementRef} className="feed-card" onClick={handleCardClick}>
      {/* User Header */}
      <div className="feed-card-header">
        <div className="user-info" onClick={handleUserClick}>
          <LazyImage
            {...({
              src: item.userPhotoURL,
              alt: item.userDisplayName,
              className: "user-avatar",
              placeholder: "/default-avatar.jpg"
            } as any)}
          />
          <div className="user-details">
            <div className="user-name-container">
              <h4 className="user-name">{item.userDisplayName}</h4>
              <RoleBadge role={item.userRole} size="small" />
            </div>
            <span className="post-time">{formatTime(item.createdAt)}</span>
          </div>
        </div>
        <button className="more-options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content */}
      {item.caption && (
        <div className="feed-card-caption">
          <p>{item.caption}</p>
        </div>
      )}

      {/* Media Content */}
      <div className="feed-card-media">
        {item.type === 'image' && item.mediaUrl && (
          <LazyImage
            {...({
              src: item.mediaUrl,
              alt: item.caption || 'Post image',
              className: "feed-image",
              placeholder: "/image-placeholder.jpg"
            } as any)}
          />
        )}
        
        {item.type === 'video' && item.mediaUrl && (
          <LazyVideo
            {...({
              src: item.mediaUrl,
              poster: item.thumbnailUrl,
              className: "feed-video"
            } as any)}
          />
        )}
        
        {item.type === 'talent' && (
          <TalentCard talent={item} />
        )}
      </div>

      {/* Actions */}
      <div className="feed-card-actions">
        <LikeButton
          postId={item.id}
          initialLiked={item.isLiked}
          initialCount={item.likesCount}
          size="medium"
          onLikeChange={handleLikeChange}
          className="action-btn"
        />
        
        <button 
          className={`action-btn ${isCommentLoading ? 'loading' : ''}`}
          onClick={handleComment}
          disabled={isCommentLoading}
          aria-label="Comment"
        >
          {isCommentLoading ? (
            <LoadingSpinner size="small" color="primary" />
          ) : (
            <MessageCircle size={20} />
          )}
          <span>{commentCount}</span>
        </button>
        
        <ShareButton
          {...({
            postId: item.id,
            shareCount: item.sharesCount || 0,
            currentUserId: currentUserId,
            onShare: handleShare,
            size: "medium"
          } as any)}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.likesCount === nextProps.item.likesCount &&
    prevProps.item.commentsCount === nextProps.item.commentsCount &&
    prevProps.item.sharesCount === nextProps.item.sharesCount &&
    prevProps.item.isLiked === nextProps.item.isLiked &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isCommentLoading === nextProps.isCommentLoading
  );
});

// Memoized talent card component
const TalentCard: React.FC<TalentCardProps> = memo(({ talent }) => {
  const [playing, setPlaying] = useState<boolean>(false);

  const handlePlayToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPlaying(prev => !prev);
  }, []);

  return (
    <div className="talent-card">
      <div className="talent-media">
        {talent.mediaType === 'video' && talent.mediaUrl ? (
          <div className="talent-video-container">
            <LazyVideo
              {...({
                src: talent.mediaUrl,
                poster: talent.thumbnailUrl,
                playing: playing,
                className: "talent-video"
              } as any)}
            />
            <button className="play-overlay" onClick={handlePlayToggle}>
              <Play size={48} />
            </button>
          </div>
        ) : talent.mediaUrl ? (
          <LazyImage
            {...({
              src: talent.mediaUrl,
              alt: talent.title || 'Talent',
              className: "talent-image"
            } as any)}
          />
        ) : null}
      </div>
      
      <div className="talent-info">
        <h3 className="talent-title">{talent.title}</h3>
        <p className="talent-category">{talent.category}</p>
        <div className="talent-stats">
          <span className="views">{formatNumber(talent.views || 0)} views</span>
          <span className="rating">⭐ {talent.rating || 0}/5</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.talent.id === nextProps.talent.id &&
    prevProps.talent.views === nextProps.talent.views &&
    prevProps.talent.rating === nextProps.talent.rating
  );
});

// Memoized profile card component
const ProfileCard: React.FC<ProfileCardProps> = memo(({ 
  profile, 
  onFollow, 
  currentUserId,
  item,
  onLike,
  onComment,
  onShare,
  onUserClick,
  onCommentAdded,
  isLikeLoading = false,
  isCommentLoading = false
}) => {
  const [isFollowing, setIsFollowing] = useState<boolean>(profile.isFollowing);

  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);

    try {
      await onFollow?.(profile.id, newFollowingState);
    } catch (error) {
      setIsFollowing(!newFollowingState);
      console.error('Error following user:', error);
    }
  }, [isFollowing, profile.id, onFollow]);

  // Handle card content clicks (prevent navigation to post detail)
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, a, .follow-btn');
    
    if (!isInteractiveElement) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div className="profile-card" onClick={handleCardClick}>
      <div className="profile-header">
        <LazyImage
          {...({
            src: profile.photoURL,
            alt: profile.displayName,
            className: "profile-avatar large"
          } as any)}
        />
        <div className="profile-info">
          <h3 className="profile-name">{profile.displayName}</h3>
          <p className="profile-bio">{profile.bio}</p>
          <div className="profile-stats">
            <span>{formatNumber(profile.followersCount)} followers</span>
            <span>{formatNumber(profile.postsCount)} posts</span>
          </div>
        </div>
      </div>
      
      {currentUserId !== profile.id && (
        <button 
          className={`follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={handleFollow}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.profile.followersCount === nextProps.profile.followersCount &&
    prevProps.profile.isFollowing === nextProps.profile.isFollowing &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

// Utility functions
const formatTime = (timestamp: string | Date): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

FeedCard.displayName = 'FeedCard';
TalentCard.displayName = 'TalentCard';
ProfileCard.displayName = 'ProfileCard';

export default FeedCard;
export { TalentCard, ProfileCard };
