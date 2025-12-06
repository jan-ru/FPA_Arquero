import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import {
    FileNotFoundError,
    FileParseError,
    InvalidDataFormatError,
    EmptyFileError,
    MissingColumnsError,
    DirectoryNotFoundError,
    PermissionDeniedError,
} from './DataLoadError.ts';
import {
    ValidationError,
    SchemaValidationError,
    DataIntegrityError,
    MissingFieldError,
    InvalidValueError,
} from './ValidationError.ts';
import {
    VariableResolutionError,
    ExpressionEvaluationError,
    LayoutProcessingError,
    InvalidReportDefinitionError,
    ReportNotFoundError,
    CircularDependencyError,
} from './ReportGenerationError.ts';
import {
    FetchError,
    TimeoutError,
    OfflineError,
} from './NetworkError.ts';
import {
    MissingConfigError,
    InvalidConfigError,
    ConfigLoadError,
} from './ConfigurationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * ErrorFactory - Factory functions for creating errors consistently
 * 
 * Provides convenient factory methods for creating common error types
 * with sensible defaults and proper context population.
 * 
 * @example
 * // Instead of: throw new FileNotFoundError('data.xlsx');
 * throw ErrorFactory.fileNotFound('data.xlsx');
 * 
 * @example
 * // Instead of: throw new ValidationError('Failed', errors);
 * throw ErrorFactory.validation(errors);
 */
export class ErrorFactory {
    // ========================================
    // Data Loading Errors
    // ========================================
    
    /**
     * Create a FileNotFoundError
     * 
     * @param filename - Name of the file that was not found
     * @param cause - Optional original error
     * @returns FileNotFoundError instance
     */
    static fileNotFound(filename: string, cause?: Error): FileNotFoundError {
        return new FileNotFoundError(filename, cause);
    }
    
    /**
     * Create a FileParseError
     * 
     * @param filename - Name of the file that failed to parse
     * @param parseError - Original parse error
     * @returns FileParseError instance
     */
    static fileParse(filename: string, parseError: Error): FileParseError {
        return new FileParseError(filename, parseError);
    }
    
    /**
     * Create an InvalidDataFormatError
     * 
     * @param filename - Name of the file with invalid format
     * @param expectedFormat - Description of expected format
     * @param cause - Optional original error
     * @returns InvalidDataFormatError instance
     */
    static invalidFormat(filename: string, expectedFormat: string, cause?: Error): InvalidDataFormatError {
        return new InvalidDataFormatError(filename, expectedFormat, cause);
    }
    
    /**
     * Create an EmptyFileError
     * 
     * @param filename - Name of the empty file
     * @returns EmptyFileError instance
     */
    static emptyFile(filename: string): EmptyFileError {
        return new EmptyFileError(filename);
    }
    
    /**
     * Create a MissingColumnsError
     * 
     * @param filename - Name of the file with missing columns
     * @param missingColumns - Array of missing column names
     * @returns MissingColumnsError instance
     */
    static missingColumns(filename: string, missingColumns: string[]): MissingColumnsError {
        return new MissingColumnsError(filename, missingColumns);
    }
    
    /**
     * Create a DirectoryNotFoundError
     * 
     * @param dirPath - Path to the directory that was not found
     * @param cause - Optional original error
     * @returns DirectoryNotFoundError instance
     */
    static directoryNotFound(dirPath: string, cause?: Error): DirectoryNotFoundError {
        return new DirectoryNotFoundError(dirPath, cause);
    }
    
    /**
     * Create a PermissionDeniedError
     * 
     * @param filename - Name of the file with permission issues
     * @param cause - Optional original error
     * @returns PermissionDeniedError instance
     */
    static permissionDenied(filename: string, cause?: Error): PermissionDeniedError {
        return new PermissionDeniedError(filename, cause);
    }
    
    // ========================================
    // Validation Errors
    // ========================================
    
    /**
     * Create a ValidationError
     * 
     * @param errors - Array of validation error messages
     * @param context - Optional validation context
     * @returns ValidationError instance
     */
    static validation(errors: string[], context?: ErrorContext): ValidationError {
        return new ValidationError('Validation failed', errors, context);
    }
    
    /**
     * Create a SchemaValidationError
     * 
     * @param schemaName - Name of the schema that failed validation
     * @param errors - Array of validation error messages
     * @returns SchemaValidationError instance
     */
    static schemaValidation(schemaName: string, errors: string[]): SchemaValidationError {
        return new SchemaValidationError(schemaName, errors);
    }
    
    /**
     * Create a DataIntegrityError
     * 
     * @param description - Description of the integrity issue
     * @param errors - Array of specific error messages
     * @returns DataIntegrityError instance
     */
    static dataIntegrity(description: string, errors: string[]): DataIntegrityError {
        return new DataIntegrityError(description, errors);
    }
    
    /**
     * Create a MissingFieldError
     * 
     * @param field - Name of the missing field
     * @param context - Context where field is missing (e.g., 'report definition')
     * @returns MissingFieldError instance
     */
    static missingField(field: string, context: string = 'data'): MissingFieldError {
        return new MissingFieldError(field, context);
    }
    
    /**
     * Create an InvalidValueError
     * 
     * @param field - Name of the field with invalid value
     * @param value - The invalid value
     * @param reason - Reason why the value is invalid
     * @returns InvalidValueError instance
     */
    static invalidValue(field: string, value: unknown, reason: string): InvalidValueError {
        return new InvalidValueError(field, value, reason);
    }
    
    // ========================================
    // Report Generation Errors
    // ========================================
    
    /**
     * Create a VariableResolutionError
     * 
     * @param variableName - Name of the variable that couldn't be resolved
     * @param reportId - ID of the report
     * @param cause - Optional original error
     * @returns VariableResolutionError instance
     */
    static variableNotFound(variableName: string, reportId: string, cause?: Error): VariableResolutionError {
        return new VariableResolutionError(variableName, reportId, cause);
    }
    
    /**
     * Create an ExpressionEvaluationError
     * 
     * @param expression - Expression that failed to evaluate
     * @param cause - Original evaluation error
     * @returns ExpressionEvaluationError instance
     */
    static expressionError(expression: string, cause: Error): ExpressionEvaluationError {
        return new ExpressionEvaluationError(expression, cause);
    }
    
    /**
     * Create a LayoutProcessingError
     * 
     * @param layoutOrder - Order number of the layout item
     * @param layoutType - Type of the layout item
     * @param cause - Optional original error
     * @returns LayoutProcessingError instance
     */
    static layoutError(layoutOrder: number, layoutType?: string, cause?: Error): LayoutProcessingError {
        return new LayoutProcessingError(layoutOrder, layoutType, cause);
    }
    
    /**
     * Create an InvalidReportDefinitionError
     * 
     * @param reportId - ID of the invalid report
     * @param reason - Reason why the report is invalid
     * @param cause - Optional original error
     * @returns InvalidReportDefinitionError instance
     */
    static invalidReport(reportId: string, reason: string, cause?: Error): InvalidReportDefinitionError {
        return new InvalidReportDefinitionError(reportId, reason, cause);
    }
    
    /**
     * Create a ReportNotFoundError
     * 
     * @param reportId - ID of the report that was not found
     * @returns ReportNotFoundError instance
     */
    static reportNotFound(reportId: string): ReportNotFoundError {
        return new ReportNotFoundError(reportId);
    }
    
    /**
     * Create a CircularDependencyError
     * 
     * @param dependencyChain - Array of variable names showing the circular dependency
     * @returns CircularDependencyError instance
     */
    static circularDependency(dependencyChain: string[]): CircularDependencyError {
        return new CircularDependencyError(dependencyChain);
    }
    
    // ========================================
    // Network Errors
    // ========================================
    
    /**
     * Create a FetchError
     * 
     * @param url - URL that failed to fetch
     * @param statusCode - HTTP status code
     * @param statusText - HTTP status text
     * @returns FetchError instance
     */
    static fetchFailed(url: string, statusCode: number, statusText: string): FetchError {
        return new FetchError(url, statusCode, statusText);
    }
    
    /**
     * Create a TimeoutError
     * 
     * @param url - URL that timed out
     * @param timeout - Timeout duration in milliseconds
     * @returns TimeoutError instance
     */
    static timeout(url: string, timeout: number): TimeoutError {
        return new TimeoutError(url, timeout);
    }
    
    /**
     * Create an OfflineError
     * 
     * @returns OfflineError instance
     */
    static offline(): OfflineError {
        return new OfflineError();
    }
    
    // ========================================
    // Configuration Errors
    // ========================================
    
    /**
     * Create a MissingConfigError
     * 
     * @param configFile - Name of the missing config file
     * @param cause - Optional original error
     * @returns MissingConfigError instance
     */
    static missingConfig(configFile: string, cause?: Error): MissingConfigError {
        return new MissingConfigError(configFile, cause);
    }
    
    /**
     * Create an InvalidConfigError
     * 
     * @param configFile - Name of the config file
     * @param property - Property that is invalid
     * @param value - Invalid value
     * @param reason - Optional reason why it's invalid
     * @returns InvalidConfigError instance
     */
    static invalidConfig(configFile: string, property: string, value: unknown, reason?: string): InvalidConfigError {
        return new InvalidConfigError(configFile, property, value, reason);
    }
    
    /**
     * Create a ConfigLoadError
     * 
     * @param configFile - Name of the config file that failed to load
     * @param cause - Original error
     * @returns ConfigLoadError instance
     */
    static configLoadFailed(configFile: string, cause: Error): ConfigLoadError {
        return new ConfigLoadError(configFile, cause);
    }
    
    // ========================================
    // Generic Wrapper
    // ========================================
    
    /**
     * Wrap a generic Error in an ApplicationError
     * 
     * Useful for converting third-party errors or unknown errors into
     * ApplicationError instances with proper context.
     * 
     * @param error - Original error to wrap
     * @param context - Optional additional context
     * @returns ApplicationError instance
     * 
     * @example
     * try {
     *   await thirdPartyLibrary.doSomething();
     * } catch (error) {
     *   throw ErrorFactory.wrap(error, { operation: 'thirdPartyCall' });
     * }
     */
    static wrap(error: Error, context?: ErrorContext): ApplicationError {
        // If already an ApplicationError, return as-is
        if (error instanceof ApplicationError) {
            return error;
        }
        
        // Handle cases where error might not be a proper Error object
        const errorMessage = error?.message || String(error) || 'Unknown error occurred';
        
        return new ApplicationError(errorMessage, {
            code: ErrorCodes.APP_UNKNOWN,
            userMessage: 'An unexpected error occurred. Please try again.',
            context: context || {},
            cause: error,
        });
    }
}

export default ErrorFactory;
