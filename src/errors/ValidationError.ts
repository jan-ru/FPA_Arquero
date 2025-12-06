import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Context for validation errors
 */
export interface ValidationContext extends ErrorContext {
    /** Field that failed validation */
    field?: string;
    
    /** Value that failed validation */
    value?: unknown;
    
    /** Report ID being validated */
    reportId?: string;
    
    /** Schema name being validated against */
    schemaName?: string;
}

/**
 * Base class for validation errors
 * 
 * Used for errors that occur during data validation, schema validation,
 * and integrity checks.
 * 
 * @example
 * throw new ValidationError('Validation failed', [
 *   'Field "amount" is required',
 *   'Field "date" must be a valid date'
 * ]);
 * 
 * @example
 * const errors = validator.validate(data);
 * if (errors.length > 0) {
 *   throw new ValidationError('Data validation failed', errors, {
 *     reportId: 'income_statement_default'
 *   });
 * }
 */
export class ValidationError extends ApplicationError {
    /** List of validation error messages */
    readonly errors: string[];
    
    constructor(
        message: string,
        errors: string[] = [],
        context: ValidationContext = {}
    ) {
        const userMessage = errors.length > 0
            ? `Validation failed: ${errors[0]}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''}`
            : 'Validation failed. Please check your data.';
        
        super(message, {
            code: ErrorCodes.VAL_SCHEMA,
            userMessage,
            context: {
                ...context,
                errorCount: errors.length,
            },
            logLevel: 'warn',
        });
        
        this.errors = [...errors];
    }
    
    /**
     * Format all validation errors as a single string
     * 
     * @returns Formatted error messages
     * 
     * @example
     * const error = new ValidationError('Failed', ['Error 1', 'Error 2']);
     * console.log(error.formatErrors());
     * // "- Error 1\n- Error 2"
     */
    formatErrors(): string {
        return this.errors.map(err => `- ${err}`).join('\n');
    }
    
    /**
     * Check if a specific error pattern exists
     * 
     * @param pattern - String or regex pattern to search for
     * @returns True if any error matches the pattern
     * 
     * @example
     * if (error.hasError('required')) {
     *   // Handle missing required field
     * }
     */
    hasError(pattern: string | RegExp): boolean {
        const regex = typeof pattern === 'string'
            ? new RegExp(pattern, 'i')
            : pattern;
        
        return this.errors.some(err => regex.test(err));
    }
    
    /**
     * Override toJSON to include errors array
     */
    override toJSON(): object {
        return {
            ...super.toJSON(),
            errors: this.errors,
        };
    }
}

/**
 * Error thrown when schema validation fails
 * 
 * @example
 * throw new SchemaValidationError('ReportDefinition', [
 *   'Missing required field: reportId',
 *   'Invalid field type: layout (expected array)'
 * ]);
 */
export class SchemaValidationError extends ValidationError {
    readonly schemaName: string;
    
    constructor(schemaName: string, errors: string[]) {
        const message = `Schema validation failed for ${schemaName}`;
        const userMessage = `The ${schemaName} format is invalid. ${errors[0] || 'Please check the structure.'}`;
        
        super(message, errors, { schemaName });
        
        this.schemaName = schemaName;
        
        // Override code and user message
        (this as any).code = ErrorCodes.VAL_SCHEMA;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when data integrity check fails
 * 
 * @example
 * throw new DataIntegrityError('Trial balance does not balance', [
 *   'Debit total: 100000',
 *   'Credit total: 99500',
 *   'Difference: 500'
 * ]);
 */
export class DataIntegrityError extends ValidationError {
    constructor(description: string, errors: string[]) {
        const message = `Data integrity check failed: ${description}`;
        const userMessage = `Data integrity issue detected: ${description}. Please review the data.`;
        
        super(message, errors);
        
        // Override code and user message
        (this as any).code = ErrorCodes.VAL_DATA_INTEGRITY;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when a required field is missing
 * 
 * @example
 * throw new MissingFieldError('reportId', 'report definition');
 */
export class MissingFieldError extends ValidationError {
    readonly field: string;
    
    constructor(field: string, context: string = 'data') {
        const message = `Missing required field: ${field}`;
        const userMessage = `Required field "${field}" is missing from ${context}.`;
        
        super(message, [message], { field });
        
        this.field = field;
        
        // Override code and user message
        (this as any).code = ErrorCodes.VAL_MISSING_FIELD;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when a field value is invalid
 * 
 * @example
 * throw new InvalidValueError('amount', -100, 'must be positive');
 */
export class InvalidValueError extends ValidationError {
    readonly field: string;
    readonly value: unknown;
    
    constructor(field: string, value: unknown, reason: string) {
        const message = `Invalid value for field "${field}": ${reason}`;
        const userMessage = `The value for "${field}" is invalid: ${reason}.`;
        
        super(message, [message], { field, value });
        
        this.field = field;
        this.value = value;
        
        // Override code and user message
        (this as any).code = ErrorCodes.VAL_INVALID_VALUE;
        (this as any).userMessage = userMessage;
    }
}

export default ValidationError;
