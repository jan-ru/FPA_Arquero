/**
 * Rollup Specification Builder - Functional Programming Implementation
 *
 * Pure functions for building Arquero rollup specifications for financial data aggregation.
 * Arquero requires string expressions for rollup operations because it cannot serialize
 * JavaScript closures. This module provides a clean functional API for building these
 * string-based rollup specifications.
 *
 * @module core/specs/rollup
 */

import { STATEMENT_TYPES } from '../../constants.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Arquero rollup specification
 * Maps column names to aggregation expressions (strings or functions)
 */
export type RollupSpec = Readonly<{
    [key: string]: string | ((d: any) => any);
}>;

/**
 * LTM (Latest Twelve Months) range specification
 */
export type LTMRange = Readonly<{
    year: number;
    startPeriod: number;
    endPeriod: number;
}>;

/**
 * Rollup specification builder state (immutable)
 */
type RollupSpecState = Readonly<{
    spec: RollupSpec;
}>;

// ============================================================================
// Core Builder Functions
// ============================================================================

/**
 * Create an empty rollup specification state
 *
 * @returns Empty rollup spec state
 *
 * @example
 * const state = emptyRollupSpec();
 * // state.spec === {}
 */
export const emptyRollupSpec = (): RollupSpecState => ({
    spec: {}
});

/**
 * Add a column to a rollup specification (immutable)
 *
 * @param columnName - The output column name
 * @param expression - The aggregation expression (string or function)
 * @returns Function that takes state and returns new state with added column
 *
 * @example
 * const state = pipe(
 *     emptyRollupSpec(),
 *     addColumn('total', 'd => op.sum(d.amount)')
 * );
 */
export const addColumn = (
    columnName: string,
    expression: string | ((d: any) => any)
) => (state: RollupSpecState): RollupSpecState => ({
    spec: {
        ...state.spec,
        [columnName]: expression
    }
});

/**
 * Extract the rollup specification from state
 *
 * @param state - The rollup spec state
 * @returns The rollup specification
 *
 * @example
 * const spec = buildSpec(state);
 */
export const buildSpec = (state: RollupSpecState): RollupSpec => state.spec;

// ============================================================================
// Expression Builders
// ============================================================================

/**
 * Create a sum aggregation expression
 *
 * @param sourceColumn - The source column to sum
 * @returns Arquero sum expression string
 *
 * @example
 * const expr = sumExpression('amount');
 * // expr === 'd => op.sum(d.amount)'
 */
export const sumExpression = (sourceColumn: string): string =>
    `d => op.sum(d.${sourceColumn})`;

/**
 * Create a conditional sum expression for a specific year/period
 *
 * @param year - The year to filter by
 * @param period - The period to filter by
 * @param sourceColumn - The source column (default: 'movement_amount')
 * @param multiplier - Optional multiplier (default: 1)
 * @returns Arquero conditional sum expression string
 *
 * @example
 * const expr = conditionalSumExpression(2024, 7);
 * // expr === '(d) => op.sum(d.year === 2024 && d.period === 7 ? d.movement_amount * 1 : 0)'
 *
 * @example
 * // With sign flip
 * const expr = conditionalSumExpression(2024, 7, 'movement_amount', -1);
 */
export const conditionalSumExpression = (
    year: number,
    period: number,
    sourceColumn: string = 'movement_amount',
    multiplier: number = 1
): string =>
    `(d) => op.sum(d.year === ${year} && d.period === ${period} ? d.${sourceColumn} * ${multiplier} : 0)`;

/**
 * Create a sum with multiplier expression
 *
 * @param sourceColumn - The source column to sum
 * @param multiplier - The multiplier to apply
 * @returns Arquero sum with multiplier expression string
 *
 * @example
 * const expr = sumWithMultiplierExpression('amount', -1);
 * // expr === '(d) => op.sum(d.amount * -1)'
 */
export const sumWithMultiplierExpression = (
    sourceColumn: string,
    multiplier: number
): string =>
    `(d) => op.sum(d.${sourceColumn} * ${multiplier})`;

// ============================================================================
// Curried Builder Functions
// ============================================================================

/**
 * Add a sum aggregation column (curried)
 *
 * @param columnName - The output column name
 * @param sourceColumn - The source column to sum
 * @returns Function that takes state and returns new state
 *
 * @example
 * const state = pipe(
 *     emptyRollupSpec(),
 *     addSum('total', 'amount')
 * );
 */
export const addSum = (columnName: string, sourceColumn: string) =>
    addColumn(columnName, sumExpression(sourceColumn));

/**
 * Add a conditional sum column (curried)
 *
 * @param columnName - The output column name
 * @param year - The year to filter by
 * @param period - The period to filter by
 * @param sourceColumn - The source column (default: 'movement_amount')
 * @param multiplier - Optional multiplier (default: 1)
 * @returns Function that takes state and returns new state
 *
 * @example
 * const state = pipe(
 *     emptyRollupSpec(),
 *     addConditionalSum('month_1', 2024, 7)
 * );
 */
export const addConditionalSum = (
    columnName: string,
    year: number,
    period: number,
    sourceColumn: string = 'movement_amount',
    multiplier: number = 1
) => addColumn(columnName, conditionalSumExpression(year, period, sourceColumn, multiplier));

/**
 * Add a sum with multiplier column (curried)
 *
 * @param columnName - The output column name
 * @param sourceColumn - The source column to sum
 * @param multiplier - The multiplier to apply
 * @returns Function that takes state and returns new state
 *
 * @example
 * const state = pipe(
 *     emptyRollupSpec(),
 *     addSumWithMultiplier('total', 'amount', -1)
 * );
 */
export const addSumWithMultiplier = (
    columnName: string,
    sourceColumn: string,
    multiplier: number
) => addColumn(columnName, sumWithMultiplierExpression(sourceColumn, multiplier));

/**
 * Add a custom expression column (curried)
 *
 * @param columnName - The output column name
 * @param expression - The custom expression string or function
 * @returns Function that takes state and returns new state
 *
 * @example
 * const state = pipe(
 *     emptyRollupSpec(),
 *     addCustom('max_value', 'd => op.max(d.value)')
 * );
 */
export const addCustom = (
    columnName: string,
    expression: string | ((d: any) => any)
) => addColumn(columnName, expression);

// ============================================================================
// Composite Builders
// ============================================================================

/**
 * Build a normal mode rollup spec (2 year columns)
 *
 * Creates columns for two years with optional sign multiplier.
 *
 * @param year1 - First year
 * @param year2 - Second year
 * @param signMultiplier - Sign multiplier (default: 1)
 * @returns Rollup specification
 *
 * @example
 * const spec = buildNormalMode(2024, 2025);
 * // spec has amount_2024 and amount_2025 columns
 *
 * @example
 * // With sign flip for liability accounts
 * const spec = buildNormalMode(2024, 2025, -1);
 */
export const buildNormalMode = (
    year1: number,
    year2: number,
    signMultiplier: number = 1
): RollupSpec => {
    const state = emptyRollupSpec();
    const withYear1 = addCustom(
        'amount_2024',
        `d => op.sum(d.year === ${year1} ? d.movement_amount * ${signMultiplier} : 0)`
    )(state);
    const withYear2 = addCustom(
        'amount_2025',
        `d => op.sum(d.year === ${year2} ? d.movement_amount * ${signMultiplier} : 0)`
    )(withYear1);
    return buildSpec(withYear2);
};

/**
 * Build an LTM mode rollup spec (12 month columns)
 *
 * Creates columns for each month in the LTM period, with optional LTM total
 * for Income Statement.
 *
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param signMultiplier - Sign multiplier (default: 1)
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns Rollup specification
 *
 * @example
 * const ranges = [
 *     { year: 2024, startPeriod: 7, endPeriod: 12 },
 *     { year: 2025, startPeriod: 1, endPeriod: 6 }
 * ];
 * const spec = buildLTMMode(ranges);
 * // spec has month_1 through month_12 columns
 *
 * @example
 * // Income Statement with LTM total
 * const spec = buildLTMMode(ranges, 1, STATEMENT_TYPES.INCOME_STATEMENT);
 * // spec has month_1 through month_12 plus ltm_total
 */
export const buildLTMMode = (
    ranges: readonly LTMRange[],
    signMultiplier: number = 1,
    statementType: string | null = null
): RollupSpec => {
    let state = emptyRollupSpec();
    let monthIndex = 1;

    // Add a column for each month in the LTM period
    for (const range of ranges) {
        for (let period = range.startPeriod; period <= range.endPeriod; period++) {
            const columnName = `month_${monthIndex}`;
            state = addConditionalSum(
                columnName,
                range.year,
                period,
                'movement_amount',
                signMultiplier
            )(state);
            monthIndex++;
        }
    }

    // For Income Statement: Add cumulative total column (13th column)
    if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
        state = addSumWithMultiplier('ltm_total', 'movement_amount', signMultiplier)(state);
    }

    return buildSpec(state);
};

/**
 * Build an LTM category totals spec (for already aggregated data)
 *
 * Creates sum columns for each month in the LTM period, with optional LTM total
 * for Income Statement.
 *
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns Rollup specification
 *
 * @example
 * const ranges = [
 *     { year: 2024, startPeriod: 7, endPeriod: 12 },
 *     { year: 2025, startPeriod: 1, endPeriod: 6 }
 * ];
 * const spec = buildLTMCategoryTotals(ranges);
 * // spec sums existing month_1 through month_12 columns
 */
export const buildLTMCategoryTotals = (
    ranges: readonly LTMRange[],
    statementType: string | null = null
): RollupSpec => {
    let state = emptyRollupSpec();
    let monthIndex = 1;

    // Sum each month column
    for (const range of ranges) {
        for (let period = range.startPeriod; period <= range.endPeriod; period++) {
            const columnName = `month_${monthIndex}`;
            state = addSum(columnName, columnName)(state);
            monthIndex++;
        }
    }

    // For Income Statement: Add LTM total column
    if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
        state = addSum('ltm_total', 'ltm_total')(state);
    }

    return buildSpec(state);
};

/**
 * Build a category totals spec (normal mode)
 *
 * Creates sum columns for amount_2024, amount_2025, and calculates variance.
 * Uses actual functions (not strings) for variance calculations.
 *
 * @returns Rollup specification with variance calculations
 *
 * @example
 * const spec = buildCategoryTotals();
 * // spec has amount_2024, amount_2025, variance_amount, variance_percent
 */
export const buildCategoryTotals = (): RollupSpec => ({
    amount_2024: (d: any) => (globalThis as any).aq.op.sum(d.amount_2024),
    amount_2025: (d: any) => (globalThis as any).aq.op.sum(d.amount_2025),
    variance_amount: (d: any) => (globalThis as any).aq.op.sum(d.variance_amount),
    variance_percent: (d: any) => {
        const total1 = (globalThis as any).aq.op.sum(d.amount_2024);
        const total2 = (globalThis as any).aq.op.sum(d.amount_2025);
        // Inline variance calculation to avoid circular dependency
        return total1 !== 0 ? ((total2 - total1) / Math.abs(total1)) * 100 : 0;
    }
});

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Convenience function: Create a rollup spec for normal mode (2 year columns)
 *
 * @param year1 - First year
 * @param year2 - Second year
 * @param signMultiplier - Sign multiplier (default: 1)
 * @returns The rollup specification
 */
export const buildNormalModeSpec = buildNormalMode;

/**
 * Convenience function: Create a rollup spec for LTM mode (12 month columns)
 *
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param signMultiplier - Sign multiplier (default: 1)
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export const buildLTMModeSpec = buildLTMMode;

/**
 * Convenience function: Create a rollup spec for LTM category totals
 *
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export const buildLTMCategoryTotalsSpec = buildLTMCategoryTotals;

/**
 * Convenience function: Create a rollup spec for category totals (normal mode)
 *
 * @returns The rollup specification with variance calculations
 */
export const buildCategoryTotalsSpec = buildCategoryTotals;
