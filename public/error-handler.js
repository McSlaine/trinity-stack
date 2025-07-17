/**
 * Enhanced Frontend Error Handler
 * Provides user-friendly error notifications, automatic retry, and recovery mechanisms
 */
class ErrorHandler {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseRetryDelay = 1000;
        this.notifications = [];
        
        this.initializeNotificationContainer();
        this.setupGlobalErrorHandlers();
    }

    /**
     * Initialize the notification container for error display
     */
    initializeNotificationContainer() {
        if (document.getElementById('error-notifications')) {
            return; // Already exists
        }

        const container = document.createElement('div');
        container.id = 'error-notifications';
        container.className = 'error-notifications-container';
        container.innerHTML = `
            <style>
                .error-notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                }

                .error-notification {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    margin-bottom: 12px;
                    overflow: hidden;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    pointer-events: auto;
                    border-left: 4px solid #dc2626;
                }

                .error-notification.show {
                    transform: translateX(0);
                }

                .error-notification.success {
                    border-left-color: #059669;
                }

                .error-notification.warning {
                    border-left-color: #d97706;
                }

                .error-notification.info {
                    border-left-color: #2563eb;
                }

                .notification-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px 0 20px;
                }

                .notification-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }

                .notification-icon.error { background: #dc2626; }
                .notification-icon.success { background: #059669; }
                .notification-icon.warning { background: #d97706; }
                .notification-icon.info { background: #2563eb; }

                .notification-title {
                    font-weight: 600;
                    color: #1e293b;
                    flex: 1;
                    margin-left: 12px;
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notification-close:hover {
                    color: #1e293b;
                }

                .notification-content {
                    padding: 8px 20px 16px 20px;
                }

                .notification-message {
                    color: #64748b;
                    line-height: 1.5;
                    font-size: 14px;
                    margin-bottom: 12px;
                }

                .notification-actions {
                    display: flex;
                    gap: 8px;
                }

                .notification-btn {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: none;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .notification-btn.primary {
                    background: #2563eb;
                    color: white;
                }

                .notification-btn.primary:hover {
                    background: #1d4ed8;
                }

                .notification-btn.secondary {
                    background: #f1f5f9;
                    color: #64748b;
                }

                .notification-btn.secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }

                .retry-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                    padding: 8px 12px;
                    background: #f8fafc;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #64748b;
                }

                .retry-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #e2e8f0;
                    border-top: 2px solid #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .error-notifications-container {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                        max-width: none;
                    }
                }
            </style>
        `;

        document.body.appendChild(container);
    }

    /**
     * Setup global error handlers for unhandled errors
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'Unexpected error occurred');
            event.preventDefault();
        });

        // Handle general JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            this.handleError(event.error, 'Application error');
        });
    }

    /**
     * Main error handling method
     */
    async handleError(error, context = '', options = {}) {
        const {
            showNotification = true,
            allowRetry = true,
            silent = false
        } = options;

        console.error(`Error in ${context}:`, error);

        // Parse error from various sources
        const parsedError = this.parseError(error);
        
        if (!silent && showNotification) {
            this.showNotification(parsedError, context, allowRetry);
        }

        return parsedError;
    }

    /**
     * Parse error from different sources and formats
     */
    parseError(error) {
        // If it's already a parsed error object
        if (error && error.userMessage && error.statusCode) {
            return error;
        }

        // Parse fetch response errors
        if (error && error.response) {
            return {
                message: error.response.data?.error?.message || error.message,
                userMessage: error.response.data?.error?.message || 'An error occurred',
                statusCode: error.response.status || 500,
                recoverable: error.response.data?.error?.recoverable || false,
                retryAfter: error.response.data?.error?.retryAfter,
                type: error.response.data?.error?.type || 'NetworkError'
            };
        }

        // Parse network/fetch errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                message: 'Network connection failed',
                userMessage: 'Unable to connect to the server. Please check your internet connection.',
                statusCode: 0,
                recoverable: true,
                retryAfter: 5000,
                type: 'NetworkError'
            };
        }

        // Parse standard Error objects
        if (error instanceof Error) {
            return {
                message: error.message,
                userMessage: this.getDefaultUserMessage(error.message),
                statusCode: error.statusCode || 500,
                recoverable: true,
                type: error.constructor.name
            };
        }

        // Parse string errors
        if (typeof error === 'string') {
            return {
                message: error,
                userMessage: error,
                statusCode: 500,
                recoverable: true,
                type: 'GeneralError'
            };
        }

        // Default error
        return {
            message: 'Unknown error',
            userMessage: 'An unexpected error occurred. Please try again.',
            statusCode: 500,
            recoverable: true,
            type: 'UnknownError'
        };
    }

    /**
     * Get user-friendly message for technical errors
     */
    getDefaultUserMessage(technicalMessage) {
        const message = technicalMessage.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Connection problem. Please check your internet and try again.';
        }
        
        if (message.includes('timeout')) {
            return 'The request took too long. Please try again.';
        }
        
        if (message.includes('unauthorized') || message.includes('401')) {
            return 'Please sign in to continue.';
        }
        
        if (message.includes('forbidden') || message.includes('403')) {
            return 'You don\'t have permission to access this resource.';
        }
        
        if (message.includes('not found') || message.includes('404')) {
            return 'The requested resource was not found.';
        }
        
        if (message.includes('rate limit') || message.includes('429')) {
            return 'Too many requests. Please wait before trying again.';
        }
        
        return 'Something went wrong. Please try again.';
    }

    /**
     * Show notification to user
     */
    showNotification(error, context = '', allowRetry = true) {
        const container = document.getElementById('error-notifications');
        if (!container) return;

        const notification = document.createElement('div');
        const notificationId = Date.now();
        notification.className = 'error-notification';
        notification.id = `notification-${notificationId}`;

        const type = this.getNotificationType(error.statusCode);
        const icon = this.getNotificationIcon(type);
        const title = this.getNotificationTitle(error, context);

        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon ${type}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-title">${title}</div>
                <button class="notification-close" onclick="errorHandler.closeNotification('${notificationId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-content">
                <div class="notification-message">${error.userMessage}</div>
                <div class="notification-actions">
                    ${allowRetry && error.recoverable ? `
                        <button class="notification-btn primary" onclick="errorHandler.retryLastAction('${notificationId}')">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    ` : ''}
                    <button class="notification-btn secondary" onclick="errorHandler.closeNotification('${notificationId}')">
                        Dismiss
                    </button>
                </div>
                <div id="retry-indicator-${notificationId}"></div>
            </div>
        `;

        container.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-dismiss after delay (except for critical errors)
        if (type !== 'error') {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, 5000);
        }

        this.notifications.push({
            id: notificationId,
            error: error,
            context: context,
            element: notification
        });
    }

    /**
     * Determine notification type based on status code
     */
    getNotificationType(statusCode) {
        if (statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warning';
        if (statusCode >= 200) return 'success';
        return 'info';
    }

    /**
     * Get icon for notification type
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'error': return 'fa-exclamation-triangle';
            case 'warning': return 'fa-exclamation-circle';
            case 'success': return 'fa-check';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }

    /**
     * Get notification title
     */
    getNotificationTitle(error, context) {
        if (context) {
            return `${context} - ${error.type || 'Error'}`;
        }
        return error.type || 'Error';
    }

    /**
     * Close notification
     */
    closeNotification(notificationId) {
        const notification = document.getElementById(`notification-${notificationId}`);
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    /**
     * Retry the last action with exponential backoff
     */
    async retryLastAction(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;

        const key = `${notification.context}_retry`;
        const attempts = this.retryAttempts.get(key) || 0;

        if (attempts >= this.maxRetries) {
            this.showRetryExhausted(notificationId);
            return;
        }

        this.retryAttempts.set(key, attempts + 1);
        this.showRetryInProgress(notificationId, attempts + 1);

        const delay = this.calculateRetryDelay(notification.error, attempts + 1);
        
        try {
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Trigger a retry event that components can listen to
            window.dispatchEvent(new CustomEvent('errorRetry', {
                detail: {
                    context: notification.context,
                    error: notification.error,
                    attempt: attempts + 1
                }
            }));

            this.closeNotification(notificationId);
            this.retryAttempts.delete(key);

        } catch (retryError) {
            this.handleError(retryError, `Retry failed for ${notification.context}`, {
                allowRetry: attempts + 1 < this.maxRetries
            });
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(error, attempt) {
        if (error.retryAfter) {
            return error.retryAfter;
        }

        return Math.min(this.baseRetryDelay * Math.pow(2, attempt - 1), 30000);
    }

    /**
     * Show retry in progress indicator
     */
    showRetryInProgress(notificationId, attempt) {
        const indicator = document.getElementById(`retry-indicator-${notificationId}`);
        if (indicator) {
            indicator.innerHTML = `
                <div class="retry-indicator">
                    <div class="retry-spinner"></div>
                    <span>Retrying... (Attempt ${attempt}/${this.maxRetries})</span>
                </div>
            `;
        }
    }

    /**
     * Show retry exhausted message
     */
    showRetryExhausted(notificationId) {
        const indicator = document.getElementById(`retry-indicator-${notificationId}`);
        if (indicator) {
            indicator.innerHTML = `
                <div class="retry-indicator">
                    <i class="fas fa-times-circle" style="color: #dc2626;"></i>
                    <span>Maximum retry attempts reached. Please try again later.</span>
                </div>
            `;
        }
    }

    /**
     * Enhanced fetch wrapper with automatic error handling and retry
     */
    async fetch(url, options = {}) {
        const {
            retries = 3,
            timeout = 30000,
            context = url,
            ...fetchOptions
        } = options;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Add timeout to the request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw {
                        response: {
                            status: response.status,
                            data: errorData
                        }
                    };
                }

                return response;

            } catch (error) {
                if (attempt === retries) {
                    throw await this.handleError(error, context);
                }

                // Wait before retry
                await new Promise(resolve => 
                    setTimeout(resolve, this.calculateRetryDelay({ statusCode: 500 }, attempt))
                );
            }
        }
    }

    /**
     * Show success notification
     */
    showSuccess(message, title = 'Success') {
        this.showNotification({
            userMessage: message,
            statusCode: 200,
            type: title,
            recoverable: false
        }, '', false);
    }

    /**
     * Show info notification
     */
    showInfo(message, title = 'Info') {
        this.showNotification({
            userMessage: message,
            statusCode: 200,
            type: title,
            recoverable: false
        }, '', false);
    }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}

// Make available globally
window.errorHandler = errorHandler; 