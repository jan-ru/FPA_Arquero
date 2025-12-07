/**
 * Tests for RollupSpecBuilder.ts
 *
 * Tests the utility class for building Arquero rollup specifications
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    RollupSpecBuilder,
    buildNormalModeSpec,
    buildLTMModeSpec,
    buildLTMCategoryTotalsSpec,
    buildCategoryTotalsSpec
} from "../../../src/utils/RollupSpecBuilder.ts";
import { STATEMENT_TYPES } from "../../../src/constants.ts";

Deno.test("RollupSpecBuilder - constructor creates empty spec", () => {
    const builder = new RollupSpecBuilder();
    const spec = builder.build();
    assertEquals(Object.keys(spec).length, 0);
});

Deno.test("RollupSpecBuilder.addSum - adds sum aggregation", () => {
    const builder = new RollupSpecBuilder();
    builder.addSum('total', 'amount');
    const spec = builder.build();

    assertEquals(spec.total, 'd => op.sum(d.amount)');
});

Deno.test("RollupSpecBuilder.addSum - supports chaining", () => {
    const builder = new RollupSpecBuilder();
    const result = builder.addSum('total1', 'amount1').addSum('total2', 'amount2');
    const spec = result.build();

    assertEquals(Object.keys(spec).length, 2);
    assertEquals(spec.total1, 'd => op.sum(d.amount1)');
    assertEquals(spec.total2, 'd => op.sum(d.amount2)');
});

Deno.test("RollupSpecBuilder.addConditionalSum - adds conditional sum", () => {
    const builder = new RollupSpecBuilder();
    builder.addConditionalSum('month_1', 2024, 7, 'movement_amount', 1);
    const spec = builder.build();

    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');
});

Deno.test("RollupSpecBuilder.addConditionalSum - uses default parameters", () => {
    const builder = new RollupSpecBuilder();
    builder.addConditionalSum('month_1', 2024, 7);
    const spec = builder.build();

    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');
});

Deno.test("RollupSpecBuilder.addConditionalSum - handles sign multiplier", () => {
    const builder = new RollupSpecBuilder();
    builder.addConditionalSum('month_1', 2024, 7, 'movement_amount', -1);
    const spec = builder.build();

    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * -1 : 0)');
});

Deno.test("RollupSpecBuilder.addSumWithMultiplier - adds sum with multiplier", () => {
    const builder = new RollupSpecBuilder();
    builder.addSumWithMultiplier('total', 'amount', -1);
    const spec = builder.build();

    assertEquals(spec.total, '(d) => op.sum(d.amount * -1)');
});

Deno.test("RollupSpecBuilder.addCustom - adds custom expression", () => {
    const builder = new RollupSpecBuilder();
    builder.addCustom('custom', 'd => op.max(d.value)');
    const spec = builder.build();

    assertEquals(spec.custom, 'd => op.max(d.value)');
});

Deno.test("RollupSpecBuilder.reset - clears spec", () => {
    const builder = new RollupSpecBuilder();
    builder.addSum('total1', 'amount1');
    builder.reset();
    builder.addSum('total2', 'amount2');
    const spec = builder.build();

    assertEquals(Object.keys(spec).length, 1);
    assertEquals(spec.total2, 'd => op.sum(d.amount2)');
});

Deno.test("RollupSpecBuilder.buildNormalMode - creates 2 year columns", () => {
    const spec = RollupSpecBuilder.buildNormalMode(2024, 2025, 1);

    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertEquals(Object.keys(spec).length, 2);
    assertEquals(spec.amount_2024, 'd => op.sum(d.year === 2024 ? d.movement_amount * 1 : 0)');
    assertEquals(spec.amount_2025, 'd => op.sum(d.year === 2025 ? d.movement_amount * 1 : 0)');
});

Deno.test("RollupSpecBuilder.buildNormalMode - handles sign multiplier", () => {
    const spec = RollupSpecBuilder.buildNormalMode(2024, 2025, -1);

    assertEquals(spec.amount_2024, 'd => op.sum(d.year === 2024 ? d.movement_amount * -1 : 0)');
    assertEquals(spec.amount_2025, 'd => op.sum(d.year === 2025 ? d.movement_amount * -1 : 0)');
});

Deno.test("RollupSpecBuilder.buildLTMMode - creates 12 month columns", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = RollupSpecBuilder.buildLTMMode(ranges, 1, null);

    // Should have 12 month columns
    assertEquals(Object.keys(spec).length, 12);

    // Check first month
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');

    // Check last month (month 12)
    assertEquals(spec.month_12, '(d) => op.sum(d.year === 2025 && d.period === 6 ? d.movement_amount * 1 : 0)');
});

Deno.test("RollupSpecBuilder.buildLTMMode - adds LTM total for Income Statement", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = RollupSpecBuilder.buildLTMMode(ranges, 1, STATEMENT_TYPES.INCOME_STATEMENT);

    // Should have 12 month columns + 1 LTM total
    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.ltm_total);
    assertEquals(spec.ltm_total, '(d) => op.sum(d.movement_amount * 1)');
});

Deno.test("RollupSpecBuilder.buildLTMMode - no LTM total for Balance Sheet", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = RollupSpecBuilder.buildLTMMode(ranges, 1, STATEMENT_TYPES.BALANCE_SHEET);

    // Should have only 12 month columns (no LTM total)
    assertEquals(Object.keys(spec).length, 12);
});

Deno.test("RollupSpecBuilder.buildLTMMode - handles sign multiplier", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 7 }
    ];
    const spec = RollupSpecBuilder.buildLTMMode(ranges, -1, null);

    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * -1 : 0)');
});

Deno.test("RollupSpecBuilder.buildLTMMode - handles single year (12 months)", () => {
    const ranges = [
        { year: 2025, startPeriod: 1, endPeriod: 12 }
    ];
    const spec = RollupSpecBuilder.buildLTMMode(ranges, 1, null);

    assertEquals(Object.keys(spec).length, 12);
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2025 && d.period === 1 ? d.movement_amount * 1 : 0)');
    assertEquals(spec.month_12, '(d) => op.sum(d.year === 2025 && d.period === 12 ? d.movement_amount * 1 : 0)');
});

Deno.test("RollupSpecBuilder.buildLTMCategoryTotals - creates 12 month sums", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = RollupSpecBuilder.buildLTMCategoryTotals(ranges, null);

    assertEquals(Object.keys(spec).length, 12);
    assertEquals(spec.month_1, 'd => op.sum(d.month_1)');
    assertEquals(spec.month_12, 'd => op.sum(d.month_12)');
});

Deno.test("RollupSpecBuilder.buildLTMCategoryTotals - adds LTM total for Income Statement", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = RollupSpecBuilder.buildLTMCategoryTotals(ranges, STATEMENT_TYPES.INCOME_STATEMENT);

    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.ltm_total);
    assertEquals(spec.ltm_total, 'd => op.sum(d.ltm_total)');
});

Deno.test("RollupSpecBuilder.buildCategoryTotals - creates variance spec", () => {
    const spec = RollupSpecBuilder.buildCategoryTotals();

    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertExists(spec.variance_amount);
    assertExists(spec.variance_percent);
    assertEquals(Object.keys(spec).length, 4);

    // Check that they're functions (not strings)
    assertEquals(typeof spec.amount_2024, 'function');
    assertEquals(typeof spec.variance_percent, 'function');
});

// Convenience function tests

Deno.test("buildNormalModeSpec - convenience function works", () => {
    const spec = buildNormalModeSpec(2024, 2025, 1);

    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertEquals(Object.keys(spec).length, 2);
});

Deno.test("buildLTMModeSpec - convenience function works", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMModeSpec(ranges, 1, STATEMENT_TYPES.INCOME_STATEMENT);

    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.month_1);
    assertExists(spec.ltm_total);
});

Deno.test("buildLTMCategoryTotalsSpec - convenience function works", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMCategoryTotalsSpec(ranges, null);

    assertEquals(Object.keys(spec).length, 12);
    assertEquals(spec.month_1, 'd => op.sum(d.month_1)');
});

Deno.test("buildCategoryTotalsSpec - convenience function works", () => {
    const spec = buildCategoryTotalsSpec();

    assertExists(spec.amount_2024);
    assertExists(spec.variance_percent);
    assertEquals(typeof spec.variance_percent, 'function');
});

// Integration tests

Deno.test("RollupSpecBuilder - complex LTM scenario", () => {
    // Simulate real LTM scenario: 2024 P11-P12, 2025 P1-P10 (12 months)
    const ranges = [
        { year: 2024, startPeriod: 11, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 10 }
    ];
    const spec = buildLTMModeSpec(ranges, -1, STATEMENT_TYPES.INCOME_STATEMENT);

    // Should have 12 months + LTM total
    assertEquals(Object.keys(spec).length, 13);

    // Check month 1 (2024 P11)
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 11 ? d.movement_amount * -1 : 0)');

    // Check month 2 (2024 P12)
    assertEquals(spec.month_2, '(d) => op.sum(d.year === 2024 && d.period === 12 ? d.movement_amount * -1 : 0)');

    // Check month 3 (2025 P1)
    assertEquals(spec.month_3, '(d) => op.sum(d.year === 2025 && d.period === 1 ? d.movement_amount * -1 : 0)');

    // Check month 12 (2025 P10)
    assertEquals(spec.month_12, '(d) => op.sum(d.year === 2025 && d.period === 10 ? d.movement_amount * -1 : 0)');

    // Check LTM total
    assertEquals(spec.ltm_total, '(d) => op.sum(d.movement_amount * -1)');
});

Deno.test("RollupSpecBuilder - ensures consistent column naming", () => {
    const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];

    const spec1 = buildLTMModeSpec(ranges, 1, null);
    const spec2 = buildLTMCategoryTotalsSpec(ranges, null);

    // Both should have same column names (for compatibility)
    const keys1 = Object.keys(spec1).sort();
    const keys2 = Object.keys(spec2).sort();

    assertEquals(keys1, keys2);
});

console.log('✅ All RollupSpecBuilder tests defined');
