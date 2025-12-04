/**
 * Property-Based Tests for FilterEngine
 * 
 * Feature: configurable-report-definitions, Property 5: Filter Application Correctness
 * Validates: Requirements 2.3-2.6
 * 
 * These tests verify that the FilterEngine correctly applies filter specifications
 * to Arquero tables, ensuring all returned rows match the specified criteria.
 */

import { describe, it, beforeAll } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import fc from "fast-check";
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
            }
        };
    }
};

// Set up global aq
(globalThis as any).aq = mockAq;

// Import FilterEngine after setting up mock
let filterEngine: FilterEngine;

beforeAll(() => {
    filterEngine = new FilterEngine();
});

describe("FilterEngine - Property-Based Tests", () => {
    describe("Property 5: Filter Application Correctness", () => {
        /**
         * Property: For any filter specification and movements data,
         * all returned rows must match ALL specified filter criteria (AND logic)
         */
        it("should return only rows matching exact match filters", () => {
            fc.assert(
                fc.property(
                    // Generate random filter field and value
                    fc.constantFrom('code1', 'code2', 'code3', 'name1', 'name2', 'name3', 'statement_type'),
                    fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code2: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code3: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            name1: fc.stringMatching(/^[a-zA-Z0-9 ]{1,20}$/),
                            name2: fc.stringMatching(/^[a-zA-Z0-9 ]{1,20}$/),
                            name3: fc.stringMatching(/^[a-zA-Z0-9 ]{1,20}$/),
                            statement_type: fc.constantFrom('Balans', 'Winst & verlies'),
                            amount: fc.integer()
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (field, value, tableData) => {
                        // Create filter specification
                        const filterSpec = { [field]: value };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: All returned rows must match the filter
                        for (const row of results) {
                            assertEquals(
                                row[field],
                                value,
                                `Row ${JSON.stringify(row)} does not match filter ${field}=${value}`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For array filters (OR logic within field),
         * all returned rows must have the field value in the specified array
         */
        it("should return only rows matching array filters (OR logic)", () => {
            fc.assert(
                fc.property(
                    // Generate random filter field and array of values
                    fc.constantFrom('code1', 'code2', 'code3'),
                    fc.array(fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/), { minLength: 1, maxLength: 5 }),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code2: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code3: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            amount: fc.integer()
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (field, values, tableData) => {
                        // Skip if values array is empty (invalid filter)
                        if (values.length === 0) return;
                        
                        // Create filter specification
                        const filterSpec = { [field]: values };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: All returned rows must have field value in the array
                        for (const row of results) {
                            assertEquals(
                                values.includes(row[field]),
                                true,
                                `Row ${JSON.stringify(row)} field ${field}=${row[field]} not in ${JSON.stringify(values)}`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For multiple field filters (AND logic),
         * all returned rows must match ALL specified criteria
         */
        it("should return only rows matching multiple field filters (AND logic)", () => {
            fc.assert(
                fc.property(
                    // Generate two filter fields and values
                    fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                    fc.constantFrom('Balans', 'Winst & verlies'),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code2: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            statement_type: fc.constantFrom('Balans', 'Winst & verlies'),
                            amount: fc.integer()
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (code1Value, statementType, tableData) => {
                        // Create filter specification with multiple fields
                        const filterSpec = {
                            code1: code1Value,
                            statement_type: statementType
                        };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: All returned rows must match BOTH criteria
                        for (const row of results) {
                            assertEquals(
                                row.code1,
                                code1Value,
                                `Row ${JSON.stringify(row)} does not match code1=${code1Value}`
                            );
                            assertEquals(
                                row.statement_type,
                                statementType,
                                `Row ${JSON.stringify(row)} does not match statement_type=${statementType}`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: For range filters (gte, lte),
         * all returned rows must satisfy the range conditions
         */
        it("should return only rows matching range filters", () => {
            fc.assert(
                fc.property(
                    // Generate range bounds
                    fc.stringMatching(/^[a-zA-Z0-9]{1,3}$/),
                    fc.stringMatching(/^[a-zA-Z0-9]{1,3}$/),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,3}$/),
                            amount: fc.integer()
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (lowerBound, upperBound, tableData) => {
                        // Ensure lowerBound <= upperBound
                        const [gte, lte] = lowerBound <= upperBound 
                            ? [lowerBound, upperBound]
                            : [upperBound, lowerBound];
                        
                        // Create filter specification with range
                        const filterSpec = {
                            code1: { gte, lte }
                        };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: All returned rows must be within range
                        for (const row of results) {
                            assertEquals(
                                row.code1 >= gte && row.code1 <= lte,
                                true,
                                `Row ${JSON.stringify(row)} code1=${row.code1} not in range [${gte}, ${lte}]`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Empty filter specification should return all rows
         */
        it("should return all rows when filter specification is empty", () => {
            fc.assert(
                fc.property(
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            amount: fc.integer()
                        }),
                        { minLength: 1, maxLength: 50 }
                    ),
                    (tableData) => {
                        // Create empty filter specification
                        const filterSpec = {};
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: Should return all rows
                        assertEquals(
                            results.length,
                            tableData.length,
                            `Empty filter should return all ${tableData.length} rows, got ${results.length}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Filter result count should never exceed input count
         */
        it("should never return more rows than input", () => {
            fc.assert(
                fc.property(
                    // Generate random filter
                    fc.constantFrom('code1', 'code2', 'statement_type'),
                    fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code2: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            statement_type: fc.constantFrom('Balans', 'Winst & verlies'),
                            amount: fc.integer()
                        }),
                        { minLength: 0, maxLength: 50 }
                    ),
                    (field, value, tableData) => {
                        // Create filter specification
                        const filterSpec = { [field]: value };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter
                        const filtered = filterEngine.applyFilter(table, filterSpec);
                        const results = filtered.objects();
                        
                        // Assert: Result count should not exceed input count
                        assertEquals(
                            results.length <= tableData.length,
                            true,
                            `Filter returned ${results.length} rows but input had only ${tableData.length}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Applying the same filter twice should be idempotent
         */
        it("should be idempotent - applying filter twice gives same result", () => {
            fc.assert(
                fc.property(
                    // Generate random filter
                    fc.constantFrom('code1', 'code2'),
                    fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                    // Generate random table data
                    fc.array(
                        fc.record({
                            code1: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            code2: fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/),
                            amount: fc.integer()
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (field, value, tableData) => {
                        // Create filter specification
                        const filterSpec = { [field]: value };
                        
                        // Create Arquero table
                        const table = mockAq.from(tableData);
                        
                        // Apply filter once
                        const filtered1 = filterEngine.applyFilter(table, filterSpec);
                        const results1 = filtered1.objects();
                        
                        // Apply filter again to the result
                        const filtered2 = filterEngine.applyFilter(filtered1, filterSpec);
                        const results2 = filtered2.objects();
                        
                        // Assert: Both results should be identical
                        assertEquals(
                            results2.length,
                            results1.length,
                            `Idempotence violated: first filter returned ${results1.length} rows, second returned ${results2.length}`
                        );
                        
                        // Check that all rows are identical
                        for (let i = 0; i < results1.length; i++) {
                            assertEquals(
                                JSON.stringify(results2[i]),
                                JSON.stringify(results1[i]),
                                `Row ${i} differs after second filter application`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
