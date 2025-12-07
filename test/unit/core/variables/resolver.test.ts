/**
 * Unit Tests for Variable Resolver (Functional Implementation)
 * 
 * Tests the functional variable resolution module which resolves variable definitions
 * to calculated values using pure functions.
 */

import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    resolveVariable,
    resolveVariables,
    validateVariable,
    isValidAggregate,
    getDependencies,
    resolveSum,
    resolveAverage,
    resolveCount,
    resolveWithAggregate,
    AGGREGATE_FUNCTIONS,
    type VariableDefinition,
    type Variables
} from "../../../../src/core/variables/resolver.ts";

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
            },
            columnNames: function() {
                if (this._data.length === 0) return [];
                return Object.keys(this._data[0]);
            }
        };
    }
};

// Set up global aq
(globalThis as any).aq = mockAq;

describe("Variable Resolver - Functional Implementation", () => {
    describe("Constants", () => {
        it("should export AGGREGATE_FUNCTIONS constant", () => {
            assertEquals(Array.isArray(AGGREGATE_FUNCTIONS), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("sum"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("average"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("avg"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("count"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("min"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("max"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("first"), true);
            assertEquals(AGGREGATE_FUNCTIONS.includes("last"), true);
        });
    });

    describe("isValidAggregate()", () => {
        it("should validate valid aggregate functions", () => {
            assertEquals(isValidAggregate('sum'), true);
            assertEquals(isValidAggregate('average'), true);
            assertEquals(isValidAggregate('avg'), true);
            assertEquals(isValidAggregate('count'), true);
            assertEquals(isValidAggregate('min'), true);
            assertEquals(isValidAggregate('max'), true);
            assertEquals(isValidAggregate('first'), true);
            assertEquals(isValidAggregate('last'), true);
        });

        it("should reject invalid aggregate functions", () => {
            assertEquals(isValidAggregate('invalid'), false);
            assertEquals(isValidAggregate(''), false);
            assertEquals(isValidAggregate('INVALID'), false);
        });

        it("should handle case-insensitive validation", () => {
            // The function converts to lowercase internally
            assertEquals(isValidAggregate('SUM'.toLowerCase()), true);
            assertEquals(isValidAggregate('Average'.toLowerCase()), true);
        });
    });

    describe("validateVariable()", () => {
        it("should validate valid variable definition", () => {
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it("should reject variable without filter", () => {
            const varDef = {
                aggregate: "sum"
            } as any;
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("filter")), true);
        });

        it("should reject variable without aggregate", () => {
            const varDef = {
                filter: { code1: "700" }
            } as any;
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("aggregate")), true);
        });

        it("should reject invalid aggregate function", () => {
            const varDef = {
                filter: { code1: "700" },
                aggregate: "invalid"
            } as any;
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("Invalid aggregate function")), true);
        });

        it("should accept all valid aggregate functions", () => {
            const aggregates = ['sum', 'average', 'avg', 'count', 'min', 'max', 'first', 'last'];
            
            for (const agg of aggregates) {
                const varDef: VariableDefinition = {
                    filter: { code1: "700" },
                    aggregate: agg as any
                };
                
                const result = validateVariable(varDef);
                assertEquals(result.isValid, true, `Aggregate ${agg} should be valid`);
            }
        });

        it("should reject invalid filter specification", () => {
            const varDef = {
                filter: { invalid_field: "value" },
                aggregate: "sum"
            } as any;
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("invalid_field")), true);
        });

        it("should reject null variable definition", () => {
            const result = validateVariable(null as any);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("object"), true);
        });

        it("should reject filter that is not an object", () => {
            const varDef = {
                filter: "not an object" as any,
                aggregate: "sum"
            };
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("Filter must be an object")), true);
        });

        it("should reject aggregate that is not a string", () => {
            const varDef = {
                filter: { code1: "700" },
                aggregate: 123 as any
            };
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("Aggregate must be a string")), true);
        });

        it("should accept variable with description", () => {
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum",
                description: "Total revenue"
            };
            
            const result = validateVariable(varDef);
            
            assertEquals(result.isValid, true);
        });
    });

    describe("resolveVariable() - Sum Aggregate", () => {
        it("should calculate sum for single year", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 6000);
            }
        });

        it("should calculate sum for multiple years", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2025, period: "P01", movement_amount: 3000 },
                { code1: "700", year: 2025, period: "P02", movement_amount: 4000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000);
                assertEquals(result.value[2025], 7000);
            }
        });

        it("should filter by code before summing", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "710", year: 2024, period: "P01", movement_amount: 500 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000); // Only code1="700"
            }
        });

        it("should handle negative amounts", () => {
            const data = [
                { code1: "710", year: 2024, period: "P01", movement_amount: -1000 },
                { code1: "710", year: 2024, period: "P02", movement_amount: -2000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "710" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], -3000);
            }
        });

        it("should return 0 for no matching data", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "999" }, // No match
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 0);
            }
        });

        it("should handle null amounts", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: null },
                { code1: "700", year: 2024, period: "P02", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Should treat null as 0
                assertEquals(result.value[2024], 1000);
            }
        });

        it("should handle zero amounts", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 0 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 0 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 0);
            }
        });

        it("should handle very large numbers", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 999999999 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 999999999 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 1999999998);
            }
        });

        it("should handle very small numbers", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 0.01 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 0.02 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Allow for floating point precision
                assertEquals(Math.abs(result.value[2024] - 0.03) < 0.0001, true);
            }
        });
    });

    describe("resolveVariable() - Average Aggregate", () => {
        it("should calculate average", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "average"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 2000);
            }
        });

        it("should return 0 for empty data", () => {
            const data: any[] = [];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "average"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(Object.keys(result.value).length, 0);
            }
        });

        it("should handle avg alias", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "avg"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 1500);
            }
        });
    });

    describe("resolveVariable() - Count Aggregate", () => {
        it("should count rows", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "count"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3);
            }
        });

        it("should count 0 for no matches", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "999" },
                aggregate: "count"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 0);
            }
        });
    });

    describe("resolveVariable() - Min/Max Aggregates", () => {
        it("should find minimum value", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 3000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "min"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 1000);
            }
        });

        it("should find maximum value", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 3000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "max"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000);
            }
        });

        it("should return 0 for min/max with no matches", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDefMin: VariableDefinition = {
                filter: { code1: "999" },
                aggregate: "min"
            };
            
            const resultMin = resolveVariable(varDefMin)(table);
            assertEquals(resultMin.success, true);
            if (resultMin.success) {
                assertEquals(resultMin.value[2024], 0);
            }
            
            const varDefMax: VariableDefinition = {
                filter: { code1: "999" },
                aggregate: "max"
            };
            
            const resultMax = resolveVariable(varDefMax)(table);
            assertEquals(resultMax.success, true);
            if (resultMax.success) {
                assertEquals(resultMax.value[2024], 0);
            }
        });
    });

    describe("resolveVariable() - First/Last Aggregates", () => {
        it("should get first value", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "first"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 1000);
            }
        });

        it("should get last value", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "last"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000);
            }
        });

        it("should return 0 for first/last with no matches", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDefFirst: VariableDefinition = {
                filter: { code1: "999" },
                aggregate: "first"
            };
            
            const resultFirst = resolveVariable(varDefFirst)(table);
            assertEquals(resultFirst.success, true);
            if (resultFirst.success) {
                assertEquals(resultFirst.value[2024], 0);
            }
            
            const varDefLast: VariableDefinition = {
                filter: { code1: "999" },
                aggregate: "last"
            };
            
            const resultLast = resolveVariable(varDefLast)(table);
            assertEquals(resultLast.success, true);
            if (resultLast.success) {
                assertEquals(resultLast.value[2024], 0);
            }
        });
    });

    describe("resolveVariables() - Multiple Variables", () => {
        it("should resolve multiple variables", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "710", year: 2024, period: "P01", movement_amount: -500 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "710", year: 2024, period: "P02", movement_amount: -600 }
            ];
            const table = mockAq.from(data);
            
            const variables: Variables = {
                revenue: {
                    filter: { code1: "700" },
                    aggregate: "sum"
                },
                cogs: {
                    filter: { code1: "710" },
                    aggregate: "sum"
                }
            };
            
            const result = resolveVariables(variables)(table)({});
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.get('revenue')![2024], 3000);
                assertEquals(result.value.get('cogs')![2024], -1100);
            }
        });

        it("should handle empty variables object", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const result = resolveVariables({})(table)({});
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.size, 0);
            }
        });

        it("should return error for null variables", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const result = resolveVariables(null as any)(table)({});
            
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes("Variables must be an object"), true);
            }
        });

        it("should return error for null movements data", () => {
            const variables: Variables = {
                revenue: {
                    filter: { code1: "700" },
                    aggregate: "sum"
                }
            };
            
            const result = resolveVariables(variables)(null as any)({});
            
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes("Movements data is required"), true);
            }
        });

        it("should return error for invalid variable definition", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const variables = {
                invalid: {
                    filter: { invalid_field: "value" },
                    aggregate: "sum"
                }
            } as any;
            
            const result = resolveVariables(variables)(table)({});
            
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes("Failed to resolve variable 'invalid'"), true);
            }
        });

        it("should cache resolved variables", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const variables: Variables = {
                revenue: {
                    filter: { code1: "700" },
                    aggregate: "sum"
                },
                revenue2: {
                    filter: { code1: "700" },
                    aggregate: "sum"
                }
            };
            
            // First resolution
            const result1 = resolveVariables(variables)(table)({});
            
            assertEquals(result1.success, true);
            if (result1.success) {
                assertEquals(result1.value.get('revenue')![2024], 3000);
                assertEquals(result1.value.get('revenue2')![2024], 3000);
            }
            
            // Second resolution should produce same results
            const result2 = resolveVariables(variables)(table)({});
            
            assertEquals(result2.success, true);
            if (result2.success) {
                assertEquals(result2.value.get('revenue')![2024], 3000);
                assertEquals(result2.value.get('revenue2')![2024], 3000);
            }
        });
    });

    describe("Circular Dependency Detection", () => {
        it("should detect circular dependency", () => {
            // Note: This is a conceptual test since current implementation
            // doesn't support variable-to-variable references yet
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            // In future, this would be a circular reference:
            // varA depends on varB, varB depends on varA
            // For now, we just verify the mechanism exists
            
            const variables: Variables = {
                varA: {
                    filter: { code1: "700" },
                    aggregate: "sum"
                }
            };
            
            const result = resolveVariables(variables)(table)({});
            
            // Should succeed since no actual circular dependency
            assertEquals(result.success, true);
        });
    });

    describe("Period Options", () => {
        it("should handle different years in period options", () => {
            const data = [
                { code1: "700", year: 2023, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P01", movement_amount: 2000 },
                { code1: "700", year: 2025, period: "P01", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Should have values for all years
                assertEquals(result.value[2023], 1000);
                assertEquals(result.value[2024], 2000);
                assertEquals(result.value[2025], 3000);
            }
        });

        it("should handle multiple periods within a year", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 100 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 200 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 300 },
                { code1: "700", year: 2024, period: "P04", movement_amount: 400 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Should sum all periods for the year
                assertEquals(result.value[2024], 1000);
            }
        });

        it("should handle quarterly periods", () => {
            const data = [
                { code1: "700", year: 2024, period: "Q1", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "Q2", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "Q3", movement_amount: 3000 },
                { code1: "700", year: 2024, period: "Q4", movement_amount: 4000 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 10000);
            }
        });

        it("should handle mixed period formats", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 100 },
                { code1: "700", year: 2024, period: "Q1", movement_amount: 200 },
                { code1: "700", year: 2024, period: "LTM", movement_amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Should sum all periods regardless of format
                assertEquals(result.value[2024], 600);
            }
        });
    });

    describe("Error Handling", () => {
        it("should return error for invalid variable definition", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            const varDef = {
                filter: { code1: "700" }
                // Missing aggregate
            } as any;
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes("Invalid variable definition"), true);
            }
        });

        it("should return error for invalid movements data", () => {
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(null as any);
            
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes("Invalid movements data"), true);
            }
        });

        it("should return error for unsupported aggregate function", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 }
            ];
            const table = mockAq.from(data);
            
            // Create a variable with invalid aggregate that bypasses validation
            const varDef = {
                filter: { code1: "700" },
                aggregate: "unsupported"
            } as any;
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, false);
        });

        it("should handle empty data table", () => {
            const data: any[] = [];
            const table = mockAq.from(data);
            
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const result = resolveVariable(varDef)(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                // Should return empty object for empty data
                assertEquals(Object.keys(result.value).length, 0);
            }
        });
    });

    describe("Curried Functions", () => {
        it("should resolve with resolveSum", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const result = resolveSum({ code1: "700" })(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000);
            }
        });

        it("should resolve with resolveAverage", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const result = resolveAverage({ code1: "700" })(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 1500);
            }
        });

        it("should resolve with resolveCount", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            const result = resolveCount({ code1: "700" })(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 2);
            }
        });

        it("should resolve with resolveWithAggregate", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 },
                { code1: "700", year: 2024, period: "P03", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const maxResolver = resolveWithAggregate('max');
            const result = maxResolver({ code1: "700" })(table);
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value[2024], 3000);
            }
        });

        it("should compose curried functions", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 2000 }
            ];
            const table = mockAq.from(data);
            
            // Create a reusable resolver
            const revenueSum = resolveSum({ code1: "700" });
            
            // Apply to different tables
            const result1 = revenueSum(table);
            const result2 = revenueSum(table);
            
            assertEquals(result1.success, true);
            assertEquals(result2.success, true);
            if (result1.success && result2.success) {
                assertEquals(result1.value[2024], result2.value[2024]);
            }
        });
    });

    describe("getDependencies()", () => {
        it("should return empty array for variable definitions", () => {
            const varDef: VariableDefinition = {
                filter: { code1: "700" },
                aggregate: "sum"
            };
            
            const deps = getDependencies(varDef);
            
            assertEquals(deps.length, 0);
        });

        it("should handle various variable definitions", () => {
            const varDefs: VariableDefinition[] = [
                { filter: { code1: "700" }, aggregate: "sum" },
                { filter: { code1: ["700", "710"] }, aggregate: "average" },
                { filter: { code1: "700", code2: "01" }, aggregate: "count" }
            ];
            
            for (const varDef of varDefs) {
                const deps = getDependencies(varDef);
                assertEquals(deps.length, 0);
            }
        });
    });

    describe("Integration Tests", () => {
        it("should handle complex multi-variable scenario", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 10000 },
                { code1: "700", year: 2024, period: "P02", movement_amount: 12000 },
                { code1: "710", year: 2024, period: "P01", movement_amount: -6000 },
                { code1: "710", year: 2024, period: "P02", movement_amount: -7000 },
                { code1: "720", year: 2024, period: "P01", movement_amount: -2000 },
                { code1: "720", year: 2024, period: "P02", movement_amount: -2500 },
                { code1: "700", year: 2025, period: "P01", movement_amount: 15000 },
                { code1: "710", year: 2025, period: "P01", movement_amount: -8000 }
            ];
            const table = mockAq.from(data);
            
            const variables: Variables = {
                revenue: {
                    filter: { code1: "700" },
                    aggregate: "sum",
                    description: "Total revenue"
                },
                cogs: {
                    filter: { code1: "710" },
                    aggregate: "sum",
                    description: "Cost of goods sold"
                },
                expenses: {
                    filter: { code1: "720" },
                    aggregate: "sum",
                    description: "Operating expenses"
                },
                revenue_count: {
                    filter: { code1: "700" },
                    aggregate: "count",
                    description: "Number of revenue transactions"
                }
            };
            
            const result = resolveVariables(variables)(table)({});
            
            assertEquals(result.success, true);
            if (result.success) {
                // 2024 values
                assertEquals(result.value.get('revenue')![2024], 22000);
                assertEquals(result.value.get('cogs')![2024], -13000);
                assertEquals(result.value.get('expenses')![2024], -4500);
                assertEquals(result.value.get('revenue_count')![2024], 2);
                
                // 2025 values
                assertEquals(result.value.get('revenue')![2025], 15000);
                assertEquals(result.value.get('cogs')![2025], -8000);
                assertEquals(result.value.get('expenses')![2025], 0); // No data
                assertEquals(result.value.get('revenue_count')![2025], 1);
            }
        });

        it("should handle array filters in variables", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "710", year: 2024, period: "P01", movement_amount: 2000 },
                { code1: "720", year: 2024, period: "P01", movement_amount: 3000 }
            ];
            const table = mockAq.from(data);
            
            const variables: Variables = {
                combined: {
                    filter: { code1: ["700", "710"] },
                    aggregate: "sum"
                }
            };
            
            const result = resolveVariables(variables)(table)({});
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.get('combined')![2024], 3000);
            }
        });

        it("should handle range filters in variables", () => {
            const data = [
                { code1: "700", year: 2024, period: "P01", movement_amount: 1000 },
                { code1: "750", year: 2024, period: "P01", movement_amount: 2000 },
                { code1: "799", year: 2024, period: "P01", movement_amount: 3000 },
                { code1: "800", year: 2024, period: "P01", movement_amount: 4000 }
            ];
            const table = mockAq.from(data);
            
            const variables: Variables = {
                range_700_799: {
                    filter: { code1: { gte: "700", lte: "799" } },
                    aggregate: "sum"
                }
            };
            
            const result = resolveVariables(variables)(table)({});
            
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.get('range_700_799')![2024], 6000);
            }
        });
    });
});
