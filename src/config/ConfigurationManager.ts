/**
 * ConfigurationManager - Manages data source configuration
 * 
 * Central manager for loading, validating, and accessing data source configuration.
 * Coordinates between providers, cache, and fallback mechanisms.
 * 
 * @example
 * const manager = new ConfigurationManager();
 * await manager.loadConfig('config.json');
 * const resource = await manager.getResource(ResourceType.REPORT_DEFINITION, 'income_statement');
 */

import type {
    DataSourceConfig,
    SourceDefinition,
    ResourceType,
} from './DataSourceConfig.ts';
import { DEFAULT_CONFIG } from './DataSourceConfig.ts';
import { ConfigValidator, ValidationResult } from './ConfigValidator.ts';
import { DataSourceRegistry } from './DataSourceRegistry.ts';
import { CacheManager } from './CacheManager.ts';
import { LocalProvider } from './datasources/LocalProvider.ts';
import type {
    DataResource,
    FetchOptions,
    ConnectionTestResult,
    DataSourceProvider,
} from './datasources/DataSourceProvider.ts';
import { ErrorFactory } from '../errors/index.ts';
import Logger from '../utils/Logger.ts';

/**
 * ConfigurationManager class
 */
export class ConfigurationManager {
    private config: DataSourceConfig;
    private validator: ConfigValidator;
    private registry: DataSourceRegistry;
    private cache: CacheManager | null = null;
    private initialized: boolean = false;
    
    constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.validator = new ConfigValidator();
        this.registry = new DataSourceRegistry();
        
        // Register default providers
        this.registerDefaultProviders();
    }
    
    /**
     * Register default providers
     */
    private registerDefaultProviders(): void {
        // Register LocalProvider by default
        this.registry.registerProvider(new LocalProvider());
        
        // TODO: Register other providers (GitHub, S3, GDrive) when implemented
    }
    
    /**
     * Load configuration from file or object
     * 
     * @param source - File path or configuration object
     * @throws {ConfigLoadError} If file cannot be loaded
     * @throws {InvalidConfigError} If configuration is invalid
     * 
     * @example
     * await manager.loadConfig('config.json');
     * 
     * @example
     * await manager.loadConfig({ version: '1.0', dataSources: {...} });
     */
    async loadConfig(source: string | DataSourceConfig): Promise<void> {
        try {
            let config: DataSourceConfig;
            
            if (typeof source === 'string') {
                // Load from file
                config = await this.loadConfigFromFile(source);
            } else {
                // Use provided object
                config = source;
            }
            
            // Substitute environment variables
            config = this.substituteEnvVars(config);
            
            // Validate configuration
            const validation = this.validateConfig(config);
            if (!validation.valid) {
                throw ErrorFactory.invalidConfig(
                    typeof source === 'string' ? source : 'config object',
                    'configuration',
                    'valid configuration',
                    validation.errors.join(', ')
                );
            }
            
            // Log warnings
            validation.warnings.forEach(warning => {
                Logger.warn('Configuration warning:', warning);
            });
            
            // Merge with defaults
            this.config = this.mergeWithDefaults(config);
            
            // Initialize cache if enabled
            if (this.config.cache.enabled) {
                this.cache = new CacheManager(this.config.cache);
                Logger.info('Cache initialized', {
                    storage: this.config.cache.storage,
                    ttl: this.config.cache.ttl,
                });
            }
            
            // Configure data sources in registry
            await this.configureDataSources();
            
            this.initialized = true;
            
            Logger.info('Configuration loaded successfully', {
                version: this.config.version,
                sources: Object.keys(this.config.dataSources),
            });
            
        } catch (error) {
            if (typeof source === 'string') {
                throw ErrorFactory.configLoadFailed(source, error as Error);
            }
            throw error;
        }
    }
    
    /**
     * Load configuration from JSON file
     */
    private async loadConfigFromFile(filepath: string): Promise<DataSourceConfig> {
        try {
            const response = await fetch(filepath);
            
            if (!response.ok) {
                if (response.status === 404) {
                    Logger.warn(`Config file not found: ${filepath}, using defaults`);
                    return { ...DEFAULT_CONFIG };
                }
                throw ErrorFactory.fetchFailed(
                    filepath,
                    response.status,
                    response.statusText
                );
            }
            
            const text = await response.text();
            return JSON.parse(text);
            
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw ErrorFactory.fileParse(filepath, error);
            }
            throw error;
        }
    }
    
    /**
     * Substitute environment variables in configuration
     * 
     * Replaces ${VAR_NAME} with environment variable values
     */
    private substituteEnvVars(config: DataSourceConfig): DataSourceConfig {
        const configStr = JSON.stringify(config);
        const envVarPattern = /\$\{([^}]+)\}/g;
        
        const substituted = configStr.replace(envVarPattern, (match, varName) => {
            const value = this.getEnvVar(varName);
            if (value === undefined) {
                throw ErrorFactory.missingField(
                    varName,
                    `Environment variable ${varName} not set`
                );
            }
            return value;
        });
        
        return JSON.parse(substituted);
    }
    
    /**
     * Get environment variable value
     */
    private getEnvVar(name: string): string | undefined {
        // Try Deno.env first
        if (typeof Deno !== 'undefined' && Deno.env) {
            return Deno.env.get(name);
        }
        
        // Try window.env (browser)
        if (typeof window !== 'undefined' && (window as any).env) {
            return (window as any).env[name];
        }
        
        return undefined;
    }
    
    /**
     * Validate configuration
     * 
     * @param config - Configuration to validate
     * @returns Validation result
     * 
     * @example
     * const result = manager.validateConfig(config);
     * if (!result.valid) {
     *   console.error('Errors:', result.errors);
     * }
     */
    validateConfig(config: DataSourceConfig): ValidationResult {
        return this.validator.validateConfig(config);
    }
    
    /**
     * Get current configuration (read-only)
     * 
     * @returns Current configuration
     * 
     * @example
     * const config = manager.getConfig();
     * console.log('Version:', config.version);
     */
    getConfig(): Readonly<DataSourceConfig> {
        return Object.freeze({ ...this.config });
    }
    
    /**
     * Update configuration at runtime
     * 
     * @param updates - Partial configuration updates
     * @throws {InvalidConfigError} If updates are invalid
     * 
     * @example
     * await manager.updateConfig({
     *   cache: { enabled: false }
     * });
     */
    async updateConfig(updates: Partial<DataSourceConfig>): Promise<void> {
        const newConfig = {
            ...this.config,
            ...updates,
        };
        
        const validation = this.validateConfig(newConfig);
        if (!validation.valid) {
            throw ErrorFactory.invalidConfig(
                'runtime update',
                'configuration',
                'valid configuration',
                validation.errors.join(', ')
            );
        }
        
        this.config = newConfig;
        
        Logger.info('Configuration updated', {
            updates: Object.keys(updates),
        });
    }
    
    /**
     * Get resource using configured data sources
     * 
     * @param resourceType - Type of resource to fetch
     * @param resourceId - Resource identifier
     * @param options - Fetch options
     * @returns Promise resolving to the resource
     * 
     * @example
     * const report = await manager.getResource(
     *   ResourceType.REPORT_DEFINITION,
     *   'income_statement'
     * );
     */
    async getResource(
        resourceType: ResourceType,
        resourceId: string,
        options?: FetchOptions
    ): Promise<DataResource> {
        if (!this.initialized) {
            throw ErrorFactory.wrap(
                new Error('ConfigurationManager not initialized'),
                { operation: 'getResource', resourceType, resourceId }
            );
        }
        
        const cacheKey = CacheManager.generateKey(resourceType, resourceId);
        
        // Check cache first if enabled
        if (this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                Logger.debug(`Cache hit: ${cacheKey}`);
                return cached;
            }
            Logger.debug(`Cache miss: ${cacheKey}`);
        }
        
        // Fetch from provider
        try {
            const resource = await this.fetchWithFallback(resourceType, resourceId, options);
            
            // Store in cache if enabled
            if (this.cache) {
                await this.cache.set(cacheKey, resource);
            }
            
            return resource;
            
        } catch (error) {
            // Try expired cache as last resort if fallback is enabled
            if (this.config.fallback.enabled && this.cache) {
                const expired = await this.cache.get(cacheKey, { ignoreExpiry: true });
                if (expired) {
                    Logger.warn(`Using expired cache for ${cacheKey} due to fetch failure`);
                    return expired;
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Test all configured data sources
     * 
     * @returns Map of source names to test results
     * 
     * @example
     * const results = await manager.testAllConnections();
     * results.forEach((result, source) => {
     *   console.log(`${source}: ${result.success ? 'OK' : 'FAILED'}`);
     * });
     */
    async testAllConnections(): Promise<Map<string, ConnectionTestResult>> {
        if (!this.initialized) {
            throw ErrorFactory.wrap(
                new Error('ConfigurationManager not initialized'),
                { operation: 'testAllConnections' }
            );
        }
        
        const results = new Map<string, ConnectionTestResult>();
        const resourceTypes = this.registry.getConfiguredResources();
        
        for (const resourceType of resourceTypes) {
            try {
                const provider = this.registry.getProvider(resourceType);
                const result = await provider.testConnection();
                results.set(resourceType, result);
                
                Logger.info(`Connection test for ${resourceType}: ${result.success ? 'OK' : 'FAILED'}`, {
                    responseTime: result.responseTime,
                });
            } catch (error) {
                results.set(resourceType, {
                    success: false,
                    responseTime: 0,
                    error: error as Error,
                });
                
                Logger.error(`Connection test failed for ${resourceType}:`, error);
            }
        }
        
        return results;
    }
    
    /**
     * Merge configuration with defaults
     */
    private mergeWithDefaults(config: DataSourceConfig): DataSourceConfig {
        return {
            version: config.version || DEFAULT_CONFIG.version,
            dataSources: {
                ...DEFAULT_CONFIG.dataSources,
                ...config.dataSources,
            },
            cache: {
                ...DEFAULT_CONFIG.cache,
                ...config.cache,
            },
            fallback: {
                ...DEFAULT_CONFIG.fallback,
                ...config.fallback,
            },
        };
    }
    
    /**
     * Check if manager is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
    
    /**
     * Register a custom provider
     * 
     * @param provider - Provider to register
     * 
     * @example
     * manager.registerProvider(new CustomProvider());
     */
    registerProvider(provider: DataSourceProvider): void {
        this.registry.registerProvider(provider);
    }
    
    /**
     * Get cache statistics
     * 
     * @returns Cache statistics or null if cache disabled
     */
    async getCacheStats() {
        if (!this.cache) {
            return null;
        }
        return await this.cache.getStats();
    }
    
    /**
     * Clear cache
     * 
     * @param pattern - Optional pattern to match keys
     */
    async clearCache(pattern?: string): Promise<void> {
        if (this.cache) {
            await this.cache.clear(pattern);
        }
    }
    
    /**
     * Configure data sources in registry
     */
    private async configureDataSources(): Promise<void> {
        const { dataSources } = this.config;
        
        // Configure each resource type
        const resourceTypes = [
            'reportDefinitions',
            'factTable',
            'dimTables',
            'default',
        ] as const;
        
        for (const resourceType of resourceTypes) {
            const source = dataSources[resourceType];
            if (source) {
                this.registry.configureSource(resourceType as ResourceType, source);
                
                // Initialize provider with config
                await this.registry.initializeProvider(source.type, source.config);
            }
        }
    }
    
    /**
     * Fetch resource with fallback support
     */
    private async fetchWithFallback(
        resourceType: ResourceType,
        resourceId: string,
        options?: FetchOptions
    ): Promise<DataResource> {
        const { fallback } = this.config;
        
        if (!fallback.enabled) {
            // No fallback, just fetch directly
            return await this.registry.fetch(resourceType, resourceId, options);
        }
        
        // Try with retries
        const maxAttempts = (fallback.retryAttempts || 0) + 1;
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    Logger.info(`Retry attempt ${attempt} for ${resourceType}:${resourceId}`);
                    
                    // Wait before retry
                    if (fallback.retryDelay) {
                        await new Promise(resolve => setTimeout(resolve, fallback.retryDelay));
                    }
                }
                
                const resource = await this.registry.fetch(resourceType, resourceId, options);
                
                if (attempt > 0) {
                    Logger.info(`Retry successful for ${resourceType}:${resourceId}`);
                }
                
                return resource;
                
            } catch (error) {
                lastError = error as Error;
                Logger.warn(`Fetch attempt ${attempt + 1} failed for ${resourceType}:${resourceId}:`, error);
            }
        }
        
        // Try fallback source if configured
        const source = this.config.dataSources[resourceType];
        if (source?.fallback) {
            try {
                Logger.info(`Trying fallback source for ${resourceType}:${resourceId}`);
                
                // Temporarily configure fallback source
                const originalSource = source;
                this.registry.configureSource(resourceType, source.fallback);
                await this.registry.initializeProvider(source.fallback.type, source.fallback.config);
                
                const resource = await this.registry.fetch(resourceType, resourceId, options);
                
                // Restore original source
                this.registry.configureSource(resourceType, originalSource);
                
                Logger.info(`Fallback successful for ${resourceType}:${resourceId}`);
                return resource;
                
            } catch (fallbackError) {
                Logger.error(`Fallback also failed for ${resourceType}:${resourceId}:`, fallbackError);
            }
        }
        
        // All attempts failed
        throw lastError || new Error('Fetch failed with no error details');
    }
}

export default ConfigurationManager;
