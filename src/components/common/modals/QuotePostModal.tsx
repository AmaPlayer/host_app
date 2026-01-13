import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Globe, Users, Lock, Image as ImageIcon, PlayCircle } from 'lucide-react';
import { Post } from '../../../types/models';
import { User } from 'firebase/auth'; // Or your custom User type
import LazyImage from '../ui/LazyImage';
import './QuotePostModal.css';

interface QuotePostModalProps {
    post: Post;
    currentUser: User | null;
    onClose: () => void;
    onShare: (message: string, privacy: string) => Promise<void>;
}

const QuotePostModal: React.FC<QuotePostModalProps> = ({
    post,
    currentUser,
    onClose,
    onShare
}) => {
    const [message, setMessage] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus textarea on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    // Auto-resize textarea
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        if (error) setError(null); // Clear error on typing
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setError(null);

        try {
            setIsSubmitting(true);
            await onShare(message, privacy);
            onClose();
        } catch (error: any) {
            console.error('Failed to post quote:', error);
            // Clean up error message to show only the user-friendly text
            let errorMessage = error.message || 'Failed to post quote. Please try again.';
            if (errorMessage.startsWith('Error: ')) {
                errorMessage = errorMessage.substring(7);
            }
            setError(errorMessage);
            setIsSubmitting(false);
        }
    };

    // Toggle privacy (simple cycle for now, could be a dropdown)
    const cyclePrivacy = () => {
        if (privacy === 'public') setPrivacy('friends');
        else if (privacy === 'friends') setPrivacy('private');
        else setPrivacy('public');
    };

    const getPrivacyIcon = () => {
        switch (privacy) {
            case 'public': return <Globe size={14} />;
            case 'friends': return <Users size={14} />;
            case 'private': return <Lock size={14} />;
        }
    };

    const getPrivacyLabel = () => {
        switch (privacy) {
            case 'public': return 'Everyone';
            case 'friends': return 'Friends';
            case 'private': return 'Only You';
        }
    };

    // Determine media to show in quoted card
    const hasMedia = post.mediaUrl && post.mediaUrl.trim() !== '';
    const isVideo = post.mediaType === 'video';

    return (
        <div className="quote-modal-overlay" onClick={onClose}>
            <div className="quote-modal-content" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="quote-modal-header">
                    <button className="quote-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                    <button
                        className="quote-submit-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!message.trim() && !hasMedia)} // Allow post if just empty quote? Twitter allows empty quotes.
                    >
                        {isSubmitting ? 'Posting...' : 'Post'}
                    </button>
                </div>

                {/* Body */}
                <div className="quote-modal-body">

                    {error && (
                        <div className="quote-error-message">
                            <span>{error}</span>
                            <button onClick={() => setError(null)}><X size={14} /></button>
                        </div>
                    )}

                    <div className="quote-input-area">
                        <LazyImage
                            src={currentUser?.photoURL || ''}
                            alt={currentUser?.displayName || 'User'}
                            className="quote-user-avatar"
                            placeholder="/default-avatar.jpg"
                            width={40}
                            height={40}
                        />

                        <div className="quote-textarea-container">
                            {/* Privacy Selector */}
                            <button className="quote-privacy-selector" onClick={cyclePrivacy}>
                                {getPrivacyIcon()}
                                <span>{getPrivacyLabel()} can reply</span>
                            </button>

                            {/* Text Input */}
                            <textarea
                                ref={textareaRef}
                                className="quote-textarea"
                                placeholder="Add a comment..."
                                value={message}
                                onChange={handleTextChange}
                                maxLength={280}
                            />
                        </div>
                    </div>

                    {/* Quoted Post Card */}
                    <div className="quoted-post-card">
                        <div className="quoted-post-header">
                            <LazyImage
                                src={post.userPhotoURL || ''}
                                alt={post.userDisplayName}
                                className="quoted-author-avatar"
                                placeholder="/default-avatar.jpg"
                                width={20}
                                height={20}
                            />
                            <span className="quoted-author-name">{post.userDisplayName}</span>
                            {/* We might not have username in Post object directly sometimes, fallback/omit */}
                            {/* <span className="quoted-author-handle">@username</span> */}
                            <span className="quoted-author-handle">
                                • {post.createdAt && (post.createdAt as any).toDate ? (post.createdAt as any).toDate().toLocaleDateString() : 'Recent'}
                            </span>
                        </div>

                        {post.caption && (
                            <div className="quoted-post-content">
                                {post.caption}
                            </div>
                        )}

                        {hasMedia && (
                            <div className="quoted-media-container">
                                {isVideo ? (
                                    <div style={{ position: 'relative' }}>
                                        {post.mediaMetadata?.thumbnail ? (
                                            <img
                                                src={post.mediaMetadata.thumbnail}
                                                alt="Video thumbnail"
                                                className="quoted-video-thumbnail"
                                            />
                                        ) : (
                                            <video
                                                src={post.mediaUrl}
                                                className="quoted-video-thumbnail"
                                                preload="metadata"
                                                muted
                                                playsInline
                                            />
                                        )}
                                        <div className="quoted-video-icon">
                                            <PlayCircle size={32} fill="white" />
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={post.mediaUrl}
                                        alt="Post media"
                                        className="quoted-post-media"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default QuotePostModal;
