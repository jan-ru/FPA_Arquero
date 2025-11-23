/**
 * IncomeStatementSpecialRows - Inserts Income Statement specific rows
 *
 * Adds:
 * - Bruto marge (Gross Profit) after COGS
 * - Operating Income after operating expenses
 * - NET INCOME at the end
 */

import { YEAR_CONFIG } from '../../constants.js';
import Logger from '../../utils/Logger.js';

export class IncomeStatementSpecialRows {
    /**
     * Insert Income Statement special rows
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

        // 1. Insert Bruto marge (Gross Margin) after COGS
        const cogsIndex = this.findCogsIndex(result);
        Logger.debug('Income Statement - COGS index:', cogsIndex);

        if (cogsIndex >= 0 && metrics.grossProfit) {
            result.splice(cogsIndex + 1, 0, this.createBrutoMargeRow(metrics.grossProfit, year1, year2));
            result.splice(cogsIndex + 2, 0, this.createSpacerRow('SPACER_GROSS_MARGIN'));
        }

        // 2. Insert Operating Income after operating expenses
        const opexIndex = this.findOpexIndex(result);
        if (opexIndex >= 0 && metrics.operatingIncome) {
            result.splice(opexIndex + 1, 0, this.createOperatingIncomeRow(metrics.operatingIncome, year1, year2));
        }

        // 3. Append Net Income at bottom
        if (metrics.netIncome) {
            result.push(this.createNetIncomeRow(metrics.netIncome, year1, year2));
        }

        return result;
    }

    /**
     * Find COGS row index
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index or -1 if not found
     */
    findCogsIndex(data) {
        return data.findIndex(row =>
            row.label && (
                row.label.toLowerCase().includes('kostprijs') ||
                row.label.toLowerCase().includes('cogs') ||
                row.label.toLowerCase().includes('cost of goods')
            )
        );
    }

    /**
     * Find operating expenses row index
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index or -1 if not found
     */
    findOpexIndex(data) {
        let index = data.findIndex(row =>
            row.name2 && (
                row.name2.toLowerCase().includes('overige personeelskosten') ||
                row.name2.toLowerCase().includes('operating expense') ||
                row.name1 && row.name1.toLowerCase().includes('operating')
            )
        );

        // If not found, try to find the last expense before "Other" categories
        if (index < 0) {
            index = data.findIndex(row =>
                row.name1 && row.name1.toLowerCase().includes('overige')
            );
            if (index > 0) index -= 1;  // Insert before "Other" section
        }

        return index;
    }

    /**
     * Create Bruto marge row
     * @param {Object} amounts - Gross profit amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createBrutoMargeRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Bruto marge'],
            level: 0,
            label: 'Bruto marge',
            name0: '',
            name1: '',
            name2: 'Bruto marge',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: variance,
            variance_percent: variancePercent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Operating Income row
     * @param {Object} amounts - Operating income amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createOperatingIncomeRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Operating Income'],
            level: 0,
            label: 'Operating Income',
            name1: '',
            name2: 'Operating Income',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: variance,
            variance_percent: variancePercent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create NET INCOME row
     * @param {Object} amounts - Net income amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createNetIncomeRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['NET INCOME'],
            level: 0,
            label: 'NET INCOME',
            name1: '',
            name2: 'NET INCOME',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: variance,
            variance_percent: variancePercent,
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

export default IncomeStatementSpecialRows;
