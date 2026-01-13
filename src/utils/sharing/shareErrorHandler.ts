/**
 * Share Error Handler
 * Provides user-friendly error messages and retry mechanisms for share failures
 */

import errorHandler from '../error/errorHandler';
import { ERROR_MESSAGES } from '../../constants/sharing';

// Share error context interface
interface ShareErrorContext {
  shareType?: string;
  postId?: string;
  userId?: string;
  targetId?: string;
  [key: string]: any;
}

// Error filter options interface
interface ErrorFilterOptions {
  category?: string;
  shareType?: string;
  limit?: number;
}

// Retry options interface
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: ((attempt: number, delay: number, error: Error) => void) | null;
}

class ShareErrorHandler {
  private errorHistory: any[];
  private maxHistorySize: number;

  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Handle share error with user-friendly messages
   * @param {Error} error - The error object
   * @param {Object} context - Share context (postId, shareType, etc.)
   * @returns {Object} Formatted error response
   */
  handleShareError(error: Error, context: ShareErrorContext = {}) {
    const errorInfo = this.categorizeError(error);

    // Log to central error handler
    errorHandler.logError(
      error,
      `Share-${context.shareType || 'Unknown'}`,
      errorInfo.severity as 'error' | 'warning' | 'critical' | 'info',
      {
        ...context,
        errorCategory: errorInfo.category,
        userFriendlyMessage: errorInfo.message
      }
    );

    // Add to error history
    this.addToHistory({
      error,
      context,
      errorInfo,
      timestamp: new Date()
    });

    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      category: errorInfo.category,
      canRetry: errorInfo.canRetry,
      retryDelay: errorInfo.retryDelay
    };
  }

  /**
   * Categorize error and provide user-friendly information
   * @param {Error} error - The error object
   * @returns {Object} Error information
   */
  categorizeError(error: Error) {
    const message = error?.message?.toLowerCase() || '';
    const code = (error as any)?.code || '';

    // Network errors
    if (this.isNetworkError(error, message)) {
      return {
        category: 'network',
        code: 'NETWORK_ERROR',
        message: ERROR_MESSAGES.NETWORK_ERROR,
        severity: 'warning',
        canRetry: true,
        retryDelay: 2000
      };
    }

    // Permission errors
    if (this.isPermissionError(error, message, code)) {
      return {
        category: 'permission',
        code: 'PERMISSION_DENIED',
        message: ERROR_MESSAGES.PERMISSION_DENIED,
        severity: 'error',
        canRetry: false,
        retryDelay: null
      };
    }

    // Rate limit errors
    if (this.isRateLimitError(error, message)) {
      const retryAfter = this.extractRetryDelay(message);
      return {
        category: 'rateLimit',
        code: 'RATE_LIMIT_EXCEEDED',
        message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        severity: 'warning',
        canRetry: true,
        retryDelay: retryAfter
      };
    }

    // Not found errors
    if (this.isNotFoundError(error, message, code)) {
      return {
        category: 'notFound',
        code: 'NOT_FOUND',
        message: ERROR_MESSAGES.POST_NOT_FOUND,
        severity: 'error',
        canRetry: false,
        retryDelay: null
      };
    }

    // Invalid target errors
    if (this.isInvalidTargetError(error, message)) {
      return {
        category: 'invalidTarget',
        code: 'INVALID_TARGET',
        message: ERROR_MESSAGES.INVALID_TARGET,
        severity: 'error',
        canRetry: false,
        retryDelay: null
      };
    }

    // Validation errors
    if (this.isValidationError(error, message)) {
      return {
        category: 'validation',
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid share data',
        severity: 'error',
        canRetry: false,
        retryDelay: null
      };
    }

    // Default/unknown error
    return {
      category: 'unknown',
      code: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.SHARE_FAILED,
      severity: 'error',
      canRetry: true,
      retryDelay: 3000
    };
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(error: Error, message: string) {
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline') ||
      error?.name === 'NetworkError' ||
      (error?.name === 'TypeError' && message.includes('failed to fetch'))
    );
  }

  /**
   * Check if error is a permission error
   */
  isPermissionError(error: Error, message: string, code: string) {
    return (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('access denied') ||
      code === 'permission-denied' ||
      code === 'PERMISSION_DENIED'
    );
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(error: Error, message: string) {
    return (
      message.includes('rate limit') ||
      message.includes('too many') ||
      message.includes('quota exceeded') ||
      message.includes('try again')
    );
  }

  /**
   * Check if error is a not found error
   */
  isNotFoundError(error: Error, message: string, code: string) {
    return (
      message.includes('not found') ||
      message.includes('does not exist') ||
      message.includes('no longer exists') ||
      code === 'not-found' ||
      code === 'NOT_FOUND'
    );
  }

  /**
   * Check if error is an invalid target error
   */
  isInvalidTargetError(error: Error, message: string) {
    return (
      message.includes('invalid target') ||
      message.includes('invalid friend') ||
      message.includes('invalid group') ||
      message.includes('no valid')
    );
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(error: Error, message: string) {
    return (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('required') ||
      message.includes('must be')
    );
  }

  /**
   * Extract retry delay from error message
   */
  extractRetryDelay(message: string) {
    const match = message.match(/(\d+)\s*(second|minute|min|sec)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      if (unit.startsWith('min')) {
        return value * 60 * 1000;
      }
      return value * 1000;
    }
    return 5000; // Default 5 seconds
  }

  /**
   * Add error to history
   */
  addToHistory(errorEntry: any) {
    this.errorHistory.unshift(errorEntry);

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(filters: ErrorFilterOptions = {}) {
    let history = [...this.errorHistory];

    if (filters.category) {
      history = history.filter(entry => entry.errorInfo.category === filters.category);
    }

    if (filters.shareType) {
      history = history.filter(entry => entry.context.shareType === filters.shareType);
    }

    if (filters.limit) {
      history = history.slice(0, filters.limit);
    }

    return history;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {},
      byShareType: {},
      recentErrors: this.errorHistory.slice(0, 10)
    };

    this.errorHistory.forEach(entry => {
      const category = entry.errorInfo.category;
      const shareType = entry.context.shareType || 'unknown';

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byShareType[shareType] = (stats.byShareType[shareType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * Create retry function with exponential backoff
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Result of the operation
   */
  async retryWithBackoff(operation: () => Promise<any>, options: RetryOptions = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const errorInfo = this.categorizeError(error);

          // Don't retry if error is not retryable
          if (!errorInfo.canRetry) {
            throw error;
          }

          // Use error-specific delay if available
          const retryDelay = errorInfo.retryDelay || delay;

          if (onRetry) {
            onRetry(attempt + 1, retryDelay, error);
          }

          await new Promise(resolve => setTimeout(resolve, retryDelay));

          // Exponential backoff
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Wrap a share operation with error handling
   * @param {Function} operation - The share operation
   * @param {Object} context - Share context
   * @returns {Promise} Result with error handling
   */
  async wrapShareOperation(operation: () => Promise<any>, context: ShareErrorContext = {}) {
    try {
      const result = await operation();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this.handleShareError(error, context);
    }
  }
}

// Create singleton instance
const shareErrorHandler = new ShareErrorHandler();

export default shareErrorHandler;

// Export utility functions
export const handleShareError = (error: Error, context: ShareErrorContext) =>
  shareErrorHandler.handleShareError(error, context);

export const retryShareOperation = (operation: () => Promise<any>, options: RetryOptions) =>
  shareErrorHandler.retryWithBackoff(operation, options);

export const wrapShareOperation = (operation: () => Promise<any>, context: ShareErrorContext) =>
  shareErrorHandler.wrapShareOperation(operation, context);
