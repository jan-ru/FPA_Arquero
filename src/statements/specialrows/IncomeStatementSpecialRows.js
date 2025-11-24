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

        // 1. Insert Bruto marge (Gross Margin) before Bedrijfslasten
        const bedrijfslastenIndex = this.findBedrijfslastenIndex(result);
        Logger.debug('Income Statement - Bedrijfslasten index:', bedrijfslastenIndex);

        if (bedrijfslastenIndex >= 0 && metrics.grossProfit) {
            result.splice(bedrijfslastenIndex, 0, this.createBrutoMargeRow(metrics.grossProfit, year1, year2));
            result.splice(bedrijfslastenIndex + 1, 0, this.createSpacerRow('SPACER_GROSS_MARGIN'));
        }

        // 2. Insert Bedrijfsresultaat before code1=530 (Financiële baten en lasten)
        const overigeBedrijfslastenIndex = this.findOverigeBedrijfslastenIndex(result);
        Logger.debug('Income Statement - Overige bedrijfslasten (530) index:', overigeBedrijfslastenIndex);

        if (overigeBedrijfslastenIndex >= 0 && metrics.operatingResult) {
            result.splice(overigeBedrijfslastenIndex, 0, this.createBedrijfsresultaatRow(metrics.operatingResult, year1, year2));
            result.splice(overigeBedrijfslastenIndex + 1, 0, this.createSpacerRow('SPACER_OPERATING_RESULT'));
        }

        // 3. Insert Resultaat voor belastingen above Belastingen (code1=550)
        const belastingenIndex = this.findBelastingenIndex(result);
        Logger.debug('Income Statement - Belastingen index:', belastingenIndex);

        if (belastingenIndex >= 0 && metrics.resultBeforeTax) {
            result.splice(belastingenIndex, 0, this.createResultaatVoorBelastingenRow(metrics.resultBeforeTax, year1, year2));
            result.splice(belastingenIndex + 1, 0, this.createSpacerRow('SPACER_BEFORE_TAX'));
        }

        // 4. Append Resultaat na belastingen at bottom (renamed from NET INCOME)
        if (metrics.netIncome) {
            result.push(this.createResultaatNaBelastingenRow(metrics.netIncome, year1, year2));
        }

        return result;
    }

    /**
     * Find Bedrijfslasten row index (code1 = 520)
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index or -1 if not found
     */
    findBedrijfslastenIndex(data) {
        return data.findIndex(row =>
            row.code1 === '520' || row.code1 === 520
        );
    }

    /**
     * Find Overige bedrijfslasten row index (code1 = 530)
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index or -1 if not found
     */
    findOverigeBedrijfslastenIndex(data) {
        return data.findIndex(row =>
            row.code1 === '530' || row.code1 === 530
        );
    }

    /**
     * Find Belastingen row index (code1 = 550)
     * @param {Array<Object>} data - Statement data
     * @returns {number} Index or -1 if not found
     */
    findBelastingenIndex(data) {
        return data.findIndex(row =>
            row.code1 === '550' || row.code1 === 550
        );
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
     * Create Totaal bedrijfskosten row
     * @param {Object} amounts - Operating costs amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createTotaalBedrijfskostenRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Totaal bedrijfskosten'],
            level: 0,
            label: 'Totaal bedrijfskosten',
            name0: '',
            name1: '',
            name2: 'Totaal bedrijfskosten',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: variance,
            variance_percent: variancePercent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Bedrijfsresultaat row
     * @param {Object} amounts - Operating result amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createBedrijfsresultaatRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Bedrijfsresultaat'],
            level: 0,
            label: 'Bedrijfsresultaat',
            name0: '',
            name1: '',
            name2: 'Bedrijfsresultaat',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: variance,
            variance_percent: variancePercent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Resultaat voor belastingen row
     * @param {Object} amounts - Result before tax amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createResultaatVoorBelastingenRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Resultaat voor belastingen'],
            level: 0,
            label: 'Resultaat voor belastingen',
            name0: '',
            name1: '',
            name2: 'Resultaat voor belastingen',
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
     * Create Resultaat na belastingen row (renamed from NET INCOME)
     * @param {Object} amounts - Net income amounts
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     * @returns {Object} Row object
     */
    createResultaatNaBelastingenRow(amounts, year1, year2) {
        const variance = amounts[year2] - amounts[year1];
        const variancePercent = amounts[year1] !== 0 ?
            ((amounts[year2] - amounts[year1]) / Math.abs(amounts[year1])) * 100 : 0;

        return {
            hierarchy: ['Resultaat na belastingen'],
            level: 0,
            label: 'Resultaat na belastingen',
            name0: '',
            name1: '',
            name2: 'Resultaat na belastingen',
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
