import { useState, useCallback } from 'react';
import { MomentsService } from '../services/api/momentsService';
import PostsService from '../services/supabase/postsService';

interface EngagementActionsProps {
    id: string; // post or moment id
    isPostVideo?: boolean; // true if it's from posts collection
    currentUserId?: string;
    onLike?: (id: string, liked: boolean, likesCount: number) => void;
    onComment?: (id: string) => void;
    onShare?: (id: string) => void;
    setAnnouncement?: (message: string) => void;
}

export const useEngagementActions = ({
    id,
    isPostVideo = false,
    currentUserId,
    onLike,
    onComment,
    onShare,
    setAnnouncement
}: EngagementActionsProps) => {
    const [isLiking, setIsLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);

    const handleLike = useCallback(async () => {
        if (!currentUserId || isLiking) return;

        setIsLiking(true);
        try {
            let result;

            // Route to the correct service based on content type
            if (isPostVideo) {
                result = await PostsService.toggleLike(
                    id,
                    currentUserId,
                    { displayName: 'Current User', photoURL: null } // Placeholder
                );
            } else {
                result = await MomentsService.toggleLike(
                    id,
                    currentUserId,
                    'Current User', // Placeholder
                    null
                );
            }

            onLike?.(id, result.liked, result.likesCount);
            setAnnouncement?.(`Content ${result.liked ? 'liked' : 'unliked'}. ${result.likesCount} total likes`);
        } catch (error) {
            console.error('Failed to toggle like:', error);
            setAnnouncement?.('Failed to update like status');
        } finally {
            setIsLiking(false);
        }
    }, [currentUserId, isLiking, id, isPostVideo, onLike, setAnnouncement]);

    const handleComment = useCallback(() => {
        setShowComments(true);
        setAnnouncement?.('Comments dialog opened');
        onComment?.(id);
    }, [id, onComment, setAnnouncement]);

    const handleShare = useCallback(() => {
        setShowShare(true);
        setAnnouncement?.('Share dialog opened');
        onShare?.(id);
    }, [id, onShare, setAnnouncement]);

    const handleShareAction = useCallback(async (platform: string) => {
        if (currentUserId) {
            // Track share interaction using MomentsService for now (can be genericized later)
            try {
                await MomentsService.trackInteraction({
                    momentId: id,
                    userId: currentUserId,
                    type: 'share',
                    timestamp: new Date(),
                    metadata: { platform }
                });
            } catch (error) {
                console.error('Share tracking failed', error);
            }
        }
    }, [id, currentUserId]);

    return {
        isLiking,
        handleLike,
        handleComment,
        handleShare,
        handleShareAction,
        showComments,
        setShowComments,
        showShare,
        setShowShare
    };
};
