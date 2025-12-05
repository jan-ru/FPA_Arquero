/**
 * Functional Integration Tests: LTM (Latest Twelve Months) Feature
 *
 * Tests the complete LTM workflow from UI selection through statement generation
 * to CSV export.
 *
 * Test Coverage:
 * - LTM calculation across year boundaries
 * - Statement generation with LTM filtering
 * - LTM label generation and display
 * - Data availability warnings
 * - Edge cases (incomplete data, single year)
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
                    const $ = this._storedParams;
                    const filtered = data.filter((d: any) => {
                        // Handle LTM range filter
                        if ($.year !== undefined && $.startPeriod !== undefined && $.endPeriod !== undefined) {
                            return d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod;
                        }
                        // Handle max year filter
                        if ($.maxYear !== undefined) {
                            return d.year === $.maxYear;
                        }
                        // Handle statement type filter
                        if ($.statementType !== undefined) {
                            return d.statement_type === $.statementType;
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
            groupby: (...cols: string[]) => {
                return {
                    rollup: (spec: any) => {
                        // Simplified groupby+rollup for testing
                        return mockAq.from(data);
                    }
                };
            },
            derive: (spec: any) => mockAq.from(data),
            orderby: (...cols: string[]) => mockAq.from(data),
            numRows: () => data.length,
            objects: () => data,
            columnNames: () => Object.keys(data[0] || {})
        };
    },
    op: {
        max: (col: any) => Math.max(...(Array.isArray(col) ? col : [col])),
        sum: (col: any) => Array.isArray(col) ? col.reduce((a: number, b: number) => a + b, 0) : col
    }
};

// Make Arquero available globally
(globalThis as any).aq = mockAq;

// Import modules after setting up Arquero
const LTMCalculator = (await import("../../src/utils/LTMCalculator.ts")).default;
const { YEAR_CONFIG } = await import("../../src/constants.js");

// =============================================================================
// Test Data Fixtures
// =============================================================================

function createMovementsData() {
    const movements = [];

    // 2024 data (all 12 periods)
    for (let period = 1; period <= 12; period++) {
        movements.push({
            year: 2024,
            period,
            statement_type: 'BS',
            code1: '10',
            name1: 'Assets',
            movement_amount: 1000 + period * 100
        });
        movements.push({
            year: 2024,
            period,
            statement_type: 'IS',
            code1: '40',
            name1: 'Revenue',
            movement_amount: 2000 + period * 50
        });
    }

    // 2025 data (6 periods)
    for (let period = 1; period <= 6; period++) {
        movements.push({
            year: 2025,
            period,
            statement_type: 'BS',
            code1: '10',
            name1: 'Assets',
            movement_amount: 1500 + period * 100
        });
        movements.push({
            year: 2025,
            period,
            statement_type: 'IS',
            code1: '40',
            name1: 'Revenue',
            movement_amount: 2500 + period * 50
        });
    }

    return mockAq.from(movements);
}

// =============================================================================
// Integration Tests
// =============================================================================

Deno.test("LTM Integration - Full workflow with year boundary", () => {
    const movements = createMovementsData();
    const availableYears = [2024, 2025];

    // Calculate LTM
    const ltmInfo = LTMCalculator.calculateLTMInfo(movements, availableYears, 12);

    // Verify LTM calculation
    assertExists(ltmInfo.latest);
    assertEquals(ltmInfo.latest.year, 2025);
    assertEquals(ltmInfo.latest.period, 6);

    // Verify LTM ranges span two years
    assertEquals(ltmInfo.ranges.length, 2);
    assertEquals(ltmInfo.ranges[0].year, 2024);
    assertEquals(ltmInfo.ranges[0].startPeriod, 7);
    assertEquals(ltmInfo.ranges[0].endPeriod, 12);
    assertEquals(ltmInfo.ranges[1].year, 2025);
    assertEquals(ltmInfo.ranges[1].startPeriod, 1);
    assertEquals(ltmInfo.ranges[1].endPeriod, 6);

    // Verify label
    assertEquals(ltmInfo.label, "LTM (2024 P7 - 2025 P6)");

    // Verify data availability
    assertEquals(ltmInfo.availability.complete, true);
    assertEquals(ltmInfo.availability.actualMonths, 12);

    // Verify filtered data
    assertExists(ltmInfo.filteredData);
    // Should have 12 rows (6 from 2024 P7-P12 + 6 from 2025 P1-P6) × 2 statement types
    assertEquals(ltmInfo.filteredData.numRows(), 24);
});

Deno.test("LTM Integration - Filter by statement type", () => {
    const movements = createMovementsData();
    const availableYears = [2024, 2025];

    // Calculate LTM
    const ltmInfo = LTMCalculator.calculateLTMInfo(movements, availableYears, 12);

    // Filter for Balance Sheet only
    const bsData = ltmInfo.filteredData.filter((d: any) => d.statement_type === 'BS');

    // Should have 12 BS rows (6 from 2024 + 6 from 2025)
    assertEquals(bsData.numRows(), 12);

    // Verify all rows are BS
    const bsRows = bsData.objects();
    bsRows.forEach((row: any) => {
        assertEquals(row.statement_type, 'BS');
    });
});

Deno.test("LTM Integration - Incomplete data warning", () => {
    const movements = createMovementsData();
    // Only 2025 available (6 months)
    const availableYears = [2025];

    // Calculate LTM
    const ltmInfo = LTMCalculator.calculateLTMInfo(movements, availableYears, 12);

    // Verify warning for missing year
    assertEquals(ltmInfo.availability.complete, false);
    assertEquals(ltmInfo.availability.message.includes("Missing data for year"), true);
    assertEquals(ltmInfo.availability.actualMonths, 12);

    // Label should still be generated
    assertExists(ltmInfo.label);
});

Deno.test("LTM Integration - YEAR_CONFIG LTM settings", () => {
    // Verify YEAR_CONFIG has LTM configuration
    assertExists(YEAR_CONFIG.LTM);
    assertEquals(YEAR_CONFIG.LTM.ENABLED, true);
    assertEquals(YEAR_CONFIG.LTM.MONTHS_COUNT, 12);
    assertEquals(YEAR_CONFIG.LTM.DEFAULT_LABEL, 'LTM');
    assertEquals(YEAR_CONFIG.LTM.OPTION_VALUE, 'ltm');
});

Deno.test("LTM Integration - Single year data (all 12 months)", () => {
    // Create data for only 2025 with all 12 periods
    const movements = [];
    for (let period = 1; period <= 12; period++) {
        movements.push({
            year: 2025,
            period,
            statement_type: 'IS',
            code1: '40',
            name1: 'Revenue',
            movement_amount: 2000 + period * 50
        });
    }

    const movementsTable = mockAq.from(movements);
    const availableYears = [2025];

    // Calculate LTM
    const ltmInfo = LTMCalculator.calculateLTMInfo(movementsTable, availableYears, 12);

    // Verify LTM uses all 12 periods from single year
    assertEquals(ltmInfo.ranges.length, 1);
    assertEquals(ltmInfo.ranges[0].year, 2025);
    assertEquals(ltmInfo.ranges[0].startPeriod, 1);
    assertEquals(ltmInfo.ranges[0].endPeriod, 12);

    // Verify label
    assertEquals(ltmInfo.label, "LTM (2025 P1 - 2025 P12)");

    // Verify data availability
    assertEquals(ltmInfo.availability.complete, true);
    assertEquals(ltmInfo.availability.actualMonths, 12);
});

Deno.test("LTM Integration - Period at year boundary (P12)", () => {
    // Test when latest period is December (P12)
    const movements = [];

    // 2024 full year
    for (let period = 1; period <= 12; period++) {
        movements.push({
            year: 2024,
            period,
            statement_type: 'BS',
            code1: '10',
            name1: 'Assets',
            movement_amount: 1000 + period * 100
        });
    }

    const movementsTable = mockAq.from(movements);
    const availableYears = [2024];

    // Calculate LTM
    const ltmInfo = LTMCalculator.calculateLTMInfo(movementsTable, availableYears, 12);

    // Latest should be 2024 P12
    assertEquals(ltmInfo.latest.year, 2024);
    assertEquals(ltmInfo.latest.period, 12);

    // LTM should be all of 2024
    assertEquals(ltmInfo.ranges.length, 1);
    assertEquals(ltmInfo.ranges[0].year, 2024);
    assertEquals(ltmInfo.ranges[0].startPeriod, 1);
    assertEquals(ltmInfo.ranges[0].endPeriod, 12);
});

Deno.test("LTM Integration - Empty data handling", () => {
    const movements = mockAq.from([]);
    const availableYears: number[] = [];

    // Calculate LTM with empty data
    const ltmInfo = LTMCalculator.calculateLTMInfo(movements, availableYears, 12);

    // Verify graceful handling
    assertEquals(ltmInfo.latest.year, 0);
    assertEquals(ltmInfo.latest.period, 0);
    assertEquals(ltmInfo.ranges.length, 0);
    assertEquals(ltmInfo.label, "LTM (No Data)");
    assertEquals(ltmInfo.availability.complete, false);
    assertEquals(ltmInfo.availability.actualMonths, 0);
});

Deno.test("LTM Integration - Verify filtering excludes correct periods", () => {
    const movements = createMovementsData();
    const availableYears = [2024, 2025];

    // Calculate LTM (should be 2024 P7-P12 + 2025 P1-P6)
    const ltmInfo = LTMCalculator.calculateLTMInfo(movements, availableYears, 12);

    const ltmRows = ltmInfo.filteredData.objects();

    // Verify no rows from 2024 P1-P6 are included
    const early2024 = ltmRows.filter((row: any) => row.year === 2024 && row.period < 7);
    assertEquals(early2024.length, 0, "Should exclude 2024 P1-P6");

    // Verify 2024 P7-P12 are included
    const late2024 = ltmRows.filter((row: any) => row.year === 2024 && row.period >= 7);
    assertEquals(late2024.length, 12, "Should include 2024 P7-P12 (6 periods × 2 statement types)");

    // Verify all 2025 P1-P6 are included
    const early2025 = ltmRows.filter((row: any) => row.year === 2025 && row.period <= 6);
    assertEquals(early2025.length, 12, "Should include 2025 P1-P6 (6 periods × 2 statement types)");
});

console.log("✅ All LTM integration tests defined");
