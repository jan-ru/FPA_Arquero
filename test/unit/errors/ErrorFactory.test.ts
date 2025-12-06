/**
 * Unit tests for ErrorFactory
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ErrorFactory } from '../../../src/errors/ErrorFactory.ts';
import { 
    FileNotFoundError, 
    FileParseError, 
    InvalidDataFormatError,
    EmptyFileError,
    MissingColumnsError,
    DirectoryNotFoundError,
    PermissionDeniedError
} from '../../../src/errors/DataLoadError.ts';
import { 
    ValidationError, 
    SchemaValidationError, 
    DataIntegrityError,
    MissingFieldError,
    InvalidValueError
} from '../../../src/errors/ValidationError.ts';
import {
    VariableResolutionError,
    ExpressionEvaluationError,
    LayoutProcessingError,
    InvalidReportDefinitionError,
    ReportNotFoundError,
    CircularDependencyError
} from '../../../src/errors/ReportGenerationError.ts';
import { FetchError, TimeoutError, OfflineError } from '../../../src/errors/NetworkError.ts';
import { MissingConfigError, InvalidConfigError, ConfigLoadError } from '../../../src/errors/ConfigurationError.ts';
import { ApplicationError } from '../../../src/errors/ApplicationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

// Data Loading Error Factories
Deno.test('ErrorFactory.fileNotFound - creates FileNotFoundError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');

    assert(error instanceof FileNotFoundError);
    assertEquals(error.code, ErrorCodes.DL_FILE_NOT_FOUND);
    assert(error.message.includes('test.xlsx'));
});

Deno.test('ErrorFactory.fileParse - creates FileParseError', () => {
    const cause = new Error('Parse failed');
    const error = ErrorFactory.fileParse('test.xml', cause);

    assert(error instanceof FileParseError);
    assertEquals(error.code, ErrorCodes.DL_FILE_PARSE);
    assertEquals(error.cause, cause);
});

Deno.test('ErrorFactory.invalidFormat - creates InvalidDataFormatError', () => {
    const error = ErrorFactory.invalidFormat('test.txt', 'Excel');

    assert(error instanceof InvalidDataFormatError);
    assertEquals(error.code, ErrorCodes.DL_INVALID_FORMAT);
    assert(error.message.includes('test.txt'));
});

Deno.test('ErrorFactory.emptyFile - creates EmptyFileError', () => {
    const error = ErrorFactory.emptyFile('empty.csv');

    assert(error instanceof EmptyFileError);
    assertEquals(error.code, ErrorCodes.DL_EMPTY_FILE);
});

Deno.test('ErrorFactory.missingColumns - creates MissingColumnsError', () => {
    const error = ErrorFactory.missingColumns('data.xlsx', ['col1', 'col2']);

    assert(error instanceof MissingColumnsError);
    assertEquals(error.code, ErrorCodes.DL_MISSING_COLUMNS);
    assertEquals(error.missingColumns.length, 2);
});

Deno.test('ErrorFactory.directoryNotFound - creates DirectoryNotFoundError', () => {
    const error = ErrorFactory.directoryNotFound('/path/to/dir');

    assert(error instanceof DirectoryNotFoundError);
    assertEquals(error.code, ErrorCodes.DL_DIRECTORY_NOT_FOUND);
});

Deno.test('ErrorFactory.permissionDenied - creates PermissionDeniedError', () => {
    const error = ErrorFactory.permissionDenied('secure.xlsx');

    assert(error instanceof PermissionDeniedError);
    assertEquals(error.code, ErrorCodes.DL_PERMISSION_DENIED);
});

// Validation Error Factories
Deno.test('ErrorFactory.validation - creates ValidationError', () => {
    const errors = ['Error 1', 'Error 2'];
    const error = ErrorFactory.validation(errors);

    assert(error instanceof ValidationError);
    assertEquals(error.errors.length, 2);
});

Deno.test('ErrorFactory.validation - accepts context', () => {
    const errors = ['Error 1'];
    const error = ErrorFactory.validation(errors, { field: 'test' });

    assertEquals((error.context as any).field, 'test');
});

Deno.test('ErrorFactory.schemaValidation - creates SchemaValidationError', () => {
    const error = ErrorFactory.schemaValidation('ReportDef', ['Missing field']);

    assert(error instanceof SchemaValidationError);
    assertEquals(error.schemaName, 'ReportDef');
});

Deno.test('ErrorFactory.dataIntegrity - creates DataIntegrityError', () => {
    const error = ErrorFactory.dataIntegrity('Balance mismatch', ['Debit: 100', 'Credit: 90']);

    assert(error instanceof DataIntegrityError);
    assertEquals(error.code, ErrorCodes.VAL_DATA_INTEGRITY);
});

Deno.test('ErrorFactory.missingField - creates MissingFieldError', () => {
    const error = ErrorFactory.missingField('reportId', 'report');

    assert(error instanceof MissingFieldError);
    assertEquals(error.field, 'reportId');
});

Deno.test('ErrorFactory.missingField - uses default context', () => {
    const error = ErrorFactory.missingField('name');

    assert(error.getUserMessage().includes('data'));
});

Deno.test('ErrorFactory.invalidValue - creates InvalidValueError', () => {
    const error = ErrorFactory.invalidValue('age', -1, 'must be positive');

    assert(error instanceof InvalidValueError);
    assertEquals(error.field, 'age');
    assertEquals(error.value, -1);
});

// Report Generation Error Factories
Deno.test('ErrorFactory.variableNotFound - creates VariableResolutionError', () => {
    const error = ErrorFactory.variableNotFound('revenue', 'income_statement');

    assert(error instanceof VariableResolutionError);
    assertEquals(error.variableName, 'revenue');
    assertEquals(error.reportId, 'income_statement');
});

Deno.test('ErrorFactory.expressionError - creates ExpressionEvaluationError', () => {
    const cause = new Error('Division by zero');
    const error = ErrorFactory.expressionError('a / b', cause);

    assert(error instanceof ExpressionEvaluationError);
    assertEquals(error.expression, 'a / b');
    assertEquals(error.cause, cause);
});

Deno.test('ErrorFactory.layoutError - creates LayoutProcessingError', () => {
    const error = ErrorFactory.layoutError(10, 'subtotal');

    assert(error instanceof LayoutProcessingError);
    assertEquals(error.layoutOrder, 10);
    assertEquals(error.layoutType, 'subtotal');
});

Deno.test('ErrorFactory.invalidReport - creates InvalidReportDefinitionError', () => {
    const error = ErrorFactory.invalidReport('test_report', 'Missing layout');

    assert(error instanceof InvalidReportDefinitionError);
    assertEquals(error.reportId, 'test_report');
});

Deno.test('ErrorFactory.reportNotFound - creates ReportNotFoundError', () => {
    const error = ErrorFactory.reportNotFound('missing_report');

    assert(error instanceof ReportNotFoundError);
    assertEquals(error.reportId, 'missing_report');
});

Deno.test('ErrorFactory.circularDependency - creates CircularDependencyError', () => {
    const error = ErrorFactory.circularDependency(['a', 'b', 'c', 'a']);

    assert(error instanceof CircularDependencyError);
    assertEquals(error.dependencyChain.length, 4);
});

// Network Error Factories
Deno.test('ErrorFactory.fetchFailed - creates FetchError', () => {
    const error = ErrorFactory.fetchFailed('/api/data', 404, 'Not Found');

    assert(error instanceof FetchError);
    assertEquals(error.url, '/api/data');
    assertEquals(error.statusCode, 404);
});

Deno.test('ErrorFactory.timeout - creates TimeoutError', () => {
    const error = ErrorFactory.timeout('/api/slow', 5000);

    assert(error instanceof TimeoutError);
    assertEquals(error.url, '/api/slow');
    assertEquals(error.timeout, 5000);
});

Deno.test('ErrorFactory.offline - creates OfflineError', () => {
    const error = ErrorFactory.offline();

    assert(error instanceof OfflineError);
    assertEquals(error.code, ErrorCodes.NET_OFFLINE);
});

// Configuration Error Factories
Deno.test('ErrorFactory.missingConfig - creates MissingConfigError', () => {
    const error = ErrorFactory.missingConfig('config.json');

    assert(error instanceof MissingConfigError);
    assertEquals(error.configFile, 'config.json');
});

Deno.test('ErrorFactory.invalidConfig - creates InvalidConfigError', () => {
    const error = ErrorFactory.invalidConfig('config.json', 'port', 'invalid', 'must be number');

    assert(error instanceof InvalidConfigError);
    assertEquals(error.property, 'port');
    assertEquals(error.value, 'invalid');
});

Deno.test('ErrorFactory.configLoadFailed - creates ConfigLoadError', () => {
    const cause = new Error('Parse error');
    const error = ErrorFactory.configLoadFailed('config.json', cause);

    assert(error instanceof ConfigLoadError);
    assertEquals(error.configFile, 'config.json');
    assertEquals(error.cause, cause);
});

// Generic Wrapper
Deno.test('ErrorFactory.wrap - wraps generic Error', () => {
    const original = new Error('Something went wrong');
    const error = ErrorFactory.wrap(original);

    assert(error instanceof ApplicationError);
    assertEquals(error.code, ErrorCodes.APP_UNKNOWN);
    assertEquals(error.cause, original);
    assertEquals(error.message, 'Something went wrong');
});

Deno.test('ErrorFactory.wrap - adds context', () => {
    const original = new Error('Failed');
    const error = ErrorFactory.wrap(original, { operation: 'test' });

    assertEquals((error.context as any).operation, 'test');
});

Deno.test('ErrorFactory.wrap - returns ApplicationError as-is', () => {
    const original = ErrorFactory.fileNotFound('test.xlsx');
    const wrapped = ErrorFactory.wrap(original);

    assertEquals(wrapped, original);
    assert(wrapped instanceof FileNotFoundError);
});

Deno.test('ErrorFactory.wrap - has user-friendly message', () => {
    const original = new Error('Technical error');
    const error = ErrorFactory.wrap(original);

    const userMessage = error.getUserMessage();
    assert(userMessage.toLowerCase().includes('unexpected'));
});

// Factory Consistency Tests
Deno.test('ErrorFactory - all factories return correct types', () => {
    // Data loading
    assert(ErrorFactory.fileNotFound('f') instanceof FileNotFoundError);
    assert(ErrorFactory.fileParse('f', new Error()) instanceof FileParseError);
    assert(ErrorFactory.invalidFormat('f', 'fmt') instanceof InvalidDataFormatError);
    
    // Validation
    assert(ErrorFactory.validation([]) instanceof ValidationError);
    assert(ErrorFactory.schemaValidation('s', []) instanceof SchemaValidationError);
    
    // Report generation
    assert(ErrorFactory.variableNotFound('v', 'r') instanceof VariableResolutionError);
    assert(ErrorFactory.expressionError('e', new Error()) instanceof ExpressionEvaluationError);
    
    // Network
    assert(ErrorFactory.fetchFailed('u', 404, 't') instanceof FetchError);
    assert(ErrorFactory.timeout('u', 1000) instanceof TimeoutError);
    
    // Configuration
    assert(ErrorFactory.missingConfig('c') instanceof MissingConfigError);
    assert(ErrorFactory.invalidConfig('c', 'p', 'v') instanceof InvalidConfigError);
});

Deno.test('ErrorFactory - all errors have proper error codes', () => {
    const fileNotFound = ErrorFactory.fileNotFound('test');
    const validation = ErrorFactory.validation(['error']);
    const variable = ErrorFactory.variableNotFound('v', 'r');
    const fetch = ErrorFactory.fetchFailed('/api', 404, 'Not Found');
    const config = ErrorFactory.missingConfig('config.json');

    assertExists(fileNotFound.code);
    assertExists(validation.code);
    assertExists(variable.code);
    assertExists(fetch.code);
    assertExists(config.code);

    // All should have different codes
    assert(fileNotFound.code !== validation.code);
    assert(validation.code !== variable.code);
    assert(variable.code !== fetch.code);
});

Deno.test('ErrorFactory - all errors have user messages', () => {
    const errors = [
        ErrorFactory.fileNotFound('test'),
        ErrorFactory.validation(['error']),
        ErrorFactory.variableNotFound('v', 'r'),
        ErrorFactory.fetchFailed('/api', 404, 'Not Found'),
        ErrorFactory.missingConfig('config.json'),
    ];

    for (const error of errors) {
        const userMessage = error.getUserMessage();
        assertExists(userMessage);
        assert(userMessage.length > 0);
        assert(typeof userMessage === 'string');
    }
});
