/**
 * ConfigValidator - Validates data source configuration
 * 
 * Provides comprehensive validation of configuration objects to ensure
 * they are well-formed and contain all required properties.
 * 
 * @example
 * const validator = new ConfigValidator();
 * const result = validator.validateConfig(config);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */

import type {
    DataSourceConfig,
    SourceDefinition,
    ProviderConfig,
    CacheConfig,
    FallbackConfig,
} from './DataSourceConfig.ts';
import {
    isLocalConfig,
    isGitHubConfig,
    isS3Config,
    isGDriveConfig,
} from './DataSourceConfig.ts';
import type { ProviderType } from './datasources/DataSourceProvider.ts';

/**
 * Validation result
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    
    /** List of validation errors */
    errors: string[];
    
    /** List of validation warnings */
    warnings: string[];
}

/**
 * ConfigValidator class
 */
export class ConfigValidator {
    private errors: string[] = [];
    private warnings: string[] = [];
    
    /**
     * Validate a complete configuration object
     * 
     * @param config - Configuration to validate
     * @returns Validation result
     * 
     * @example
     * const result = validator.validateConfig(config);
     * if (!result.valid) {
     *   result.errors.forEach(err => console.error(err));
     * }
     */
    validateConfig(config: unknown): ValidationResult {
        this.errors = [];
        this.warnings = [];
        
        // Check if config is an object
        if (!config || typeof config !== 'object') {
            this.errors.push('Configuration must be an object');
            return this.getResult();
        }
        
        const cfg = config as Partial<DataSourceConfig>;
        
        // Validate version
        this.validateVersion(cfg.version);
        
        // Validate data sources
        this.validateDataSources(cfg.dataSources);
        
        // Validate cache config
        if (cfg.cache) {
            this.validateCacheConfig(cfg.cache);
        }
        
        // Validate fallback config
        if (cfg.fallback) {
            this.validateFallbackConfig(cfg.fallback);
        }
        
        return this.getResult();
    }
    
    /**
     * Validate version string
     */
    private validateVersion(version: unknown): void {
        if (!version) {
            this.errors.push('Configuration version is required');
            return;
        }
        
        if (typeof version !== 'string') {
            this.errors.push('Configuration version must be a string');
            return;
        }
        
        // Check version format (e.g., "1.0")
        if (!/^\d+\.\d+$/.test(version)) {
            this.warnings.push('Version should follow format "major.minor" (e.g., "1.0")');
        }
    }
    
    /**
     * Validate data sources configuration
     */
    private validateDataSources(
        dataSources: unknown
    ): void {
        if (!dataSources) {
            this.errors.push('dataSources configuration is required');
            return;
        }
        
        if (typeof dataSources !== 'object') {
            this.errors.push('dataSources must be an object');
            return;
        }
        
        const sources = dataSources as Record<string, unknown>;
        
        // Check if at least one source is defined
        const hasAnySource = Object.keys(sources).some(
            key => sources[key] !== undefined && sources[key] !== null
        );
        
        if (!hasAnySource) {
            this.errors.push('At least one data source must be configured');
            return;
        }
        
        // Validate each source definition
        for (const [key, value] of Object.entries(sources)) {
            if (value !== undefined && value !== null) {
                this.validateSourceDefinition(value, `dataSources.${key}`);
            }
        }
    }
    
    /**
     * Validate a source definition
     */
    private validateSourceDefinition(
        source: unknown,
        path: string
    ): void {
        if (!source || typeof source !== 'object') {
            this.errors.push(`${path} must be an object`);
            return;
        }
        
        const src = source as Partial<SourceDefinition>;
        
        // Validate type
        if (!src.type) {
            this.errors.push(`${path}.type is required`);
        } else if (!this.isValidProviderType(src.type)) {
            this.errors.push(
                `${path}.type must be one of: local, github, s3, gdrive (got: ${src.type})`
            );
        }
        
        // Validate config
        if (!src.config) {
            this.errors.push(`${path}.config is required`);
        } else if (src.type) {
            this.validateProviderConfig(src.type, src.config, `${path}.config`);
        }
        
        // Validate fallback if present
        if (src.fallback) {
            this.validateSourceDefinition(src.fallback, `${path}.fallback`);
        }
    }
    
    /**
     * Check if provider type is valid
     */
    private isValidProviderType(type: unknown): type is ProviderType {
        return (
            type === 'local' ||
            type === 'github' ||
            type === 's3' ||
            type === 'gdrive'
        );
    }
    
    /**
     * Validate provider-specific configuration
     */
    private validateProviderConfig(
        type: ProviderType,
        config: unknown,
        path: string
    ): void {
        if (!config || typeof config !== 'object') {
            this.errors.push(`${path} must be an object`);
            return;
        }
        
        switch (type) {
            case 'local':
                this.validateLocalConfig(config, path);
                break;
            case 'github':
                this.validateGitHubConfig(config, path);
                break;
            case 's3':
                this.validateS3Config(config, path);
                break;
            case 'gdrive':
                this.validateGDriveConfig(config, path);
                break;
        }
    }
    
    /**
     * Validate local provider configuration
     */
    private validateLocalConfig(config: unknown, path: string): void {
        if (!isLocalConfig(config)) {
            this.errors.push(`${path}.basePath is required for local provider`);
            return;
        }
        
        if (!config.basePath || config.basePath.trim() === '') {
            this.errors.push(`${path}.basePath cannot be empty`);
        }
    }
    
    /**
     * Validate GitHub provider configuration
     */
    private validateGitHubConfig(config: unknown, path: string): void {
        if (!isGitHubConfig(config)) {
            this.errors.push(`${path} must have owner and repo for GitHub provider`);
            return;
        }
        
        if (!config.owner || config.owner.trim() === '') {
            this.errors.push(`${path}.owner cannot be empty`);
        }
        
        if (!config.repo || config.repo.trim() === '') {
            this.errors.push(`${path}.repo cannot be empty`);
        }
        
        if (config.branch && config.branch.trim() === '') {
            this.errors.push(`${path}.branch cannot be empty if specified`);
        }
    }
    
    /**
     * Validate S3 provider configuration
     */
    private validateS3Config(config: unknown, path: string): void {
        if (!isS3Config(config)) {
            this.errors.push(`${path} must have bucket and region for S3 provider`);
            return;
        }
        
        if (!config.bucket || config.bucket.trim() === '') {
            this.errors.push(`${path}.bucket cannot be empty`);
        }
        
        if (!config.region || config.region.trim() === '') {
            this.errors.push(`${path}.region cannot be empty`);
        }
        
        // Validate credentials if present
        if (config.credentials) {
            const creds = config.credentials;
            if (!creds.accessKeyId || !creds.secretAccessKey) {
                this.errors.push(
                    `${path}.credentials must have accessKeyId and secretAccessKey`
                );
            }
        }
        
        // Warn if neither credentials nor presigned URLs
        if (!config.credentials && !config.usePresignedUrls) {
            this.warnings.push(
                `${path}: No credentials or presigned URLs configured. Access may fail.`
            );
        }
    }
    
    /**
     * Validate Google Drive provider configuration
     */
    private validateGDriveConfig(config: unknown, path: string): void {
        if (!isGDriveConfig(config)) {
            this.errors.push(`${path}.folderId is required for Google Drive provider`);
            return;
        }
        
        if (!config.folderId || config.folderId.trim() === '') {
            this.errors.push(`${path}.folderId cannot be empty`);
        }
        
        // Warn if no authentication
        if (!config.apiKey && !config.clientId) {
            this.warnings.push(
                `${path}: No apiKey or clientId configured. Access may be limited.`
            );
        }
    }
    
    /**
     * Validate cache configuration
     */
    private validateCacheConfig(cache: unknown): void {
        if (typeof cache !== 'object' || cache === null) {
            this.errors.push('cache configuration must be an object');
            return;
        }
        
        const cfg = cache as Partial<CacheConfig>;
        
        if (typeof cfg.enabled !== 'boolean') {
            this.errors.push('cache.enabled must be a boolean');
        }
        
        if (cfg.ttl !== undefined) {
            if (typeof cfg.ttl !== 'number') {
                this.errors.push('cache.ttl must be a number');
            } else if (cfg.ttl < 0) {
                this.errors.push('cache.ttl must be non-negative');
            }
        }
        
        if (cfg.storage && cfg.storage !== 'localStorage' && cfg.storage !== 'indexedDB') {
            this.errors.push('cache.storage must be "localStorage" or "indexedDB"');
        }
        
        if (cfg.maxSize !== undefined) {
            if (typeof cfg.maxSize !== 'number') {
                this.errors.push('cache.maxSize must be a number');
            } else if (cfg.maxSize <= 0) {
                this.errors.push('cache.maxSize must be positive');
            }
        }
    }
    
    /**
     * Validate fallback configuration
     */
    private validateFallbackConfig(fallback: unknown): void {
        if (typeof fallback !== 'object' || fallback === null) {
            this.errors.push('fallback configuration must be an object');
            return;
        }
        
        const cfg = fallback as Partial<FallbackConfig>;
        
        if (typeof cfg.enabled !== 'boolean') {
            this.errors.push('fallback.enabled must be a boolean');
        }
        
        if (cfg.order) {
            if (!Array.isArray(cfg.order)) {
                this.errors.push('fallback.order must be an array');
            } else {
                const validSources = ['cache', 'primary', 'fallback'];
                for (const source of cfg.order) {
                    if (!validSources.includes(source)) {
                        this.errors.push(
                            `fallback.order contains invalid source: ${source}`
                        );
                    }
                }
            }
        }
        
        if (cfg.retryAttempts !== undefined) {
            if (typeof cfg.retryAttempts !== 'number') {
                this.errors.push('fallback.retryAttempts must be a number');
            } else if (cfg.retryAttempts < 0) {
                this.errors.push('fallback.retryAttempts must be non-negative');
            }
        }
        
        if (cfg.retryDelay !== undefined) {
            if (typeof cfg.retryDelay !== 'number') {
                this.errors.push('fallback.retryDelay must be a number');
            } else if (cfg.retryDelay < 0) {
                this.errors.push('fallback.retryDelay must be non-negative');
            }
        }
    }
    
    /**
     * Get validation result
     */
    private getResult(): ValidationResult {
        return {
            valid: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings],
        };
    }
}

export default ConfigValidator;
