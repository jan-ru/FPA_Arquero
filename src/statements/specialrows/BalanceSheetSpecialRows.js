/**
 * BalanceSheetSpecialRows - Inserts Balance Sheet specific rows
 *
 * Adds:
 * - Totaal activa (Total Assets)
 * - Spacer row
 * - Totaal passiva (Total Liabilities & Equity)
 */

import CategoryMatcher from '../../utils/CategoryMatcher.js';
import VarianceCalculator from '../../utils/VarianceCalculator.js';
import { YEAR_CONFIG } from '../../constants.js';

export class BalanceSheetSpecialRows {
    /**
     * Insert Balance Sheet special rows
     * @param {Array<Object>} data - Statement data
     * @param {Object} statementData - Full statement data with totals
     * @returns {Array<Object>} Data with special rows inserted
     */
    insert(data, statementData) {
        // Keep "Activa" and "Passiva" headers but clear their totals
        // Only "Totaal activa" and "Totaal passiva" at the bottom should show totals
        const result = data.map(row => {
            // Clear totals from level 0 category headers (Activa/Passiva)
            // These are just section headers, not totals
            const isTopLevelCategory = row.level === 0 &&
                                      (row.label === 'Activa' || row.label === 'Passiva');

            if (isTopLevelCategory) {
                // Create a copy with all amount fields set to null
                return {
                    ...row,
                    amount_2024: null,
                    amount_2025: null,
                    variance_amount: null,
                    variance_percent: null
                };
            }

            return row;
        });

        const totals = statementData.totals?.objects() || [];
        const metrics = statementData.metrics;
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Calculate Total Assets from displayed data (sum of level 1 asset rows)
        const totalAssets = this.calculateTotalAssets(result);

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

        // Insert Resultaat boekjaar at the end of Equity section
        // Find the last equity detail row (within eigen vermogen)
        const equityInsertIndex = this.findEquityInsertIndex(result);

        if (equityInsertIndex >= 0 && metrics?.netIncome) {
            result.splice(equityInsertIndex, 0, this.createResultaatBoekjaarRow(metrics.netIncome, year1, year2));
        }

        // Calculate Total Liabilities & Equity from displayed data (sum of level 1 L&E rows)
        const totalLE = this.calculateTotalLiabilitiesEquity(result);
        const totalLEWithIncome = {
            year1: totalLE.year1 + (metrics?.netIncome?.[year1] || 0),
            year2: totalLE.year2 + (metrics?.netIncome?.[year2] || 0)
        };

        // Append Totaal passiva at end
        result.push(this.createTotalPassivaRow(totalLEWithIncome, year1, year2));

        // Validate Balance Sheet equation: Assets = Liabilities + Equity
        this.validateBalanceSheet(totalAssets, totalLEWithIncome, year1, year2);

        return result;
    }

    /**
     * Calculate total assets from displayed data rows
     * Sums level 1 asset categories (vaste activa, vlottende activa)
     * @param {Array<Object>} data - Statement data rows
     * @returns {Object} Total assets for both years
     */
    calculateTotalAssets(data) {
        let year1 = 0, year2 = 0;

        // Sum level 1 rows under "Activa" section
        // These are the direct children of the "Activa" section (vaste activa, vlottende activa)
        data.forEach(row => {
            // Check if this is a level 1 row under the Activa section
            const isActivaChild = row.level === 1 &&
                                 (row.name0 === 'Activa' || row.hierarchy?.[0] === 'Activa');

            if (isActivaChild) {
                year1 += row.amount_2024 || 0;
                year2 += row.amount_2025 || 0;
            }
        });

        return { year1, year2 };
    }

    /**
     * Calculate total liabilities & equity from displayed data rows
     * Sums level 1 liability/equity categories (eigen vermogen, lange termijn schulden, etc.)
     * Note: Excludes "Resultaat boekjaar" as it's added separately
     * @param {Array<Object>} data - Statement data rows
     * @returns {Object} Total L&E for both years
     */
    calculateTotalLiabilitiesEquity(data) {
        let year1 = 0, year2 = 0;

        // Sum level 1 rows under "Passiva" section
        // These are the direct children of the "Passiva" section
        // Exclude "Resultaat boekjaar" as it's added separately to the total
        data.forEach(row => {
            // Check if this is a level 1 row under the Passiva section
            const isPassivaChild = row.level === 1 &&
                                  row.label !== 'Resultaat boekjaar' &&
                                  (row.name0 === 'Passiva' || row.hierarchy?.[0] === 'Passiva');

            if (isPassivaChild) {
                year1 += row.amount_2024 || 0;
                year2 += row.amount_2025 || 0;
            }
        });

        return { year1, year2 };
    }

    /**
     * Find where to insert Resultaat boekjaar within eigen vermogen section
     * Should be inserted after the last detail row of "eigen vermogen" (level 2)
     * but before "lange termijn schulden" category (level 1, code1 >= 65)
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index where to insert, or -1 if not found
     */
    findEquityInsertIndex(data) {
        // Find the last row that belongs to eigen vermogen section
        // This is the last row with code1 in range 60-64 (eigen vermogen codes)
        let lastEquityIndex = -1;

        for (let i = 0; i < data.length; i++) {
            const code1 = parseInt(data[i].code1);
            // Equity section is code1 = 60-64
            if (!isNaN(code1) && code1 >= 60 && code1 < 65) {
                lastEquityIndex = i;
            }
        }

        // Insert after the last equity row
        return lastEquityIndex >= 0 ? lastEquityIndex + 1 : -1;
    }

    /**
     * Create Resultaat boekjaar row
     * @param {Object} amounts - Net income amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createResultaatBoekjaarRow(amounts, year1, year2) {
        const { amount, percent } = VarianceCalculator.calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Passiva', 'eigen vermogen', 'Resultaat boekjaar'],
            level: 2,  // Same indentation level as other equity detail items like "Eigen vermogen"
            label: 'Resultaat boekjaar',
            name0: 'Passiva',
            name1: 'eigen vermogen',
            name2: 'Resultaat boekjaar',
            code0: '6',
            code1: '60',  // Changed from '69' to '60' to group with eigen vermogen
            code2: '60999',  // Special code for Resultaat boekjaar within equity
            code3: '',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: false,
            _rowType: 'detail'
        };
    }

    /**
     * Create Total Assets row
     * @param {Object} totals - Total amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createTotalAssetsRow(totals, year1, year2) {
        const { amount, percent } = VarianceCalculator.calculateForTotals(totals);

        return {
            hierarchy: ['Totaal activa'],
            level: 0,
            label: 'Totaal activa',
            name0: '',
            name1: '',
            name2: 'Totaal activa',
            amount_2024: totals.year1,
            amount_2025: totals.year2,
            variance_amount: amount,
            variance_percent: percent,
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
        const { amount, percent } = VarianceCalculator.calculateForTotals(totals);

        return {
            hierarchy: ['Totaal passiva'],
            level: 0,
            label: 'Totaal passiva',
            name0: '',
            name1: '',
            name2: 'Totaal passiva',
            amount_2024: totals.year1,
            amount_2025: totals.year2,
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

    /**
     * Validate Balance Sheet equation: Assets = Liabilities + Equity
     * Logs warnings if the equation doesn't balance
     * @param {Object} totalAssets - Total assets {year1, year2}
     * @param {Object} totalLE - Total liabilities & equity {year1, year2}
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     */
    validateBalanceSheet(totalAssets, totalLE, year1, year2) {
        const tolerance = 0.01; // Allow 1 cent difference due to rounding

        // Validate year 1
        const diff1 = Math.abs(totalAssets.year1 - totalLE.year1);
        if (diff1 > tolerance) {
            console.warn(`⚠️ Balance Sheet ${year1} does not balance!`);
            console.warn(`   Assets: ${totalAssets.year1.toFixed(2)}`);
            console.warn(`   Liabilities + Equity: ${totalLE.year1.toFixed(2)}`);
            console.warn(`   Difference: ${diff1.toFixed(2)}`);
        }

        // Validate year 2
        const diff2 = Math.abs(totalAssets.year2 - totalLE.year2);
        if (diff2 > tolerance) {
            console.warn(`⚠️ Balance Sheet ${year2} does not balance!`);
            console.warn(`   Assets: ${totalAssets.year2.toFixed(2)}`);
            console.warn(`   Liabilities + Equity: ${totalLE.year2.toFixed(2)}`);
            console.warn(`   Difference: ${diff2.toFixed(2)}`);
        }

        // Log success if balanced
        if (diff1 <= tolerance && diff2 <= tolerance) {
            console.log(`✅ Balance Sheet validates: Assets = Liabilities + Equity (both years)`);
        }
    }
}

export default BalanceSheetSpecialRows;
