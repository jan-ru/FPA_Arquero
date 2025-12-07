/**
 * Tests for Expression Evaluator (Functional Implementation)
 */

import { describe, it } from 'jsr:@std/testing/bdd';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import {
    tokenize,
    parseExpressionPure,
    parseExpressionMemoized,
    evaluateAST,
    evaluateExpression,
    validateExpression,
    getDependencies,
    evaluateExpressionWith,
    evaluateASTWith,
    type Token,
    type ASTNode,
    type NumberNode,
    type VariableNode,
    type BinaryNode
} from '../../../../src/core/expressions/evaluator.ts';

describe('Expression Evaluator - Functional', () => {
    // ========================================================================
    // Tokenization Tests
    // ========================================================================

    describe('tokenize', () => {
        it('should tokenize simple numbers', () => {
            const result = tokenize('42');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 1);
                assertEquals(result.value[0].type, 'number');
                assertEquals(result.value[0].value, '42');
            }
        });

        it('should tokenize decimal numbers', () => {
            const result = tokenize('3.14');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 1);
                assertEquals(result.value[0].type, 'number');
                assertEquals(result.value[0].value, '3.14');
            }
        });

        it('should tokenize variables', () => {
            const result = tokenize('revenue');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 1);
                assertEquals(result.value[0].type, 'variable');
                assertEquals(result.value[0].value, 'revenue');
            }
        });

        it('should tokenize order references', () => {
            const result = tokenize('@10');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 1);
                assertEquals(result.value[0].type, 'order');
                assertEquals(result.value[0].value, '@10');
            }
        });

        it('should tokenize operators', () => {
            const result = tokenize('+ - * /');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 4);
                assertEquals(result.value[0].value, '+');
                assertEquals(result.value[1].value, '-');
                assertEquals(result.value[2].value, '*');
                assertEquals(result.value[3].value, '/');
            }
        });

        it('should tokenize parentheses', () => {
            const result = tokenize('( )');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 2);
                assertEquals(result.value[0].value, '(');
                assertEquals(result.value[1].value, ')');
            }
        });

        it('should tokenize complex expressions', () => {
            const result = tokenize('(revenue + cogs) * 1.2');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 7);
                assertEquals(result.value[0].value, '(');
                assertEquals(result.value[1].value, 'revenue');
                assertEquals(result.value[2].value, '+');
                assertEquals(result.value[3].value, 'cogs');
                assertEquals(result.value[4].value, ')');
                assertEquals(result.value[5].value, '*');
                assertEquals(result.value[6].value, '1.2');
            }
        });

        it('should skip whitespace', () => {
            const result = tokenize('  10  +  20  ');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 3);
            }
        });

        it('should handle invalid order reference', () => {
            const result = tokenize('@');
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Invalid order reference'), true);
            }
        });

        it('should handle unexpected characters', () => {
            const result = tokenize('10 $ 20');
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Unexpected character'), true);
            }
        });

        it('should handle empty string', () => {
            const result = tokenize('');
            assertEquals(result.success, false);
        });
    });

    // ========================================================================
    // Parsing Tests
    // ========================================================================

    describe('parseExpressionPure', () => {
        it('should parse number literals', () => {
            const result = parseExpressionPure('42');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'number');
                assertEquals((result.value as NumberNode).value, 42);
            }
        });

        it('should parse variable references', () => {
            const result = parseExpressionPure('revenue');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'variable');
                assertEquals((result.value as VariableNode).name, 'revenue');
            }
        });

        it('should parse order references', () => {
            const result = parseExpressionPure('@10');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'order');
            }
        });

        it('should parse addition', () => {
            const result = parseExpressionPure('10 + 20');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'binary');
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '+');
                assertEquals(node.left.type, 'number');
                assertEquals(node.right.type, 'number');
            }
        });

        it('should parse subtraction', () => {
            const result = parseExpressionPure('30 - 10');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '-');
            }
        });

        it('should parse multiplication', () => {
            const result = parseExpressionPure('5 * 6');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '*');
            }
        });

        it('should parse division', () => {
            const result = parseExpressionPure('20 / 4');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '/');
            }
        });

        it('should parse unary minus', () => {
            const result = parseExpressionPure('-10');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'unary');
            }
        });

        it('should parse unary plus', () => {
            const result = parseExpressionPure('+10');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'unary');
            }
        });

        it('should parse parentheses', () => {
            const result = parseExpressionPure('(10 + 20)');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'binary');
            }
        });

        it('should respect operator precedence (multiplication before addition)', () => {
            const result = parseExpressionPure('10 + 20 * 30');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '+');
                assertEquals(node.left.type, 'number');
                assertEquals(node.right.type, 'binary');
                assertEquals((node.right as BinaryNode).operator, '*');
            }
        });

        it('should respect operator precedence (division before subtraction)', () => {
            const result = parseExpressionPure('100 - 20 / 4');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '-');
                assertEquals(node.right.type, 'binary');
                assertEquals((node.right as BinaryNode).operator, '/');
            }
        });

        it('should respect parentheses for precedence override', () => {
            const result = parseExpressionPure('(10 + 20) * 30');
            assertEquals(result.success, true);
            if (result.success) {
                const node = result.value as BinaryNode;
                assertEquals(node.operator, '*');
                assertEquals(node.left.type, 'binary');
                assertEquals((node.left as BinaryNode).operator, '+');
            }
        });

        it('should parse complex nested expressions', () => {
            const result = parseExpressionPure('((10 + 20) * 30) / (5 - 2)');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.type, 'binary');
            }
        });

        it('should handle missing closing parenthesis', () => {
            const result = parseExpressionPure('(10 + 20');
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Missing closing parenthesis'), true);
            }
        });

        it('should handle unexpected token after expression', () => {
            const result = parseExpressionPure('10 + 20 )');
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Unexpected token'), true);
            }
        });

        it('should handle unexpected end of expression', () => {
            const result = parseExpressionPure('10 +');
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Unexpected end'), true);
            }
        });
    });

    describe('parseExpressionMemoized', () => {
        it('should cache parsed expressions', () => {
            const expr = '10 + 20 * 30';
            const result1 = parseExpressionMemoized(expr);
            const result2 = parseExpressionMemoized(expr);
            
            assertEquals(result1.success, true);
            assertEquals(result2.success, true);
            
            // Should return same object reference (memoized)
            if (result1.success && result2.success) {
                assertEquals(result1.value, result2.value);
            }
        });
    });

    // ========================================================================
    // Evaluation Tests
    // ========================================================================

    describe('evaluateAST', () => {
        it('should evaluate number nodes', () => {
            const ast: NumberNode = { type: 'number', value: 42 };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 42);
            }
        });

        it('should evaluate variable nodes', () => {
            const ast: VariableNode = { type: 'variable', name: 'revenue' };
            const result = evaluateAST(ast, { revenue: 100000 });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 100000);
            }
        });

        it('should handle undefined variables', () => {
            const ast: VariableNode = { type: 'variable', name: 'unknown' };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Undefined variable'), true);
            }
        });

        it('should evaluate addition', () => {
            const ast: BinaryNode = {
                type: 'binary',
                operator: '+',
                left: { type: 'number', value: 10 },
                right: { type: 'number', value: 20 }
            };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 30);
            }
        });

        it('should evaluate subtraction', () => {
            const ast: BinaryNode = {
                type: 'binary',
                operator: '-',
                left: { type: 'number', value: 30 },
                right: { type: 'number', value: 10 }
            };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 20);
            }
        });

        it('should evaluate multiplication', () => {
            const ast: BinaryNode = {
                type: 'binary',
                operator: '*',
                left: { type: 'number', value: 5 },
                right: { type: 'number', value: 6 }
            };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 30);
            }
        });

        it('should evaluate division', () => {
            const ast: BinaryNode = {
                type: 'binary',
                operator: '/',
                left: { type: 'number', value: 20 },
                right: { type: 'number', value: 4 }
            };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 5);
            }
        });

        it('should handle division by zero', () => {
            const ast: BinaryNode = {
                type: 'binary',
                operator: '/',
                left: { type: 'number', value: 10 },
                right: { type: 'number', value: 0 }
            };
            const result = evaluateAST(ast, {});
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Division by zero'), true);
            }
        });
    });

    describe('evaluateExpression', () => {
        it('should evaluate simple arithmetic', () => {
            const result = evaluateExpression('10 + 20', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 30);
            }
        });

        it('should evaluate with variables', () => {
            const result = evaluateExpression('revenue + cogs', {
                revenue: 100000,
                cogs: -60000
            });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 40000);
            }
        });

        it('should evaluate with order references', () => {
            const result = evaluateExpression('@10 + @20', {
                '@10': 100,
                '@20': 200
            });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 300);
            }
        });

        it('should evaluate complex expressions', () => {
            const result = evaluateExpression('(revenue - cogs) / revenue * 100', {
                revenue: 100000,
                cogs: 60000
            });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 40);
            }
        });

        it('should respect operator precedence', () => {
            const result = evaluateExpression('10 + 20 * 30', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 610); // 10 + (20 * 30) = 10 + 600 = 610
            }
        });

        it('should respect parentheses', () => {
            const result = evaluateExpression('(10 + 20) * 30', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 900); // (10 + 20) * 30 = 30 * 30 = 900
            }
        });

        it('should handle unary minus', () => {
            const result = evaluateExpression('-10 + 20', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 10);
            }
        });

        it('should handle unary plus', () => {
            const result = evaluateExpression('+10 + 20', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 30);
            }
        });

        it('should handle nested parentheses', () => {
            const result = evaluateExpression('((10 + 20) * 30) / (5 - 2)', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 300); // ((30) * 30) / 3 = 900 / 3 = 300
            }
        });

        it('should handle decimal numbers', () => {
            const result = evaluateExpression('3.14 * 2', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(Math.abs(result.value - 6.28) < 0.001, true);
            }
        });

        it('should handle syntax errors', () => {
            const result = evaluateExpression('10 +', {});
            assertEquals(result.success, false);
        });

        it('should handle undefined variables', () => {
            const result = evaluateExpression('revenue + unknown', { revenue: 100 });
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Undefined variable'), true);
            }
        });

        it('should handle division by zero', () => {
            const result = evaluateExpression('10 / 0', {});
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Division by zero'), true);
            }
        });
    });

    // ========================================================================
    // Validation Tests
    // ========================================================================

    describe('validateExpression', () => {
        it('should validate correct expressions', () => {
            const result = validateExpression('10 + 20');
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should validate complex expressions', () => {
            const result = validateExpression('(revenue - cogs) / revenue * 100');
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should reject invalid syntax', () => {
            const result = validateExpression('10 +');
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length > 0, true);
        });

        it('should reject empty strings', () => {
            const result = validateExpression('');
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length > 0, true);
        });

        it('should reject missing parentheses', () => {
            const result = validateExpression('(10 + 20');
            assertEquals(result.isValid, false);
        });

        it('should reject unexpected tokens', () => {
            const result = validateExpression('10 + 20 )');
            assertEquals(result.isValid, false);
        });
    });

    // ========================================================================
    // Dependency Analysis Tests
    // ========================================================================

    describe('getDependencies', () => {
        it('should extract variable dependencies', () => {
            const result = getDependencies('revenue + cogs');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 2);
                assertEquals(result.value.includes('revenue'), true);
                assertEquals(result.value.includes('cogs'), true);
            }
        });

        it('should extract order dependencies', () => {
            const result = getDependencies('@10 + @20');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 2);
                assertEquals(result.value.includes('@10'), true);
                assertEquals(result.value.includes('@20'), true);
            }
        });

        it('should handle duplicate variables', () => {
            const result = getDependencies('revenue + revenue');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 1);
                assertEquals(result.value[0], 'revenue');
            }
        });

        it('should handle expressions with no variables', () => {
            const result = getDependencies('10 + 20');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 0);
            }
        });

        it('should handle complex nested expressions', () => {
            const result = getDependencies('(revenue - cogs) / revenue * 100');
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.length, 2);
                assertEquals(result.value.includes('revenue'), true);
                assertEquals(result.value.includes('cogs'), true);
            }
        });

        it('should handle invalid expressions', () => {
            const result = getDependencies('10 +');
            assertEquals(result.success, false);
        });
    });

    // ========================================================================
    // Curried Functions Tests
    // ========================================================================

    describe('evaluateExpressionWith', () => {
        it('should allow partial application of context', () => {
            const context = { revenue: 100000, cogs: 60000 };
            const evaluate = evaluateExpressionWith(context);

            const result1 = evaluate('revenue + cogs');
            assertEquals(result1.success, true);
            if (result1.success) {
                assertEquals(result1.value, 160000); // 100000 + 60000
            }

            const result2 = evaluate('revenue - cogs');
            assertEquals(result2.success, true);
            if (result2.success) {
                assertEquals(result2.value, 40000); // 100000 - 60000
            }
        });
    });

    describe('evaluateASTWith', () => {
        it('should allow partial application of context', () => {
            const context = { revenue: 100000 };
            const evaluate = evaluateASTWith(context);

            const ast: VariableNode = { type: 'variable', name: 'revenue' };
            const result = evaluate(ast);
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 100000);
            }
        });
    });

    // ========================================================================
    // Edge Cases and Error Handling
    // ========================================================================

    describe('Edge Cases', () => {
        it('should handle very large numbers', () => {
            const result = evaluateExpression('999999999 + 1', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 1000000000);
            }
        });

        it('should handle very small numbers', () => {
            const result = evaluateExpression('0.0001 * 0.0001', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(Math.abs(result.value - 0.00000001) < 0.000000001, true);
            }
        });

        it('should handle negative results', () => {
            const result = evaluateExpression('10 - 20', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, -10);
            }
        });

        it('should handle zero values', () => {
            const result = evaluateExpression('0 + 0', {});
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 0);
            }
        });

        it('should handle variables with underscores', () => {
            const result = evaluateExpression('gross_profit + net_income', {
                gross_profit: 1000,
                net_income: 500
            });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 1500);
            }
        });

        it('should handle mixed case variables', () => {
            const result = evaluateExpression('Revenue + COGS', {
                Revenue: 100,
                COGS: 60
            });
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value, 160);
            }
        });
    });
});
