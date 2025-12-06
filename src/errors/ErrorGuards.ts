/**
 * ErrorGuards - Type guard functions for error type checking
 * 
 * Provides type-safe functions to check error types at runtime.
 * All guards handle null/undefined safely and provide proper TypeScript type narrowing.
 * 
 * @example
 * import { isApplicationError, isValidationError } from './errors/index.ts';
 * 
 * try {
 *   // some operation
 * } catch (error) {
 *   if (isApplicationError(error)) {
 *     console.log('Error code:', error.code);
 *     console.log('User message:', error.getUserMessage());
 *   }
 * }
 * 
 * @example
 * // Type narrowing works automatically
 * if (isValidationError(error)) {
 *   // TypeScript knows error is ValidationError here
 *   console.log('Validation errors:', error.formatErrors());
 * }
 */

import { ApplicationError } from './ApplicationError.ts';
import { DataLoadError } from './DataLoadError.ts';
import { ValidationError } from './ValidationError.ts';
import { ReportGenerationError } from './ReportGenerationError.ts';
import { NetworkError } from './NetworkError.ts';
import { ConfigurationError } from './ConfigurationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Check if a value is an ApplicationError
 * 
 * @param error - Value to check
 * @returns True if error is an ApplicationError instance
 * 
 * @example
 * if (isApplicationError(error)) {
 *   console.log('Error code:', error.code);
 *   console.log('User message:', error.getUserMessage());
 * }
 */
export function isApplicationError(error: unknown): error is ApplicationError {
    return error instanceof ApplicationError;
}

/**
 * Check if a value is a DataLoadError
 * 
 * @param error - Value to check
 * @returns True if error is a DataLoadError instance
 * 
 * @example
 * if (isDataLoadError(error)) {
 *   console.log('File:', error.context.filename);
 *   console.log('Operation:', error.context.operation);
 * }
 */
export function isDataLoadError(error: unknown): error is DataLoadError {
    return error instanceof DataLoadError;
}

/**
 * Check if a value is a ValidationError
 * 
 * @param error - Value to check
 * @returns True if error is a ValidationError instance
 * 
 * @example
 * if (isValidationError(error)) {
 *   console.log('Validation errors:', error.formatErrors());
 *   console.log('Error count:', error.errors.length);
 * }
 */
export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

/**
 * Check if a value is a ReportGenerationError
 * 
 * @param error - Value to check
 * @returns True if error is a ReportGenerationError instance
 * 
 * @example
 * if (isReportGenerationError(error)) {
 *   console.log('Report ID:', error.context.reportId);
 *   console.log('Variable:', error.context.variableName);
 * }
 */
export function isReportGenerationError(error: unknown): error is ReportGenerationError {
    return error instanceof ReportGenerationError;
}

/**
 * Check if a value is a NetworkError
 * 
 * @param error - Value to check
 * @returns True if error is a NetworkError instance
 * 
 * @example
 * if (isNetworkError(error)) {
 *   console.log('URL:', error.context.url);
 *   console.log('Status:', error.statusCode);
 * }
 */
export function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

/**
 * Check if a value is a ConfigurationError
 * 
 * @param error - Value to check
 * @returns True if error is a ConfigurationError instance
 * 
 * @example
 * if (isConfigurationError(error)) {
 *   console.log('Config file:', error.context.configPath);
 *   console.log('Property:', error.context.property);
 * }
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
    return error instanceof ConfigurationError;
}

/**
 * Check if an error has a specific error code
 * 
 * Safely checks if an error (of any type) has a specific error code.
 * Handles null/undefined and non-ApplicationError instances gracefully.
 * 
 * @param error - Error to check
 * @param code - Error code to check for
 * @returns True if error has the specified code
 * 
 * @example
 * if (hasErrorCode(error, ErrorCodes.DL_FILE_NOT_FOUND)) {
 *   console.log('File not found error');
 * }
 * 
 * @example
 * // Works with any error type
 * try {
 *   await loadFile('data.xlsx');
 * } catch (error) {
 *   if (hasErrorCode(error, ErrorCodes.DL_FILE_NOT_FOUND)) {
 *     // Handle file not found
 *   } else if (hasErrorCode(error, ErrorCodes.DL_FILE_PARSE)) {
 *     // Handle parse error
 *   }
 * }
 */
export function hasErrorCode(error: unknown, code: string): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    
    return 'code' in error && error.code === code;
}

/**
 * Check if an error code matches a category prefix
 * 
 * Useful for checking if an error belongs to a category (e.g., all data loading errors).
 * 
 * @param error - Error to check
 * @param prefix - Error code prefix (e.g., 'DL_', 'VAL_', 'RPT_')
 * @returns True if error code starts with the prefix
 * 
 * @example
 * if (hasErrorCodePrefix(error, 'DL_')) {
 *   console.log('This is a data loading error');
 * }
 * 
 * @example
 * // Check for validation errors
 * if (hasErrorCodePrefix(error, 'VAL_')) {
 *   console.log('Validation failed');
 * }
 */
export function hasErrorCodePrefix(error: unknown, prefix: string): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    
    if (!('code' in error) || typeof error.code !== 'string') {
        return false;
    }
    
    return error.code.startsWith(prefix);
}

/**
 * Check if a value is an Error (standard or custom)
 * 
 * Safely checks if a value is any kind of Error instance.
 * Handles null/undefined gracefully.
 * 
 * @param error - Value to check
 * @returns True if value is an Error instance
 * 
 * @example
 * if (isError(error)) {
 *   console.log('Error message:', error.message);
 *   console.log('Stack trace:', error.stack);
 * }
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Extract error message safely from any value
 * 
 * Safely extracts an error message from any value, including:
 * - ApplicationError (uses getUserMessage())
 * - Standard Error (uses message property)
 * - String values
 * - Other values (converts to string)
 * 
 * @param error - Value to extract message from
 * @returns Error message string
 * 
 * @example
 * const message = getErrorMessage(error);
 * console.log('Error:', message);
 * 
 * @example
 * // Works with any value
 * console.log(getErrorMessage(new Error('test'))); // "test"
 * console.log(getErrorMessage('error string')); // "error string"
 * console.log(getErrorMessage(null)); // "Unknown error"
 */
export function getErrorMessage(error: unknown): string {
    if (!error) {
        return 'Unknown error';
    }
    
    // ApplicationError - use user message
    if (isApplicationError(error)) {
        return error.getUserMessage();
    }
    
    // Standard Error - use message
    if (isError(error)) {
        return error.message || 'Unknown error';
    }
    
    // String
    if (typeof error === 'string') {
        return error;
    }
    
    // Object with message property
    if (typeof error === 'object' && 'message' in error) {
        const msg = (error as { message: unknown }).message;
        if (typeof msg === 'string') {
            return msg;
        }
    }
    
    // Fallback - convert to string
    try {
        return String(error);
    } catch {
        return 'Unknown error';
    }
}

/**
 * Extract error code safely from any value
 * 
 * Safely extracts an error code from any value.
 * Returns undefined if no code is available.
 * 
 * @param error - Value to extract code from
 * @returns Error code string or undefined
 * 
 * @example
 * const code = getErrorCode(error);
 * if (code === ErrorCodes.DL_FILE_NOT_FOUND) {
 *   // Handle file not found
 * }
 * 
 * @example
 * // Returns undefined for non-ApplicationError
 * const code = getErrorCode(new Error('test')); // undefined
 */
export function getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    
    if ('code' in error && typeof error.code === 'string') {
        return error.code;
    }
    
    return undefined;
}

/**
 * Check if an error is retryable based on its type
 * 
 * Determines if an operation should be retried based on the error type.
 * Network errors and timeouts are typically retryable, while validation
 * and configuration errors are not.
 * 
 * @param error - Error to check
 * @returns True if the operation should be retried
 * 
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     // Retry the operation
 *     await fetchData();
 *   } else {
 *     // Don't retry, handle the error
 *     console.error('Non-retryable error:', error);
 *   }
 * }
 */
export function isRetryableError(error: unknown): boolean {
    if (!error) {
        return false;
    }
    
    // Network errors are generally retryable
    if (isNetworkError(error)) {
        // But not all network errors should be retried
        const code = getErrorCode(error);
        if (code === ErrorCodes.NET_UNAUTHORIZED || 
            code === ErrorCodes.NET_FORBIDDEN ||
            code === ErrorCodes.NET_NOT_FOUND) {
            return false; // Don't retry auth or not found errors
        }
        return true; // Retry timeouts, server errors, etc.
    }
    
    // Check for specific retryable error codes
    const code = getErrorCode(error);
    if (code) {
        const retryableCodes: string[] = [
            ErrorCodes.NET_TIMEOUT,
            ErrorCodes.NET_SERVER_ERROR,
            ErrorCodes.NET_OFFLINE,
        ];
        return retryableCodes.includes(code);
    }
    
    return false;
}

/**
 * Check if an error is a user-facing error
 * 
 * Determines if an error should be displayed to the user.
 * ApplicationErrors with user messages are user-facing.
 * 
 * @param error - Error to check
 * @returns True if error should be shown to user
 * 
 * @example
 * if (isUserFacingError(error)) {
 *   showErrorToUser(getErrorMessage(error));
 * } else {
 *   logErrorToConsole(error);
 * }
 */
export function isUserFacingError(error: unknown): boolean {
    return isApplicationError(error);
}

export default {
    isApplicationError,
    isDataLoadError,
    isValidationError,
    isReportGenerationError,
    isNetworkError,
    isConfigurationError,
    hasErrorCode,
    hasErrorCodePrefix,
    isError,
    getErrorMessage,
    getErrorCode,
    isRetryableError,
    isUserFacingError,
};
