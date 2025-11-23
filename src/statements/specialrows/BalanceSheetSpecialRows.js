/**
 * BalanceSheetSpecialRows - Inserts Balance Sheet specific rows
 *
 * Adds:
 * - Totaal activa (Total Assets)
 * - Spacer row
 * - Totaal passiva (Total Liabilities & Equity)
 */

import CategoryMatcher from '../../utils/CategoryMatcher.js';
import { YEAR_CONFIG } from '../../constants.js';

export class BalanceSheetSpecialRows {
    /**
     * Insert Balance Sheet special rows
     * @param {Array<Object>} data - Statement data
     * @param {Object} statementData - Full statement data with totals
     * @returns {Array<Object>} Data with special rows inserted
     */
    insert(data, statementData) {
        const result = [...data];
        const totals = statementData.totals?.objects() || [];
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Calculate Total Assets from category totals
        const totalAssets = this.calculateTotalAssets(totals);

        // Find insertion point: before first liability/equity category
        const insertIndex = result.findIndex(row =>
            CategoryMatcher.isLiabilityOrEquity(row.name1) ||
            CategoryMatcher.isLiabilityOrEquity(row.name0)
        );

        if (insertIndex > 0) {
            // Insert Totaal activa row
            result.splice(insertIndex, 0, this.createTotalAssetsRow(totalAssets, year1, year2));

            // Insert blank/spacer row after Totaal activa
            result.splice(insertIndex + 1, 0, this.createSpacerRow('SPACER_1'));
        }

        // Calculate Total Liabilities & Equity
        const totalLE = this.calculateTotalLiabilitiesEquity(totals);

        // Append Totaal passiva at end
        result.push(this.createTotalPassivaRow(totalLE, year1, year2));

        return result;
    }

    /**
     * Calculate total assets from category totals
     * @param {Array<Object>} totals - Category totals
     * @returns {Object} Total assets for both years
     */
    calculateTotalAssets(totals) {
        let year1 = 0, year2 = 0;
        totals.forEach(row => {
            if (CategoryMatcher.isAsset(row.name1)) {
                year1 += row.amount_2024 || 0;
                year2 += row.amount_2025 || 0;
            }
        });
        return { year1, year2 };
    }

    /**
     * Calculate total liabilities & equity from category totals
     * @param {Array<Object>} totals - Category totals
     * @returns {Object} Total L&E for both years
     */
    calculateTotalLiabilitiesEquity(totals) {
        let year1 = 0, year2 = 0;
        totals.forEach(row => {
            if (CategoryMatcher.isLiabilityOrEquity(row.name1)) {
                year1 += row.amount_2024 || 0;
                year2 += row.amount_2025 || 0;
            }
        });
        return { year1, year2 };
    }

    /**
     * Create Total Assets row
     * @param {Object} totals - Total amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createTotalAssetsRow(totals, year1, year2) {
        const variance = totals.year2 - totals.year1;
        const variancePercent = totals.year1 !== 0 ?
            ((totals.year2 - totals.year1) / Math.abs(totals.year1)) * 100 : 0;

        return {
            hierarchy: ['Totaal activa'],
            level: 0,
            label: 'Totaal activa',
            name0: '',
            name1: '',
            name2: 'Totaal activa',
            amount_2024: totals.year1,
            amount_2025: totals.year2,
            variance_amount: variance,
            variance_percent: variancePercent,
            _isMetric: true,
            _rowType: 'total'
        };
    }

    /**
     * Create Total Passiva row
     * @param {Object} totals - Total amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createTotalPassivaRow(totals, year1, year2) {
        const variance = totals.year2 - totals.year1;
        const variancePercent = totals.year1 !== 0 ?
            ((totals.year2 - totals.year1) / Math.abs(totals.year1)) * 100 : 0;

        return {
            hierarchy: ['Totaal passiva'],
            level: 0,
            label: 'Totaal passiva',
            name0: '',
            name1: '',
            name2: 'Totaal passiva',
            amount_2024: totals.year1,
            amount_2025: totals.year2,
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

export default BalanceSheetSpecialRows;
