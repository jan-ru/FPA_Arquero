/**
 * RollupSpecBuilder - Builds Arquero rollup specifications for financial data aggregation
 *
 * Utility class for building Arquero rollup specifications.
 * Consolidates rollup spec creation logic to reduce code duplication.
 *
 * Arquero requires string expressions for rollup operations because it cannot
 * serialize JavaScript closures. This class provides a clean API for building
 * these string-based rollup specifications.
 */

import { STATEMENT_TYPES } from '../constants.ts';

export interface RollupSpec {
    [key: string]: string | ((d: any) => any);
}

export interface LTMRange {
    year: number;
    startPeriod: number;
    endPeriod: number;
}

/**
 * Builder class for creating Arquero rollup specifications
 */
export class RollupSpecBuilder {
    private spec: RollupSpec = {};

    /**
     * Add a sum aggregation for a specific column
     * @param columnName - The output column name
     * @param sourceColumn - The source column to sum
     * @returns Returns this for chaining
     */
    addSum(columnName: string, sourceColumn: string): RollupSpecBuilder {
        this.spec[columnName] = `d => op.sum(d.${sourceColumn})`;
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
        this.spec[columnName] = `(d) => op.sum(d.year === ${year} && d.period === ${period} ? d.${sourceColumn} * ${multiplier} : 0)`;
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
        this.spec[columnName] = `(d) => op.sum(d.${sourceColumn} * ${multiplier})`;
        return this;
    }

    /**
     * Add a custom rollup expression
     * @param columnName - The output column name
     * @param expression - The custom expression string
     * @returns Returns this for chaining
     */
    addCustom(columnName: string, expression: string): RollupSpecBuilder {
        this.spec[columnName] = expression;
        return this;
    }

    /**
     * Build the rollup specification
     * @returns The complete rollup specification
     */
    build(): RollupSpec {
        return this.spec;
    }

    /**
     * Reset the builder to start fresh
     * @returns Returns this for chaining
     */
    reset(): RollupSpecBuilder {
        this.spec = {};
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
        return new RollupSpecBuilder()
            .addCustom('amount_2024', `d => op.sum(d.year === ${year1} ? d.movement_amount * ${signMultiplier} : 0)`)
            .addCustom('amount_2025', `d => op.sum(d.year === ${year2} ? d.movement_amount * ${signMultiplier} : 0)`)
            .build();
    }

    /**
     * Static factory: Create an LTM mode rollup spec (12 month columns)
     * @param ranges - Array of {year, startPeriod, endPeriod} objects
     * @param signMultiplier - Sign multiplier (default: 1)
     * @param statementType - Statement type (for Income Statement LTM total)
     * @returns The rollup specification
     */
    static buildLTMMode(
        ranges: LTMRange[],
        signMultiplier: number = 1,
        statementType: string | null = null
    ): RollupSpec {
        const builder = new RollupSpecBuilder();
        let monthIndex = 1;

        // Create a column for each month in the LTM period
        for (const range of ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                builder.addConditionalSum(columnName, range.year, period, 'movement_amount', signMultiplier);
                monthIndex++;
            }
        }

        // For Income Statement: Add cumulative total column (13th column)
        if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
            builder.addSumWithMultiplier('ltm_total', 'movement_amount', signMultiplier);
        }

        return builder.build();
    }

    /**
     * Static factory: Create an LTM category totals spec (for already aggregated data)
     * @param ranges - Array of {year, startPeriod, endPeriod} objects
     * @param statementType - Statement type (for Income Statement LTM total)
     * @returns The rollup specification
     */
    static buildLTMCategoryTotals(ranges: LTMRange[], statementType: string | null = null): RollupSpec {
        const builder = new RollupSpecBuilder();
        let monthIndex = 1;

        // Sum each month column
        for (const range of ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                builder.addSum(columnName, columnName);
                monthIndex++;
            }
        }

        // For Income Statement: Add LTM total column
        if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
            builder.addSum('ltm_total', 'ltm_total');
        }

        return builder.build();
    }

    /**
     * Static factory: Create a category totals spec (normal mode)
     * @returns The rollup specification with variance calculations
     */
    static buildCategoryTotals(): RollupSpec {
        return {
            amount_2024: (d: any) => (globalThis as any).aq.op.sum(d.amount_2024),
            amount_2025: (d: any) => (globalThis as any).aq.op.sum(d.amount_2025),
            variance_amount: (d: any) => (globalThis as any).aq.op.sum(d.variance_amount),
            variance_percent: (d: any) => {
                const total1 = (globalThis as any).aq.op.sum(d.amount_2024);
                const total2 = (globalThis as any).aq.op.sum(d.amount_2025);
                // Import VarianceCalculator would create circular dependency
                // So we use inline calculation here
                return total1 !== 0 ? ((total2 - total1) / Math.abs(total1)) * 100 : 0;
            }
        };
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
    return RollupSpecBuilder.buildNormalMode(year1, year2, signMultiplier);
}

/**
 * Create a rollup spec for LTM mode (12 month columns)
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param signMultiplier - Sign multiplier (default: 1)
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export function buildLTMModeSpec(
    ranges: LTMRange[],
    signMultiplier: number = 1,
    statementType: string | null = null
): RollupSpec {
    return RollupSpecBuilder.buildLTMMode(ranges, signMultiplier, statementType);
}

/**
 * Create a rollup spec for LTM category totals
 * @param ranges - Array of {year, startPeriod, endPeriod} objects
 * @param statementType - Statement type (for Income Statement LTM total)
 * @returns The rollup specification
 */
export function buildLTMCategoryTotalsSpec(ranges: LTMRange[], statementType: string | null = null): RollupSpec {
    return RollupSpecBuilder.buildLTMCategoryTotals(ranges, statementType);
}

/**
 * Create a rollup spec for category totals (normal mode)
 * @returns The rollup specification with variance calculations
 */
export function buildCategoryTotalsSpec(): RollupSpec {
    return RollupSpecBuilder.buildCategoryTotals();
}

export default RollupSpecBuilder;
