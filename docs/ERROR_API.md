# Error System API Reference

**Version**: 1.0  
**Date**: December 6, 2024

Complete API reference for the custom error system.

## Table of Contents

- [Error Classes](#error-classes)
- [Error Factory](#error-factory)
- [Type Guards](#type-guards)
- [Error Metrics](#error-metrics)
- [Browser Utilities](#browser-utilities)
- [Error Codes](#error-codes)

---

## Error Classes

### ApplicationError

Base class for all application errors.

```typescript
class ApplicationError extends Error {
  constructor(message: string, options?: ErrorOptions);
  
  readonly code: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly cause?: Error;
  readonly timestamp: Date;
  readonly logLevel: 'error' | 'warn' | 'info';
  
  getUserMessage(): string;
  getTechnicalMessage(): string;
  toJSON(): ErrorJSON;
  toString(): string;
}
```

**Options:**
```typescript
interface ErrorOptions {
  code?: string;
  userMessage?: string;
  context?: Record<string, unknown>;
  cause?: Error;
  logLevel?: 'error' | 'warn' | 'info';
  autoLog?: boolean;
}
```

**Example:**
```typescript
throw new ApplicationError('Operation failed', {
  code: 'APP_GENERIC',
  context: { operation: 'loadData' },
  cause: originalError,
  logLevel: 'error'
});
```

---

### DataLoadError

Base class for data loading errors.

```typescript
class DataLoadError extends ApplicationError {
  constructor(message: string, context: DataLoadContext, cause?: Error);
}

interface DataLoadContext {
  filepath?: string;
  operation?: 'read' | 'write' | 'parse' | 'transform';
  expectedFormat?: string;
  actualFormat?: string;
  [key: string]: unknown;
}
```

#### FileNotFoundError

```typescript
class FileNotFoundError extends DataLoadError {
  constructor(filename: string, cause?: Error);
}
```

**Example:**
```typescript
throw new FileNotFoundError('trial_balance.xlsx');
```

#### FileParseError

```typescript
class FileParseError extends DataLoadError {
  constructor(filename: string, cause: Error);
}
```

**Example:**
```typescript
throw new FileParseError('data.xlsx', parseError);
```

#### InvalidDataFormatError

```typescript
class InvalidDataFormatError extends DataLoadError {
  constructor(
    filename: string,
    expectedFormat: string,
    actualFormat: string,
    cause?: Error
  );
}
```

**Example:**
```typescript
throw new InvalidDataFormatError('data.txt', 'Excel (.xlsx)', 'text');
```

#### EmptyFileError

```typescript
class EmptyFileError extends DataLoadError {
  constructor(filename: string);
}
```

#### MissingColumnsError

```typescript
class MissingColumnsError extends DataLoadError {
  constructor(
    filename: string,
    expectedColumns: string[],
    actualColumns: string[]
  );
}
```

#### DataTransformError

```typescript
class DataTransformError extends DataLoadError {
  constructor(filename: string, transformType: string, cause?: Error);
}
```

#### DirectoryNotFoundError

```typescript
class DirectoryNotFoundError extends DataLoadError {
  constructor(dirPath: string, cause?: Error);
}
```

#### PermissionDeniedError

```typescript
class PermissionDeniedError extends DataLoadError {
  constructor(filePath: string, cause?: Error);
}
```

---

### ValidationError

Base class for validation errors.

```typescript
class ValidationError extends ApplicationError {
  constructor(
    message: string,
    errors: string[],
    context?: ValidationContext
  );
  
  readonly errors: readonly string[];
  
  formatErrors(): string;
  hasError(pattern: string | RegExp): boolean;
}

interface ValidationContext {
  reportId?: string;
  field?: string;
  value?: unknown;
  [key: string]: unknown;
}
```

**Example:**
```typescript
const error = new ValidationError('Validation failed', [
  'Name is required',
  'Order must be a number'
], { reportId: 'income_statement' });

console.log(error.formatErrors());
// Output: "- Name is required\n- Order must be a number"
```

#### SchemaValidationError

```typescript
class SchemaValidationError extends ValidationError {
  constructor(schemaName: string, errors: string[], cause?: Error);
}
```

#### DataIntegrityError

```typescript
class DataIntegrityError extends ValidationError {
  constructor(description: string, errors: string[], cause?: Error);
}
```

#### MissingFieldError

```typescript
class MissingFieldError extends ValidationError {
  constructor(fieldName: string, context?: ValidationContext);
}
```

#### InvalidValueError

```typescript
class InvalidValueError extends ValidationError {
  constructor(
    fieldName: string,
    value: unknown,
    expected: string,
    context?: ValidationContext
  );
}
```

---

### ReportGenerationError

Base class for report generation errors.

```typescript
class ReportGenerationError extends ApplicationError {
  constructor(message: string, context: ReportContext, cause?: Error);
}

interface ReportContext {
  reportId?: string;
  variableName?: string;
  expression?: string;
  layoutOrder?: number;
  [key: string]: unknown;
}
```

#### VariableResolutionError

```typescript
class VariableResolutionError extends ReportGenerationError {
  constructor(variableName: string, reportId?: string, cause?: Error);
}
```

#### ExpressionEvaluationError

```typescript
class ExpressionEvaluationError extends ReportGenerationError {
  constructor(expression: string, cause: Error);
}
```

#### LayoutProcessingError

```typescript
class LayoutProcessingError extends ReportGenerationError {
  constructor(
    layoutOrder: number,
    layoutType: string,
    cause: Error,
    reportId?: string
  );
}
```

#### InvalidReportDefinitionError

```typescript
class InvalidReportDefinitionError extends ReportGenerationError {
  constructor(reportId: string, reason: string, cause?: Error);
}
```

#### ReportNotFoundError

```typescript
class ReportNotFoundError extends ReportGenerationError {
  constructor(reportId: string);
}
```

#### CircularDependencyError

```typescript
class CircularDependencyError extends ReportGenerationError {
  constructor(variableName: string, dependencyChain: string[]);
}
```

#### FilterError

```typescript
class FilterError extends ReportGenerationError {
  constructor(filterExpression: string, cause: Error, reportId?: string);
}
```

#### SubtotalError

```typescript
class SubtotalError extends ReportGenerationError {
  constructor(
    fromOrder: number,
    toOrder: number,
    cause: Error,
    reportId?: string
  );
}
```

---

### NetworkError

Base class for network errors.

```typescript
class NetworkError extends ApplicationError {
  constructor(message: string, context: NetworkContext, cause?: Error);
  
  readonly statusCode?: number;
}

interface NetworkContext {
  url?: string;
  method?: string;
  statusCode?: number;
  statusText?: string;
  timeout?: number;
  [key: string]: unknown;
}
```

#### FetchError

```typescript
class FetchError extends NetworkError {
  constructor(
    url: string,
    statusCode: number,
    statusText: string,
    method?: string
  );
}
```

#### TimeoutError

```typescript
class TimeoutError extends NetworkError {
  constructor(url: string, timeout: number);
}
```

#### OfflineError

```typescript
class OfflineError extends NetworkError {
  constructor();
}
```

---

### ConfigurationError

Base class for configuration errors.

```typescript
class ConfigurationError extends ApplicationError {
  constructor(message: string, context: ConfigContext, cause?: Error);
}

interface ConfigContext {
  configPath?: string;
  property?: string;
  section?: string;
  [key: string]: unknown;
}
```

#### MissingConfigError

```typescript
class MissingConfigError extends ConfigurationError {
  constructor(configPath: string, cause?: Error);
}
```

#### InvalidConfigError

```typescript
class InvalidConfigError extends ConfigurationError {
  constructor(
    configPath: string,
    property: string,
    expected: string,
    actual: unknown,
    cause?: Error
  );
}
```

#### MissingConfigPropertyError

```typescript
class MissingConfigPropertyError extends ConfigurationError {
  constructor(configPath: string, property: string, section?: string);
}
```

#### ConfigLoadError

```typescript
class ConfigLoadError extends ConfigurationError {
  constructor(configPath: string, cause: Error);
}
```

---

## Error Factory

Factory methods for creating errors with consistent patterns.

### Data Loading Factories

```typescript
class ErrorFactory {
  static fileNotFound(filename: string, cause?: Error): FileNotFoundError;
  static fileParse(filename: string, cause: Error): FileParseError;
  static invalidFormat(
    filename: string,
    expectedFormat: string,
    actualFormat: string
  ): InvalidDataFormatError;
  static emptyFile(filename: string): EmptyFileError;
  static missingColumns(
    filename: string,
    expectedColumns: string[],
    actualColumns: string[]
  ): MissingColumnsError;
  static dataTransform(
    filename: string,
    transformType: string,
    cause?: Error
  ): DataTransformError;
  static directoryNotFound(dirPath: string, cause?: Error): DirectoryNotFoundError;
  static permissionDenied(filePath: string, cause?: Error): PermissionDeniedError;
}
```

### Validation Factories

```typescript
class ErrorFactory {
  static validation(
    errors: string[],
    context?: ValidationContext
  ): ValidationError;
  static schemaValidation(
    schemaName: string,
    errors: string[]
  ): SchemaValidationError;
  static dataIntegrity(
    description: string,
    errors: string[]
  ): DataIntegrityError;
  static missingField(
    fieldName: string,
    context?: ValidationContext
  ): MissingFieldError;
  static invalidValue(
    fieldName: string,
    value: unknown,
    expected: string,
    context?: ValidationContext
  ): InvalidValueError;
}
```

### Report Generation Factories

```typescript
class ErrorFactory {
  static variableNotFound(
    variableName: string,
    reportId?: string,
    cause?: Error
  ): VariableResolutionError;
  static expressionError(
    expression: string,
    cause: Error
  ): ExpressionEvaluationError;
  static layoutProcessing(
    layoutOrder: number,
    layoutType: string,
    cause: Error,
    reportId?: string
  ): LayoutProcessingError;
  static invalidReportDefinition(
    reportId: string,
    reason: string,
    cause?: Error
  ): InvalidReportDefinitionError;
  static reportNotFound(reportId: string): ReportNotFoundError;
  static circularDependency(
    variableName: string,
    dependencyChain: string[]
  ): CircularDependencyError;
  static filterError(
    filterExpression: string,
    cause: Error,
    reportId?: string
  ): FilterError;
  static subtotalError(
    fromOrder: number,
    toOrder: number,
    cause: Error,
    reportId?: string
  ): SubtotalError;
}
```

### Network Factories

```typescript
class ErrorFactory {
  static fetchFailed(
    url: string,
    statusCode: number,
    statusText: string,
    method?: string
  ): FetchError;
  static timeout(url: string, timeout: number): TimeoutError;
  static offline(): OfflineError;
}
```

### Configuration Factories

```typescript
class ErrorFactory {
  static missingConfig(configPath: string, cause?: Error): MissingConfigError;
  static invalidConfig(
    configPath: string,
    property: string,
    expected: string,
    actual: unknown,
    cause?: Error
  ): InvalidConfigError;
  static missingConfigProperty(
    configPath: string,
    property: string,
    section?: string
  ): MissingConfigPropertyError;
  static configLoadError(configPath: string, cause: Error): ConfigLoadError;
}
```

### Utility Factories

```typescript
class ErrorFactory {
  static wrap(error: Error, context?: Record<string, unknown>): ApplicationError;
}
```

---

## Type Guards

Type guards for runtime error type checking with TypeScript type narrowing.

```typescript
// Check if error is ApplicationError
function isApplicationError(error: unknown): error is ApplicationError;

// Check if error is DataLoadError
function isDataLoadError(error: unknown): error is DataLoadError;

// Check if error is ValidationError
function isValidationError(error: unknown): error is ValidationError;

// Check if error is ReportGenerationError
function isReportGenerationError(error: unknown): error is ReportGenerationError;

// Check if error is NetworkError
function isNetworkError(error: unknown): error is NetworkError;

// Check if error is ConfigurationError
function isConfigurationError(error: unknown): error is ConfigurationError;

// Check if error has specific error code
function hasErrorCode(error: unknown, code: string): boolean;

// Get error message safely
function getErrorMessage(error: unknown): string;

// Get error code safely
function getErrorCode(error: unknown): string | undefined;

// Check if error is retryable
function isRetryableError(error: unknown): boolean;
```

**Example:**
```typescript
try {
  await loadData();
} catch (error) {
  if (isValidationError(error)) {
    // TypeScript knows error is ValidationError
    console.log(error.formatErrors());
  } else if (isNetworkError(error)) {
    // TypeScript knows error is NetworkError
    console.log(`Status: ${error.statusCode}`);
  } else {
    console.log(getErrorMessage(error));
  }
}
```

---

## Error Metrics

Track and analyze error occurrences.

```typescript
class ErrorMetrics {
  // Track an error occurrence
  static track(error: ApplicationError): void;
  
  // Get error statistics
  static getStats(): ErrorStats;
  
  // Get top N most frequent errors
  static getTopErrors(limit?: number): ErrorCodeInfo[];
  
  // Get recent error codes
  static getRecentErrors(): string[];
  
  // Get count for specific error code
  static getCount(code: string): number;
  
  // Get detailed info for error code
  static getErrorInfo(code: string): ErrorCodeInfo | undefined;
  
  // Reset all metrics
  static reset(): void;
  
  // Export metrics as JSON
  static toJSON(): ErrorMetricsJSON;
}
```

**Types:**
```typescript
interface ErrorStats {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: string[];
  trackingStarted: Date;
  lastError?: Date;
}

interface ErrorCodeInfo {
  code: string;
  count: number;
  percentage: number;
  firstSeen: Date;
  lastSeen: Date;
}

interface ErrorMetricsJSON {
  stats: ErrorStats;
  topErrors: ErrorCodeInfo[];
}
```

**Example:**
```typescript
// Get statistics
const stats = ErrorMetrics.getStats();
console.log(`Total errors: ${stats.totalErrors}`);

// Get top 5 errors
const topErrors = ErrorMetrics.getTopErrors(5);
topErrors.forEach(({ code, count, percentage }) => {
  console.log(`${code}: ${count} (${percentage.toFixed(1)}%)`);
});

// Export metrics
const json = ErrorMetrics.toJSON();
console.log(JSON.stringify(json, null, 2));
```

---

## Browser Utilities

Development utilities available in browser console.

```typescript
class BrowserConsoleUtils {
  // Display error metrics
  static showMetrics(): void;
  
  // Show top N errors
  static showTopErrors(limit?: number): void;
  
  // Show recent errors
  static showRecentErrors(): void;
  
  // Show errors by type
  static showErrorsByType(errorType: string): void;
  
  // Show errors by code
  static showErrorsByCode(errorCode: string): void;
  
  // Clear all metrics
  static clearMetrics(): void;
  
  // Export metrics as JSON
  static exportMetrics(): string;
  
  // List all error codes
  static listErrorCodes(): void;
  
  // Test error system
  static testErrors(): void;
  
  // Show help
  static help(): void;
}
```

**Usage:**
```javascript
// In browser console
window.ErrorUtils.showMetrics();
window.ErrorUtils.showTopErrors(5);
window.ErrorUtils.help();
```

---

## Error Codes

Complete list of error codes organized by category.

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

---

## Complete Example

```typescript
import {
  ErrorFactory,
  isValidationError,
  isNetworkError,
  getErrorMessage,
  ErrorMetrics
} from './errors/index.ts';

async function loadAndProcessData(filename: string) {
  try {
    // Load file
    const file = await readFile(filename);
    if (!file) {
      throw ErrorFactory.fileNotFound(filename);
    }
    
    // Parse data
    let data;
    try {
      data = parseExcel(file);
    } catch (parseError) {
      throw ErrorFactory.fileParse(filename, parseError);
    }
    
    // Validate data
    const errors = validateData(data);
    if (errors.length > 0) {
      throw ErrorFactory.validation(errors, { filename });
    }
    
    return data;
    
  } catch (error) {
    // Handle different error types
    if (isValidationError(error)) {
      console.error('Validation errors:', error.formatErrors());
      showUserMessage('Please fix the following issues:', error.errors);
    } else if (isNetworkError(error)) {
      console.error('Network error:', error.statusCode);
      if (error.statusCode === 404) {
        showUserMessage('File not found on server');
      }
    } else {
      console.error('Error:', getErrorMessage(error));
      showUserMessage('An unexpected error occurred');
    }
    
    // Check metrics
    const stats = ErrorMetrics.getStats();
    console.log(`Total errors today: ${stats.totalErrors}`);
    
    throw error;
  }
}
```

---

## See Also

- [Error System Documentation](./ERROR_SYSTEM.md)
- [Development Guide](./DEVELOPMENT.md)
- [Migration Guide](./ERROR_SYSTEM.md#migration-guide)
