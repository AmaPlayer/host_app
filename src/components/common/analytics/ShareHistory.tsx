import { memo, useState, useEffect, useCallback } from 'react';
import {
  History,
  Share2,
  Users,
  MessageSquare,
  Trash2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import shareService from '../../../services/api/ShareService';
import { SHARE_TYPES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../constants/sharing';
import './ShareHistory.css';

interface ShareItem {
  shareId: string;
  postId: string;
  shareType: string;
  timestamp: string | Date;
  targetCount?: number;
  message?: string;
}

interface ShareStatistics {
  totalShares: number;
  sharesByType: Record<string, number>;
}

interface ShareHistoryData {
  history: ShareItem[];
  statistics: ShareStatistics | null;
}

interface ShareHistoryProps {
  userId: string;
  className?: string;
  compact?: boolean;
  showFilters?: boolean;
  maxItems?: number;
}

type SortField = 'timestamp' | 'shareType' | 'targetCount';
type SortOrder = 'asc' | 'desc';

/**
 * ShareHistory component for viewing and managing user's share history
 * Provides interface for share deletion, modification, and activity tracking
 */
const ShareHistory: React.FC<ShareHistoryProps> = memo(({
  userId,
  className = '',
  compact = false,
  showFilters = true,
  maxItems = 50
}) => {
  const [shareHistory, setShareHistory] = useState<ShareItem[]>([]);
  const [statistics, setStatistics] = useState<ShareStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Management states
  const [deletingShares, setDeletingShares] = useState<Set<string>>(new Set());
  const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Load share history
  const loadShareHistory = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const historyData: ShareHistoryData = await shareService.getUserShareHistory(userId, {
        limit: maxItems,
        includeAnalytics: true
      });

      setShareHistory(historyData.history || []);
      setStatistics(historyData.statistics || null);
    } catch (err) {
      console.error('Error loading share history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load share history';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, maxItems]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadShareHistory();
    }
  }, [loadShareHistory, userId]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    loadShareHistory(true);
  }, [loadShareHistory]);

  // Filter and sort shares
  const filteredAndSortedShares = useCallback((): ShareItem[] => {
    let filtered = shareHistory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(share =>
        share.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        share.postId.includes(searchTerm)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(share => share.shareType === filterType);
    }

    // Sort shares
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'shareType':
          aValue = a.shareType;
          bValue = b.shareType;
          break;
        case 'targetCount':
          aValue = a.targetCount || 0;
          bValue = b.targetCount || 0;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [shareHistory, searchTerm, filterType, sortBy, sortOrder]);

  // Handle share deletion
  const handleDeleteShare = useCallback(async (shareId: string) => {
    try {
      setDeletingShares(prev => new Set([...prev, shareId]));

      await shareService.removeShare(shareId, userId);

      // Remove from local state
      setShareHistory(prev => prev.filter(share => share.shareId !== shareId));
      setSelectedShares(prev => {
        const newSet = new Set(prev);
        newSet.delete(shareId);
        return newSet;
      });

      // Show success message (you might want to use a toast notification here)
    } catch (err) {
      console.error('Error deleting share:', err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.SHARE_FAILED;
      setError(errorMessage);
    } finally {
      setDeletingShares(prev => {
        const newSet = new Set(prev);
        newSet.delete(shareId);
        return newSet;
      });
    }
  }, [userId]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedShares.size === 0) return;

    try {
      setLoading(true);

      const deletePromises = Array.from(selectedShares).map(shareId =>
        shareService.removeShare(shareId, userId)
      );

      await Promise.all(deletePromises);

      // Remove from local state
      setShareHistory(prev =>
        prev.filter(share => !selectedShares.has(share.shareId))
      );
      setSelectedShares(new Set());
      setShowDeleteConfirm(false);

    } catch (err) {
      console.error('Error bulk deleting shares:', err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.SHARE_FAILED;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedShares, userId]);

  // Toggle share selection
  const toggleShareSelection = useCallback((shareId: string) => {
    setSelectedShares(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shareId)) {
        newSet.delete(shareId);
      } else {
        newSet.add(shareId);
      }
      return newSet;
    });
  }, []);

  // Toggle expanded item
  const toggleExpanded = useCallback((shareId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shareId)) {
        newSet.delete(shareId);
      } else {
        newSet.add(shareId);
      }
      return newSet;
    });
  }, []);

  // Format date for display
  const formatDate = useCallback((timestamp: string | Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }, []);

  // Get share type icon
  const getShareTypeIcon = useCallback((shareType: string): React.ReactElement => {
    switch (shareType) {
      case SHARE_TYPES.FRIENDS:
        return <Users size={16} />;
      case SHARE_TYPES.FEED:
        return <Share2 size={16} />;
      case SHARE_TYPES.GROUPS:
        return <MessageSquare size={16} />;
      default:
        return <Share2 size={16} />;
    }
  }, []);

  // Get share type label
  const getShareTypeLabel = useCallback((shareType: string): string => {
    switch (shareType) {
      case SHARE_TYPES.FRIENDS:
        return 'Friends';
      case SHARE_TYPES.FEED:
        return 'Feed';
      case SHARE_TYPES.GROUPS:
        return 'Groups';
      default:
        return 'Unknown';
    }
  }, []);

  const filteredShares = filteredAndSortedShares();

  // Render loading state
  if (loading && shareHistory.length === 0) {
    return (
      <div className={`share-history loading ${compact ? 'compact' : ''} ${className}`}>
        <div className="history-header">
          <div className="header-icon">
            <History size={20} />
          </div>
          <div className="header-title">
            <div className="skeleton-text" style={{ width: '120px', height: '16px' }} />
            <div className="skeleton-text" style={{ width: '80px', height: '12px' }} />
          </div>
        </div>
        <div className="history-content">
          {[1, 2, 3].map(i => (
            <div key={i} className="share-item skeleton">
              <div className="skeleton-text" style={{ width: '100%', height: '60px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error && shareHistory.length === 0) {
    return (
      <div className={`share-history error ${compact ? 'compact' : ''} ${className}`}>
        <div className="history-header">
          <div className="header-icon error">
            <History size={20} />
          </div>
          <div className="header-title">
            <span>Share History</span>
            <span className="error-text">Failed to load</span>
          </div>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Retry loading history"
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`share-history ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="history-header">
        <div className="header-icon">
          <History size={20} />
        </div>
        <div className="header-title">
          <span>Share History</span>
          <span className="subtitle">
            {filteredShares.length} of {shareHistory.length} shares
          </span>
        </div>
        <div className="header-controls">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh history"
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && !compact && (
        <div className="history-stats">
          <div className="stat-item">
            <span className="stat-value">{statistics.totalShares}</span>
            <span className="stat-label">Total Shares</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.sharesByType[SHARE_TYPES.FRIENDS]}</span>
            <span className="stat-label">To Friends</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.sharesByType[SHARE_TYPES.FEED]}</span>
            <span className="stat-label">To Feed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.sharesByType[SHARE_TYPES.GROUPS]}</span>
            <span className="stat-label">To Groups</span>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      {showFilters && !compact && (
        <div className="history-filters">
          <div className="filter-row">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search shares..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value={SHARE_TYPES.FRIENDS}>Friends</option>
              <option value={SHARE_TYPES.FEED}>Feed</option>
              <option value={SHARE_TYPES.GROUPS}>Groups</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="sort-select"
            >
              <option value="timestamp">Date</option>
              <option value="shareType">Type</option>
              <option value="targetCount">Recipients</option>
            </select>

            <button
              className="sort-order-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {selectedShares.size > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">
                {selectedShares.size} selected
              </span>
              <button
                className="bulk-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* Share List */}
      <div className="history-content">
        {filteredShares.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <h3>No shares found</h3>
            <p>
              {shareHistory.length === 0
                ? "You haven't shared any posts yet."
                : "No shares match your current filters."
              }
            </p>
          </div>
        ) : (
          <div className="share-list">
            {filteredShares.map((share) => {
              const isExpanded = expandedItems.has(share.shareId);
              const isSelected = selectedShares.has(share.shareId);
              const isDeleting = deletingShares.has(share.shareId);

              return (
                <div
                  key={share.shareId}
                  className={`share-item ${isSelected ? 'selected' : ''} ${isDeleting ? 'deleting' : ''}`}
                >
                  <div className="share-item-header">
                    {!compact && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleShareSelection(share.shareId)}
                        disabled={isDeleting}
                        className="share-checkbox"
                      />
                    )}

                    <div className="share-type-icon">
                      {getShareTypeIcon(share.shareType)}
                    </div>

                    <div className="share-info">
                      <div className="share-primary">
                        <span className="share-type">
                          {getShareTypeLabel(share.shareType)}
                        </span>
                        {share.targetCount && (
                          <span className="target-count">
                            • {share.targetCount} recipient{share.targetCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="share-secondary">
                        <Clock size={12} />
                        {formatDate(share.timestamp)}
                        <span className="post-id">Post: {share.postId.slice(-8)}</span>
                      </div>
                    </div>

                    <div className="share-actions">
                      <button
                        className="expand-btn"
                        onClick={() => toggleExpanded(share.shareId)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteShare(share.shareId)}
                        disabled={isDeleting}
                        title="Delete share"
                      >
                        {isDeleting ? (
                          <RefreshCw size={14} className="spinning" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="share-item-details">
                      {share.message && (
                        <div className="share-message">
                          <MessageSquare size={14} />
                          <span>"{share.message}"</span>
                        </div>
                      )}

                      <div className="share-metadata">
                        <div className="metadata-item">
                          <span className="metadata-label">Share ID:</span>
                          <span className="metadata-value">{share.shareId}</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Post ID:</span>
                          <span className="metadata-value">{share.postId}</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Full Date:</span>
                          <span className="metadata-value">
                            {new Date(share.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <div className="modal-header">
              <AlertCircle size={20} />
              <h3>Delete Selected Shares</h3>
            </div>
            <div className="modal-content">
              <p>
                Are you sure you want to delete {selectedShares.size} share{selectedShares.size !== 1 ? 's' : ''}?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="spinning" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ShareHistory.displayName = 'ShareHistory';

export default ShareHistory;
