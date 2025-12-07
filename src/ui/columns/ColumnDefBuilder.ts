/**
 * ColumnDefBuilder - Builds ag-Grid column definitions for financial statements
 *
 * Handles creation of column definitions with proper formatting, rendering,
 * and variance columns based on user settings
 */

interface LTMRange {
    year: number;
    startPeriod: number;
    endPeriod: number;
}

interface LTMInfo {
    ranges: LTMRange[];
}

interface ReportMetadata {
    reportName?: string;
    reportVersion?: string;
    [key: string]: any;
}

interface CellParams {
    data?: any;
    value?: any;
    valueFormatted?: string;
}

interface ColumnDef {
    field: string;
    headerName: string;
    minWidth?: number;
    type?: string;
    cellRenderer?: (params: CellParams) => string;
    cellClass?: string | ((params: CellParams) => string);
    valueFormatter?: (params: CellParams) => string;
    hide?: boolean;
}

export class ColumnDefBuilder {
    private statementType: string;
    private year1: string;
    private year2: string;
    private formatCurrency: ((value: any, params: CellParams) => string) | null = null;
    private varianceRenderer: ((params: CellParams) => string) | null = null;
    private ltmLabel1: string | null = null;
    private ltmLabel2: string | null = null;
    private isLTMMode: boolean = false;
    private ltmInfo: LTMInfo | null = null;
    private reportMetadata: ReportMetadata | null = null;

    /**
     * Create a column definition builder
     * @param statementType - Type of statement (BS, IS, CF)
     * @param year1 - First year
     * @param year2 - Second year
     */
    constructor(statementType: string, year1: string, year2: string) {
        this.statementType = statementType;
        this.year1 = year1;
        this.year2 = year2;
    }

    /**
     * Set report metadata for display in headers
     * @param metadata - Report metadata (reportName, reportVersion, etc.)
     */
    setReportMetadata(metadata: ReportMetadata): void {
        this.reportMetadata = metadata;
    }

    /**
     * Set formatter functions from the renderer
     * @param formatCurrency - Currency formatting function
     * @param varianceRenderer - Variance cell renderer
     */
    setFormatters(
        formatCurrency: (value: any, params: CellParams) => string,
        varianceRenderer: (params: CellParams) => string
    ): void {
        this.formatCurrency = formatCurrency;
        this.varianceRenderer = varianceRenderer;
    }

    /**
     * Set LTM labels for column headers
     * @param label1 - LTM label for column 1
     * @param label2 - LTM label for column 2
     */
    setLTMLabels(label1: string | null, label2: string | null): void {
        this.ltmLabel1 = label1;
        this.ltmLabel2 = label2;
    }

    /**
     * Set LTM mode and period information
     * @param isLTMMode - Whether LTM multi-column mode is active
     * @param ltmInfo - LTM period information with ranges
     */
    setLTMMode(isLTMMode: boolean, ltmInfo: LTMInfo | null): void {
        this.isLTMMode = isLTMMode;
        this.ltmInfo = ltmInfo;
    }

    /**
     * Build complete column definitions
     * @returns Array of column definitions
     */
    build(): ColumnDef[] {
        // Check if LTM multi-column mode is active
        if (this.isLTMMode && this.ltmInfo && this.ltmInfo.ranges) {
            return this.buildLTMColumns();
        }

        // Normal mode: 2 columns + variance
        // Get UI settings
        let period1Label = this.getPeriodLabel(this.year1);
        let period2Label = this.getPeriodLabel(this.year2);

        // Override with LTM labels if they are set
        if (this.ltmLabel1) {
            period1Label = this.ltmLabel1;
        }
        if (this.ltmLabel2) {
            period2Label = this.ltmLabel2;
        }

        // Use the single variance selector for all variance columns
        const varianceMode = (document.getElementById('variance-selector') as HTMLSelectElement)?.value || 'none';

        const columns: ColumnDef[] = [
            this.buildCategoryColumn(),
            this.buildAmountColumn('amount_2024', period1Label),
            this.buildAmountColumn('amount_2025', period2Label)
        ];

        // Add variance columns (comparing 2025 to 2024)
        if (varianceMode === 'amount' || varianceMode === 'both') {
            columns.push(this.buildVarianceAmountColumn('variance_amount', false));
        }
        if (varianceMode === 'percent' || varianceMode === 'both') {
            columns.push(this.buildVariancePercentColumn('variance_percent', false));
        }

        return columns;
    }

    /**
     * Build column definitions for LTM multi-column mode
     * @returns Array of column definitions
     */
    buildLTMColumns(): ColumnDef[] {
        const columns: ColumnDef[] = [this.buildCategoryColumn()];

        const viewType = (document.getElementById('view-type') as HTMLSelectElement)?.value || 'period';
        const isIncomeStatement = this.statementType === 'IS' || this.statementType === 'income-statement';
        const isBalanceSheet = this.statementType === 'BS' || this.statementType === 'balance-sheet';

        let monthIndex = 1;

        // Build 12 period columns
        if (this.ltmInfo && this.ltmInfo.ranges) {
            for (const range of this.ltmInfo.ranges) {
                for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                    const columnName = `month_${monthIndex}`;
                    const headerName = `${range.year} P${period}`;

                    columns.push(this.buildAmountColumn(columnName, headerName));
                    monthIndex++;
                }
            }
        }

        // For Income Statement: Add 13th cumulative column
        if (isIncomeStatement) {
            columns.push(this.buildAmountColumn('ltm_total', 'LTM Total'));
        }

        return columns;
    }

    /**
     * Build category column with hierarchy indentation
     * Supports both legacy 'level' and new 'indent' attributes from report definitions
     * @returns Column definition
     */
    buildCategoryColumn(): ColumnDef {
        return {
            field: 'label',
            headerName: 'Category',
            minWidth: 400,
            cellRenderer: (params: CellParams) => {
                if (!params.data) return '';
                
                // Support both 'indent' (from report definitions) and 'level' (legacy)
                const indentLevel = params.data.indent !== undefined ? params.data.indent : (params.data.level || 0);
                const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(indentLevel);
                const label = params.data.label || '';
                
                return indent + label;
            },
            cellClass: (params: CellParams) => {
                // Support both 'indent' and 'level' for styling
                const indentLevel = params.data?.indent !== undefined ? params.data.indent : (params.data?.level || 0);
                return indentLevel === 0 ? 'group-cell' : 'detail-cell';
            }
        };
    }

    /**
     * Build amount column
     * @param field - Field name
     * @param headerName - Column header text
     * @returns Column definition
     */
    buildAmountColumn(field: string, headerName: string): ColumnDef {
        return {
            field: field,
            headerName: headerName,
            type: 'numericColumn',
            valueFormatter: (params: CellParams) => this.formatCurrency ? this.formatCurrency(params.value, params) : String(params.value),
            cellClass: 'number-cell'
        };
    }

    /**
     * Build variance amount column
     * @param field - Field name
     * @param hide - Whether to hide the column
     * @returns Column definition
     */
    buildVarianceAmountColumn(field: string, hide: boolean = false): ColumnDef {
        return {
            field: field,
            headerName: 'Var €',
            type: 'numericColumn',
            valueFormatter: (params: CellParams) => this.formatCurrency ? this.formatCurrency(params.value, params) : String(params.value),
            cellRenderer: (params: CellParams) => this.varianceRenderer ? this.varianceRenderer(params) : (params.valueFormatted || ''),
            hide: hide
        };
    }

    /**
     * Build variance percent column
     * @param field - Field name
     * @param hide - Whether to hide the column
     * @returns Column definition
     */
    buildVariancePercentColumn(field: string, hide: boolean = false): ColumnDef {
        return {
            field: field,
            headerName: 'Var %',
            type: 'numericColumn',
            valueFormatter: (params: CellParams) => {
                if (params?.data?._rowType === 'spacer') return '';
                if (params.value == null || isNaN(params.value)) return '-';
                return params.value.toFixed(1) + '%';
            },
            cellRenderer: (params: CellParams) => this.varianceRenderer ? this.varianceRenderer(params) : (params.valueFormatted || ''),
            hide: hide
        };
    }

    /**
     * Get period label from dropdown
     * @param year - Year
     * @returns Period label
     */
    getPeriodLabel(year: string): string {
        const periodSelector = document.getElementById('period-selector') as HTMLSelectElement | null;
        const viewTypeSelector = document.getElementById('view-type') as HTMLSelectElement | null;

        if (periodSelector) {
            const periodText = periodSelector.options[periodSelector.selectedIndex].text;
            // Extract just the period part (e.g., "All (Year-to-Date)" -> "All", "P9 (September)" -> "P9")
            const periodPart = periodText.split(' ')[0];

            // Cash Flow shows both cumulative and period amounts in same column, so no indicator
            if (this.statementType === 'CF' || this.statementType === 'cash-flow') {
                return `${year} ${periodPart}`;
            }

            // Add view type indicator for BS and IS
            const viewType = viewTypeSelector?.value || 'cumulative';
            const viewIndicator = viewType === 'cumulative' ? '(Σ)' : '(Δ)';

            return `${year} ${periodPart} ${viewIndicator}`;
        }
        return year;
    }
}

export default ColumnDefBuilder;
