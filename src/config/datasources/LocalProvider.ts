/**
 * LocalProvider - Local filesystem data source provider
 * 
 * Provides access to resources stored on the local filesystem.
 * Uses the fetch API to load files from the local server.
 * 
 * @example
 * const provider = new LocalProvider();
 * await provider.initialize({ basePath: './data' });
 * const resource = await provider.fetch('reports/income_statement.json');
 */

import { ErrorFactory } from '../../errors/index.ts';
import Logger from '../../utils/Logger.ts';
import type { LocalConfig } from '../DataSourceConfig.ts';
import type {
    DataSourceProvider,
    DataResource,
    ResourceMetadata,
    FetchOptions,
    ConnectionTestResult,
} from './DataSourceProvider.ts';

/**
 * Local filesystem provider
 */
export class LocalProvider implements DataSourceProvider {
    readonly type = 'local' as const;
    readonly name = 'Local Filesystem Provider';
    
    private basePath: string = '';
    private initialized: boolean = false;
    
    /**
     * Initialize the provider with configuration
     * 
     * @param config - Local provider configuration
     * @throws {ConfigurationError} If configuration is invalid
     */
    async initialize(config: unknown): Promise<void> {
        if (!config || typeof config !== 'object') {
            throw ErrorFactory.invalidConfig(
                'LocalProvider',
                'config',
                config,
                'Expected object'
            );
        }
        
        const localConfig = config as LocalConfig;
        
        if (!localConfig.basePath || typeof localConfig.basePath !== 'string') {
            throw ErrorFactory.missingField(
                'basePath',
                'LocalProvider configuration'
            );
        }
        
        this.basePath = localConfig.basePath.replace(/\/$/, ''); // Remove trailing slash
        this.initialized = true;
        
        Logger.info(`LocalProvider initialized with basePath: ${this.basePath}`);
    }
    
    /**
     * Fetch a resource from the local filesystem
     * 
     * @param path - Path to the resource
     * @param options - Fetch options
     * @returns Promise resolving to the resource
     * @throws {FileNotFoundError} If resource not found
     * @throws {FetchError} If fetch fails
     */
    async fetch(path: string, options?: FetchOptions): Promise<DataResource> {
        this.ensureInitialized();
        
        const fullPath = this.resolvePath(path);
        
        try {
            Logger.debug(`Fetching local resource: ${fullPath}`);
            
            const controller = new AbortController();
            const timeoutId = options?.timeout ? setTimeout(
                () => controller.abort(),
                options.timeout
            ) : null;
            
            // Combine abort signals
            const signal = options?.signal ? AbortSignal.any([
                options.signal,
                controller.signal
            ]) : controller.signal;
            
            const response = await fetch(fullPath, {
                signal,
                headers: options?.headers,
            });
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw ErrorFactory.fileNotFound(path);
                } else if (response.status === 403) {
                    throw ErrorFactory.permissionDenied(path);
                } else {
                    throw ErrorFactory.fetchFailed(
                        fullPath,
                        response.status,
                        response.statusText
                    );
                }
            }
            
            // Handle progress tracking for large files
            let content: Blob;
            if (options?.onProgress && response.body) {
                content = await this.fetchWithProgress(response, options.onProgress);
            } else {
                content = await response.blob();
            }
            
            const metadata = this.extractMetadata(response, path);
            
            Logger.debug(`Successfully fetched local resource: ${path}`, {
                size: metadata.size,
                contentType: metadata.contentType,
            });
            
            return {
                content,
                metadata,
                source: 'local',
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw ErrorFactory.timeout(fullPath, options?.timeout || 0);
            }
            
            // Re-throw custom errors as-is
            if ((error as any).code) {
                throw error;
            }
            
            Logger.error(`Failed to fetch local resource: ${path}`, error);
            throw ErrorFactory.fileParse(path, error as Error);
        }
    }
    
    /**
     * List resources at a path
     * 
     * Note: This is a basic implementation that returns empty array.
     * Full directory listing would require server-side support.
     * 
     * @param path - Path to list
     * @returns Promise resolving to empty array
     */
    async list(path: string): Promise<ResourceMetadata[]> {
        this.ensureInitialized();
        
        Logger.warn('LocalProvider.list() not fully implemented - requires server-side directory listing');
        
        // TODO: Implement directory listing if server supports it
        // This would require the server to provide an endpoint that lists directory contents
        return [];
    }
    
    /**
     * Check if a resource exists
     * 
     * @param path - Path to check
     * @returns Promise resolving to true if exists
     */
    async exists(path: string): Promise<boolean> {
        this.ensureInitialized();
        
        const fullPath = this.resolvePath(path);
        
        try {
            const response = await fetch(fullPath, {
                method: 'HEAD',
            });
            
            return response.ok;
        } catch {
            return false;
        }
    }
    
    /**
     * Test connectivity to the local filesystem
     * 
     * @returns Promise resolving to test result
     */
    async testConnection(): Promise<ConnectionTestResult> {
        const start = Date.now();
        
        try {
            // Test by trying to access the base path
            const testPath = this.basePath || '.';
            const response = await fetch(testPath, {
                method: 'HEAD',
            });
            
            const responseTime = Date.now() - start;
            
            return {
                success: response.ok,
                responseTime,
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    basePath: this.basePath,
                },
            };
        } catch (error) {
            return {
                success: false,
                responseTime: Date.now() - start,
                error: error as Error,
                details: {
                    basePath: this.basePath,
                },
            };
        }
    }
    
    /**
     * Get metadata about a resource without fetching content
     * 
     * @param path - Path to the resource
     * @returns Promise resolving to metadata
     * @throws {FileNotFoundError} If resource not found
     */
    async getMetadata(path: string): Promise<ResourceMetadata> {
        this.ensureInitialized();
        
        const fullPath = this.resolvePath(path);
        
        try {
            const response = await fetch(fullPath, {
                method: 'HEAD',
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw ErrorFactory.fileNotFound(path);
                } else {
                    throw ErrorFactory.fetchFailed(
                        fullPath,
                        response.status,
                        response.statusText
                    );
                }
            }
            
            return this.extractMetadata(response, path);
            
        } catch (error) {
            if ((error as any).code) {
                throw error;
            }
            
            Logger.error(`Failed to get metadata for: ${path}`, error);
            throw ErrorFactory.fileParse(path, error as Error);
        }
    }
    
    /**
     * Resolve path relative to base path
     */
    private resolvePath(path: string): string {
        // Remove leading slash
        const cleanPath = path.replace(/^\//, '');
        
        // Validate path to prevent directory traversal
        if (cleanPath.includes('..')) {
            throw ErrorFactory.validation(
                ['Path contains directory traversal (..)'],
                { path }
            );
        }
        
        // Combine base path and resource path
        if (this.basePath) {
            return `${this.basePath}/${cleanPath}`;
        }
        
        return cleanPath;
    }
    
    /**
     * Extract metadata from response headers
     */
    private extractMetadata(response: Response, path: string): ResourceMetadata {
        const contentLength = response.headers.get('content-length');
        const lastModified = response.headers.get('last-modified');
        const contentType = response.headers.get('content-type');
        const etag = response.headers.get('etag');
        
        return {
            path,
            size: contentLength ? parseInt(contentLength, 10) : 0,
            lastModified: lastModified ? new Date(lastModified) : new Date(),
            contentType: contentType || 'application/octet-stream',
            etag: etag || undefined,
        };
    }
    
    /**
     * Fetch with progress tracking
     */
    private async fetchWithProgress(
        response: Response,
        onProgress: (loaded: number, total: number) => void
    ): Promise<Blob> {
        const reader = response.body!.getReader();
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            onProgress(receivedLength, contentLength);
        }
        
        // Combine chunks into single array
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }
        
        return new Blob([allChunks]);
    }
    
    /**
     * Ensure provider is initialized
     */
    private ensureInitialized(): void {
        if (!this.initialized) {
            throw ErrorFactory.missingConfig('LocalProvider not initialized. Call initialize() first.');
        }
    }
}

export default LocalProvider;
