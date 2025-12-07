/**
 * ReportMigrationTool - Generates JSON report definitions from hardcoded logic
 * 
 * This tool exports the current hardcoded report structures (Balance Sheet, Income Statement,
 * Cash Flow Statement) to JSON report definition format. It preserves all calculated metrics,
 * formatting rules, and row ordering from the existing implementation.
 * 
 * The generated definitions can be used to migrate from hardcoded reports to the
 * configurable report system while maintaining identical output.
 * 
 * @example
 * const migrationTool = new ReportMigrationTool(validator);
 * const incomeStatementDef = migrationTool.exportToJSON('income');
 * console.log(JSON.stringify(incomeStatementDef, null, 2));
 */

import type ReportValidator from './ReportValidator.ts';
import type { ReportDefinition, StatementType } from './ReportValidator.ts';
import Logger from '../utils/Logger.ts';

/**
 * All exported reports
 */
export interface AllReports {
    income: ReportDefinition;
    balance: ReportDefinition;
    cashflow: ReportDefinition;
}

/**
 * Comparison result (placeholder for future implementation)
 */
export interface ComparisonResult {
    identical: boolean;
    differences?: any[];
}

export default class ReportMigrationTool {
    private validator: ReportValidator | null;

    /**
     * Create a new ReportMigrationTool instance
     * 
     * @param validator - Report validator for validating generated definitions
     */
    constructor(validator: ReportValidator | null = null) {
        this.validator = validator;
    }

    /**
     * Export hardcoded report logic to JSON report definition
     * 
     * Generates a complete report definition that matches the hardcoded report structure.
     * The generated definition includes:
     * - All variables with filters and aggregations
     * - Complete layout with calculated metrics
     * - Formatting rules
     * - Metadata
     * 
     * @param statementType - Statement type: 'income', 'balance', or 'cashflow'
     * @returns Report definition object ready for JSON serialization
     * @throws Error if statement type is invalid or generation fails
     * 
     * @example
     * const tool = new ReportMigrationTool();
     * const incomeDef = tool.exportToJSON('income');
     * const balanceDef = tool.exportToJSON('balance');
     * const cashflowDef = tool.exportToJSON('cashflow');
     */
    exportToJSON(statementType: StatementType): ReportDefinition {
        Logger.debug('ReportMigrationTool.exportToJSON', { statementType });

        // Validate statement type
        const validTypes: StatementType[] = ['income', 'balance', 'cashflow'];
        if (!validTypes.includes(statementType)) {
            throw new Error(`Invalid statement type: ${statementType}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Generate report definition based on statement type
        let reportDef: ReportDefinition;
        switch (statementType) {
            case 'income':
                reportDef = this._generateIncomeStatementDefinition();
                break;
            case 'balance':
                reportDef = this._generateBalanceSheetDefinition();
                break;
            case 'cashflow':
                reportDef = this._generateCashFlowDefinition();
                break;
            default:
                throw new Error(`Unsupported statement type: ${statementType}`);
        }

        // Validate generated definition if validator is available
        if (this.validator) {
            const validation = this.validator.validate(reportDef);
            if (!validation.isValid) {
                Logger.error('Generated report definition failed validation', {
                    errors: validation.errors
                });
                const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
                throw new Error(`Generated report definition is invalid: ${errorMessages}`);
            }
            Logger.debug('Generated report definition passed validation');
        }

        return reportDef;
    }

    /**
     * Generate Income Statement report definition
     * 
     * Exports the hardcoded Income Statement structure to JSON format.
     * Preserves all calculated metrics:
     * - Bruto marge (Gross Margin)
     * - Bedrijfsresultaat (Operating Result)
     * - Resultaat voor belastingen (Result Before Taxes)
     * - Resultaat na belastingen (Net Income)
     * 
     * @private
     * @returns Income Statement report definition
     */
    private _generateIncomeStatementDefinition(): ReportDefinition {
        return {
            reportId: 'income_statement_migrated',
            name: 'Winst & Verlies Rekening (Migrated)',
            version: '1.0.0',
            statementType: 'income',

            variables: {
                revenue: {
                    filter: { code1: '500' },
                    aggregate: 'sum'
                },
                cogs: {
                    filter: { code1: '510' },
                    aggregate: 'sum'
                },
                operating_costs: {
                    filter: { code1: '520' },
                    aggregate: 'sum'
                },
                other_operating_costs: {
                    filter: { code1: '530' },
                    aggregate: 'sum'
                },
                financial: {
                    filter: { code1: '540' },
                    aggregate: 'sum'
                },
                taxes: {
                    filter: { code1: '550' },
                    aggregate: 'sum'
                }
            },

            layout: [
                {
                    order: 100,
                    label: 'Netto-omzet',
                    type: 'variable',
                    variable: 'revenue',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 200,
                    label: 'Kostprijs van de omzet',
                    type: 'variable',
                    variable: 'cogs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 300,
                    label: 'Bruto marge',
                    type: 'calculated',
                    expression: 'revenue + cogs',
                    format: 'currency',
                    style: 'metric',
                    indent: 0
                },
                {
                    order: 310,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 400,
                    label: 'Bedrijfslasten',
                    type: 'variable',
                    variable: 'operating_costs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 500,
                    label: 'Bedrijfsresultaat',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs',
                    format: 'currency',
                    style: 'metric',
                    indent: 0
                },
                {
                    order: 510,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 600,
                    label: 'Overige bedrijfslasten',
                    type: 'variable',
                    variable: 'other_operating_costs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 700,
                    label: 'Financiële baten en lasten',
                    type: 'variable',
                    variable: 'financial',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 800,
                    label: 'Resultaat voor belastingen',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs + other_operating_costs + financial',
                    format: 'currency',
                    style: 'metric',
                    indent: 0
                },
                {
                    order: 810,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 900,
                    label: 'Belastingen',
                    type: 'variable',
                    variable: 'taxes',
                    format: 'currency',
                    indent: 0,
                    style: 'normal'
                },
                {
                    order: 1000,
                    label: 'Resultaat na belastingen',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs + other_operating_costs + financial + taxes',
                    format: 'currency',
                    style: 'total',
                    indent: 0
                }
            ],

            formatting: {
                currency: {
                    decimals: 0,
                    thousands: true,
                    symbol: '€'
                },
                percent: {
                    decimals: 1,
                    symbol: '%'
                },
                integer: {
                    thousands: true
                },
                decimal: {
                    decimals: 2,
                    thousands: true
                }
            }
        } as ReportDefinition;
    }

    /**
     * Generate Balance Sheet report definition
     * 
     * Exports the hardcoded Balance Sheet structure to JSON format.
     * Preserves the hierarchical structure:
     * - Activa (Assets)
     *   - Vaste activa (Fixed Assets)
     *   - Vlottende activa (Current Assets)
     * - Passiva (Liabilities & Equity)
     *   - Eigen vermogen (Equity)
     *   - Voorzieningen (Provisions)
     *   - Schulden (Liabilities)
     * 
     * Includes special calculated rows:
     * - Totaal activa (Total Assets)
     * - Totaal passiva (Total Liabilities & Equity)
     * 
     * @private
     * @returns Balance Sheet report definition
     */
    private _generateBalanceSheetDefinition(): ReportDefinition {
        return {
            reportId: 'balance_sheet_migrated',
            name: 'Balans (Migrated)',
            version: '1.0.0',
            statementType: 'balance',

            variables: {
                fixed_assets: {
                    filter: { code1: '10' },
                    aggregate: 'sum'
                },
                current_assets: {
                    filter: { code1: ['20', '30', '40', '50'] },
                    aggregate: 'sum'
                },
                equity: {
                    filter: { code1: '60' },
                    aggregate: 'sum'
                },
                provisions: {
                    filter: { code1: '70' },
                    aggregate: 'sum'
                },
                liabilities: {
                    filter: { code1: ['80', '90'] },
                    aggregate: 'sum'
                }
            },

            layout: [
                {
                    order: 100,
                    label: 'ACTIVA',
                    type: 'category',
                    filter: { statement_type: 'Balans' },
                    format: 'currency',
                    style: 'total',
                    indent: 0
                },
                {
                    order: 200,
                    label: 'Vaste activa',
                    type: 'variable',
                    variable: 'fixed_assets',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 300,
                    label: 'Vlottende activa',
                    type: 'variable',
                    variable: 'current_assets',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 400,
                    label: 'Totaal activa',
                    type: 'calculated',
                    expression: 'fixed_assets + current_assets',
                    format: 'currency',
                    style: 'total',
                    indent: 0
                },
                {
                    order: 410,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 500,
                    label: 'PASSIVA',
                    type: 'category',
                    filter: { statement_type: 'Balans' },
                    format: 'currency',
                    style: 'total',
                    indent: 0
                },
                {
                    order: 600,
                    label: 'Eigen vermogen',
                    type: 'variable',
                    variable: 'equity',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 700,
                    label: 'Voorzieningen',
                    type: 'variable',
                    variable: 'provisions',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 800,
                    label: 'Schulden',
                    type: 'variable',
                    variable: 'liabilities',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 900,
                    label: 'Totaal passiva',
                    type: 'calculated',
                    expression: 'equity + provisions + liabilities',
                    format: 'currency',
                    style: 'total',
                    indent: 0
                }
            ],

            formatting: {
                currency: {
                    decimals: 0,
                    thousands: true,
                    symbol: '€'
                },
                percent: {
                    decimals: 1,
                    symbol: '%'
                },
                integer: {
                    thousands: true
                },
                decimal: {
                    decimals: 2,
                    thousands: true
                }
            }
        } as ReportDefinition;
    }

    /**
     * Generate Cash Flow Statement report definition
     * 
     * Exports the hardcoded Cash Flow Statement structure to JSON format.
     * Uses the indirect method with three main sections:
     * - Operating Activities (starts with Net Income)
     * - Investing Activities (capital expenditures)
     * - Financing Activities (debt and equity changes)
     * 
     * Includes reconciliation:
     * - Starting Cash
     * - Net Change in Cash
     * - Ending Cash
     * 
     * @private
     * @returns Cash Flow Statement report definition
     */
    private _generateCashFlowDefinition(): ReportDefinition {
        return {
            reportId: 'cash_flow_migrated',
            name: 'Kasstroomoverzicht (Migrated)',
            version: '1.0.0',
            statementType: 'cashflow',

            variables: {
                net_income: {
                    filter: { statement_type: 'Winst & verlies' },
                    aggregate: 'sum'
                },
                depreciation: {
                    filter: { name2: 'Afschrijvingen' },
                    aggregate: 'sum'
                },
                inventory_change: {
                    filter: { code1: '30' },
                    aggregate: 'sum'
                },
                receivables_change: {
                    filter: { code1: '40' },
                    aggregate: 'sum'
                },
                payables_change: {
                    filter: { code1: '80' },
                    aggregate: 'sum'
                },
                fixed_assets_change: {
                    filter: { code1: '10' },
                    aggregate: 'sum'
                },
                long_term_debt_change: {
                    filter: { code1: '90' },
                    aggregate: 'sum'
                }
            },

            layout: [
                {
                    order: 100,
                    label: 'Operationele activiteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    format: 'currency'
                },
                {
                    order: 110,
                    label: 'Resultaat na belastingen',
                    type: 'variable',
                    variable: 'net_income',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 120,
                    label: 'Afschrijvingen',
                    type: 'variable',
                    variable: 'depreciation',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 130,
                    label: 'Verandering voorraden',
                    type: 'variable',
                    variable: 'inventory_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 140,
                    label: 'Verandering vorderingen',
                    type: 'variable',
                    variable: 'receivables_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 150,
                    label: 'Verandering schulden',
                    type: 'variable',
                    variable: 'payables_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 200,
                    label: 'Kasstroom uit operationele activiteiten',
                    type: 'subtotal',
                    from: 110,
                    to: 150,
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0
                },
                {
                    order: 210,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 300,
                    label: 'Investeringsactiviteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    format: 'currency'
                },
                {
                    order: 310,
                    label: 'Investeringen in vaste activa',
                    type: 'variable',
                    variable: 'fixed_assets_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 400,
                    label: 'Kasstroom uit investeringsactiviteiten',
                    type: 'variable',
                    variable: 'fixed_assets_change',
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0
                },
                {
                    order: 410,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 500,
                    label: 'Financieringsactiviteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    format: 'currency'
                },
                {
                    order: 510,
                    label: 'Verandering langlopende schulden',
                    type: 'variable',
                    variable: 'long_term_debt_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal'
                },
                {
                    order: 600,
                    label: 'Kasstroom uit financieringsactiviteiten',
                    type: 'variable',
                    variable: 'long_term_debt_change',
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0
                },
                {
                    order: 610,
                    type: 'spacer',
                    indent: 0,
                    style: 'spacer',
                    format: 'currency'
                },
                {
                    order: 700,
                    label: 'Netto verandering liquide middelen',
                    type: 'calculated',
                    expression: '@200 + @400 + @600',
                    format: 'currency',
                    style: 'total',
                    indent: 0
                }
            ],

            formatting: {
                currency: {
                    decimals: 0,
                    thousands: true,
                    symbol: '€'
                },
                percent: {
                    decimals: 1,
                    symbol: '%'
                },
                integer: {
                    thousands: true
                },
                decimal: {
                    decimals: 2,
                    thousands: true
                }
            }
        } as ReportDefinition;
    }

    /**
     * Export all statement types to JSON files
     * 
     * Generates report definitions for all three statement types and returns them
     * as an object with keys for each statement type.
     * 
     * @returns Object with keys 'income', 'balance', 'cashflow' containing report definitions
     * 
     * @example
     * const tool = new ReportMigrationTool();
     * const allReports = tool.exportAll();
     * console.log(JSON.stringify(allReports.income, null, 2));
     * console.log(JSON.stringify(allReports.balance, null, 2));
     * console.log(JSON.stringify(allReports.cashflow, null, 2));
     */
    exportAll(): AllReports {
        return {
            income: this.exportToJSON('income'),
            balance: this.exportToJSON('balance'),
            cashflow: this.exportToJSON('cashflow')
        };
    }

    /**
     * Compare generated definition with existing hardcoded output
     * 
     * This method would be used to verify that the generated report definition
     * produces identical output to the hardcoded implementation.
     * 
     * Note: This is a placeholder for future implementation. The actual comparison
     * would require running both the hardcoded and configurable report generation
     * with the same input data and comparing the results.
     * 
     * @param statementType - Statement type to compare
     * @param movementsData - Movements data for testing
     * @returns Comparison result with differences
     * 
     * @example
     * const tool = new ReportMigrationTool();
     * const comparison = tool.compareWithHardcoded('income', movementsData);
     * if (comparison.identical) {
     *   console.log('Generated definition matches hardcoded output!');
     * } else {
     *   console.log('Differences found:', comparison.differences);
     * }
     */
    compareWithHardcoded(statementType: StatementType, movementsData: any): ComparisonResult {
        // Placeholder for future implementation
        // This would:
        // 1. Generate report definition
        // 2. Run hardcoded report generation
        // 3. Run configurable report generation with generated definition
        // 4. Compare outputs row by row
        // 5. Return detailed comparison results
        
        throw new Error('compareWithHardcoded not yet implemented');
    }
}
