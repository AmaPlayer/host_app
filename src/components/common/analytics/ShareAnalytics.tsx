import { memo, useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Share2,
  Clock,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Activity
} from 'lucide-react';
import shareService from '../../../services/api/ShareService';
import { SHARE_TYPES } from '../../../constants/sharing';
import './ShareAnalytics.css';

interface ShareAnalyticsData {
  totalEvents: number;
  successfulShares: number;
  failedShares: number;
  successRate: number;
  shareBreakdown: Record<string, number>;
  shareTimeline: Array<{ date: string; shares: number }>;
  uniqueSharers: number;
  averageTargetsPerShare: number;
  messageUsageRate: number;
  shareVelocity: number;
  peakTimes: Array<{ hour: number; count: number; percentage: number }>;
}

interface ShareAnalyticsProps {
  postId: string;
  currentUserId?: string;
  className?: string;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * ShareAnalytics component displays comprehensive share statistics for post authors
 * Shows share breakdown, timeline analysis, and performance metrics
 */
const ShareAnalytics: React.FC<ShareAnalyticsProps> = memo(({
  postId,
  className = '',
  compact = false,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [analytics, setAnalytics] = useState<ShareAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(!compact);
  const [timeRange, setTimeRange] = useState<number>(30); // days
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load analytics data
  const loadAnalytics = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const analyticsData = await shareService.getShareAnalytics(postId, {
        timeRange,
        includeDetails: true
      });

      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading share analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, timeRange]);

  // Initial load
  useEffect(() => {
    if (postId) {
      loadAnalytics();
    }
  }, [loadAnalytics, postId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !postId) return;

    const interval = setInterval(() => {
      loadAnalytics(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadAnalytics, postId]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((newRange: number) => {
    setTimeRange(newRange);
  }, []);

  // Toggle expanded view
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  // Calculate percentage
  const calculatePercentage = useCallback((value: number, total: number): number => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }, []);

  // Render loading state
  if (loading && !analytics) {
    return (
      <div className={`share-analytics loading ${className}`}>
        <div className="analytics-header">
          <div className="header-icon">
            <BarChart3 size={20} />
          </div>
          <div className="header-title">
            <div className="skeleton-text" style={{ width: '120px', height: '16px' }} />
            <div className="skeleton-text" style={{ width: '80px', height: '12px' }} />
          </div>
        </div>
        <div className="analytics-content">
          <div className="metrics-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="metric-card">
                <div className="skeleton-text" style={{ width: '60px', height: '24px' }} />
                <div className="skeleton-text" style={{ width: '80px', height: '12px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`share-analytics error ${className}`}>
        <div className="analytics-header">
          <div className="header-icon error">
            <BarChart3 size={20} />
          </div>
          <div className="header-title">
            <span>Share Analytics</span>
            <span className="error-text">Failed to load</span>
          </div>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Retry loading analytics"
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

  if (!analytics) {
    return null;
  }

  const {
    successfulShares,
    failedShares,
    successRate,
    shareBreakdown,
    shareTimeline,
    uniqueSharers,
    averageTargetsPerShare,
    messageUsageRate,
    shareVelocity,
    peakTimes
  } = analytics;

  return (
    <div className={`share-analytics ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="analytics-header">
        <div className="header-icon">
          <BarChart3 size={20} />
        </div>
        <div className="header-title">
          <span>Share Analytics</span>
          <span className="subtitle">
            {formatNumber(successfulShares)} shares • {timeRange} days
          </span>
        </div>
        <div className="header-controls">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>

          {/* Refresh button */}
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh analytics"
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>

          {/* Expand/collapse button */}
          {compact && (
            <button
              className="expand-btn"
              onClick={toggleExpanded}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`analytics-content ${expanded ? 'expanded' : 'collapsed'}`}>
        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-value">
              {formatNumber(successfulShares)}
            </div>
            <div className="metric-label">
              <Share2 size={14} />
              Total Shares
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {successRate}%
            </div>
            <div className="metric-label">
              <TrendingUp size={14} />
              Success Rate
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatNumber(uniqueSharers)}
            </div>
            <div className="metric-label">
              <Users size={14} />
              Unique Sharers
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {averageTargetsPerShare}
            </div>
            <div className="metric-label">
              <Target size={14} />
              Avg Recipients
            </div>
          </div>
        </div>

        {expanded && (
          <>
            {/* Share Breakdown */}
            <div className="analytics-section">
              <h4 className="section-title">Share Breakdown</h4>
              <div className="share-breakdown">
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span className="breakdown-type">Friends</span>
                    <span className="breakdown-count">
                      {shareBreakdown[SHARE_TYPES.FRIENDS]}
                      ({calculatePercentage(shareBreakdown[SHARE_TYPES.FRIENDS], successfulShares)}%)
                    </span>
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill friends"
                      style={{
                        width: `${calculatePercentage(shareBreakdown[SHARE_TYPES.FRIENDS], successfulShares)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span className="breakdown-type">Feed</span>
                    <span className="breakdown-count">
                      {shareBreakdown[SHARE_TYPES.FEED]}
                      ({calculatePercentage(shareBreakdown[SHARE_TYPES.FEED], successfulShares)}%)
                    </span>
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill feed"
                      style={{
                        width: `${calculatePercentage(shareBreakdown[SHARE_TYPES.FEED], successfulShares)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span className="breakdown-type">Groups</span>
                    <span className="breakdown-count">
                      {shareBreakdown[SHARE_TYPES.GROUPS]}
                      ({calculatePercentage(shareBreakdown[SHARE_TYPES.GROUPS], successfulShares)}%)
                    </span>
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill groups"
                      style={{
                        width: `${calculatePercentage(shareBreakdown[SHARE_TYPES.GROUPS], successfulShares)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="analytics-section">
              <h4 className="section-title">Performance Metrics</h4>
              <div className="performance-grid">
                <div className="performance-item">
                  <div className="performance-icon">
                    <MessageSquare size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{messageUsageRate}%</div>
                    <div className="performance-label">Include Messages</div>
                  </div>
                </div>

                <div className="performance-item">
                  <div className="performance-icon">
                    <Activity size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{shareVelocity}/hr</div>
                    <div className="performance-label">Share Velocity</div>
                  </div>
                </div>

                {failedShares > 0 && (
                  <div className="performance-item error">
                    <div className="performance-icon">
                      <TrendingUp size={16} />
                    </div>
                    <div className="performance-content">
                      <div className="performance-value">{failedShares}</div>
                      <div className="performance-label">Failed Attempts</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Peak Times */}
            {peakTimes && peakTimes.length > 0 && (
              <div className="analytics-section">
                <h4 className="section-title">Peak Sharing Times</h4>
                <div className="peak-times">
                  {peakTimes.map((peak) => (
                    <div key={peak.hour} className="peak-time-item">
                      <div className="peak-time">
                        <Clock size={14} />
                        {peak.hour}:00
                      </div>
                      <div className="peak-count">
                        {peak.count} shares ({peak.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {shareTimeline && shareTimeline.length > 0 && (
              <div className="analytics-section">
                <h4 className="section-title">Share Timeline</h4>
                <div className="timeline-chart">
                  {shareTimeline.slice(0, 7).map((day) => (
                    <div key={day.date} className="timeline-day">
                      <div className="timeline-date">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="timeline-bar">
                        <div
                          className="timeline-fill"
                          style={{
                            height: `${Math.max(5, (day.shares / Math.max(...shareTimeline.map(d => d.shares))) * 100)}%`
                          }}
                          title={`${day.shares} shares`}
                        />
                      </div>
                      <div className="timeline-count">{day.shares}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

ShareAnalytics.displayName = 'ShareAnalytics';

export default ShareAnalytics;