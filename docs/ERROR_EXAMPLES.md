# Error System Examples

Practical examples for using the custom error system in various scenarios.

## Table of Contents

- [Basic Error Handling](#basic-error-handling)
- [Data Loading Examples](#data-loading-examples)
- [Validation Examples](#validation-examples)
- [Report Generation Examples](#report-generation-examples)
- [Network Examples](#network-examples)
- [Configuration Examples](#configuration-examples)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Error Handling

### Creating and Throwing Errors

```typescript
import { ErrorFactory } from './errors/index.ts';

// Simple file not found
throw ErrorFactory.fileNotFound('data.xlsx');

// With additional context
throw ErrorFactory.validation(
  ['Name is required', 'Order must be positive'],
  { reportId: 'income_statement', section: 'layout' }
);

// Wrapping an existing error
try {
  JSON.parse(invalidJson);
} catch (error) {
  throw ErrorFactory.fileParse('config.json', error);
}
```

### Catching and Handling Errors

```typescript
import { isApplicationError, getErrorMessage } from './errors/index.ts';

try {
  await performOperation();
} catch (error) {
  if (isApplicationError(error)) {
    // Rich error with context
    console.log('Code:', error.code);
    console.log('User message:', error.getUserMessage());
    console.log('Technical:', error.getTechnicalMessage());
    console.log('Context:', error.context);
  } else {
    // Standard error
    console.log('Error:', getErrorMessage(error));
  }
}
```

---

## Data Loading Examples

### Loading Excel Files

```typescript
import { ErrorFactory, isDataLoadError } from './errors/index.ts';
import * as XLSX from 'xlsx';

async function loadExcelFile(filename: string) {
  try {
    // Check if file exists
    const fileExists = await checkFileExists(filename);
    if (!fileExists) {
      throw ErrorFactory.fileNotFound(filename);
    }
    
    // Read file
    let workbook;
    try {
      workbook = XLSX.readFile(filename);
    } catch (error) {
      throw ErrorFactory.fileParse(filename, error);
    }
    
    // Validate format
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw ErrorFactory.emptyFile(filename);
    }
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Validate required columns
    const requiredColumns = ['Account Code', 'Account Name', 'Balance'];
    const actualColumns = Object.keys(data[0] || {});
    const missingColumns = requiredColumns.filter(
      col => !actualColumns.includes(col)
    );
    
    if (missingColumns.length > 0) {
      throw ErrorFactory.missingColumns(
        filename,
        requiredColumns,
        actualColumns
      );
    }
    
    return data;
    
  } catch (error) {
    if (isDataLoadError(error)) {
      // Handle data loading errors specifically
      console.error('Data loading failed:', error.getUserMessage());
      
      // Show user-friendly message based on error type
      if (error.code === 'DL_FILE_NOT_FOUND') {
        showUserMessage(`File "${filename}" not found. Please check the file path.`);
      } else if (error.code === 'DL_MISSING_COLUMNS') {
        showUserMessage('The file is missing required columns. Please check the template.');
      }
    }
    throw error;
  }
}
```

### Transforming Data

```typescript
import { ErrorFactory } from './errors/index.ts';

function transformWideToLong(data: any[], filename: string) {
  try {
    // Perform transformation
    const transformed = data.flatMap(row => {
      const baseData = { id: row.id, name: row.name };
      return Object.entries(row)
        .filter(([key]) => key.startsWith('month_'))
        .map(([month, value]) => ({
          ...baseData,
          month: month.replace('month_', ''),
          value
        }));
    });
    
    return transformed;
  } catch (error) {
    throw ErrorFactory.dataTransform(filename, 'wide-to-long', error);
  }
}
```

---

## Validation Examples

### Validating Report Definitions

```typescript
import { ErrorFactory, ValidationError } from './errors/index.ts';

function validateReportDefinition(report: any): void {
  const errors: string[] = [];
  
  // Check required fields
  if (!report.id) {
    errors.push('Report ID is required');
  }
  if (!report.name) {
    errors.push('Report name is required');
  }
  if (!report.layout || !Array.isArray(report.layout)) {
    errors.push('Layout must be an array');
  }
  
  // Validate layout items
  if (report.layout) {
    report.layout.forEach((item: any, index: number) => {
      if (typeof item.order !== 'number') {
        errors.push(`Layout item ${index}: order must be a number`);
      }
      if (!item.type) {
        errors.push(`Layout item ${index}: type is required`);
      }
      if (item.type === 'line' && !item.label) {
        errors.push(`Layout item ${index}: label is required for line items`);
      }
    });
  }
  
  // Throw if errors found
  if (errors.length > 0) {
    throw ErrorFactory.validation(errors, { reportId: report.id });
  }
}

// Usage
try {
  validateReportDefinition(reportDef);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:');
    console.error(error.formatErrors());
    
    // Check for specific errors
    if (error.hasError(/order must be a number/)) {
      console.log('Found order validation error');
    }
  }
}
```

### Schema Validation

```typescript
import { ErrorFactory } from './errors/index.ts';
import Ajv from 'ajv';

function validateSchema(data: any, schema: any, schemaName: string) {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid && validate.errors) {
    const errors = validate.errors.map(err => 
      `${err.instancePath}: ${err.message}`
    );
    throw ErrorFactory.schemaValidation(schemaName, errors);
  }
}

// Usage
try {
  validateSchema(reportData, reportSchema, 'ReportDefinition');
} catch (error) {
  console.error('Schema validation failed:', error.getUserMessage());
}
```

### Data Integrity Checks

```typescript
import { ErrorFactory } from './errors/index.ts';

function validateTrialBalance(data: any[]) {
  const totalDebits = data
    .filter(row => row.type === 'debit')
    .reduce((sum, row) => sum + row.amount, 0);
    
  const totalCredits = data
    .filter(row => row.type === 'credit')
    .reduce((sum, row) => sum + row.amount, 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw ErrorFactory.dataIntegrity(
      'Trial balance does not balance',
      [
        `Total debits: ${totalDebits.toFixed(2)}`,
        `Total credits: ${totalCredits.toFixed(2)}`,
        `Difference: ${(totalDebits - totalCredits).toFixed(2)}`
      ]
    );
  }
}
```

---

## Report Generation Examples

### Variable Resolution

```typescript
import { ErrorFactory } from './errors/index.ts';

class VariableResolver {
  private variables: Map<string, number>;
  private reportId: string;
  
  constructor(reportId: string) {
    this.reportId = reportId;
    this.variables = new Map();
  }
  
  resolve(variableName: string): number {
    if (!this.variables.has(variableName)) {
      throw ErrorFactory.variableNotFound(variableName, this.reportId);
    }
    return this.variables.get(variableName)!;
  }
  
  set(variableName: string, value: number): void {
    this.variables.set(variableName, value);
  }
}

// Usage
const resolver = new VariableResolver('income_statement');
resolver.set('revenue', 100000);

try {
  const revenue = resolver.resolve('revenue'); // OK
  const profit = resolver.resolve('profit'); // Throws VariableResolutionError
} catch (error) {
  console.error(error.getUserMessage());
  // Output: "Variable 'profit' not found in report 'income_statement'"
}
```

### Expression Evaluation

```typescript
import { ErrorFactory } from './errors/index.ts';

function evaluateExpression(expression: string, context: Record<string, number>): number {
  try {
    // Create safe evaluation context
    const func = new Function(...Object.keys(context), `return ${expression}`);
    return func(...Object.values(context));
  } catch (error) {
    throw ErrorFactory.expressionError(expression, error);
  }
}

// Usage
try {
  const result = evaluateExpression('revenue - expenses', {
    revenue: 100000,
    expenses: 75000
  }); // OK: 25000
  
  const invalid = evaluateExpression('revenue / 0', {
    revenue: 100000
  }); // Throws ExpressionEvaluationError
} catch (error) {
  console.error(error.getUserMessage());
}
```

### Layout Processing

```typescript
import { ErrorFactory, isReportGenerationError } from './errors/index.ts';

async function processLayoutItem(
  item: any,
  reportId: string
): Promise<string> {
  try {
    switch (item.type) {
      case 'line':
        return processLine(item);
      case 'subtotal':
        return processSubtotal(item);
      case 'section':
        return processSection(item);
      default:
        throw new Error(`Unknown layout type: ${item.type}`);
    }
  } catch (error) {
    // Re-throw custom errors as-is
    if (isReportGenerationError(error)) {
      throw error;
    }
    
    // Wrap other errors
    throw ErrorFactory.layoutProcessing(
      item.order,
      item.type,
      error,
      reportId
    );
  }
}
```

### Circular Dependency Detection

```typescript
import { ErrorFactory } from './errors/index.ts';

class DependencyTracker {
  private resolving: Set<string> = new Set();
  private chain: string[] = [];
  
  startResolving(variableName: string): void {
    if (this.resolving.has(variableName)) {
      // Circular dependency detected
      this.chain.push(variableName);
      throw ErrorFactory.circularDependency(variableName, this.chain);
    }
    
    this.resolving.add(variableName);
    this.chain.push(variableName);
  }
  
  finishResolving(variableName: string): void {
    this.resolving.delete(variableName);
    this.chain.pop();
  }
}

// Usage
const tracker = new DependencyTracker();
try {
  tracker.startResolving('total_assets');
  tracker.startResolving('current_assets');
  tracker.startResolving('total_assets'); // Throws CircularDependencyError
} catch (error) {
  console.error(error.getUserMessage());
  // Output: "Circular dependency detected: total_assets → current_assets → total_assets"
}
```

---

## Network Examples

### Fetching Data

```typescript
import { ErrorFactory, isNetworkError, isRetryableError } from './errors/index.ts';

async function fetchData(url: string, options: RequestInit = {}): Promise<any> {
  // Check if online
  if (!navigator.onLine) {
    throw ErrorFactory.offline();
  }
  
  // Set timeout
  const timeout = 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw ErrorFactory.fetchFailed(
        url,
        response.status,
        response.statusText,
        options.method || 'GET'
      );
    }
    
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw ErrorFactory.timeout(url, timeout);
    }
    
    throw error;
  }
}

// Usage with retry
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchData(url);
    } catch (error) {
      lastError = error;
      
      if (isRetryableError(error)) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await delay(1000 * attempt); // Exponential backoff
      } else {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }
  
  throw lastError;
}
```

---

## Configuration Examples

### Loading Configuration

```typescript
import { ErrorFactory, isConfigurationError } from './errors/index.ts';

async function loadConfig(configPath: string): Promise<any> {
  try {
    // Check if file exists
    const exists = await fileExists(configPath);
    if (!exists) {
      throw ErrorFactory.missingConfig(configPath);
    }
    
    // Read file
    let content;
    try {
      content = await readFile(configPath, 'utf-8');
    } catch (error) {
      throw ErrorFactory.configLoadError(configPath, error);
    }
    
    // Parse JSON
    let config;
    try {
      config = JSON.parse(content);
    } catch (error) {
      throw ErrorFactory.configLoadError(configPath, error);
    }
    
    // Validate config
    validateConfig(config, configPath);
    
    return config;
    
  } catch (error) {
    if (isConfigurationError(error)) {
      console.error('Configuration error:', error.getUserMessage());
      
      // Provide helpful suggestions
      if (error.code === 'CFG_MISSING') {
        console.log('Create a config file using: cp config.example.json config.json');
      }
    }
    throw error;
  }
}

function validateConfig(config: any, configPath: string): void {
  // Check required properties
  const required = ['apiUrl', 'timeout', 'retries'];
  
  for (const prop of required) {
    if (!(prop in config)) {
      throw ErrorFactory.missingConfigProperty(configPath, prop);
    }
  }
  
  // Validate types
  if (typeof config.timeout !== 'number') {
    throw ErrorFactory.invalidConfig(
      configPath,
      'timeout',
      'number',
      typeof config.timeout
    );
  }
  
  if (config.timeout < 0) {
    throw ErrorFactory.invalidConfig(
      configPath,
      'timeout',
      'positive number',
      config.timeout
    );
  }
}
```

---

## Advanced Patterns

### Error Recovery

```typescript
import { ErrorFactory, isRetryableError, getErrorCode } from './errors/index.ts';

async function operationWithRecovery<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = getErrorCode(error);
    
    // Try recovery strategies
    if (code === 'NET_OFFLINE' && fallback) {
      console.log('Network offline, using fallback...');
      return await fallback();
    }
    
    if (isRetryableError(error)) {
      console.log('Retrying operation...');
      await delay(1000);
      return await operation();
    }
    
    // No recovery possible
    throw error;
  }
}

// Usage
const data = await operationWithRecovery(
  () => fetchData('https://api.example.com/data'),
  () => loadCachedData()
);
```

### Error Aggregation

```typescript
import { ErrorFactory, ValidationError } from './errors/index.ts';

class ErrorAggregator {
  private errors: string[] = [];
  
  add(error: string): void {
    this.errors.push(error);
  }
  
  addIf(condition: boolean, error: string): void {
    if (condition) {
      this.errors.push(error);
    }
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  throw(context?: Record<string, unknown>): never {
    if (this.errors.length === 0) {
      throw new Error('No errors to throw');
    }
    throw ErrorFactory.validation(this.errors, context);
  }
}

// Usage
function validateReport(report: any): void {
  const errors = new ErrorAggregator();
  
  errors.addIf(!report.id, 'ID is required');
  errors.addIf(!report.name, 'Name is required');
  errors.addIf(!Array.isArray(report.layout), 'Layout must be an array');
  
  if (errors.hasErrors()) {
    errors.throw({ reportId: report.id });
  }
}
```

### Error Context Enrichment

```typescript
import { ErrorFactory, isApplicationError } from './errors/index.ts';

function enrichError(error: unknown, additionalContext: Record<string, unknown>): Error {
  if (isApplicationError(error)) {
    // Create new error with enriched context
    return new (error.constructor as any)(
      error.message,
      {
        ...error,
        context: {
          ...error.context,
          ...additionalContext
        }
      }
    );
  }
  
  // Wrap non-application errors
  return ErrorFactory.wrap(error as Error, additionalContext);
}

// Usage
try {
  await processReport(reportId);
} catch (error) {
  const enriched = enrichError(error, {
    userId: currentUser.id,
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
  
  Logger.error(enriched);
  throw enriched;
}
```

### Custom Error Handler

```typescript
import {
  isApplicationError,
  isValidationError,
  isNetworkError,
  isDataLoadError,
  getErrorMessage
} from './errors/index.ts';

class ErrorHandler {
  handle(error: unknown): void {
    if (isValidationError(error)) {
      this.handleValidation(error);
    } else if (isNetworkError(error)) {
      this.handleNetwork(error);
    } else if (isDataLoadError(error)) {
      this.handleDataLoad(error);
    } else if (isApplicationError(error)) {
      this.handleApplication(error);
    } else {
      this.handleUnknown(error);
    }
  }
  
  private handleValidation(error: ValidationError): void {
    showNotification({
      type: 'error',
      title: 'Validation Failed',
      message: error.formatErrors()
    });
  }
  
  private handleNetwork(error: NetworkError): void {
    if (error.statusCode === 404) {
      showNotification({
        type: 'error',
        title: 'Not Found',
        message: 'The requested resource was not found'
      });
    } else if (error.statusCode && error.statusCode >= 500) {
      showNotification({
        type: 'error',
        title: 'Server Error',
        message: 'The server encountered an error. Please try again later.'
      });
    }
  }
  
  private handleDataLoad(error: DataLoadError): void {
    showNotification({
      type: 'error',
      title: 'Data Loading Failed',
      message: error.getUserMessage()
    });
  }
  
  private handleApplication(error: ApplicationError): void {
    showNotification({
      type: 'error',
      title: 'Error',
      message: error.getUserMessage()
    });
  }
  
  private handleUnknown(error: unknown): void {
    showNotification({
      type: 'error',
      title: 'Unexpected Error',
      message: getErrorMessage(error)
    });
  }
}

// Usage
const errorHandler = new ErrorHandler();

try {
  await performOperation();
} catch (error) {
  errorHandler.handle(error);
}
```

---

## See Also

- [Error System Documentation](./ERROR_SYSTEM.md)
- [API Reference](./ERROR_API.md)
- [Development Guide](./DEVELOPMENT.md)
