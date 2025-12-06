import Logger from '../utils/Logger.ts';

/**
 * Context object for additional error metadata
 */
export interface ErrorContext {
    [key: string]: unknown;
}

/**
 * Options for creating an ApplicationError
 */
export interface ErrorOptions {
    /** Unique error code for programmatic handling */
    code: string;
    
    /** User-friendly message suitable for display */
    userMessage?: string;
    
    /** Additional context metadata */
    context?: ErrorContext;
    
    /** Original error that caused this error */
    cause?: Error;
    
    /** Log level for automatic logging */
    logLevel?: 'error' | 'warn' | 'info';
    
    /** Whether to automatically log this error */
    autoLog?: boolean;
    
    /** Whether to track this error in metrics */
    trackMetrics?: boolean;
}

/**
 * Base application error class
 * 
 * All custom errors in the application extend this class. Provides:
 * - Unique error codes for programmatic handling
 * - Rich contextual metadata
 * - User-friendly and technical messages
 * - Automatic logging integration
 * - JSON serialization
 * - Stack trace preservation
 * 
 * @example
 * throw new ApplicationError('Failed to load data', {
 *   code: 'DL_LOAD_FAILED',
 *   userMessage: 'Unable to load the file. Please check the file exists.',
 *   context: { filename: 'data.xlsx', year: '2024' },
 *   cause: originalError
 * });
 * 
 * @example
 * try {
 *   // ... operation
 * } catch (error) {
 *   if (error instanceof ApplicationError) {
 *     console.log('Error code:', error.code);
 *     console.log('User message:', error.getUserMessage());
 *     console.log('Context:', error.context);
 *   }
 * }
 */
export class ApplicationError extends Error {
    /** Unique error code for programmatic handling */
    readonly code: string;
    
    /** User-friendly error message */
    readonly userMessage: string;
    
    /** Additional context metadata (frozen/immutable) */
    readonly context: Readonly<ErrorContext>;
    
    /** Original error that caused this error */
    override readonly cause?: Error;
    
    /** Timestamp when error was created */
    readonly timestamp: Date;
    
    /**
     * Create a new ApplicationError
     * 
     * @param message - Technical error message for developers
     * @param options - Error options including code, userMessage, context, etc.
     */
    constructor(message: string, options: ErrorOptions) {
        super(message);
        
        // Set error name to class name
        this.name = this.constructor.name;
        
        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        
        // Set properties
        this.code = options.code;
        this.userMessage = options.userMessage || message;
        this.context = Object.freeze({ ...options.context });
        this.cause = options.cause;
        this.timestamp = new Date();
        
        // Automatic logging if enabled (default: true)
        const autoLog = options.autoLog !== false;
        if (autoLog) {
            const logLevel = options.logLevel || 'error';
            this._logError(logLevel);
        }
        
        // Track in metrics if enabled (default: true)
        const trackMetrics = options.trackMetrics !== false;
        if (trackMetrics) {
            // Use dynamic import to avoid circular dependency
            import('./ErrorMetrics.ts').then(({ ErrorMetrics }) => {
                ErrorMetrics.track(this);
            }).catch(() => {
                // Silently fail if metrics tracking fails
            });
        }
    }
    
    /**
     * Get user-friendly error message
     * 
     * This message is safe to display to end users and should not contain
     * sensitive information like file paths, stack traces, or internal details.
     * 
     * @returns User-friendly error message
     * 
     * @example
     * const error = new ApplicationError('File read failed', {
     *   code: 'DL_FILE_READ',
     *   userMessage: 'Unable to read the file. Please check file permissions.'
     * });
     * console.log(error.getUserMessage()); // "Unable to read the file..."
     */
    getUserMessage(): string {
        return this.userMessage;
    }
    
    /**
     * Get technical error message
     * 
     * This message includes detailed technical information for developers
     * and logging. It includes the error code, message, and context.
     * 
     * @returns Technical error message with details
     * 
     * @example
     * const error = new ApplicationError('File read failed', {
     *   code: 'DL_FILE_READ',
     *   context: { filename: 'data.xlsx' }
     * });
     * console.log(error.getTechnicalMessage());
     * // "[DL_FILE_READ] File read failed | Context: {filename: 'data.xlsx'}"
     */
    getTechnicalMessage(): string {
        const parts = [`[${this.code}] ${this.message}`];
        
        if (Object.keys(this.context).length > 0) {
            parts.push(`Context: ${JSON.stringify(this.context)}`);
        }
        
        if (this.cause) {
            parts.push(`Cause: ${this.cause.message}`);
        }
        
        return parts.join(' | ');
    }
    
    /**
     * Serialize error to JSON
     * 
     * Converts the error to a plain object suitable for JSON serialization.
     * Useful for logging, API responses, or error reporting.
     * 
     * @returns Plain object representation of the error
     * 
     * @example
     * const error = new ApplicationError('Failed', { code: 'APP_FAILED' });
     * const json = error.toJSON();
     * console.log(JSON.stringify(json, null, 2));
     */
    toJSON(): object {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            cause: this.cause ? {
                name: this.cause.name,
                message: this.cause.message,
            } : undefined,
            stack: this.stack,
        };
    }
    
    /**
     * Convert error to string
     * 
     * @returns String representation of the error
     */
    override toString(): string {
        return this.getTechnicalMessage();
    }
    
    /**
     * Log the error using the Logger utility
     * 
     * @private
     * @param level - Log level to use
     */
    private _logError(level: 'error' | 'warn' | 'info'): void {
        const logMessage = this.getTechnicalMessage();
        
        switch (level) {
            case 'error':
                Logger.error(logMessage, this);
                break;
            case 'warn':
                Logger.warn(logMessage, this);
                break;
            case 'info':
                Logger.info(logMessage, this);
                break;
        }
    }
}

export default ApplicationError;
