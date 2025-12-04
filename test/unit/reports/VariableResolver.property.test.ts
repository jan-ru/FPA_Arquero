/**
 * Property-Based Tests for VariableResolver
 * 
 * Tests universal properties that should hold across all valid inputs.
 * **Feature: configurable-report-definitions, Property 3: Variable Resolution Consistency**
 * **Validates: Requirements 2.1-2.10**
 */

import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as fc from "npm:fast-check@3.15.0";
import VariableResolver from "../../../src/reports/VariableResolver.js";
import FilterEngine from "../../../src/reports/FilterEngine.js";

// Mock Arquero for testing
const mockAq = {
    from: (data: any[]) => {
        return {
            _data: data,
            filter: function(expr: string | Function) {
                const filterFn = typeof expr === 'string' 
                    ? new Function('d', `return ${expr.replace('d => ', '')}`)
                    : expr;
                
                const filtered = this._data.filter((row: any) => {
                    try {
                        return filterFn(row);
                    } catch (e) {
                        return false;
                    }
                });
                
                return mockAq.from(filtered);
            },
            objects: function() {
                return this._data;
            },
            numRows: function() {
                return this._data.length;
            },
            array: function(columnName: string) {
                if (this._data.length === 0) return [];
                return this._data.map((row: any) => row[columnName]);
            }
        };
    }
};

// Set up global aq
(globalThis as any).aq = mockAq;

describe("VariableResolver - Property-Based Tests", () => {
    describe("Property 3: Variable Resolution Consistency", () => {
        it("should produce same result when resolving variable twice with same inputs", () => {
            // Arbitrary for generating valid code values
            const codeArb = fc.oneof(
                fc.constantFrom("700", "710", "720", "730", "800", "810"),
                fc.constantFrom("100", "150", "200", "250")
            );

            // Arbitrary for generating valid aggregate functions
            const aggregateArb = fc.constantFrom(
                "sum", "average", "count", "min", "max", "first", "last"
            );

            // Arbitrary for generating movements data
            const movementArb = fc.record({
                code1: codeArb,
                code2: fc.constantFrom("01", "02", "03"),
                code3: fc.constantFrom("A", "B", "C"),
                name1: fc.constantFrom("Revenue", "Expenses", "Assets", "Liabilities"),
                statement_type: fc.constantFrom("Winst & verlies", "Balans"),
                year: fc.constantFrom(2024, 2025),
                period: fc.constantFrom("P01", "P02", "P03", "P04"),
                amount: fc.integer({ min: -100000, max: 100000 })
            });

            // Arbitrary for generating variable definitions
            const varDefArb = fc.record({
                filter: fc.record({
                    code1: fc.oneof(
                        codeArb,
                        fc.array(codeArb, { minLength: 1, maxLength: 3 })
                    )
                }),
                aggregate: aggregateArb
            });

            // Arbitrary for generating movements tables
            const movementsTableArb = fc.array(movementArb, { minLength: 1, maxLength: 50 });

            // Property: Resolving the same variable twice should produce the same result
            fc.assert(
                fc.property(varDefArb, movementsTableArb, (varDef, movements) => {
                    const filterEngine = new FilterEngine();
                    const resolver = new VariableResolver(filterEngine);
                    
                    const table = mockAq.from(movements);
                    const periodOptions = {};

                    // Resolve variable twice
                    const result1 = resolver.resolveVariable(varDef, table, periodOptions);
                    const result2 = resolver.resolveVariable(varDef, table, periodOptions);

                    // Results should be identical
                    const years1 = Object.keys(result1).sort();
                    const years2 = Object.keys(result2).sort();

                    // Same years
                    assertEquals(years1.length, years2.length);
                    for (let i = 0; i < years1.length; i++) {
                        assertEquals(years1[i], years2[i]);
                    }

                    // Same values for each year
                    for (const year of years1) {
                        assertEquals(result1[year], result2[year], 
                            `Values for year ${year} should be identical`);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("should produce same result when resolving multiple variables twice", () => {
            // Arbitrary for generating valid code values
            const codeArb = fc.oneof(
                fc.constantFrom("700", "710", "720", "730"),
                fc.constantFrom("100", "150", "200", "250")
            );

            // Arbitrary for generating valid aggregate functions
            const aggregateArb = fc.constantFrom(
                "sum", "average", "count", "min", "max", "first", "last"
            );

            // Arbitrary for generating movements data
            const movementArb = fc.record({
                code1: codeArb,
                year: fc.constantFrom(2024, 2025),
                period: fc.constantFrom("P01", "P02", "P03"),
                amount: fc.integer({ min: -50000, max: 50000 })
            });

            // Arbitrary for generating variable definitions
            const varDefArb = fc.record({
                filter: fc.record({
                    code1: codeArb
                }),
                aggregate: aggregateArb
            });

            // Arbitrary for generating multiple variables
            const variablesArb = fc.dictionary(
                fc.constantFrom("revenue", "cogs", "opex", "assets", "liabilities"),
                varDefArb,
                { minKeys: 1, maxKeys: 3 }
            );

            // Arbitrary for generating movements tables
            const movementsTableArb = fc.array(movementArb, { minLength: 5, maxLength: 30 });

            // Property: Resolving multiple variables twice should produce the same results
            fc.assert(
                fc.property(variablesArb, movementsTableArb, (variables, movements) => {
                    const filterEngine = new FilterEngine();
                    const resolver = new VariableResolver(filterEngine);
                    
                    const table = mockAq.from(movements);
                    const periodOptions = {};

                    // Resolve variables twice
                    const result1 = resolver.resolveVariables(variables, table, periodOptions);
                    const result2 = resolver.resolveVariables(variables, table, periodOptions);

                    // Results should be identical
                    assertEquals(result1.size, result2.size, "Should have same number of variables");

                    for (const [varName, values1] of result1.entries()) {
                        const values2 = result2.get(varName);
                        
                        // Variable should exist in both results
                        assertEquals(values2 !== undefined, true, 
                            `Variable ${varName} should exist in both results`);

                        // Same years
                        const years1 = Object.keys(values1).sort();
                        const years2 = Object.keys(values2).sort();
                        assertEquals(years1.length, years2.length);

                        // Same values for each year
                        for (const year of years1) {
                            assertEquals(values1[year], values2[year], 
                                `Values for ${varName}[${year}] should be identical`);
                        }
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("should produce deterministic results regardless of resolution order", () => {
            // Arbitrary for generating valid code values
            const codeArb = fc.constantFrom("700", "710", "720");

            // Arbitrary for generating movements data
            const movementArb = fc.record({
                code1: codeArb,
                year: fc.constantFrom(2024, 2025),
                period: fc.constantFrom("P01", "P02"),
                amount: fc.integer({ min: -10000, max: 10000 })
            });

            // Arbitrary for generating variable definitions
            const varDefArb = fc.record({
                filter: fc.record({
                    code1: codeArb
                }),
                aggregate: fc.constantFrom("sum", "average", "count")
            });

            // Arbitrary for generating movements tables
            const movementsTableArb = fc.array(movementArb, { minLength: 3, maxLength: 20 });

            // Property: Resolution order shouldn't affect results
            fc.assert(
                fc.property(varDefArb, varDefArb, movementsTableArb, (varDef1, varDef2, movements) => {
                    const filterEngine = new FilterEngine();
                    const resolver1 = new VariableResolver(filterEngine);
                    const resolver2 = new VariableResolver(filterEngine);
                    
                    const table = mockAq.from(movements);
                    const periodOptions = {};

                    // Resolve in different order
                    const variables1 = { var1: varDef1, var2: varDef2 };
                    const variables2 = { var2: varDef2, var1: varDef1 };

                    const result1 = resolver1.resolveVariables(variables1, table, periodOptions);
                    const result2 = resolver2.resolveVariables(variables2, table, periodOptions);

                    // Results should be identical regardless of order
                    assertEquals(result1.size, result2.size);

                    for (const varName of ['var1', 'var2']) {
                        const values1 = result1.get(varName);
                        const values2 = result2.get(varName);

                        const years1 = Object.keys(values1).sort();
                        const years2 = Object.keys(values2).sort();

                        for (const year of years1) {
                            assertEquals(values1[year], values2[year], 
                                `Values for ${varName}[${year}] should be identical regardless of resolution order`);
                        }
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("should handle empty filter results consistently", () => {
            // Arbitrary for generating movements data
            const movementArb = fc.record({
                code1: fc.constantFrom("700", "710"),
                year: fc.constantFrom(2024, 2025),
                period: fc.constantFrom("P01", "P02"),
                amount: fc.integer({ min: -5000, max: 5000 })
            });

            // Arbitrary for generating movements tables
            const movementsTableArb = fc.array(movementArb, { minLength: 1, maxLength: 10 });

            // Property: Variables with no matching data should consistently return 0
            fc.assert(
                fc.property(movementsTableArb, (movements) => {
                    const filterEngine = new FilterEngine();
                    const resolver = new VariableResolver(filterEngine);
                    
                    const table = mockAq.from(movements);
                    const periodOptions = {};

                    // Variable that won't match any data
                    const varDef = {
                        filter: { code1: "999" }, // Non-existent code
                        aggregate: "sum"
                    };

                    // Resolve twice
                    const result1 = resolver.resolveVariable(varDef, table, periodOptions);
                    const result2 = resolver.resolveVariable(varDef, table, periodOptions);

                    // Results should be identical
                    const years1 = Object.keys(result1).sort();
                    const years2 = Object.keys(result2).sort();

                    assertEquals(years1.length, years2.length);

                    for (const year of years1) {
                        assertEquals(result1[year], 0, `Should return 0 for no matches`);
                        assertEquals(result2[year], 0, `Should return 0 for no matches`);
                        assertEquals(result1[year], result2[year], `Should be consistent`);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("should produce consistent results with different aggregate functions", () => {
            // Arbitrary for generating movements data with same values
            const movementArb = fc.record({
                code1: fc.constantFrom("700", "710"),
                year: fc.constantFrom(2024, 2025),
                period: fc.constantFrom("P01", "P02"),
                amount: fc.integer({ min: 1, max: 1000 })
            });

            // Arbitrary for generating movements tables
            const movementsTableArb = fc.array(movementArb, { minLength: 2, maxLength: 20 });

            // Arbitrary for aggregate functions
            const aggregateArb = fc.constantFrom("sum", "average", "count", "min", "max", "first", "last");

            // Property: Same aggregate function should produce same result
            fc.assert(
                fc.property(aggregateArb, movementsTableArb, (aggregate, movements) => {
                    const filterEngine = new FilterEngine();
                    const resolver = new VariableResolver(filterEngine);
                    
                    const table = mockAq.from(movements);
                    const periodOptions = {};

                    const varDef = {
                        filter: { code1: "700" },
                        aggregate: aggregate
                    };

                    // Resolve twice
                    const result1 = resolver.resolveVariable(varDef, table, periodOptions);
                    const result2 = resolver.resolveVariable(varDef, table, periodOptions);

                    // Results should be identical
                    const years = Object.keys(result1).sort();

                    for (const year of years) {
                        assertEquals(result1[year], result2[year], 
                            `${aggregate} should produce consistent results for year ${year}`);
                    }
                }),
                { numRuns: 100 }
            );
        });
    });
});
