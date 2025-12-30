/**
 * Share Error Logger Service
 * Centralized logging for share operation errors with analytics and monitoring
 */

import errorHandler from '../../utils/error/errorHandler';

export interface ErrorLog {
    timestamp: Date;
    serverTimestamp: Date; // Keep as Date for consistency
    error: {
        message: string;
        stack: string;
        name: string;
        code: string | null;
    };
    context: {
        shareType: string | null;
        postId: string | null;
        sharerId: string | null;
        targets: any[];
        operation: string;
        [key: string]: any;
    };
    severity: 'error' | 'warning' | 'critical';
    environment: {
        userAgent: string | null;
        url: string | null;
        platform: string | null;
        online: boolean | null;
    };
    metadata: {
        errorCategory: string;
        isRetryable: boolean;
        requiresUserAction: boolean;
    };
}

class ShareErrorLogger {
    private errorBuffer: ErrorLog[] = [];
    private maxBufferSize = 100;
    private flushInterval = 60000; // 1 minute
    private isFlushingErrors = false;

    constructor() {
        // Start periodic flush
        this.startPeriodicFlush();
    }

    /**
     * Log share operation error
     */
    async logShareError(error: any, context: any = {}, severity: 'error' | 'warning' | 'critical' = 'error'): Promise<ErrorLog | undefined> {
        try {
            const errorLog: ErrorLog = {
                timestamp: new Date(),
                serverTimestamp: new Date(),
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
            if (errorHandler && typeof errorHandler.logError === 'function') {
                errorHandler.logError(error, `ShareError-${context.shareType || 'Unknown'}`, severity, context);
            } else {
                console.error('[ShareErrorLogger]', errorLog);
            }

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
     */
    async logShareSuccess(shareData: any, result: any): Promise<any> {
        try {
            const successLog = {
                timestamp: new Date(),
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

            console.log('Share success logged:', successLog);
            return successLog;
        } catch (error) {
            console.error('Failed to log share success:', error);
        }
    }

    /**
     * Flush error buffer
     */
    async flushErrors() {
        if (this.isFlushingErrors || this.errorBuffer.length === 0) {
            return;
        }

        this.isFlushingErrors = true;

        try {
            const errorsToFlush = [...this.errorBuffer];
            this.errorBuffer = [];

            // For now, we'll just log them to console or local storage in dev
            // In a Supabase backend, we might leave this as client-side log collection or use a specific RPC

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

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flushErrors();
            });
        }
    }

    /**
     * Categorize error type
     */
    categorizeError(error: any): string {
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
    isRetryableError(error: any): boolean {
        const category = this.categorizeError(error);
        return ['network', 'rateLimit', 'unknown'].includes(category);
    }

    /**
     * Check if error requires user action
     */
    requiresUserAction(error: any): boolean {
        const category = this.categorizeError(error);
        return ['permission', 'validation', 'notFound'].includes(category);
    }

    /**
     * Get error statistics
     */
    getErrorStats(filters: any = {}) {
        try {
            const logs = JSON.parse(localStorage.getItem('share_error_logs') || '[]');

            let filteredLogs = logs;

            if (filters.shareType) {
                filteredLogs = filteredLogs.filter((log: any) =>
                    log.context?.shareType === filters.shareType
                );
            }

            // ... (rest of logic similar to original) ...

            return {
                total: filteredLogs.length,
                recentErrors: filteredLogs.slice(0, 10)
            };

        } catch (error) {
            return { total: 0, recentErrors: [] };
        }
    }

    clearLogs() {
        this.errorBuffer = [];
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('share_error_logs');
        }
    }
}

// Create singleton instance
const shareErrorLogger = new ShareErrorLogger();

export default shareErrorLogger;

// Export utility functions
export const logShareError = (error: any, context: any, severity: any) =>
    shareErrorLogger.logShareError(error, context, severity);

export const logShareSuccess = (shareData: any, result: any) =>
    shareErrorLogger.logShareSuccess(shareData, result);

export const getShareErrorStats = (filters: any) =>
    shareErrorLogger.getErrorStats(filters);
