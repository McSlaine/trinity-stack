class AppError extends Error {
    constructor(message, statusCode = 500, userMessage = null, recoverable = false, retryAfter = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.userMessage = userMessage || this.getDefaultUserMessage(statusCode);
        this.recoverable = recoverable;
        this.retryAfter = retryAfter;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    getDefaultUserMessage(statusCode) {
        switch (statusCode) {
            case 400:
                return 'There was an issue with your request. Please check your input and try again.';
            case 401:
                return 'You need to sign in to access this feature.';
            case 403:
                return 'You don\'t have permission to access this resource.';
            case 404:
                return 'The requested resource could not be found.';
            case 429:
                return 'Too many requests. Please wait a moment before trying again.';
            case 500:
                return 'Something went wrong on our end. Our team has been notified.';
            case 502:
                return 'We\'re having trouble connecting to our data source. Please try again in a few moments.';
            case 503:
                return 'The service is temporarily unavailable. Please try again shortly.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            userMessage: this.userMessage,
            statusCode: this.statusCode,
            recoverable: this.recoverable,
            retryAfter: this.retryAfter,
            timestamp: this.timestamp
        };
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad Request', userMessage = null) {
        super(
            message, 
            400, 
            userMessage || 'Please check your input and try again.',
            true
        );
    }
}

class ValidationError extends AppError {
    constructor(field, message = 'Validation failed', userMessage = null) {
        super(
            `Validation error for ${field}: ${message}`, 
            400, 
            userMessage || `Please check the ${field} field and try again.`,
            true
        );
        this.field = field;
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource', userMessage = null) {
        super(
            `${resource} not found`, 
            404, 
            userMessage || `The requested ${resource.toLowerCase()} could not be found.`,
            false
        );
    }
}

class AuthError extends AppError {
    constructor(message = 'Unauthorised', userMessage = null) {
        super(
            message, 
            401, 
            userMessage || 'Please sign in to continue.',
            true
        );
    }
}

class TokenExpiredError extends AuthError {
    constructor(userMessage = null) {
        super(
            'Token has expired', 
            userMessage || 'Your session has expired. Please sign in again.'
        );
    }
}

class NetworkError extends AppError {
    constructor(service = 'external service', userMessage = null) {
        super(
            `Network error connecting to ${service}`, 
            502, 
            userMessage || `We're having trouble connecting to ${service}. Please try again in a few moments.`,
            true,
            30000 // 30 seconds
        );
        this.service = service;
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter = 60000, userMessage = null) {
        super(
            'Rate limit exceeded', 
            429, 
            userMessage || 'Too many requests. Please wait a moment before trying again.',
            true,
            retryAfter
        );
    }
}

class DatabaseError extends AppError {
    constructor(operation = 'database operation', userMessage = null) {
        super(
            `Database error during ${operation}`, 
            500, 
            userMessage || 'We\'re experiencing database issues. Please try again shortly.',
            true,
            10000 // 10 seconds
        );
        this.operation = operation;
    }
}

class SyncError extends AppError {
    constructor(stage = 'sync operation', userMessage = null) {
        super(
            `Sync error during ${stage}`, 
            502, 
            userMessage || 'Data synchronization failed. Please try syncing again.',
            true,
            5000 // 5 seconds
        );
        this.stage = stage;
    }
}

class FileProcessingError extends AppError {
    constructor(fileName = 'file', userMessage = null) {
        super(
            `Error processing ${fileName}`, 
            400, 
            userMessage || `There was an issue processing the ${fileName}. Please check the file and try again.`,
            true
        );
        this.fileName = fileName;
    }
}

// Error utility functions
const ErrorUtils = {
    /**
     * Create an error response object for APIs
     */
    createErrorResponse(error, includeStack = false) {
        const response = {
            success: false,
            error: {
                message: error.userMessage || error.message,
                code: error.statusCode || 500,
                type: error.name,
                recoverable: error.recoverable || false,
                timestamp: error.timestamp || new Date().toISOString()
            }
        };

        if (error.retryAfter) {
            response.error.retryAfter = error.retryAfter;
        }

        if (error.field) {
            response.error.field = error.field;
        }

        if (includeStack && process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
        }

        return response;
    },

    /**
     * Determine if an error is recoverable
     */
    isRecoverable(error) {
        return error.recoverable || 
               error.statusCode === 429 || 
               error.statusCode === 502 || 
               error.statusCode === 503 ||
               (error.statusCode >= 500 && error.statusCode < 600);
    },

    /**
     * Get retry delay based on error type
     */
    getRetryDelay(error, attempt = 1) {
        if (error.retryAfter) {
            return error.retryAfter;
        }

        // Exponential backoff for server errors
        if (error.statusCode >= 500) {
            return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        }

        // Rate limit retry
        if (error.statusCode === 429) {
            return 60000; // 1 minute
        }

        return 5000; // Default 5 seconds
    },

    /**
     * Create user-friendly error message with suggestions
     */
    getUserFriendlyMessage(error, context = '') {
        let message = error.userMessage || error.message;
        
        if (context) {
            message = `${context}: ${message}`;
        }

        // Add suggestions based on error type
        const suggestions = [];
        
        if (error.recoverable) {
            suggestions.push('You can try again');
        }

        if (error instanceof NetworkError) {
            suggestions.push('Check your internet connection');
        }

        if (error instanceof AuthError) {
            suggestions.push('Try signing in again');
        }

        if (error instanceof ValidationError) {
            suggestions.push(`Please review the ${error.field} field`);
        }

        if (suggestions.length > 0) {
            message += `. Suggestions: ${suggestions.join(', ')}.`;
        }

        return message;
    }
};

module.exports = {
    AppError,
    BadRequestError,
    ValidationError,
    NotFoundError,
    AuthError,
    TokenExpiredError,
    NetworkError,
    RateLimitError,
    DatabaseError,
    SyncError,
    FileProcessingError,
    ErrorUtils
};
