/**
 * CacheManager - Manages caching of data source resources
 * 
 * Provides caching functionality with TTL support, statistics tracking,
 * and configurable storage backends (localStorage, indexedDB).
 * 
 * @example
 * const cache = new CacheManager({
 *   enabled: true,
 *   ttl: 3600,
 *   storage: 'localStorage'
 * });
 * 
 * await cache.set('key', resource);
 * const cached = await cache.get('key');
 */

import { ErrorFactory } from '../errors/index.ts';
import Logger from '../utils/Logger.ts';
import type { CacheConfig } from './DataSourceConfig.ts';
import type { DataResource } from './datasources/DataSourceProvider.ts';

/**
 * Cache entry with metadata
 */
interface CacheEntry {
    /** Cached resource */
    resource: DataResource;
    
    /** When entry was created */
    timestamp: Date;
    
    /** When entry expires */
    expiresAt: Date;
    
    /** Size in bytes */
    size: number;
    
    /** Number of times accessed */
    accessCount: number;
    
    /** Last access time */
    lastAccessed: Date;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    /** Total number of entries */
    totalEntries: number;
    
    /** Total size in bytes */
    totalSize: number;
    
    /** Cache hit rate (0-1) */
    hitRate: number;
    
    /** Oldest entry timestamp */
    oldestEntry?: Date;
    
    /** Newest entry timestamp */
    newestEntry?: Date;
    
    /** Number of hits */
    hits: number;
    
    /** Number of misses */
    misses: number;
}

/**
 * Cache storage interface
 */
interface CacheStorage {
    get(key: string): Promise<CacheEntry | null>;
    set(key: string, entry: CacheEntry): Promise<void>;
    delete(key: string): Promise<void>;
    clear(pattern?: string): Promise<void>;
    keys(): Promise<string[]>;
}

/**
 * localStorage-based cache storage
 */
class LocalStorageCache implements CacheStorage {
    private keyPrefix: string;
    
    constructor(keyPrefix: string = 'datasource_') {
        this.keyPrefix = keyPrefix;
    }
    
    async get(key: string): Promise<CacheEntry | null> {
        try {
            const item = localStorage.getItem(this.keyPrefix + key);
            if (!item) {
                return null;
            }
            
            const entry = JSON.parse(item);
            
            // Convert date strings back to Date objects
            entry.timestamp = new Date(entry.timestamp);
            entry.expiresAt = new Date(entry.expiresAt);
            entry.lastAccessed = new Date(entry.lastAccessed);
            entry.resource.metadata.lastModified = new Date(entry.resource.metadata.lastModified);
            
            return entry;
        } catch (error) {
            Logger.warn(`Failed to get cache entry ${key}:`, error);
            return null;
        }
    }
    
    async set(key: string, entry: CacheEntry): Promise<void> {
        try {
            const serialized = JSON.stringify(entry);
            localStorage.setItem(this.keyPrefix + key, serialized);
        } catch (error) {
            Logger.warn(`Failed to set cache entry ${key}:`, error);
            throw ErrorFactory.configLoadFailed('cache', error as Error);
        }
    }
    
    async delete(key: string): Promise<void> {
        localStorage.removeItem(this.keyPrefix + key);
    }
    
    async clear(pattern?: string): Promise<void> {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(this.keyPrefix)) {
                if (!pattern || key.includes(pattern)) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    
    async keys(): Promise<string[]> {
        const keys = Object.keys(localStorage);
        return keys
            .filter(key => key.startsWith(this.keyPrefix))
            .map(key => key.substring(this.keyPrefix.length));
    }
}

/**
 * Cache manager class
 */
export class CacheManager {
    private config: CacheConfig;
    private storage: CacheStorage;
    private stats: {
        hits: number;
        misses: number;
    };
    
    constructor(config: CacheConfig) {
        this.config = config;
        this.stats = { hits: 0, misses: 0 };
        
        // Initialize storage backend
        if (config.storage === 'localStorage') {
            this.storage = new LocalStorageCache(config.keyPrefix);
        } else {
            // TODO: Implement IndexedDB storage
            throw new Error('IndexedDB storage not yet implemented');
        }
    }
    
    /**
     * Get cached resource if available and not expired
     * 
     * @param key - Cache key
     * @param options - Get options
     * @returns Cached resource or null
     * 
     * @example
     * const resource = await cache.get('report:income_statement');
     * if (resource) {
     *   console.log('Cache hit!');
     * }
     */
    async get(key: string, options?: { ignoreExpiry?: boolean }): Promise<DataResource | null> {
        if (!this.config.enabled) {
            return null;
        }
        
        try {
            const entry = await this.storage.get(key);
            if (!entry) {
                this.stats.misses++;
                return null;
            }
            
            // Check expiration
            const now = new Date();
            if (!options?.ignoreExpiry && now > entry.expiresAt) {
                // Entry expired, remove it
                await this.storage.delete(key);
                this.stats.misses++;
                Logger.debug(`Cache entry expired: ${key}`);
                return null;
            }
            
            // Update access statistics
            entry.accessCount++;
            entry.lastAccessed = now;
            await this.storage.set(key, entry);
            
            this.stats.hits++;
            Logger.debug(`Cache hit: ${key}`);
            
            return entry.resource;
        } catch (error) {
            Logger.warn(`Cache get failed for ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }
    
    /**
     * Store resource in cache
     * 
     * @param key - Cache key
     * @param resource - Resource to cache
     * @param ttl - Time-to-live in seconds (optional)
     * 
     * @example
     * await cache.set('report:income_statement', resource, 3600);
     */
    async set(key: string, resource: DataResource, ttl?: number): Promise<void> {
        if (!this.config.enabled) {
            return;
        }
        
        try {
            const now = new Date();
            const effectiveTtl = ttl ?? this.config.ttl;
            const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);
            
            // Calculate size (rough estimate)
            const size = this.calculateSize(resource);
            
            // Check if we need to make space
            if (this.config.maxSize && size > this.config.maxSize) {
                Logger.warn(`Resource too large for cache: ${key} (${size} bytes)`);
                return;
            }
            
            const entry: CacheEntry = {
                resource,
                timestamp: now,
                expiresAt,
                size,
                accessCount: 0,
                lastAccessed: now,
            };
            
            await this.storage.set(key, entry);
            
            Logger.debug(`Cached resource: ${key}`, {
                size,
                expiresAt,
            });
            
        } catch (error) {
            Logger.warn(`Cache set failed for ${key}:`, error);
        }
    }
    
    /**
     * Check if cached resource exists and is valid
     * 
     * @param key - Cache key
     * @returns True if valid cached resource exists
     */
    async has(key: string): Promise<boolean> {
        const resource = await this.get(key);
        return resource !== null;
    }
    
    /**
     * Remove specific cached resource
     * 
     * @param key - Cache key
     * 
     * @example
     * await cache.delete('report:income_statement');
     */
    async delete(key: string): Promise<void> {
        await this.storage.delete(key);
        Logger.debug(`Deleted cache entry: ${key}`);
    }
    
    /**
     * Clear cached resources
     * 
     * @param pattern - Optional pattern to match keys
     * 
     * @example
     * await cache.clear(); // Clear all
     * await cache.clear('report:'); // Clear all reports
     */
    async clear(pattern?: string): Promise<void> {
        await this.storage.clear(pattern);
        
        // Reset stats if clearing all
        if (!pattern) {
            this.stats.hits = 0;
            this.stats.misses = 0;
        }
        
        Logger.info(`Cleared cache${pattern ? ` (pattern: ${pattern})` : ''}`);
    }
    
    /**
     * Get cache statistics
     * 
     * @returns Cache statistics
     * 
     * @example
     * const stats = await cache.getStats();
     * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
     */
    async getStats(): Promise<CacheStats> {
        try {
            const keys = await this.storage.keys();
            let totalSize = 0;
            let oldestEntry: Date | undefined;
            let newestEntry: Date | undefined;
            
            for (const key of keys) {
                const entry = await this.storage.get(key);
                if (entry) {
                    totalSize += entry.size;
                    
                    if (!oldestEntry || entry.timestamp < oldestEntry) {
                        oldestEntry = entry.timestamp;
                    }
                    
                    if (!newestEntry || entry.timestamp > newestEntry) {
                        newestEntry = entry.timestamp;
                    }
                }
            }
            
            const totalRequests = this.stats.hits + this.stats.misses;
            const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
            
            return {
                totalEntries: keys.length,
                totalSize,
                hitRate,
                oldestEntry,
                newestEntry,
                hits: this.stats.hits,
                misses: this.stats.misses,
            };
        } catch (error) {
            Logger.warn('Failed to get cache stats:', error);
            return {
                totalEntries: 0,
                totalSize: 0,
                hitRate: 0,
                hits: this.stats.hits,
                misses: this.stats.misses,
            };
        }
    }
    
    /**
     * Clean up expired entries
     * 
     * @returns Number of entries cleaned up
     */
    async cleanup(): Promise<number> {
        if (!this.config.enabled) {
            return 0;
        }
        
        try {
            const keys = await this.storage.keys();
            const now = new Date();
            let cleaned = 0;
            
            for (const key of keys) {
                const entry = await this.storage.get(key);
                if (entry && now > entry.expiresAt) {
                    await this.storage.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                Logger.info(`Cleaned up ${cleaned} expired cache entries`);
            }
            
            return cleaned;
        } catch (error) {
            Logger.warn('Cache cleanup failed:', error);
            return 0;
        }
    }
    
    /**
     * Generate cache key for resource
     * 
     * @param resourceType - Type of resource
     * @param resourceId - Resource identifier
     * @returns Cache key
     */
    static generateKey(resourceType: string, resourceId: string): string {
        return `${resourceType}:${resourceId}`;
    }
    
    /**
     * Calculate approximate size of resource
     */
    private calculateSize(resource: DataResource): number {
        try {
            if (resource.content instanceof Blob) {
                return resource.content.size;
            } else if (typeof resource.content === 'string') {
                return new Blob([resource.content]).size;
            } else if (resource.content instanceof ArrayBuffer) {
                return resource.content.byteLength;
            }
            
            // Fallback: estimate from JSON serialization
            return new Blob([JSON.stringify(resource)]).size;
        } catch {
            // Fallback estimate
            return 1024; // 1KB default
        }
    }
}

export default CacheManager;
