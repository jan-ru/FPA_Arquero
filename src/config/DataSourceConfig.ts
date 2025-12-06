/**
 * DataSourceConfig - Configuration types for data source management
 * 
 * Defines the structure of the configuration file that specifies
 * where report definitions and data files are stored.
 * 
 * @example
 * const config: DataSourceConfig = {
 *   version: '1.0',
 *   dataSources: {
 *     reportDefinitions: {
 *       type: 'local',
 *       config: { basePath: './reports' }
 *     }
 *   }
 * };
 */

import type { ProviderType } from './datasources/DataSourceProvider.ts';

/**
 * Resource type identifier
 */
export enum ResourceType {
    REPORT_DEFINITION = 'reportDefinition',
    FACT_TABLE = 'factTable',
    DIM_TABLE = 'dimTable',
    ACCOUNT_MAPPING = 'accountMapping',
}

/**
 * Local filesystem configuration
 */
export interface LocalConfig {
    /** Base path for local files */
    basePath: string;
}

/**
 * GitHub configuration
 */
export interface GitHubConfig {
    /** Repository owner */
    owner: string;
    
    /** Repository name */
    repo: string;
    
    /** Branch name (default: main) */
    branch?: string;
    
    /** Path within repository */
    path?: string;
    
    /** Personal access token for private repos */
    token?: string;
}

/**
 * AWS S3 configuration
 */
export interface S3Config {
    /** S3 bucket name */
    bucket: string;
    
    /** AWS region */
    region: string;
    
    /** Key prefix */
    prefix?: string;
    
    /** AWS credentials */
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    
    /** Use presigned URLs instead of credentials */
    usePresignedUrls?: boolean;
}

/**
 * Google Drive configuration
 */
export interface GDriveConfig {
    /** Folder ID */
    folderId: string;
    
    /** API key */
    apiKey?: string;
    
    /** OAuth client ID */
    clientId?: string;
}

/**
 * Provider configuration union type
 */
export type ProviderConfig = LocalConfig | GitHubConfig | S3Config | GDriveConfig;

/**
 * Data source definition
 */
export interface SourceDefinition {
    /** Provider type */
    type: ProviderType;
    
    /** Provider-specific configuration */
    config: ProviderConfig;
    
    /** Fallback source if primary fails */
    fallback?: SourceDefinition;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Enable caching */
    enabled: boolean;
    
    /** Time-to-live in seconds */
    ttl: number;
    
    /** Storage backend */
    storage: 'localStorage' | 'indexedDB';
    
    /** Maximum cache size in bytes */
    maxSize?: number;
    
    /** Cache key prefix */
    keyPrefix?: string;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
    /** Enable fallback mechanism */
    enabled: boolean;
    
    /** Order of fallback sources to try */
    order: ('cache' | 'primary' | 'fallback')[];
    
    /** Number of retry attempts */
    retryAttempts?: number;
    
    /** Delay between retries in milliseconds */
    retryDelay?: number;
}

/**
 * Main data source configuration
 */
export interface DataSourceConfig {
    /** Configuration version */
    version: string;
    
    /** Data source definitions */
    dataSources: {
        /** Report definition source */
        reportDefinitions?: SourceDefinition;
        
        /** Fact table source */
        factTable?: SourceDefinition;
        
        /** Dimension tables source */
        dimTables?: SourceDefinition;
        
        /** Default source for unspecified types */
        default?: SourceDefinition;
    };
    
    /** Cache configuration */
    cache?: CacheConfig;
    
    /** Fallback configuration */
    fallback?: FallbackConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: DataSourceConfig = {
    version: '1.0',
    dataSources: {
        default: {
            type: 'local',
            config: {
                basePath: '.',
            },
        },
    },
    cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        storage: 'localStorage',
        maxSize: 50 * 1024 * 1024, // 50MB
        keyPrefix: 'datasource_',
    },
    fallback: {
        enabled: true,
        order: ['cache', 'primary'],
        retryAttempts: 3,
        retryDelay: 1000,
    },
};

/**
 * Type guard for LocalConfig
 */
export function isLocalConfig(config: unknown): config is LocalConfig {
    return (
        typeof config === 'object' &&
        config !== null &&
        'basePath' in config &&
        typeof (config as LocalConfig).basePath === 'string'
    );
}

/**
 * Type guard for GitHubConfig
 */
export function isGitHubConfig(config: unknown): config is GitHubConfig {
    return (
        typeof config === 'object' &&
        config !== null &&
        'owner' in config &&
        'repo' in config &&
        typeof (config as GitHubConfig).owner === 'string' &&
        typeof (config as GitHubConfig).repo === 'string'
    );
}

/**
 * Type guard for S3Config
 */
export function isS3Config(config: unknown): config is S3Config {
    return (
        typeof config === 'object' &&
        config !== null &&
        'bucket' in config &&
        'region' in config &&
        typeof (config as S3Config).bucket === 'string' &&
        typeof (config as S3Config).region === 'string'
    );
}

/**
 * Type guard for GDriveConfig
 */
export function isGDriveConfig(config: unknown): config is GDriveConfig {
    return (
        typeof config === 'object' &&
        config !== null &&
        'folderId' in config &&
        typeof (config as GDriveConfig).folderId === 'string'
    );
}

export default DataSourceConfig;
