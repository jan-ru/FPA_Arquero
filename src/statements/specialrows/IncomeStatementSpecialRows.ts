/**
 * IncomeStatementSpecialRows - Inserts Income Statement specific rows
 *
 * Adds:
 * - Bruto marge (Gross Profit) after COGS
 * - Operating Income after operating expenses
 * - NET INCOME at the end
 */

import { YEAR_CONFIG } from '../../constants.ts';
import Logger from '../../utils/Logger.ts';
import { calculateForYears } from '../../core/calculations/variance.ts';

interface MetricAmounts {
    [year: string]: number;
}

interface StatementMetrics {
    grossProfit?: MetricAmounts;
    operatingResult?: MetricAmounts;
    resultBeforeTax?: MetricAmounts;
    netIncome?: MetricAmounts;
}

interface StatementData {
    metrics?: StatementMetrics;
}

interface RowData {
    hierarchy: string[];
    level: number;
    label: string;
    name0: string;
    name1: string;
    name2: string;
    code1?: string | number;
    amount_2024: number | null;
    amount_2025: number | null;
    variance_amount: number | null;
    variance_percent: number | null;
    _isMetric: boolean;
    _rowType: string;
}

export class IncomeStatementSpecialRows {
    /**
     * Insert Income Statement special rows
     * @param data - Statement data
     * @param statementData - Full statement data with metrics
     * @returns Data with special rows inserted
     */
    insert(data: any[], statementData: StatementData): any[] {
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
     * @param data - Statement data
     * @returns Index or -1 if not found
     */
    findBedrijfslastenIndex(data: any[]): number {
        return data.findIndex((row: any) =>
            row.code1 === '520' || row.code1 === 520
        );
    }

    /**
     * Find Overige bedrijfslasten row index (code1 = 530)
     * @param data - Statement data
     * @returns Index or -1 if not found
     */
    findOverigeBedrijfslastenIndex(data: any[]): number {
        return data.findIndex((row: any) =>
            row.code1 === '530' || row.code1 === 530
        );
    }

    /**
     * Find Belastingen row index (code1 = 550)
     * @param data - Statement data
     * @returns Index or -1 if not found
     */
    findBelastingenIndex(data: any[]): number {
        return data.findIndex((row: any) =>
            row.code1 === '550' || row.code1 === 550
        );
    }

    /**
     * Find COGS row index
     * @param data - Statement data
     * @returns Index or -1 if not found
     */
    findCogsIndex(data: any[]): number {
        return data.findIndex((row: any) =>
            row.label && (
                row.label.toLowerCase().includes('kostprijs') ||
                row.label.toLowerCase().includes('cogs') ||
                row.label.toLowerCase().includes('cost of goods')
            )
        );
    }

    /**
     * Find operating expenses row index
     * @param data - Statement data
     * @returns Index or -1 if not found
     */
    findOpexIndex(data: any[]): number {
        let index = data.findIndex((row: any) =>
            row.name2 && (
                row.name2.toLowerCase().includes('overige personeelskosten') ||
                row.name2.toLowerCase().includes('operating expense') ||
                row.name1 && row.name1.toLowerCase().includes('operating')
            )
        );

        // If not found, try to find the last expense before "Other" categories
        if (index < 0) {
            index = data.findIndex((row: any) =>
                row.name1 && row.name1.toLowerCase().includes('overige')
            );
            if (index > 0) index -= 1;  // Insert before "Other" section
        }

        return index;
    }

    /**
     * Create Bruto marge row
     * @param amounts - Gross profit amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createBrutoMargeRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Bruto marge'],
            level: 0,
            label: 'Bruto marge',
            name0: '',
            name1: '',
            name2: 'Bruto marge',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Totaal bedrijfskosten row
     * @param amounts - Operating costs amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createTotaalBedrijfskostenRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Totaal bedrijfskosten'],
            level: 0,
            label: 'Totaal bedrijfskosten',
            name0: '',
            name1: '',
            name2: 'Totaal bedrijfskosten',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Bedrijfsresultaat row
     * @param amounts - Operating result amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createBedrijfsresultaatRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Bedrijfsresultaat'],
            level: 0,
            label: 'Bedrijfsresultaat',
            name0: '',
            name1: '',
            name2: 'Bedrijfsresultaat',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Resultaat voor belastingen row
     * @param amounts - Result before tax amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createResultaatVoorBelastingenRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Resultaat voor belastingen'],
            level: 0,
            label: 'Resultaat voor belastingen',
            name0: '',
            name1: '',
            name2: 'Resultaat voor belastingen',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Operating Income row
     * @param amounts - Operating income amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createOperatingIncomeRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(amounts, year1, year2);

        return {
            hierarchy: ['Operating Income'],
            level: 0,
            label: 'Operating Income',
            name0: '',
            name1: '',
            name2: 'Operating Income',
            amount_2024: amounts[year1],
            amount_2025: amounts[year2],
            variance_amount: amount,
            variance_percent: percent,
            _isMetric: true,
            _rowType: 'metric'
        };
    }

    /**
     * Create Resultaat na belastingen row (renamed from NET INCOME)
     * @param amounts - Net income amounts
     * @param year1 - First year
     * @param year2 - Second year
     * @returns Row object
     */
    createResultaatNaBelastingenRow(amounts: MetricAmounts, year1: string, year2: string): RowData {
        const { amount, percent } = calculateForYears(year1, year2)(amounts);

        return {
            hierarchy: ['Resultaat na belastingen'],
            level: 0,
            label: 'Resultaat na belastingen',
            name0: '',
            name1: '',
            name2: 'Resultaat na belastingen',
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
     * @param id - Spacer ID
     * @returns Spacer row object
     */
    createSpacerRow(id: string): RowData {
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
