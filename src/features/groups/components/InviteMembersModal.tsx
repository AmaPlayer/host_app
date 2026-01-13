import React, { memo, useState, useCallback, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { Search, Check, Users, Loader2, UserPlus, X } from 'lucide-react';
import LazyImage from '../../../components/common/ui/LazyImage';
import { User } from 'firebase/auth';
import friendsService from '../../../services/supabase/friendsService';
import { debounce, loadBatch, createInfiniteScrollObserver } from '../../../utils/sharing/lazyLoadingUtils';
import './InviteMembersModal.css';

const BATCH_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface Friend {
    id: string;
    displayName: string;
    photoURL: string;
    isOnline: boolean;
    lastSeen: Date;
}

interface InviteMembersModalProps {
    groupId: string;
    currentUser: User | null;
    currentMemberIds?: string[]; // To filter out existing members
    onInvite: (userIds: string[]) => Promise<void>;
    onClose: () => void;
    isOpen: boolean;
}

const InviteMembersModal = memo<InviteMembersModalProps>(({
    groupId,
    currentUser,
    currentMemberIds = [],
    onInvite,
    onClose,
    isOpen
}) => {
    const [allFriends, setAllFriends] = useState<Friend[]>([]);
    const [displayedFriends, setDisplayedFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState<number>(0);
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setDebouncedSearchQuery('');
            setSelectedTargets([]);
            setError(null);
        }
    }, [isOpen]);

    // Debounced search query update
    useEffect(() => {
        const debouncedUpdate = debounce((query: string) => {
            setDebouncedSearchQuery(query);
            setLoadedCount(0);
        }, SEARCH_DEBOUNCE_MS);

        debouncedUpdate(searchQuery);
    }, [searchQuery]);

    // Load friends data
    useEffect(() => {
        const loadFriends = async () => {
            if (!currentUser || !isOpen) return;

            setIsLoading(true);
            setError(null);

            try {
                const friends = await friendsService.getFriendsList(currentUser.uid);

                const mappedFriends: Friend[] = friends.map(f => ({
                    id: f.userId || f.id,
                    displayName: f.displayName,
                    photoURL: f.photoURL,
                    isOnline: false,
                    lastSeen: new Date()
                }));

                setAllFriends(mappedFriends);
            } catch (err) {
                setError('Failed to load friends.');
                console.error('Error loading friends:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFriends();
    }, [currentUser, isOpen]);

    // Filter friends: Remove existing members and apply search
    const filteredFriends = useMemo(() => {
        let friends = allFriends;

        // Filter out existing members
        if (currentMemberIds.length > 0) {
            friends = friends.filter(f => !currentMemberIds.includes(f.id));
        }

        if (!debouncedSearchQuery.trim()) return friends;

        const query = debouncedSearchQuery.toLowerCase();
        return friends.filter(friend =>
            friend.displayName.toLowerCase().includes(query)
        );
    }, [allFriends, debouncedSearchQuery, currentMemberIds]);

    // Load initial batch
    useEffect(() => {
        if (!isOpen) return;

        if (filteredFriends.length === 0) {
            setDisplayedFriends([]);
            setLoadedCount(0);
            return;
        }

        const batch = loadBatch(filteredFriends, 0, BATCH_SIZE);
        setDisplayedFriends(batch.items);
        setLoadedCount(batch.loadedCount);
    }, [filteredFriends, isOpen]);

    // Load more friends when scrolling
    const loadMoreFriends = useCallback(() => {
        if (isLoadingMore || loadedCount >= filteredFriends.length) return;

        setIsLoadingMore(true);

        setTimeout(() => {
            const batch = loadBatch(filteredFriends, loadedCount, BATCH_SIZE);
            setDisplayedFriends(prev => [...prev, ...batch.items]);
            setLoadedCount(batch.loadedCount);
            setIsLoadingMore(false);
        }, 200);
    }, [isLoadingMore, loadedCount, filteredFriends]);

    // Infinite scroll observer
    useEffect(() => {
        if (!loadMoreRef.current) return;

        observerRef.current = createInfiniteScrollObserver(loadMoreFriends, {
            rootMargin: '200px'
        });

        observerRef.current.observe(loadMoreRef.current);

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [loadMoreFriends, displayedFriends]);

    const handleFriendToggle = useCallback((friendId: string) => {
        if (isSubmitting) return;

        setSelectedTargets(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    }, [isSubmitting]);

    const handleSelectAll = useCallback(() => {
        if (isSubmitting) return;

        const allIds = filteredFriends.map(f => f.id);
        const allSelected = allIds.every(id => selectedTargets.includes(id));

        if (allSelected) {
            setSelectedTargets([]);
        } else {
            setSelectedTargets(allIds);
        }
    }, [filteredFriends, selectedTargets, isSubmitting]);

    const handleSubmit = useCallback(async () => {
        if (selectedTargets.length === 0 || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await onInvite(selectedTargets);
            onClose();
        } catch (err: any) {
            console.error('Invite error:', err);
            setError(err.message || 'Failed to add members');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedTargets, isSubmitting, onInvite, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="invite-modal-content" onClick={e => e.stopPropagation()}>
                <div className="invite-header">
                    <h3>Add Members</h3>
                    <button onClick={onClose} className="close-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="invite-body">
                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    <div className="search-controls">
                        <div className="search-input-wrapper">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        {filteredFriends.length > 0 && (
                            <button className="select-all" onClick={handleSelectAll}>
                                {filteredFriends.every(f => selectedTargets.includes(f.id)) ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    <div className="friends-list-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <Loader2 className="spinning" />
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="empty-state">
                                <Users size={40} />
                                <p>No friends found to invite.</p>
                            </div>
                        ) : (
                            <>
                                {displayedFriends.map(friend => (
                                    <div
                                        key={friend.id}
                                        className={`friend-row ${selectedTargets.includes(friend.id) ? 'selected' : ''}`}
                                        onClick={() => handleFriendToggle(friend.id)}
                                    >
                                        <div className="friend-avatar-wrap">
                                            <LazyImage
                                                src={friend.photoURL}
                                                alt={friend.displayName}
                                                className="friend-avatar"
                                            />
                                        </div>
                                        <div className="friend-info">
                                            <span className="friend-name">{friend.displayName}</span>
                                        </div>
                                        <div className="checkbox">
                                            {selectedTargets.includes(friend.id) && <Check size={14} />}
                                        </div>
                                    </div>
                                ))}
                                <div ref={loadMoreRef} className="load-more-spacer" />
                            </>
                        )}
                    </div>
                </div>

                <div className="invite-footer">
                    <div className="selected-count">
                        {selectedTargets.length} selected
                    </div>
                    <button
                        className="invite-confirm-btn"
                        onClick={handleSubmit}
                        disabled={selectedTargets.length === 0 || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 size={16} className="spinning" /> : <UserPlus size={16} />}
                        Add Members
                    </button>
                </div>
            </div>
        </div>
    );
});

export default InviteMembersModal;
