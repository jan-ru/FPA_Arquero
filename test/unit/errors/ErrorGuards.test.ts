/**
 * Unit tests for ErrorGuards (type guard functions)
 */

import './setup.ts';
import { assertEquals, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
    isApplicationError,
    isDataLoadError,
    isValidationError,
    isReportGenerationError,
    isNetworkError,
    isConfigurationError,
    hasErrorCode,
    hasErrorCodePrefix,
    isError,
    getErrorMessage,
    getErrorCode,
    isRetryableError,
    isUserFacingError,
} from '../../../src/errors/ErrorGuards.ts';
import { ErrorFactory } from '../../../src/errors/ErrorFactory.ts';
import { ApplicationError } from '../../../src/errors/ApplicationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

// Type Guard Tests
Deno.test('isApplicationError - detects ApplicationError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(isApplicationError(error));
});

Deno.test('isApplicationError - rejects standard Error', () => {
    const error = new Error('test');
    
    assert(!isApplicationError(error));
});

Deno.test('isApplicationError - handles null/undefined', () => {
    assert(!isApplicationError(null));
    assert(!isApplicationError(undefined));
    assert(!isApplicationError('string'));
    assert(!isApplicationError(123));
});

Deno.test('isDataLoadError - detects DataLoadError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(isDataLoadError(error));
});

Deno.test('isDataLoadError - rejects other ApplicationErrors', () => {
    const error = ErrorFactory.validation(['error']);
    
    assert(!isDataLoadError(error));
});

Deno.test('isValidationError - detects ValidationError', () => {
    const error = ErrorFactory.validation(['error']);
    
    assert(isValidationError(error));
});

Deno.test('isValidationError - rejects other ApplicationErrors', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!isValidationError(error));
});

Deno.test('isReportGenerationError - detects ReportGenerationError', () => {
    const error = ErrorFactory.variableNotFound('revenue', 'report');
    
    assert(isReportGenerationError(error));
});

Deno.test('isReportGenerationError - rejects other ApplicationErrors', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!isReportGenerationError(error));
});

Deno.test('isNetworkError - detects NetworkError', () => {
    const error = ErrorFactory.fetchFailed('/api', 404, 'Not Found');
    
    assert(isNetworkError(error));
});

Deno.test('isNetworkError - rejects other ApplicationErrors', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!isNetworkError(error));
});

Deno.test('isConfigurationError - detects ConfigurationError', () => {
    const error = ErrorFactory.missingConfig('config.json');
    
    assert(isConfigurationError(error));
});

Deno.test('isConfigurationError - rejects other ApplicationErrors', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!isConfigurationError(error));
});

// hasErrorCode Tests
Deno.test('hasErrorCode - detects correct error code', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(hasErrorCode(error, ErrorCodes.DL_FILE_NOT_FOUND));
});

Deno.test('hasErrorCode - rejects incorrect error code', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!hasErrorCode(error, ErrorCodes.VAL_SCHEMA));
});

Deno.test('hasErrorCode - handles null/undefined', () => {
    assert(!hasErrorCode(null, ErrorCodes.APP_UNKNOWN));
    assert(!hasErrorCode(undefined, ErrorCodes.APP_UNKNOWN));
});

Deno.test('hasErrorCode - handles non-error objects', () => {
    assert(!hasErrorCode('string', ErrorCodes.APP_UNKNOWN));
    assert(!hasErrorCode(123, ErrorCodes.APP_UNKNOWN));
    assert(!hasErrorCode({}, ErrorCodes.APP_UNKNOWN));
});

Deno.test('hasErrorCode - handles standard Error', () => {
    const error = new Error('test');
    
    assert(!hasErrorCode(error, ErrorCodes.APP_UNKNOWN));
});

// hasErrorCodePrefix Tests
Deno.test('hasErrorCodePrefix - detects data loading errors', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(hasErrorCodePrefix(error, 'DL_'));
});

Deno.test('hasErrorCodePrefix - detects validation errors', () => {
    const error = ErrorFactory.validation(['error']);
    
    assert(hasErrorCodePrefix(error, 'VAL_'));
});

Deno.test('hasErrorCodePrefix - detects report errors', () => {
    const error = ErrorFactory.variableNotFound('v', 'r');
    
    assert(hasErrorCodePrefix(error, 'RPT_'));
});

Deno.test('hasErrorCodePrefix - rejects wrong prefix', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!hasErrorCodePrefix(error, 'VAL_'));
});

Deno.test('hasErrorCodePrefix - handles null/undefined', () => {
    assert(!hasErrorCodePrefix(null, 'DL_'));
    assert(!hasErrorCodePrefix(undefined, 'DL_'));
});

// isError Tests
Deno.test('isError - detects standard Error', () => {
    const error = new Error('test');
    
    assert(isError(error));
});

Deno.test('isError - detects ApplicationError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(isError(error));
});

Deno.test('isError - rejects non-errors', () => {
    assert(!isError(null));
    assert(!isError(undefined));
    assert(!isError('string'));
    assert(!isError({}));
});

// getErrorMessage Tests
Deno.test('getErrorMessage - extracts from ApplicationError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    const message = getErrorMessage(error);
    
    assert(message.includes('test.xlsx'));
    assert(message.length > 0);
});

Deno.test('getErrorMessage - extracts from standard Error', () => {
    const error = new Error('Test error message');
    const message = getErrorMessage(error);
    
    assertEquals(message, 'Test error message');
});

Deno.test('getErrorMessage - handles string', () => {
    const message = getErrorMessage('Error string');
    
    assertEquals(message, 'Error string');
});

Deno.test('getErrorMessage - handles null/undefined', () => {
    assertEquals(getErrorMessage(null), 'Unknown error');
    assertEquals(getErrorMessage(undefined), 'Unknown error');
});

Deno.test('getErrorMessage - handles object with message', () => {
    const obj = { message: 'Custom message' };
    const message = getErrorMessage(obj);
    
    assertEquals(message, 'Custom message');
});

Deno.test('getErrorMessage - handles other values', () => {
    const message = getErrorMessage(123);
    
    assertEquals(message, '123');
});

// getErrorCode Tests
Deno.test('getErrorCode - extracts from ApplicationError', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    const code = getErrorCode(error);
    
    assertEquals(code, ErrorCodes.DL_FILE_NOT_FOUND);
});

Deno.test('getErrorCode - returns undefined for standard Error', () => {
    const error = new Error('test');
    const code = getErrorCode(error);
    
    assertEquals(code, undefined);
});

Deno.test('getErrorCode - handles null/undefined', () => {
    assertEquals(getErrorCode(null), undefined);
    assertEquals(getErrorCode(undefined), undefined);
});

Deno.test('getErrorCode - handles object with code', () => {
    const obj = { code: 'CUSTOM_CODE' };
    const code = getErrorCode(obj);
    
    assertEquals(code, 'CUSTOM_CODE');
});

// isRetryableError Tests
Deno.test('isRetryableError - timeout is retryable', () => {
    const error = ErrorFactory.timeout('/api', 5000);
    
    assert(isRetryableError(error));
});

Deno.test('isRetryableError - server error is retryable', () => {
    const error = ErrorFactory.fetchFailed('/api', 500, 'Server Error');
    
    assert(isRetryableError(error));
});

Deno.test('isRetryableError - offline is retryable', () => {
    const error = ErrorFactory.offline();
    
    assert(isRetryableError(error));
});

Deno.test('isRetryableError - 404 is not retryable', () => {
    const error = ErrorFactory.fetchFailed('/api', 404, 'Not Found');
    
    assert(!isRetryableError(error));
});

Deno.test('isRetryableError - 401 is not retryable', () => {
    const error = ErrorFactory.fetchFailed('/api', 401, 'Unauthorized');
    
    assert(!isRetryableError(error));
});

Deno.test('isRetryableError - validation error is not retryable', () => {
    const error = ErrorFactory.validation(['error']);
    
    assert(!isRetryableError(error));
});

Deno.test('isRetryableError - file not found is not retryable', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(!isRetryableError(error));
});

Deno.test('isRetryableError - handles null/undefined', () => {
    assert(!isRetryableError(null));
    assert(!isRetryableError(undefined));
});

// isUserFacingError Tests
Deno.test('isUserFacingError - ApplicationError is user-facing', () => {
    const error = ErrorFactory.fileNotFound('test.xlsx');
    
    assert(isUserFacingError(error));
});

Deno.test('isUserFacingError - standard Error is not user-facing', () => {
    const error = new Error('test');
    
    assert(!isUserFacingError(error));
});

Deno.test('isUserFacingError - handles null/undefined', () => {
    assert(!isUserFacingError(null));
    assert(!isUserFacingError(undefined));
});

// Type Narrowing Tests (compile-time checks)
Deno.test('Type guards provide proper type narrowing', () => {
    const error: unknown = ErrorFactory.fileNotFound('test.xlsx');
    
    if (isApplicationError(error)) {
        // TypeScript should know error is ApplicationError here
        const code = error.code;
        const message = error.getUserMessage();
        assert(typeof code === 'string');
        assert(typeof message === 'string');
    }
    
    if (isValidationError(error)) {
        // TypeScript should know error is ValidationError here
        const errors = error.errors;
        assert(Array.isArray(errors));
    }
});

// Edge Cases
Deno.test('Type guards handle Error subclasses correctly', () => {
    class CustomError extends Error {
        code = 'CUSTOM';
    }
    
    const error = new CustomError('test');
    
    assert(isError(error));
    assert(!isApplicationError(error));
    assert(hasErrorCode(error, 'CUSTOM'));
});

Deno.test('getErrorMessage prefers user message for ApplicationError', () => {
    const error = new ApplicationError('Technical message', {
        code: ErrorCodes.APP_UNKNOWN,
        userMessage: 'User-friendly message',
    });
    
    const message = getErrorMessage(error);
    
    assertEquals(message, 'User-friendly message');
});
