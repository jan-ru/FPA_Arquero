/**
 * DataSourceProvider - Interface for data source implementations
 * 
 * Defines the contract that all data source providers must implement.
 * Providers handle fetching resources from different storage backends
 * (local filesystem, GitHub, S3, Google Drive, etc.)
 * 
 * @example
 * class MyProvider implements DataSourceProvider {
 *   readonly type = 'custom';
 *   readonly name = 'My Custom Provider';
 *   
 *   async initialize(config: unknown): Promise<void> {
 *     // Setup provider
 *   }
 *   
 *   async fetch(path: string): Promise<DataResource> {
 *     // Fetch resource
 *   }
 * }
 */

/**
 * Resource metadata
 */
export interface ResourceMetadata {
    /** Path to the resource */
    path: string;
    
    /** Size in bytes */
    size: number;
    
    /** Last modified timestamp */
    lastModified: Date;
    
    /** MIME type */
    contentType: string;
    
    /** ETag for caching */
    etag?: string;
    
    /** Additional provider-specific metadata */
    [key: string]: unknown;
}

/**
 * Fetched resource with content and metadata
 */
export interface DataResource {
    /** Resource content */
    content: Blob | string | ArrayBuffer;
    
    /** Resource metadata */
    metadata: ResourceMetadata;
    
    /** Source provider type */
    source: string;
}

/**
 * Options for fetch operations
 */
export interface FetchOptions {
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    
    /** Progress callback for large files */
    onProgress?: (loaded: number, total: number) => void;
    
    /** Custom headers */
    headers?: Record<string, string>;
    
    /** Timeout in milliseconds */
    timeout?: number;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
    /** Whether connection succeeded */
    success: boolean;
    
    /** Response time in milliseconds */
    responseTime: number;
    
    /** Error if connection failed */
    error?: Error;
    
    /** Additional test details */
    details?: Record<string, unknown>;
}

/**
 * Provider type identifier
 */
export type ProviderType = 'local' | 'github' | 's3' | 'gdrive';

/**
 * DataSourceProvider interface
 * 
 * All data source providers must implement this interface.
 */
export interface DataSourceProvider {
    /** Provider type identifier */
    readonly type: ProviderType;
    
    /** Human-readable provider name */
    readonly name: string;
    
    /**
     * Initialize the provider with configuration
     * 
     * @param config - Provider-specific configuration
     * @throws {ConfigurationError} If configuration is invalid
     * 
     * @example
     * await provider.initialize({ basePath: './data' });
     */
    initialize(config: unknown): Promise<void>;
    
    /**
     * Fetch a resource from the data source
     * 
     * @param path - Path to the resource
     * @param options - Fetch options
     * @returns Promise resolving to the resource
     * @throws {FileNotFoundError} If resource not found
     * @throws {FetchError} If fetch fails
     * 
     * @example
     * const resource = await provider.fetch('reports/income_statement.json');
     * console.log(resource.content);
     */
    fetch(path: string, options?: FetchOptions): Promise<DataResource>;
    
    /**
     * List resources at a path
     * 
     * @param path - Path to list
     * @returns Promise resolving to array of metadata
     * @throws {FetchError} If listing fails
     * 
     * @example
     * const files = await provider.list('reports/');
     * files.forEach(file => console.log(file.path));
     */
    list(path: string): Promise<ResourceMetadata[]>;
    
    /**
     * Check if a resource exists
     * 
     * @param path - Path to check
     * @returns Promise resolving to true if exists
     * 
     * @example
     * if (await provider.exists('config.json')) {
     *   // Load config
     * }
     */
    exists(path: string): Promise<boolean>;
    
    /**
     * Test connectivity to the data source
     * 
     * @returns Promise resolving to test result
     * 
     * @example
     * const result = await provider.testConnection();
     * if (result.success) {
     *   console.log(`Connected in ${result.responseTime}ms`);
     * }
     */
    testConnection(): Promise<ConnectionTestResult>;
    
    /**
     * Get metadata about a resource without fetching content
     * 
     * @param path - Path to the resource
     * @returns Promise resolving to metadata
     * @throws {FileNotFoundError} If resource not found
     * 
     * @example
     * const metadata = await provider.getMetadata('data.xlsx');
     * console.log(`File size: ${metadata.size} bytes`);
     */
    getMetadata(path: string): Promise<ResourceMetadata>;
}

export default DataSourceProvider;
