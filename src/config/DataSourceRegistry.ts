/**
 * DataSourceRegistry - Registry for data source providers
 * 
 * Manages registration and routing of data source providers.
 * Maps resource types to appropriate providers and handles
 * provider lifecycle.
 * 
 * @example
 * const registry = new DataSourceRegistry();
 * registry.registerProvider(new LocalProvider());
 * const provider = registry.getProvider(ResourceType.REPORT_DEFINITION);
 */

import { ErrorFactory } from '../errors/index.ts';
import Logger from '../utils/Logger.ts';
import type {
    ResourceType,
    SourceDefinition,
} from './DataSourceConfig.ts';
import type {
    DataSourceProvider,
    ProviderType,
    DataResource,
    FetchOptions,
} from './datasources/DataSourceProvider.ts';

/**
 * Data source registry class
 */
export class DataSourceRegistry {
    private providers: Map<ProviderType, DataSourceProvider>;
    private sourceMap: Map<ResourceType, SourceDefinition>;
    private initializedProviders: Set<ProviderType>;
    
    constructor() {
        this.providers = new Map();
        this.sourceMap = new Map();
        this.initializedProviders = new Set();
    }
    
    /**
     * Register a provider implementation
     * 
     * @param provider - Provider to register
     * @throws {ValidationError} If provider is invalid
     * 
     * @example
     * registry.registerProvider(new LocalProvider());
     */
    registerProvider(provider: DataSourceProvider): void {
        // Validate provider implements required interface
        this.validateProvider(provider);
        
        // Check for duplicate registration
        if (this.providers.has(provider.type)) {
            Logger.warn(`Provider ${provider.type} already registered, replacing`, {
                existingName: this.providers.get(provider.type)?.name,
                newName: provider.name,
            });
        }
        
        this.providers.set(provider.type, provider);
        
        Logger.info(`Registered provider: ${provider.name}`, {
            type: provider.type,
        });
    }
    
    /**
     * Get provider for a resource type
     * 
     * @param resourceType - Type of resource
     * @returns Provider instance
     * @throws {ConfigurationError} If no provider configured
     * 
     * @example
     * const provider = registry.getProvider(ResourceType.REPORT_DEFINITION);
     */
    getProvider(resourceType: ResourceType): DataSourceProvider {
        const source = this.sourceMap.get(resourceType);
        if (!source) {
            throw ErrorFactory.missingField(
                resourceType,
                `No data source configured for resource type: ${resourceType}`
            );
        }
        
        const provider = this.providers.get(source.type);
        if (!provider) {
            throw ErrorFactory.missingField(
                source.type,
                `No provider registered for type: ${source.type}`
            );
        }
        
        return provider;
    }
    
    /**
     * Configure source mapping for a resource type
     * 
     * @param resourceType - Type of resource
     * @param source - Source definition
     * @throws {ValidationError} If source is invalid
     * 
     * @example
     * registry.configureSource(ResourceType.REPORT_DEFINITION, {
     *   type: 'local',
     *   config: { basePath: './reports' }
     * });
     */
    configureSource(resourceType: ResourceType, source: SourceDefinition): void {
        // Validate source definition
        this.validateSourceDefinition(source);
        
        // Check if provider is registered
        if (!this.providers.has(source.type)) {
            throw ErrorFactory.missingField(
                source.type,
                `Provider ${source.type} not registered. Register provider before configuring source.`
            );
        }
        
        this.sourceMap.set(resourceType, source);
        
        Logger.info(`Configured source for ${resourceType}`, {
            providerType: source.type,
        });
    }
    
    /**
     * Initialize a provider with its configuration
     * 
     * @param providerType - Type of provider to initialize
     * @param config - Provider configuration
     * @throws {ConfigurationError} If initialization fails
     */
    async initializeProvider(providerType: ProviderType, config: unknown): Promise<void> {
        const provider = this.providers.get(providerType);
        if (!provider) {
            throw ErrorFactory.missingField(
                providerType,
                `Provider ${providerType} not registered`
            );
        }
        
        // Skip if already initialized
        if (this.initializedProviders.has(providerType)) {
            return;
        }
        
        try {
            await provider.initialize(config);
            this.initializedProviders.add(providerType);
            
            Logger.info(`Initialized provider: ${provider.name}`);
        } catch (error) {
            throw ErrorFactory.configLoadFailed(
                `provider:${providerType}`,
                error as Error
            );
        }
    }
    
    /**
     * Fetch resource using appropriate provider
     * 
     * @param resourceType - Type of resource
     * @param resourceId - ID/path of resource
     * @param options - Fetch options
     * @returns Promise resolving to resource
     * @throws {ConfigurationError} If provider not configured
     * @throws {DataLoadError} If fetch fails
     * 
     * @example
     * const resource = await registry.fetch(
     *   ResourceType.REPORT_DEFINITION,
     *   'income_statement'
     * );
     */
    async fetch(
        resourceType: ResourceType,
        resourceId: string,
        options?: FetchOptions
    ): Promise<DataResource> {
        const provider = this.getProvider(resourceType);
        const source = this.sourceMap.get(resourceType)!;
        
        // Ensure provider is initialized
        if (!this.initializedProviders.has(provider.type)) {
            await this.initializeProvider(provider.type, source.config);
        }
        
        try {
            Logger.debug(`Fetching ${resourceType}:${resourceId} using ${provider.name}`);
            
            const resource = await provider.fetch(resourceId, options);
            
            Logger.debug(`Successfully fetched ${resourceType}:${resourceId}`, {
                size: resource.metadata.size,
                contentType: resource.metadata.contentType,
            });
            
            return resource;
        } catch (error) {
            Logger.error(`Failed to fetch ${resourceType}:${resourceId}`, {
                provider: provider.name,
                error,
            });
            throw error;
        }
    }
    
    /**
     * Get all registered provider types
     * 
     * @returns Array of registered provider types
     */
    getRegisteredProviders(): ProviderType[] {
        return Array.from(this.providers.keys());
    }
    
    /**
     * Get all configured resource types
     * 
     * @returns Array of configured resource types
     */
    getConfiguredResources(): ResourceType[] {
        return Array.from(this.sourceMap.keys());
    }
    
    /**
     * Check if a provider is registered
     * 
     * @param providerType - Provider type to check
     * @returns True if registered
     */
    hasProvider(providerType: ProviderType): boolean {
        return this.providers.has(providerType);
    }
    
    /**
     * Check if a resource type is configured
     * 
     * @param resourceType - Resource type to check
     * @returns True if configured
     */
    hasResource(resourceType: ResourceType): boolean {
        return this.sourceMap.has(resourceType);
    }
    
    /**
     * Clear all registrations (for testing)
     */
    clear(): void {
        this.providers.clear();
        this.sourceMap.clear();
        this.initializedProviders.clear();
        
        Logger.debug('Cleared all provider registrations');
    }
    
    /**
     * Validate provider implements required interface
     */
    private validateProvider(provider: DataSourceProvider): void {
        const requiredMethods = [
            'initialize',
            'fetch',
            'list',
            'exists',
            'testConnection',
            'getMetadata',
        ];
        
        const errors: string[] = [];
        
        // Check required properties
        if (!provider.type || typeof provider.type !== 'string') {
            errors.push('Provider must have a type property');
        }
        
        if (!provider.name || typeof provider.name !== 'string') {
            errors.push('Provider must have a name property');
        }
        
        // Check required methods
        for (const method of requiredMethods) {
            if (typeof (provider as any)[method] !== 'function') {
                errors.push(`Provider must implement ${method}() method`);
            }
        }
        
        if (errors.length > 0) {
            throw ErrorFactory.validation(errors, {
                providerType: provider.type,
                providerName: provider.name,
            });
        }
    }
    
    /**
     * Validate source definition
     */
    private validateSourceDefinition(source: SourceDefinition): void {
        const errors: string[] = [];
        
        if (!source.type) {
            errors.push('Source must have a type');
        }
        
        if (!source.config) {
            errors.push('Source must have a config');
        }
        
        if (errors.length > 0) {
            throw ErrorFactory.validation(errors, {
                sourceType: source.type,
            });
        }
    }
}

export default DataSourceRegistry;
