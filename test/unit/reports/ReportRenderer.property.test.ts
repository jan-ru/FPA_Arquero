/**
 * Property-Based Tests for ReportRenderer
 * 
 * Tests universal properties that should hold across all valid inputs.
 * 
 * **Feature: configurable-report-definitions, Property 4: Layout Order Preservation**
 * **Validates: Requirements 3.3, 3.4**
 * 
 * **Feature: configurable-report-definitions, Property 6: Subtotal Calculation Accuracy**
 * **Validates: Requirements 6.1-6.6**
 * 
 * **Feature: configurable-report-definitions, Property 7: Format Application Consistency**
 * **Validates: Requirements 5.1-5.14**
 */

import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as fc from "npm:fast-check@3.15.0";
import ReportRenderer from "../../../src/reports/ReportRenderer.js";
import VariableResolver from "../../../src/reports/VariableResolver.js";
import ExpressionEvaluator from "../../../src/reports/ExpressionEvaluator.js";
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
    },
    table: (data: any) => {
        const keys = Object.keys(data);
        const length = keys.length > 0 ? data[keys[0]].length : 0;
        const rows: any[] = [];
        
        for (let i = 0; i < length; i++) {
            const row: any = {};
            for (const key of keys) {
                row[key] = data[key][i];
            }
            rows.push(row);
        }
        
        return mockAq.from(rows);
    }
};

// Set up global aq
(globalThis as any).aq = mockAq;

describe("ReportRenderer - Property-Based Tests", () => {
    let renderer: ReportRenderer;
    let variableResolver: VariableResolver;
    let expressionEvaluator: ExpressionEvaluator;
    let filterEngine: FilterEngine;

    beforeEach(() => {
        filterEngine = new FilterEngine();
        variableResolver = new VariableResolver(filterEngine);
        expressionEvaluator = new ExpressionEvaluator();
        renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    });

    describe("Property 4: Layout Order Preservation", () => {
        /**
         * Property: For any report definition with layout items,
         * the generated statement rows must appear in ascending order by the order field.
         */
        it("should preserve layout order - rows appear in ascending order", () => {
            // Arbitrary for generating unique order numbers
            const orderArb = fc.uniqueArray(
                fc.integer({ min: 1, max: 1000 }),
                { minLength: 3, maxLength: 10 }
            );

            fc.assert(
                fc.property(orderArb, (orders) => {
                    // Create layout items with random order numbers
                    const layout = orders.map(order => ({
                        order,
                        type: 'spacer' as const,
                        label: `Item ${order}`
                    }));

                    const context = {
                        variables: new Map(),
                        rows: new Map(),
                        reportDef: { formatting: {} },
                        periodOptions: { years: [2024, 2025] },
                        movementsData: mockAq.from([])
                    };

                    // Process layout items
                    const rows = renderer.processLayoutItems(layout, context);

                    // Assert: Rows should be in ascending order
                    for (let i = 1; i < rows.length; i++) {
                        assertEquals(
                            rows[i].order > rows[i - 1].order,
                            true,
                            `Row ${i} (order=${rows[i].order}) should be after row ${i-1} (order=${rows[i-1].order})`
                        );
                    }

                    // Assert: All orders should be present
                    assertEquals(rows.length, orders.length);

                    // Assert: Orders should match sorted input
                    const sortedOrders = [...orders].sort((a, b) => a - b);
                    for (let i = 0; i < rows.length; i++) {
                        assertEquals(rows[i].order, sortedOrders[i]);
                    }
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Layout items with gaps in order numbers should still be sorted correctly
         */
        it("should handle gaps in order numbers correctly", () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.integer({ min: 1, max: 100 }),
                        { minLength: 3, maxLength: 10 }
                    ),
                    (orders) => {
                        // Remove duplicates and create gaps
                        const uniqueOrders = [...new Set(orders)];
                        if (uniqueOrders.length < 2) return; // Skip if not enough unique orders

                        const layout = uniqueOrders.map(order => ({
                            order,
                            type: 'spacer' as const
                        }));

                        const context = {
                            variables: new Map(),
                            rows: new Map(),
                            reportDef: { formatting: {} },
                            periodOptions: { years: [2024, 2025] },
                            movementsData: mockAq.from([])
                        };

                        const rows = renderer.processLayoutItems(layout, context);

                        // Assert: Rows should be in ascending order
                        for (let i = 1; i < rows.length; i++) {
                            assertEquals(
                                rows[i].order >= rows[i - 1].order,
                                true,
                                `Rows should be in ascending order`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Rendering the same layout twice should produce the same order
         */
        it("should produce consistent ordering across multiple renders", () => {
            fc.assert(
                fc.property(
                    fc.uniqueArray(
                        fc.integer({ min: 1, max: 100 }),
                        { minLength: 3, maxLength: 8 }
                    ),
                    (orders) => {
                        const layout = orders.map(order => ({
                            order,
                            type: 'spacer' as const
                        }));

                        const context1 = {
                            variables: new Map(),
                            rows: new Map(),
                            reportDef: { formatting: {} },
                            periodOptions: { years: [2024, 2025] },
                            movementsData: mockAq.from([])
                        };

                        const context2 = {
                            variables: new Map(),
                            rows: new Map(),
                            reportDef: { formatting: {} },
                            periodOptions: { years: [2024, 2025] },
                            movementsData: mockAq.from([])
                        };

                        // Render twice
                        const rows1 = renderer.processLayoutItems(layout, context1);
                        const rows2 = renderer.processLayoutItems(layout, context2);

                        // Assert: Same order in both renders
                        assertEquals(rows1.length, rows2.length);
                        for (let i = 0; i < rows1.length; i++) {
                            assertEquals(rows1[i].order, rows2[i].order);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("Property 6: Subtotal Calculation Accuracy", () => {
        /**
         * Property: For any subtotal layout item with from and to order numbers,
         * the calculated subtotal must equal the sum of all non-spacer, non-subtotal items
         * with order numbers in the range [from, to].
         */
        it("should calculate subtotals accurately - equals manual sum", () => {
            fc.assert(
                fc.property(
                    // Generate random row values
                    fc.array(
                        fc.record({
                            order: fc.integer({ min: 10, max: 100 }),
                            amount_2024: fc.integer({ min: -10000, max: 10000 }),
                            amount_2025: fc.integer({ min: -10000, max: 10000 }),
                            type: fc.constantFrom('variable', 'calculated', 'category')
                        }),
                        { minLength: 3, maxLength: 10 }
                    ),
                    // Generate subtotal range
                    fc.integer({ min: 10, max: 100 }),
                    fc.integer({ min: 10, max: 100 }),
                    (rowData, from, to) => {
                        // Ensure from <= to
                        if (from > to) {
                            [from, to] = [to, from];
                        }

                        // Create rows map
                        const rows = new Map();
                        for (const data of rowData) {
                            rows.set(data.order, data);
                        }

                        // Calculate subtotal using renderer
                        const subtotals = renderer.calculateSubtotal(from, to, rows);

                        // Calculate expected subtotal manually
                        let expected2024 = 0;
                        let expected2025 = 0;

                        for (let order = from; order <= to; order++) {
                            const row = rows.get(order);
                            if (row && row.type !== 'spacer' && row.type !== 'subtotal') {
                                expected2024 += row.amount_2024 || 0;
                                expected2025 += row.amount_2025 || 0;
                            }
                        }

                        // Assert: Calculated subtotal equals manual sum
                        assertEquals(
                            subtotals[2024],
                            expected2024,
                            `Subtotal for 2024 should equal manual sum`
                        );
                        assertEquals(
                            subtotals[2025],
                            expected2025,
                            `Subtotal for 2025 should equal manual sum`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Subtotals should exclude spacer rows
         */
        it("should exclude spacer rows from subtotal calculation", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 1000 }),
                    fc.integer({ min: 100, max: 1000 }),
                    (amount1, amount2) => {
                        const rows = new Map([
                            [10, { order: 10, type: 'variable', amount_2024: amount1, amount_2025: amount1 }],
                            [20, { order: 20, type: 'spacer', amount_2024: 999999, amount_2025: 999999 }],
                            [30, { order: 30, type: 'variable', amount_2024: amount2, amount_2025: amount2 }]
                        ]);

                        const subtotals = renderer.calculateSubtotal(10, 30, rows);

                        // Assert: Spacer row should not be included
                        assertEquals(subtotals[2024], amount1 + amount2);
                        assertEquals(subtotals[2025], amount1 + amount2);
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Subtotals should exclude other subtotal rows to avoid double-counting
         */
        it("should exclude subtotal rows from subtotal calculation", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 1000 }),
                    fc.integer({ min: 100, max: 1000 }),
                    (amount1, amount2) => {
                        const rows = new Map([
                            [10, { order: 10, type: 'variable', amount_2024: amount1, amount_2025: amount1 }],
                            [20, { order: 20, type: 'subtotal', amount_2024: 999999, amount_2025: 999999 }],
                            [30, { order: 30, type: 'variable', amount_2024: amount2, amount_2025: amount2 }]
                        ]);

                        const subtotals = renderer.calculateSubtotal(10, 30, rows);

                        // Assert: Subtotal row should not be included
                        assertEquals(subtotals[2024], amount1 + amount2);
                        assertEquals(subtotals[2025], amount1 + amount2);
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Empty range should return zero
         */
        it("should return zero for empty range", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 10, max: 100 }),
                    fc.integer({ min: 10, max: 100 }),
                    (from, to) => {
                        // Ensure from <= to
                        if (from > to) {
                            [from, to] = [to, from];
                        }

                        // Empty rows map
                        const rows = new Map();

                        const subtotals = renderer.calculateSubtotal(from, to, rows);

                        // Assert: Should return zero for both years
                        assertEquals(subtotals[2024], 0);
                        assertEquals(subtotals[2025], 0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Subtotal calculation should be commutative for addition
         */
        it("should produce same result regardless of row order in map", () => {
            fc.assert(
                fc.property(
                    // Generate unique order numbers to avoid Map overwrites
                    fc.uniqueArray(
                        fc.integer({ min: 10, max: 50 }),
                        { minLength: 3, maxLength: 8 }
                    ),
                    fc.array(
                        fc.integer({ min: -1000, max: 1000 }),
                        { minLength: 3, maxLength: 8 }
                    ),
                    fc.array(
                        fc.integer({ min: -1000, max: 1000 }),
                        { minLength: 3, maxLength: 8 }
                    ),
                    (orders, amounts2024, amounts2025) => {
                        // Ensure arrays have same length
                        const length = Math.min(orders.length, amounts2024.length, amounts2025.length);
                        
                        // Create row data with unique orders
                        const rowData = orders.slice(0, length).map((order, i) => ({
                            order,
                            amount_2024: amounts2024[i],
                            amount_2025: amounts2025[i]
                        }));

                        // Create two maps with same data but different insertion order
                        const rows1 = new Map();
                        const rows2 = new Map();

                        for (const data of rowData) {
                            rows1.set(data.order, { ...data, type: 'variable' });
                        }

                        // Insert in reverse order
                        for (let i = rowData.length - 1; i >= 0; i--) {
                            const data = rowData[i];
                            rows2.set(data.order, { ...data, type: 'variable' });
                        }

                        const from = 10;
                        const to = 50;

                        const subtotals1 = renderer.calculateSubtotal(from, to, rows1);
                        const subtotals2 = renderer.calculateSubtotal(from, to, rows2);

                        // Assert: Same result regardless of insertion order
                        assertEquals(subtotals1[2024], subtotals2[2024]);
                        assertEquals(subtotals1[2025], subtotals2[2025]);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("Property 7: Format Application Consistency", () => {
        /**
         * Property: For any number and format specification,
         * applying the format must produce a string that can be parsed back
         * to the original number (within rounding tolerance).
         */
        it("should format and parse currency values consistently", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -1000000, max: 1000000, noNaN: true }),
                    fc.integer({ min: 0, max: 4 }),
                    (value, decimals) => {
                        const formatOptions = {
                            currency: {
                                decimals,
                                thousands: true,
                                symbol: '€'
                            }
                        };

                        const formatted = renderer.applyFormatting(value, 'currency', formatOptions);

                        // Parse back the formatted string
                        const parsed = parseFloat(
                            formatted
                                .replace('€', '')
                                .replace(/,/g, '')
                                .trim()
                        );

                        // Calculate tolerance based on decimal places
                        const tolerance = Math.pow(10, -decimals) / 2;

                        // Assert: Parsed value should be close to original (within rounding tolerance)
                        const diff = Math.abs(parsed - value);
                        assertEquals(
                            diff <= tolerance + 0.01, // Small epsilon for floating point
                            true,
                            `Parsed value ${parsed} should be within ${tolerance} of original ${value}, diff=${diff}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Percent formatting should be consistent
         */
        it("should format percent values consistently", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -100, max: 100, noNaN: true }),
                    fc.integer({ min: 0, max: 3 }),
                    (value, decimals) => {
                        const formatOptions = {
                            percent: {
                                decimals,
                                symbol: '%'
                            }
                        };

                        const formatted = renderer.applyFormatting(value, 'percent', formatOptions);

                        // Parse back the formatted string
                        const parsed = parseFloat(formatted.replace('%', '').trim());

                        // Calculate tolerance based on decimal places
                        const tolerance = Math.pow(10, -decimals) / 2;

                        // Assert: Parsed value should be close to original
                        const diff = Math.abs(parsed - value);
                        assertEquals(
                            diff <= tolerance + 0.01,
                            true,
                            `Parsed percent ${parsed} should be within ${tolerance} of original ${value}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Integer formatting should round to whole numbers
         */
        it("should format integers by rounding to whole numbers", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -100000, max: 100000, noNaN: true }),
                    (value) => {
                        const formatOptions = {
                            integer: {
                                thousands: true
                            }
                        };

                        const formatted = renderer.applyFormatting(value, 'integer', formatOptions);

                        // Parse back the formatted string
                        const parsed = parseFloat(formatted.replace(/,/g, ''));

                        // Assert: Parsed value should be a whole number
                        assertEquals(
                            Math.floor(parsed),
                            parsed,
                            `Integer format should produce whole number, got ${parsed}`
                        );

                        // Assert: Should be within 0.5 of original (rounding)
                        const diff = Math.abs(parsed - value);
                        assertEquals(
                            diff <= 0.5,
                            true,
                            `Rounded value ${parsed} should be within 0.5 of original ${value}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Decimal formatting should preserve specified decimal places
         */
        it("should format decimals with specified precision", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -10000, max: 10000, noNaN: true }),
                    fc.integer({ min: 0, max: 4 }),
                    (value, decimals) => {
                        const formatOptions = {
                            decimal: {
                                decimals,
                                thousands: true
                            }
                        };

                        const formatted = renderer.applyFormatting(value, 'decimal', formatOptions);

                        // Parse back the formatted string
                        const parsed = parseFloat(formatted.replace(/,/g, ''));

                        // Calculate tolerance based on decimal places
                        const tolerance = Math.pow(10, -decimals) / 2;

                        // Assert: Parsed value should be close to original
                        const diff = Math.abs(parsed - value);
                        assertEquals(
                            diff <= tolerance + 0.01,
                            true,
                            `Parsed decimal ${parsed} should be within ${tolerance} of original ${value}`
                        );

                        // Assert: Formatted string should have correct decimal places
                        if (decimals > 0 && !formatted.includes('e')) {
                            const parts = formatted.replace(/,/g, '').split('.');
                            if (parts.length > 1) {
                                assertEquals(
                                    parts[1].length,
                                    decimals,
                                    `Should have ${decimals} decimal places`
                                );
                            }
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Null/undefined values should format to empty string
         */
        it("should format null and undefined as empty string", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('currency', 'percent', 'integer', 'decimal'),
                    (formatType) => {
                        const formatted1 = renderer.applyFormatting(null, formatType, {});
                        const formatted2 = renderer.applyFormatting(undefined, formatType, {});

                        assertEquals(formatted1, '');
                        assertEquals(formatted2, '');
                    }
                ),
                { numRuns: 20 }
            );
        });

        /**
         * Property: Formatting should handle negative numbers correctly
         */
        it("should handle negative numbers consistently", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -10000, max: -1, noNaN: true }),
                    fc.constantFrom('currency', 'integer', 'decimal'),
                    (value, formatType) => {
                        const formatted = renderer.applyFormatting(value, formatType, {});

                        // Assert: Formatted string should contain negative sign
                        assertEquals(
                            formatted.includes('-'),
                            true,
                            `Negative value ${value} should format with negative sign: ${formatted}`
                        );

                        // Parse back and check sign
                        const parsed = parseFloat(
                            formatted
                                .replace(/[€$£,]/g, '')
                                .trim()
                        );

                        assertEquals(
                            parsed < 0,
                            true,
                            `Parsed value should be negative: ${parsed}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Formatting should be deterministic
         */
        it("should produce same formatted string for same input", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -10000, max: 10000, noNaN: true }),
                    fc.constantFrom('currency', 'percent', 'integer', 'decimal'),
                    (value, formatType) => {
                        const formatted1 = renderer.applyFormatting(value, formatType, {});
                        const formatted2 = renderer.applyFormatting(value, formatType, {});

                        assertEquals(
                            formatted1,
                            formatted2,
                            `Formatting should be deterministic for value ${value}`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
