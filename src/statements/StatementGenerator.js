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
    CATEGORY_DEFINITIONS,
    APP_CONFIG,
    isLTMSelected
} from '../constants.js';
import CategoryMatcher from '../utils/CategoryMatcher.js';
import VarianceCalculator from '../utils/VarianceCalculator.js';
import Logger from '../utils/Logger.js';
import AccountSignHandler from '../utils/AccountSignHandler.js';
import LTMCalculator from '../utils/LTMCalculator.js';
import {
    buildNormalModeSpec,
    buildLTMModeSpec,
    buildLTMCategoryTotalsSpec,
    buildCategoryTotalsSpec
} from '../utils/RollupSpecBuilder.js';
import ReportRenderer from '../reports/ReportRenderer.js';
import VariableResolver from '../reports/VariableResolver.js';
import ExpressionEvaluator from '../reports/ExpressionEvaluator.js';
import FilterEngine from '../reports/FilterEngine.js';

class StatementGenerator {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.unmappedAccounts = [];
        
        // Initialize report definition components
        this.filterEngine = new FilterEngine();
        this.variableResolver = new VariableResolver(this.filterEngine);
        this.expressionEvaluator = new ExpressionEvaluator();
        this.reportRenderer = new ReportRenderer(this.variableResolver, this.expressionEvaluator);
    }

    // Helper: Calculate variance percentage
    calculateVariancePercent(amt2024, amt2025) {
        return VarianceCalculator.calculatePercent(amt2025, amt2024);
    }

    // Helper: Validate required data is loaded and return appropriate data based on view type
    validateRequiredData(statementType = null) {
        // Determine view type from UI dropdown (if available, otherwise default to cumulative)
        let viewType = 'cumulative';
        if (typeof document !== 'undefined') {
            viewType = document.getElementById('view-type')?.value || 'cumulative';
        }

        // Income Statement ALWAYS uses movements (never balances)
        // For cumulative view, we'll sum movements up to the selected period
        // For period view, we'll show individual period movements
        // Balance Sheet ALWAYS uses balances (cumulative data) - it shows position at a point in time
        const useMovements = statementType === STATEMENT_TYPES.INCOME_STATEMENT;

        const combinedData = useMovements
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

    // Helper: Calculate category totals (Normal Mode - 2 columns)
    calculateCategoryTotals(combined) {
        // Note: Arquero requires static column names in rollup operations
        // We use amount_2024/amount_2025 as the column identifiers
        const rollupSpec = buildCategoryTotalsSpec();
        return combined
            .groupby('name1')
            .rollup(rollupSpec);
    }

    // Helper: Calculate category totals (LTM Mode - 12+ columns)
    calculateLTMCategoryTotals(combined, ltmInfo, statementType) {
        // Build rollup spec dynamically based on LTM ranges using RollupSpecBuilder
        const rollupSpec = buildLTMCategoryTotalsSpec(ltmInfo.ranges, statementType);
        return combined
            .groupby('name1')
            .rollup(rollupSpec);
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
            const combinedMovements = this.validateRequiredData(statementType);

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
                if (periodStr === 'all') return APP_CONFIG.ALL_PERIODS_CODE;
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

            // Determine view type from UI dropdown
            let viewType = 'cumulative';
            if (typeof document !== 'undefined') {
                viewType = document.getElementById('view-type')?.value || 'cumulative';
            }

            // Balance Sheet ALWAYS uses cumulative view (it shows position at a point in time)
            // Income Statement respects the view type selection
            if (statementType === STATEMENT_TYPES.BALANCE_SHEET) {
                viewType = 'cumulative';
            }

            // Initialize LTM label storage
            let ltmLabel1 = null;
            let ltmLabel2 = null;

            // Check for LTM (Latest Twelve Months) selection
            const isLTM1 = isLTMSelected(periodStr1);
            const isLTM2 = isLTMSelected(periodStr2);
            const isLTMMode = isLTM1 || isLTM2;

            // Store LTM info for later use in column generation
            let ltmInfo = null;

            if (isLTMMode) {
                // Get available years from dataStore
                const availableYears = this.dataStore.getMovementsTable('2024') && this.dataStore.getMovementsTable('2025')
                    ? [2024, 2025]
                    : this.dataStore.getMovementsTable('2025')
                    ? [2025]
                    : this.dataStore.getMovementsTable('2024')
                    ? [2024]
                    : [];

                Logger.debug('LTM Calculation Debug', {
                    availableYears,
                    has2024: !!this.dataStore.getMovementsTable('2024'),
                    has2025: !!this.dataStore.getMovementsTable('2025'),
                    filteredRows: filtered.numRows(),
                    statementType: this.statementType
                });

                // Validate that we have data for LTM calculation
                if (availableYears.length === 0) {
                    throw new Error('No data available for LTM calculation. Please load trial balance files first.');
                }

                if (filtered.numRows() === 0) {
                    throw new Error('No movements data available for LTM calculation. The selected statement type may not have any data.');
                }

                // Calculate LTM info
                ltmInfo = LTMCalculator.calculateLTMInfo(
                    filtered,
                    availableYears,
                    YEAR_CONFIG.LTM.MONTHS_COUNT
                );

                Logger.debug('LTM Info Calculated', {
                    latest: ltmInfo.latest,
                    ranges: ltmInfo.ranges,
                    label: ltmInfo.label,
                    filteredDataRows: ltmInfo.filteredData?.numRows(),
                    complete: ltmInfo.availability.complete,
                    message: ltmInfo.availability.message
                });

                // Validate that LTM calculation returned data
                if (!ltmInfo || !ltmInfo.filteredData || ltmInfo.filteredData.numRows() === 0) {
                    Logger.warn('LTM calculation returned no data', {
                        availableYears,
                        latestPeriod: ltmInfo?.latest,
                        ranges: ltmInfo?.ranges
                    });
                }

                // Handle LTM for column 1
                if (isLTM1) {
                    filtered = ltmInfo.filteredData;
                    ltmLabel1 = ltmInfo.label;

                    // Display warning if incomplete data
                    if (!ltmInfo.availability.complete) {
                        console.warn(`LTM Column 1: ${ltmInfo.availability.message}`);
                        if (typeof document !== 'undefined') {
                            const warningEl = document.getElementById('ltm-warning');
                            if (warningEl) {
                                warningEl.textContent = `⚠️ ${ltmInfo.availability.message}`;
                                warningEl.style.display = 'block';
                            }
                        }
                    }
                }

                // Handle LTM for column 2 (if different from column 1)
                if (isLTM2 && !isLTM1) {
                    // If only column 2 is LTM, use the filtered data
                    filtered = ltmInfo.filteredData;
                    ltmLabel2 = ltmInfo.label;

                    // Display warning if incomplete data
                    if (!ltmInfo.availability.complete) {
                        console.warn(`LTM Column 2: ${ltmInfo.availability.message}`);
                        if (typeof document !== 'undefined') {
                            const warningEl = document.getElementById('ltm-warning');
                            if (warningEl) {
                                warningEl.textContent = `⚠️ ${ltmInfo.availability.message}`;
                                warningEl.style.display = 'block';
                            }
                        }
                    }
                } else if (isLTM2 && isLTM1) {
                    // Both columns are LTM - use same label
                    ltmLabel2 = ltmInfo.label;
                }

                Logger.debug('LTM filtering applied:', {
                    label1: ltmLabel1,
                    label2: ltmLabel2,
                    ranges: ltmInfo.ranges,
                    availability: ltmInfo.availability
                });
            }

            // Filter data based on selected year-period combinations (skip if LTM already applied)
            if (!isLTM1 && !isLTM2 && (periodYear1Value !== `${year1}-all` || periodYear2Value !== `${year2}-all`)) {
                if (viewType === 'period') {
                    // Period view: Show only the specific period (exact match)
                    filtered = filtered
                        .params({
                            yearInt1: yearInt1,
                            periodInt1: periodInt1,
                            yearInt2: yearInt2,
                            periodInt2: periodInt2
                        })
                        .filter(d =>
                            (d.year === yearInt1 && d.period === periodInt1) ||
                            (d.year === yearInt2 && d.period === periodInt2)
                        );
                } else {
                    // Cumulative view: Show all periods up to selected period (<=)
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
            }

            // Use conditional aggregation to get columns
            // For LTM mode: create 12 dynamic period columns
            // For normal mode: create 2 year columns
            // For Income Statement, flip the sign to show revenue as positive
            // For Balance Sheet Passiva (code1 60-90), flip the sign to show as positive
            const signMultiplier = statementType === STATEMENT_TYPES.INCOME_STATEMENT ? -1 : 1;

            Logger.debug('Columns in filtered table (before groupby):', filtered.columnNames());
            Logger.debug('About to groupby with columns:', ['name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description']);

            let aggregated;

            if (isLTMMode && ltmInfo && ltmInfo.ranges) {
                // LTM Mode: Create 12 dynamic period columns using RollupSpecBuilder
                Logger.debug('LTM Mode: Creating 12 period columns', { ranges: ltmInfo.ranges });

                const rollupSpec = buildLTMModeSpec(ltmInfo.ranges, signMultiplier, statementType);
                Logger.debug('LTM Rollup spec:', Object.keys(rollupSpec));

                aggregated = filtered
                    .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
                    .rollup(rollupSpec);

            } else {
                // Normal Mode: Create 2 year columns using RollupSpecBuilder
                const rollupSpec = buildNormalModeSpec(yearInt1, yearInt2, signMultiplier);

                aggregated = filtered
                    .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
                    .rollup(rollupSpec);
            }

            Logger.debug('Columns after aggregation:', aggregated.columnNames());
            Logger.debug('Sample aggregated row:', aggregated.objects()[0]);

            // For Balance Sheet, flip sign for Passiva accounts to show as positive
            let processedData = aggregated;
            if (statementType === STATEMENT_TYPES.BALANCE_SHEET) {
                processedData = AccountSignHandler.flipSignForPassiva(aggregated, col1, col2);
            }

            // Add ordering if specified - sort by level codes for proper order (all 3 levels)
            const ordered = options.orderBy ? processedData.orderby('code1', 'code2', 'code3') : processedData;

            // Calculate variances and totals
            // Note: In LTM mode, we skip variance calculation (no 2-column comparison)
            let withVariances, categoryTotals;

            if (isLTMMode) {
                // LTM Mode: Skip variance derivation, use ordered data directly
                withVariances = ordered;
                // Calculate category totals using dynamic month columns
                categoryTotals = this.calculateLTMCategoryTotals(ordered, ltmInfo, statementType);
            } else {
                // Normal Mode: Calculate variances between two year columns
                withVariances = this.deriveVarianceColumns(ordered);
                categoryTotals = this.calculateCategoryTotals(withVariances);
            }

            // Build result object
            const result = {
                details: withVariances,
                totals: categoryTotals
            };

            // Add LTM labels if LTM was used
            if (ltmLabel1 || ltmLabel2) {
                result.ltmLabels = {
                    column1: ltmLabel1,
                    column2: ltmLabel2
                };
            }

            // Add LTM info for multi-column rendering
            if (isLTMMode && ltmInfo) {
                result.isLTMMode = true;
                result.ltmInfo = ltmInfo;
                result.statementType = statementType; // Needed to determine column behavior
            }

            // Add statement-specific calculations
            // Skip metrics calculation in LTM mode (metrics use amount_2024/amount_2025 columns)
            if (options.calculateMetrics && !isLTMMode) {
                // Pass withVariances (account-level data) instead of processedData
                // This has the proper amount_2024/amount_2025 columns after aggregation
                result.metrics = options.calculateMetrics(categoryTotals, withVariances);
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

    /**
     * Generate statement from report definition
     * 
     * This method provides the new configurable report generation system.
     * It uses report definitions (JSON) to generate financial statements
     * instead of hardcoded logic.
     * 
     * @param {Object} reportDef - Report definition object
     * @param {Object} options - Generation options
     * @param {string} options.period2024 - Period selection for 2024 (e.g., "2024-all", "2024-6", "2024-Q1")
     * @param {string} options.period2025 - Period selection for 2025 (e.g., "2025-all", "2025-6", "2025-Q1")
     * @param {string} options.varianceMode - Variance display mode (Amount, Percent, Both, None)
     * @param {string} options.detailLevel - Detail level (All Levels, Summary Only)
     * @returns {Object} Statement data with rows ready for ag-Grid
     * 
     * @example
     * const reportDef = registry.getReport('income_statement_nl');
     * const statement = generator.generateStatementFromDefinition(reportDef, {
     *   period2024: '2024-all',
     *   period2025: '2025-all',
     *   varianceMode: 'Both',
     *   detailLevel: 'All Levels'
     * });
     */
    generateStatementFromDefinition(reportDef, options = {}) {
        if (!reportDef) {
            throw new Error('Report definition is required');
        }

        try {
            // Get movements data based on statement type
            const statementType = this._mapStatementType(reportDef.statementType);
            const combinedMovements = this.validateRequiredData(statementType);

            // Filter for specific statement type
            let filtered = combinedMovements
                .params({ statementType })
                .filter(d => d.statement_type === statementType);

            // Build period options from the options parameter
            const periodOptions = this._buildPeriodOptions(options);

            // Apply period filtering if needed
            filtered = this._applyPeriodFiltering(filtered, options, statementType);

            // Render statement using report definition
            const statementData = this.reportRenderer.renderStatement(
                reportDef,
                filtered,
                periodOptions
            );

            // Transform to format expected by existing UI components
            const result = this._transformToLegacyFormat(statementData, options);

            // Add metadata
            result.reportDefinition = {
                reportId: reportDef.reportId,
                name: reportDef.name,
                version: reportDef.version,
                statementType: reportDef.statementType
            };

            return result;

        } catch (error) {
            console.error('Error generating statement from definition:', error);
            throw new Error(`Failed to generate statement from definition: ${error.message}`);
        }
    }

    // REMOVED: Feature flag methods - Configurable reports are now the only option

    /**
     * Map report definition statement type to internal statement type
     * 
     * @private
     * @param {string} reportStatementType - Statement type from report definition (balance, income, cashflow)
     * @returns {string} Internal statement type constant
     */
    _mapStatementType(reportStatementType) {
        const mapping = {
            'balance': STATEMENT_TYPES.BALANCE_SHEET,
            'income': STATEMENT_TYPES.INCOME_STATEMENT,
            'cashflow': STATEMENT_TYPES.CASH_FLOW_STATEMENT
        };

        const mapped = mapping[reportStatementType];
        if (!mapped) {
            throw new Error(`Unknown statement type in report definition: ${reportStatementType}`);
        }

        return mapped;
    }

    /**
     * Build period options object from generation options
     * 
     * @private
     * @param {Object} options - Generation options
     * @returns {Object} Period options for report renderer
     */
    _buildPeriodOptions(options) {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        return {
            years: [year1, year2],
            period2024: options.period2024 || `${year1}-all`,
            period2025: options.period2025 || `${year2}-all`,
            varianceMode: options.varianceMode || 'Both',
            detailLevel: options.detailLevel || 'All Levels'
        };
    }

    /**
     * Apply period filtering to movements data
     * 
     * @private
     * @param {Object} filtered - Arquero table with filtered data
     * @param {Object} options - Generation options
     * @param {string} statementType - Statement type
     * @returns {Object} Filtered Arquero table
     */
    _applyPeriodFiltering(filtered, options, statementType) {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        const periodYear1Value = options[`period${year1}`] || `${year1}-all`;
        const periodYear2Value = options[`period${year2}`] || `${year2}-all`;

        // Helper function to parse period value
        const parsePeriod = (periodStr) => {
            if (periodStr === 'all') return APP_CONFIG.ALL_PERIODS_CODE;
            if (periodStr.startsWith('Q')) {
                const quarter = parseInt(periodStr.substring(1));
                return quarter * 3;
            }
            return parseInt(periodStr);
        };

        // Parse period selections
        const [yearStr1, periodStr1] = periodYear1Value.split('-');
        const yearInt1 = parseInt(yearStr1);
        const periodInt1 = parsePeriod(periodStr1);

        const [yearStr2, periodStr2] = periodYear2Value.split('-');
        const yearInt2 = parseInt(yearStr2);
        const periodInt2 = parsePeriod(periodStr2);

        // Determine view type
        let viewType = 'cumulative';
        if (typeof document !== 'undefined') {
            viewType = document.getElementById('view-type')?.value || 'cumulative';
        }

        // Balance Sheet always uses cumulative view
        if (statementType === STATEMENT_TYPES.BALANCE_SHEET) {
            viewType = 'cumulative';
        }

        // Check for LTM selection
        const isLTM1 = isLTMSelected(periodStr1);
        const isLTM2 = isLTMSelected(periodStr2);

        // Skip filtering if showing all periods or if LTM is selected
        if ((periodYear1Value === `${year1}-all` && periodYear2Value === `${year2}-all`) || isLTM1 || isLTM2) {
            return filtered;
        }

        // Apply period filtering based on view type
        if (viewType === 'period') {
            // Period view: Show only the specific period
            return filtered
                .params({
                    yearInt1: yearInt1,
                    periodInt1: periodInt1,
                    yearInt2: yearInt2,
                    periodInt2: periodInt2
                })
                .filter(d =>
                    (d.year === yearInt1 && d.period === periodInt1) ||
                    (d.year === yearInt2 && d.period === periodInt2)
                );
        } else {
            // Cumulative view: Show all periods up to selected period
            return filtered
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
    }

    /**
     * Transform statement data to legacy format expected by UI components
     * 
     * @private
     * @param {Object} statementData - Statement data from report renderer
     * @param {Object} options - Generation options
     * @returns {Object} Statement data in legacy format
     */
    _transformToLegacyFormat(statementData, options) {
        // Convert rows array to Arquero table for compatibility
        const rowsData = statementData.rows.map(row => ({
            // Core fields
            order: row.order,
            label: row.label,
            type: row.type,
            style: row.style,
            indent: row.indent,
            
            // Amount fields
            amount_2024: row.amount_2024,
            amount_2025: row.amount_2025,
            variance_amount: row.variance_amount,
            variance_percent: row.variance_percent,
            
            // Formatted fields
            formatted_2024: row.formatted_2024,
            formatted_2025: row.formatted_2025,
            formatted_variance_amount: row.formatted_variance_amount,
            formatted_variance_percent: row.formatted_variance_percent,
            
            // Metadata
            _metadata: row._metadata
        }));

        const detailsTable = aq.from(rowsData);

        // Create a simple totals table (for compatibility)
        // In configurable reports, totals are calculated within the layout
        const totalsTable = aq.from([]);

        return {
            details: detailsTable,
            totals: totalsTable,
            rows: statementData.rows, // Keep original rows for direct access
            metadata: {
                ...statementData.metadata,
                generatedAt: statementData.generatedAt,
                reportId: statementData.reportId,
                reportName: statementData.reportName,
                reportVersion: statementData.reportVersion
            }
        };
    }

    // REMOVED: generateBalanceSheet() - Use generateStatementFromDefinition() with report definitions instead

    // REMOVED: generateIncomeStatement() - Use generateStatementFromDefinition() with report definitions instead

    // REMOVED: generateCashFlowStatement() - Use generateStatementFromDefinition() with report definitions instead

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
