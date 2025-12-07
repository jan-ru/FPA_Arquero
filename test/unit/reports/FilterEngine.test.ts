/**
 * Unit Tests for FilterEngine
 * 
 * Tests the FilterEngine component which applies filter specifications to Arquero tables.
 * Validates: Requirements 2.3-2.6
 */

import { describe, it, beforeAll } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import FilterEngine from "../../../src/reports/FilterEngine.ts";

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
            }
        };
    }
};

// Set up global aq
(globalThis as any).aq = mockAq;

let filterEngine: FilterEngine;

beforeAll(() => {
    filterEngine = new FilterEngine();
});

describe("FilterEngine - Unit Tests", () => {
    describe("applyFilter() - Exact Match Filters", () => {
        it("should filter by exact match on code1", () => {
            const data = [
                { code1: "700", name1: "Revenue", amount: 1000 },
                { code1: "710", name1: "COGS", amount: -500 },
                { code1: "700", name1: "Other Revenue", amount: 200 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code1: "700" });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "700");
            assertEquals(results[1].code1, "700");
        });

        it("should filter by exact match on code2", () => {
            const data = [
                { code1: "700", code2: "01", amount: 1000 },
                { code1: "700", code2: "02", amount: 500 },
                { code1: "710", code2: "01", amount: -300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code2: "01" });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code2, "01");
            assertEquals(results[1].code2, "01");
        });

        it("should filter by exact match on statement_type", () => {
            const data = [
                { code1: "700", statement_type: "Winst & verlies", amount: 1000 },
                { code1: "100", statement_type: "Balans", amount: 5000 },
                { code1: "710", statement_type: "Winst & verlies", amount: -500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { statement_type: "Winst & verlies" });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].statement_type, "Winst & verlies");
            assertEquals(results[1].statement_type, "Winst & verlies");
        });

        it("should return empty result when no matches", () => {
            const data = [
                { code1: "700", amount: 1000 },
                { code1: "710", amount: -500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code1: "999" });
            const results = filtered.objects();
            
            assertEquals(results.length, 0);
        });

        it("should handle values with special characters", () => {
            const data = [
                { code1: "700", name1: "Revenue's Total", amount: 1000 },
                { code1: "710", name1: "Cost \"quoted\"", amount: -500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { name1: "Revenue's Total" });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].name1, "Revenue's Total");
        });
    });

    describe("applyFilter() - Array Filters (OR Logic)", () => {
        it("should filter by array of values (OR logic)", () => {
            const data = [
                { code1: "700", amount: 1000 },
                { code1: "710", amount: -500 },
                { code1: "720", amount: -300 },
                { code1: "800", amount: 200 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code1: ["700", "710", "720"] });
            const results = filtered.objects();
            
            assertEquals(results.length, 3);
            assertEquals(results[0].code1, "700");
            assertEquals(results[1].code1, "710");
            assertEquals(results[2].code1, "720");
        });

        it("should handle array with single value", () => {
            const data = [
                { code1: "700", amount: 1000 },
                { code1: "710", amount: -500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code1: ["700"] });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].code1, "700");
        });

        it("should return empty result when array values don't match", () => {
            const data = [
                { code1: "700", amount: 1000 },
                { code1: "710", amount: -500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { code1: ["800", "900"] });
            const results = filtered.objects();
            
            assertEquals(results.length, 0);
        });

        it("should handle array with values containing special characters", () => {
            const data = [
                { name1: "Revenue's Total", amount: 1000 },
                { name1: "Cost \"quoted\"", amount: -500 },
                { name1: "Normal", amount: 200 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                name1: ["Revenue's Total", "Cost \"quoted\""] 
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
        });
    });

    describe("applyFilter() - Multiple Field Filters (AND Logic)", () => {
        it("should filter by multiple fields with AND logic", () => {
            const data = [
                { code1: "700", code2: "01", amount: 1000 },
                { code1: "700", code2: "02", amount: 500 },
                { code1: "710", code2: "01", amount: -300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: "700", 
                code2: "01" 
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].code1, "700");
            assertEquals(results[0].code2, "01");
        });

        it("should combine exact match and array filters", () => {
            const data = [
                { code1: "700", statement_type: "Winst & verlies", amount: 1000 },
                { code1: "710", statement_type: "Winst & verlies", amount: -500 },
                { code1: "700", statement_type: "Balans", amount: 5000 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: ["700", "710"],
                statement_type: "Winst & verlies"
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "700");
            assertEquals(results[0].statement_type, "Winst & verlies");
            assertEquals(results[1].code1, "710");
            assertEquals(results[1].statement_type, "Winst & verlies");
        });

        it("should return empty when one condition doesn't match", () => {
            const data = [
                { code1: "700", code2: "01", amount: 1000 },
                { code1: "700", code2: "02", amount: 500 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: "700", 
                code2: "99"  // No match
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 0);
        });

        it("should filter by three fields", () => {
            const data = [
                { code1: "700", code2: "01", code3: "A", amount: 1000 },
                { code1: "700", code2: "01", code3: "B", amount: 500 },
                { code1: "700", code2: "02", code3: "A", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: "700",
                code2: "01",
                code3: "A"
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].code3, "A");
        });
    });

    describe("applyFilter() - Range Filters", () => {
        it("should filter by gte (greater than or equal)", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { gte: "700" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "700");
            assertEquals(results[1].code1, "800");
        });

        it("should filter by lte (less than or equal)", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { lte: "700" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "600");
            assertEquals(results[1].code1, "700");
        });

        it("should filter by range (gte and lte)", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "750", amount: 250 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { gte: "700", lte: "799" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "700");
            assertEquals(results[1].code1, "750");
        });

        it("should filter by gt (greater than)", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { gt: "700" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].code1, "800");
        });

        it("should filter by lt (less than)", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { lt: "700" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 1);
            assertEquals(results[0].code1, "600");
        });

        it("should combine multiple range operators", () => {
            const data = [
                { code1: "600", amount: 100 },
                { code1: "700", amount: 200 },
                { code1: "750", amount: 250 },
                { code1: "800", amount: 300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, { 
                code1: { gt: "600", lt: "800" }
            });
            const results = filtered.objects();
            
            assertEquals(results.length, 2);
            assertEquals(results[0].code1, "700");
            assertEquals(results[1].code1, "750");
        });
    });

    describe("applyFilter() - Empty Filter Specifications", () => {
        it("should return all rows when filter is empty object", () => {
            const data = [
                { code1: "700", amount: 1000 },
                { code1: "710", amount: -500 },
                { code1: "720", amount: -300 }
            ];
            const table = mockAq.from(data);
            
            const filtered = filterEngine.applyFilter(table, {});
            const results = filtered.objects();
            
            assertEquals(results.length, 3);
        });

        it("should handle null table gracefully", () => {
            assertThrows(
                () => filterEngine.applyFilter(null as any, { code1: "700" }),
                Error,
                "Table is required"
            );
        });

        it("should handle undefined table gracefully", () => {
            assertThrows(
                () => filterEngine.applyFilter(undefined as any, { code1: "700" }),
                Error,
                "Table is required"
            );
        });
    });

    describe("validateFilter() - Invalid Filter Fields", () => {
        it("should reject invalid filter field", () => {
            const result = filterEngine.validateFilter({ invalid_field: "value" });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length > 0, true);
            assertEquals(result.errors[0].includes("invalid_field"), true);
        });

        it("should accept all valid filter fields", () => {
            const validFields = ['code1', 'code2', 'code3', 'name1', 'name2', 'name3', 'statement_type', 'account_code'];
            
            for (const field of validFields) {
                const result = filterEngine.validateFilter({ [field]: "value" });
                assertEquals(result.isValid, true, `Field ${field} should be valid`);
            }
        });

        it("should reject multiple invalid fields", () => {
            const result = filterEngine.validateFilter({ 
                invalid1: "value",
                invalid2: "value"
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length >= 2, true);
        });

        it("should accept valid field and reject invalid field", () => {
            const result = filterEngine.validateFilter({ 
                code1: "700",
                invalid_field: "value"
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors.some(e => e.includes("invalid_field")), true);
        });
    });

    describe("validateFilter() - Invalid Operators", () => {
        it("should reject invalid range operator", () => {
            const result = filterEngine.validateFilter({ 
                code1: { invalid_op: "700" }
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("invalid_op"), true);
        });

        it("should accept valid range operators", () => {
            const result = filterEngine.validateFilter({ 
                code1: { gte: "700", lte: "799", gt: "600", lt: "800" }
            });
            
            assertEquals(result.isValid, true);
        });

        it("should reject empty range object", () => {
            const result = filterEngine.validateFilter({ 
                code1: {}
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("empty"), true);
        });

        it("should reject null range value", () => {
            const result = filterEngine.validateFilter({ 
                code1: { gte: null }
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("null"), true);
        });

        it("should reject undefined range value", () => {
            const result = filterEngine.validateFilter({ 
                code1: { gte: undefined }
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("undefined"), true);
        });
    });

    describe("validateFilter() - Invalid Values", () => {
        it("should reject null filter value", () => {
            const result = filterEngine.validateFilter({ 
                code1: null
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("null"), true);
        });

        it("should reject undefined filter value", () => {
            const result = filterEngine.validateFilter({ 
                code1: undefined
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("undefined"), true);
        });

        it("should reject empty array", () => {
            const result = filterEngine.validateFilter({ 
                code1: []
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("empty"), true);
        });

        it("should reject array with null values", () => {
            const result = filterEngine.validateFilter({ 
                code1: ["700", null, "710"]
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("null"), true);
        });

        it("should reject array with undefined values", () => {
            const result = filterEngine.validateFilter({ 
                code1: ["700", undefined, "710"]
            });
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("undefined"), true);
        });

        it("should reject non-object filter spec", () => {
            const result = filterEngine.validateFilter("not an object" as any);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("object"), true);
        });

        it("should reject null filter spec", () => {
            const result = filterEngine.validateFilter(null as any);
            
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes("object"), true);
        });

        it("should accept empty filter spec", () => {
            const result = filterEngine.validateFilter({});
            
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });
    });

    describe("buildFilterExpression()", () => {
        it("should build expression for exact match", () => {
            const expr = filterEngine.buildFilterExpression({ code1: "700" });
            
            assertEquals(expr.includes("d.code1 === '700'"), true);
        });

        it("should build expression for array filter", () => {
            const expr = filterEngine.buildFilterExpression({ code1: ["700", "710"] });
            
            assertEquals(expr.includes("['700','710'].includes(d.code1)"), true);
        });

        it("should build expression for range filter", () => {
            const expr = filterEngine.buildFilterExpression({ 
                code1: { gte: "700", lte: "799" }
            });
            
            assertEquals(expr.includes("d.code1 >= '700'"), true);
            assertEquals(expr.includes("d.code1 <= '799'"), true);
            assertEquals(expr.includes("&&"), true);
        });

        it("should build expression for multiple fields", () => {
            const expr = filterEngine.buildFilterExpression({ 
                code1: "700",
                statement_type: "Winst & verlies"
            });
            
            assertEquals(expr.includes("d.code1 === '700'"), true);
            assertEquals(expr.includes("d.statement_type === 'Winst & verlies'"), true);
            assertEquals(expr.includes("&&"), true);
        });

        it("should escape single quotes in values", () => {
            const expr = filterEngine.buildFilterExpression({ 
                name1: "Revenue's Total"
            });
            
            assertEquals(expr.includes("\\'"), true);
        });

        it("should handle gt and lt operators", () => {
            const expr = filterEngine.buildFilterExpression({ 
                code1: { gt: "600", lt: "800" }
            });
            
            assertEquals(expr.includes("d.code1 > '600'"), true);
            assertEquals(expr.includes("d.code1 < '800'"), true);
        });
    });

    describe("applyFilter() - Error Handling", () => {
        it("should throw error for invalid filter specification", () => {
            const data = [{ code1: "700", amount: 1000 }];
            const table = mockAq.from(data);
            
            assertThrows(
                () => filterEngine.applyFilter(table, { invalid_field: "value" }),
                Error,
                "Invalid filter specification"
            );
        });

        it("should throw error for empty array filter", () => {
            const data = [{ code1: "700", amount: 1000 }];
            const table = mockAq.from(data);
            
            assertThrows(
                () => filterEngine.applyFilter(table, { code1: [] }),
                Error,
                "Invalid filter specification"
            );
        });

        it("should throw error for null filter value", () => {
            const data = [{ code1: "700", amount: 1000 }];
            const table = mockAq.from(data);
            
            assertThrows(
                () => filterEngine.applyFilter(table, { code1: null }),
                Error,
                "Invalid filter specification"
            );
        });
    });

    describe("Static Properties", () => {
        it("should have OPERATORS constant", () => {
            assertEquals(typeof FilterEngine.OPERATORS, "object");
            assertEquals(FilterEngine.OPERATORS.equals, "===");
            assertEquals(FilterEngine.OPERATORS.in, "includes");
            assertEquals(FilterEngine.OPERATORS.gte, ">=");
            assertEquals(FilterEngine.OPERATORS.lte, "<=");
        });

        it("should have VALID_FIELDS constant", () => {
            assertEquals(Array.isArray(FilterEngine.VALID_FIELDS), true);
            assertEquals(FilterEngine.VALID_FIELDS.includes("code1"), true);
            assertEquals(FilterEngine.VALID_FIELDS.includes("code2"), true);
            assertEquals(FilterEngine.VALID_FIELDS.includes("code3"), true);
            assertEquals(FilterEngine.VALID_FIELDS.includes("name1"), true);
            assertEquals(FilterEngine.VALID_FIELDS.includes("statement_type"), true);
        });
    });
});
