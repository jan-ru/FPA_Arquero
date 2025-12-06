/**
 * Unit tests for ReportGenerationError hierarchy
 */

import './setup.ts';
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { 
    ReportGenerationError,
    VariableResolutionError,
    ExpressionEvaluationError,
    LayoutProcessingError,
    InvalidReportDefinitionError,
    ReportNotFoundError,
    CircularDependencyError
} from '../../../src/errors/ReportGenerationError.ts';
import { ErrorCodes } from '../../../src/errors/ErrorCodes.ts';

Deno.test('ReportGenerationError - creates with context', () => {
    const error = new ReportGenerationError(
        'Failed to generate report',
        {
            reportId: 'income_statement_default',
            statementType: 'income',
        }
    );

    assertEquals(error.message, 'Failed to generate report');
    assertEquals(error.code, ErrorCodes.RPT_LAYOUT_PROCESSING);
    assertEquals((error.context as any).reportId, 'income_statement_default');
    assertEquals((error.context as any).statementType, 'income');
    assert(error instanceof ReportGenerationError);
    assert(error instanceof Error);
});

Deno.test('ReportGenerationError - user message includes report name', () => {
    const error = new ReportGenerationError(
        'Failed',
        {
            reportName: 'Income Statement',
        }
    );

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('Income Statement'));
});

Deno.test('ReportGenerationError - preserves cause', () => {
    const cause = new Error('Original error');
    const error = new ReportGenerationError('Failed', {}, cause);

    assertEquals(error.cause, cause);
});

Deno.test('VariableResolutionError - creates with variable and report', () => {
    const error = new VariableResolutionError('revenue', 'income_statement_default');

    assertEquals(error.code, ErrorCodes.RPT_VARIABLE_NOT_FOUND);
    assertEquals(error.variableName, 'revenue');
    assertEquals(error.reportId, 'income_statement_default');
    assert(error.message.includes('revenue'));
    assert(error.message.includes('income_statement_default'));
    assert(error instanceof VariableResolutionError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('VariableResolutionError - user message is helpful', () => {
    const error = new VariableResolutionError('total_assets', 'balance_sheet');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('total_assets'));
    assert(userMessage.toLowerCase().includes('calculate') || userMessage.toLowerCase().includes('unable'));
});

Deno.test('VariableResolutionError - includes cause', () => {
    const cause = new Error('Filter returned no data');
    const error = new VariableResolutionError('revenue', 'income_statement', cause);

    assertEquals(error.cause, cause);
    const technical = error.getTechnicalMessage();
    assert(technical.includes('Filter returned no data'));
});

Deno.test('ExpressionEvaluationError - creates with expression', () => {
    const cause = new Error('Division by zero');
    const error = new ExpressionEvaluationError('revenue / count', cause);

    assertEquals(error.code, ErrorCodes.RPT_EXPRESSION_EVAL);
    assertEquals(error.expression, 'revenue / count');
    assert(error.message.includes('revenue / count'));
    assertEquals(error.cause, cause);
    assert(error instanceof ExpressionEvaluationError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('ExpressionEvaluationError - user message includes expression', () => {
    const cause = new Error('Invalid syntax');
    const error = new ExpressionEvaluationError('revenue - cogs', cause);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('revenue - cogs'));
    assert(userMessage.toLowerCase().includes('calculate') || userMessage.toLowerCase().includes('formula'));
});

Deno.test('LayoutProcessingError - creates with order and type', () => {
    const error = new LayoutProcessingError(10, 'subtotal');

    assertEquals(error.code, ErrorCodes.RPT_LAYOUT_PROCESSING);
    assertEquals(error.layoutOrder, 10);
    assertEquals(error.layoutType, 'subtotal');
    assert(error.message.includes('10'));
    assert(error.message.includes('subtotal'));
    assert(error instanceof LayoutProcessingError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('LayoutProcessingError - creates without type', () => {
    const error = new LayoutProcessingError(5);

    assertEquals(error.layoutOrder, 5);
    assertEquals(error.layoutType, undefined);
    assert(error.message.includes('5'));
});

Deno.test('LayoutProcessingError - user message includes order', () => {
    const error = new LayoutProcessingError(15, 'header');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('15') || userMessage.includes('#15'));
});

Deno.test('LayoutProcessingError - includes cause', () => {
    const cause = new Error('Invalid range');
    const error = new LayoutProcessingError(10, 'subtotal', cause);

    assertEquals(error.cause, cause);
});

Deno.test('InvalidReportDefinitionError - creates with report ID and reason', () => {
    const error = new InvalidReportDefinitionError(
        'income_statement_default',
        'Missing required field: layout'
    );

    assertEquals(error.code, ErrorCodes.RPT_INVALID_DEFINITION);
    assertEquals(error.reportId, 'income_statement_default');
    assert(error.message.includes('income_statement_default'));
    assert(error.message.includes('Missing required field: layout'));
    assert(error instanceof InvalidReportDefinitionError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('InvalidReportDefinitionError - user message is clear', () => {
    const error = new InvalidReportDefinitionError(
        'balance_sheet',
        'Invalid layout structure'
    );

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('balance_sheet'));
    assert(userMessage.includes('Invalid layout structure'));
});

Deno.test('ReportNotFoundError - creates with report ID', () => {
    const error = new ReportNotFoundError('custom_report_123');

    assertEquals(error.code, ErrorCodes.RPT_NOT_FOUND);
    assertEquals(error.reportId, 'custom_report_123');
    assert(error.message.includes('custom_report_123'));
    assert(error instanceof ReportNotFoundError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('ReportNotFoundError - user message is helpful', () => {
    const error = new ReportNotFoundError('missing_report');

    const userMessage = error.getUserMessage();
    
    assert(userMessage.includes('missing_report'));
    assert(userMessage.toLowerCase().includes('not found') || userMessage.toLowerCase().includes('was not found'));
});

Deno.test('CircularDependencyError - creates with dependency chain', () => {
    const chain = ['revenue', 'total', 'gross_profit', 'revenue'];
    const error = new CircularDependencyError(chain);

    assertEquals(error.code, ErrorCodes.RPT_CIRCULAR_DEPENDENCY);
    assertEquals(error.dependencyChain.length, 4);
    assertEquals(error.dependencyChain[0], 'revenue');
    assert(error.message.includes('revenue'));
    assert(error.message.includes('→'));
    assert(error instanceof CircularDependencyError);
    assert(error instanceof ReportGenerationError);
});

Deno.test('CircularDependencyError - user message explains issue', () => {
    const chain = ['a', 'b', 'c', 'a'];
    const error = new CircularDependencyError(chain);

    const userMessage = error.getUserMessage();
    
    assert(userMessage.toLowerCase().includes('circular'));
    assert(userMessage.toLowerCase().includes('dependency'));
});

Deno.test('ReportGenerationError - preserves error hierarchy', () => {
    const variable = new VariableResolutionError('test', 'report');
    const expression = new ExpressionEvaluationError('test', new Error('test'));
    const layout = new LayoutProcessingError(1);
    const definition = new InvalidReportDefinitionError('test', 'reason');
    const notFound = new ReportNotFoundError('test');
    const circular = new CircularDependencyError(['a', 'b', 'a']);

    // All should be instances of ReportGenerationError
    assert(variable instanceof ReportGenerationError);
    assert(expression instanceof ReportGenerationError);
    assert(layout instanceof ReportGenerationError);
    assert(definition instanceof ReportGenerationError);
    assert(notFound instanceof ReportGenerationError);
    assert(circular instanceof ReportGenerationError);

    // All should be instances of Error
    assert(variable instanceof Error);
    assert(expression instanceof Error);
    assert(layout instanceof Error);
});

Deno.test('ReportGenerationError - each has unique error code', () => {
    const variable = new VariableResolutionError('test', 'report');
    const expression = new ExpressionEvaluationError('test', new Error('test'));
    const layout = new LayoutProcessingError(1);
    const definition = new InvalidReportDefinitionError('test', 'reason');
    const notFound = new ReportNotFoundError('test');
    const circular = new CircularDependencyError(['a', 'b', 'a']);

    assertEquals(variable.code, ErrorCodes.RPT_VARIABLE_NOT_FOUND);
    assertEquals(expression.code, ErrorCodes.RPT_EXPRESSION_EVAL);
    assertEquals(layout.code, ErrorCodes.RPT_LAYOUT_PROCESSING);
    assertEquals(definition.code, ErrorCodes.RPT_INVALID_DEFINITION);
    assertEquals(notFound.code, ErrorCodes.RPT_NOT_FOUND);
    assertEquals(circular.code, ErrorCodes.RPT_CIRCULAR_DEPENDENCY);

    // All codes should be different
    const codes = [variable.code, expression.code, layout.code, definition.code, notFound.code, circular.code];
    const uniqueCodes = new Set(codes);
    assertEquals(uniqueCodes.size, codes.length);
});

Deno.test('ReportGenerationError - context is populated correctly', () => {
    const error = new VariableResolutionError('revenue', 'income_statement');

    assertEquals((error.context as any).variableName, 'revenue');
    assertEquals((error.context as any).reportId, 'income_statement');
});
