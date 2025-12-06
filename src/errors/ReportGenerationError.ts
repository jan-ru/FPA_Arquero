import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Context for report generation errors
 */
export interface ReportContext extends ErrorContext {
    /** Report ID */
    reportId?: string;
    
    /** Report name */
    reportName?: string;
    
    /** Statement type (income, balance, cashflow) */
    statementType?: string;
    
    /** Variable name being resolved */
    variableName?: string;
    
    /** Expression being evaluated */
    expression?: string;
    
    /** Layout item order number */
    layoutOrder?: number;
    
    /** Layout item type */
    layoutType?: string;
}

/**
 * Base class for report generation errors
 * 
 * Used for errors that occur during financial statement generation,
 * including variable resolution, expression evaluation, and layout processing.
 * 
 * @example
 * throw new ReportGenerationError('Failed to generate income statement', {
 *   reportId: 'income_statement_default',
 *   statementType: 'income'
 * }, originalError);
 */
export class ReportGenerationError extends ApplicationError {
    constructor(
        message: string,
        context: ReportContext = {},
        cause?: Error
    ) {
        const reportName = context.reportName || context.reportId || 'report';
        const userMessage = `Failed to generate ${reportName}. Please check the report definition and data.`;
        
        super(message, {
            code: ErrorCodes.RPT_LAYOUT_PROCESSING,
            userMessage,
            context,
            cause,
            logLevel: 'error',
        });
    }
}

/**
 * Error thrown when a variable cannot be resolved
 * 
 * @example
 * throw new VariableResolutionError('revenue', 'income_statement_default');
 * 
 * @example
 * throw new VariableResolutionError(
 *   'total_assets',
 *   'balance_sheet_default',
 *   new Error('Filter returned no data')
 * );
 */
export class VariableResolutionError extends ReportGenerationError {
    readonly variableName: string;
    readonly reportId: string;
    
    constructor(variableName: string, reportId: string, cause?: Error) {
        const message = `Failed to resolve variable "${variableName}" in report "${reportId}"`;
        const userMessage = `Unable to calculate "${variableName}". The data may be missing or the report definition may be incorrect.`;
        
        super(message, { variableName, reportId }, cause);
        
        this.variableName = variableName;
        this.reportId = reportId;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_VARIABLE_NOT_FOUND;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when expression evaluation fails
 * 
 * @example
 * try {
 *   const result = evaluator.evaluate('revenue - cogs');
 * } catch (error) {
 *   throw new ExpressionEvaluationError('revenue - cogs', error);
 * }
 */
export class ExpressionEvaluationError extends ReportGenerationError {
    readonly expression: string;
    
    constructor(expression: string, cause: Error) {
        const message = `Failed to evaluate expression: ${expression}`;
        const userMessage = `Unable to calculate the expression "${expression}". Please check the formula.`;
        
        super(message, { expression }, cause);
        
        this.expression = expression;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_EXPRESSION_EVAL;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when layout processing fails
 * 
 * @example
 * throw new LayoutProcessingError(10, 'subtotal', new Error('Invalid range'));
 */
export class LayoutProcessingError extends ReportGenerationError {
    readonly layoutOrder: number;
    readonly layoutType?: string;
    
    constructor(layoutOrder: number, layoutType?: string, cause?: Error) {
        const message = `Failed to process layout item at order ${layoutOrder}${layoutType ? ` (type: ${layoutType})` : ''}`;
        const userMessage = `Unable to process report layout item #${layoutOrder}. The report definition may be incorrect.`;
        
        super(message, { layoutOrder, layoutType }, cause);
        
        this.layoutOrder = layoutOrder;
        this.layoutType = layoutType;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_LAYOUT_PROCESSING;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when report definition is invalid
 * 
 * @example
 * throw new InvalidReportDefinitionError(
 *   'income_statement_default',
 *   'Missing required field: layout'
 * );
 */
export class InvalidReportDefinitionError extends ReportGenerationError {
    readonly reportId: string;
    
    constructor(reportId: string, reason: string, cause?: Error) {
        const message = `Invalid report definition "${reportId}": ${reason}`;
        const userMessage = `The report definition for "${reportId}" is invalid: ${reason}.`;
        
        super(message, { reportId }, cause);
        
        this.reportId = reportId;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_INVALID_DEFINITION;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when a report is not found in the registry
 * 
 * @example
 * throw new ReportNotFoundError('income_statement_custom');
 */
export class ReportNotFoundError extends ReportGenerationError {
    readonly reportId: string;
    
    constructor(reportId: string) {
        const message = `Report not found: ${reportId}`;
        const userMessage = `The report "${reportId}" was not found. Please check the report ID.`;
        
        super(message, { reportId });
        
        this.reportId = reportId;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_NOT_FOUND;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when circular dependency is detected in variables
 * 
 * @example
 * throw new CircularDependencyError(['revenue', 'total', 'revenue']);
 */
export class CircularDependencyError extends ReportGenerationError {
    readonly dependencyChain: string[];
    
    constructor(dependencyChain: string[]) {
        const chain = dependencyChain.join(' → ');
        const message = `Circular dependency detected: ${chain}`;
        const userMessage = `Circular dependency detected in report variables. Please check the variable definitions.`;
        
        super(message, { dependencyChain });
        
        this.dependencyChain = dependencyChain;
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_CIRCULAR_DEPENDENCY;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when filter evaluation fails
 * 
 * @example
 * throw new FilterError('balance > 0', filterError, 'income_statement');
 */
export class FilterError extends ReportGenerationError {
    constructor(filterExpression: string, cause: Error, reportId?: string) {
        const message = `Filter evaluation failed: ${filterExpression}`;
        const userMessage = `Unable to apply filter. The filter expression "${filterExpression}" is invalid.`;
        
        super(message, { filterExpression, reportId }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_FILTER_ERROR;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when subtotal calculation fails
 * 
 * @example
 * throw new SubtotalError(10, 20, calculationError, 'income_statement');
 */
export class SubtotalError extends ReportGenerationError {
    constructor(fromOrder: number, toOrder: number, cause: Error, reportId?: string) {
        const message = `Subtotal calculation failed from order ${fromOrder} to ${toOrder}`;
        const userMessage = `Unable to calculate subtotal for items ${fromOrder} to ${toOrder}.`;
        
        super(message, { fromOrder, toOrder, reportId }, cause);
        
        // Override code and user message
        (this as any).code = ErrorCodes.RPT_SUBTOTAL_ERROR;
        (this as any).userMessage = userMessage;
    }
}

export default ReportGenerationError;
