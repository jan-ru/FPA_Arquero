/**
 * Logger - Simple logging utility with debug mode control
 *
 * Use Logger.debug() for development/debugging logs that should not appear in production
 * Use Logger.info() for important informational messages
 * Use Logger.error() for errors
 */

export class Logger {
    // Set to true during development, false for production
    static DEBUG = false;

    /**
     * Log debug messages (only when DEBUG is true)
     * @param args - Arguments to log
     */
    static debug(...args: unknown[]): void {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    /**
     * Log informational messages (always shown)
     * @param args - Arguments to log
     */
    static info(...args: unknown[]): void {
        console.log(...args);
    }

    /**
     * Log error messages (always shown)
     * @param args - Arguments to log
     */
    static error(...args: unknown[]): void {
        console.error(...args);
    }

    /**
     * Log warning messages (always shown)
     * @param args - Arguments to log
     */
    static warn(...args: unknown[]): void {
        console.warn(...args);
    }
}

export default Logger;
