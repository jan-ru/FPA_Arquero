/**
 * AgGridStatementRenderer - ag-Grid based statement renderer
 *
 * This class is responsible for rendering financial statements using ag-Grid.
 * It provides advanced features like sorting, filtering, grouping, and CSV export.
 *
 * Depends on:
 * - ag-Grid (agGrid) - loaded globally from CDN
 * - VarianceCalculator for variance calculations
 * - YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES constants
 * - Report definitions for calculated rows and subtotals
 */

// CategoryMatcher removed - no longer needed with configurable report system
import Logger from '../utils/Logger.ts';
import { calculateVariancePercent } from '../core/calculations/variance.ts';
import HierarchyBuilder from '../utils/HierarchyBuilder.ts';
import HierarchyTreeBuilder from '../utils/HierarchyTreeBuilder.ts';
// SpecialRowsFactory removed - all statements now use configurable report system with calculated/subtotal rows
import ColumnDefBuilder from './columns/ColumnDefBuilder.ts';
import { YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES } from '../constants.ts';
import { exportGridToExcel, exportLTMGridToExcel } from '../export/excel-export.ts';

interface LTMRange {
    year: number;
    startPeriod: number;
    endPeriod: number;
}

interface LTMInfo {
    ranges: LTMRange[];
    latest: { year: number; period: number };
    label: string;
    filteredData: any;
    availability: {
        complete: boolean;
        message: string;
    };
}

interface StatementData {
    details?: any;
    rows?: any[];
    movements?: any[];
    calculatedRows?: any[];
    formattingRules?: any;
    ltmLabels?: {
        column1: string | null;
        column2: string | null;
    };
    isLTMMode?: boolean;
    ltmInfo?: LTMInfo;
    metadata?: {
        reportId?: string;
        reportName?: string;
        reportVersion?: string;
    };
    reportName?: string;
    reportVersion?: string;
}

interface GridRow {
    order?: number;
    label: string;
    type?: string;
    style?: string;
    indent?: number;
    amount_2024?: number;
    amount_2025?: number;
    variance_amount?: number;
    variance_percent?: number;
    formatted_2024?: string;
    formatted_2025?: string;
    formatted_variance_amount?: string;
    formatted_variance_percent?: string;
    _rowType?: string;
    _metadata?: any;
    _alwaysVisible?: boolean;
    level?: number;
    hierarchy?: string[];
    orgHierarchy?: string[];
    code0?: string;
    name0?: string;
    code1?: string;
    name1?: string;
    code2?: string;
    name2?: string;
    code3?: string;
    name3?: string;
    account_code?: string;
    account_description?: string;
}

interface CellParams {
    data?: GridRow;
    value?: any;
    valueFormatted?: string;
    node?: any;
    column?: any;
    values?: any[];
    rowNode?: any;
}

class AgGridStatementRenderer {
    private gridDiv: HTMLElement | null;
    public gridApi: any;
    private columnApi: any;
    private currentStatementType: string | null;
    private currentStatementData: StatementData | null;
    private hierarchyTreeBuilder: HierarchyTreeBuilder;
    private expansionState: Map<string, boolean>;

    constructor(containerId: string) {
        this.gridDiv = document.querySelector(`#${containerId}`);
        this.gridApi = null;
        this.columnApi = null;
        this.currentStatementType = null;
        this.currentStatementData = null;
        this.hierarchyTreeBuilder = new HierarchyTreeBuilder();
        this.expansionState = new Map(); // Store node expansion state
    }

    /**
     * Map UI statement type to registry statement type
     * @param uiType - UI_STATEMENT_TYPES constant
     * @returns Registry statement type (balance, income, cashflow)
     */
    private mapStatementType(uiType: string): 'balance' | 'income' | 'cashflow' {
        const mapping: Record<string, 'balance' | 'income' | 'cashflow'> = {
            [UI_STATEMENT_TYPES.INCOME_STATEMENT]: 'income',
            [UI_STATEMENT_TYPES.BALANCE_SHEET]: 'balance',
            [UI_STATEMENT_TYPES.CASH_FLOW]: 'cashflow'
        };
        return mapping[uiType] || 'income';
    }

    // Initialize grid with data
    render(statementData: StatementData, statementType: string): void {
        Logger.debug('AgGridStatementRenderer.render called', { statementType, rowCount: statementData?.details?.numRows() });

        // Reset expansion state if statement type changed
        if (this.currentStatementType !== statementType) {
            this.resetExpansionState();
        }

        this.currentStatementType = statementType;
        this.currentStatementData = statementData;

        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Prepare data for grid
        const gridData = this.prepareDataForGrid(statementData, statementType);
        Logger.debug('Grid data prepared', { dataLength: gridData.length });

        // Get column definitions
        const columnDefs = this.getColumnDefs(statementType, year1, year2);
        Logger.debug('Column definitions', { columnCount: columnDefs.length });

        // Determine if we're using tree data mode
        const isTreeData = gridData.length > 0 && gridData[0].orgHierarchy !== undefined;
        Logger.debug('Grid mode', { isTreeData });

        // Create grid options
        const gridOptions: any = {
            columnDefs: columnDefs,
            rowData: gridData,
            defaultColDef: {
                sortable: false,  // Rows have fixed order based on code hierarchy
                filter: false,    // No filtering needed
                resizable: true,
                flex: 1
            },

            suppressAggFuncInHeader: true,  // Clean header display

            // Tree data configuration (if applicable)
            ...(isTreeData ? {
                treeData: true,
                getDataPath: (data: GridRow) => data.orgHierarchy,
                groupDefaultExpanded: 1,  // Expand first level by default
                animateRows: true,
                autoGroupColumnDef: this._getAutoGroupColumnDef()
            } : {}),

            // Row styling based on type and level
            // Support both legacy _rowType and new style attribute from report definitions
            rowClassRules: this._getRowClassRules(),

            onGridReady: (params: any) => {
                Logger.debug('Grid ready!', { rowCount: params.api.getDisplayedRowCount() });
                this.gridApi = params.api;
                this.columnApi = params.columnApi;
                params.api.sizeColumnsToFit();
                
                // Restore expansion state if available
                if (isTreeData) {
                    this._restoreExpansionState();
                }
            },

            onFirstDataRendered: (params: any) => {
                Logger.debug('First data rendered!', { rowCount: params.api.getDisplayedRowCount() });
                params.api.sizeColumnsToFit();
            },

            // Save expansion state when nodes are expanded/collapsed
            onRowGroupOpened: (params: any) => {
                if (isTreeData && params.node.data) {
                    const pathKey = params.node.data.orgHierarchy.join('|');
                    this.expansionState.set(pathKey, params.node.expanded);
                }
            }
        };

        // Destroy existing grid if it exists
        if (this.gridApi) {
            this.gridApi.destroy();
        }

        // Create new grid using v31 API
        this.gridApi = (globalThis as any).agGrid.createGrid(this.gridDiv, gridOptions);
    }

    // Prepare data for ag-Grid with tree structure
    prepareDataForGrid(statementData: StatementData, statementType: string): GridRow[] {
        Logger.debug('prepareDataForGrid called', { statementType, hasRows: !!statementData.rows });

        // Check if we have movements data for tree structure
        if (statementData.movements && Array.isArray(statementData.movements)) {
            Logger.debug('Building tree structure from movements data', { 
                movementCount: statementData.movements.length 
            });

            // Build tree structure using HierarchyTreeBuilder
            const treeNodes = this.hierarchyTreeBuilder.buildTree(
                statementData.movements,
                {
                    statementType: this.mapStatementType(statementType),
                    calculatedRows: statementData.calculatedRows || [],
                    formattingRules: statementData.formattingRules || {}
                }
            );

            // Format amounts for display
            const formattedNodes = treeNodes.map(node => ({
                ...node,
                formatted_2024: this._formatAmount(node.amount_2024),
                formatted_2025: this._formatAmount(node.amount_2025),
                formatted_variance_amount: this._formatAmount(node.variance_amount),
                formatted_variance_percent: this._formatPercent(node.variance_percent)
            }));

            Logger.debug('Tree structure built', { nodeCount: formattedNodes.length });
            return formattedNodes;
        }

        // Fallback: All statements now use configurable report system with rows array
        if (statementData.rows && Array.isArray(statementData.rows)) {
            Logger.debug('Using configurable report data', { rowCount: statementData.rows.length });
            const gridData = this._prepareConfigurableReportData(statementData);
            
            Logger.debug('Configurable report data prepared', { 
                rowCount: gridData.length
            });
            
            return gridData;
        }

        // Fallback for unexpected data format
        Logger.error('Statement data missing rows array - expected configurable report format', statementData);
        throw new Error('Invalid statement data format: missing rows array. All statements must use configurable report definitions.');
    }

    // Format amount for display
    private _formatAmount(value: number | null | undefined): string {
        if (value == null || isNaN(value)) return '';
        return new Intl.NumberFormat('nl-NL', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    // Format percent for display
    private _formatPercent(value: number | null | undefined): string {
        if (value == null || isNaN(value)) return '';
        return value.toFixed(1) + '%';
    }

    /**
     * Prepare configurable report data for ag-Grid
     * 
     * Transforms report definition rows into ag-Grid compatible format.
     * Applies indentation, styling, and formatting from report definition.
     * Supports all layout item types: variable, calculated, category, subtotal, spacer.
     * 
     * @private
     * @param statementData - Statement data from report renderer
     * @returns Grid data ready for ag-Grid with proper styling and indentation
     */
    private _prepareConfigurableReportData(statementData: StatementData): GridRow[] {
        const gridData = statementData.rows!.map(row => {
            // Transform report definition row to ag-Grid format
            return {
                // Core fields
                order: row.order,
                label: row.label || '',
                type: row.type,
                style: row.style || 'normal',
                indent: row.indent !== undefined ? row.indent : 0,
                
                // Amount fields (use raw values for calculations)
                amount_2024: row.amount_2024,
                amount_2025: row.amount_2025,
                variance_amount: row.variance_amount,
                variance_percent: row.variance_percent,
                
                // Formatted fields (for display)
                formatted_2024: row.formatted_2024,
                formatted_2025: row.formatted_2025,
                formatted_variance_amount: row.formatted_variance_amount,
                formatted_variance_percent: row.formatted_variance_percent,
                
                // Metadata for ag-Grid
                _rowType: row.style || row.type, // Use style as _rowType for backward compatibility
                _metadata: row._metadata,
                
                // For backward compatibility with existing code
                level: row.indent !== undefined ? row.indent : 0,
                hierarchy: [row.label || '']
            };
        });

        Logger.debug('Prepared configurable report data', {
            rowCount: gridData.length,
            sample: gridData.slice(0, 3)
        });

        return gridData;
    }

    // Build hierarchical tree structure - creates ALL levels for outline display
    buildHierarchicalTree(details: any[], detailLevel: string): GridRow[] {
        Logger.debug('buildHierarchicalTree called', { detailCount: details.length, detailLevel });
        Logger.debug('Sample detail row received:', details[0]);

        // Check how many rows have name3 and account data populated
        const rowsWithName3 = details.filter(d => d.name3 && d.name3.trim() !== '').length;
        const rowsWithAccounts = details.filter(d => {
            const hasCode = d.account_code && typeof d.account_code === 'string' && d.account_code.trim() !== '';
            return hasCode;
        }).length;
        const rowsWithEmptyAccount = details.filter(d => !d.account_code || d.account_code === '').length;
        const rowsWithUndefinedAccount = details.filter(d => d.account_code === undefined).length;

        Logger.debug(`Rows with name3: ${rowsWithName3} out of ${details.length}`);
        Logger.debug(`Rows with account_code (non-empty): ${rowsWithAccounts} out of ${details.length}`);
        Logger.debug(`Rows with empty account_code: ${rowsWithEmptyAccount}`);
        Logger.debug(`Rows with undefined account_code: ${rowsWithUndefinedAccount}`);

        // Show sample of first few rows with account data
        const samplesWithAccounts = details.filter(d => d.account_code && typeof d.account_code === 'string' && d.account_code.trim() !== '').slice(0, 3);
        Logger.debug('Sample rows with accounts:', samplesWithAccounts);

        // Create hierarchy map to aggregate data
        const hierarchyMap = new Map<string, GridRow>();

        // Determine max depth based on detail level
        // Level hierarchy: code0 (Activa/Passiva) -> name0 (vaste/vlottende activa) -> name1 -> name2 -> name3 -> account
        const maxDepthMap: Record<string, number> = {
            'level0': 1,  // Show code0 only (Activa/Passiva)
            'level1': 2,  // Show code0 + name0
            'level2': 3,  // Show code0 + name0 + name1
            'level3': 4,  // Show code0 + name0 + name1 + name2
            'level4': 5,  // Show code0 + name0 + name1 + name2 + name3 (where applicable)
            'level5': 6   // Show all including account_code + account_description
        };
        const maxDepth = maxDepthMap[detailLevel] || 6;

        Logger.debug('Max depth:', maxDepth);

        // Process each detail row
        details.forEach((row, idx) => {
            // Build hierarchy path based on detail level
            const pathParts: string[] = [];
            const codes: any[] = [];

            // Level 0: code0 (Activa or Passiva)
            if (maxDepth >= 1 && row.code0) {
                pathParts.push(row.code0);
                codes.push({ code0: row.code0 });
            }
            // Level 1: name0 (vaste activa, vlottende activa, etc.)
            if (maxDepth >= 2 && row.name0) {
                pathParts.push(row.name0);
                codes.push({ code0: row.code0, name0: row.name0 });
            }
            // Level 2: name1
            if (maxDepth >= 3 && row.name1) {
                pathParts.push(row.name1);
                codes.push({ code1: row.code1, name1: row.name1 });
            }
            // Level 3: name2
            if (maxDepth >= 4 && row.name2) {
                pathParts.push(row.name2);
                codes.push({ code2: row.code2, name2: row.name2 });
            }
            // Level 4: name3 (only populated for some categories like 'Belastingen en premies sociale verz.')
            if (maxDepth >= 5 && row.name3 && row.name3.trim() !== '') {
                pathParts.push(row.name3);
                codes.push({ code3: row.code3, name3: row.name3 });
            }
            // Level 5: account_code + account_description (individual accounts)
            if (maxDepth >= 6 && row.account_code && row.account_code.trim() !== '') {
                const accountLabel = row.account_description && row.account_description.trim() !== ''
                    ? `${row.account_code} - ${row.account_description}`
                    : row.account_code;
                pathParts.push(accountLabel);
                codes.push({ account_code: row.account_code, account_description: row.account_description });
            }

            // Log first few rows for debugging
            if (idx < 5) {
                Logger.debug(`Row ${idx}:`, {
                    code0: row.code0,
                    name0: row.name0,
                    code1: row.code1,
                    name1: row.name1,
                    code2: row.code2,
                    name2: row.name2,
                    code3: row.code3,
                    name3: row.name3,
                    account_code: row.account_code,
                    account_description: row.account_description,
                    maxDepth,
                    pathParts,
                    pathLength: pathParts.length
                });
            }

            if (pathParts.length === 0) return; // Skip rows with no hierarchy

            // Create ALL parent nodes in the hierarchy
            for (let i = 0; i < pathParts.length; i++) {
                const path = pathParts.slice(0, i + 1);
                const pathKey = path.join('|');

                if (!hierarchyMap.has(pathKey)) {
                    const node: GridRow = {
                        hierarchy: [...path],
                        level: i,
                        label: pathParts[i],
                        // ALWAYS preserve all code levels for sorting
                        code0: row.code0 || '',
                        name0: row.name0 || '',
                        code1: row.code1 || '',
                        name1: row.name1 || '',
                        code2: row.code2 || '',
                        name2: row.name2 || '',
                        code3: row.code3 || '',
                        name3: row.name3 || '',
                        account_code: row.account_code || '',
                        account_description: row.account_description || '',
                        amount_2024: 0,
                        amount_2025: 0,
                        variance_amount: 0,
                        variance_percent: 0,
                        _rowType: i === pathParts.length - 1 ? 'detail' : 'group'
                    };
                    hierarchyMap.set(pathKey, node);
                }

                // Aggregate amounts at ALL levels (so parents show totals)
                const node = hierarchyMap.get(pathKey)!;
                node.amount_2024! += row.amount_2024 || 0;
                node.amount_2025! += row.amount_2025 || 0;
            }
        });

        // Calculate variances
        hierarchyMap.forEach(node => {
            node.variance_amount = node.amount_2025! - node.amount_2024!;
            node.variance_percent = calculateVariancePercent(node.amount_2025 || 0, node.amount_2024 || 0);
        });

        // Convert to array and sort by code hierarchy (code0, code1, code2, then hierarchy path)
        const result = Array.from(hierarchyMap.values());
        result.sort((a, b) => {
            // Helper function to convert code to number for sorting
            const toNum = (code: string | undefined): number => {
                if (!code && code !== '0') return 999999; // Empty codes go last
                const num = parseInt(code);
                return isNaN(num) ? 999999 : num;
            };

            // Sort by code0 first (Assets vs Liabilities/Equity)
            // code0 is now text ('Activa' or 'Passiva'), so handle both numeric and text
            const code0A = a.code0 || '';
            const code0B = b.code0 || '';
            const code0NumA = toNum(code0A);
            const code0NumB = toNum(code0B);

            // If both are non-numeric (text), use alphabetic comparison
            if (code0NumA === 999999 && code0NumB === 999999) {
                const code0TextDiff = code0A.localeCompare(code0B);
                if (code0TextDiff !== 0) return code0TextDiff;
            } else {
                // Otherwise use numeric comparison
                const code0Diff = code0NumA - code0NumB;
                if (code0Diff !== 0) return code0Diff;
            }

            // Then by code1
            const code1Diff = toNum(a.code1) - toNum(b.code1);
            if (code1Diff !== 0) return code1Diff;

            // Then by code2
            const code2Diff = toNum(a.code2) - toNum(b.code2);
            if (code2Diff !== 0) return code2Diff;

            // Then by code3
            const code3Diff = toNum(a.code3) - toNum(b.code3);
            if (code3Diff !== 0) return code3Diff;

            // Finally by account_code
            const acctA = a.account_code || '';
            const acctB = b.account_code || '';
            if (acctA !== acctB) return acctA.localeCompare(acctB);

            // If all codes are equal, sort by hierarchy path
            const maxLength = Math.max(a.hierarchy!.length, b.hierarchy!.length);
            for (let i = 0; i < maxLength; i++) {
                const aVal = a.hierarchy![i] || '';
                const bVal = b.hierarchy![i] || '';
                if (aVal !== bVal) return aVal.localeCompare(bVal);
            }

            return 0;
        });

        Logger.debug('Built hierarchy tree:', {
            nodeCount: result.length,
            sample: result.slice(0, 20).map(r => ({
                level: r.level,
                label: r.label,
                code0: r.code0,
                code1: r.code1,
                code2: r.code2,
                code3: r.code3,
                name0: r.name0,
                name1: r.name1,
                name2: r.name2,
                name3: r.name3,
                hierarchy: r.hierarchy,
                amount_2024: r.amount_2024
            }))
        });
        return result;
    }

    // Legacy special row insertion methods removed
    // All calculated rows, subtotals, and metrics are now handled by report definitions
    // using 'calculated' and 'subtotal' layout item types

    // Get column definitions based on statement type
    getColumnDefs(statementType: string, year1: string, year2: string): any[] {
        // Check if we're in tree data mode
        const isTreeData = this.currentStatementData && 
                          this.currentStatementData.movements && 
                          Array.isArray(this.currentStatementData.movements);

        if (isTreeData) {
            // Build tree data column definitions
            return this._getTreeDataColumnDefs(year1, year2);
        }

        // Use ColumnDefBuilder to create column definitions for non-tree mode
        const builder = new ColumnDefBuilder(statementType, year1, year2);
        builder.setFormatters(
            (value, params) => this.formatCurrency(value, params),
            (params) => this.varianceRenderer(params)
        );

        // Pass report metadata if available (from configurable reports)
        if (this.currentStatementData && this.currentStatementData.metadata) {
            builder.setReportMetadata({
                reportId: this.currentStatementData.metadata.reportId,
                reportName: this.currentStatementData.metadata.reportName || this.currentStatementData.reportName,
                reportVersion: this.currentStatementData.metadata.reportVersion || this.currentStatementData.reportVersion
            });
        }

        // Pass LTM labels if available
        if (this.currentStatementData && this.currentStatementData.ltmLabels) {
            builder.setLTMLabels(
                this.currentStatementData.ltmLabels.column1,
                this.currentStatementData.ltmLabels.column2
            );
        }

        // Pass LTM mode information if available
        if (this.currentStatementData && this.currentStatementData.isLTMMode) {
            builder.setLTMMode(
                this.currentStatementData.isLTMMode,
                this.currentStatementData.ltmInfo || null
            );
        }

        return builder.build();
    }

    // Get column definitions for tree data mode
    private _getTreeDataColumnDefs(year1: string, year2: string): any[] {
        const columns = [
            // Auto-group column is defined separately in autoGroupColumnDef
            
            // Amount columns with formatted values
            {
                field: 'formatted_2024',
                headerName: year1,
                type: 'numericColumn',
                cellClass: (params: CellParams) => {
                    const classes = ['amount-cell'];
                    if (params.data?.style === 'spacer') return 'spacer-cell';
                    if (params.value && parseFloat(params.value.replace(/[^0-9-]/g, '')) < 0) {
                        classes.push('negative-amount');
                    }
                    return classes;
                }
            },
            {
                field: 'formatted_2025',
                headerName: year2,
                type: 'numericColumn',
                cellClass: (params: CellParams) => {
                    const classes = ['amount-cell'];
                    if (params.data?.style === 'spacer') return 'spacer-cell';
                    if (params.value && parseFloat(params.value.replace(/[^0-9-]/g, '')) < 0) {
                        classes.push('negative-amount');
                    }
                    return classes;
                }
            },
            {
                field: 'formatted_variance_amount',
                headerName: 'Var €',
                type: 'numericColumn',
                cellClass: (params: CellParams) => {
                    const classes = ['amount-cell', 'variance-cell'];
                    if (params.data?.style === 'spacer') return 'spacer-cell';
                    return classes;
                },
                cellRenderer: (params: CellParams) => this.varianceRenderer(params)
            },
            {
                field: 'formatted_variance_percent',
                headerName: 'Var %',
                type: 'numericColumn',
                cellClass: (params: CellParams) => {
                    const classes = ['amount-cell', 'variance-percent-cell'];
                    if (params.data?.style === 'spacer') return 'spacer-cell';
                    return classes;
                },
                cellRenderer: (params: CellParams) => this.varianceRenderer(params)
            }
        ];

        return columns;
    }

    // Format currency
    formatCurrency(value: any, params: CellParams): string {
        // For spacer rows, return empty string
        if (params?.data?._rowType === 'spacer') return '';

        // For section headers (Activa/Passiva with null values), return empty string
        if (value == null || isNaN(value)) {
            const isHeaderRow = params?.data?.level === 0 &&
                               (params?.data?.label === 'Activa' || params?.data?.label === 'Passiva');
            return isHeaderRow ? '' : '-';
        }

        return new Intl.NumberFormat('nl-NL', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    // Variance cell renderer (color coding)
    varianceRenderer(params: CellParams): string {
        if (params.value == null) return '';

        const value = params.value;
        const isPositive = value >= 0;
        const cssClass = isPositive ? 'positive-variance' : 'negative-variance';

        return `<span class="${cssClass}">${params.valueFormatted}</span>`;
    }

    // Calculate group variance percent
    calculateGroupVariancePercent(params: CellParams): number {
        const total1 = params.values!.reduce((sum, val, idx) => {
            const row = params.rowNode!.allLeafChildren[idx];
            return sum + (row.data.amount_2024 || 0);
        }, 0);

        const total2 = params.values!.reduce((sum, val, idx) => {
            const row = params.rowNode!.allLeafChildren[idx];
            return sum + (row.data.amount_2025 || 0);
        }, 0);

        return calculateVariancePercent(total2, total1);
    }

    // Get row class for styling (not used with rowClassRules)
    getRowClass(params: CellParams): string {
        // Deprecated - now using rowClassRules instead
        return '';
    }

    // Get auto-group column definition for tree data
    private _getAutoGroupColumnDef(): any {
        return {
            headerName: 'Account',
            minWidth: 300,
            cellRendererParams: {
                suppressCount: true,  // Don't show child count
                innerRenderer: (params: any) => {
                    // Simple text rendering with label
                    return params.data ? params.data.label : '';
                }
            }
        };
    }

    // Get row class rules for styling
    private _getRowClassRules(): any {
        return {
            // Type-based classes
            'calculated-row': (params: CellParams) => params.data?.type === 'calculated',
            'spacer-row': (params: CellParams) => params.data?.type === 'spacer' || params.data?.style === 'spacer' || params.data?._rowType === 'spacer',
            'account-row': (params: CellParams) => params.data?.type === 'account',
            'category-row': (params: CellParams) => params.data?.type === 'category',
            
            // Style-based classes (from report definitions)
            'total-row': (params: CellParams) => params.data?.style === 'total' || params.data?._rowType === 'total',
            'metric-row': (params: CellParams) => params.data?.style === 'metric' || params.data?._rowType === 'metric',
            'subtotal-row': (params: CellParams) => params.data?.style === 'subtotal',
            'normal-row': (params: CellParams) => params.data?.style === 'normal',
            
            // Always visible indicator
            'always-visible': (params: CellParams) => params.data?._alwaysVisible === true,
            
            // Level-based classes (level-0 through level-5)
            'level-0': (params: CellParams) => params.data?.level === 0,
            'level-1': (params: CellParams) => params.data?.level === 1,
            'level-2': (params: CellParams) => params.data?.level === 2,
            'level-3': (params: CellParams) => params.data?.level === 3,
            'level-4': (params: CellParams) => params.data?.level === 4,
            'level-5': (params: CellParams) => params.data?.level === 5,
            
            // Special case classes
            'totaal-activa-row': (params: CellParams) => params.data?.label === 'Totaal activa',
            'spacer-after-activa': (params: CellParams) => params.data?.hierarchy?.[0] === 'SPACER_1'
        };
    }

    // Export to Excel using ExcelJS
    async exportToExcel(statementName?: string): Promise<void> {
        if (!this.gridApi) {
            Logger.error('Grid not initialized');
            return;
        }

        try {
            const fileName = statementName || this.currentStatementType || 'Statement';

            // Get current column definitions
            const columnDefs = this.gridApi.getColumnDefs();

            // Check if this is LTM mode
            const isLTM = this.currentStatementData?.isLTMMode;
            const ltmInfo = this.currentStatementData?.ltmInfo;

            // Export with appropriate method
            if (isLTM && ltmInfo) {
                await exportLTMGridToExcel(this.gridApi, columnDefs, fileName, ltmInfo);
            } else {
                await exportGridToExcel(this.gridApi, columnDefs, fileName, {
                    title: fileName,
                    subtitle: new Date().toLocaleDateString()
                });
            }

            Logger.info('Successfully exported to Excel');
        } catch (error) {
            Logger.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
    }

    // Expand all nodes in tree
    expandAll(): void {
        if (!this.gridApi) {
            Logger.warn('Grid not initialized - cannot expand all');
            return;
        }
        Logger.debug('Expanding all nodes');
        this.gridApi.expandAll();
    }

    // Collapse all nodes in tree
    collapseAll(): void {
        if (!this.gridApi) {
            Logger.warn('Grid not initialized - cannot collapse all');
            return;
        }
        Logger.debug('Collapsing all nodes');
        this.gridApi.collapseAll();
    }

    // Expand to specific level
    expandToLevel(level: number): void {
        if (!this.gridApi) {
            Logger.warn('Grid not initialized - cannot expand to level');
            return;
        }
        Logger.debug('Expanding to level', { level });
        
        this.gridApi.forEachNode((node: any) => {
            if (node.level < level) {
                node.setExpanded(true);
            } else {
                node.setExpanded(false);
            }
        });
    }

    // Restore expansion state from memory
    private _restoreExpansionState(): void {
        if (!this.gridApi || this.expansionState.size === 0) {
            return;
        }
        
        Logger.debug('Restoring expansion state', { stateCount: this.expansionState.size });
        
        this.gridApi.forEachNode((node: any) => {
            if (node.data && node.data.orgHierarchy) {
                const pathKey = node.data.orgHierarchy.join('|');
                const expanded = this.expansionState.get(pathKey);
                if (expanded !== undefined) {
                    node.setExpanded(expanded);
                }
            }
        });
    }

    // Reset expansion state (called when statement type changes)
    resetExpansionState(): void {
        Logger.debug('Resetting expansion state');
        this.expansionState.clear();
    }

    // Legacy Excel export code (requires ag-Grid Enterprise - not available in Community)
    exportToExcelEnterprise(statementName: string): void {
        // Define Excel styles
        const excelStyles = [
            // Bold style for totals
            {
                id: 'totalRow',
                font: {
                    bold: true,
                    size: 11,
                    fontName: 'Calibri'
                },
                borders: {
                    borderTop: {
                        color: '#000000',
                        lineStyle: 'Continuous',
                        weight: 2
                    },
                    borderBottom: {
                        color: '#000000',
                        lineStyle: 'Double',
                        weight: 3
                    }
                },
                interior: {
                    color: '#EDF2F7',
                    pattern: 'Solid'
                }
            },

            // Metric rows (Gross Profit, Operating Income, etc.)
            {
                id: 'metricRow',
                font: {
                    bold: true,
                    italic: true,
                    size: 11
                },
                interior: {
                    color: '#F0F4F8',
                    pattern: 'Solid'
                }
            },

            // Group/Category rows
            {
                id: 'groupRow',
                font: {
                    bold: true,
                    size: 11
                },
                interior: {
                    color: '#E6F2FF',
                    pattern: 'Solid'
                }
            },

            // Currency format
            {
                id: 'currencyCell',
                numberFormat: {
                    format: '#,##0'
                },
                alignment: {
                    horizontal: 'Right'
                }
            },

            // Positive variance (green)
            {
                id: 'positiveVariance',
                font: {
                    color: '#28a745'
                }
            },

            // Negative variance (red)
            {
                id: 'negativeVariance',
                font: {
                    color: '#dc3545'
                }
            },

            // Header style
            {
                id: 'header',
                interior: {
                    color: '#2c5282',
                    pattern: 'Solid'
                },
                font: {
                    color: '#FFFFFF',
                    bold: true,
                    size: 12
                },
                borders: {
                    borderBottom: {
                        color: '#000000',
                        lineStyle: 'Continuous',
                        weight: 2
                    }
                }
            }
        ];

        const fileName = statementName;
        const timestamp = new Date().toISOString().split('T')[0];

        const params = {
            fileName: `${fileName}_${timestamp}.xlsx`,
            sheetName: fileName,
            excelStyles: excelStyles,

            // Apply styles based on row type and cell content
            processCellCallback: (params: any) => {
                const { value, node, column } = params;

                // Total rows
                if (node.data && node.data._rowType === 'total') {
                    return { styleId: 'totalRow' };
                }

                // Metric rows
                if (node.data && node.data._rowType === 'metric') {
                    return { styleId: 'metricRow' };
                }

                // Group rows
                if (node.group) {
                    return { styleId: 'groupRow' };
                }

                // Amount columns - currency format
                if (column.getColId().startsWith('amount_')) {
                    return { styleId: 'currencyCell' };
                }

                // Variance amount columns - currency + color
                if (column.getColId() === 'variance_amount') {
                    const colorStyle = value >= 0 ? 'positiveVariance' : 'negativeVariance';
                    return { styleId: ['currencyCell', colorStyle] };
                }

                // Variance percent columns - color only
                if (column.getColId() === 'variance_percent') {
                    const colorStyle = value >= 0 ? 'positiveVariance' : 'negativeVariance';
                    return { styleId: colorStyle };
                }

                return params.value;
            },

            // Apply style to headers
            processHeaderCallback: (params: any) => {
                return { styleId: 'header' };
            },

            // Custom column widths
            columnWidth: (params: any) => {
                const colId = params.column.getColId();

                if (colId === 'name2' || colId === 'ag-Grid-AutoColumn') {
                    return 300;  // Wider for item names
                }
                return 120;  // Default width
            }
        };

        this.gridApi.exportDataAsExcel(params);
    }
}

export default AgGridStatementRenderer;
