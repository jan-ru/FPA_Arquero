/**
 * Unit tests for LTMCalculator
 *
 * Test coverage:
 * - getLatestAvailablePeriod: 6 tests
 * - calculateLTMRange: 8 tests
 * - filterMovementsForLTM: 4 tests
 * - generateLTMLabel: 4 tests
 * - hasCompleteData: 5 tests
 * - calculateLTMInfo: 2 tests
 * Total: 29 tests
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.210.0/assert/mod.ts";

// Mock Arquero for testing
const mockAq = {
    from: (data: any[], storedParams: any = {}) => {
        return {
            data,
            _storedParams: storedParams,
            params: (p: any) => {
                return mockAq.from(data, p);
            },
            filter: function(fn: any) {
                if (typeof fn === 'function') {
                    return mockAq.from(data.filter(fn));
                } else if (typeof fn === 'string') {
                    // Handle string filter expressions with params
                    const $ = this._storedParams;
                    const filtered = data.filter((d: any) => {
                        // Handle LTM range filter: '(d, $) => d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod'
                        if ($.year !== undefined && $.startPeriod !== undefined && $.endPeriod !== undefined) {
                            return d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod;
                        }
                        // Handle max year filter: '(d, $) => d.year === $.maxYear'
                        if ($.maxYear !== undefined) {
                            return d.year === $.maxYear;
                        }
                        return true;
                    });
                    return mockAq.from(filtered);
                }
                return mockAq.from(data);
            },
            concat: (other: any) => {
                const combined = [...data, ...other.data];
                return mockAq.from(combined);
            },
            rollup: (spec: any) => {
                const result: any = {};
                Object.keys(spec).forEach(key => {
                    const fn = spec[key];
                    // Create a columns proxy object that returns column arrays
                    const columnsProxy = new Proxy({}, {
                        get: (target, prop) => {
                            return data.map((row: any) => row[prop]);
                        }
                    });
                    result[key] = fn(columnsProxy);
                });
                return {
                    get: (col: string, defaultValue: any) => result[col] !== undefined ? result[col] : defaultValue
                };
            },
            numRows: () => data.length,
            objects: () => data
        };
    },
    op: {
        max: (col: any) => Math.max(...(Array.isArray(col) ? col : [col]))
    }
};

// Make Arquero available globally for the module
(globalThis as any).aq = mockAq;

// Import LTMCalculator
const LTMCalculator = (await import("../../../src/utils/LTMCalculator.ts")).default;

/**
 * Helper function to create test movements data
 */
function createTestMovements(data: any[]) {
    return mockAq.from(data);
}

// =============================================================================
// Tests for getLatestAvailablePeriod
// =============================================================================

Deno.test("LTMCalculator.getLatestAvailablePeriod - returns latest period when data exists", () => {
    const movements = createTestMovements([
        { year: 2024, period: 6, movement_amount: 100 },
        { year: 2024, period: 12, movement_amount: 200 },
        { year: 2025, period: 3, movement_amount: 150 },
        { year: 2025, period: 6, movement_amount: 175 }
    ]);

    const result = LTMCalculator.getLatestAvailablePeriod(movements);

    assertEquals(result.year, 2025);
    assertEquals(result.period, 6);
});

Deno.test("LTMCalculator.getLatestAvailablePeriod - returns latest period with single year", () => {
    const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
        { year: 2025, period: 3, movement_amount: 150 },
        { year: 2025, period: 2, movement_amount: 125 }
    ]);

    const result = LTMCalculator.getLatestAvailablePeriod(movements);

    assertEquals(result.year, 2025);
    assertEquals(result.period, 3);
});

Deno.test("LTMCalculator.getLatestAvailablePeriod - handles empty table", () => {
    const movements = createTestMovements([]);

    const result = LTMCalculator.getLatestAvailablePeriod(movements);

    assertEquals(result.year, 0);
    assertEquals(result.period, 0);
});

Deno.test("LTMCalculator.getLatestAvailablePeriod - handles null input", () => {
    const result = LTMCalculator.getLatestAvailablePeriod(null);

    assertEquals(result.year, 0);
    assertEquals(result.period, 0);
});

Deno.test("LTMCalculator.getLatestAvailablePeriod - handles period 12 correctly", () => {
    const movements = createTestMovements([
        { year: 2024, period: 12, movement_amount: 100 },
        { year: 2025, period: 1, movement_amount: 200 }
    ]);

    const result = LTMCalculator.getLatestAvailablePeriod(movements);

    assertEquals(result.year, 2025);
    assertEquals(result.period, 1);
});

Deno.test("LTMCalculator.getLatestAvailablePeriod - handles multiple years with same max period", () => {
    const movements = createTestMovements([
        { year: 2024, period: 6, movement_amount: 100 },
        { year: 2025, period: 6, movement_amount: 200 },
        { year: 2023, period: 6, movement_amount: 50 }
    ]);

    const result = LTMCalculator.getLatestAvailablePeriod(movements);

    assertEquals(result.year, 2025);
    assertEquals(result.period, 6);
});

// =============================================================================
// Tests for calculateLTMRange
// =============================================================================

Deno.test("LTMCalculator.calculateLTMRange - calculates range spanning two years", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 6, 12);

    assertEquals(ranges.length, 2);
    assertEquals(ranges[0], { year: 2024, startPeriod: 7, endPeriod: 12 });
    assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 6 });
});

Deno.test("LTMCalculator.calculateLTMRange - calculates range within single year", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 12, 12);

    assertEquals(ranges.length, 1);
    assertEquals(ranges[0], { year: 2025, startPeriod: 1, endPeriod: 12 });
});

Deno.test("LTMCalculator.calculateLTMRange - handles year boundary (P12 to P11)", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 11, 12);

    assertEquals(ranges.length, 2);
    assertEquals(ranges[0], { year: 2024, startPeriod: 12, endPeriod: 12 });
    assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 11 });
});

Deno.test("LTMCalculator.calculateLTMRange - handles partial data (6 months)", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 6, 6);

    assertEquals(ranges.length, 1);
    assertEquals(ranges[0], { year: 2025, startPeriod: 1, endPeriod: 6 });
});

Deno.test("LTMCalculator.calculateLTMRange - handles 1 month only", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 3, 1);

    assertEquals(ranges.length, 1);
    assertEquals(ranges[0], { year: 2025, startPeriod: 3, endPeriod: 3 });
});

Deno.test("LTMCalculator.calculateLTMRange - handles edge case at period 1", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 1, 12);

    assertEquals(ranges.length, 2);
    assertEquals(ranges[0], { year: 2024, startPeriod: 2, endPeriod: 12 });
    assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 1 });
});

Deno.test("LTMCalculator.calculateLTMRange - returns empty array for invalid input", () => {
    const ranges1 = LTMCalculator.calculateLTMRange(0, 6, 12);
    const ranges2 = LTMCalculator.calculateLTMRange(2025, 0, 12);
    const ranges3 = LTMCalculator.calculateLTMRange(2025, 6, 0);

    assertEquals(ranges1.length, 0);
    assertEquals(ranges2.length, 0);
    assertEquals(ranges3.length, 0);
});

Deno.test("LTMCalculator.calculateLTMRange - handles spanning three years", () => {
    const ranges = LTMCalculator.calculateLTMRange(2025, 3, 18);

    assertEquals(ranges.length, 3);
    assertEquals(ranges[0], { year: 2023, startPeriod: 10, endPeriod: 12 });
    assertEquals(ranges[1], { year: 2024, startPeriod: 1, endPeriod: 12 });
    assertEquals(ranges[2], { year: 2025, startPeriod: 1, endPeriod: 3 });
});

// =============================================================================
// Tests for filterMovementsForLTM
// =============================================================================

Deno.test("LTMCalculator.filterMovementsForLTM - filters data for single range", () => {
    const movements = createTestMovements([
        { year: 2025, period: 1, account_code: 'A', movement_amount: 100 },
        { year: 2025, period: 6, account_code: 'B', movement_amount: 200 },
        { year: 2025, period: 12, account_code: 'C', movement_amount: 300 }
    ]);

    const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 6 }];
    const filtered = LTMCalculator.filterMovementsForLTM(movements, ranges);

    assertEquals(filtered.numRows(), 2);
    const data = filtered.objects();
    assertEquals(data[0].account_code, 'A');
    assertEquals(data[1].account_code, 'B');
});

Deno.test("LTMCalculator.filterMovementsForLTM - filters data for multiple ranges", () => {
    const movements = createTestMovements([
        { year: 2024, period: 7, account_code: 'A', movement_amount: 100 },
        { year: 2024, period: 12, account_code: 'B', movement_amount: 200 },
        { year: 2025, period: 1, account_code: 'C', movement_amount: 150 },
        { year: 2025, period: 6, account_code: 'D', movement_amount: 175 },
        { year: 2025, period: 12, account_code: 'E', movement_amount: 300 }
    ]);

    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const filtered = LTMCalculator.filterMovementsForLTM(movements, ranges);

    assertEquals(filtered.numRows(), 4);
    const data = filtered.objects();
    assertEquals(data[0].account_code, 'A');
    assertEquals(data[1].account_code, 'B');
    assertEquals(data[2].account_code, 'C');
    assertEquals(data[3].account_code, 'D');
});

Deno.test("LTMCalculator.filterMovementsForLTM - returns empty table for empty ranges", () => {
    const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 }
    ]);

    const filtered = LTMCalculator.filterMovementsForLTM(movements, []);

    assertEquals(filtered.numRows(), 0);
});

Deno.test("LTMCalculator.filterMovementsForLTM - handles null inputs gracefully", () => {
    const result1 = LTMCalculator.filterMovementsForLTM(null, []);
    const result2 = LTMCalculator.filterMovementsForLTM(createTestMovements([]), null);

    assertEquals(result1, null);
    assertEquals(result2.numRows(), 0);
});

// =============================================================================
// Tests for generateLTMLabel
// =============================================================================

Deno.test("LTMCalculator.generateLTMLabel - generates label for multi-year range", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];

    const label = LTMCalculator.generateLTMLabel(ranges);

    assertEquals(label, "LTM (2024 P7 - 2025 P6)");
});

Deno.test("LTMCalculator.generateLTMLabel - generates label for single year range", () => {
    const ranges = [
        { year: 2025, startPeriod: 1, endPeriod: 12 }
    ];

    const label = LTMCalculator.generateLTMLabel(ranges);

    assertEquals(label, "LTM (2025 P1 - 2025 P12)");
});

Deno.test("LTMCalculator.generateLTMLabel - generates label for partial data", () => {
    const ranges = [
        { year: 2025, startPeriod: 1, endPeriod: 3 }
    ];

    const label = LTMCalculator.generateLTMLabel(ranges);

    assertEquals(label, "LTM (2025 P1 - 2025 P3)");
});

Deno.test("LTMCalculator.generateLTMLabel - handles empty ranges", () => {
    const label = LTMCalculator.generateLTMLabel([]);

    assertEquals(label, "LTM (No Data)");
});

// =============================================================================
// Tests for hasCompleteData
// =============================================================================

Deno.test("LTMCalculator.hasCompleteData - returns true for complete 12 months", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const availableYears = [2024, 2025];

    const result = LTMCalculator.hasCompleteData(ranges, availableYears);

    assertEquals(result.complete, true);
    assertEquals(result.actualMonths, 12);
    assertEquals(result.message, "Complete LTM data available");
});

Deno.test("LTMCalculator.hasCompleteData - returns false for incomplete data", () => {
    const ranges = [
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const availableYears = [2025];

    const result = LTMCalculator.hasCompleteData(ranges, availableYears);

    assertEquals(result.complete, false);
    assertEquals(result.actualMonths, 6);
    assertEquals(result.message, "Only 6 months available (need 12)");
});

Deno.test("LTMCalculator.hasCompleteData - returns false for missing year", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const availableYears = [2025]; // Missing 2024

    const result = LTMCalculator.hasCompleteData(ranges, availableYears);

    assertEquals(result.complete, false);
    assertEquals(result.actualMonths, 12);
    assertEquals(result.message, "Missing data for year(s): 2024");
});

Deno.test("LTMCalculator.hasCompleteData - handles single month", () => {
    const ranges = [
        { year: 2025, startPeriod: 3, endPeriod: 3 }
    ];
    const availableYears = [2025];

    const result = LTMCalculator.hasCompleteData(ranges, availableYears);

    assertEquals(result.complete, false);
    assertEquals(result.actualMonths, 1);
    assertEquals(result.message, "Only 1 month available (need 12)");
});

Deno.test("LTMCalculator.hasCompleteData - handles empty ranges", () => {
    const result = LTMCalculator.hasCompleteData([], [2024, 2025]);

    assertEquals(result.complete, false);
    assertEquals(result.actualMonths, 0);
    assertEquals(result.message, "No LTM data available");
});

// =============================================================================
// Tests for calculateLTMInfo (convenience method)
// =============================================================================

Deno.test("LTMCalculator.calculateLTMInfo - returns complete information", () => {
    const movements = createTestMovements([
        { year: 2024, period: 7, movement_amount: 100 },
        { year: 2024, period: 12, movement_amount: 200 },
        { year: 2025, period: 1, movement_amount: 150 },
        { year: 2025, period: 6, movement_amount: 175 }
    ]);

    const result = LTMCalculator.calculateLTMInfo(movements, [2024, 2025], 12);

    assertExists(result.latest);
    assertEquals(result.latest.year, 2025);
    assertEquals(result.latest.period, 6);

    assertExists(result.ranges);
    assertEquals(result.ranges.length, 2);

    assertExists(result.filteredData);
    assertEquals(result.filteredData.numRows(), 4);

    assertExists(result.label);
    assertEquals(result.label, "LTM (2024 P7 - 2025 P6)");

    assertExists(result.availability);
    assertEquals(result.availability.complete, true);
    assertEquals(result.availability.actualMonths, 12);
});

Deno.test("LTMCalculator.calculateLTMInfo - handles incomplete data", () => {
    const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
        { year: 2025, period: 3, movement_amount: 150 }
    ]);

    const result = LTMCalculator.calculateLTMInfo(movements, [2025], 12);

    assertEquals(result.latest.year, 2025);
    assertEquals(result.latest.period, 3);
    assertEquals(result.filteredData.numRows(), 2);
    assertEquals(result.availability.complete, false);
    // actualMonths is 12 (the theoretical range), not 3 (available data)
    // The function calculates what WOULD be 12 months, even if data is missing
    assertEquals(result.availability.actualMonths, 12);
    // The message should indicate missing years
    assertEquals(result.availability.message.includes("Missing data for year"), true);
});

console.log("✅ All LTMCalculator tests defined");
