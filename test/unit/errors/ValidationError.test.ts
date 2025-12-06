/**
 * Unit tests for ValidationError hierarchy
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { 
    ValidationError, 
    SchemaValidationError, 
    DataIntegrityError,
    MissingFieldError,
    InvalidValueError
} from '../../../src/errors/ValidationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

Deno.test('ValidationError - creates with error list', () => {
    const errors = ['Error 1', 'Error 2', 'Error 3'];
    const error = new ValidationError('Validation failed', errors);

    assertEquals(error.message, 'Validation failed');
    assertEquals(error.code, ErrorCodes.VAL_SCHEMA);
    assertEquals(error.errors.length, 3);
    assertEquals(error.errors[0], 'Error 1');
    assert(error instanceof ValidationError);
    assert(error instanceof Error);
});

Deno.test('ValidationError - creates with empty error list', () => {
    const error = new ValidationError('Validation failed', []);

    assertEquals(error.errors.length, 0);
    assert(error.getUserMessage().includes('Validation failed'));
});

Deno.test('ValidationError - user message includes first error', () => {
    const errors = ['Field "name" is required', 'Field "age" must be positive'];
    const error = new ValidationError('Validation failed', errors);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('Field "name" is required'));
    assert(userMessage.includes('and 1 more'));
});

Deno.test('ValidationError - formatErrors returns formatted list', () => {
    const errors = ['Error 1', 'Error 2', 'Error 3'];
    const error = new ValidationError('Validation failed', errors);

    const formatted = error.formatErrors();
    
    assert(formatted.includes('- Error 1'));
    assert(formatted.includes('- Error 2'));
    assert(formatted.includes('- Error 3'));
    assert(formatted.includes('\n'));
});

Deno.test('ValidationError - formatErrors handles empty list', () => {
    const error = new ValidationError('Validation failed', []);

    const formatted = error.formatErrors();
    
    assertEquals(formatted, '');
});

Deno.test('ValidationError - hasError finds matching error', () => {
    const errors = ['Field "name" is required', 'Field "age" must be positive'];
    const error = new ValidationError('Validation failed', errors);

    assert(error.hasError('required'));
    assert(error.hasError('positive'));
    assert(error.hasError(/name/));
    assert(!error.hasError('missing'));
});

Deno.test('ValidationError - hasError is case insensitive', () => {
    const errors = ['Field "NAME" is required'];
    const error = new ValidationError('Validation failed', errors);

    assert(error.hasError('name'));
    assert(error.hasError('NAME'));
    assert(error.hasError('Name'));
});

Deno.test('ValidationError - toJSON includes errors array', () => {
    const errors = ['Error 1', 'Error 2'];
    const error = new ValidationError('Validation failed', errors);

    const json = error.toJSON() as any;

    assertExists(json.errors);
    assertEquals(json.errors.length, 2);
    assertEquals(json.errors[0], 'Error 1');
});

Deno.test('ValidationError - context includes error count', () => {
    const errors = ['Error 1', 'Error 2', 'Error 3'];
    const error = new ValidationError('Validation failed', errors);

    assertEquals((error.context as any).errorCount, 3);
});

Deno.test('SchemaValidationError - creates with schema name', () => {
    const errors = ['Missing field: reportId', 'Invalid type: layout'];
    const error = new SchemaValidationError('ReportDefinition', errors);

    assertEquals(error.code, ErrorCodes.VAL_SCHEMA);
    assertEquals(error.schemaName, 'ReportDefinition');
    assert(error.message.includes('ReportDefinition'));
    assertEquals(error.errors.length, 2);
    assert(error instanceof SchemaValidationError);
    assert(error instanceof ValidationError);
});

Deno.test('SchemaValidationError - user message includes schema name', () => {
    const errors = ['Missing field: reportId'];
    const error = new SchemaValidationError('ReportDefinition', errors);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('ReportDefinition'));
    assert(userMessage.includes('Missing field: reportId'));
});

Deno.test('DataIntegrityError - creates with description', () => {
    const errors = ['Debit: 100000', 'Credit: 99500', 'Difference: 500'];
    const error = new DataIntegrityError('Trial balance does not balance', errors);

    assertEquals(error.code, ErrorCodes.VAL_DATA_INTEGRITY);
    assert(error.message.includes('Trial balance does not balance'));
    assertEquals(error.errors.length, 3);
    assert(error instanceof DataIntegrityError);
    assert(error instanceof ValidationError);
});

Deno.test('DataIntegrityError - user message is helpful', () => {
    const errors = ['Debit: 100000', 'Credit: 99500'];
    const error = new DataIntegrityError('Trial balance does not balance', errors);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('integrity'));
    assert(userMessage.includes('Trial balance does not balance'));
});

Deno.test('MissingFieldError - creates with field name', () => {
    const error = new MissingFieldError('reportId', 'report definition');

    assertEquals(error.code, ErrorCodes.VAL_MISSING_FIELD);
    assertEquals(error.field, 'reportId');
    assert(error.message.includes('reportId'));
    assertEquals(error.errors.length, 1);
    assert(error instanceof MissingFieldError);
    assert(error instanceof ValidationError);
});

Deno.test('MissingFieldError - user message includes field and context', () => {
    const error = new MissingFieldError('reportId', 'report definition');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('reportId'));
    assert(userMessage.includes('report definition'));
});

Deno.test('MissingFieldError - uses default context', () => {
    const error = new MissingFieldError('name');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('name'));
    assert(userMessage.includes('data'));
});

Deno.test('InvalidValueError - creates with field, value, and reason', () => {
    const error = new InvalidValueError('amount', -100, 'must be positive');

    assertEquals(error.code, ErrorCodes.VAL_INVALID_VALUE);
    assertEquals(error.field, 'amount');
    assertEquals(error.value, -100);
    assert(error.message.includes('amount'));
    assert(error.message.includes('must be positive'));
    assert(error instanceof InvalidValueError);
    assert(error instanceof ValidationError);
});

Deno.test('InvalidValueError - user message is clear', () => {
    const error = new InvalidValueError('age', 'abc', 'must be a number');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('age'));
    assert(userMessage.includes('must be a number'));
});

Deno.test('ValidationError - preserves error hierarchy', () => {
    const schema = new SchemaValidationError('Test', ['error']);
    const integrity = new DataIntegrityError('Test', ['error']);
    const missing = new MissingFieldError('test');
    const invalid = new InvalidValueError('test', 'value', 'reason');

    // All should be instances of ValidationError
    assert(schema instanceof ValidationError);
    assert(integrity instanceof ValidationError);
    assert(missing instanceof ValidationError);
    assert(invalid instanceof ValidationError);

    // All should be instances of Error
    assert(schema instanceof Error);
    assert(integrity instanceof Error);
    assert(missing instanceof Error);
    assert(invalid instanceof Error);
});

Deno.test('ValidationError - each has unique error code', () => {
    const schema = new SchemaValidationError('Test', ['error']);
    const integrity = new DataIntegrityError('Test', ['error']);
    const missing = new MissingFieldError('test');
    const invalid = new InvalidValueError('test', 'value', 'reason');

    assertEquals(schema.code, ErrorCodes.VAL_SCHEMA);
    assertEquals(integrity.code, ErrorCodes.VAL_DATA_INTEGRITY);
    assertEquals(missing.code, ErrorCodes.VAL_MISSING_FIELD);
    assertEquals(invalid.code, ErrorCodes.VAL_INVALID_VALUE);

    // All codes should be different
    assert(schema.code !== integrity.code);
    assert(integrity.code !== missing.code);
    assert(missing.code !== invalid.code);
});

Deno.test('ValidationError - errors array is immutable copy', () => {
    const originalErrors = ['Error 1', 'Error 2'];
    const error = new ValidationError('Failed', originalErrors);

    // Modify original array
    originalErrors.push('Error 3');

    // Error's array should not be affected
    assertEquals(error.errors.length, 2);
});
