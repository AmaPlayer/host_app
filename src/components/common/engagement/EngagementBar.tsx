import React from 'react';
import { Heart, MessageCircle, Share } from 'lucide-react';
import './EngagementBar.css';

interface EngagementBarProps {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isLiking?: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    variant?: 'vertical' | 'horizontal';
    disabled?: boolean;
}

export const EngagementBar: React.FC<EngagementBarProps> = ({
    likesCount,
    commentsCount,
    sharesCount,
    isLiked,
    isLiking = false,
    onLike,
    onComment,
    onShare,
    variant = 'vertical',
    disabled = false
}) => {
    const iconSize = variant === 'vertical' ? 28 : 20;
    const strokeWidth = variant === 'vertical' ? 2.5 : 2;

    return (
        <div className={`engagement-bar ${variant}`}>
            <button
                className={`engagement-btn ${isLiked ? 'is-liked liked' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onLike();
                }}
                disabled={disabled || isLiking}
                aria-label={`${isLiked ? 'Unlike' : 'Like'}. ${likesCount} likes`}
                aria-pressed={isLiked}
            >
                <Heart
                    size={iconSize}
                    fill={isLiked ? 'currentColor' : 'none'}
                    strokeWidth={strokeWidth}
                />
                <span className="engagement-count" aria-hidden="true">
                    {likesCount.toLocaleString()}
                </span>
            </button>

            <button
                className="engagement-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onComment();
                }}
                disabled={disabled}
                aria-label={`View comments. ${commentsCount} comments`}
            >
                <MessageCircle size={iconSize} strokeWidth={strokeWidth} />
                <span className="engagement-count" aria-hidden="true">
                    {commentsCount.toLocaleString()}
                </span>
            </button>

            <button
                className="engagement-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                }}
                disabled={disabled}
                aria-label={`Share. ${sharesCount} shares`}
            >
                <Share size={iconSize} strokeWidth={strokeWidth} />
                <span className="engagement-count" aria-hidden="true">
                    {sharesCount.toLocaleString()}
                </span>
            </button>
        </div>
    );
};
