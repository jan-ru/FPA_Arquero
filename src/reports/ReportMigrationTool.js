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

import ReportValidator from './ReportValidator.js';
import Logger from '../utils/Logger.js';

class ReportMigrationTool {
    /**
     * Create a new ReportMigrationTool instance
     * 
     * @param {ReportValidator} validator - Report validator for validating generated definitions
     */
    constructor(validator = null) {
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
     * @param {string} statementType - Statement type: 'income', 'balance', or 'cashflow'
     * @returns {Object} Report definition object ready for JSON serialization
     * @throws {Error} If statement type is invalid or generation fails
     * 
     * @example
     * const tool = new ReportMigrationTool();
     * const incomeDef = tool.exportToJSON('income');
     * const balanceDef = tool.exportToJSON('balance');
     * const cashflowDef = tool.exportToJSON('cashflow');
     */
    exportToJSON(statementType) {
        Logger.debug('ReportMigrationTool.exportToJSON', { statementType });

        // Validate statement type
        const validTypes = ['income', 'balance', 'cashflow'];
        if (!validTypes.includes(statementType)) {
            throw new Error(`Invalid statement type: ${statementType}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Generate report definition based on statement type
        let reportDef;
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
     * @returns {Object} Income Statement report definition
     */
    _generateIncomeStatementDefinition() {
        return {
            reportId: 'income_statement_migrated',
            name: 'Winst & Verlies Rekening (Migrated)',
            version: '1.0.0',
            statementType: 'income',
            description: 'Migrated Dutch income statement from hardcoded logic - matches original implementation exactly',

            variables: {
                revenue: {
                    filter: { code1: '500' },
                    aggregate: 'sum',
                    description: 'Netto-omzet (Revenue) - code1=500'
                },
                cogs: {
                    filter: { code1: '510' },
                    aggregate: 'sum',
                    description: 'Kostprijs van de omzet (Cost of Goods Sold) - code1=510'
                },
                operating_costs: {
                    filter: { code1: '520' },
                    aggregate: 'sum',
                    description: 'Bedrijfslasten (Operating Costs) - code1=520'
                },
                other_operating_costs: {
                    filter: { code1: '530' },
                    aggregate: 'sum',
                    description: 'Overige bedrijfslasten (Other Operating Costs) - code1=530'
                },
                financial: {
                    filter: { code1: '540' },
                    aggregate: 'sum',
                    description: 'Financiële baten en lasten (Financial Income and Expenses) - code1=540'
                },
                taxes: {
                    filter: { code1: '550' },
                    aggregate: 'sum',
                    description: 'Belastingen (Taxes) - code1=550'
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
                    style: 'normal',
                    description: 'Revenue from sales'
                },
                {
                    order: 200,
                    label: 'Kostprijs van de omzet',
                    type: 'variable',
                    variable: 'cogs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal',
                    description: 'Cost of goods sold'
                },
                {
                    order: 300,
                    label: 'Bruto marge',
                    type: 'calculated',
                    expression: 'revenue + cogs',
                    format: 'currency',
                    style: 'metric',
                    indent: 0,
                    description: 'Gross Margin = Revenue + COGS (COGS is negative)'
                },
                {
                    order: 310,
                    type: 'spacer',
                    description: 'Blank row after Bruto marge'
                },
                {
                    order: 400,
                    label: 'Bedrijfslasten',
                    type: 'variable',
                    variable: 'operating_costs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal',
                    description: 'Operating expenses'
                },
                {
                    order: 500,
                    label: 'Bedrijfsresultaat',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs',
                    format: 'currency',
                    style: 'metric',
                    indent: 0,
                    description: 'Operating Result = Gross Margin + Operating Costs'
                },
                {
                    order: 510,
                    type: 'spacer',
                    description: 'Blank row after Bedrijfsresultaat'
                },
                {
                    order: 600,
                    label: 'Overige bedrijfslasten',
                    type: 'variable',
                    variable: 'other_operating_costs',
                    format: 'currency',
                    indent: 0,
                    style: 'normal',
                    description: 'Other operating expenses'
                },
                {
                    order: 700,
                    label: 'Financiële baten en lasten',
                    type: 'variable',
                    variable: 'financial',
                    format: 'currency',
                    indent: 0,
                    style: 'normal',
                    description: 'Financial income and expenses'
                },
                {
                    order: 800,
                    label: 'Resultaat voor belastingen',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs + other_operating_costs + financial',
                    format: 'currency',
                    style: 'metric',
                    indent: 0,
                    description: 'Result Before Taxes'
                },
                {
                    order: 810,
                    type: 'spacer',
                    description: 'Blank row before taxes'
                },
                {
                    order: 900,
                    label: 'Belastingen',
                    type: 'variable',
                    variable: 'taxes',
                    format: 'currency',
                    indent: 0,
                    style: 'normal',
                    description: 'Income taxes'
                },
                {
                    order: 1000,
                    label: 'Resultaat na belastingen',
                    type: 'calculated',
                    expression: 'revenue + cogs + operating_costs + other_operating_costs + financial + taxes',
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Net Income = All revenues and expenses'
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
            },

            metadata: {
                author: 'ReportMigrationTool',
                created: new Date().toISOString(),
                tags: ['migrated', 'dutch', 'income-statement', 'hardcoded-export'],
                source: 'StatementGenerator.generateIncomeStatement()'
            }
        };
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
     * @returns {Object} Balance Sheet report definition
     */
    _generateBalanceSheetDefinition() {
        return {
            reportId: 'balance_sheet_migrated',
            name: 'Balans (Migrated)',
            version: '1.0.0',
            statementType: 'balance',
            description: 'Migrated Dutch balance sheet from hardcoded logic - matches original implementation exactly',

            variables: {
                fixed_assets: {
                    filter: { code1: '10' },
                    aggregate: 'sum',
                    description: 'Vaste activa (Fixed Assets) - code1=10'
                },
                current_assets: {
                    filter: { code1: ['20', '30', '40', '50'] },
                    aggregate: 'sum',
                    description: 'Vlottende activa (Current Assets) - code1=20,30,40,50'
                },
                equity: {
                    filter: { code1: '60' },
                    aggregate: 'sum',
                    description: 'Eigen vermogen (Equity) - code1=60'
                },
                provisions: {
                    filter: { code1: '70' },
                    aggregate: 'sum',
                    description: 'Voorzieningen (Provisions) - code1=70'
                },
                liabilities: {
                    filter: { code1: ['80', '90'] },
                    aggregate: 'sum',
                    description: 'Schulden (Liabilities) - code1=80,90'
                }
            },

            layout: [
                // ACTIVA (Assets) Section
                {
                    order: 100,
                    label: 'ACTIVA',
                    type: 'category',
                    filter: { statement_type: 'Balans' },
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Assets section header'
                },
                {
                    order: 200,
                    label: 'Vaste activa',
                    type: 'variable',
                    variable: 'fixed_assets',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Fixed assets'
                },
                {
                    order: 300,
                    label: 'Vlottende activa',
                    type: 'variable',
                    variable: 'current_assets',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Current assets'
                },
                {
                    order: 400,
                    label: 'Totaal activa',
                    type: 'calculated',
                    expression: 'fixed_assets + current_assets',
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Total Assets'
                },
                {
                    order: 410,
                    type: 'spacer',
                    description: 'Blank row after Total Assets'
                },
                // PASSIVA (Liabilities & Equity) Section
                {
                    order: 500,
                    label: 'PASSIVA',
                    type: 'category',
                    filter: { statement_type: 'Balans' },
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Liabilities & Equity section header'
                },
                {
                    order: 600,
                    label: 'Eigen vermogen',
                    type: 'variable',
                    variable: 'equity',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Equity'
                },
                {
                    order: 700,
                    label: 'Voorzieningen',
                    type: 'variable',
                    variable: 'provisions',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Provisions'
                },
                {
                    order: 800,
                    label: 'Schulden',
                    type: 'variable',
                    variable: 'liabilities',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Liabilities'
                },
                {
                    order: 900,
                    label: 'Totaal passiva',
                    type: 'calculated',
                    expression: 'equity + provisions + liabilities',
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Total Liabilities & Equity'
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
            },

            metadata: {
                author: 'ReportMigrationTool',
                created: new Date().toISOString(),
                tags: ['migrated', 'dutch', 'balance-sheet', 'hardcoded-export'],
                source: 'StatementGenerator.generateBalanceSheet()'
            }
        };
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
     * @returns {Object} Cash Flow Statement report definition
     */
    _generateCashFlowDefinition() {
        return {
            reportId: 'cash_flow_migrated',
            name: 'Kasstroomoverzicht (Migrated)',
            version: '1.0.0',
            statementType: 'cashflow',
            description: 'Migrated Dutch cash flow statement from hardcoded logic - indirect method',

            variables: {
                // Note: Cash flow is calculated from Balance Sheet and Income Statement
                // These variables represent the main components
                net_income: {
                    filter: { statement_type: 'Winst & verlies' },
                    aggregate: 'sum',
                    description: 'Net Income from Income Statement'
                },
                depreciation: {
                    filter: { name2: 'Afschrijvingen' },
                    aggregate: 'sum',
                    description: 'Depreciation (non-cash expense)'
                },
                inventory_change: {
                    filter: { code1: '30' },
                    aggregate: 'sum',
                    description: 'Change in Inventory'
                },
                receivables_change: {
                    filter: { code1: '40' },
                    aggregate: 'sum',
                    description: 'Change in Receivables'
                },
                payables_change: {
                    filter: { code1: '80' },
                    aggregate: 'sum',
                    description: 'Change in Payables'
                },
                fixed_assets_change: {
                    filter: { code1: '10' },
                    aggregate: 'sum',
                    description: 'Change in Fixed Assets (CapEx)'
                },
                long_term_debt_change: {
                    filter: { code1: '90' },
                    aggregate: 'sum',
                    description: 'Change in Long-term Debt'
                }
            },

            layout: [
                // Operating Activities
                {
                    order: 100,
                    label: 'Operationele activiteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    description: 'Operating Activities section header'
                },
                {
                    order: 110,
                    label: 'Resultaat na belastingen',
                    type: 'variable',
                    variable: 'net_income',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Net Income (starting point)'
                },
                {
                    order: 120,
                    label: 'Afschrijvingen',
                    type: 'variable',
                    variable: 'depreciation',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Add back depreciation (non-cash)'
                },
                {
                    order: 130,
                    label: 'Verandering voorraden',
                    type: 'variable',
                    variable: 'inventory_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Change in inventory (negative = cash used)'
                },
                {
                    order: 140,
                    label: 'Verandering vorderingen',
                    type: 'variable',
                    variable: 'receivables_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Change in receivables (negative = cash used)'
                },
                {
                    order: 150,
                    label: 'Verandering schulden',
                    type: 'variable',
                    variable: 'payables_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Change in payables (positive = cash provided)'
                },
                {
                    order: 200,
                    label: 'Kasstroom uit operationele activiteiten',
                    type: 'subtotal',
                    from: 110,
                    to: 150,
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0,
                    description: 'Total Operating Cash Flow'
                },
                {
                    order: 210,
                    type: 'spacer',
                    description: 'Blank row after operating activities'
                },
                // Investing Activities
                {
                    order: 300,
                    label: 'Investeringsactiviteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    description: 'Investing Activities section header'
                },
                {
                    order: 310,
                    label: 'Investeringen in vaste activa',
                    type: 'variable',
                    variable: 'fixed_assets_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Capital expenditures (negative = cash used)'
                },
                {
                    order: 400,
                    label: 'Kasstroom uit investeringsactiviteiten',
                    type: 'variable',
                    variable: 'fixed_assets_change',
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0,
                    description: 'Total Investing Cash Flow (same as CapEx)'
                },
                {
                    order: 410,
                    type: 'spacer',
                    description: 'Blank row after investing activities'
                },
                // Financing Activities
                {
                    order: 500,
                    label: 'Financieringsactiviteiten',
                    type: 'spacer',
                    style: 'total',
                    indent: 0,
                    description: 'Financing Activities section header'
                },
                {
                    order: 510,
                    label: 'Verandering langlopende schulden',
                    type: 'variable',
                    variable: 'long_term_debt_change',
                    format: 'currency',
                    indent: 1,
                    style: 'normal',
                    description: 'Change in long-term debt'
                },
                {
                    order: 600,
                    label: 'Kasstroom uit financieringsactiviteiten',
                    type: 'variable',
                    variable: 'long_term_debt_change',
                    format: 'currency',
                    style: 'subtotal',
                    indent: 0,
                    description: 'Total Financing Cash Flow (same as debt change)'
                },
                {
                    order: 610,
                    type: 'spacer',
                    description: 'Blank row before net change'
                },
                // Net Change in Cash
                {
                    order: 700,
                    label: 'Netto verandering liquide middelen',
                    type: 'calculated',
                    expression: '@200 + @400 + @600',
                    format: 'currency',
                    style: 'total',
                    indent: 0,
                    description: 'Net Change in Cash = Operating + Investing + Financing'
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
            },

            metadata: {
                author: 'ReportMigrationTool',
                created: new Date().toISOString(),
                tags: ['migrated', 'dutch', 'cash-flow', 'indirect-method', 'hardcoded-export'],
                source: 'StatementGenerator.generateCashFlowStatement()',
                notes: 'Cash flow uses indirect method starting with net income'
            }
        };
    }

    /**
     * Export all statement types to JSON files
     * 
     * Generates report definitions for all three statement types and returns them
     * as an object with keys for each statement type.
     * 
     * @returns {Object} Object with keys 'income', 'balance', 'cashflow' containing report definitions
     * 
     * @example
     * const tool = new ReportMigrationTool();
     * const allReports = tool.exportAll();
     * console.log(JSON.stringify(allReports.income, null, 2));
     * console.log(JSON.stringify(allReports.balance, null, 2));
     * console.log(JSON.stringify(allReports.cashflow, null, 2));
     */
    exportAll() {
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
     * @param {string} statementType - Statement type to compare
     * @param {Object} movementsData - Movements data for testing
     * @returns {Object} Comparison result with differences
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
    compareWithHardcoded(statementType, movementsData) {
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

export default ReportMigrationTool;
