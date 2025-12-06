/**
 * Error Codes
 * 
 * Unique identifiers for all error types in the application.
 * Error codes follow the format: DOMAIN_SPECIFIC_ERROR
 * 
 * Domains:
 * - DL_*: Data Loading errors
 * - VAL_*: Validation errors
 * - RPT_*: Report Generation errors
 * - CFG_*: Configuration errors
 * - NET_*: Network errors
 * - APP_*: General application errors
 * 
 * @example
 * import { ErrorCodes } from './errors/ErrorCodes.ts';
 * 
 * if (error.code === ErrorCodes.DL_FILE_NOT_FOUND) {
 *   // Handle file not found
 * }
 */
export const ErrorCodes = {
    // ========================================
    // Data Loading Errors (DL_*)
    // ========================================
    
    /** File not found in the specified location */
    DL_FILE_NOT_FOUND: 'DL_FILE_NOT_FOUND',
    
    /** Failed to parse file content (Excel, JSON, etc.) */
    DL_FILE_PARSE: 'DL_FILE_PARSE',
    
    /** File format is invalid or unexpected */
    DL_INVALID_FORMAT: 'DL_INVALID_FORMAT',
    
    /** File is empty or has no data */
    DL_EMPTY_FILE: 'DL_EMPTY_FILE',
    
    /** Required columns are missing from the data */
    DL_MISSING_COLUMNS: 'DL_MISSING_COLUMNS',
    
    /** Failed to read file from disk */
    DL_FILE_READ: 'DL_FILE_READ',
    
    /** Failed to transform data from wide to long format */
    DL_TRANSFORM_FAILED: 'DL_TRANSFORM_FAILED',
    
    /** Directory not found or inaccessible */
    DL_DIRECTORY_NOT_FOUND: 'DL_DIRECTORY_NOT_FOUND',
    
    /** Permission denied when accessing file or directory */
    DL_PERMISSION_DENIED: 'DL_PERMISSION_DENIED',
    
    // ========================================
    // Validation Errors (VAL_*)
    // ========================================
    
    /** Schema validation failed */
    VAL_SCHEMA: 'VAL_SCHEMA',
    
    /** Data integrity check failed */
    VAL_DATA_INTEGRITY: 'VAL_DATA_INTEGRITY',
    
    /** Required field is missing */
    VAL_MISSING_FIELD: 'VAL_MISSING_FIELD',
    
    /** Field value is invalid */
    VAL_INVALID_VALUE: 'VAL_INVALID_VALUE',
    
    /** Report definition validation failed */
    VAL_REPORT_DEFINITION: 'VAL_REPORT_DEFINITION',
    
    /** Trial balance does not balance */
    VAL_UNBALANCED: 'VAL_UNBALANCED',
    
    /** Unmapped accounts detected */
    VAL_UNMAPPED_ACCOUNTS: 'VAL_UNMAPPED_ACCOUNTS',
    
    // ========================================
    // Report Generation Errors (RPT_*)
    // ========================================
    
    /** Variable not found in context */
    RPT_VARIABLE_NOT_FOUND: 'RPT_VARIABLE_NOT_FOUND',
    
    /** Failed to evaluate expression */
    RPT_EXPRESSION_EVAL: 'RPT_EXPRESSION_EVAL',
    
    /** Failed to process layout item */
    RPT_LAYOUT_PROCESSING: 'RPT_LAYOUT_PROCESSING',
    
    /** Report definition is invalid */
    RPT_INVALID_DEFINITION: 'RPT_INVALID_DEFINITION',
    
    /** Report not found in registry */
    RPT_NOT_FOUND: 'RPT_NOT_FOUND',
    
    /** Failed to resolve variable */
    RPT_VARIABLE_RESOLUTION: 'RPT_VARIABLE_RESOLUTION',
    
    /** Circular dependency detected in variables */
    RPT_CIRCULAR_DEPENDENCY: 'RPT_CIRCULAR_DEPENDENCY',
    
    /** Filter application failed */
    RPT_FILTER_FAILED: 'RPT_FILTER_FAILED',
    
    /** Filter evaluation error */
    RPT_FILTER_ERROR: 'RPT_FILTER_ERROR',
    
    /** Subtotal calculation failed */
    RPT_SUBTOTAL_FAILED: 'RPT_SUBTOTAL_FAILED',
    
    /** Subtotal calculation error */
    RPT_SUBTOTAL_ERROR: 'RPT_SUBTOTAL_ERROR',
    
    // ========================================
    // Configuration Errors (CFG_*)
    // ========================================
    
    /** Configuration file is missing */
    CFG_MISSING: 'CFG_MISSING',
    
    /** Configuration is invalid */
    CFG_INVALID: 'CFG_INVALID',
    
    /** Failed to load configuration */
    CFG_LOAD_FAILED: 'CFG_LOAD_FAILED',
    
    /** Required configuration property is missing */
    CFG_MISSING_PROPERTY: 'CFG_MISSING_PROPERTY',
    
    /** Configuration property has invalid value */
    CFG_INVALID_VALUE: 'CFG_INVALID_VALUE',
    
    // ========================================
    // Network Errors (NET_*)
    // ========================================
    
    /** HTTP fetch request failed */
    NET_FETCH_FAILED: 'NET_FETCH_FAILED',
    
    /** Request timed out */
    NET_TIMEOUT: 'NET_TIMEOUT',
    
    /** Network is offline */
    NET_OFFLINE: 'NET_OFFLINE',
    
    /** Server returned error status */
    NET_SERVER_ERROR: 'NET_SERVER_ERROR',
    
    /** Resource not found (404) */
    NET_NOT_FOUND: 'NET_NOT_FOUND',
    
    /** Unauthorized (401) */
    NET_UNAUTHORIZED: 'NET_UNAUTHORIZED',
    
    /** Forbidden (403) */
    NET_FORBIDDEN: 'NET_FORBIDDEN',
    
    // ========================================
    // General Application Errors (APP_*)
    // ========================================
    
    /** Unknown or unclassified error */
    APP_UNKNOWN: 'APP_UNKNOWN',
    
    /** Application not initialized */
    APP_NOT_INITIALIZED: 'APP_NOT_INITIALIZED',
    
    /** Invalid operation or state */
    APP_INVALID_OPERATION: 'APP_INVALID_OPERATION',
    
    /** Required dependency is missing */
    APP_MISSING_DEPENDENCY: 'APP_MISSING_DEPENDENCY',
    
    /** Feature not supported */
    APP_NOT_SUPPORTED: 'APP_NOT_SUPPORTED',
    
    /** Operation was cancelled */
    APP_CANCELLED: 'APP_CANCELLED',
} as const;

/**
 * Type representing all valid error codes
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Check if a string is a valid error code
 * 
 * @param code - String to check
 * @returns True if the string is a valid error code
 * 
 * @example
 * if (isValidErrorCode('DL_FILE_NOT_FOUND')) {
 *   // Valid error code
 * }
 */
export function isValidErrorCode(code: string): code is ErrorCode {
    return Object.values(ErrorCodes).includes(code as ErrorCode);
}

export default ErrorCodes;
