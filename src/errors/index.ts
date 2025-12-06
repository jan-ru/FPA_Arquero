/**
 * Custom Error System - Public API
 * 
 * This module provides a comprehensive error handling system for the application.
 * All custom errors extend ApplicationError and provide rich context, user-friendly
 * messages, and automatic logging/metrics tracking.
 * 
 * @example
 * // Import specific error classes
 * import { FileNotFoundError, ValidationError } from './errors/index.ts';
 * 
 * throw new FileNotFoundError('data.xlsx');
 * 
 * @example
 * // Use factory functions for convenience
 * import { ErrorFactory } from './errors/index.ts';
 * 
 * throw ErrorFactory.fileNotFound('data.xlsx');
 * 
 * @example
 * // Use type guards for error handling
 * import { isValidationError, isNetworkError } from './errors/index.ts';
 * 
 * try {
 *   await loadData();
 * } catch (error) {
 *   if (isValidationError(error)) {
 *     console.log('Validation errors:', error.formatErrors());
 *   } else if (isNetworkError(error)) {
 *     console.log('Network error:', error.statusCode);
 *   }
 * }
 * 
 * @example
 * // Access error metrics
 * import { ErrorMetrics } from './errors/index.ts';
 * 
 * const stats = ErrorMetrics.getStats();
 * console.log('Total errors:', stats.totalErrors);
 */

// ========================================
// Base Error Class
// ========================================

export { ApplicationError } from './ApplicationError.ts';
export type { ErrorContext, ErrorOptions } from './ApplicationError.ts';

// ========================================
// Error Codes
// ========================================

export { ErrorCodes } from './ErrorCodes.ts';

// ========================================
// Data Loading Errors
// ========================================

export {
    DataLoadError,
    FileNotFoundError,
    FileParseError,
    InvalidDataFormatError,
    EmptyFileError,
    MissingColumnsError,
    DataTransformError,
    DirectoryNotFoundError,
    PermissionDeniedError,
} from './DataLoadError.ts';
export type { DataLoadContext } from './DataLoadError.ts';

// ========================================
// Validation Errors
// ========================================

export {
    ValidationError,
    SchemaValidationError,
    DataIntegrityError,
    MissingFieldError,
    InvalidValueError,
} from './ValidationError.ts';
export type { ValidationContext } from './ValidationError.ts';

// ========================================
// Report Generation Errors
// ========================================

export {
    ReportGenerationError,
    VariableResolutionError,
    ExpressionEvaluationError,
    LayoutProcessingError,
    InvalidReportDefinitionError,
    ReportNotFoundError,
    CircularDependencyError,
    FilterError,
    SubtotalError,
} from './ReportGenerationError.ts';
export type { ReportContext } from './ReportGenerationError.ts';

// ========================================
// Network Errors
// ========================================

export {
    NetworkError,
    FetchError,
    TimeoutError,
    OfflineError,
} from './NetworkError.ts';
export type { NetworkContext } from './NetworkError.ts';

// ========================================
// Configuration Errors
// ========================================

export {
    ConfigurationError,
    MissingConfigError,
    InvalidConfigError,
    MissingConfigPropertyError,
    ConfigLoadError,
} from './ConfigurationError.ts';
export type { ConfigurationContext } from './ConfigurationError.ts';

// ========================================
// Error Factory
// ========================================

export { ErrorFactory } from './ErrorFactory.ts';

// ========================================
// Type Guards
// ========================================

export {
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
} from './ErrorGuards.ts';

// ========================================
// Error Metrics
// ========================================

export { ErrorMetrics } from './ErrorMetrics.ts';
export type { ErrorStats, ErrorCodeInfo } from './ErrorMetrics.ts';

// ========================================
// Default Export
// ========================================

// Import for default export
import { ErrorFactory } from './ErrorFactory.ts';
import { ErrorMetrics } from './ErrorMetrics.ts';
import { ErrorCodes } from './ErrorCodes.ts';
import {
    isApplicationError,
    isDataLoadError,
    isValidationError,
    isReportGenerationError,
    isNetworkError,
    isConfigurationError,
    hasErrorCode,
    getErrorMessage,
    getErrorCode,
    isRetryableError,
} from './ErrorGuards.ts';

/**
 * Default export provides commonly used utilities
 */
export default {
    // Factory
    ErrorFactory,
    
    // Metrics
    ErrorMetrics,
    
    // Type Guards
    isApplicationError,
    isDataLoadError,
    isValidationError,
    isReportGenerationError,
    isNetworkError,
    isConfigurationError,
    hasErrorCode,
    getErrorMessage,
    getErrorCode,
    isRetryableError,
    
    // Error Codes
    ErrorCodes,
};
