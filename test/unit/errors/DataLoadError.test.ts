/**
 * Unit tests for DataLoadError hierarchy
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { DataLoadError, FileNotFoundError, FileParseError, InvalidDataFormatError } from '../../../src/errors/DataLoadError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

Deno.test('DataLoadError - creates error with context', () => {
    const error = new DataLoadError(
        'Failed to load data',
        {
            filename: 'test.xlsx',
            operation: 'read',
        }
    );

    assertEquals(error.message, 'Failed to load data');
    assertEquals(error.code, ErrorCodes.DL_FILE_READ);
    assertEquals((error.context as any).filename, 'test.xlsx');
    assertEquals((error.context as any).operation, 'read');
    assert(error instanceof DataLoadError);
    assert(error instanceof Error);
});

Deno.test('FileNotFoundError - creates with filename', () => {
    const error = new FileNotFoundError('data.xlsx');

    assertEquals(error.code, ErrorCodes.DL_FILE_NOT_FOUND);
    assert(error.message.includes('data.xlsx'));
    assert(error.getUserMessage().includes('data.xlsx'));
    assertEquals((error.context as any).filename, 'data.xlsx');
    assert(error instanceof FileNotFoundError);
    assert(error instanceof DataLoadError);
});

Deno.test('FileNotFoundError - has user-friendly message', () => {
    const error = new FileNotFoundError('report.xlsx');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('report.xlsx'));
    assert(userMessage.toLowerCase().includes('find') || userMessage.toLowerCase().includes('unable'));
});

Deno.test('FileParseError - creates with filename and cause', () => {
    const parseError = new Error('Invalid XML structure');
    const error = new FileParseError('data.xml', parseError);

    assertEquals(error.code, ErrorCodes.DL_FILE_PARSE);
    assert(error.message.includes('data.xml'));
    assertEquals((error.context as any).filename, 'data.xml');
    assertEquals(error.cause, parseError);
    assert(error instanceof FileParseError);
    assert(error instanceof DataLoadError);
});

Deno.test('FileParseError - includes parse error in technical message', () => {
    const parseError = new Error('Unexpected token at line 5');
    const error = new FileParseError('config.json', parseError);

    const technical = error.getTechnicalMessage();
    
    assert(technical.includes('config.json'));
    assert(technical.includes('Unexpected token'));
});

Deno.test('FileParseError - has user-friendly message', () => {
    const parseError = new Error('Parse failed');
    const error = new FileParseError('data.csv', parseError);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('data.csv'));
    assert(userMessage.toLowerCase().includes('read') || userMessage.toLowerCase().includes('unable'));
});

Deno.test('InvalidDataFormatError - creates with filename and format', () => {
    const error = new InvalidDataFormatError('data.txt', 'Excel');

    assertEquals(error.code, ErrorCodes.DL_INVALID_FORMAT);
    assert(error.message.includes('data.txt'));
    assert(error.message.includes('Invalid data format'));
    assertEquals((error.context as any).filename, 'data.txt');
    assertEquals((error.context as any).expectedFormat, 'Excel');
    // User message should include the expected format
    assert(error.getUserMessage().includes('Excel'));
    assert(error instanceof InvalidDataFormatError);
    assert(error instanceof DataLoadError);
});

Deno.test('InvalidDataFormatError - has helpful user message', () => {
    const error = new InvalidDataFormatError('report.pdf', 'Excel or CSV');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('report.pdf'));
    assert(userMessage.includes('Excel or CSV'));
    assert(userMessage.toLowerCase().includes('format') || userMessage.toLowerCase().includes('expected'));
});

Deno.test('DataLoadError - preserves error hierarchy', () => {
    const fileNotFound = new FileNotFoundError('test.xlsx');
    const fileParse = new FileParseError('test.xml', new Error('Parse error'));
    const invalidFormat = new InvalidDataFormatError('test.txt', 'Excel');

    // All should be instances of DataLoadError
    assert(fileNotFound instanceof DataLoadError);
    assert(fileParse instanceof DataLoadError);
    assert(invalidFormat instanceof DataLoadError);

    // All should be instances of Error
    assert(fileNotFound instanceof Error);
    assert(fileParse instanceof Error);
    assert(invalidFormat instanceof Error);
});

Deno.test('DataLoadError - each has unique error code', () => {
    const fileNotFound = new FileNotFoundError('test.xlsx');
    const fileParse = new FileParseError('test.xml', new Error('Parse error'));
    const invalidFormat = new InvalidDataFormatError('test.txt', 'Excel');

    assertEquals(fileNotFound.code, ErrorCodes.DL_FILE_NOT_FOUND);
    assertEquals(fileParse.code, ErrorCodes.DL_FILE_PARSE);
    assertEquals(invalidFormat.code, ErrorCodes.DL_INVALID_FORMAT);

    // All codes should be different
    assert(fileNotFound.code !== fileParse.code);
    assert(fileParse.code !== invalidFormat.code);
    assert(fileNotFound.code !== invalidFormat.code);
});

Deno.test('DataLoadError - can be serialized to JSON', () => {
    const error = new FileNotFoundError('data.xlsx');
    const json = error.toJSON() as any;

    assertExists(json);
    assertEquals(json.code, ErrorCodes.DL_FILE_NOT_FOUND);
    assertEquals(json.context.filename, 'data.xlsx');
    assertExists(json.timestamp);
    assertExists(json.stack);
});

Deno.test('DataLoadError - context includes data source info', () => {
    const error = new DataLoadError(
        'Load failed',
        {
            filename: 'data.xlsx',
            filepath: '/data/input/data.xlsx',
            operation: 'read',
        }
    );

    assertEquals((error.context as any).filename, 'data.xlsx');
    assertEquals((error.context as any).filepath, '/data/input/data.xlsx');
    assertEquals((error.context as any).operation, 'read');
});
