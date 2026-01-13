import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';
import postsService from '../../../services/api/postsService';
import { useAuth } from '../../../contexts/AuthContext';
import { queryClient } from '../../../lib/queryClient';

interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
  onLikeChange?: (liked: boolean, count: number) => void;
}

const LikeButton: React.FC<LikeButtonProps> = memo(({
  postId,
  initialLiked = false,
  initialCount = 0,
  size = 'medium',
  showCount = true,
  disabled = false,
  className = '',
  onLikeChange
}) => {
  const { currentUser } = useAuth();

  // Local state for optimistic UI
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const isLiking = useRef(false);

  // Sync state with props when they change (Fix Issue #1)
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert('Please sign in to like posts');
      return;
    }

    if (disabled || isLiking.current) return;

    // 1. Optimistic Update
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : Math.max(0, count - 1);

    setLiked(newLiked);
    setCount(newCount);

    // Notify parent immediately
    if (onLikeChange) {
      onLikeChange(newLiked, newCount);
    }

    isLiking.current = true;

    try {
      // 2. Call API (Supabase)
      console.log('❤️ Toggling like for:', postId);
      const result = await postsService.toggleLike(
        postId,
        currentUser.uid,
        {
          displayName: currentUser.displayName || 'User',
          photoURL: currentUser.photoURL
        },
        newLiked ? 'like' : 'unlike'
      );

      // 3. Sync with Server Result (Optional, but good for consistency)
      // If server returns different count, correct it.
      if (result.likesCount !== newCount) {
        console.warn('⚠️ Like count mismatch with server. Correcting...');
        setCount(result.likesCount);
        if (onLikeChange) {
          onLikeChange(newLiked, result.likesCount);
        }
      }

      // 4. Invalidate React Query cache (Fix Issue #3)
      console.log('🔄 Invalidating cache for posts...');
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.invalidateQueries({ queryKey: ['posts', postId] });

    } catch (error) {
      console.error('❌ Like failed:', error);
      // 4. Rollback on Error
      setLiked(!newLiked);
      setCount(count); // Revert to old count
      if (onLikeChange) {
        onLikeChange(!newLiked, count);
      }
    } finally {
      isLiking.current = false;
    }
  }, [liked, count, currentUser, disabled, postId, onLikeChange]);

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24
  };

  const sizeClass = size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base';

  return (
    <button
      className={`flex items-center gap-1.5 transition-colors ${className} ${liked ? 'text-pink-600' : 'text-gray-500 hover:text-pink-500'}`}
      onClick={handleLike}
      disabled={disabled}
      title={liked ? 'Unlike' : 'Like'}
    >
      <Heart
        size={iconSizes[size]}
        fill={liked ? 'currentColor' : 'none'}
        strokeWidth={2.5}
        className={`transition-transform active:scale-90 ${liked ? 'scale-110' : ''}`}
      />
      {showCount && (
        <span className={`font-medium ${sizeClass}`}>
          {count > 0 ? count : ''}
        </span>
      )}
    </button>
  );
});

LikeButton.displayName = 'LikeButton';

export default LikeButton;
