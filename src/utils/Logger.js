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
     * @param {...any} args - Arguments to log
     */
    static debug(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    /**
     * Log informational messages (always shown)
     * @param {...any} args - Arguments to log
     */
    static info(...args) {
        console.log(...args);
    }

    /**
     * Log error messages (always shown)
     * @param {...any} args - Arguments to log
     */
    static error(...args) {
        console.error(...args);
    }

    /**
     * Log warning messages (always shown)
     * @param {...any} args - Arguments to log
     */
    static warn(...args) {
        console.warn(...args);
    }
}

export default Logger;
