/**
 * Unit tests for NetworkError and ConfigurationError
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { NetworkError, FetchError, TimeoutError, OfflineError } from '../../../src/errors/NetworkError.ts';
import { 
    ConfigurationError, 
    MissingConfigError, 
    InvalidConfigError,
    ConfigLoadError,
    MissingConfigPropertyError
} from '../../../src/errors/ConfigurationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

// NetworkError tests
Deno.test('NetworkError - creates with context', () => {
    const error = new NetworkError(
        'Request failed',
        {
            url: '/api/data',
            method: 'GET',
            statusCode: 500,
        }
    );

    assertEquals(error.message, 'Request failed');
    assertEquals(error.code, ErrorCodes.NET_FETCH_FAILED);
    assertEquals(error.statusCode, 500);
    assertEquals((error.context as any).url, '/api/data');
    assert(error instanceof NetworkError);
    assert(error instanceof Error);
});

Deno.test('FetchError - creates with 404 status', () => {
    const error = new FetchError('/reports/missing.json', 404, 'Not Found');

    assertEquals(error.code, ErrorCodes.NET_NOT_FOUND);
    assertEquals(error.url, '/reports/missing.json');
    assertEquals(error.statusCode, 404);
    assert(error.message.includes('404'));
    assert(error.message.includes('Not Found'));
    assert(error instanceof FetchError);
    assert(error instanceof NetworkError);
});

Deno.test('FetchError - 404 has helpful user message', () => {
    const error = new FetchError('/api/resource', 404, 'Not Found');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('/api/resource'));
    assert(userMessage.toLowerCase().includes('not found'));
});

Deno.test('FetchError - creates with 500 status', () => {
    const error = new FetchError('/api/data', 500, 'Internal Server Error');

    assertEquals(error.code, ErrorCodes.NET_SERVER_ERROR);
    assertEquals(error.statusCode, 500);
});

Deno.test('FetchError - 500 has user-friendly message', () => {
    const error = new FetchError('/api/data', 500, 'Internal Server Error');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.toLowerCase().includes('server'));
    assert(userMessage.toLowerCase().includes('try again'));
});

Deno.test('FetchError - creates with 401 status', () => {
    const error = new FetchError('/api/secure', 401, 'Unauthorized');

    assertEquals(error.code, ErrorCodes.NET_UNAUTHORIZED);
    assertEquals(error.statusCode, 401);
});

Deno.test('FetchError - creates with 403 status', () => {
    const error = new FetchError('/api/admin', 403, 'Forbidden');

    assertEquals(error.code, ErrorCodes.NET_FORBIDDEN);
    assertEquals(error.statusCode, 403);
});

Deno.test('TimeoutError - creates with URL and timeout', () => {
    const error = new TimeoutError('/api/slow', 5000);

    assertEquals(error.code, ErrorCodes.NET_TIMEOUT);
    assertEquals(error.url, '/api/slow');
    assertEquals(error.timeout, 5000);
    assert(error.message.includes('5000'));
    assert(error.message.includes('/api/slow'));
    assert(error instanceof TimeoutError);
    assert(error instanceof NetworkError);
});

Deno.test('TimeoutError - user message is helpful', () => {
    const error = new TimeoutError('/api/data', 3000);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.toLowerCase().includes('too long') || userMessage.toLowerCase().includes('timed out'));
});

Deno.test('OfflineError - creates without parameters', () => {
    const error = new OfflineError();

    assertEquals(error.code, ErrorCodes.NET_OFFLINE);
    assert(error.message.toLowerCase().includes('offline'));
    assert(error instanceof OfflineError);
    assert(error instanceof NetworkError);
});

Deno.test('OfflineError - user message mentions connection', () => {
    const error = new OfflineError();

    const userMessage = error.getUserMessage();
    
    assert(userMessage.toLowerCase().includes('connection') || userMessage.toLowerCase().includes('internet'));
});

Deno.test('NetworkError - preserves error hierarchy', () => {
    const fetch = new FetchError('/api', 404, 'Not Found');
    const timeout = new TimeoutError('/api', 5000);
    const offline = new OfflineError();

    assert(fetch instanceof NetworkError);
    assert(timeout instanceof NetworkError);
    assert(offline instanceof NetworkError);

    assert(fetch instanceof Error);
    assert(timeout instanceof Error);
    assert(offline instanceof Error);
});

// ConfigurationError tests
Deno.test('ConfigurationError - creates with context', () => {
    const error = new ConfigurationError(
        'Invalid config',
        {
            configFile: 'config.json',
            property: 'apiUrl',
        }
    );

    assertEquals(error.message, 'Invalid config');
    assertEquals(error.code, ErrorCodes.CFG_INVALID);
    assertEquals((error.context as any).configFile, 'config.json');
    assert(error instanceof ConfigurationError);
    assert(error instanceof Error);
});

Deno.test('MissingConfigError - creates with config file', () => {
    const error = new MissingConfigError('config.json');

    assertEquals(error.code, ErrorCodes.CFG_MISSING);
    assertEquals(error.configFile, 'config.json');
    assert(error.message.includes('config.json'));
    assert(error instanceof MissingConfigError);
    assert(error instanceof ConfigurationError);
});

Deno.test('MissingConfigError - user message is clear', () => {
    const error = new MissingConfigError('settings.json');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('settings.json'));
    assert(userMessage.toLowerCase().includes('missing'));
});

Deno.test('InvalidConfigError - creates with property and value', () => {
    const error = new InvalidConfigError('config.json', 'port', 'invalid', 'must be a number');

    assertEquals(error.code, ErrorCodes.CFG_INVALID_VALUE);
    assertEquals(error.property, 'port');
    assertEquals(error.value, 'invalid');
    assert(error.message.includes('port'));
    assert(error.message.includes('invalid'));
    assert(error instanceof InvalidConfigError);
    assert(error instanceof ConfigurationError);
});

Deno.test('InvalidConfigError - user message includes property', () => {
    const error = new InvalidConfigError('config.json', 'timeout', -1, 'must be positive');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('timeout'));
    assert(userMessage.includes('must be positive'));
});

Deno.test('ConfigLoadError - creates with cause', () => {
    const cause = new Error('File read error');
    const error = new ConfigLoadError('config.json', cause);

    assertEquals(error.code, ErrorCodes.CFG_LOAD_FAILED);
    assertEquals(error.configFile, 'config.json');
    assertEquals(error.cause, cause);
    assert(error instanceof ConfigLoadError);
    assert(error instanceof ConfigurationError);
});

Deno.test('ConfigLoadError - user message is helpful', () => {
    const cause = new Error('Parse error');
    const error = new ConfigLoadError('settings.json', cause);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('settings.json'));
    assert(userMessage.toLowerCase().includes('load') || userMessage.toLowerCase().includes('unable'));
});

Deno.test('MissingConfigPropertyError - creates with property', () => {
    const error = new MissingConfigPropertyError('config.json', 'apiUrl');

    assertEquals(error.code, ErrorCodes.CFG_MISSING_PROPERTY);
    assertEquals(error.configFile, 'config.json');
    assertEquals(error.property, 'apiUrl');
    assert(error.message.includes('apiUrl'));
    assert(error instanceof MissingConfigPropertyError);
    assert(error instanceof ConfigurationError);
});

Deno.test('MissingConfigPropertyError - creates with section', () => {
    const error = new MissingConfigPropertyError('config.json', 'host', 'database');

    assertEquals(error.section, 'database');
    assert(error.message.includes('database'));
    assert(error.message.includes('host'));
});

Deno.test('MissingConfigPropertyError - user message includes property', () => {
    const error = new MissingConfigPropertyError('config.json', 'apiKey', 'auth');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('apiKey'));
    assert(userMessage.includes('auth'));
});

Deno.test('ConfigurationError - preserves error hierarchy', () => {
    const missing = new MissingConfigError('config.json');
    const invalid = new InvalidConfigError('config.json', 'prop', 'value');
    const load = new ConfigLoadError('config.json', new Error('test'));
    const missingProp = new MissingConfigPropertyError('config.json', 'prop');

    assert(missing instanceof ConfigurationError);
    assert(invalid instanceof ConfigurationError);
    assert(load instanceof ConfigurationError);
    assert(missingProp instanceof ConfigurationError);

    assert(missing instanceof Error);
    assert(invalid instanceof Error);
    assert(load instanceof Error);
    assert(missingProp instanceof Error);
});

Deno.test('ConfigurationError - each has unique error code', () => {
    const missing = new MissingConfigError('config.json');
    const invalid = new InvalidConfigError('config.json', 'prop', 'value');
    const load = new ConfigLoadError('config.json', new Error('test'));
    const missingProp = new MissingConfigPropertyError('config.json', 'prop');

    assertEquals(missing.code, ErrorCodes.CFG_MISSING);
    assertEquals(invalid.code, ErrorCodes.CFG_INVALID_VALUE);
    assertEquals(load.code, ErrorCodes.CFG_LOAD_FAILED);
    assertEquals(missingProp.code, ErrorCodes.CFG_MISSING_PROPERTY);

    // All codes should be different
    const codes = [missing.code, invalid.code, load.code, missingProp.code];
    const uniqueCodes = new Set(codes);
    assertEquals(uniqueCodes.size, codes.length);
});
