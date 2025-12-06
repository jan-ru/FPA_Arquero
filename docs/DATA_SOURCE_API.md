# Data Source API Documentation

Complete API reference for the data source configuration system.

## Table of Contents

- [ConfigurationManager](#configurationmanager)
- [DataSourceRegistry](#datasourceregistry)
- [CacheManager](#cachemanager)
- [DataSourceProvider](#datasourceprovider)
- [ConfigValidator](#configvalidator)
- [Type Definitions](#type-definitions)

## ConfigurationManager

Central manager for data source configuration.

### Constructor

```typescript
const manager = new ConfigurationManager();
```

Creates a new configuration manager with default settings.

### Methods

#### loadConfig()

Load configuration from file or object.

```typescript
async loadConfig(source: string | DataSourceConfig): Promise<void>
```

**Parameters:**
- `source` - File path (string) or configuration object

**Throws:**
- `ConfigLoadError` - If file cannot be loaded
- `ValidationError` - If configuration is invalid

**Examples:**

```typescript
// Load from file
await manager.loadConfig('./config.json');

// Load from object
await manager.loadConfig({
  version: "1.0",
  dataSources: { ... }
});

// Environment-specific
const env = Deno.env.get('ENV') || 'dev';
await manager.loadConfig(`./config.${env}.json`);
```

#### getConfig()

Get current configuration (read-only).

```typescript
getConfig(): Readonly<DataSourceConfig>
```

**Returns:** Frozen copy of current configuration

**Example:**

```typescript
const config = manager.getConfig();
console.log('Version:', config.version);
console.log('Cache enabled:', config.cache.enabled);
```

#### updateConfig()

Update configuration at runtime.

```typescript
async updateConfig(updates: Partial<DataSourceConfig>): Promise<void>
```

**Parameters:**
- `updates` - Partial configuration updates

**Throws:**
- `ValidationError` - If updates are invalid

**Example:**

```typescript
// Disable cache
await manager.updateConfig({
  cache: { ...config.cache, enabled: false }
});

// Update TTL
await manager.updateConfig({
  cache: { ...config.cache, ttl: 7200 }
});
```

#### getResource()

Fetch a resource using configured data sources.

```typescript
async getResource(
  resourceType: ResourceType,
  resourceId: string,
  options?: FetchOptions
): Promise<DataResource>
```

**Parameters:**
- `resourceType` - Type of resource (reportDefinitions, factTable, etc.)
- `resourceId` - Resource identifier/path
- `options` - Optional fetch options

**Returns:** Promise resolving to the resource

**Throws:**
- `FileNotFoundError` - If resource not found
- `FetchError` - If fetch fails
- `ConfigurationError` - If not initialized

**Example:**

```typescript
// Fetch report definition
const report = await manager.getResource(
  'reportDefinitions',
  'income_statement.json'
);

// With progress tracking
const data = await manager.getResource(
  'factTable',
  'transactions.csv',
  {
    onProgress: (loaded, total) => {
      console.log(`Progress: ${(loaded/total*100).toFixed(1)}%`);
    }
  }
);

// With timeout
const resource = await manager.getResource(
  'dimTables',
  'accounts.json',
  { timeout: 5000 }
);
```

#### testAllConnections()

Test all configured data sources.

```typescript
async testAllConnections(): Promise<Map<string, ConnectionTestResult>>
```

**Returns:** Map of resource types to test results

**Example:**

```typescript
const results = await manager.testAllConnections();

for (const [resourceType, result] of results) {
  if (result.success) {
    console.log(`✓ ${resourceType}: ${result.responseTime}ms`);
  } else {
    console.error(`✗ ${resourceType}:`, result.error);
  }
}
```

#### validateConfig()

Validate a configuration object.

```typescript
validateConfig(config: DataSourceConfig): ValidationResult
```

**Parameters:**
- `config` - Configuration to validate

**Returns:** Validation result with errors and warnings

**Example:**

```typescript
const result = manager.validateConfig(config);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

#### registerProvider()

Register a custom provider.

```typescript
registerProvider(provider: DataSourceProvider): void
```

**Parameters:**
- `provider` - Provider instance to register

**Example:**

```typescript
import { CustomProvider } from './providers/CustomProvider.ts';

manager.registerProvider(new CustomProvider());
```

#### getCacheStats()

Get cache statistics.

```typescript
async getCacheStats(): Promise<CacheStats | null>
```

**Returns:** Cache statistics or null if cache disabled

**Example:**

```typescript
const stats = await manager.getCacheStats();

if (stats) {
  console.log(`Cache entries: ${stats.totalEntries}`);
  console.log(`Cache size: ${stats.totalSize} bytes`);
  console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}
```

#### clearCache()

Clear cached resources.

```typescript
async clearCache(pattern?: string): Promise<void>
```

**Parameters:**
- `pattern` - Optional pattern to match keys

**Example:**

```typescript
// Clear all cache
await manager.clearCache();

// Clear specific resources
await manager.clearCache('reportDefinitions:');
```

#### isInitialized()

Check if manager is initialized.

```typescript
isInitialized(): boolean
```

**Returns:** True if configuration loaded

**Example:**

```typescript
if (!manager.isInitialized()) {
  await manager.loadConfig('./config.json');
}
```

## DataSourceRegistry

Registry for managing data source providers.

### Methods

#### registerProvider()

Register a provider implementation.

```typescript
registerProvider(provider: DataSourceProvider): void
```

#### getProvider()

Get provider for a resource type.

```typescript
getProvider(resourceType: ResourceType): DataSourceProvider
```

#### configureSource()

Configure source mapping for a resource type.

```typescript
configureSource(resourceType: ResourceType, source: SourceDefinition): void
```

#### fetch()

Fetch resource using appropriate provider.

```typescript
async fetch(
  resourceType: ResourceType,
  resourceId: string,
  options?: FetchOptions
): Promise<DataResource>
```

## CacheManager

Manages caching of resources.

### Constructor

```typescript
const cache = new CacheManager(config: CacheConfig);
```

### Methods

#### get()

Get cached resource if available.

```typescript
async get(
  key: string,
  options?: { ignoreExpiry?: boolean }
): Promise<DataResource | null>
```

**Parameters:**
- `key` - Cache key
- `options.ignoreExpiry` - Return expired entries

**Returns:** Cached resource or null

**Example:**

```typescript
const resource = await cache.get('reportDefinitions:income_statement');

// Get even if expired
const expired = await cache.get('key', { ignoreExpiry: true });
```

#### set()

Store resource in cache.

```typescript
async set(
  key: string,
  resource: DataResource,
  ttl?: number
): Promise<void>
```

**Parameters:**
- `key` - Cache key
- `resource` - Resource to cache
- `ttl` - Optional TTL override (seconds)

**Example:**

```typescript
await cache.set('reportDefinitions:income_statement', resource);

// Custom TTL
await cache.set('key', resource, 7200); // 2 hours
```

#### has()

Check if cached resource exists.

```typescript
async has(key: string): Promise<boolean>
```

#### delete()

Remove cached resource.

```typescript
async delete(key: string): Promise<void>
```

#### clear()

Clear cached resources.

```typescript
async clear(pattern?: string): Promise<void>
```

#### getStats()

Get cache statistics.

```typescript
async getStats(): Promise<CacheStats>
```

#### cleanup()

Clean up expired entries.

```typescript
async cleanup(): Promise<number>
```

**Returns:** Number of entries cleaned up

#### generateKey()

Generate cache key for resource (static method).

```typescript
static generateKey(resourceType: string, resourceId: string): string
```

**Example:**

```typescript
const key = CacheManager.generateKey('reportDefinitions', 'income_statement');
// Returns: "reportDefinitions:income_statement"
```

## DataSourceProvider

Interface for data source providers.

### Properties

```typescript
readonly type: ProviderType;
readonly name: string;
```

### Methods

#### initialize()

Initialize provider with configuration.

```typescript
async initialize(config: unknown): Promise<void>
```

#### fetch()

Fetch a resource.

```typescript
async fetch(path: string, options?: FetchOptions): Promise<DataResource>
```

#### list()

List resources at a path.

```typescript
async list(path: string): Promise<ResourceMetadata[]>
```

#### exists()

Check if resource exists.

```typescript
async exists(path: string): Promise<boolean>
```

#### testConnection()

Test connectivity.

```typescript
async testConnection(): Promise<ConnectionTestResult>
```

#### getMetadata()

Get resource metadata without fetching content.

```typescript
async getMetadata(path: string): Promise<ResourceMetadata>
```

## ConfigValidator

Validates configuration objects.

### Methods

#### validateConfig()

Validate complete configuration.

```typescript
validateConfig(config: unknown): ValidationResult
```

#### validateSourceDefinition()

Validate source definition.

```typescript
validateSourceDefinition(source: unknown): ValidationResult
```

## Type Definitions

### DataSourceConfig

```typescript
interface DataSourceConfig {
  version: string;
  dataSources: {
    reportDefinitions?: SourceDefinition;
    factTable?: SourceDefinition;
    dimTables?: SourceDefinition;
    default?: SourceDefinition;
  };
  cache: CacheConfig;
  fallback: FallbackConfig;
}
```

### SourceDefinition

```typescript
interface SourceDefinition {
  type: ProviderType;
  config: ProviderConfig;
  fallback?: SourceDefinition;
}
```

### CacheConfig

```typescript
interface CacheConfig {
  enabled: boolean;
  ttl: number;
  storage: 'localStorage' | 'indexedDB';
  maxSize?: number;
  keyPrefix: string;
}
```

### FallbackConfig

```typescript
interface FallbackConfig {
  enabled: boolean;
  order: Array<'cache' | 'primary' | 'fallback'>;
  retryAttempts: number;
  retryDelay: number;
}
```

### DataResource

```typescript
interface DataResource {
  content: Blob | string | ArrayBuffer;
  metadata: ResourceMetadata;
  source: string;
}
```

### ResourceMetadata

```typescript
interface ResourceMetadata {
  path: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
}
```

### FetchOptions

```typescript
interface FetchOptions {
  timeout?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  onProgress?: (loaded: number, total: number) => void;
}
```

### ConnectionTestResult

```typescript
interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  error?: Error;
  details?: Record<string, unknown>;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### CacheStats

```typescript
interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  hits: number;
  misses: number;
}
```

### ResourceType

```typescript
type ResourceType = 
  | 'reportDefinitions'
  | 'factTable'
  | 'dimTables'
  | 'default';
```

### ProviderType

```typescript
type ProviderType = 
  | 'local'
  | 'github'
  | 's3'
  | 'gdrive';
```

## Complete Example

```typescript
import { ConfigurationManager } from './config/index.ts';

// Initialize
const manager = new ConfigurationManager();
await manager.loadConfig('./config.json');

// Test connections
const testResults = await manager.testAllConnections();
console.log('Connection tests:', testResults);

// Fetch resource with progress
const report = await manager.getResource(
  'reportDefinitions',
  'income_statement.json',
  {
    timeout: 10000,
    onProgress: (loaded, total) => {
      const percent = (loaded / total * 100).toFixed(1);
      console.log(`Loading: ${percent}%`);
    }
  }
);

// Parse content
const text = await report.content.text();
const data = JSON.parse(text);

// Check cache stats
const stats = await manager.getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

// Clear cache for specific resource type
await manager.clearCache('reportDefinitions:');
```

## Error Handling

All methods may throw custom errors. Always wrap in try-catch:

```typescript
try {
  const resource = await manager.getResource('reportDefinitions', 'report.json');
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    console.error('Report not found');
  } else if (error.code === 'FETCH_FAILED') {
    console.error('Network error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

See [Error System Documentation](./ERROR_SYSTEM.md) for complete error reference.

## See Also

- [Configuration Guide](./CONFIGURATION_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Error System](./ERROR_SYSTEM.md)
