/**
 * Logger - Centralized logging utility using loglevel
 *
 * Provides configurable logging with persistent settings and environment-based defaults.
 * Log levels: TRACE < DEBUG < INFO < WARN < ERROR < SILENT
 *
 * Features:
 * - Environment-based defaults (DEBUG on localhost, WARN in production)
 * - Runtime log level changes via Logger.setLevel()
 * - Persistent settings in localStorage
 * - Minimal overhead (~1KB)
 *
 * @example
 * // Basic usage
 * Logger.trace('Very detailed debugging');
 * Logger.debug('Debugging info', { data });
 * Logger.info('Important message');
 * Logger.warn('Warning message');
 * Logger.error('Error occurred', error);
 *
 * @example
 * // Change log level at runtime (in browser console)
 * Logger.setLevel('debug');  // Show debug and above
 * Logger.setLevel('warn');   // Show only warnings and errors
 * Logger.setLevel('silent'); // Disable all logging
 *
 * @example
 * // Get current level
 * const level = Logger.getLevel();
 * console.log('Current log level:', level);
 */

// Access loglevel from global scope (loaded via CDN in index.html)
declare global {
    interface Window {
        log: any;
    }
}

const log = (typeof window !== 'undefined' && window.log) || (globalThis as any).log;

// Detect environment
const isDevelopment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Set default log level based on environment
const defaultLevel = isDevelopment ? 'debug' : 'warn';
log.setDefaultLevel(defaultLevel as any);

// Log initialization
if (isDevelopment) {
    log.info(`Logger initialized with level: ${defaultLevel} (development mode)`);
}

/**
 * Logger class - Static wrapper around loglevel
 */
export class Logger {
    /**
     * Set the logging level
     *
     * Changes take effect immediately and persist in localStorage.
     *
     * @param level - Log level (trace, debug, info, warn, error, silent)
     *
     * @example
     * Logger.setLevel('debug');  // Show debug, info, warn, error
     * Logger.setLevel('warn');   // Show only warn and error
     * Logger.setLevel('silent'); // Disable all logging
     */
    static setLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'): void {
        try {
            log.setLevel(level as any);
            log.info(`Log level changed to: ${level}`);
        } catch (error) {
            log.warn(`Failed to set log level to '${level}':`, error);
        }
    }

    /**
     * Get the current logging level
     *
     * @returns Current log level as number (0=TRACE, 1=DEBUG, 2=INFO, 3=WARN, 4=ERROR, 5=SILENT)
     *
     * @example
     * const level = Logger.getLevel();
     * console.log('Current level:', level);
     */
    static getLevel(): number {
        return log.getLevel();
    }

    /**
     * Get the current logging level name
     *
     * @returns Current log level as string
     *
     * @example
     * const levelName = Logger.getLevelName();
     * console.log('Current level:', levelName); // 'DEBUG', 'INFO', etc.
     */
    static getLevelName(): string {
        const level = log.getLevel();
        const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'];
        return levels[level] || 'UNKNOWN';
    }

    /**
     * Log trace messages (most verbose)
     *
     * Use for very detailed debugging information.
     * Only visible when log level is set to TRACE.
     *
     * @param args - Arguments to log
     *
     * @example
     * Logger.trace('Function called', { params });
     */
    static trace(...args: unknown[]): void {
        log.trace(...args);
    }

    /**
     * Log debug messages
     *
     * Use for debugging information during development.
     * Visible when log level is DEBUG or TRACE.
     *
     * @param args - Arguments to log
     *
     * @example
     * Logger.debug('Processing data', { count: 100 });
     */
    static debug(...args: unknown[]): void {
        log.debug(...args);
    }

    /**
     * Log informational messages
     *
     * Use for important informational messages.
     * Visible when log level is INFO, DEBUG, or TRACE.
     *
     * @param args - Arguments to log
     *
     * @example
     * Logger.info('User logged in', { userId: 123 });
     */
    static info(...args: unknown[]): void {
        log.info(...args);
    }

    /**
     * Log warning messages
     *
     * Use for warning messages that don't prevent operation.
     * Visible when log level is WARN, INFO, DEBUG, or TRACE.
     *
     * @param args - Arguments to log
     *
     * @example
     * Logger.warn('Deprecated function used', { function: 'oldMethod' });
     */
    static warn(...args: unknown[]): void {
        log.warn(...args);
    }

    /**
     * Log error messages
     *
     * Use for error messages and exceptions.
     * Visible at all log levels except SILENT.
     *
     * @param args - Arguments to log
     *
     * @example
     * Logger.error('Failed to load data', error);
     */
    static error(...args: unknown[]): void {
        log.error(...args);
    }
    
    /**
     * Log an error with full details
     * 
     * Extracts and logs all relevant information from an error, including:
     * - Error message and code (for ApplicationError)
     * - Context metadata
     * - Stack trace
     * - Cause chain
     * 
     * @param error - Error to log (ApplicationError or standard Error)
     * @param additionalContext - Optional additional context to include
     * 
     * @example
     * try {
     *   await loadData();
     * } catch (error) {
     *   Logger.logError(error, { operation: 'loadData' });
     * }
     * 
     * @example
     * // Works with any error type
     * Logger.logError(new Error('Something failed'));
     * Logger.logError(new FileNotFoundError('data.xlsx'));
     */
    static logError(error: Error | unknown, additionalContext?: Record<string, unknown>): void {
        // Handle non-Error values
        if (!(error instanceof Error)) {
            log.error('Non-error value thrown:', error, additionalContext);
            return;
        }
        
        // Check if it's an ApplicationError with rich context
        const isAppError = error.constructor.name !== 'Error' && 
                          'code' in error && 
                          'context' in error;
        
        if (isAppError) {
            const appError = error as any;
            
            // Format error details
            const details: Record<string, unknown> = {
                code: appError.code,
                message: error.message,
                userMessage: appError.userMessage,
                context: appError.context,
                timestamp: appError.timestamp,
            };
            
            // Add additional context if provided
            if (additionalContext) {
                details.additionalContext = additionalContext;
            }
            
            // Log with formatted details
            log.error(`[${appError.code}] ${error.message}`, details);
            
            // Log cause chain if present
            if (appError.cause) {
                log.error('  Caused by:', appError.cause);
            }
            
            // Log stack trace in debug mode
            if (this.getLevel() <= 1 && error.stack) { // DEBUG or TRACE
                log.debug('  Stack trace:', error.stack);
            }
        } else {
            // Standard Error - log with basic details
            const details: Record<string, unknown> = {
                name: error.name,
                message: error.message,
            };
            
            if (additionalContext) {
                details.context = additionalContext;
            }
            
            log.error(`${error.name}: ${error.message}`, details);
            
            // Log stack trace in debug mode
            if (this.getLevel() <= 1 && error.stack) { // DEBUG or TRACE
                log.debug('  Stack trace:', error.stack);
            }
        }
    }
}

export default Logger;
