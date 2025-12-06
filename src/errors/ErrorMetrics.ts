/**
 * ErrorMetrics - Track and analyze error occurrences
 * 
 * Provides in-memory tracking of error occurrences for debugging and monitoring.
 * Tracks error counts by code, type, and provides statistics.
 * 
 * @example
 * import { ErrorMetrics } from './errors/index.ts';
 * 
 * // Track an error
 * ErrorMetrics.track(error);
 * 
 * // Get statistics
 * const stats = ErrorMetrics.getStats();
 * console.log('Total errors:', stats.totalErrors);
 * console.log('Error types:', stats.errorsByCode);
 * 
 * @example
 * // Get top errors
 * const topErrors = ErrorMetrics.getTopErrors(5);
 * topErrors.forEach(({ code, count }) => {
 *   console.log(`${code}: ${count} occurrences`);
 * });
 */

import type { ApplicationError } from './ApplicationError.ts';
import { getErrorCode } from './ErrorGuards.ts';

/**
 * Statistics about tracked errors
 */
export interface ErrorStats {
    /** Total number of errors tracked */
    totalErrors: number;
    
    /** Count of errors by error code */
    errorsByCode: Record<string, number>;
    
    /** Count of errors by error type/class name */
    errorsByType: Record<string, number>;
    
    /** Timestamp when tracking started */
    trackingStarted: Date;
    
    /** Timestamp of last error */
    lastError?: Date;
    
    /** Most recent error codes (up to 10) */
    recentErrors: string[];
}

/**
 * Information about a specific error code
 */
export interface ErrorCodeInfo {
    /** Error code */
    code: string;
    
    /** Number of occurrences */
    count: number;
    
    /** Percentage of total errors */
    percentage: number;
    
    /** Timestamp of first occurrence */
    firstSeen: Date;
    
    /** Timestamp of last occurrence */
    lastSeen: Date;
}

/**
 * Internal tracking data for an error code
 */
interface ErrorCodeTracking {
    count: number;
    firstSeen: Date;
    lastSeen: Date;
}

/**
 * ErrorMetrics class - Singleton for tracking error metrics
 */
class ErrorMetricsClass {
    private errorsByCode: Map<string, ErrorCodeTracking> = new Map();
    private errorsByType: Map<string, number> = new Map();
    private recentErrors: string[] = [];
    private totalErrors = 0;
    private trackingStarted: Date = new Date();
    private lastErrorTime?: Date;
    private readonly maxRecentErrors = 10;
    
    /**
     * Track an error occurrence
     * 
     * Records the error in metrics, updating counts and timestamps.
     * 
     * @param error - Error to track (ApplicationError or standard Error)
     * 
     * @example
     * try {
     *   // some operation
     * } catch (error) {
     *   ErrorMetrics.track(error);
     *   throw error;
     * }
     */
    track(error: Error | ApplicationError): void {
        this.totalErrors++;
        this.lastErrorTime = new Date();
        
        // Track by error code
        const code = getErrorCode(error) || 'UNKNOWN';
        const existing = this.errorsByCode.get(code);
        
        if (existing) {
            existing.count++;
            existing.lastSeen = this.lastErrorTime;
        } else {
            this.errorsByCode.set(code, {
                count: 1,
                firstSeen: this.lastErrorTime,
                lastSeen: this.lastErrorTime,
            });
        }
        
        // Track by error type
        const typeName = error.constructor.name;
        this.errorsByType.set(typeName, (this.errorsByType.get(typeName) || 0) + 1);
        
        // Track recent errors
        this.recentErrors.unshift(code);
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors);
        }
    }
    
    /**
     * Get overall error statistics
     * 
     * Returns comprehensive statistics about all tracked errors.
     * 
     * @returns ErrorStats object with all statistics
     * 
     * @example
     * const stats = ErrorMetrics.getStats();
     * console.log(`Total errors: ${stats.totalErrors}`);
     * console.log(`Error codes: ${Object.keys(stats.errorsByCode).length}`);
     */
    getStats(): ErrorStats {
        const errorsByCode: Record<string, number> = {};
        this.errorsByCode.forEach((tracking, code) => {
            errorsByCode[code] = tracking.count;
        });
        
        const errorsByType: Record<string, number> = {};
        this.errorsByType.forEach((count, type) => {
            errorsByType[type] = count;
        });
        
        return {
            totalErrors: this.totalErrors,
            errorsByCode,
            errorsByType,
            trackingStarted: this.trackingStarted,
            lastError: this.lastErrorTime,
            recentErrors: [...this.recentErrors],
        };
    }
    
    /**
     * Get top N most frequent errors
     * 
     * Returns the most frequently occurring errors, sorted by count.
     * 
     * @param limit - Maximum number of errors to return (default: 10)
     * @returns Array of ErrorCodeInfo objects, sorted by count descending
     * 
     * @example
     * const topErrors = ErrorMetrics.getTopErrors(5);
     * topErrors.forEach(({ code, count, percentage }) => {
     *   console.log(`${code}: ${count} (${percentage.toFixed(1)}%)`);
     * });
     */
    getTopErrors(limit = 10): ErrorCodeInfo[] {
        const errors: ErrorCodeInfo[] = [];
        
        this.errorsByCode.forEach((tracking, code) => {
            errors.push({
                code,
                count: tracking.count,
                percentage: (tracking.count / this.totalErrors) * 100,
                firstSeen: tracking.firstSeen,
                lastSeen: tracking.lastSeen,
            });
        });
        
        // Sort by count descending
        errors.sort((a, b) => b.count - a.count);
        
        return errors.slice(0, limit);
    }
    
    /**
     * Get information about a specific error code
     * 
     * Returns detailed information about a specific error code.
     * 
     * @param code - Error code to get information for
     * @returns ErrorCodeInfo object or undefined if not found
     * 
     * @example
     * const info = ErrorMetrics.getErrorInfo('DL_FILE_NOT_FOUND');
     * if (info) {
     *   console.log(`Occurred ${info.count} times`);
     *   console.log(`First seen: ${info.firstSeen}`);
     * }
     */
    getErrorInfo(code: string): ErrorCodeInfo | undefined {
        const tracking = this.errorsByCode.get(code);
        if (!tracking) {
            return undefined;
        }
        
        return {
            code,
            count: tracking.count,
            percentage: (tracking.count / this.totalErrors) * 100,
            firstSeen: tracking.firstSeen,
            lastSeen: tracking.lastSeen,
        };
    }
    
    /**
     * Get recent errors
     * 
     * Returns the most recent error codes (up to 10).
     * 
     * @returns Array of error codes, most recent first
     * 
     * @example
     * const recent = ErrorMetrics.getRecentErrors();
     * console.log('Recent errors:', recent.join(', '));
     */
    getRecentErrors(): string[] {
        return [...this.recentErrors];
    }
    
    /**
     * Reset all metrics
     * 
     * Clears all tracked error data and resets counters.
     * 
     * @example
     * // Reset metrics at the start of a test
     * ErrorMetrics.reset();
     */
    reset(): void {
        this.errorsByCode.clear();
        this.errorsByType.clear();
        this.recentErrors = [];
        this.totalErrors = 0;
        this.trackingStarted = new Date();
        this.lastErrorTime = undefined;
    }
    
    /**
     * Get count for a specific error code
     * 
     * Returns the number of times a specific error code has occurred.
     * 
     * @param code - Error code to get count for
     * @returns Number of occurrences (0 if not found)
     * 
     * @example
     * const count = ErrorMetrics.getCount('DL_FILE_NOT_FOUND');
     * console.log(`File not found errors: ${count}`);
     */
    getCount(code: string): number {
        return this.errorsByCode.get(code)?.count || 0;
    }
    
    /**
     * Check if an error code has been tracked
     * 
     * Returns true if the error code has occurred at least once.
     * 
     * @param code - Error code to check
     * @returns True if error code has been tracked
     * 
     * @example
     * if (ErrorMetrics.hasError('DL_FILE_NOT_FOUND')) {
     *   console.log('File not found errors have occurred');
     * }
     */
    hasError(code: string): boolean {
        return this.errorsByCode.has(code);
    }
    
    /**
     * Get total error count
     * 
     * Returns the total number of errors tracked.
     * 
     * @returns Total error count
     * 
     * @example
     * console.log(`Total errors: ${ErrorMetrics.getTotalCount()}`);
     */
    getTotalCount(): number {
        return this.totalErrors;
    }
    
    /**
     * Export metrics as JSON
     * 
     * Returns all metrics data as a JSON-serializable object.
     * Useful for logging or sending to monitoring services.
     * 
     * @returns JSON-serializable metrics object
     * 
     * @example
     * const metricsJson = ErrorMetrics.toJSON();
     * console.log(JSON.stringify(metricsJson, null, 2));
     */
    toJSON(): object {
        const stats = this.getStats();
        const topErrors = this.getTopErrors();
        
        return {
            summary: {
                totalErrors: stats.totalErrors,
                uniqueErrorCodes: Object.keys(stats.errorsByCode).length,
                uniqueErrorTypes: Object.keys(stats.errorsByType).length,
                trackingStarted: stats.trackingStarted.toISOString(),
                lastError: stats.lastError?.toISOString(),
            },
            errorsByCode: stats.errorsByCode,
            errorsByType: stats.errorsByType,
            topErrors: topErrors.map(e => ({
                code: e.code,
                count: e.count,
                percentage: Math.round(e.percentage * 10) / 10,
                firstSeen: e.firstSeen.toISOString(),
                lastSeen: e.lastSeen.toISOString(),
            })),
            recentErrors: stats.recentErrors,
        };
    }
    
    /**
     * Format metrics as a readable string
     * 
     * Returns a human-readable summary of error metrics.
     * 
     * @returns Formatted string with metrics summary
     * 
     * @example
     * console.log(ErrorMetrics.toString());
     */
    toString(): string {
        const stats = this.getStats();
        const topErrors = this.getTopErrors(5);
        
        let output = `Error Metrics Summary\n`;
        output += `====================\n`;
        output += `Total Errors: ${stats.totalErrors}\n`;
        output += `Unique Error Codes: ${Object.keys(stats.errorsByCode).length}\n`;
        output += `Tracking Since: ${stats.trackingStarted.toISOString()}\n`;
        
        if (stats.lastError) {
            output += `Last Error: ${stats.lastError.toISOString()}\n`;
        }
        
        if (topErrors.length > 0) {
            output += `\nTop Errors:\n`;
            topErrors.forEach((error, index) => {
                output += `  ${index + 1}. ${error.code}: ${error.count} (${error.percentage.toFixed(1)}%)\n`;
            });
        }
        
        if (stats.recentErrors.length > 0) {
            output += `\nRecent Errors: ${stats.recentErrors.slice(0, 5).join(', ')}\n`;
        }
        
        return output;
    }
}

/**
 * Singleton instance of ErrorMetrics
 */
export const ErrorMetrics = new ErrorMetricsClass();

export default ErrorMetrics;
