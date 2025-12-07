import Logger from '../utils/Logger.ts';
import { ErrorFactory } from '../errors/index.ts';

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
} from '../constants.ts';
import { calculateVariancePercent } from '../core/calculations/variance.ts';
import { flipSignForPassiva } from '../core/transformations/sign.ts';
import { calculateLTMInfo } from '../core/calculations/ltm.ts';
import {
    buildNormalModeSpec,
    buildLTMModeSpec,
    buildLTMCategoryTotalsSpec,
    buildCategoryTotalsSpec
} from '../utils/RollupSpecBuilder.ts';
import ReportRenderer from '../reports/ReportRenderer.ts';
import VariableResolver from '../reports/VariableResolver.ts';
import ExpressionEvaluator from '../reports/ExpressionEvaluatorCompat.ts';
import FilterEngine from '../reports/FilterEngine.ts';
import DataStore from '../data/DataStore.ts';
import type { ReportDefinition } from '../reports/ReportValidator.ts';

// Type alias for Arquero table
type ArqueroTable = any;

interface LTMRange {
    readonly year: number;
    readonly startPeriod: number;
    readonly endPeriod: number;
}

interface LTMInfo {
    readonly ranges: readonly LTMRange[];
    readonly latest: { readonly year: number; readonly period: number };
    readonly label: string;
    readonly filteredData: ArqueroTable;
    readonly availability: {
        readonly complete: boolean;
        readonly message: string;
    };
}

interface StatementMetrics {
    [key: string]: any;
}

interface StatementResult {
    details: ArqueroTable;
    totals: ArqueroTable;
    ltmLabels?: {
        column1: string | null;
        column2: string | null;
    };
    isLTMMode?: boolean;
    ltmInfo?: LTMInfo;
    statementType?: string;
    metrics?: StatementMetrics;
    balanced?: boolean;
    imbalance?: number;
    rows?: any[];
    metadata?: any;
    reportDefinition?: {
        reportId: string;
        name: string;
        version: string;
        statementType: string;
    };
}

interface GenerationOptions {
    period2024?: string;
    period2025?: string;
    varianceMode?: string;
    detailLevel?: string;
    orderBy?: boolean;
    name?: string;
    calculateMetrics?: (totals: ArqueroTable, details: ArqueroTable) => StatementMetrics;
    validateBalance?: (totals: ArqueroTable) => { balanced: boolean; imbalance?: number };
}

interface ValidationResult {
    errors: string[];
    warnings: string[];
    unmappedAccounts: string[];
}

class StatementGenerator {
    private dataStore: DataStore;
    private unmappedAccounts: string[];
    private filterEngine: FilterEngine;
    private variableResolver: VariableResolver;
    private expressionEvaluator: ExpressionEvaluator;
    private reportRenderer: ReportRenderer;

    constructor(dataStore: DataStore) {
        this.dataStore = dataStore;
        this.unmappedAccounts = [];
        
        // Initialize report definition components
        this.filterEngine = new FilterEngine();
        this.variableResolver = new VariableResolver(this.filterEngine);
        this.expressionEvaluator = new ExpressionEvaluator();
        this.reportRenderer = new ReportRenderer(this.variableResolver, this.expressionEvaluator);
    }

    // Helper: Calculate variance percentage
    calculateVariancePercent(amt2024: number, amt2025: number): number {
        return calculateVariancePercent(amt2025, amt2024);
    }

    // Helper: Validate required data is loaded and return appropriate data based on view type
    validateRequiredData(statementType: string | null = null): ArqueroTable {
        // Determine view type from UI dropdown (if available, otherwise default to cumulative)
        let viewType = 'cumulative';
        if (typeof document !== 'undefined') {
            viewType = (document.getElementById('view-type') as HTMLSelectElement)?.value || 'cumulative';
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
            throw ErrorFactory.missingConfig('trialBalanceData', 
                new Error(`Required ${viewType} data not loaded`));
        }

        Logger.debug(`Using ${viewType} view for statement generation (${combinedData.numRows()} rows)`);
        return combinedData;
    }

    // Helper: Calculate variance columns
    deriveVarianceColumns(combined: ArqueroTable): ArqueroTable {
        // Note: Arquero requires static column names in derive operations
        // We use amount_2024/amount_2025 as the column identifiers
        return combined.derive({
            amount_2024: (d: any) => d.amount_2024 || 0,
            amount_2025: (d: any) => d.amount_2025 || 0,
            variance_amount: (d: any) => (d.amount_2025 || 0) - (d.amount_2024 || 0),
            variance_percent: (d: any) => {
                const amt1 = d.amount_2024 || 0;
                const amt2 = d.amount_2025 || 0;
                return amt1 !== 0 ? ((amt2 - amt1) / Math.abs(amt1)) * 100 : 0;
            }
        });
    }

    // Helper: Calculate category totals (Normal Mode - 2 columns)
    calculateCategoryTotals(combined: ArqueroTable): ArqueroTable {
        // Note: Arquero requires static column names in rollup operations
        // We use amount_2024/amount_2025 as the column identifiers
        const rollupSpec = buildCategoryTotalsSpec();
        return combined
            .groupby('name1')
            .rollup(rollupSpec);
    }

    // Helper: Calculate category totals (LTM Mode - 12+ columns)
    calculateLTMCategoryTotals(combined: ArqueroTable, ltmInfo: LTMInfo, statementType: string): ArqueroTable {
        // Build rollup spec dynamically based on LTM ranges using RollupSpecBuilder
        const rollupSpec = buildLTMCategoryTotalsSpec(ltmInfo.ranges, statementType);
        return combined
            .groupby('name1')
            .rollup(rollupSpec);
    }

    // Detect unmapped accounts
    detectUnmappedAccounts(): string[] {
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
            const unmapped2024 = accounts2024.filter((code: string) => !hierarchyAccounts.has(code));

            // Check 2025 accounts
            const accounts2025 = factTable2025.array('account_code');
            const unmapped2025 = accounts2025.filter((code: string) => !hierarchyAccounts.has(code));

            // Combine and deduplicate
            const allUnmapped = [...new Set([...unmapped2024, ...unmapped2025])];

            this.unmappedAccounts = allUnmapped;

            if (allUnmapped.length > 0) {
                Logger.warn(`Found ${allUnmapped.length} unmapped accounts:`, allUnmapped);
            }

            return allUnmapped;

        } catch (error) {
            Logger.error('Error detecting unmapped accounts:', error);
            return [];
        }
    }

    // Validate data completeness
    validateData(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if combined movements table is loaded
        const combinedMovements = this.dataStore.getCombinedMovements();

        if (!combinedMovements) {
            errors.push('Trial Balance data is not loaded');
        }

        return { errors, warnings, unmappedAccounts: [] };
    }

    // Consolidated statement generation method
    generateStatement(statementType: string, options: GenerationOptions = {}): StatementResult {
        try {
            const combinedMovements = this.validateRequiredData(statementType);

            Logger.debug('=== DEBUGGING COLUMNS ===');
            Logger.debug('Combined movements columns:', combinedMovements.columnNames());

            // Filter for specific statement type
            let filtered = combinedMovements.params({ statementType }).filter((d: any) => d.statement_type === statementType);

            Logger.debug('Filtered columns (after statement type filter):', filtered.columnNames());

            // Apply period filters if specified
            // Parse year-period combinations (format: "2024-all", "2024-1", "2024-Q1", "2025-6", etc.)
            const year1 = YEAR_CONFIG.getYear(0);
            const year2 = YEAR_CONFIG.getYear(1);
            const col1 = YEAR_CONFIG.getAmountColumn(year1);
            const col2 = YEAR_CONFIG.getAmountColumn(year2);

            const periodYear1Value = options[`period${year1}` as keyof GenerationOptions] as string || `${year1}-all`;
            const periodYear2Value = options[`period${year2}` as keyof GenerationOptions] as string || `${year2}-all`;

            // Helper function to parse period value (handles 'all', quarters 'Q1-Q4', and individual periods)
            const parsePeriod = (periodStr: string): number => {
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
                viewType = (document.getElementById('view-type') as HTMLSelectElement)?.value || 'cumulative';
            }

            // Balance Sheet ALWAYS uses cumulative view (it shows position at a point in time)
            // Income Statement respects the view type selection
            if (statementType === STATEMENT_TYPES.BALANCE_SHEET) {
                viewType = 'cumulative';
            }

            // Initialize LTM label storage
            let ltmLabel1: string | null = null;
            let ltmLabel2: string | null = null;

            // Check for LTM (Latest Twelve Months) selection
            const isLTM1 = isLTMSelected(periodStr1);
            const isLTM2 = isLTMSelected(periodStr2);
            const isLTMMode = isLTM1 || isLTM2;

            // Store LTM info for later use in column generation
            let ltmInfo: LTMInfo | null = null;

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
                    statementType: statementType
                });

                // Validate that we have data for LTM calculation
                if (availableYears.length === 0) {
                    throw ErrorFactory.missingConfig('trialBalanceData',
                        new Error('No data available for LTM calculation'));
                }

                if (filtered.numRows() === 0) {
                    throw ErrorFactory.invalidValue('statementType', statementType, 
                        'statement type with available data');
                }

                // Calculate LTM info
                ltmInfo = calculateLTMInfo(
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
                        Logger.warn(`LTM Column 1: ${ltmInfo.availability.message}`);
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
                        Logger.warn(`LTM Column 2: ${ltmInfo.availability.message}`);
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
                        .filter((d: any) =>
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
                        .filter((d: any) =>
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

            let aggregated: ArqueroTable;

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
                processedData = flipSignForPassiva(aggregated, col1, col2);
            }

            // Add ordering if specified - sort by level codes for proper order (all 3 levels)
            const ordered = options.orderBy ? processedData.orderby('code1', 'code2', 'code3') : processedData;

            // Calculate variances and totals
            // Note: In LTM mode, we skip variance calculation (no 2-column comparison)
            let withVariances: ArqueroTable, categoryTotals: ArqueroTable;

            if (isLTMMode) {
                // LTM Mode: Skip variance derivation, use ordered data directly
                withVariances = ordered;
                // Calculate category totals using dynamic month columns
                categoryTotals = this.calculateLTMCategoryTotals(ordered, ltmInfo!, statementType);
            } else {
                // Normal Mode: Calculate variances between two year columns
                withVariances = this.deriveVarianceColumns(ordered);
                categoryTotals = this.calculateCategoryTotals(withVariances);
            }

            // Build result object
            const result: StatementResult = {
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
            Logger.error(`Error generating ${statementName}:`, error);
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
     * @param reportDef - Report definition object
     * @param options - Generation options
     * @returns Statement data with rows ready for ag-Grid
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
    generateStatementFromDefinition(reportDef: ReportDefinition, options: GenerationOptions = {}): StatementResult {
        if (!reportDef) {
            throw ErrorFactory.missingField('reportDef', 'generateStatementFromDefinition');
        }

        try {
            // Get movements data based on statement type
            const statementType = this._mapStatementType(reportDef.statementType);
            const combinedMovements = this.validateRequiredData(statementType);

            // Filter for specific statement type
            let filtered = combinedMovements
                .params({ statementType })
                .filter((d: any) => d.statement_type === statementType);

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

            // Debug logging
            Logger.debug('Statement generation result:', {
                hasDetails: !!result.details,
                hasTotals: !!result.totals,
                hasRows: !!result.rows,
                rowCount: result.rows?.length,
                detailsType: result.details?.constructor?.name
            });

            return result;

        } catch (error: any) {
            Logger.error('Error generating statement from definition:', error);
            
            // Re-throw custom errors as-is
            if (error.code) {
                throw error;
            }
            
            throw ErrorFactory.wrap(error, {
                operation: 'generateStatementFromDefinition',
                reportId: reportDef?.reportId
            });
        }
    }

    // REMOVED: Feature flag methods - Configurable reports are now the only option

    /**
     * Map report definition statement type to internal statement type
     * 
     * @private
     * @param reportStatementType - Statement type from report definition (balance, income, cashflow)
     * @returns Internal statement type constant
     */
    private _mapStatementType(reportStatementType: string): string {
        const mapping: Record<string, string> = {
            'balance': STATEMENT_TYPES.BALANCE_SHEET,
            'income': STATEMENT_TYPES.INCOME_STATEMENT,
            'cashflow': STATEMENT_TYPES.CASH_FLOW
        };

        const mapped = mapping[reportStatementType];
        if (!mapped) {
            throw ErrorFactory.invalidValue('statementType', reportStatementType, 
                'income, balance, or cashflow');
        }

        return mapped;
    }

    /**
     * Build period options object from generation options
     * 
     * @private
     * @param options - Generation options
     * @returns Period options for report renderer
     */
    private _buildPeriodOptions(options: GenerationOptions): any {
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
     * @param filtered - Arquero table with filtered data
     * @param options - Generation options
     * @param statementType - Statement type
     * @returns Filtered Arquero table
     */
    private _applyPeriodFiltering(filtered: ArqueroTable, options: GenerationOptions, statementType: string): ArqueroTable {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        const periodYear1Value = options[`period${year1}` as keyof GenerationOptions] as string || `${year1}-all`;
        const periodYear2Value = options[`period${year2}` as keyof GenerationOptions] as string || `${year2}-all`;

        // Helper function to parse period value
        const parsePeriod = (periodStr: string): number => {
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
            viewType = (document.getElementById('view-type') as HTMLSelectElement)?.value || 'cumulative';
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
                .filter((d: any) =>
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
                .filter((d: any) =>
                    (d.year === yearInt1 && d.period <= periodInt1) ||
                    (d.year === yearInt2 && d.period <= periodInt2)
                );
        }
    }

    /**
     * Transform statement data to legacy format expected by UI components
     * 
     * @private
     * @param statementData - Statement data from report renderer
     * @param options - Generation options
     * @returns Statement data in legacy format
     */
    private _transformToLegacyFormat(statementData: any, options: GenerationOptions): StatementResult {
        // Convert rows array to Arquero table for compatibility
        const rowsData = statementData.rows.map((row: any) => ({
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

        const aq = (globalThis as any).aq;
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
    calculateVariance(period1: string, period2: string): ArqueroTable {
        try {
            const factTable1 = this.dataStore.getFactTable(period1);
            const factTable2 = this.dataStore.getFactTable(period2);

            if (!factTable1 || !factTable2) {
                throw ErrorFactory.missingConfig('periodData',
                    new Error(`Data for periods ${period1} or ${period2} not loaded`));
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
                    [`amount_${period1}`]: (d: any) => d[`amount_${period1}`] || 0,
                    [`amount_${period2}`]: (d: any) => d[`amount_${period2}`] || 0,
                    variance_amount: (d: any) => (d[`amount_${period2}`] || 0) - (d[`amount_${period1}`] || 0),
                    variance_percent: (d: any) => {
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
            Logger.error('Error calculating variance:', error);
            throw error;
        }
    }
}

export default StatementGenerator;
