/**
 * Share Error Logger Service
 * Centralized logging for share operation errors with analytics and monitoring
 */

import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import errorHandler from '../../utils/error/errorHandler';

class ShareErrorLogger {
  constructor() {
    this.errorBuffer = [];
    this.maxBufferSize = 100;
    this.flushInterval = 60000; // 1 minute
    this.isFlushingErrors = false;

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Log share operation error
   * @param {Error} error - The error object
   * @param {Object} context - Share operation context
   * @param {string} severity - Error severity (error, warning, critical)
   */
  async logShareError(error, context = {}, severity = 'error') {
    try {
      const errorLog = {
        timestamp: new Date(),
        serverTimestamp: serverTimestamp(),
        error: {
          message: error?.message || 'Unknown error',
          stack: error?.stack || '',
          name: error?.name || 'Error',
          code: error?.code || null
        },
        context: {
          shareType: context.shareType || null,
          postId: context.postId || null,
          sharerId: context.sharerId || null,
          targets: context.targets || [],
          operation: context.operation || 'share',
          ...context
        },
        severity,
        environment: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          url: typeof window !== 'undefined' ? window.location.href : null,
          platform: typeof navigator !== 'undefined' ? navigator.platform : null,
          online: typeof navigator !== 'undefined' ? navigator.onLine : null
        },
        metadata: {
          errorCategory: this.categorizeError(error),
          isRetryable: this.isRetryableError(error),
          requiresUserAction: this.requiresUserAction(error)
        }
      };

      // Add to buffer
      this.errorBuffer.push(errorLog);

      // Log to central error handler
      errorHandler.logError(error, `ShareError-${context.shareType || 'Unknown'}`, severity, context);

      // Flush if buffer is full
      if (this.errorBuffer.length >= this.maxBufferSize) {
        await this.flushErrors();
      }

      // For critical errors, flush immediately
      if (severity === 'critical') {
        await this.flushErrors();
      }

      return errorLog;

    } catch (loggingError) {
      console.error('Failed to log share error:', loggingError);
      // Don't throw to avoid breaking the application
    }
  }

  /**
   * Log share operation success (for analytics)
   * @param {Object} shareData - Share operation data
   * @param {Object} result - Operation result
   */
  async logShareSuccess(shareData, result) {
    try {
      const successLog = {
        timestamp: new Date(),
        serverTimestamp: serverTimestamp(),
        shareType: shareData.shareType,
        postId: shareData.postId,
        sharerId: shareData.sharerId,
        targetCount: shareData.targets?.length || 0,
        hasMessage: Boolean(shareData.message),
        privacy: shareData.privacy,
        result: {
          shareId: result.shareId,
          newShareCount: result.newShareCount,
          processingTime: result.processingTime || null
        },
        success: true
      };

      // Store in analytics (could be sent to analytics service)
      console.log('Share success logged:', successLog);

      return successLog;

    } catch (error) {
      console.error('Failed to log share success:', error);
    }
  }

  /**
   * Flush error buffer to Firestore
   */
  async flushErrors() {
    if (this.isFlushingErrors || this.errorBuffer.length === 0) {
      return;
    }

    this.isFlushingErrors = true;

    try {
      const errorsToFlush = [...this.errorBuffer];
      this.errorBuffer = [];

      // In production, you would batch write these to Firestore
      // For now, we'll just log them
      console.log(`Flushing ${errorsToFlush.length} share errors to logging service`);

      // Example: Write to Firestore (uncomment in production)
      /*
      const errorLogsRef = collection(db, 'shareErrorLogs');
      const batch = writeBatch(db);
      
      errorsToFlush.forEach(errorLog => {
        const docRef = doc(errorLogsRef);
        batch.set(docRef, errorLog);
      });
      
      await batch.commit();
      */

      // For development, store in localStorage
      if (process.env.NODE_ENV === 'development') {
        const existingLogs = JSON.parse(localStorage.getItem('share_error_logs') || '[]');
        const updatedLogs = [...errorsToFlush, ...existingLogs].slice(0, 500);
        localStorage.setItem('share_error_logs', JSON.stringify(updatedLogs));
      }

    } catch (error) {
      console.error('Failed to flush share errors:', error);
      // Put errors back in buffer
      this.errorBuffer = [...this.errorBuffer, ...this.errorBuffer];
    } finally {
      this.isFlushingErrors = false;
    }
  }

  /**
   * Start periodic error flushing
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushErrors();
      });
    }
  }

  /**
   * Categorize error type
   */
  categorizeError(error) {
    const message = error?.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('rate limit')) {
      return 'rateLimit';
    }
    if (message.includes('not found')) {
      return 'notFound';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }

    return 'unknown';
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const category = this.categorizeError(error);
    return ['network', 'rateLimit', 'unknown'].includes(category);
  }

  /**
   * Check if error requires user action
   */
  requiresUserAction(error) {
    const category = this.categorizeError(error);
    return ['permission', 'validation', 'notFound'].includes(category);
  }

  /**
   * Get error statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Error statistics
   */
  getErrorStats(filters = {}) {
    try {
      const logs = JSON.parse(localStorage.getItem('share_error_logs') || '[]');

      let filteredLogs = logs;

      if (filters.shareType) {
        filteredLogs = filteredLogs.filter(log =>
          log.context?.shareType === filters.shareType
        );
      }

      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log =>
          log.severity === filters.severity
        );
      }

      if (filters.timeRange) {
        const now = Date.now();
        const timeRangeMs = filters.timeRange * 60 * 60 * 1000; // hours to ms
        filteredLogs = filteredLogs.filter(log =>
          now - new Date(log.timestamp).getTime() < timeRangeMs
        );
      }

      const stats = {
        total: filteredLogs.length,
        byCategory: {},
        bySeverity: {},
        byShareType: {},
        retryable: 0,
        requiresAction: 0,
        recentErrors: filteredLogs.slice(0, 10)
      };

      filteredLogs.forEach(log => {
        const category = log.metadata?.errorCategory || 'unknown';
        const severity = log.severity || 'error';
        const shareType = log.context?.shareType || 'unknown';

        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        stats.byShareType[shareType] = (stats.byShareType[shareType] || 0) + 1;

        if (log.metadata?.isRetryable) stats.retryable++;
        if (log.metadata?.requiresUserAction) stats.requiresAction++;
      });

      return stats;

    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        total: 0,
        byCategory: {},
        bySeverity: {},
        byShareType: {},
        retryable: 0,
        requiresAction: 0,
        recentErrors: []
      };
    }
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.errorBuffer = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('share_error_logs');
    }
  }

  /**
   * Get recent errors for debugging
   * @param {number} count - Number of errors to retrieve
   * @returns {Array} Recent error logs
   */
  getRecentErrors(count = 10) {
    try {
      const logs = JSON.parse(localStorage.getItem('share_error_logs') || '[]');
      return logs.slice(0, count);
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }

  /**
   * Export error logs for analysis
   * @returns {string} JSON string of error logs
   */
  exportLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem('share_error_logs') || '[]');
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '[]';
    }
  }
}

// Create singleton instance
const shareErrorLogger = new ShareErrorLogger();

export default shareErrorLogger;

// Export utility functions
export const logShareError = (error, context, severity) =>
  shareErrorLogger.logShareError(error, context, severity);

export const logShareSuccess = (shareData, result) =>
  shareErrorLogger.logShareSuccess(shareData, result);

export const getShareErrorStats = (filters) =>
  shareErrorLogger.getErrorStats(filters);
