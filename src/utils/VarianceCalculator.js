/**
 * VarianceCalculator - Utility for calculating variances and percentages
 * Handles variance calculations between periods
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
}
