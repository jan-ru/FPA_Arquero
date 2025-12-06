/**
 * Configuration module exports
 * 
 * Central export point for all configuration-related classes and types.
 * 
 * @example
 * import { ConfigurationManager } from './config/index.ts';
 * 
 * const manager = new ConfigurationManager();
 * await manager.loadConfig('./config.json');
 * 
 * const resource = await manager.getResource(
 *   'reportDefinitions',
 *   'income_statement.json'
 * );
 */

// Core configuration types
export type {
    DataSourceConfig,
    SourceDefinition,
    CacheConfig,
    FallbackConfig,
    ProviderConfig,
    LocalConfig,
    GitHubConfig,
    S3Config,
    GDriveConfig,
    ResourceType,
} from './DataSourceConfig.ts';

export {
    DEFAULT_CONFIG,
    isLocalConfig,
    isGitHubConfig,
    isS3Config,
    isGDriveConfig,
} from './DataSourceConfig.ts';

// Configuration management
export { ConfigurationManager } from './ConfigurationManager.ts';
export { ConfigValidator, type ValidationResult } from './ConfigValidator.ts';
export { DataSourceRegistry } from './DataSourceRegistry.ts';
export { CacheManager, type CacheStats } from './CacheManager.ts';

// Data source providers
export type {
    DataSourceProvider,
    DataResource,
    ResourceMetadata,
    FetchOptions,
    ConnectionTestResult,
    ProviderType,
} from './datasources/DataSourceProvider.ts';

export { LocalProvider } from './datasources/LocalProvider.ts';

// Default export for convenience
export { ConfigurationManager as default } from './ConfigurationManager.ts';
