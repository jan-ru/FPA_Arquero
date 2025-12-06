# Data Source Configuration Guide

This guide explains how to configure the data source management system for your application.

## Table of Contents

- [Overview](#overview)
- [Configuration File Structure](#configuration-file-structure)
- [Data Source Providers](#data-source-providers)
- [Cache Configuration](#cache-configuration)
- [Fallback and Retry](#fallback-and-retry)
- [Environment Variables](#environment-variables)
- [Examples](#examples)

## Overview

The data source configuration system provides a flexible way to manage where your application loads data from. It supports:

- Multiple data source providers (local, GitHub, S3, Google Drive)
- Caching with TTL support
- Fallback sources and retry logic
- Environment variable substitution

## Configuration File Structure

The configuration file is a JSON file with the following structure:

```json
{
  "version": "1.0",
  "dataSources": { ... },
  "cache": { ... },
  "fallback": { ... }
}
```

### Version

The `version` field specifies the configuration format version (e.g., "1.0").

### Data Sources

The `dataSources` object maps resource types to their source configurations:

```json
{
  "dataSources": {
    "reportDefinitions": { ... },
    "factTable": { ... },
    "dimTables": { ... },
    "default": { ... }
  }
}
```

**Resource Types:**
- `reportDefinitions` - Report definition JSON files
- `factTable` - Fact table data files
- `dimTables` - Dimension table data files
- `default` - Default source for unspecified types

Each source definition has:
- `type` - Provider type (local, github, s3, gdrive)
- `config` - Provider-specific configuration
- `fallback` - Optional fallback source

## Data Source Providers

### Local Provider

Loads files from the local filesystem or web server.

```json
{
  "type": "local",
  "config": {
    "basePath": "./input/data"
  }
}
```

**Configuration:**
- `basePath` - Base path for files (relative or absolute)

**Example paths:**
- `./input/data` - Relative to application root
- `/var/data` - Absolute path
- `https://example.com/data` - Remote URL

### GitHub Provider

Loads files from a GitHub repository.

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

**Configuration:**
- `owner` - Repository owner (required)
- `repo` - Repository name (required)
- `branch` - Branch name (optional, defaults to "main")
- `token` - Personal access token (optional, for private repos)

### S3 Provider

Loads files from AWS S3.

```json
{
  "type": "s3",
  "config": {
    "bucket": "my-data-bucket",
    "region": "us-east-1",
    "prefix": "data/",
    "credentials": {
      "accessKeyId": "${AWS_ACCESS_KEY_ID}",
      "secretAccessKey": "${AWS_SECRET_ACCESS_KEY}"
    }
  }
}
```

**Configuration:**
- `bucket` - S3 bucket name (required)
- `region` - AWS region (required)
- `prefix` - Key prefix (optional)
- `credentials` - AWS credentials (optional if using IAM roles)

### Google Drive Provider

Loads files from Google Drive.

```json
{
  "type": "gdrive",
  "config": {
    "folderId": "1a2b3c4d5e6f",
    "credentials": "./service-account.json"
  }
}
```

**Configuration:**
- `folderId` - Google Drive folder ID (required)
- `credentials` - Path to service account JSON (optional)

## Cache Configuration

The cache stores fetched resources to improve performance.

```json
{
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "storage": "localStorage",
    "maxSize": 10485760,
    "keyPrefix": "datasource_"
  }
}
```

**Options:**
- `enabled` - Enable/disable caching (default: true)
- `ttl` - Time-to-live in seconds (default: 3600 = 1 hour)
- `storage` - Storage backend: "localStorage" or "indexedDB"
- `maxSize` - Maximum cache size in bytes (optional)
- `keyPrefix` - Prefix for cache keys (default: "datasource_")

**Cache Behavior:**
1. Check cache first on every request
2. Return cached resource if valid (not expired)
3. Fetch from provider if cache miss
4. Store fetched resource in cache
5. Use expired cache as last resort if fetch fails

## Fallback and Retry

Configure fallback sources and retry behavior.

```json
{
  "fallback": {
    "enabled": true,
    "order": ["cache", "primary", "fallback"],
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

**Options:**
- `enabled` - Enable/disable fallback (default: true)
- `order` - Order to try sources (default: ["cache", "primary", "fallback"])
- `retryAttempts` - Number of retry attempts (default: 3)
- `retryDelay` - Delay between retries in ms (default: 1000)

**Fallback Order:**
1. **cache** - Try cache first (if enabled)
2. **primary** - Try primary source
3. **fallback** - Try fallback source (if configured)

**Retry Behavior:**
- Retries primary source on failure
- Waits `retryDelay` ms between attempts
- Tries fallback source after all retries fail
- Uses expired cache as last resort

### Configuring Fallback Sources

Add a `fallback` property to any source definition:

```json
{
  "reportDefinitions": {
    "type": "github",
    "config": { ... },
    "fallback": {
      "type": "local",
      "config": {
        "basePath": "./backup/reports"
      }
    }
  }
}
```

## Environment Variables

Use `${VAR_NAME}` syntax to reference environment variables:

```json
{
  "type": "github",
  "config": {
    "token": "${GITHUB_TOKEN}"
  }
}
```

**Setting Environment Variables:**

In Deno:
```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
deno run --allow-env app.ts
```

In browser (for development):
```javascript
window.env = {
  GITHUB_TOKEN: "ghp_xxxxxxxxxxxx"
};
```

**Security Note:** Never commit credentials to version control. Always use environment variables for sensitive data.

## Examples

### Basic Local Configuration

```json
{
  "version": "1.0",
  "dataSources": {
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
  }
}
```

### Multi-Source with Fallback

```json
{
  "version": "1.0",
  "dataSources": {
    "reportDefinitions": {
      "type": "github",
      "config": {
        "owner": "myorg",
        "repo": "reports",
        "token": "${GITHUB_TOKEN}"
      },
      "fallback": {
        "type": "local",
        "config": {
          "basePath": "./backup/reports"
        }
      }
    },
    "factTable": {
      "type": "s3",
      "config": {
        "bucket": "data-bucket",
        "region": "us-east-1",
        "credentials": {
          "accessKeyId": "${AWS_ACCESS_KEY_ID}",
          "secretAccessKey": "${AWS_SECRET_ACCESS_KEY}"
        }
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
    "ttl": 7200,
    "storage": "localStorage"
  },
  "fallback": {
    "enabled": true,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

### Development vs Production

**Development (config.dev.json):**
```json
{
  "version": "1.0",
  "dataSources": {
    "default": {
      "type": "local",
      "config": {
        "basePath": "./input"
      }
    }
  },
  "cache": {
    "enabled": false
  }
}
```

**Production (config.prod.json):**
```json
{
  "version": "1.0",
  "dataSources": {
    "reportDefinitions": {
      "type": "s3",
      "config": {
        "bucket": "prod-reports",
        "region": "us-east-1"
      }
    },
    "factTable": {
      "type": "s3",
      "config": {
        "bucket": "prod-data",
        "region": "us-east-1"
      }
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "storage": "indexedDB"
  },
  "fallback": {
    "enabled": true,
    "retryAttempts": 5
  }
}
```

## Loading Configuration

### From File

```typescript
import { ConfigurationManager } from './config/index.ts';

const manager = new ConfigurationManager();
await manager.loadConfig('./config.json');
```

### From Object

```typescript
const config = {
  version: "1.0",
  dataSources: { ... },
  cache: { ... }
};

await manager.loadConfig(config);
```

### Environment-Specific

```typescript
const env = Deno.env.get('ENV') || 'development';
const configPath = `./config.${env}.json`;

await manager.loadConfig(configPath);
```

## Troubleshooting

### Configuration Not Loading

**Error:** "Configuration file not found"
- Check file path is correct
- Ensure file exists and is readable
- Use absolute path if relative path fails

### Invalid Configuration

**Error:** "Configuration validation failed"
- Check JSON syntax is valid
- Ensure all required fields are present
- Verify provider-specific config is correct

### Environment Variables Not Substituted

**Error:** "Environment variable not set"
- Ensure variable is exported before running
- Check variable name matches exactly
- Use `--allow-env` flag in Deno

### Cache Not Working

- Check `cache.enabled` is true
- Verify storage backend is supported
- Check browser localStorage is available
- Clear cache if stale data persists

### Fallback Not Triggering

- Ensure `fallback.enabled` is true
- Verify fallback source is configured
- Check primary source is actually failing
- Review logs for fallback attempts

## Best Practices

1. **Use environment variables** for sensitive data
2. **Enable caching** in production for better performance
3. **Configure fallback sources** for critical resources
4. **Set appropriate TTL** based on data update frequency
5. **Test configuration** before deploying to production
6. **Use different configs** for dev/staging/prod environments
7. **Monitor cache hit rates** to optimize TTL settings
8. **Keep backup sources** in sync with primary sources

## See Also

- [API Documentation](./API_DOCUMENTATION.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Error System](./ERROR_SYSTEM.md)
