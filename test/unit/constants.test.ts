#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: Constants (YEAR_CONFIG)
 * Tests for year configuration helper methods
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { YEAR_CONFIG, APP_CONFIG } from "../../src/constants.js";

Deno.test("YEAR_CONFIG.years - returns years from APP_CONFIG", () => {
    const years = YEAR_CONFIG.years;
    assertEquals(years, APP_CONFIG.YEARS);
    assertEquals(years.length, 2);
    assertEquals(years[0], '2024');
    assertEquals(years[1], '2025');
});

Deno.test("YEAR_CONFIG.yearCount - returns number of years", () => {
    const count = YEAR_CONFIG.yearCount;
    assertEquals(count, 2);
    assertEquals(count, APP_CONFIG.YEARS.length);
});

Deno.test("YEAR_CONFIG.getYear - returns year by index", () => {
    assertEquals(YEAR_CONFIG.getYear(0), '2024');
    assertEquals(YEAR_CONFIG.getYear(1), '2025');
});

Deno.test("YEAR_CONFIG.getAmountColumn - returns column name for year", () => {
    assertEquals(YEAR_CONFIG.getAmountColumn('2024'), 'amount_2024');
    assertEquals(YEAR_CONFIG.getAmountColumn('2025'), 'amount_2025');
    assertEquals(YEAR_CONFIG.getAmountColumn('2026'), 'amount_2026');
});

Deno.test("YEAR_CONFIG.amountColumns - returns all amount column names", () => {
    const columns = YEAR_CONFIG.amountColumns;
    assertEquals(columns.length, 2);
    assertEquals(columns[0], 'amount_2024');
    assertEquals(columns[1], 'amount_2025');
});

Deno.test("YEAR_CONFIG.yearPairs - returns year pairs for variance", () => {
    const pairs = YEAR_CONFIG.yearPairs;
    assertEquals(pairs.length, 1); // 2 years = 1 pair

    const pair = pairs[0];
    assertEquals(pair.prior, '2024');
    assertEquals(pair.current, '2025');
    assertEquals(pair.priorColumn, 'amount_2024');
    assertEquals(pair.currentColumn, 'amount_2025');
    assertEquals(pair.varianceColumn, 'variance_2024_2025');
});

Deno.test("YEAR_CONFIG.yearPairs - handles multiple years", () => {
    // This test assumes the structure works correctly even with 2 years
    // If we had 3 years, we'd get 2 pairs
    const pairs = YEAR_CONFIG.yearPairs;

    // Verify each pair has the correct structure
    pairs.forEach((pair, index) => {
        assertEquals(typeof pair.prior, 'string');
        assertEquals(typeof pair.current, 'string');
        assertEquals(typeof pair.priorColumn, 'string');
        assertEquals(typeof pair.currentColumn, 'string');
        assertEquals(typeof pair.varianceColumn, 'string');

        // Verify column names match the pattern
        assertEquals(pair.priorColumn, `amount_${pair.prior}`);
        assertEquals(pair.currentColumn, `amount_${pair.current}`);
        assertEquals(pair.varianceColumn, `variance_${pair.prior}_${pair.current}`);
    });
});

Deno.test("YEAR_CONFIG.getDefaultPeriod - returns default period for year", () => {
    assertEquals(YEAR_CONFIG.getDefaultPeriod('2024'), '2024-all');
    assertEquals(YEAR_CONFIG.getDefaultPeriod('2025'), '2025-all');
    assertEquals(YEAR_CONFIG.getDefaultPeriod('2026'), '2026-all');
});

Deno.test("YEAR_CONFIG - all getters work consistently", () => {
    // Verify that the getters produce consistent results
    const years = YEAR_CONFIG.years;
    const yearCount = YEAR_CONFIG.yearCount;
    const amountColumns = YEAR_CONFIG.amountColumns;

    assertEquals(years.length, yearCount);
    assertEquals(amountColumns.length, yearCount);

    years.forEach((year, index) => {
        assertEquals(year, YEAR_CONFIG.getYear(index));
        assertEquals(YEAR_CONFIG.getAmountColumn(year), amountColumns[index]);
    });
});
