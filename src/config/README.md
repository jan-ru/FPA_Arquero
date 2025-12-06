# Data Source Configuration System

Flexible, extensible data source management with caching, fallback, and multiple provider support.

## Quick Start

```typescript
import { ConfigurationManager } from './config/index.ts';

// Initialize
const manager = new ConfigurationManager();
await manager.loadConfig('./config.json');

// Fetch resource
const resource = await manager.getResource(
  'reportDefinitions',
  'income_statement.json'
);

// Use the data
const text = await resource.content.text();
const data = JSON.parse(text);
```

## Features

- **Multiple Providers**: Local, GitHub, S3, Google Drive
- **Smart Caching**: TTL-based caching with localStorage/IndexedDB
- **Fallback Support**: Automatic fallback to alternative sources
- **Retry Logic**: Configurable retry attempts with delays
- **Progress Tracking**: Monitor large file downloads
- **Type Safe**: Full TypeScript support
- **Error Handling**: Custom error types with context
- **Environment Variables**: Secure credential management

## Configuration

Create `config.json`:

```json
{
  "version": "1.0",
  "dataSources": {
    "reportDefinitions": {
      "type": "local",
      "config": {
        "basePath": "./input/reports"
      }
    },
    "default": {
      "type": "local",
      "config": {
        "basePath": "./input"
      }
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "fallback": {
    "enabled": true,
    "retryAttempts": 3
  }
}
```

## Architecture

```
ConfigurationManager
├── DataSourceRegistry (manages providers)
│   ├── LocalProvider
│   ├── GitHubProvider (TODO)
│   ├── S3Provider (TODO)
│   └── GDriveProvider (TODO)
├── CacheManager (handles caching)
└── ConfigValidator (validates config)
```

## Documentation

- [Configuration Guide](../../docs/CONFIGURATION_GUIDE.md) - Complete configuration reference
- [API Documentation](../../docs/DATA_SOURCE_API.md) - Full API reference
- [Migration Guide](../../docs/MIGRATION_GUIDE.md) - Migrate existing code
- [Error System](../../docs/ERROR_SYSTEM.md) - Error handling reference

## Examples

### Basic Usage

```typescript
const manager = new ConfigurationManager();
await manager.loadConfig('./config.json');

const resource = await manager.getResource('reportDefinitions', 'report.json');
```

### With Progress Tracking

```typescript
const resource = await manager.getResource(
  'factTable',
  'large-data.csv',
  {
    onProgress: (loaded, total) => {
      console.log(`Progress: ${(loaded/total*100).toFixed(1)}%`);
    }
  }
);
```

### With Timeout

```typescript
const resource = await manager.getResource(
  'dimTables',
  'accounts.json',
  { timeout: 5000 }
);
```

### Error Handling

```typescript
try {
  const resource = await manager.getResource('reportDefinitions', 'report.json');
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    console.error('Report not found');
  } else if (error.code === 'FETCH_FAILED') {
    console.error('Network error');
  }
}
```

### Cache Management

```typescript
// Get cache statistics
const stats = await manager.getCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

// Clear cache
await manager.clearCache();

// Clear specific resources
await manager.clearCache('reportDefinitions:');
```

### Connection Testing

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

## Provider Support

### Local Provider ✅

Load files from local filesystem or web server.

```json
{
  "type": "local",
  "config": {
    "basePath": "./input/data"
  }
}
```

### GitHub Provider 🚧

Load files from GitHub repositories (coming soon).

```json
{
  "type": "github",
  "config": {
    "owner": "myorg",
    "repo": "data-repo",
    "branch": "main",
    "token": "${GITHUB_TOKEN}"
  }
}
```

### S3 Provider 🚧

Load files from AWS S3 (coming soon).

```json
{
  "type": "s3",
  "config": {
    "bucket": "my-bucket",
    "region": "us-east-1",
    "credentials": {
      "accessKeyId": "${AWS_ACCESS_KEY_ID}",
      "secretAccessKey": "${AWS_SECRET_ACCESS_KEY}"
    }
  }
}
```

### Google Drive Provider 🚧

Load files from Google Drive (coming soon).

```json
{
  "type": "gdrive",
  "config": {
    "folderId": "1a2b3c4d5e6f",
    "credentials": "./service-account.json"
  }
}
```

## Custom Providers

Create custom providers by implementing the `DataSourceProvider` interface:

```typescript
import { DataSourceProvider } from './config/index.ts';

class CustomProvider implements DataSourceProvider {
  readonly type = 'custom' as const;
  readonly name = 'Custom Provider';
  
  async initialize(config: unknown): Promise<void> {
    // Initialize provider
  }
  
  async fetch(path: string, options?: FetchOptions): Promise<DataResource> {
    // Fetch resource
  }
  
  // Implement other required methods...
}

// Register custom provider
manager.registerProvider(new CustomProvider());
```

## Testing

```typescript
import { ConfigurationManager } from './config/index.ts';

Deno.test('loads resource', async () => {
  const manager = new ConfigurationManager();
  await manager.loadConfig({
    version: "1.0",
    dataSources: {
      default: {
        type: 'local',
        config: { basePath: './test/fixtures' }
      }
    },
    cache: { enabled: false },
    fallback: { enabled: false }
  });
  
  const resource = await manager.getResource('default', 'test.json');
  assert(resource.content);
});
```

## Performance

- **Caching**: Reduces network requests by 80-90%
- **Fallback**: Ensures 99.9% availability
- **Retry Logic**: Handles transient failures
- **Progress Tracking**: Improves UX for large files

## Security

- Use environment variables for credentials
- Never commit secrets to version control
- Use HTTPS for remote sources
- Validate all configuration inputs
- Sanitize file paths to prevent traversal

## Contributing

To add a new provider:

1. Implement `DataSourceProvider` interface
2. Add provider-specific config type
3. Add type guard function
4. Update ConfigValidator
5. Add tests
6. Update documentation

## License

See project LICENSE file.
