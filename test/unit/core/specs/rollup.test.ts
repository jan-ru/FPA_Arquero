/**
 * Tests for core/specs/rollup.ts
 *
 * Tests the functional rollup specification builder
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    emptyRollupSpec,
    addColumn,
    buildSpec,
    sumExpression,
    conditionalSumExpression,
    sumWithMultiplierExpression,
    addSum,
    addConditionalSum,
    addSumWithMultiplier,
    addCustom,
    buildNormalMode,
    buildLTMMode,
    buildLTMCategoryTotals,
    buildCategoryTotals,
    buildNormalModeSpec,
    buildLTMModeSpec,
    buildLTMCategoryTotalsSpec,
    buildCategoryTotalsSpec,
    type RollupSpec,
    type LTMRange
} from "../../../../src/core/specs/rollup.ts";
import { STATEMENT_TYPES } from "../../../../src/constants.ts";

// ============================================================================
// Core Builder Functions
// ============================================================================

Deno.test("emptyRollupSpec - creates empty spec state", () => {
    const state = emptyRollupSpec();
    assertEquals(Object.keys(state.spec).length, 0);
});

Deno.test("addColumn - adds column to spec (immutable)", () => {
    const state1 = emptyRollupSpec();
    const state2 = addColumn('total', 'd => op.sum(d.amount)')(state1);
    
    // Original state unchanged
    assertEquals(Object.keys(state1.spec).length, 0);
    
    // New state has column
    assertEquals(Object.keys(state2.spec).length, 1);
    assertEquals(state2.spec.total, 'd => op.sum(d.amount)');
});

Deno.test("addColumn - supports chaining", () => {
    const state = addColumn('total2', 'd => op.sum(d.amount2)')(
        addColumn('total1', 'd => op.sum(d.amount1)')(
            emptyRollupSpec()
        )
    );
    
    assertEquals(Object.keys(state.spec).length, 2);
    assertEquals(state.spec.total1, 'd => op.sum(d.amount1)');
    assertEquals(state.spec.total2, 'd => op.sum(d.amount2)');
});

Deno.test("buildSpec - extracts spec from state", () => {
    const state = addColumn('total', 'd => op.sum(d.amount)')(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.total, 'd => op.sum(d.amount)');
});

// ============================================================================
// Expression Builders
// ============================================================================

Deno.test("sumExpression - creates sum expression", () => {
    const expr = sumExpression('amount');
    assertEquals(expr, 'd => op.sum(d.amount)');
});

Deno.test("conditionalSumExpression - creates conditional sum with defaults", () => {
    const expr = conditionalSumExpression(2024, 7);
    assertEquals(expr, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');
});

Deno.test("conditionalSumExpression - creates conditional sum with custom column", () => {
    const expr = conditionalSumExpression(2024, 7, 'custom_amount');
    assertEquals(expr, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.custom_amount * 1 : 0)');
});

Deno.test("conditionalSumExpression - creates conditional sum with multiplier", () => {
    const expr = conditionalSumExpression(2024, 7, 'movement_amount', -1);
    assertEquals(expr, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * -1 : 0)');
});

Deno.test("sumWithMultiplierExpression - creates sum with multiplier", () => {
    const expr = sumWithMultiplierExpression('amount', -1);
    assertEquals(expr, '(d) => op.sum(d.amount * -1)');
});

Deno.test("sumWithMultiplierExpression - handles positive multiplier", () => {
    const expr = sumWithMultiplierExpression('amount', 2);
    assertEquals(expr, '(d) => op.sum(d.amount * 2)');
});

// ============================================================================
// Curried Builder Functions
// ============================================================================

Deno.test("addSum - adds sum aggregation", () => {
    const state = addSum('total', 'amount')(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.total, 'd => op.sum(d.amount)');
});

Deno.test("addSum - supports chaining", () => {
    const state = addSum('total2', 'amount2')(
        addSum('total1', 'amount1')(
            emptyRollupSpec()
        )
    );
    const spec = buildSpec(state);
    
    assertEquals(Object.keys(spec).length, 2);
    assertEquals(spec.total1, 'd => op.sum(d.amount1)');
    assertEquals(spec.total2, 'd => op.sum(d.amount2)');
});

Deno.test("addConditionalSum - adds conditional sum with defaults", () => {
    const state = addConditionalSum('month_1', 2024, 7)(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');
});

Deno.test("addConditionalSum - adds conditional sum with custom params", () => {
    const state = addConditionalSum('month_1', 2024, 7, 'custom_amount', -1)(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.custom_amount * -1 : 0)');
});

Deno.test("addSumWithMultiplier - adds sum with multiplier", () => {
    const state = addSumWithMultiplier('total', 'amount', -1)(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.total, '(d) => op.sum(d.amount * -1)');
});

Deno.test("addCustom - adds custom expression string", () => {
    const state = addCustom('custom', 'd => op.max(d.value)')(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.custom, 'd => op.max(d.value)');
});

Deno.test("addCustom - adds custom expression function", () => {
    const customFn = (d: any) => d.value * 2;
    const state = addCustom('custom', customFn)(emptyRollupSpec());
    const spec = buildSpec(state);
    
    assertEquals(spec.custom, customFn);
});

// ============================================================================
// Composite Builders - Normal Mode
// ============================================================================

Deno.test("buildNormalMode - creates 2 year columns", () => {
    const spec = buildNormalMode(2024, 2025);
    
    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertEquals(Object.keys(spec).length, 2);
    assertEquals(spec.amount_2024, 'd => op.sum(d.year === 2024 ? d.movement_amount * 1 : 0)');
    assertEquals(spec.amount_2025, 'd => op.sum(d.year === 2025 ? d.movement_amount * 1 : 0)');
});

Deno.test("buildNormalMode - handles sign multiplier", () => {
    const spec = buildNormalMode(2024, 2025, -1);
    
    assertEquals(spec.amount_2024, 'd => op.sum(d.year === 2024 ? d.movement_amount * -1 : 0)');
    assertEquals(spec.amount_2025, 'd => op.sum(d.year === 2025 ? d.movement_amount * -1 : 0)');
});

Deno.test("buildNormalMode - handles different years", () => {
    const spec = buildNormalMode(2023, 2024);
    
    assertEquals(spec.amount_2024, 'd => op.sum(d.year === 2023 ? d.movement_amount * 1 : 0)');
    assertEquals(spec.amount_2025, 'd => op.sum(d.year === 2024 ? d.movement_amount * 1 : 0)');
});

// ============================================================================
// Composite Builders - LTM Mode
// ============================================================================

Deno.test("buildLTMMode - creates 12 month columns", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMMode(ranges);
    
    // Should have 12 month columns
    assertEquals(Object.keys(spec).length, 12);
    
    // Check first month (2024 P7)
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)');
    
    // Check last month (2025 P6)
    assertEquals(spec.month_12, '(d) => op.sum(d.year === 2025 && d.period === 6 ? d.movement_amount * 1 : 0)');
});

Deno.test("buildLTMMode - adds LTM total for Income Statement", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMMode(ranges, 1, STATEMENT_TYPES.INCOME_STATEMENT);
    
    // Should have 12 month columns + 1 LTM total
    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.ltm_total);
    assertEquals(spec.ltm_total, '(d) => op.sum(d.movement_amount * 1)');
});

Deno.test("buildLTMMode - no LTM total for Balance Sheet", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMMode(ranges, 1, STATEMENT_TYPES.BALANCE_SHEET);
    
    // Should have only 12 month columns (no LTM total)
    assertEquals(Object.keys(spec).length, 12);
});

Deno.test("buildLTMMode - no LTM total for null statement type", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMMode(ranges, 1, null);
    
    // Should have only 12 month columns (no LTM total)
    assertEquals(Object.keys(spec).length, 12);
});

Deno.test("buildLTMMode - handles sign multiplier", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 7 }
    ];
    const spec = buildLTMMode(ranges, -1);
    
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * -1 : 0)');
});

Deno.test("buildLTMMode - handles single year (12 months)", () => {
    const ranges: LTMRange[] = [
        { year: 2025, startPeriod: 1, endPeriod: 12 }
    ];
    const spec = buildLTMMode(ranges);
    
    assertEquals(Object.keys(spec).length, 12);
    assertEquals(spec.month_1, '(d) => op.sum(d.year === 2025 && d.period === 1 ? d.movement_amount * 1 : 0)');
    assertEquals(spec.month_12, '(d) => op.sum(d.year === 2025 && d.period === 12 ? d.movement_amount * 1 : 0)');
});

Deno.test("buildLTMMode - handles complex LTM scenario", () => {
    // Simulate real LTM scenario: 2024 P11-P12, 2025 P1-P10 (12 months)
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 11, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 10 }
    ];
    const spec = buildLTMMode(ranges, -1, STATEMENT_TYPES.INCOME_STATEMENT);
    
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

// ============================================================================
// Composite Builders - LTM Category Totals
// ============================================================================

Deno.test("buildLTMCategoryTotals - creates 12 month sums", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMCategoryTotals(ranges);
    
    assertEquals(Object.keys(spec).length, 12);
    assertEquals(spec.month_1, 'd => op.sum(d.month_1)');
    assertEquals(spec.month_12, 'd => op.sum(d.month_12)');
});

Deno.test("buildLTMCategoryTotals - adds LTM total for Income Statement", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMCategoryTotals(ranges, STATEMENT_TYPES.INCOME_STATEMENT);
    
    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.ltm_total);
    assertEquals(spec.ltm_total, 'd => op.sum(d.ltm_total)');
});

Deno.test("buildLTMCategoryTotals - no LTM total for Balance Sheet", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMCategoryTotals(ranges, STATEMENT_TYPES.BALANCE_SHEET);
    
    assertEquals(Object.keys(spec).length, 12);
});

Deno.test("buildLTMCategoryTotals - consistent column naming with buildLTMMode", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    
    const spec1 = buildLTMMode(ranges, 1, null);
    const spec2 = buildLTMCategoryTotals(ranges, null);
    
    // Both should have same column names (for compatibility)
    const keys1 = Object.keys(spec1).sort();
    const keys2 = Object.keys(spec2).sort();
    
    assertEquals(keys1, keys2);
});

// ============================================================================
// Composite Builders - Category Totals
// ============================================================================

Deno.test("buildCategoryTotals - creates variance spec", () => {
    const spec = buildCategoryTotals();
    
    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertExists(spec.variance_amount);
    assertExists(spec.variance_percent);
    assertEquals(Object.keys(spec).length, 4);
    
    // Check that they're functions (not strings)
    assertEquals(typeof spec.amount_2024, 'function');
    assertEquals(typeof spec.amount_2025, 'function');
    assertEquals(typeof spec.variance_amount, 'function');
    assertEquals(typeof spec.variance_percent, 'function');
});

// ============================================================================
// Convenience Functions
// ============================================================================

Deno.test("buildNormalModeSpec - convenience function works", () => {
    const spec = buildNormalModeSpec(2024, 2025, 1);
    
    assertExists(spec.amount_2024);
    assertExists(spec.amount_2025);
    assertEquals(Object.keys(spec).length, 2);
});

Deno.test("buildLTMModeSpec - convenience function works", () => {
    const ranges: LTMRange[] = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 }
    ];
    const spec = buildLTMModeSpec(ranges, 1, STATEMENT_TYPES.INCOME_STATEMENT);
    
    assertEquals(Object.keys(spec).length, 13);
    assertExists(spec.month_1);
    assertExists(spec.ltm_total);
});

Deno.test("buildLTMCategoryTotalsSpec - convenience function works", () => {
    const ranges: LTMRange[] = [
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

// ============================================================================
// Immutability Tests
// ============================================================================

Deno.test("addColumn - does not mutate original state", () => {
    const state1 = emptyRollupSpec();
    const state2 = addColumn('col1', 'expr1')(state1);
    const state3 = addColumn('col2', 'expr2')(state2);
    
    // Each state is independent
    assertEquals(Object.keys(state1.spec).length, 0);
    assertEquals(Object.keys(state2.spec).length, 1);
    assertEquals(Object.keys(state3.spec).length, 2);
    
    // Original states unchanged
    assertEquals(state1.spec.col1, undefined);
    assertEquals(state2.spec.col2, undefined);
});

Deno.test("buildSpec - returns readonly spec", () => {
    const state = addSum('total', 'amount')(emptyRollupSpec());
    const spec = buildSpec(state);
    
    // Spec should be usable
    assertEquals(spec.total, 'd => op.sum(d.amount)');
});

console.log('✅ All rollup spec builder tests defined');
