// ShareToGroups component for sharing posts to selected groups
import React, { memo, useState, useCallback, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { Search, Check, MessageCircle, Users, Loader2, Shield, Activity, AlertCircle } from 'lucide-react';
import LazyImage from '../ui/LazyImage';
import { SHARE_TYPES } from '../../../constants/sharing';
import { debounce, loadBatch, createInfiniteScrollObserver } from '../../../utils/sharing/lazyLoadingUtils';
import { Post } from '../../../types/models';
import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import groupsService from '../../../services/supabase/groupsService';

const GROUP_PERMISSIONS = {
  ALL: 'all',
  ADMINS: 'admins',
  APPROVED: 'approved'
} as const;

const BATCH_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  postingPermissions: string;
  isActive: boolean;
  userRole: string;
  canPost: boolean;
  photoURL: string;
  lastActivity: Date;
}

interface ShareData {
  type: string;
  postId: string;
  targets: string[];
  message: string;
  originalPost: Post;
}

interface ShareToGroupsProps {
  post: Post;
  currentUser: User | null;
  onShare: (shareData: ShareData) => Promise<void>;
  isSubmitting: boolean;
  selectedTargets: string[];
  onTargetsChange: (targets: string[]) => void;
  shareMessage: string;
  onMessageChange: (message: string) => void;
}

const ShareToGroups = memo<ShareToGroupsProps>(({
  post,
  currentUser,
  onShare,
  isSubmitting,
  selectedTargets,
  onTargetsChange,
  shareMessage,
  onMessageChange
}) => {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [displayedGroups, setDisplayedGroups] = useState<Group[]>([]);
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

  // Load groups
  useEffect(() => {
    const loadGroups = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      setError(null);

      try {
        const userGroups = await groupsService.getGroupsList(currentUser.uid);

        // Map to component Group interface
        const mappedGroups: Group[] = userGroups.map(g => {
          // Determine role
          let userRole = 'member'; // Default
          if (g.admins?.includes(currentUser.uid)) userRole = 'admin';

          // Determine canPost
          let canPost = true;
          if (g.postingPermissions === 'admins' && userRole !== 'admin') canPost = false;

          const lastActivityDate = g.updatedAt instanceof Timestamp
            ? g.updatedAt.toDate()
            : new Date(g.updatedAt);

          return {
            id: g.id,
            name: g.name,
            description: g.description,
            memberCount: g.memberCount,
            postingPermissions: g.postingPermissions,
            isActive: true, // Assume active
            userRole: userRole,
            canPost: canPost,
            photoURL: g.photoURL || '/default-avatar.jpg',
            lastActivity: lastActivityDate
          };
        });

        setAllGroups(mappedGroups);
      } catch (err) {
        setError('Failed to load groups. Please try again.');
        console.error('Error loading groups:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [currentUser]);

  // Filter groups based on debounced search query
  const filteredGroups = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return allGroups;

    const query = debouncedSearchQuery.toLowerCase();
    return allGroups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.description.toLowerCase().includes(query)
    );
  }, [allGroups, debouncedSearchQuery]);

  // Available groups (can post to)
  const availableGroups = useMemo(() => {
    return filteredGroups.filter(group => group.canPost && group.isActive);
  }, [filteredGroups]);

  // Load initial batch and set up lazy loading
  useEffect(() => {
    if (availableGroups.length === 0) {
      setDisplayedGroups([]);
      setLoadedCount(0);
      return;
    }

    const batch = loadBatch(availableGroups, 0, BATCH_SIZE);
    setDisplayedGroups(batch.items);
    setLoadedCount(batch.loadedCount);
  }, [availableGroups]);

  // Load more groups when scrolling
  const loadMoreGroups = useCallback(() => {
    if (isLoadingMore || loadedCount >= availableGroups.length) return;

    setIsLoadingMore(true);

    // Simulate slight delay for loading
    setTimeout(() => {
      const batch = loadBatch(availableGroups, loadedCount, BATCH_SIZE);
      setDisplayedGroups(prev => [...prev, ...batch.items]);
      setLoadedCount(batch.loadedCount);
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, loadedCount, availableGroups]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = createInfiniteScrollObserver(loadMoreGroups, {
      rootMargin: '200px'
    });

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreGroups]);

  // Handle group selection
  const handleGroupToggle = useCallback((groupId: string) => {
    if (isSubmitting) return;

    const newTargets = selectedTargets.includes(groupId)
      ? selectedTargets.filter(id => id !== groupId)
      : [...selectedTargets, groupId];

    onTargetsChange(newTargets);
  }, [selectedTargets, onTargetsChange, isSubmitting]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (isSubmitting) return;

    const allAvailableIds = availableGroups.map(group => group.id);
    const allSelected = allAvailableIds.every(id => selectedTargets.includes(id));

    if (allSelected) {
      // Deselect all
      onTargetsChange([]);
    } else {
      // Select all available
      onTargetsChange(allAvailableIds);
    }
  }, [availableGroups, selectedTargets, onTargetsChange, isSubmitting]);

  // Handle share submission
  const handleSubmit = useCallback(async () => {
    if (selectedTargets.length === 0 || isSubmitting) return;

    const shareData: ShareData = {
      type: SHARE_TYPES.GROUPS,
      postId: post.id,
      targets: selectedTargets,
      message: shareMessage.trim(),
      originalPost: post
    };

    await onShare(shareData);
  }, [selectedTargets, isSubmitting, post, shareMessage, onShare]);

  // Format member count
  const formatMemberCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Format last activity
  const formatLastActivity = useCallback((lastActivity: Date): string => {
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `Active ${minutes}m ago`;
    if (hours < 24) return `Active ${hours}h ago`;
    return `Active ${days}d ago`;
  }, []);

  // Get permission description
  const getPermissionDescription = (permissions: string, userRole: string): string => {
    switch (permissions) {
      case GROUP_PERMISSIONS.ALL:
        return 'All members can post';
      case GROUP_PERMISSIONS.ADMINS:
        return userRole === 'admin' ? 'Admin only (you can post)' : 'Admin only (you cannot post)';
      case GROUP_PERMISSIONS.APPROVED:
        return userRole === 'approved_member' || userRole === 'admin'
          ? 'Approved members only (you can post)'
          : 'Approved members only (you cannot post)';
      default:
        return 'Unknown permissions';
    }
  };

  if (isLoading) {
    return (
      <div className="share-loading">
        <Loader2 size={24} className="spinning" />
        <p>Loading groups...</p>
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
    <div className="share-to-groups">
      {/* Search and Controls */}
      <div className="groups-controls">
        <div className="search-container">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="groups-search"
            disabled={isSubmitting}
          />
        </div>

        {availableGroups.length > 0 && (
          <button
            className="select-all-btn"
            onClick={handleSelectAll}
            disabled={isSubmitting}
          >
            {availableGroups.every(group => selectedTargets.includes(group.id))
              ? 'Deselect All'
              : 'Select All'
            }
          </button>
        )}
      </div>

      {/* Groups List */}
      <div className="groups-list">
        {availableGroups.length === 0 ? (
          <div className="empty-groups">
            <MessageCircle size={48} />
            <h4>No groups available</h4>
            <p>
              {searchQuery
                ? 'Try a different search term'
                : 'Join groups to start sharing posts with them'
              }
            </p>
          </div>
        ) : (
          <>
            {displayedGroups.map((group) => (
              <div
                key={group.id}
                className={`group-item ${selectedTargets.includes(group.id) ? 'selected' : ''}`}
                onClick={() => handleGroupToggle(group.id)}
              >
                <LazyImage
                  src={group.photoURL}
                  alt={group.name}
                  className="group-avatar"
                  placeholder="/default-avatar.jpg"
                />

                <div className="group-info">
                  <div className="group-header">
                    <h4>{group.name}</h4>
                    {group.userRole === 'admin' && (
                      <Shield size={14} className="admin-badge" />
                    )}
                  </div>
                  <p className="group-description">{group.description}</p>
                  <div className="group-meta">
                    <span className="member-count">
                      <Users size={12} />
                      {formatMemberCount(group.memberCount)} members
                    </span>
                    <span className="last-activity">
                      <Activity size={12} />
                      {formatLastActivity(group.lastActivity)}
                    </span>
                  </div>
                  <div className="group-permissions">
                    {getPermissionDescription(group.postingPermissions, group.userRole)}
                  </div>
                </div>

                <div className="group-checkbox">
                  {selectedTargets.includes(group.id) && (
                    <Check size={16} />
                  )}
                </div>
              </div>
            ))}

            {/* Load more trigger */}
            {loadedCount < availableGroups.length && (
              <div ref={loadMoreRef} className="load-more-trigger">
                {isLoadingMore && (
                  <div className="loading-more">
                    <Loader2 size={20} className="spinning" />
                    <span>Loading more groups...</span>
                  </div>
                )}
              </div>
            )}

            {/* Progress indicator */}
            {availableGroups.length > BATCH_SIZE && (
              <div className="load-progress">
                Showing {loadedCount} of {availableGroups.length} groups
              </div>
            )}
          </>
        )}

        {/* Show unavailable groups if any */}
        {filteredGroups.some(group => !group.canPost || !group.isActive) && (
          <div className="unavailable-groups">
            <h5>Cannot share to:</h5>
            {filteredGroups
              .filter(group => !group.canPost || !group.isActive)
              .map(group => (
                <div key={group.id} className="group-item unavailable">
                  <LazyImage
                    src={group.photoURL}
                    alt={group.name}
                    className="group-avatar"
                    placeholder="/default-avatar.jpg"
                  />
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <div className="unavailable-reason">
                      <AlertCircle size={12} />
                      {!group.isActive
                        ? 'Group is inactive'
                        : getPermissionDescription(group.postingPermissions, group.userRole)
                      }
                    </div>
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
          placeholder="Add context for the groups (optional)..."
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
              <MessageCircle size={16} />
              {selectedTargets.length} group{selectedTargets.length !== 1 ? 's' : ''} selected
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
              Share to Groups
            </>
          )}
        </button>
      </div>
    </div>
  );
});

ShareToGroups.displayName = 'ShareToGroups';

export default ShareToGroups;
