/**
 * Unit tests for CacheManager
 */

import './setup.ts'; // Mock Logger and localStorage
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { CacheManager } from '../../../src/config/CacheManager.ts';
import type { CacheConfig } from '../../../src/config/DataSourceConfig.ts';
import type { DataResource } from '../../../src/config/datasources/DataSourceProvider.ts';

// Helper to create test resource
function createTestResource(content: string): DataResource {
    return {
        content: new Blob([content]),
        metadata: {
            path: 'test.json',
            size: content.length,
            lastModified: new Date(),
            contentType: 'application/json',
        },
        source: 'test',
    };
}

// Helper to clear localStorage before each test
function clearTestCache() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
        if (key.startsWith('test_cache_')) {
            localStorage.removeItem(key);
        }
    }
}

Deno.test('CacheManager - initializes with config', () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    assertExists(cache);
});

Deno.test('CacheManager - set and get resource', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    const retrieved = await cache.get('test-key');
    
    assertExists(retrieved);
    assertEquals(retrieved.source, 'test');
});

Deno.test('CacheManager - returns null for missing key', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const retrieved = await cache.get('nonexistent');
    
    assertEquals(retrieved, null);
});

Deno.test('CacheManager - respects TTL expiration', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 1, // 1 second
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const retrieved = await cache.get('test-key');
    assertEquals(retrieved, null);
});

Deno.test('CacheManager - can get expired entries with ignoreExpiry', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 1, // 1 second
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const retrieved = await cache.get('test-key', { ignoreExpiry: true });
    assertExists(retrieved);
});

Deno.test('CacheManager - has() checks existence', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    
    const exists = await cache.has('test-key');
    assertEquals(exists, true);
    
    const notExists = await cache.has('nonexistent');
    assertEquals(notExists, false);
});

Deno.test('CacheManager - delete removes entry', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    await cache.delete('test-key');
    
    const retrieved = await cache.get('test-key');
    assertEquals(retrieved, null);
});

Deno.test('CacheManager - clear removes all entries', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('key1', resource);
    await cache.set('key2', resource);
    await cache.clear();
    
    const retrieved1 = await cache.get('key1');
    const retrieved2 = await cache.get('key2');
    
    assertEquals(retrieved1, null);
    assertEquals(retrieved2, null);
});

Deno.test('CacheManager - clear with pattern removes matching entries', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('report:income', resource);
    await cache.set('report:balance', resource);
    await cache.set('data:facts', resource);
    
    await cache.clear('report:');
    
    const report1 = await cache.get('report:income');
    const report2 = await cache.get('report:balance');
    const data = await cache.get('data:facts');
    
    assertEquals(report1, null);
    assertEquals(report2, null);
    assertExists(data); // Should still exist
});

Deno.test('CacheManager - getStats returns statistics', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('key1', resource);
    await cache.set('key2', resource);
    
    // Trigger some hits and misses
    await cache.get('key1'); // hit
    await cache.get('key2'); // hit
    await cache.get('nonexistent'); // miss
    
    const stats = await cache.getStats();
    
    assertEquals(stats.totalEntries, 2);
    assertEquals(stats.hits, 2);
    assertEquals(stats.misses, 1);
    assertEquals(stats.hitRate, 2 / 3);
});

Deno.test('CacheManager - cleanup removes expired entries', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 1, // 1 second
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('key1', resource);
    await cache.set('key2', resource);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const cleaned = await cache.cleanup();
    assertEquals(cleaned, 2);
});

Deno.test('CacheManager - generateKey creates consistent keys', () => {
    const key1 = CacheManager.generateKey('reportDefinitions', 'income_statement');
    const key2 = CacheManager.generateKey('reportDefinitions', 'income_statement');
    
    assertEquals(key1, key2);
    assertEquals(key1, 'reportDefinitions:income_statement');
});

Deno.test('CacheManager - respects enabled flag', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: false,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    const retrieved = await cache.get('test-key');
    
    // Should return null because cache is disabled
    assertEquals(retrieved, null);
});

Deno.test('CacheManager - tracks access count', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600,
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    await cache.set('test-key', resource);
    
    // Access multiple times
    await cache.get('test-key');
    await cache.get('test-key');
    await cache.get('test-key');
    
    // Access count should be tracked (though we can't directly verify without inspecting storage)
    const retrieved = await cache.get('test-key');
    assertExists(retrieved);
});

Deno.test('CacheManager - custom TTL overrides default', async () => {
    clearTestCache();
    
    const config: CacheConfig = {
        enabled: true,
        ttl: 3600, // Default 1 hour
        storage: 'localStorage',
        keyPrefix: 'test_cache_',
    };
    
    const cache = new CacheManager(config);
    const resource = createTestResource('test content');
    
    // Set with custom TTL of 1 second
    await cache.set('test-key', resource, 1);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const retrieved = await cache.get('test-key');
    assertEquals(retrieved, null);
});
