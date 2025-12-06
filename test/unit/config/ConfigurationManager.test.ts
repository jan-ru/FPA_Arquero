/**
 * Unit tests for ConfigurationManager
 */

import './setup.ts'; // Mock Logger and localStorage
import { assertEquals, assertExists, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ConfigurationManager } from '../../../src/config/ConfigurationManager.ts';
import type { DataSourceConfig } from '../../../src/config/DataSourceConfig.ts';

Deno.test('ConfigurationManager - initializes with defaults', () => {
    const manager = new ConfigurationManager();
    
    assertExists(manager);
    assertEquals(manager.isInitialized(), false);
});

Deno.test('ConfigurationManager - loads config from object', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    assertEquals(manager.isInitialized(), true);
});

Deno.test('ConfigurationManager - getConfig returns readonly copy', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    const retrievedConfig = manager.getConfig();
    
    assertEquals(retrievedConfig.version, '1.0');
    assertEquals(retrievedConfig.cache.enabled, false);
});

Deno.test('ConfigurationManager - rejects invalid config', async () => {
    const manager = new ConfigurationManager();
    
    const invalidConfig = {
        version: '1.0',
        dataSources: {}, // Empty dataSources
        cache: { enabled: false, ttl: 3600, storage: 'localStorage', keyPrefix: 'test_' },
        fallback: { enabled: false, order: ['cache', 'primary'], retryAttempts: 0, retryDelay: 0 },
    };
    
    await assertRejects(
        async () => await manager.loadConfig(invalidConfig as any),
        Error,
        'at least one'
    );
});

Deno.test('ConfigurationManager - validates config', () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    const result = manager.validateConfig(config);
    
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
});

Deno.test('ConfigurationManager - updateConfig validates before updating', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    // Valid update
    await manager.updateConfig({
        cache: {
            ...config.cache,
            ttl: 7200,
        },
    });
    
    const updated = manager.getConfig();
    assertEquals(updated.cache.ttl, 7200);
});

Deno.test('ConfigurationManager - updateConfig rejects invalid updates', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    // Invalid update - empty dataSources
    await assertRejects(
        async () => await manager.updateConfig({
            dataSources: {},
        }),
        Error
    );
});

Deno.test('ConfigurationManager - throws if getResource called before init', async () => {
    const manager = new ConfigurationManager();
    
    await assertRejects(
        async () => await manager.getResource('default' as any, 'test.json'),
        Error,
        'not initialized'
    );
});

Deno.test('ConfigurationManager - throws if testAllConnections called before init', async () => {
    const manager = new ConfigurationManager();
    
    await assertRejects(
        async () => await manager.testAllConnections(),
        Error,
        'not initialized'
    );
});

Deno.test('ConfigurationManager - getCacheStats returns null when cache disabled', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    const stats = await manager.getCacheStats();
    assertEquals(stats, null);
});

Deno.test('ConfigurationManager - clearCache works when cache disabled', async () => {
    const manager = new ConfigurationManager();
    
    const config: DataSourceConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
        cache: {
            enabled: false,
            ttl: 3600,
            storage: 'localStorage',
            keyPrefix: 'test_',
        },
        fallback: {
            enabled: false,
            order: ['cache', 'primary'],
            retryAttempts: 0,
            retryDelay: 0,
        },
    };
    
    await manager.loadConfig(config);
    
    // Should not throw
    await manager.clearCache();
});

Deno.test('ConfigurationManager - merges with defaults', async () => {
    const manager = new ConfigurationManager();
    
    const minimalConfig = {
        version: '1.0',
        dataSources: {
            default: {
                type: 'local',
                config: {
                    basePath: './test/fixtures',
                },
            },
        },
    };
    
    await manager.loadConfig(minimalConfig as any);
    
    const config = manager.getConfig();
    
    // Should have default cache config
    assertExists(config.cache);
    assertEquals(typeof config.cache.enabled, 'boolean');
    assertEquals(typeof config.cache.ttl, 'number');
    
    // Should have default fallback config
    assertExists(config.fallback);
    assertEquals(typeof config.fallback.enabled, 'boolean');
});
