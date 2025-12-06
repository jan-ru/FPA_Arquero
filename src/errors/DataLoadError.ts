import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Context for data loading errors
 */
export interface DataLoadContext extends ErrorContext {
    /** Name of the file being loaded */
    filename?: string;
    
    /** Full path to the file */
    filepath?: string;
    
    /** Size of the file in bytes */
    fileSize?: number;
    
    /** Year associated with the data */
    year?: string;
    
    /** Operation being performed */
    operation?: 'read' | 'parse' | 'transform' | 'validate';
    
    /** Expected data format */
    expectedFormat?: string;
    
    /** Actual data format detected */
    actualFormat?: string;
}

/**
 * Base class for data loading errors
 * 
 * Used for errors that occur during file loading, parsing, and data transformation.
 * 
 * @example
 * throw new DataLoadError('Failed to load trial balance', {
 *   filename: 'trial_balance_2024.xlsx',
 *   year: '2024',
 *   operation: 'parse'
 * }, originalError);
 */
export class DataLoadError extends ApplicationError {
    constructor(
        message: string,
        context: DataLoadContext = {},
        cause?: Error
    ) {
        super(message, {
            code: ErrorCodes.DL_FILE_READ,
            userMessage: 'Failed to load data file. Please check the file exists and is accessible.',
            context,
            cause,
            logLevel: 'error',
        });
    }
}

/**
 * Error thrown when a file is not found
 * 
 * @example
 * throw new FileNotFoundError('trial_balance_2024.xlsx');
 * 
 * @example
 * throw new FileNotFoundError('trial_balance_2024.xlsx', new Error('ENOENT'));
 */
export class FileNotFoundError extends DataLoadError {
    constructor(filename: string, cause?: Error) {
        const message = `File not found: ${filename}`;
        const userMessage = `Unable to find the file "${filename}". Please ensure the file exists in the selected directory.`;
        
        super(message, { filename, operation: 'read' }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_FILE_NOT_FOUND;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when file parsing fails
 * 
 * @example
 * try {
 *   const data = parseExcel(file);
 * } catch (error) {
 *   throw new FileParseError('trial_balance.xlsx', error);
 * }
 */
export class FileParseError extends DataLoadError {
    constructor(filename: string, parseError: Error) {
        const message = `Failed to parse file: ${filename}`;
        const userMessage = `Unable to read the file "${filename}". The file may be corrupted or in an unsupported format.`;
        
        super(message, { filename, operation: 'parse' }, parseError);
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_FILE_PARSE;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when file format is invalid or unexpected
 * 
 * @example
 * throw new InvalidDataFormatError(
 *   'trial_balance.xlsx',
 *   'Excel with trial balance columns',
 *   new Error('Missing required columns')
 * );
 */
export class InvalidDataFormatError extends DataLoadError {
    constructor(filename: string, expectedFormat: string, cause?: Error) {
        const message = `Invalid data format in file: ${filename}`;
        const userMessage = `The file "${filename}" is not in the expected format. Expected: ${expectedFormat}.`;
        
        super(
            message,
            {
                filename,
                expectedFormat,
                operation: 'validate',
            },
            cause
        );
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_INVALID_FORMAT;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when a file is empty
 * 
 * @example
 * if (data.length === 0) {
 *   throw new EmptyFileError('trial_balance.xlsx');
 * }
 */
export class EmptyFileError extends DataLoadError {
    constructor(filename: string) {
        const message = `File is empty: ${filename}`;
        const userMessage = `The file "${filename}" contains no data. Please ensure the file has valid content.`;
        
        super(message, { filename, operation: 'validate' });
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_EMPTY_FILE;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when required columns are missing from data
 * 
 * @example
 * const missingCols = ['account_code', 'amount'];
 * throw new MissingColumnsError('trial_balance.xlsx', missingCols);
 */
export class MissingColumnsError extends DataLoadError {
    readonly missingColumns: string[];
    
    constructor(filename: string, missingColumns: string[]) {
        const message = `Missing required columns in ${filename}: ${missingColumns.join(', ')}`;
        const userMessage = `The file "${filename}" is missing required columns: ${missingColumns.join(', ')}. Please check the file format.`;
        
        super(message, {
            filename,
            operation: 'validate',
            missingColumns,
        });
        
        this.missingColumns = missingColumns;
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_MISSING_COLUMNS;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when data transformation fails
 * 
 * @example
 * throw new DataTransformError('data.xlsx', 'wide-to-long', transformError);
 */
export class DataTransformError extends DataLoadError {
    constructor(filename: string, transformType: string, cause?: Error) {
        const message = `Data transformation failed for ${filename}: ${transformType}`;
        const userMessage = `Unable to transform data in "${filename}". The ${transformType} transformation failed.`;
        
        super(message, { filename, operation: 'transform', transformType }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_TRANSFORM_FAILED;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when directory is not found
 * 
 * @example
 * throw new DirectoryNotFoundError('/path/to/input');
 */
export class DirectoryNotFoundError extends DataLoadError {
    constructor(dirPath: string, cause?: Error) {
        const message = `Directory not found: ${dirPath}`;
        const userMessage = `Unable to find the directory. Please select a valid directory.`;
        
        super(message, { filepath: dirPath, operation: 'read' }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_DIRECTORY_NOT_FOUND;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when permission is denied
 * 
 * @example
 * throw new PermissionDeniedError('trial_balance.xlsx');
 */
export class PermissionDeniedError extends DataLoadError {
    constructor(filename: string, cause?: Error) {
        const message = `Permission denied: ${filename}`;
        const userMessage = `Access denied to "${filename}". Please check file permissions.`;
        
        super(message, { filename, operation: 'read' }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.DL_PERMISSION_DENIED;
        (this as any).userMessage = userMessage;
    }
}

export default DataLoadError;
