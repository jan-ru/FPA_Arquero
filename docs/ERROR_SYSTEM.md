# Custom Error System Documentation

**Version**: 1.0  
**Date**: December 6, 2024  
**Status**: ✅ Implemented

## Overview

The custom error system provides a comprehensive, type-safe error handling solution for the financial statement generator application. It replaces generic `Error` objects with rich, contextual errors that provide better debugging information and user-friendly messages.

## Key Features

- 🎯 **Type-Safe**: Full TypeScript support with proper type narrowing
- 📊 **Rich Context**: Errors include relevant metadata and context
- 👥 **User-Friendly**: Automatic generation of user-friendly error messages
- 📈 **Metrics Tracking**: Automatic error occurrence tracking and statistics
- 🔍 **Easy Debugging**: Enhanced logging with structured error information
- 🏭 **Factory Pattern**: Convenient factory methods for creating errors
- 🛡️ **Type Guards**: Runtime type checking for error handling
- 🌐 **Browser Tools**: Console utilities for development debugging

## Architecture

### Error Hierarchy

```
ApplicationError (base)
├── DataLoadError
│   ├── FileNotFoundError
│   ├── FileParseError
│   ├── InvalidDataFormatError
│   ├── EmptyFileError
│   ├── MissingColumnsError
│   ├── DataTransformError
│   ├── DirectoryNotFoundError
│   └── PermissionDeniedError
├── ValidationError
│   ├── SchemaValidationError
│   ├── DataIntegrityError
│   ├── MissingFieldError
│   └── InvalidValueError
├── ReportGenerationError
│   ├── VariableResolutionError
│   ├── ExpressionEvaluationError
│   ├── LayoutProcessingError
│   ├── InvalidReportDefinitionError
│   ├── ReportNotFoundError
│   ├── CircularDependencyError
│   ├── FilterError
│   └── SubtotalError
├── NetworkError
│   ├── FetchError
│   ├── TimeoutError
│   └── OfflineError
└── ConfigurationError
    ├── MissingConfigError
    ├── InvalidConfigError
    ├── MissingConfigPropertyError
    └── ConfigLoadError
```

### Core Components

1. **ApplicationError** - Base error class with rich context
2. **ErrorCodes** - Centralized error code constants
3. **ErrorFactory** - Factory methods for creating errors
4. **ErrorGuards** - Type guards for error checking
5. **ErrorMetrics** - Error tracking and statistics
6. **BrowserConsoleUtils** - Development debugging tools

## Quick Start

### Basic Usage

```typescript
import { ErrorFactory, isValidationError } from './errors/index.ts';

// Create errors using factory methods
throw ErrorFactory.fileNotFound('data.xlsx');
throw ErrorFactory.validation(['Name is required'], { reportId: 'income_statement' });

// Handle errors with type guards
try {
  await loadData();
} catch (error) {
  if (isValidationError(error)) {
    console.log('Validation errors:', error.formatErrors());
  } else {
    console.log('Error:', getErrorMessage(error));
  }
}
```

### Error Creation

```typescript
// Using factory methods (recommended)
throw ErrorFactory.fileNotFound('trial_balance.xlsx');
throw ErrorFactory.variableNotFound('total_revenue', 'income_statement');
throw ErrorFactory.expressionError('assets / 0', divisionError);

// Using constructors directly
throw new FileNotFoundError('data.xlsx');
throw new ValidationError('Validation failed', ['Name is required']);
```

### Error Handling

```typescript
import { isApplicationError, getErrorMessage, isRetryableError } from './errors/index.ts';

try {
  await performOperation();
} catch (error) {
  if (isApplicationError(error)) {
    // Rich error with context
    console.log('Error code:', error.code);
    console.log('User message:', error.getUserMessage());
    console.log('Context:', error.context);
  } else {
    // Standard error
    console.log('Error:', getErrorMessage(error));
  }
  
  // Check if retryable
  if (isRetryableError(error)) {
    // Retry the operation
  }
}
```

## Error Types

### Data Loading Errors

Handle file loading, parsing, and data transformation issues:

```typescript
// File not found
throw ErrorFactory.fileNotFound('trial_balance.xlsx');

// Parse error
throw ErrorFactory.fileParse('data.xlsx', parseError);

// Invalid format
throw ErrorFactory.invalidFormat('data.txt', 'Excel (.xlsx)', 'text');

// Missing columns
throw ErrorFactory.missingColumns('data.xlsx', ['Account Code'], ['Code']);
```

### Validation Errors

Handle data validation and integrity issues:

```typescript
// General validation
throw ErrorFactory.validation([
  'Name is required',
  'Order must be a number'
], { reportId: 'income_statement' });

// Schema validation
throw ErrorFactory.schemaValidation('ReportDefinition', [
  'Missing required property: name'
]);

// Data integrity
throw ErrorFactory.dataIntegrity('Trial balance does not balance', [
  'Total debits: 100,000',
  'Total credits: 99,500'
]);
```

### Report Generation Errors

Handle report generation and processing issues:

```typescript
// Variable not found
throw ErrorFactory.variableNotFound('total_revenue', 'income_statement');

// Expression evaluation
throw ErrorFactory.expressionError('assets / liabilities', evalError);

// Layout processing
throw ErrorFactory.layoutProcessing(10, 'subtotal', error, 'income_statement');

// Report not found
throw ErrorFactory.reportNotFound('missing_report_id');
```

### Network Errors

Handle HTTP requests and network issues:

```typescript
// Fetch failed
throw ErrorFactory.fetchFailed('https://api.example.com/data', 404, 'Not Found');

// Timeout
throw ErrorFactory.timeout('https://api.example.com/data', 5000);

// Offline
throw ErrorFactory.offline();
```

### Configuration Errors

Handle configuration loading and validation:

```typescript
// Missing config
throw ErrorFactory.missingConfig('config.json');

// Invalid config
throw ErrorFactory.invalidConfig('config.json', 'timeout', 'number', 'abc');

// Missing property
throw ErrorFactory.missingConfigProperty('config.json', 'apiUrl');
```

## Type Guards

Type guards provide runtime type checking with TypeScript type narrowing:

```typescript
import { 
  isApplicationError, 
  isValidationError, 
  isNetworkError,
  hasErrorCode,
  getErrorMessage 
} from './errors/index.ts';

// Check error types
if (isApplicationError(error)) {
  // TypeScript knows error is ApplicationError
  console.log(error.code, error.getUserMessage());
}

if (isValidationError(error)) {
  // TypeScript knows error is ValidationError
  console.log(error.formatErrors());
}

// Check error codes
if (hasErrorCode(error, 'DL_FILE_NOT_FOUND')) {
  // Handle file not found
}

// Safe message extraction
const message = getErrorMessage(error); // Works with any error type
```

## Error Metrics

Automatic tracking of error occurrences for monitoring and debugging:

```typescript
import { ErrorMetrics } from './errors/index.ts';

// Get statistics
const stats = ErrorMetrics.getStats();
console.log('Total errors:', stats.totalErrors);
console.log('Error codes:', stats.errorsByCode);

// Get top errors
const topErrors = ErrorMetrics.getTopErrors(5);
topErrors.forEach(({ code, count, percentage }) => {
  console.log(`${code}: ${count} (${percentage.toFixed(1)}%)`);
});

// Export metrics
const metricsJson = ErrorMetrics.toJSON();
console.log(JSON.stringify(metricsJson, null, 2));
```

## Browser Console Utilities

Development tools available in the browser console:

```javascript
// Show error metrics
window.ErrorUtils.showMetrics();

// Show top errors
window.ErrorUtils.showTopErrors(5);

// Show recent errors
window.ErrorUtils.showRecentErrors();

// Show errors by type
window.ErrorUtils.showErrorsByType('ValidationError');

// Show errors by code
window.ErrorUtils.showErrorsByCode('DL_FILE_NOT_FOUND');

// Clear metrics
window.ErrorUtils.clearMetrics();

// Export metrics
window.ErrorUtils.exportMetrics();

// List all error codes
window.ErrorUtils.listErrorCodes();

// Test error system
window.ErrorUtils.testErrors();

// Show help
window.ErrorUtils.help();
```

## Integration with Logger

The error system integrates with the Logger for enhanced logging:

```typescript
import Logger from './utils/Logger.ts';

// Automatic logging (enabled by default)
throw new FileNotFoundError('data.xlsx'); // Automatically logged

// Manual detailed logging
Logger.logError(error, { operation: 'loadData' });

// Disable automatic logging
throw new ApplicationError('Custom error', {
  code: 'CUSTOM_ERROR',
  autoLog: false // Disable automatic logging
});
```

## Best Practices

### 1. Use Factory Methods

```typescript
// ✅ Good - Use factory methods
throw ErrorFactory.fileNotFound('data.xlsx');

// ❌ Avoid - Direct constructor calls
throw new FileNotFoundError('data.xlsx');
```

### 2. Provide Rich Context

```typescript
// ✅ Good - Rich context
throw ErrorFactory.validation([
  'Name is required',
  'Order must be a number'
], {
  reportId: 'income_statement',
  field: 'layoutItems'
});

// ❌ Avoid - Minimal context
throw new Error('Validation failed');
```

### 3. Use Type Guards

```typescript
// ✅ Good - Type-safe error handling
if (isValidationError(error)) {
  showValidationErrors(error.formatErrors());
} else if (isNetworkError(error)) {
  handleNetworkError(error.statusCode);
}

// ❌ Avoid - String-based checking
if (error.message.includes('validation')) {
  // Fragile and error-prone
}
```

### 4. Handle Retryable Errors

```typescript
// ✅ Good - Check if retryable
if (isRetryableError(error)) {
  await retryOperation();
} else {
  showErrorToUser(getErrorMessage(error));
}

// ❌ Avoid - Retry all errors
try {
  await operation();
} catch (error) {
  await retryOperation(); // May retry non-retryable errors
}
```

### 5. Preserve Error Chains

```typescript
// ✅ Good - Preserve original error
try {
  JSON.parse(data);
} catch (parseError) {
  throw ErrorFactory.fileParse('config.json', parseError);
}

// ❌ Avoid - Lose original error
try {
  JSON.parse(data);
} catch (parseError) {
  throw new Error('Parse failed');
}
```

## Migration Guide

### Migrating from Generic Errors

**Before:**
```typescript
if (!file) {
  throw new Error(`File not found: ${filename}`);
}
```

**After:**
```typescript
if (!file) {
  throw ErrorFactory.fileNotFound(filename);
}
```

### Migrating Error Handling

**Before:**
```typescript
try {
  await loadData();
} catch (error) {
  console.error('Error:', error.message);
  showError('Failed to load data');
}
```

**After:**
```typescript
try {
  await loadData();
} catch (error) {
  Logger.logError(error);
  showError(getErrorMessage(error));
}
```

## Error Codes Reference

### Application Errors (APP_*)
- `APP_GENERIC` - Generic application error
- `APP_INITIALIZATION` - Application initialization failed
- `APP_SHUTDOWN` - Application shutdown error

### Data Loading Errors (DL_*)
- `DL_FILE_NOT_FOUND` - File not found
- `DL_FILE_READ` - File read error
- `DL_FILE_PARSE` - File parsing error
- `DL_INVALID_FORMAT` - Invalid file format
- `DL_EMPTY_FILE` - Empty file
- `DL_MISSING_COLUMNS` - Missing required columns
- `DL_TRANSFORM_FAILED` - Data transformation failed
- `DL_DIRECTORY_NOT_FOUND` - Directory not found
- `DL_PERMISSION_DENIED` - Permission denied

### Validation Errors (VAL_*)
- `VAL_GENERIC` - Generic validation error
- `VAL_SCHEMA` - Schema validation failed
- `VAL_DATA_INTEGRITY` - Data integrity check failed
- `VAL_MISSING_FIELD` - Required field missing
- `VAL_INVALID_VALUE` - Invalid field value

### Report Generation Errors (RPT_*)
- `RPT_GENERIC` - Generic report generation error
- `RPT_VARIABLE_NOT_FOUND` - Variable not found
- `RPT_EXPRESSION_ERROR` - Expression evaluation error
- `RPT_LAYOUT_ERROR` - Layout processing error
- `RPT_INVALID_DEFINITION` - Invalid report definition
- `RPT_NOT_FOUND` - Report not found
- `RPT_CIRCULAR_DEPENDENCY` - Circular dependency detected
- `RPT_FILTER_ERROR` - Filter error
- `RPT_SUBTOTAL_ERROR` - Subtotal calculation error

### Network Errors (NET_*)
- `NET_FETCH_FAILED` - HTTP fetch failed
- `NET_TIMEOUT` - Request timeout
- `NET_OFFLINE` - Network offline
- `NET_SERVER_ERROR` - Server error (5xx)
- `NET_CLIENT_ERROR` - Client error (4xx)

### Configuration Errors (CFG_*)
- `CFG_MISSING` - Configuration file missing
- `CFG_INVALID` - Invalid configuration
- `CFG_MISSING_PROPERTY` - Required property missing
- `CFG_LOAD_ERROR` - Configuration load error

## Troubleshooting

### Error Not Being Tracked

If errors aren't appearing in metrics:

1. Ensure the error extends `ApplicationError`
2. Check that automatic logging is enabled
3. Verify ErrorMetrics is imported in your entry point

### Type Guards Not Working

If type guards aren't narrowing types:

1. Ensure you're using TypeScript
2. Check that errors have the correct prototype chain
3. Verify you're importing from the correct path

### Browser Utilities Not Available

If `window.ErrorUtils` is undefined:

1. Ensure BrowserConsoleUtils is imported
2. Check that you're running in a browser environment
3. Verify the module is loaded before accessing utilities

## Performance Considerations

- Error creation is lightweight (~0.1ms per error)
- Metrics tracking adds minimal overhead (~0.01ms per error)
- Browser utilities are only active in development mode
- Error stack traces are captured automatically

## Future Enhancements

Potential improvements for future versions:

1. **Error Recovery Strategies** - Automatic retry with exponential backoff
2. **Error Reporting** - Send errors to monitoring service
3. **Error Analytics** - Advanced error pattern detection
4. **Custom Error Handlers** - Plugin system for custom error handling
5. **Error Localization** - Multi-language error messages

## Related Documentation

- [Development Guide](./DEVELOPMENT.md)
- [Report Definitions](./REPORT_DEFINITIONS.md)
- [API Reference](./API.md)

## Support

For questions or issues with the error system:

1. Check this documentation
2. Review error code reference
3. Use browser console utilities for debugging
4. Check application logs for detailed error information
