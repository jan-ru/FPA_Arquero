/**
 * VarianceCalculator - Utility for calculating variances and percentages
 * Handles variance calculations between periods
 *
 * Consolidates all variance calculation logic to ensure consistency
 * across the application and reduce code duplication.
 */

/**
 * Variance calculation result
 */
export interface VarianceResult {
    amount: number;
    percent: number;
}

/**
 * Row object with amount properties for both years
 */
export interface RowWithAmounts {
    amount_2024?: number;
    amount_2025?: number;
    [key: string]: unknown;
}

/**
 * Totals object with year1 and year2 properties
 */
export interface TotalsObject {
    year1?: number;
    year2?: number;
    [key: string]: unknown;
}

/**
 * Object with year keys as string indices
 */
export type YearAmounts = Record<string, number>;

export default class VarianceCalculator {
    /**
     * Calculate variance amount and percentage between two values
     * @param current - Current period value
     * @param prior - Prior period value
     * @returns Variance amount and percent
     */
    static calculate(current: number, prior: number): VarianceResult {
        const amount = current - prior;
        const percent = prior !== 0 ? (amount / Math.abs(prior)) * 100 : 0;
        return { amount, percent };
    }

    /**
     * Calculate only variance amount
     * @param current - Current period value
     * @param prior - Prior period value
     * @returns Variance amount
     */
    static calculateAmount(current: number, prior: number): number {
        return current - prior;
    }

    /**
     * Calculate only variance percentage
     * @param current - Current period value
     * @param prior - Prior period value
     * @returns Variance percentage
     */
    static calculatePercent(current: number, prior: number): number {
        return prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
    }

    /**
     * Calculate variance for a metric object with year keys
     * @param metric - Object with year keys (e.g., {'2024': 100, '2025': 120})
     * @param yearCurrent - Current year key
     * @param yearPrior - Prior year key
     * @returns Variance amount and percent
     */
    static calculateForMetric(
        metric: YearAmounts,
        yearCurrent: string,
        yearPrior: string
    ): VarianceResult {
        return this.calculate(metric[yearCurrent] || 0, metric[yearPrior] || 0);
    }

    /**
     * Calculate variance for a row with amount_2024 and amount_2025 properties
     * @param row - Row object with amount_2024 and amount_2025
     * @returns Variance amount and percent
     */
    static calculateForRow(row: RowWithAmounts): VarianceResult {
        return this.calculate(row.amount_2025 || 0, row.amount_2024 || 0);
    }

    /**
     * Calculate variance for two amounts with specified year keys
     * @param amounts - Object with year keys
     * @param year1 - First year key
     * @param year2 - Second year key
     * @returns Variance amount and percent
     */
    static calculateForYears(
        amounts: YearAmounts,
        year1: string,
        year2: string
    ): VarianceResult {
        const prior = amounts[year1] || 0;
        const current = amounts[year2] || 0;
        return this.calculate(current, prior);
    }

    /**
     * Calculate variance for totals object with year1/year2 properties
     * @param totals - Object with year1 and year2 properties
     * @returns Variance amount and percent
     */
    static calculateForTotals(totals: TotalsObject): VarianceResult {
        return this.calculate(totals.year2 || 0, totals.year1 || 0);
    }
}
