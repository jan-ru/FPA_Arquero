/**
 * RollupSpecBuilder.js
 *
 * Utility class for building Arquero rollup specifications.
 * Consolidates rollup spec creation logic to reduce code duplication.
 *
 * Arquero requires string expressions for rollup operations because it cannot
 * serialize JavaScript closures. This class provides a clean API for building
 * these string-based rollup specifications.
 */

import { STATEMENT_TYPES } from '../constants.js';

/**
 * Builder class for creating Arquero rollup specifications
 */
export class RollupSpecBuilder {
    constructor() {
        this.spec = {};
    }

    /**
     * Add a sum aggregation for a specific column
     * @param {string} columnName - The output column name
     * @param {string} sourceColumn - The source column to sum
     * @returns {RollupSpecBuilder} - Returns this for chaining
     */
    addSum(columnName, sourceColumn) {
        this.spec[columnName] = `d => op.sum(d.${sourceColumn})`;
        return this;
    }

    /**
     * Add a conditional sum for a specific year/period combination
     * @param {string} columnName - The output column name
     * @param {number} year - The year to filter by
     * @param {number} period - The period to filter by
     * @param {string} sourceColumn - The source column (default: 'movement_amount')
     * @param {number} multiplier - Optional multiplier (default: 1)
     * @returns {RollupSpecBuilder} - Returns this for chaining
     */
    addConditionalSum(columnName, year, period, sourceColumn = 'movement_amount', multiplier = 1) {
        this.spec[columnName] = `(d) => op.sum(d.year === ${year} && d.period === ${period} ? d.${sourceColumn} * ${multiplier} : 0)`;
        return this;
    }

    /**
     * Add a sum with multiplier (e.g., for sign flipping)
     * @param {string} columnName - The output column name
     * @param {string} sourceColumn - The source column to sum
     * @param {number} multiplier - The multiplier to apply
     * @returns {RollupSpecBuilder} - Returns this for chaining
     */
    addSumWithMultiplier(columnName, sourceColumn, multiplier) {
        this.spec[columnName] = `(d) => op.sum(d.${sourceColumn} * ${multiplier})`;
        return this;
    }

    /**
     * Add a custom rollup expression
     * @param {string} columnName - The output column name
     * @param {string} expression - The custom expression string
     * @returns {RollupSpecBuilder} - Returns this for chaining
     */
    addCustom(columnName, expression) {
        this.spec[columnName] = expression;
        return this;
    }

    /**
     * Build the rollup specification
     * @returns {Object} - The complete rollup specification
     */
    build() {
        return this.spec;
    }

    /**
     * Reset the builder to start fresh
     * @returns {RollupSpecBuilder} - Returns this for chaining
     */
    reset() {
        this.spec = {};
        return this;
    }

    /**
     * Static factory: Create a normal mode rollup spec (2 year columns)
     * @param {number} year1 - First year
     * @param {number} year2 - Second year
     * @param {number} signMultiplier - Sign multiplier (default: 1)
     * @returns {Object} - The rollup specification
     */
    static buildNormalMode(year1, year2, signMultiplier = 1) {
        return new RollupSpecBuilder()
            .addCustom('amount_2024', `d => op.sum(d.year === ${year1} ? d.movement_amount * ${signMultiplier} : 0)`)
            .addCustom('amount_2025', `d => op.sum(d.year === ${year2} ? d.movement_amount * ${signMultiplier} : 0)`)
            .build();
    }

    /**
     * Static factory: Create an LTM mode rollup spec (12 month columns)
     * @param {Array} ranges - Array of {year, startPeriod, endPeriod} objects
     * @param {number} signMultiplier - Sign multiplier (default: 1)
     * @param {string} statementType - Statement type (for Income Statement LTM total)
     * @returns {Object} - The rollup specification
     */
    static buildLTMMode(ranges, signMultiplier = 1, statementType = null) {
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
     * @param {Array} ranges - Array of {year, startPeriod, endPeriod} objects
     * @param {string} statementType - Statement type (for Income Statement LTM total)
     * @returns {Object} - The rollup specification
     */
    static buildLTMCategoryTotals(ranges, statementType = null) {
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
     * @returns {Object} - The rollup specification with variance calculations
     */
    static buildCategoryTotals() {
        return {
            amount_2024: d => aq.op.sum(d.amount_2024),
            amount_2025: d => aq.op.sum(d.amount_2025),
            variance_amount: d => aq.op.sum(d.variance_amount),
            variance_percent: d => {
                const total1 = aq.op.sum(d.amount_2024);
                const total2 = aq.op.sum(d.amount_2025);
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
 * @param {number} year1 - First year
 * @param {number} year2 - Second year
 * @param {number} signMultiplier - Sign multiplier (default: 1)
 * @returns {Object} - The rollup specification
 */
export function buildNormalModeSpec(year1, year2, signMultiplier = 1) {
    return RollupSpecBuilder.buildNormalMode(year1, year2, signMultiplier);
}

/**
 * Create a rollup spec for LTM mode (12 month columns)
 * @param {Array} ranges - Array of {year, startPeriod, endPeriod} objects
 * @param {number} signMultiplier - Sign multiplier (default: 1)
 * @param {string} statementType - Statement type (for Income Statement LTM total)
 * @returns {Object} - The rollup specification
 */
export function buildLTMModeSpec(ranges, signMultiplier = 1, statementType = null) {
    return RollupSpecBuilder.buildLTMMode(ranges, signMultiplier, statementType);
}

/**
 * Create a rollup spec for LTM category totals
 * @param {Array} ranges - Array of {year, startPeriod, endPeriod} objects
 * @param {string} statementType - Statement type (for Income Statement LTM total)
 * @returns {Object} - The rollup specification
 */
export function buildLTMCategoryTotalsSpec(ranges, statementType = null) {
    return RollupSpecBuilder.buildLTMCategoryTotals(ranges, statementType);
}

/**
 * Create a rollup spec for category totals (normal mode)
 * @returns {Object} - The rollup specification with variance calculations
 */
export function buildCategoryTotalsSpec() {
    return RollupSpecBuilder.buildCategoryTotals();
}

export default RollupSpecBuilder;
