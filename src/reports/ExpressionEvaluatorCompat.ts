/**
 * ExpressionEvaluator - Compatibility Wrapper
 * 
 * Provides OOP interface for backward compatibility while using
 * the new functional implementation under the hood.
 * 
 * This wrapper maintains the same API as the original class-based
 * implementation but delegates to pure functions.
 */

import {
    evaluateExpression,
    validateExpression,
    getDependencies,
    type ExpressionContext,
    type ValidationResult
} from '../core/expressions/evaluator.ts';
import { ErrorFactory } from '../errors/index.ts';

export default class ExpressionEvaluator {
    /**
     * Create a new ExpressionEvaluator
     */
    constructor() {
        // No state needed - all operations are pure functions
    }

    /**
     * Evaluate an expression with given context
     * 
     * @param expression - Expression to evaluate
     * @param context - Context object with variable values
     * @returns Evaluated result or null on error
     */
    evaluate(expression: string, context: ExpressionContext): number | null {
        if (!expression || typeof expression !== 'string') {
            throw ErrorFactory.invalidValue('expression', expression, 'non-empty string');
        }

        if (!context || typeof context !== 'object') {
            throw ErrorFactory.invalidValue('context', context, 'object');
        }

        const result = evaluateExpression(expression, context);
        
        if (result.success) {
            return result.value;
        }
        
        // Result is an error - access the error property
        const error = result.error;
        
        // Return null for evaluation errors (division by zero, etc.)
        if (error.message.includes('Division by zero')) {
            return null;
        }
        
        // Wrap and throw for other errors (syntax errors, undefined variables)
        throw ErrorFactory.expressionError(expression, error);
    }

    /**
     * Parse expression into Abstract Syntax Tree (AST)
     * 
     * Note: This method is kept for compatibility but the AST structure
     * is now immutable and cached internally by the functional implementation.
     * 
     * @param expression - Expression to parse
     * @returns AST node (for compatibility - internal structure may differ)
     */
    parse(expression: string): any {
        // For compatibility, we validate the expression
        // The actual parsing is done internally by evaluateExpression
        const validation = validateExpression(expression);
        if (!validation.isValid) {
            throw new Error(validation.errors[0]);
        }
        
        // Return a placeholder - the actual AST is cached internally
        return { type: 'parsed', expression };
    }

    /**
     * Validate expression syntax
     * 
     * @param expression - Expression to validate
     * @returns Validation result with isValid flag and errors array
     */
    validate(expression: string): ValidationResult {
        return validateExpression(expression);
    }

    /**
     * Get variable dependencies from expression
     * 
     * @param expression - Expression to analyze
     * @returns Array of variable names (including order references like '@10')
     */
    getDependencies(expression: string): string[] {
        const result = getDependencies(expression);
        
        if (result.success) {
            return Array.from(result.value);
        }
        
        // Result is an error - access the error property
        throw result.error;
    }

    /**
     * Clear the AST cache
     * 
     * Note: Cache clearing is no longer needed with the functional implementation
     * as memoization is handled automatically. This method is kept for compatibility.
     */
    clearCache(): void {
        // No-op - memoization is handled internally
    }

    /**
     * Get the current cache size
     * 
     * Note: Cache size is not exposed in the functional implementation.
     * This method returns 0 for compatibility.
     * 
     * @returns Number of cached ASTs (always 0 in functional implementation)
     */
    getCacheSize(): number {
        return 0;
    }
}
