/**
 * Unit Tests for ExpressionEvaluator
 * 
 * Tests the ExpressionEvaluator component which parses and evaluates calculation expressions.
 * Validates: Requirements 4.1-4.13
 */

import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ExpressionEvaluator from "../../../src/reports/ExpressionEvaluator.js";

let evaluator: ExpressionEvaluator;

beforeEach(() => {
    evaluator = new ExpressionEvaluator();
});

describe("ExpressionEvaluator - Unit Tests", () => {
    describe("evaluate() - Arithmetic Operations", () => {
        it("should evaluate addition", () => {
            const result = evaluator.evaluate("10 + 20", {});
            assertEquals(result, 30);
        });

        it("should evaluate subtraction", () => {
            const result = evaluator.evaluate("50 - 20", {});
            assertEquals(result, 30);
        });

        it("should evaluate multiplication", () => {
            const result = evaluator.evaluate("5 * 6", {});
            assertEquals(result, 30);
        });

        it("should evaluate division", () => {
            const result = evaluator.evaluate("60 / 2", {});
            assertEquals(result, 30);
        });

        it("should evaluate complex arithmetic", () => {
            const result = evaluator.evaluate("10 + 20 - 5 * 2 / 2", {});
            assertEquals(result, 25); // 10 + 20 - (5 * 2 / 2) = 10 + 20 - 5 = 25
        });

        it("should handle decimal numbers", () => {
            const result = evaluator.evaluate("10.5 + 20.3", {});
            assertEquals(result, 30.8);
        });

        it("should handle negative results", () => {
            const result = evaluator.evaluate("10 - 50", {});
            assertEquals(result, -40);
        });

        it("should handle zero", () => {
            const result = evaluator.evaluate("0 + 0", {});
            assertEquals(result, 0);
        });
    });

    describe("evaluate() - Operator Precedence", () => {
        it("should multiply before adding", () => {
            const result = evaluator.evaluate("2 + 3 * 4", {});
            assertEquals(result, 14); // 2 + (3 * 4) = 2 + 12 = 14
        });

        it("should divide before subtracting", () => {
            const result = evaluator.evaluate("20 - 10 / 2", {});
            assertEquals(result, 15); // 20 - (10 / 2) = 20 - 5 = 15
        });

        it("should evaluate left to right for same precedence", () => {
            const result = evaluator.evaluate("10 - 5 - 2", {});
            assertEquals(result, 3); // (10 - 5) - 2 = 5 - 2 = 3
        });

        it("should evaluate multiplication and division left to right", () => {
            const result = evaluator.evaluate("20 / 2 * 3", {});
            assertEquals(result, 30); // (20 / 2) * 3 = 10 * 3 = 30
        });

        it("should handle complex precedence", () => {
            const result = evaluator.evaluate("2 + 3 * 4 - 10 / 2", {});
            assertEquals(result, 9); // 2 + (3 * 4) - (10 / 2) = 2 + 12 - 5 = 9
        });
    });

    describe("evaluate() - Parentheses", () => {
        it("should override precedence with parentheses", () => {
            const result = evaluator.evaluate("(2 + 3) * 4", {});
            assertEquals(result, 20); // (2 + 3) * 4 = 5 * 4 = 20
        });

        it("should handle nested parentheses", () => {
            const result = evaluator.evaluate("((2 + 3) * 4) - 5", {});
            assertEquals(result, 15); // ((2 + 3) * 4) - 5 = (5 * 4) - 5 = 20 - 5 = 15
        });

        it("should handle multiple parentheses groups", () => {
            const result = evaluator.evaluate("(10 + 5) * (3 - 1)", {});
            assertEquals(result, 30); // (10 + 5) * (3 - 1) = 15 * 2 = 30
        });

        it("should handle deeply nested parentheses", () => {
            const result = evaluator.evaluate("(((10 + 5) * 2) - 10) / 2", {});
            assertEquals(result, 10); // (((10 + 5) * 2) - 10) / 2 = ((15 * 2) - 10) / 2 = (30 - 10) / 2 = 20 / 2 = 10
        });

        it("should handle parentheses with single value", () => {
            const result = evaluator.evaluate("(42)", {});
            assertEquals(result, 42);
        });

        it("should throw error for missing closing parenthesis", () => {
            assertThrows(
                () => evaluator.evaluate("(10 + 5", {}),
                Error,
                "Missing closing parenthesis"
            );
        });

        it("should throw error for missing opening parenthesis", () => {
            assertThrows(
                () => evaluator.evaluate("10 + 5)", {}),
                Error,
                "Unexpected token"
            );
        });

        it("should throw error for empty parentheses", () => {
            assertThrows(
                () => evaluator.evaluate("()", {}),
                Error,
                "Unexpected"
            );
        });
    });

    describe("evaluate() - Unary Minus", () => {
        it("should handle unary minus on number", () => {
            const result = evaluator.evaluate("-10", {});
            assertEquals(result, -10);
        });

        it("should handle unary minus in expression", () => {
            const result = evaluator.evaluate("-10 + 20", {});
            assertEquals(result, 10);
        });

        it("should handle unary minus on variable", () => {
            const result = evaluator.evaluate("-revenue", { revenue: 100 });
            assertEquals(result, -100);
        });

        it("should handle double unary minus", () => {
            const result = evaluator.evaluate("--10", {});
            assertEquals(result, 10);
        });

        it("should handle unary minus with parentheses", () => {
            const result = evaluator.evaluate("-(10 + 5)", {});
            assertEquals(result, -15);
        });

        it("should handle unary minus in multiplication", () => {
            const result = evaluator.evaluate("-5 * 3", {});
            assertEquals(result, -15);
        });

        it("should handle unary plus", () => {
            const result = evaluator.evaluate("+10", {});
            assertEquals(result, 10);
        });

        it("should handle unary plus on variable", () => {
            const result = evaluator.evaluate("+revenue", { revenue: 100 });
            assertEquals(result, 100);
        });
    });

    describe("evaluate() - Variable References", () => {
        it("should resolve simple variable", () => {
            const result = evaluator.evaluate("revenue", { revenue: 1000 });
            assertEquals(result, 1000);
        });

        it("should resolve multiple variables", () => {
            const result = evaluator.evaluate("revenue + cogs", { 
                revenue: 1000, 
                cogs: -600 
            });
            assertEquals(result, 400);
        });

        it("should resolve variables with underscores", () => {
            const result = evaluator.evaluate("gross_profit", { gross_profit: 500 });
            assertEquals(result, 500);
        });

        it("should resolve variables with numbers", () => {
            const result = evaluator.evaluate("var1 + var2", { var1: 10, var2: 20 });
            assertEquals(result, 30);
        });

        it("should handle variables in complex expressions", () => {
            const result = evaluator.evaluate("(revenue - cogs) / revenue * 100", {
                revenue: 1000,
                cogs: -600
            });
            assertEquals(result, 160); // (1000 - (-600)) / 1000 * 100 = 1600 / 1000 * 100 = 160
        });

        it("should handle zero-valued variables", () => {
            const result = evaluator.evaluate("revenue + cogs", { 
                revenue: 0, 
                cogs: 0 
            });
            assertEquals(result, 0);
        });

        it("should handle negative variables", () => {
            const result = evaluator.evaluate("revenue + cogs", { 
                revenue: 1000, 
                cogs: -600 
            });
            assertEquals(result, 400);
        });

        it("should throw error for undefined variable", () => {
            assertThrows(
                () => evaluator.evaluate("revenue + undefined_var", { revenue: 1000 }),
                Error,
                "Undefined variable: undefined_var"
            );
        });

        it("should throw error for missing variable in context", () => {
            assertThrows(
                () => evaluator.evaluate("revenue", {}),
                Error,
                "Undefined variable: revenue"
            );
        });
    });

    describe("evaluate() - Order References", () => {
        it("should resolve order reference", () => {
            const result = evaluator.evaluate("@10", { '@10': 500 });
            assertEquals(result, 500);
        });

        it("should resolve multiple order references", () => {
            const result = evaluator.evaluate("@10 + @20", { 
                '@10': 100, 
                '@20': 200 
            });
            assertEquals(result, 300);
        });

        it("should resolve order references with three digits", () => {
            const result = evaluator.evaluate("@100", { '@100': 1000 });
            assertEquals(result, 1000);
        });

        it("should handle order references in complex expressions", () => {
            const result = evaluator.evaluate("(@10 + @20) * 2", {
                '@10': 100,
                '@20': 200
            });
            assertEquals(result, 600);
        });

        it("should handle order references with variables", () => {
            const result = evaluator.evaluate("revenue + @10", {
                revenue: 1000,
                '@10': 500
            });
            assertEquals(result, 1500);
        });

        it("should throw error for undefined order reference", () => {
            assertThrows(
                () => evaluator.evaluate("@10 + @20", { '@10': 100 }),
                Error,
                "Undefined order reference: @20"
            );
        });

        it("should throw error for invalid order reference", () => {
            assertThrows(
                () => evaluator.evaluate("@", {}),
                Error,
                "Invalid order reference"
            );
        });
    });

    describe("evaluate() - Numeric Literals", () => {
        it("should handle integer literals", () => {
            const result = evaluator.evaluate("42", {});
            assertEquals(result, 42);
        });

        it("should handle decimal literals", () => {
            const result = evaluator.evaluate("3.14159", {});
            assertEquals(result, 3.14159);
        });

        it("should handle zero", () => {
            const result = evaluator.evaluate("0", {});
            assertEquals(result, 0);
        });

        it("should handle large numbers", () => {
            const result = evaluator.evaluate("1000000", {});
            assertEquals(result, 1000000);
        });

        it("should handle small decimals", () => {
            const result = evaluator.evaluate("0.001", {});
            assertEquals(result, 0.001);
        });

        it("should handle literals in expressions", () => {
            const result = evaluator.evaluate("revenue * 0.21", { revenue: 1000 });
            assertEquals(result, 210);
        });
    });

    describe("evaluate() - Syntax Error Detection", () => {
        it("should throw error for empty expression", () => {
            assertThrows(
                () => evaluator.evaluate("", {}),
                Error,
                "Expression must be a non-empty string"
            );
        });

        it("should handle unary plus after operator", () => {
            // "10 + + 20" is parsed as "10 + (+20)" which is valid
            const result = evaluator.evaluate("10 + + 20", {});
            assertEquals(result, 30);
        });

        it("should throw error for trailing operator", () => {
            assertThrows(
                () => evaluator.evaluate("10 +", {}),
                Error,
                "Unexpected end of expression"
            );
        });

        it("should throw error for leading operator (except unary)", () => {
            assertThrows(
                () => evaluator.evaluate("* 10", {}),
                Error,
                "Unexpected token"
            );
        });

        it("should throw error for invalid character", () => {
            assertThrows(
                () => evaluator.evaluate("10 & 20", {}),
                Error,
                "Unexpected character"
            );
        });

        it("should throw error for incomplete expression", () => {
            assertThrows(
                () => evaluator.evaluate("10 + ", {}),
                Error,
                "Unexpected end of expression"
            );
        });

        it("should throw error for non-string expression", () => {
            assertThrows(
                () => evaluator.evaluate(123 as any, {}),
                Error,
                "Expression must be a non-empty string"
            );
        });

        it("should throw error for null expression", () => {
            assertThrows(
                () => evaluator.evaluate(null as any, {}),
                Error,
                "Expression must be a non-empty string"
            );
        });

        it("should throw error for undefined expression", () => {
            assertThrows(
                () => evaluator.evaluate(undefined as any, {}),
                Error,
                "Expression must be a non-empty string"
            );
        });
    });

    describe("evaluate() - Division by Zero Handling", () => {
        it("should return null for division by zero", () => {
            const result = evaluator.evaluate("10 / 0", {});
            assertEquals(result, null);
        });

        it("should return null for division by zero with variables", () => {
            const result = evaluator.evaluate("revenue / divisor", { 
                revenue: 1000, 
                divisor: 0 
            });
            assertEquals(result, null);
        });

        it("should return null for complex expression with division by zero", () => {
            const result = evaluator.evaluate("(10 + 5) / (3 - 3)", {});
            assertEquals(result, null);
        });

        it("should handle division by very small number", () => {
            const result = evaluator.evaluate("10 / 0.0001", {});
            assertEquals(result, 100000);
        });
    });

    describe("evaluate() - Edge Cases", () => {
        it("should handle very large numbers", () => {
            const result = evaluator.evaluate("10000000000 + 10000000000", {});
            assertEquals(result, 20000000000);
        });

        it("should handle very small numbers", () => {
            const result = evaluator.evaluate("0.0000000001 + 0.0000000001", {});
            assertEquals(result, 0.0000000002);
        });

        it("should handle large variable values", () => {
            const result = evaluator.evaluate("revenue * 1000000", { revenue: 1000000 });
            assertEquals(result, 1000000000000);
        });

        it("should handle expressions with many operations", () => {
            const result = evaluator.evaluate("1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10", {});
            assertEquals(result, 55);
        });

        it("should handle whitespace variations", () => {
            const result1 = evaluator.evaluate("10+20", {});
            const result2 = evaluator.evaluate("10 + 20", {});
            const result3 = evaluator.evaluate("10  +  20", {});
            assertEquals(result1, 30);
            assertEquals(result2, 30);
            assertEquals(result3, 30);
        });

        it("should handle expression with tabs and newlines", () => {
            const result = evaluator.evaluate("10\t+\n20", {});
            assertEquals(result, 30);
        });
    });

    describe("evaluate() - Context Validation", () => {
        it("should throw error for null context", () => {
            assertThrows(
                () => evaluator.evaluate("10 + 20", null as any),
                Error,
                "Context must be an object"
            );
        });

        it("should throw error for undefined context", () => {
            assertThrows(
                () => evaluator.evaluate("10 + 20", undefined as any),
                Error,
                "Context must be an object"
            );
        });

        it("should throw error for non-object context", () => {
            assertThrows(
                () => evaluator.evaluate("10 + 20", "not an object" as any),
                Error,
                "Context must be an object"
            );
        });

        it("should accept empty context for literal-only expressions", () => {
            const result = evaluator.evaluate("10 + 20", {});
            assertEquals(result, 30);
        });
    });

    describe("parse() - AST Generation", () => {
        it("should parse simple addition", () => {
            const ast = evaluator.parse("10 + 20");
            assertEquals(ast.type, "binary");
            assertEquals(ast.operator, "+");
            assertEquals(ast.left.type, "number");
            assertEquals(ast.left.value, 10);
            assertEquals(ast.right.type, "number");
            assertEquals(ast.right.value, 20);
        });

        it("should parse variable reference", () => {
            const ast = evaluator.parse("revenue");
            assertEquals(ast.type, "variable");
            assertEquals(ast.name, "revenue");
        });

        it("should parse order reference", () => {
            const ast = evaluator.parse("@10");
            assertEquals(ast.type, "order");
            assertEquals(ast.name, "@10");
        });

        it("should parse unary minus", () => {
            const ast = evaluator.parse("-10");
            assertEquals(ast.type, "unary");
            assertEquals(ast.operator, "-");
            assertEquals(ast.operand.type, "number");
            assertEquals(ast.operand.value, 10);
        });

        it("should parse parenthesized expression", () => {
            const ast = evaluator.parse("(10 + 20)");
            assertEquals(ast.type, "binary");
            assertEquals(ast.operator, "+");
        });

        it("should cache parsed AST", () => {
            const ast1 = evaluator.parse("10 + 20");
            const ast2 = evaluator.parse("10 + 20");
            assertEquals(ast1, ast2); // Should be same object from cache
        });
    });

    describe("validate() - Expression Validation", () => {
        it("should validate correct expression", () => {
            const result = evaluator.validate("10 + 20");
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it("should invalidate expression with syntax error", () => {
            const result = evaluator.validate("10 +");
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length > 0, true);
        });

        it("should invalidate empty expression", () => {
            const result = evaluator.validate("");
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("non-empty string"), true);
        });

        it("should invalidate null expression", () => {
            const result = evaluator.validate(null as any);
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("non-empty string"), true);
        });

        it("should validate complex expression", () => {
            const result = evaluator.validate("(revenue - cogs) / revenue * 100");
            assertEquals(result.isValid, true);
        });

        it("should invalidate expression with invalid character", () => {
            const result = evaluator.validate("10 & 20");
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("Unexpected character"), true);
        });

        it("should invalidate expression with missing parenthesis", () => {
            const result = evaluator.validate("(10 + 20");
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("parenthesis"), true);
        });
    });

    describe("getDependencies() - Dependency Extraction", () => {
        it("should extract single variable dependency", () => {
            const deps = evaluator.getDependencies("revenue");
            assertEquals(deps.length, 1);
            assertEquals(deps[0], "revenue");
        });

        it("should extract multiple variable dependencies", () => {
            const deps = evaluator.getDependencies("revenue + cogs");
            assertEquals(deps.length, 2);
            assertEquals(deps.includes("revenue"), true);
            assertEquals(deps.includes("cogs"), true);
        });

        it("should extract order reference dependencies", () => {
            const deps = evaluator.getDependencies("@10 + @20");
            assertEquals(deps.length, 2);
            assertEquals(deps.includes("@10"), true);
            assertEquals(deps.includes("@20"), true);
        });

        it("should extract mixed dependencies", () => {
            const deps = evaluator.getDependencies("revenue + @10");
            assertEquals(deps.length, 2);
            assertEquals(deps.includes("revenue"), true);
            assertEquals(deps.includes("@10"), true);
        });

        it("should return empty array for literal-only expression", () => {
            const deps = evaluator.getDependencies("10 + 20");
            assertEquals(deps.length, 0);
        });

        it("should not duplicate dependencies", () => {
            const deps = evaluator.getDependencies("revenue + revenue");
            assertEquals(deps.length, 1);
            assertEquals(deps[0], "revenue");
        });

        it("should extract dependencies from complex expression", () => {
            const deps = evaluator.getDependencies("(revenue - cogs) / revenue * 100");
            assertEquals(deps.length, 2);
            assertEquals(deps.includes("revenue"), true);
            assertEquals(deps.includes("cogs"), true);
        });

        it("should throw error for invalid expression", () => {
            assertThrows(
                () => evaluator.getDependencies("10 +"),
                Error,
                "Failed to get dependencies"
            );
        });
    });

    describe("clearCache() - Cache Management", () => {
        it("should clear AST cache", () => {
            evaluator.parse("10 + 20");
            evaluator.parse("30 + 40");
            assertEquals(evaluator.getCacheSize(), 2);
            
            evaluator.clearCache();
            assertEquals(evaluator.getCacheSize(), 0);
        });

        it("should allow re-parsing after cache clear", () => {
            const ast1 = evaluator.parse("10 + 20");
            evaluator.clearCache();
            const ast2 = evaluator.parse("10 + 20");
            
            // Should be different objects (not from cache)
            assertEquals(ast1.type, ast2.type);
            assertEquals(ast1.operator, ast2.operator);
        });
    });

    describe("getCacheSize() - Cache Size Tracking", () => {
        it("should return 0 for empty cache", () => {
            assertEquals(evaluator.getCacheSize(), 0);
        });

        it("should track cache size", () => {
            evaluator.parse("10 + 20");
            assertEquals(evaluator.getCacheSize(), 1);
            
            evaluator.parse("30 + 40");
            assertEquals(evaluator.getCacheSize(), 2);
        });

        it("should not increase cache size for duplicate expressions", () => {
            evaluator.parse("10 + 20");
            evaluator.parse("10 + 20");
            assertEquals(evaluator.getCacheSize(), 1);
        });
    });

    describe("Integration Tests - Real-World Scenarios", () => {
        it("should calculate gross margin percentage", () => {
            const result = evaluator.evaluate(
                "(revenue - cogs) / revenue * 100",
                { revenue: 100000, cogs: -60000 }
            );
            assertEquals(result, 160); // (100000 - (-60000)) / 100000 * 100 = 160
        });

        it("should calculate operating income", () => {
            const result = evaluator.evaluate(
                "revenue + cogs + opex",
                { revenue: 100000, cogs: -60000, opex: -20000 }
            );
            assertEquals(result, 20000);
        });

        it("should calculate subtotal from order references", () => {
            const result = evaluator.evaluate(
                "@10 + @20 + @30",
                { '@10': 1000, '@20': 2000, '@30': 3000 }
            );
            assertEquals(result, 6000);
        });

        it("should calculate variance percentage", () => {
            const result = evaluator.evaluate(
                "(@20 - @10) / @10 * 100",
                { '@10': 1000, '@20': 1200 }
            );
            assertEquals(result, 20); // (1200 - 1000) / 1000 * 100 = 20%
        });

        it("should handle complex financial calculation", () => {
            const result = evaluator.evaluate(
                "(revenue + cogs) / revenue * 100",
                { revenue: 1000000, cogs: -600000 }
            );
            assertEquals(result, 40); // (1000000 - 600000) / 1000000 * 100 = 40%
        });

        it("should calculate weighted average", () => {
            const result = evaluator.evaluate(
                "(value1 * weight1 + value2 * weight2) / (weight1 + weight2)",
                { value1: 100, weight1: 3, value2: 200, weight2: 2 }
            );
            assertEquals(result, 140); // (100*3 + 200*2) / (3+2) = 700/5 = 140
        });
    });
});
