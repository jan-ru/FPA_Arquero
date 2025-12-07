/**
 * Property-Based Tests for ExpressionEvaluator
 * 
 * Feature: configurable-report-definitions, Property 2: Expression Evaluation Determinism
 * Validates: Requirements 4.1-4.7
 * 
 * These tests verify that the ExpressionEvaluator produces deterministic results
 * when evaluating expressions with the same context multiple times.
 */

import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import fc from "fast-check";
import ExpressionEvaluator from "../../../src/reports/ExpressionEvaluator.ts";

let evaluator: ExpressionEvaluator;

beforeEach(() => {
    evaluator = new ExpressionEvaluator();
});

describe("ExpressionEvaluator - Property-Based Tests", () => {
    describe("Property 2: Expression Evaluation Determinism", () => {
        /**
         * Property: For any valid expression and context,
         * evaluating the expression multiple times with the same context
         * must produce the same result.
         */
        it("should produce deterministic results for arithmetic expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random arithmetic expression components
                    fc.integer({ min: -1000, max: 1000 }),
                    fc.integer({ min: -1000, max: 1000 }),
                    fc.constantFrom('+', '-', '*'),
                    (num1, num2, operator) => {
                        // Build expression
                        const expression = `${num1} ${operator} ${num2}`;
                        const context = {};
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For expressions with variables,
         * evaluating multiple times with the same context produces the same result
         */
        it("should produce deterministic results for variable expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random variable names and values
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.constantFrom('+', '-', '*'),
                    (var1, var2, val1, val2, operator) => {
                        // Skip if variables are the same
                        if (var1 === var2) return;
                        
                        // Build expression and context
                        const expression = `${var1} ${operator} ${var2}`;
                        const context = {
                            [var1]: val1,
                            [var2]: val2
                        };
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" with context ${JSON.stringify(context)} produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For expressions with order references,
         * evaluating multiple times with the same context produces the same result
         */
        it("should produce deterministic results for order reference expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random order numbers and values
                    fc.integer({ min: 10, max: 100 }),
                    fc.integer({ min: 10, max: 100 }),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.constantFrom('+', '-', '*'),
                    (order1, order2, val1, val2, operator) => {
                        // Skip if orders are the same
                        if (order1 === order2) return;
                        
                        // Build expression and context
                        const expression = `@${order1} ${operator} @${order2}`;
                        const context = {
                            [`@${order1}`]: val1,
                            [`@${order2}`]: val2
                        };
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" with context ${JSON.stringify(context)} produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For complex expressions with parentheses,
         * evaluating multiple times produces the same result
         */
        it("should produce deterministic results for parenthesized expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random numbers
                    fc.integer({ min: -1000, max: 1000 }),
                    fc.integer({ min: -1000, max: 1000 }),
                    fc.integer({ min: -1000, max: 1000 }),
                    (num1, num2, num3) => {
                        // Build expression with parentheses
                        const expression = `(${num1} + ${num2}) * ${num3}`;
                        const context = {};
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For expressions with unary operators,
         * evaluating multiple times produces the same result
         */
        it("should produce deterministic results for unary expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random variable and value
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.integer({ min: -10000, max: 10000 }),
                    (varName, value) => {
                        // Build expression with unary minus
                        const expression = `-${varName}`;
                        const context = { [varName]: value };
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" with context ${JSON.stringify(context)} produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For mixed expressions (variables, literals, operators),
         * evaluating multiple times produces the same result
         */
        it("should produce deterministic results for mixed expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random components
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.integer({ min: 1, max: 100 }),
                    fc.constantFrom('+', '-', '*'),
                    (varName, varValue, literal, operator) => {
                        // Build mixed expression
                        const expression = `${varName} ${operator} ${literal}`;
                        const context = { [varName]: varValue };
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" with context ${JSON.stringify(context)} produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Division by zero should consistently return null
         */
        it("should consistently return null for division by zero", () => {
            fc.assert(
                fc.property(
                    // Generate random numerator
                    fc.integer({ min: -10000, max: 10000 }),
                    (numerator) => {
                        // Build division by zero expression
                        const expression = `${numerator} / 0`;
                        const context = {};
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Both results must be null
                        assertEquals(
                            result1,
                            null,
                            `Division by zero should return null, got ${result1}`
                        );
                        assertEquals(
                            result2,
                            null,
                            `Division by zero should return null, got ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Cached expressions should produce the same result as non-cached
         */
        it("should produce same results with and without caching", () => {
            fc.assert(
                fc.property(
                    // Generate random expression components
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/),
                    fc.integer({ min: -10000, max: 10000 }),
                    fc.integer({ min: -10000, max: 10000 }),
                    (var1, var2, val1, val2) => {
                        // Skip if variables are the same
                        if (var1 === var2) return;
                        
                        // Build expression and context
                        const expression = `${var1} + ${var2}`;
                        const context = {
                            [var1]: val1,
                            [var2]: val2
                        };
                        
                        // Clear cache and evaluate
                        evaluator.clearCache();
                        const resultNoCache = evaluator.evaluate(expression, context);
                        
                        // Evaluate again (should use cache)
                        const resultCached = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            resultCached,
                            resultNoCache,
                            `Cached result ${resultCached} differs from non-cached ${resultNoCache}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Complex nested expressions should be deterministic
         */
        it("should produce deterministic results for complex nested expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random values
                    fc.integer({ min: 1, max: 1000 }),
                    fc.integer({ min: 1, max: 1000 }),
                    fc.integer({ min: 1, max: 1000 }),
                    fc.integer({ min: 1, max: 1000 }),
                    (a, b, c, d) => {
                        // Build complex expression
                        const expression = `((${a} + ${b}) * ${c}) / ${d}`;
                        const context = {};
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Expressions with multiple operations should be deterministic
         */
        it("should produce deterministic results for multi-operation expressions", () => {
            fc.assert(
                fc.property(
                    // Generate random variable names and values
                    fc.array(
                        fc.record({
                            name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,5}$/),
                            value: fc.integer({ min: -1000, max: 1000 })
                        }),
                        { minLength: 3, maxLength: 5 }
                    ),
                    (variables) => {
                        // Ensure unique variable names
                        const uniqueVars = Array.from(
                            new Map(variables.map(v => [v.name, v.value])).entries()
                        );
                        
                        if (uniqueVars.length < 3) return;
                        
                        // Build expression with multiple operations
                        const expression = `${uniqueVars[0][0]} + ${uniqueVars[1][0]} - ${uniqueVars[2][0]}`;
                        const context = Object.fromEntries(uniqueVars);
                        
                        // Evaluate twice
                        const result1 = evaluator.evaluate(expression, context);
                        const result2 = evaluator.evaluate(expression, context);
                        
                        // Assert: Results must be identical
                        assertEquals(
                            result1,
                            result2,
                            `Expression "${expression}" with context ${JSON.stringify(context)} produced different results: ${result1} vs ${result2}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
