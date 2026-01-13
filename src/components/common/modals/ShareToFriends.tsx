// ShareToFriends component for sharing posts to selected friends
import { memo, useState, useCallback, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { Search, Check, Users, Loader2, UserCheck, Clock } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import { SHARE_TYPES } from '../../../constants/sharing';
import { debounce, loadBatch, createInfiniteScrollObserver } from '../../../utils/sharing/lazyLoadingUtils';
import { Post } from '../../../types/models';
import { User } from 'firebase/auth';
import friendsService from '../../../services/supabase/friendsService';

const BATCH_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface Friend {
    id: string;
    displayName: string;
    photoURL: string;
    isOnline: boolean;
    lastSeen: Date;
    canReceiveShares: boolean;
}

interface ShareData {
    type: string;
    postId: string;
    targets: string[];
    message: string;
    originalPost: Post;
}

interface ShareToFriendsProps {
    post: Post;
    currentUser: User | null;
    onShare: (shareData: ShareData) => Promise<void>;
    isSubmitting: boolean;
    selectedTargets: string[];
    onTargetsChange: (targets: string[]) => void;
    shareMessage: string;
    onMessageChange: (message: string) => void;
}

const ShareToFriends = memo<ShareToFriendsProps>(({
    post,
    currentUser,
    onShare,
    isSubmitting,
    selectedTargets,
    onTargetsChange,
    shareMessage,
    onMessageChange
}) => {
    const [allFriends, setAllFriends] = useState<Friend[]>([]);
    const [displayedFriends, setDisplayedFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState<number>(0);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Debounced search query update
    useEffect(() => {
        const debouncedUpdate = debounce((query: string) => {
            setDebouncedSearchQuery(query);
            setLoadedCount(0); // Reset loaded count on search
        }, SEARCH_DEBOUNCE_MS);

        debouncedUpdate(searchQuery);

        return () => {
            // Cleanup
        };
    }, [searchQuery]);

    // Load friends data
    useEffect(() => {
        const loadFriends = async () => {
            if (!currentUser) return;

            setIsLoading(true);
            setError(null);

            try {
                const friends = await friendsService.getFriendsList(currentUser.uid);

                // Map to component Friend interface if needed (checking fields)
                // Service returns: id, displayName, photoURL, status, createdAt
                // Component needs: id, displayName, photoURL, isOnline, lastSeen, canReceiveShares

                const mappedFriends: Friend[] = friends.map(f => ({
                    id: f.userId || f.id, // Service returns userId as friend's ID
                    displayName: f.displayName,
                    photoURL: f.photoURL,
                    isOnline: false, // Not supported in MVP
                    lastSeen: new Date(), // Not supported in MVP
                    canReceiveShares: true // Default to true
                }));

                setAllFriends(mappedFriends);
            } catch (err) {
                setError('Failed to load friends. Please try again.');
                console.error('Error loading friends:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFriends();
    }, [currentUser]);

    // Filter friends based on debounced search query
    const filteredFriends = useMemo(() => {
        if (!debouncedSearchQuery.trim()) return allFriends;

        const query = debouncedSearchQuery.toLowerCase();
        return allFriends.filter(friend =>
            friend.displayName.toLowerCase().includes(query)
        );
    }, [allFriends, debouncedSearchQuery]);

    // Available friends (can receive shares)
    const availableFriends = useMemo(() => {
        return filteredFriends.filter(friend => friend.canReceiveShares);
    }, [filteredFriends]);

    // Load initial batch and set up lazy loading
    useEffect(() => {
        if (availableFriends.length === 0) {
            setDisplayedFriends([]);
            setLoadedCount(0);
            return;
        }

        const batch = loadBatch(availableFriends, 0, BATCH_SIZE);
        setDisplayedFriends(batch.items);
        setLoadedCount(batch.loadedCount);
    }, [availableFriends]);

    // Load more friends when scrolling
    const loadMoreFriends = useCallback(() => {
        if (isLoadingMore || loadedCount >= availableFriends.length) return;

        setIsLoadingMore(true);

        // Simulate slight delay for loading
        setTimeout(() => {
            const batch = loadBatch(availableFriends, loadedCount, BATCH_SIZE);
            setDisplayedFriends(prev => [...prev, ...batch.items]);
            setLoadedCount(batch.loadedCount);
            setIsLoadingMore(false);
        }, 200);
    }, [isLoadingMore, loadedCount, availableFriends]);

    // Set up intersection observer for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current) return;

        observerRef.current = createInfiniteScrollObserver(loadMoreFriends, {
            rootMargin: '200px'
        });

        observerRef.current.observe(loadMoreRef.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadMoreFriends]);

    // Handle friend selection
    const handleFriendToggle = useCallback((friendId: string) => {
        if (isSubmitting) return;

        const newTargets = selectedTargets.includes(friendId)
            ? selectedTargets.filter(id => id !== friendId)
            : [...selectedTargets, friendId];

        onTargetsChange(newTargets);
    }, [selectedTargets, onTargetsChange, isSubmitting]);

    // Handle select all
    const handleSelectAll = useCallback(() => {
        if (isSubmitting) return;

        const allAvailableIds = availableFriends.map(friend => friend.id);
        const allSelected = allAvailableIds.every(id => selectedTargets.includes(id));

        if (allSelected) {
            // Deselect all
            onTargetsChange([]);
        } else {
            // Select all available
            onTargetsChange(allAvailableIds);
        }
    }, [availableFriends, selectedTargets, onTargetsChange, isSubmitting]);

    // Handle share submission
    const handleSubmit = useCallback(async () => {
        if (selectedTargets.length === 0 || isSubmitting) return;

        const shareData: ShareData = {
            type: SHARE_TYPES.FRIENDS,
            postId: post.id,
            targets: selectedTargets,
            message: shareMessage.trim(),
            originalPost: post
        };

        await onShare(shareData);
    }, [selectedTargets, isSubmitting, post, shareMessage, onShare]);

    // Format last seen time
    const formatLastSeen = useCallback((lastSeen: Date): string => {
        const now = new Date();
        const diff = now.getTime() - lastSeen.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }, []);

    if (isLoading) {
        return (
            <div className="share-loading">
                <Loader2 size={24} className="spinning" />
                <p>Loading friends...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="share-error">
                <p>{error}</p>
                <button
                    className="retry-btn"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="share-to-friends">
            {/* Search and Controls */}
            <div className="friends-controls">
                <div className="search-container">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="friends-search"
                        disabled={isSubmitting}
                    />
                </div>

                {availableFriends.length > 0 && (
                    <button
                        className="select-all-btn"
                        onClick={handleSelectAll}
                        disabled={isSubmitting}
                    >
                        {availableFriends.every(friend => selectedTargets.includes(friend.id))
                            ? 'Deselect All'
                            : 'Select All'
                        }
                    </button>
                )}
            </div>

            {/* Friends List */}
            <div className="friends-list">
                {availableFriends.length === 0 ? (
                    <div className="empty-friends">
                        <Users size={48} />
                        <h4>No friends found</h4>
                        <p>
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Add friends to start sharing posts with them'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        {displayedFriends.map((friend) => (
                            <div
                                key={friend.id}
                                className={`friend-item ${selectedTargets.includes(friend.id) ? 'selected' : ''}`}
                                onClick={() => handleFriendToggle(friend.id)}
                            >
                                <div className="friend-avatar-container">
                                    <LazyImage
                                        src={friend.photoURL}
                                        alt={friend.displayName}
                                        className="friend-avatar"
                                        placeholder="/default-avatar.jpg"
                                    />
                                    <div className={`status-indicator ${friend.isOnline ? 'online' : 'offline'}`} />
                                </div>

                                <div className="friend-info">
                                    <h4>{friend.displayName}</h4>
                                    <div className="friend-status">
                                        {friend.isOnline ? (
                                            <span className="online-status">
                                                <div className="online-dot" />
                                                Online
                                            </span>
                                        ) : (
                                            <span className="offline-status">
                                                <Clock size={12} />
                                                {formatLastSeen(friend.lastSeen)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="friend-checkbox">
                                    {selectedTargets.includes(friend.id) && (
                                        <Check size={16} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Load more trigger */}
                        {loadedCount < availableFriends.length && (
                            <div ref={loadMoreRef} className="load-more-trigger">
                                {isLoadingMore && (
                                    <div className="loading-more">
                                        <Loader2 size={20} className="spinning" />
                                        <span>Loading more friends...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress indicator */}
                        {availableFriends.length > BATCH_SIZE && (
                            <div className="load-progress">
                                Showing {loadedCount} of {availableFriends.length} friends
                            </div>
                        )}
                    </>
                )}

                {/* Show unavailable friends if any */}
                {filteredFriends.some(friend => !friend.canReceiveShares) && (
                    <div className="unavailable-friends">
                        <h5>Cannot share with:</h5>
                        {filteredFriends
                            .filter(friend => !friend.canReceiveShares)
                            .map(friend => (
                                <div key={friend.id} className="friend-item unavailable">
                                    <LazyImage
                                        src={friend.photoURL}
                                        alt={friend.displayName}
                                        className="friend-avatar"
                                        placeholder="/default-avatar.jpg"
                                    />
                                    <div className="friend-info">
                                        <h4>{friend.displayName}</h4>
                                        <p>Privacy settings don't allow shares</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Message Input */}
            <div className="share-message-section">
                <textarea
                    placeholder="Add a message (optional)..."
                    value={shareMessage}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onMessageChange(e.target.value)}
                    className="share-message-input"
                    rows={3}
                    maxLength={500}
                    disabled={isSubmitting}
                />
                <div className="message-counter">
                    {shareMessage.length}/500
                </div>
            </div>

            {/* Share Button */}
            <div className="share-actions">
                <div className="selected-count">
                    {selectedTargets.length > 0 && (
                        <span>
                            <UserCheck size={16} />
                            {selectedTargets.length} friend{selectedTargets.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                </div>

                <button
                    className="share-submit-btn"
                    onClick={handleSubmit}
                    disabled={selectedTargets.length === 0 || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="spinning" />
                            Sharing...
                        </>
                    ) : (
                        <>
                            Share to Friends
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

ShareToFriends.displayName = 'ShareToFriends';

export default ShareToFriends;
