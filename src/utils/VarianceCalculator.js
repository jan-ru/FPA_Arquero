/**
 * VarianceCalculator - Utility for calculating variances and percentages
 * Handles variance calculations between periods
 *
 * Consolidates all variance calculation logic to ensure consistency
 * across the application and reduce code duplication.
 */

export default class VarianceCalculator {
    /**
     * Calculate variance amount and percentage between two values
     * @param {number} current - Current period value
     * @param {number} prior - Prior period value
     * @returns {{amount: number, percent: number}} Variance amount and percent
     */
    static calculate(current, prior) {
        const amount = current - prior;
        const percent = prior !== 0 ? (amount / Math.abs(prior)) * 100 : 0;
        return { amount, percent };
    }

    /**
     * Calculate only variance amount
     * @param {number} current - Current period value
     * @param {number} prior - Prior period value
     * @returns {number} Variance amount
     */
    static calculateAmount(current, prior) {
        return current - prior;
    }

    /**
     * Calculate only variance percentage
     * @param {number} current - Current period value
     * @param {number} prior - Prior period value
     * @returns {number} Variance percentage
     */
    static calculatePercent(current, prior) {
        return prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
    }

    /**
     * Calculate variance for a metric object with year keys
     * @param {Object} metric - Object with year keys (e.g., {'2024': 100, '2025': 120})
     * @param {string} yearCurrent - Current year key
     * @param {string} yearPrior - Prior year key
     * @returns {{amount: number, percent: number}} Variance amount and percent
     */
    static calculateForMetric(metric, yearCurrent, yearPrior) {
        return this.calculate(metric[yearCurrent] || 0, metric[yearPrior] || 0);
    }

    /**
     * Calculate variance for a row with amount_2024 and amount_2025 properties
     * @param {Object} row - Row object with amount_2024 and amount_2025
     * @returns {{amount: number, percent: number}} Variance amount and percent
     */
    static calculateForRow(row) {
        return this.calculate(row.amount_2025 || 0, row.amount_2024 || 0);
    }

    /**
     * Calculate variance for two amounts with specified year keys
     * @param {Object} amounts - Object with year keys (e.g., {year1: '2024', year2: '2025', ...})
     * @param {string} year1 - First year key
     * @param {string} year2 - Second year key
     * @returns {{amount: number, percent: number}} Variance amount and percent
     */
    static calculateForYears(amounts, year1, year2) {
        const prior = amounts[year1] || 0;
        const current = amounts[year2] || 0;
        return this.calculate(current, prior);
    }

    /**
     * Calculate variance for totals object with year1/year2 properties
     * @param {Object} totals - Object with year1 and year2 properties
     * @returns {{amount: number, percent: number}} Variance amount and percent
     */
    static calculateForTotals(totals) {
        return this.calculate(totals.year2 || 0, totals.year1 || 0);
    }
}
