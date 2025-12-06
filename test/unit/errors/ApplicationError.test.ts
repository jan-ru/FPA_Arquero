/**
 * Unit tests for ApplicationError
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { ApplicationError } from '../../../src/errors/ApplicationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

Deno.test('ApplicationError - creates error with all parameters', () => {
    const error = new ApplicationError(
        'Test error message',
        {
            code: ErrorCodes.APP_UNKNOWN,
            userMessage: 'Something went wrong',
            context: { key: 'value' },
            cause: new Error('Original error'),
            autoLog: false,
        }
    );

    assertEquals(error.message, 'Test error message');
    assertEquals(error.code, ErrorCodes.APP_UNKNOWN);
    assertEquals(error.userMessage, 'Something went wrong');
    assertEquals(error.context.key, 'value');
    assertExists(error.cause);
    assertExists(error.timestamp);
    assertExists(error.stack);
});

Deno.test('ApplicationError - creates error with minimal parameters', () => {
    const error = new ApplicationError('Test error', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assertEquals(error.message, 'Test error');
    assertEquals(error.code, ErrorCodes.APP_UNKNOWN);
    assertEquals(error.userMessage, 'Test error');
    assertEquals(Object.keys(error.context).length, 0);
    assertEquals(error.cause, undefined);
});

Deno.test('ApplicationError - preserves stack trace', () => {
    const error = new ApplicationError('Test error', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assertExists(error.stack);
    assert(error.stack!.includes('ApplicationError'));
    assert(error.stack!.includes('test'));
});

Deno.test('ApplicationError - context is immutable at top level', () => {
    const context = { key: 'value', nested: { prop: 'test' } };
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        context, 
        autoLog: false 
    });

    // Context should be frozen at top level
    assert(Object.isFrozen(error.context));
    
    // Verify context was copied (not same reference)
    assert(error.context !== context);
    
    // Values should match
    assertEquals(error.context.key, 'value');
    assertEquals((error.context as any).nested.prop, 'test');
});

Deno.test('ApplicationError - toJSON serialization', () => {
    const cause = new Error('Original error');
    const error = new ApplicationError(
        'Test error',
        {
            code: ErrorCodes.APP_UNKNOWN,
            userMessage: 'User message',
            context: { key: 'value' },
            cause,
            autoLog: false,
        }
    );

    const json = error.toJSON() as any;

    assertEquals(json.name, 'ApplicationError');
    assertEquals(json.message, 'Test error');
    assertEquals(json.code, ErrorCodes.APP_UNKNOWN);
    assertEquals(json.userMessage, 'User message');
    assertEquals(json.context.key, 'value');
    assertExists(json.timestamp);
    assertExists(json.stack);
    assertExists(json.cause);
    assertEquals(json.cause.message, 'Original error');
});

Deno.test('ApplicationError - toJSON without cause', () => {
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });
    const json = error.toJSON() as any;

    assertEquals(json.cause, undefined);
});

Deno.test('ApplicationError - toString method', () => {
    const error = new ApplicationError(
        'Test error',
        {
            code: ErrorCodes.DL_FILE_NOT_FOUND,
            userMessage: 'File not found',
            autoLog: false,
        }
    );

    const str = error.toString();

    // toString returns getTechnicalMessage which includes code and message
    assert(str.includes('[DL_FILE_NOT_FOUND]'));
    assert(str.includes('Test error'));
});

Deno.test('ApplicationError - getUserMessage returns user message', () => {
    const error = new ApplicationError(
        'Technical message',
        {
            code: ErrorCodes.APP_UNKNOWN,
            userMessage: 'User-friendly message',
            autoLog: false,
        }
    );

    assertEquals(error.getUserMessage(), 'User-friendly message');
});

Deno.test('ApplicationError - getUserMessage falls back to message', () => {
    const error = new ApplicationError('Test message', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assertEquals(error.getUserMessage(), 'Test message');
});

Deno.test('ApplicationError - getTechnicalMessage returns message with code', () => {
    const error = new ApplicationError(
        'Technical details',
        {
            code: ErrorCodes.APP_UNKNOWN,
            userMessage: 'User message',
            autoLog: false,
        }
    );

    const technical = error.getTechnicalMessage();
    
    // Technical message includes code and message
    assert(technical.includes('[APP_UNKNOWN]'));
    assert(technical.includes('Technical details'));
});

Deno.test('ApplicationError - getTechnicalMessage includes cause', () => {
    const cause = new Error('Original error');
    const error = new ApplicationError(
        'Test error',
        {
            code: ErrorCodes.APP_UNKNOWN,
            cause,
            autoLog: false,
        }
    );

    const technical = error.getTechnicalMessage();

    assert(technical.includes('Test error'));
    assert(technical.includes('Original error'));
});

Deno.test('ApplicationError - is instance of Error', () => {
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assert(error instanceof Error);
    assert(error instanceof ApplicationError);
});

Deno.test('ApplicationError - name property is correct', () => {
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assertEquals(error.name, 'ApplicationError');
});

Deno.test('ApplicationError - timestamp is recent', () => {
    const before = new Date();
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });
    const after = new Date();

    assert(error.timestamp >= before);
    assert(error.timestamp <= after);
});

Deno.test('ApplicationError - context is empty object by default', () => {
    const error = new ApplicationError('Test', { 
        code: ErrorCodes.APP_UNKNOWN,
        autoLog: false 
    });

    assertExists(error.context);
    assertEquals(typeof error.context, 'object');
    assertEquals(Object.keys(error.context).length, 0);
});

Deno.test('ApplicationError - can be caught as Error', () => {
    let caught = false;

    try {
        throw new ApplicationError('Test', { 
            code: ErrorCodes.APP_UNKNOWN,
            autoLog: false 
        });
    } catch (e) {
        if (e instanceof Error) {
            caught = true;
            assertEquals(e.message, 'Test');
        }
    }

    assert(caught);
});
