/**
 * CashFlowStatementSpecialRows - Inserts Cash Flow Statement specific rows
 *
 * Adds:
 * - Starting Cash (cash from the balance sheet at beginning of period)
 * - Change in Cash (net change in cash)
 * - Ending Cash (cash at end of period)
 */

import { YEAR_CONFIG } from '../../constants.js';
import VarianceCalculator from '../../utils/VarianceCalculator.ts';

export class CashFlowStatementSpecialRows {
    /**
     * Insert Cash Flow Statement special rows
     * @param {Array<Object>} data - Statement data
     * @param {Object} statementData - Full statement data with metrics
     * @returns {Array<Object>} Data with special rows inserted
     */
    insert(data, statementData) {
        if (!statementData.metrics) return data;

        const result = [...data];
        const metrics = statementData.metrics;
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Add spacer before cash summary
        result.push(this.createSpacerRow('SPACER_BEFORE_CASH_SUMMARY'));

        // Add Starting Cash
        if (metrics.startingCash) {
            result.push(this.createStartingCashRow(metrics.startingCash, year1, year2));
        }

        // Add Change in Cash (net change)
        if (metrics.netChange) {
            result.push(this.createChangeInCashRow(metrics.netChange, year1, year2));
        }

        // Add Ending Cash
        if (metrics.endingCash) {
            result.push(this.createEndingCashRow(metrics.endingCash, year1, year2));
        }

        return result;
    }

    /**
     * Create Starting Cash row
     * @param {Object} amounts - Starting cash amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createStartingCashRow(amounts, year1, year2) {
        const { amount, percent } = VarianceCalculator.calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Starting Cash (Σ)'],
            level: 0,
            label: 'Starting Cash (Σ)',
            name0: '',
            name1: '',
            name2: 'Starting Cash (Σ)',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Change in Cash row
     * @param {Object} amounts - Net change amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createChangeInCashRow(amounts, year1, year2) {
        const { amount, percent } = VarianceCalculator.calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Change in Cash (Δ)'],
            level: 0,
            label: 'Change in Cash (Δ)',
            name0: '',
            name1: '',
            name2: 'Change in Cash (Δ)',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Ending Cash row
     * @param {Object} amounts - Ending cash amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createEndingCashRow(amounts, year1, year2) {
        const { amount, percent } = VarianceCalculator.calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Ending Cash (Σ)'],
            level: 0,
            label: 'Ending Cash (Σ)',
            name0: '',
            name1: '',
            name2: 'Ending Cash (Σ)',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'total'
        };
    }

    /**
     * Create spacer row
     * @param {string} id - Spacer ID
     * @returns {Object} Spacer row object
     */
    createSpacerRow(id) {
        return {
            hierarchy: [id],
            level: 0,
            label: '',
            name0: '',
            name1: '',
            name2: '',
            amount_2024: null,
            amount_2025: null,
            variance_amount: null,
            variance_percent: null,
            _isMetric: false,
            _rowType: 'spacer'
        };
    }
}

export default CashFlowStatementSpecialRows;
