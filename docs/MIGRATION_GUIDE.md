# Migration Guide

Guide for migrating existing code to use the new data source configuration system.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Code Examples](#code-examples)
- [Backward Compatibility](#backward-compatibility)
- [Testing](#testing)

## Overview

The new data source configuration system provides:
- Centralized configuration management
- Multiple data source providers
- Built-in caching with TTL
- Fallback and retry mechanisms
- Better error handling

This guide helps you migrate from direct file loading to the new system.

## Breaking Changes

### 1. Direct fetch() Calls

**Before:**
```typescript
const response = await fetch('./input/reports/income_statement.json');
const data = await response.json();
```

**After:**
```typescript
const manager = new ConfigurationManager();
await manager.loadConfig('./config.json');

const resource = await manager.getResource(
  'reportDefinitions',
  'income_statement.json'
);
const text = await resource.content.text();
const data = JSON.parse(text);
```

### 2. Error Handling

**Before:**
```typescript
try {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  console.error('Fetch failed:', error);
}
```

**After:**
```typescript
try {
  const resource = await manager.getResource(type, id);
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    // Handle missing file
  } else if (error.code === 'FETCH_FAILED') {
    // Handle network error
  }
}
```

### 3. File Paths

**Before:**
```typescript
const reportPath = `./input/reports/${reportId}.json`;
```

**After:**
```typescript
// Path is relative to configured basePath
const resource = await manager.getResource('reportDefinitions', `${reportId}.json`);
```

## Migration Steps

### Step 1: Create Configuration File

Create `config.json` in your project root:

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
    "factTable": {
      "type": "local",
      "config": {
        "basePath": "./input/data"
      }
    },
    "dimTables": {
      "type": "local",
      "config": {
        "basePath": "./input/data"
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
    "retryAttempts": 2
  }
}
```

### Step 2: Initialize ConfigurationManager

Add initialization code to your application entry point:

```typescript
import { ConfigurationManager } from './config/index.ts';

// Create global instance
export const configManager = new ConfigurationManager();

// Initialize on startup
await configManager.loadConfig('./config.json');
```

### Step 3: Update Data Loaders

#### ReportLoader Migration

**Before:**
```typescript
class ReportLoader {
  async loadReport(reportId: string): Promise<ReportDefinition> {
    const path = `./input/reports/${reportId}.json`;
    const response = await fetch(path);
    
    if (!response.ok) {
      throw new Error(`Failed to load report: ${reportId}`);
    }
    
    return await response.json();
  }
}
```

**After:**
```typescript
import { configManager } from './app.ts';

class ReportLoader {
  async loadReport(reportId: string): Promise<ReportDefinition> {
    const resource = await configManager.getResource(
      'reportDefinitions',
      `${reportId}.json`
    );
    
    const text = await resource.content.text();
    return JSON.parse(text);
  }
}
```

#### DataLoader Migration

**Before:**
```typescript
class DataLoader {
  async loadFactTable(filename: string): Promise<any[]> {
    const path = `./input/data/${filename}`;
    const response = await fetch(path);
    const text = await response.text();
    return this.parseCSV(text);
  }
}
```

**After:**
```typescript
class DataLoader {
  async loadFactTable(filename: string): Promise<any[]> {
    const resource = await configManager.getResource(
      'factTable',
      filename
    );
    
    const text = await resource.content.text();
    return this.parseCSV(text);
  }
}
```

### Step 4: Update Error Handling

Replace generic error handling with specific error types:

**Before:**
```typescript
try {
  const data = await loadData(id);
} catch (error) {
  console.error('Load failed:', error.message);
}
```

**After:**
```typescript
import { ErrorFactory } from './errors/index.ts';

try {
  const data = await loadData(id);
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    console.error(`File not found: ${id}`);
  } else if (error.code === 'FETCH_FAILED') {
    console.error(`Network error: ${error.message}`);
  } else if (error.code === 'FILE_PARSE_ERROR') {
    console.error(`Parse error: ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Step 5: Add Progress Tracking (Optional)

For large files, add progress tracking:

```typescript
const resource = await configManager.getResource(
  'factTable',
  'large-dataset.csv',
  {
    onProgress: (loaded, total) => {
      const percent = (loaded / total * 100).toFixed(1);
      updateProgressBar(percent);
    }
  }
);
```

## Code Examples

### Example 1: Simple Migration

**Before:**
```typescript
async function loadReport(id: string) {
  const response = await fetch(`./input/reports/${id}.json`);
  return await response.json();
}
```

**After:**
```typescript
import { configManager } from './app.ts';

async function loadReport(id: string) {
  const resource = await configManager.getResource(
    'reportDefinitions',
    `${id}.json`
  );
  const text = await resource.content.text();
  return JSON.parse(text);
}
```

### Example 2: With Error Handling

**Before:**
```typescript
async function loadData(filename: string) {
  try {
    const response = await fetch(`./input/data/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Load failed:', error);
    return null;
  }
}
```

**After:**
```typescript
async function loadData(filename: string) {
  try {
    const resource = await configManager.getResource(
      'factTable',
      filename
    );
    return await resource.content.text();
  } catch (error) {
    if (error.code === 'FILE_NOT_FOUND') {
      console.error(`File not found: ${filename}`);
    } else {
      console.error('Load failed:', error);
    }
    return null;
  }
}
```

### Example 3: With Caching

**Before:**
```typescript
class DataCache {
  private cache = new Map();
  
  async getData(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const response = await fetch(`./data/${id}`);
    const data = await response.json();
    this.cache.set(id, data);
    return data;
  }
}
```

**After:**
```typescript
// Caching is automatic!
async function getData(id: string) {
  const resource = await configManager.getResource('default', id);
  const text = await resource.content.text();
  return JSON.parse(text);
}

// Check cache stats
const stats = await configManager.getCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Example 4: With Fallback

**Before:**
```typescript
async function loadWithFallback(id: string) {
  try {
    return await fetch(`./primary/${id}`);
  } catch {
    return await fetch(`./backup/${id}`);
  }
}
```

**After:**
```typescript
// Configure in config.json:
{
  "dataSources": {
    "default": {
      "type": "local",
      "config": { "basePath": "./primary" },
      "fallback": {
        "type": "local",
        "config": { "basePath": "./backup" }
      }
    }
  }
}

// Fallback is automatic!
const resource = await configManager.getResource('default', id);
```

## Backward Compatibility

### Maintaining Old API

If you need to maintain backward compatibility, create wrapper functions:

```typescript
// Old API
export async function loadReport(id: string): Promise<ReportDefinition> {
  const resource = await configManager.getResource(
    'reportDefinitions',
    `${id}.json`
  );
  const text = await resource.content.text();
  return JSON.parse(text);
}

// New API (for new code)
export async function getReport(id: string): Promise<DataResource> {
  return await configManager.getResource('reportDefinitions', `${id}.json`);
}
```

### Gradual Migration

Migrate one module at a time:

1. **Phase 1:** Initialize ConfigurationManager
2. **Phase 2:** Migrate ReportLoader
3. **Phase 3:** Migrate DataLoader
4. **Phase 4:** Migrate remaining modules
5. **Phase 5:** Remove old code

## Testing

### Unit Tests

Update unit tests to use ConfigurationManager:

**Before:**
```typescript
Deno.test('loads report', async () => {
  const report = await loadReport('test');
  assertEquals(report.id, 'test');
});
```

**After:**
```typescript
Deno.test('loads report', async () => {
  const manager = new ConfigurationManager();
  await manager.loadConfig({
    version: "1.0",
    dataSources: {
      reportDefinitions: {
        type: 'local',
        config: { basePath: './test/fixtures' }
      }
    },
    cache: { enabled: false },
    fallback: { enabled: false }
  });
  
  const resource = await manager.getResource(
    'reportDefinitions',
    'test.json'
  );
  const text = await resource.content.text();
  const report = JSON.parse(text);
  
  assertEquals(report.id, 'test');
});
```

### Integration Tests

Test with real configuration:

```typescript
Deno.test('integration: loads from config', async () => {
  const manager = new ConfigurationManager();
  await manager.loadConfig('./config.test.json');
  
  const resource = await manager.getResource(
    'reportDefinitions',
    'income_statement.json'
  );
  
  assert(resource.content);
  assert(resource.metadata.size > 0);
});
```

### Testing Fallback

```typescript
Deno.test('uses fallback on failure', async () => {
  const manager = new ConfigurationManager();
  await manager.loadConfig({
    version: "1.0",
    dataSources: {
      default: {
        type: 'local',
        config: { basePath: './nonexistent' },
        fallback: {
          type: 'local',
          config: { basePath: './test/fixtures' }
        }
      }
    },
    fallback: { enabled: true }
  });
  
  // Should use fallback
  const resource = await manager.getResource('default', 'test.json');
  assert(resource);
});
```

## Troubleshooting

### Issue: "Configuration not loaded"

**Solution:** Ensure `loadConfig()` is called before using `getResource()`:

```typescript
const manager = new ConfigurationManager();
await manager.loadConfig('./config.json'); // Don't forget this!
```

### Issue: "File not found" errors

**Solution:** Check basePath in configuration matches your file structure:

```json
{
  "dataSources": {
    "reportDefinitions": {
      "type": "local",
      "config": {
        "basePath": "./input/reports"  // Verify this path
      }
    }
  }
}
```

### Issue: Cache not working

**Solution:** Ensure cache is enabled in configuration:

```json
{
  "cache": {
    "enabled": true,  // Must be true
    "ttl": 3600
  }
}
```

### Issue: Slow performance

**Solutions:**
1. Enable caching
2. Increase TTL for stable data
3. Use appropriate storage backend (indexedDB for large data)
4. Check network latency for remote sources

## Checklist

- [ ] Create configuration file
- [ ] Initialize ConfigurationManager
- [ ] Update ReportLoader
- [ ] Update DataLoader
- [ ] Update error handling
- [ ] Add progress tracking (optional)
- [ ] Update unit tests
- [ ] Update integration tests
- [ ] Test in development
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor cache hit rates
- [ ] Remove old code

## Getting Help

- Review [Configuration Guide](./CONFIGURATION_GUIDE.md)
- Check [API Documentation](./DATA_SOURCE_API.md)
- See [Error System](./ERROR_SYSTEM.md)
- Check example configurations in `config.example.json`

## Next Steps

After migration:
1. Monitor cache hit rates and adjust TTL
2. Configure fallback sources for critical resources
3. Set up environment-specific configurations
4. Consider adding remote data sources (GitHub, S3)
5. Implement custom providers if needed
