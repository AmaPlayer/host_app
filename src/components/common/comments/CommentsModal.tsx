import React, { useState } from 'react';
import CommentSection from './CommentSection';
import CommentInputForm from './CommentInputForm';
import { Comment } from '../../../services/api/commentService';
import './CommentsModal.css';

interface CommentsModalProps {
    contentId: string;
    isVisible: boolean;
    onClose: () => void;
    contentType?: 'post' | 'moment';
    onCommentAdded?: () => void;
}

/**
 * CommentsModal Component
 *
 * Displays comments for any content (Post or Moment) in a modal/popup dialog.
 * Replaces VideoComments.tsx to be generic across the app.
 */
const CommentsModal: React.FC<CommentsModalProps> = ({
    contentId,
    isVisible,
    onClose,
    contentType = 'moment',
    onCommentAdded
}) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);

    const handleReply = (comment: Comment) => {
        setReplyingTo({ id: comment.id, displayName: comment.userDisplayName });
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className="comments-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comments-title"
            onClick={(e) => {
                // Close modal if clicking on overlay background
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="comments-modal-container">
                {/* Header - order: 1 */}
                <div className="comments-header">
                    <h3 id="comments-title">Comments</h3>
                    <button
                        className="close-comments-btn"
                        onClick={onClose}
                        aria-label="Close comments dialog"
                        tabIndex={0}
                    >
                        ×
                    </button>
                </div>

                {/* Comment Input Form - order: 2 (appears FIRST, before comments list) */}
                <div className="comment-form-wrapper">
                    <CommentInputForm
                        contentId={contentId}
                        contentType={contentType}
                        onCommentAdded={() => {
                            setRefreshTrigger(prev => prev + 1);
                            if (onCommentAdded) onCommentAdded();
                        }}
                        replyingTo={replyingTo}
                        onCancelReply={cancelReply}
                    />
                </div>

                {/* Comments List - order: 3 (appears LAST, scrollable) */}
                <div className="comments-content">
                    <CommentSection
                        contentId={contentId}
                        contentType={contentType}
                        className="modal-comments-list"
                        hideCommentForm={true}
                        refreshTrigger={refreshTrigger}
                        onReply={handleReply}
                    />
                </div>
            </div>
        </div>
    );
};

export default CommentsModal;
