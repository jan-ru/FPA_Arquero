/**
 * StatementGenerator - Generates financial statements from trial balance data
 *
 * This class is responsible for generating:
 * - Balance Sheet
 * - Income Statement
 * - Cash Flow Statement (Indirect Method)
 *
 * Depends on:
 * - Arquero (aq) - loaded globally from CDN
 * - DataStore - for accessing trial balance data
 * - CategoryMatcher - for categorizing accounts
 * - VarianceCalculator - for calculating variances
 */

import {
    YEAR_CONFIG,
    STATEMENT_TYPES,
    VALIDATION_CONFIG,
    CATEGORY_DEFINITIONS
} from '../constants.js';
import CategoryMatcher from '../utils/CategoryMatcher.js';
import VarianceCalculator from '../utils/VarianceCalculator.js';
import Logger from '../utils/Logger.js';
import AccountSignHandler from '../utils/AccountSignHandler.js';

class StatementGenerator {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.unmappedAccounts = [];
    }

    // Helper: Calculate variance percentage
    calculateVariancePercent(amt2024, amt2025) {
        return amt2024 !== 0 ? ((amt2025 - amt2024) / Math.abs(amt2024)) * 100 : 0;
    }

    // Helper: Validate required data is loaded and return appropriate data based on view type
    validateRequiredData() {
        // Determine view type from UI dropdown (if available, otherwise default to cumulative)
        let viewType = 'cumulative';
        if (typeof document !== 'undefined') {
            viewType = document.getElementById('view-type')?.value || 'cumulative';
        }

        // Get appropriate combined data based on view type
        const combinedData = viewType === 'period'
            ? this.dataStore.getCombinedMovements()
            : this.dataStore.getCombinedBalances();

        if (!combinedData) {
            throw new Error(`Required ${viewType} data not loaded`);
        }

        console.log(`Using ${viewType} view for statement generation (${combinedData.numRows()} rows)`);
        return combinedData;
    }

    // Helper: Calculate variance columns
    deriveVarianceColumns(combined) {
        // Note: Arquero requires static column names in derive operations
        // We use amount_2024/amount_2025 as the column identifiers
        return combined.derive({
            amount_2024: d => d.amount_2024 || 0,
            amount_2025: d => d.amount_2025 || 0,
            variance_amount: d => (d.amount_2025 || 0) - (d.amount_2024 || 0),
            variance_percent: d => {
                const amt1 = d.amount_2024 || 0;
                const amt2 = d.amount_2025 || 0;
                return amt1 !== 0 ? ((amt2 - amt1) / Math.abs(amt1)) * 100 : 0;
            }
        });
    }

    // Helper: Calculate category totals
    calculateCategoryTotals(combined) {
        // Note: Arquero requires static column names in rollup operations
        // We use amount_2024/amount_2025 as the column identifiers
        return combined
            .groupby('name1')
            .rollup({
                amount_2024: d => aq.op.sum(d.amount_2024),
                amount_2025: d => aq.op.sum(d.amount_2025),
                variance_amount: d => aq.op.sum(d.variance_amount),
                variance_percent: d => {
                    const total1 = aq.op.sum(d.amount_2024);
                    const total2 = aq.op.sum(d.amount_2025);
                    return total1 !== 0 ? ((total2 - total1) / Math.abs(total1)) * 100 : 0;
                }
            });
    }

    // Detect unmapped accounts
    detectUnmappedAccounts() {
        try {
            const factTable2024 = this.dataStore.getFactTable('2024');
            const factTable2025 = this.dataStore.getFactTable('2025');
            const hierarchyTable = this.dataStore.getHierarchyTable();

            if (!factTable2024 || !factTable2025 || !hierarchyTable) {
                return [];
            }

            // Get all account codes from hierarchy
            const hierarchyAccounts = new Set(
                hierarchyTable.array('account_code')
            );

            // Check 2024 accounts
            const accounts2024 = factTable2024.array('account_code');
            const unmapped2024 = accounts2024.filter(code => !hierarchyAccounts.has(code));

            // Check 2025 accounts
            const accounts2025 = factTable2025.array('account_code');
            const unmapped2025 = accounts2025.filter(code => !hierarchyAccounts.has(code));

            // Combine and deduplicate
            const allUnmapped = [...new Set([...unmapped2024, ...unmapped2025])];

            this.unmappedAccounts = allUnmapped;

            if (allUnmapped.length > 0) {
                console.warn(`Found ${allUnmapped.length} unmapped accounts:`, allUnmapped);
            }

            return allUnmapped;

        } catch (error) {
            console.error('Error detecting unmapped accounts:', error);
            return [];
        }
    }

    // Validate data completeness
    validateData() {
        const errors = [];
        const warnings = [];

        // Check if combined movements table is loaded
        const combinedMovements = this.dataStore.getCombinedMovements();

        if (!combinedMovements) {
            errors.push('Trial Balance data is not loaded');
        }



        return { errors, warnings, unmappedAccounts: [] };
    }

    // Consolidated statement generation method
    generateStatement(statementType, options = {}) {
        try {
            const combinedMovements = this.validateRequiredData();

            Logger.debug('=== DEBUGGING COLUMNS ===');
            Logger.debug('Combined movements columns:', combinedMovements.columnNames());

            // Filter for specific statement type
            let filtered = combinedMovements.params({ statementType }).filter(d => d.statement_type === statementType);

            Logger.debug('Filtered columns (after statement type filter):', filtered.columnNames());

            // Apply period filters if specified
            // Parse year-period combinations (format: "2024-all", "2024-1", "2024-Q1", "2025-6", etc.)
            const year1 = YEAR_CONFIG.getYear(0);
            const year2 = YEAR_CONFIG.getYear(1);
            const col1 = YEAR_CONFIG.getAmountColumn(year1);
            const col2 = YEAR_CONFIG.getAmountColumn(year2);

            const periodYear1Value = options[`period${year1}`] || `${year1}-all`;
            const periodYear2Value = options[`period${year2}`] || `${year2}-all`;

            // Helper function to parse period value (handles 'all', quarters 'Q1-Q4', and individual periods)
            const parsePeriod = (periodStr) => {
                if (periodStr === 'all') return 999;
                if (periodStr.startsWith('Q')) {
                    const quarter = parseInt(periodStr.substring(1));
                    return quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
                }
                return parseInt(periodStr);
            };

            // Parse first column selection (year-period)
            const [yearStr1, periodStr1] = periodYear1Value.split('-');
            const yearInt1 = parseInt(yearStr1);
            const periodInt1 = parsePeriod(periodStr1);

            // Parse second column selection (year-period)
            const [yearStr2, periodStr2] = periodYear2Value.split('-');
            const yearInt2 = parseInt(yearStr2);
            const periodInt2 = parsePeriod(periodStr2);

            // Filter data based on selected year-period combinations
            if (periodYear1Value !== `${year1}-all` || periodYear2Value !== `${year2}-all`) {
                filtered = filtered
                    .params({
                        yearInt1: yearInt1,
                        periodInt1: periodInt1,
                        yearInt2: yearInt2,
                        periodInt2: periodInt2
                    })
                    .filter(d =>
                        (d.year === yearInt1 && d.period <= periodInt1) ||
                        (d.year === yearInt2 && d.period <= periodInt2)
                    );
            }

            // Use conditional aggregation to get both columns in one pass (no join needed!)
            // Include level codes for proper sorting
            // For Income Statement, flip the sign to show revenue as positive
            // For Balance Sheet Passiva (code1 60-90), flip the sign to show as positive
            // Note: Arquero requires static column names in rollup operations.
            // We keep amount_2024/amount_2025 as column identifiers, but they represent
            // the dynamically selected year-period combinations via col1/col2 references.
            const signMultiplier = statementType === STATEMENT_TYPES.INCOME_STATEMENT ? -1 : 1;

            Logger.debug('Columns in filtered table (before groupby):', filtered.columnNames());
            Logger.debug('About to groupby with columns:', ['name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description']);

            const aggregated = filtered
                .params({
                    col1Year: yearInt1,
                    col2Year: yearInt2,
                    signMult: signMultiplier
                })
                .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
                .rollup({
                    amount_2024: d => aq.op.sum(d.year === col1Year ? d.movement_amount * signMult : 0),
                    amount_2025: d => aq.op.sum(d.year === col2Year ? d.movement_amount * signMult : 0)
                });

            Logger.debug('Columns after aggregation:', aggregated.columnNames());
            Logger.debug('Sample aggregated row:', aggregated.objects()[0]);

            // For Balance Sheet, flip sign for Passiva accounts to show as positive
            let processedData = aggregated;
            if (statementType === STATEMENT_TYPES.BALANCE_SHEET) {
                processedData = AccountSignHandler.flipSignForPassiva(aggregated, col1, col2);
            }

            // Add ordering if specified - sort by level codes for proper order (all 3 levels)
            const ordered = options.orderBy ? processedData.orderby('code1', 'code2', 'code3') : processedData;

            // Calculate variances
            const withVariances = this.deriveVarianceColumns(ordered);

            // Calculate category totals
            const categoryTotals = this.calculateCategoryTotals(withVariances);

            // Build result object
            const result = {
                details: withVariances,
                totals: categoryTotals
            };

            // Add statement-specific calculations
            if (options.calculateMetrics) {
                result.metrics = options.calculateMetrics(categoryTotals);
            }

            if (options.validateBalance) {
                const validation = options.validateBalance(categoryTotals);
                Object.assign(result, validation);
            }

            return result;

        } catch (error) {
            const statementName = options.name || 'Statement';
            console.error(`Error generating ${statementName}:`, error);
            throw error;
        }
    }

    // Generate Balance Sheet
    generateBalanceSheet(options = {}) {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        return this.generateStatement(STATEMENT_TYPES.BALANCE_SHEET, {
            name: 'Balance Sheet',
            [`period${year1}`]: options[`period${year1}`],
            [`period${year2}`]: options[`period${year2}`],
            validateBalance: (categoryTotals) => {
                // Use latest year for balance validation
                const latestYear = YEAR_CONFIG.getYear(YEAR_CONFIG.yearCount - 1);
                const latestCol = YEAR_CONFIG.getAmountColumn(latestYear);

                const totals = categoryTotals.objects();
                let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

                totals.forEach(row => {
                    if (CategoryMatcher.isAsset(row.name1)) {
                        totalAssets += row[latestCol] || 0;
                    } else if (CategoryMatcher.isLiability(row.name1)) {
                        totalLiabilities += row[latestCol] || 0;
                    } else if (CategoryMatcher.isEquity(row.name1)) {
                        totalEquity += row[latestCol] || 0;
                    }
                });

                const imbalance = Math.abs(totalAssets - (totalLiabilities + totalEquity));
                if (imbalance > VALIDATION_CONFIG.BALANCE_TOLERANCE) {
                    console.warn(`Balance Sheet imbalance: ${imbalance.toFixed(2)}`);
                    console.warn(`Total Assets: ${totalAssets.toFixed(2)}`);
                    console.warn(`Total Liabilities: ${totalLiabilities.toFixed(2)}`);
                    console.warn(`Total Equity: ${totalEquity.toFixed(2)}`);
                }

                return {
                    balanced: imbalance <= VALIDATION_CONFIG.BALANCE_TOLERANCE,
                    imbalance: imbalance
                };
            }
        });
    }

    // Generate Income Statement
    generateIncomeStatement(options = {}) {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        return this.generateStatement(STATEMENT_TYPES.INCOME_STATEMENT, {
            name: 'Income Statement',
            orderBy: true,
            [`period${year1}`]: options[`period${year1}`],
            [`period${year2}`]: options[`period${year2}`],
            calculateMetrics: (categoryTotals) => {
                // Use YEAR_CONFIG for dynamic year references
                const year1 = YEAR_CONFIG.getYear(0);
                const year2 = YEAR_CONFIG.getYear(1);
                const col1 = YEAR_CONFIG.getAmountColumn(year1);
                const col2 = YEAR_CONFIG.getAmountColumn(year2);

                // Simple roll-up: sum ALL Income Statement categories
                // No need for complex category matching - just add everything up
                const totals = categoryTotals.objects();
                let netIncome1 = 0;
                let netIncome2 = 0;

                totals.forEach(row => {
                    netIncome1 += row[col1] || 0;
                    netIncome2 += row[col2] || 0;
                });

                console.log(`Income Statement Net Income: ${year1}=${netIncome1.toFixed(2)}, ${year2}=${netIncome2.toFixed(2)}`);

                // Return simple totals (no gross profit or operating income breakdown)
                return {
                    netIncome: { [year1]: netIncome1, [year2]: netIncome2 }
                };
            }
        });
    }

    // Generate Cash Flow Statement (Indirect Method - Calculated from Balance Sheet and Income Statement)
    generateCashFlowStatement(options = {}) {
        try {
            const year1 = YEAR_CONFIG.getYear(0); // First year (e.g., '2024')
            const year2 = YEAR_CONFIG.getYear(1); // Second year (e.g., '2025')
            const col1 = YEAR_CONFIG.getAmountColumn(year1); // 'amount_2024'
            const col2 = YEAR_CONFIG.getAmountColumn(year2); // 'amount_2025'

            // Get Income Statement to extract Net Income
            const incomeStatement = this.generateIncomeStatement(options);
            const incomeDetails = incomeStatement.details.objects();

            // Get Balance Sheet to calculate changes in working capital
            const balanceSheet = this.generateBalanceSheet(options);
            const balanceDetails = balanceSheet.details.objects();

            // Get Net Income from Income Statement metrics (to ensure consistency)
            const netIncome1 = incomeStatement.metrics.netIncome[year1];
            const netIncome2 = incomeStatement.metrics.netIncome[year2];

            // Calculate changes in Balance Sheet items (working capital changes)
            const cashFlowData = [];

            // Operating Activities
            cashFlowData.push({
                code0: 'CF',
                name0: 'Cash Flow',
                code1: 'OP',
                name1: 'Operating Activities',
                code2: '01',
                name2: 'Net Income',
                [col1]: netIncome1,
                [col2]: netIncome2
            });

            // Add back non-cash expenses (depreciation, amortization)
            balanceDetails.forEach(row => {
                if (CategoryMatcher.isDepreciation(row.name2)) {
                    cashFlowData.push({
                        code0: 'CF',
                        name0: 'Cash Flow',
                        code1: 'OP',
                        name1: 'Operating Activities',
                        code2: '02',
                        name2: row.name2,
                        [col1]: Math.abs(row.variance_amount || 0),
                        [col2]: Math.abs(row.variance_amount || 0)
                    });
                }
            });

            // Changes in working capital (current assets and liabilities)
            balanceDetails.forEach(row => {
                if (CategoryMatcher.isCurrentAsset(row.name1)) {
                    const change = (row[col2] || 0) - (row[col1] || 0);
                    if (Math.abs(change) > 0) {
                        cashFlowData.push({
                            code0: 'CF',
                            name0: 'Cash Flow',
                            code1: 'OP',
                            name1: 'Operating Activities',
                            code2: '03',
                            name2: `Change in ${row.name2}`,
                            [col1]: 0,
                            [col2]: -change // Negative because increase in assets uses cash
                        });
                    }
                }
            });

            // Investing Activities (changes in fixed assets)
            balanceDetails.forEach(row => {
                if (CategoryMatcher.isFixedAsset(row.name1)) {
                    const change = (row[col2] || 0) - (row[col1] || 0);
                    if (Math.abs(change) > 0) {
                        cashFlowData.push({
                            code0: 'CF',
                            name0: 'Cash Flow',
                            code1: 'IN',
                            name1: 'Investing Activities',
                            code2: '01',
                            name2: row.name2,
                            [col1]: 0,
                            [col2]: -change
                        });
                    }
                }
            });

            // Financing Activities (changes in equity and long-term liabilities)
            balanceDetails.forEach(row => {
                if (CategoryMatcher.isLongTermLiability(row.name1)) {
                    const change = (row[col2] || 0) - (row[col1] || 0);
                    if (Math.abs(change) > 0) {
                        cashFlowData.push({
                            code0: 'CF',
                            name0: 'Cash Flow',
                            code1: 'FI',
                            name1: 'Financing Activities',
                            code2: '01',
                            name2: row.name2,
                            [col1]: 0,
                            [col2]: change
                        });
                    }
                }
            });

            // Convert to Arquero table
            const cashFlowTable = aq.from(cashFlowData);

            // Calculate variances
            const withVariances = this.deriveVarianceColumns(cashFlowTable);

            // Calculate category totals
            const categoryTotals = this.calculateCategoryTotals(withVariances);

            // Calculate net change in cash
            const totals = categoryTotals.objects();
            let operating1 = 0, operating2 = 0;
            let investing1 = 0, investing2 = 0;
            let financing1 = 0, financing2 = 0;

            totals.forEach(row => {
                if (row.name1 === 'Operating Activities') {
                    operating1 = row[col1];
                    operating2 = row[col2];
                } else if (row.name1 === 'Investing Activities') {
                    investing1 = row[col1];
                    investing2 = row[col2];
                } else if (row.name1 === 'Financing Activities') {
                    financing1 = row[col1];
                    financing2 = row[col2];
                }
            });

            const netChange1 = operating1 + investing1 + financing1;
            const netChange2 = operating2 + investing2 + financing2;

            // Get starting cash from Balance Sheet (cash and cash equivalents)
            let startingCash1 = 0, startingCash2 = 0;
            balanceDetails.forEach(row => {
                if (row.name2) {
                    const subcategoryLower = row.name2.toLowerCase();
                    if (CATEGORY_DEFINITIONS.CASH.some(cat => subcategoryLower.includes(cat))) {
                        startingCash1 += row[col1] || 0;
                        startingCash2 += row[col2] || 0;
                    }
                }
            });

            // Calculate ending cash
            const endingCash1 = startingCash1 + netChange1;
            const endingCash2 = startingCash2 + netChange2;

            return {
                details: withVariances,
                totals: categoryTotals,
                metrics: {
                    netIncome: {
                        [year1]: netIncome1,
                        [year2]: netIncome2
                    },
                    netChange: {
                        [year1]: netChange1,
                        [year2]: netChange2,
                        variance: netChange2 - netChange1
                    },
                    startingCash: {
                        [year1]: startingCash1,
                        [year2]: startingCash2
                    },
                    endingCash: {
                        [year1]: endingCash1,
                        [year2]: endingCash2
                    }
                }
            };

        } catch (error) {
            console.error('Error generating Cash Flow Statement:', error);
            throw error;
        }
    }

    // Calculate variance between two periods
    calculateVariance(period1, period2) {
        try {
            const factTable1 = this.dataStore.getFactTable(period1);
            const factTable2 = this.dataStore.getFactTable(period2);

            if (!factTable1 || !factTable2) {
                throw new Error(`Data for periods ${period1} or ${period2} not loaded`);
            }

            // Rename amount columns to distinguish periods
            const table1 = factTable1
                .select('account_code', 'account_description', 'movement_amount')
                .rename({ movement_amount: `amount_${period1}` });

            const table2 = factTable2
                .select('account_code', 'movement_amount')
                .rename({ movement_amount: `amount_${period2}` });

            // Join tables on account_code
            const joined = table1
                .join_full(table2, 'account_code')
                .derive({
                    [`amount_${period1}`]: d => d[`amount_${period1}`] || 0,
                    [`amount_${period2}`]: d => d[`amount_${period2}`] || 0,
                    variance_amount: d => (d[`amount_${period2}`] || 0) - (d[`amount_${period1}`] || 0),
                    variance_percent: d => {
                        const amt1 = d[`amount_${period1}`] || 0;
                        const amt2 = d[`amount_${period2}`] || 0;

                        // Handle division by zero
                        if (amt1 === 0) {
                            return amt2 === 0 ? 0 : null; // Return null for N/A cases
                        }

                        return ((amt2 - amt1) / Math.abs(amt1)) * 100;
                    }
                });

            return joined;

        } catch (error) {
            console.error('Error calculating variance:', error);
            throw error;
        }
    }
}

export default StatementGenerator;
