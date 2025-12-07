/**
 * RollupSpecBuilder Compatibility Wrapper
 *
 * Provides backward compatibility for the OOP RollupSpecBuilder API
 * while delegating to the functional implementation.
 *
 * This wrapper maintains the original class-based API to avoid breaking
 * existing code during the migration to functional programming.
 */

import {
    buildNormalMode,
    buildLTMMode,
    buildLTMCategoryTotals,
    buildCategoryTotals,
    emptyRollupSpec,
    addSum,
    addConditionalSum,
    addSumWithMultiplier,
    addCustom,
    buildSpec,
    type RollupSpec,
    type LTMRange
} from '../core/specs/rollup.ts';

/**
 * Compatibility wrapper for RollupSpecBuilder
 *
 * Maintains the original OOP API while using the functional implementation.
 */
export class RollupSpecBuilder {
    private state: ReturnType<typeof emptyRollupSpec>;

    constructor() {
        this.state = emptyRollupSpec();
    }

    /**
     * Add a sum aggregation for a specific column
     * @param columnName - The output column name
     * @param sourceColumn - The source column to sum
     * @returns Returns this for chaining
     */
    addSum(columnName: string, sourceColumn: string): RollupSpecBuilder {
        this.state = addSum(columnName, sourceColumn)(this.state);
        return this;
    }

    /**
     * Add a conditional sum for a specific year/period combination
     * @param columnName - The output column name
     * @param year - The year to filter by
     * @param period - The period to filter by
     * @param sourceColumn - The source column (default: 'movement_amount')
     * @param multiplier - Optional multiplier (default: 1)
     * @returns Returns this for chaining
     */
    addConditionalSum(
        columnName: string,
        year: number,
        period: number,
        sourceColumn: string = 'movement_amount',
        multiplier: number = 1
    ): RollupSpecBuilder {
        this.state = addConditionalSum(columnName, year, period, sourceColumn, multiplier)(this.state);
        return this;
    }

    /**
     * Add a sum with multiplier (e.g., for sign flipping)
     * @param columnName - The output column name
     * @param sourceColumn - The source column to sum
     * @param multiplier - The multiplier to apply
     * @returns Returns this for chaining
     */
    addSumWithMultiplier(columnName: string, sourceColumn: string, multiplier: number): RollupSpecBuilder {
        this.state = addSumWithMultiplier(columnName, sourceColumn, multiplier)(this.state);
        return this;
    }

    /**
     * Add a custom rollup expression
     * @param columnName - The output column name
     * @param expression - The custom expression string
     * @returns Returns this for chaining
     */
    addCustom(columnName: string, expression: string): RollupSpecBuilder {
        this.state = addCustom(columnName, expression)(this.state);
        return this;
    }

    /**
     * Build the rollup specification
     * @returns The complete rollup specification
     */
    build(): RollupSpec {
        return buildSpec(this.state);
    }

    /**
     * Reset the builder to start fresh
     * @returns Returns this for chaining
     */
    reset(): RollupSpecBuilder {
        this.state = emptyRollupSpec();
        return this;
    }

    /**
     * Static factory: Create a normal mode rollup spec (2 year columns)
     * @param year1 - First year
     * @param year2 - Second year
     * @param signMultiplier - Sign multiplier (default: 1)
     * @returns The rollup specification
     */
    static buildNormalMode(year1: number, year2: number, signMultiplier: number = 1): RollupSpec {
        return buildNormalMode(year1, year2, signMultiplier);
    }

    /**
     * Static factory: Create an LTM mode rollup spec (12 month columns)
     * @param ranges - Array of {year, startPeriod, endPeriod} objects
     * @param signMultiplier - Sign multiplier (default: 1)
     * @param statementType - Statement type (for Income Statement LTM total)
     * @returns The rollup specification
     */
    static buildLTMMode(
        ranges: readonly LTMRange[],
        signMultiplier: number = 1,
        statementType: string | null = null
    ): RollupSpec {
        return buildLTMMode(ranges, signMultiplier, statementType);
    }

    /**
     * Static factory: Create an LTM category totals spec (for already aggregated data)
     * @param ranges - Array of {year, startPeriod, endPeriod} objects
     * @param statementType - Statement type (for Income Statement LTM total)
     * @returns The rollup specification
     */
    static buildLTMCategoryTotals(ranges: readonly LTMRange[], statementType: string | null = null): RollupSpec {
        return buildLTMCategoryTotals(ranges, statementType);
    }

    /**
     * Static factory: Create a category totals spec (normal mode)
     * @returns The rollup specification with variance calculations
     */
    static buildCategoryTotals(): RollupSpec {
        return buildCategoryTotals();
    }
}

/**
 * Convenience functions for common use cases
 */

/**
 * Create a rollup spec for normal mode (2 year columns)
 * @param year1 - First year
 * @param year2 - Second year
 * @param signMultiplier - Sign multiplier (default: 1)
 * @returns The rollup specification
 */
export function buildNormalModeSpec(year1: number, year2: number, signMultiplier: number = 1): RollupSpec {
    return buildNormalMode(year1, year2, signMultiplier);
}

/**
 * Create a rollup spec for LTM mode (12 month columns)
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param signMultiplier - Sign multiplier (default: 1)
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export function buildLTMModeSpec(
    ranges: readonly LTMRange[],
    signMultiplier: number = 1,
    statementType: string | null = null
): RollupSpec {
    return buildLTMMode(ranges, signMultiplier, statementType);
}

/**
 * Create a rollup spec for LTM category totals
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export function buildLTMCategoryTotalsSpec(ranges: readonly LTMRange[], statementType: string | null = null): RollupSpec {
    return buildLTMCategoryTotals(ranges, statementType);
}

/**
 * Create a rollup spec for category totals (normal mode)
 * @returns The rollup specification with variance calculations
 */
export function buildCategoryTotalsSpec(): RollupSpec {
    return buildCategoryTotals();
}

export default RollupSpecBuilder;

// Re-export types for convenience
export type { RollupSpec, LTMRange };
