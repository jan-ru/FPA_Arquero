import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Context for network errors
 */
export interface NetworkContext extends ErrorContext {
    /** URL being accessed */
    url?: string;
    
    /** HTTP method */
    method?: string;
    
    /** HTTP status code */
    statusCode?: number;
    
    /** HTTP status text */
    statusText?: string;
    
    /** Timeout duration in milliseconds */
    timeout?: number;
}

/**
 * Base class for network errors
 * 
 * Used for errors that occur during network requests, including fetch failures,
 * timeouts, and HTTP errors.
 * 
 * @example
 * throw new NetworkError('Failed to fetch report', {
 *   url: '/reports/income_statement.json',
 *   method: 'GET',
 *   statusCode: 500
 * });
 */
export class NetworkError extends ApplicationError {
    readonly statusCode?: number;
    
    constructor(
        message: string,
        context: NetworkContext = {},
        cause?: Error
    ) {
        const userMessage = 'Network request failed. Please check your connection and try again.';
        
        super(message, {
            code: ErrorCodes.NET_FETCH_FAILED,
            userMessage,
            context,
            cause,
            logLevel: 'error',
        });
        
        this.statusCode = context.statusCode;
    }
}

/**
 * Error thrown when HTTP fetch request fails
 * 
 * @example
 * throw new FetchError('/reports/income.json', 404, 'Not Found');
 * 
 * @example
 * throw new FetchError('/api/data', 500, 'Internal Server Error');
 */
export class FetchError extends NetworkError {
    readonly url: string;
    
    constructor(url: string, statusCode: number, statusText: string) {
        const message = `Fetch failed: ${statusCode} ${statusText} - ${url}`;
        
        let userMessage: string;
        if (statusCode === 404) {
            userMessage = `The requested resource was not found: ${url}`;
        } else if (statusCode >= 500) {
            userMessage = `Server error occurred. Please try again later.`;
        } else if (statusCode >= 400) {
            userMessage = `Request failed: ${statusText}`;
        } else {
            userMessage = `Network request failed: ${statusText}`;
        }
        
        super(message, { url, statusCode, statusText, method: 'GET' });
        
        this.url = url;
        
        // Override user message
        (this as any).userMessage = userMessage;
        
        // Set specific error code based on status
        if (statusCode === 404) {
            (this as any).code = ErrorCodes.NET_NOT_FOUND;
        } else if (statusCode === 401) {
            (this as any).code = ErrorCodes.NET_UNAUTHORIZED;
        } else if (statusCode === 403) {
            (this as any).code = ErrorCodes.NET_FORBIDDEN;
        } else if (statusCode >= 500) {
            (this as any).code = ErrorCodes.NET_SERVER_ERROR;
        }
    }
}

/**
 * Error thrown when a network request times out
 * 
 * @example
 * throw new TimeoutError('/api/data', 5000);
 */
export class TimeoutError extends NetworkError {
    readonly url: string;
    readonly timeout: number;
    
    constructor(url: string, timeout: number) {
        const message = `Request timed out after ${timeout}ms: ${url}`;
        const userMessage = `The request took too long to complete. Please try again.`;
        
        super(message, { url, timeout });
        
        this.url = url;
        this.timeout = timeout;
        
        // Override code and user message
        (this as any).code = ErrorCodes.NET_TIMEOUT;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when network is offline
 * 
 * @example
 * if (!navigator.onLine) {
 *   throw new OfflineError();
 * }
 */
export class OfflineError extends NetworkError {
    constructor() {
        const message = 'Network is offline';
        const userMessage = 'No internet connection. Please check your network and try again.';
        
        super(message, {});
        
        // Override code and user message
        (this as any).code = ErrorCodes.NET_OFFLINE;
        (this as any).userMessage = userMessage;
    }
}

export default NetworkError;
