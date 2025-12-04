/**
 * ColumnDefBuilder - Builds ag-Grid column definitions for financial statements
 *
 * Handles creation of column definitions with proper formatting, rendering,
 * and variance columns based on user settings
 */

export class ColumnDefBuilder {
    /**
     * Create a column definition builder
     * @param {string} statementType - Type of statement (BS, IS, CF)
     * @param {string} year1 - First year
     * @param {string} year2 - Second year
     */
    constructor(statementType, year1, year2) {
        this.statementType = statementType;
        this.year1 = year1;
        this.year2 = year2;
        this.formatCurrency = null; // Will be set from renderer
        this.varianceRenderer = null; // Will be set from renderer
        this.ltmLabel1 = null; // LTM label for column 1
        this.ltmLabel2 = null; // LTM label for column 2
        this.isLTMMode = false; // LTM multi-column mode
        this.ltmInfo = null; // LTM period information
        this.reportMetadata = null; // Report definition metadata
    }

    /**
     * Set report metadata for display in headers
     * @param {Object} metadata - Report metadata (reportName, reportVersion, etc.)
     */
    setReportMetadata(metadata) {
        this.reportMetadata = metadata;
    }

    /**
     * Set formatter functions from the renderer
     * @param {Function} formatCurrency - Currency formatting function
     * @param {Function} varianceRenderer - Variance cell renderer
     */
    setFormatters(formatCurrency, varianceRenderer) {
        this.formatCurrency = formatCurrency;
        this.varianceRenderer = varianceRenderer;
    }

    /**
     * Set LTM labels for column headers
     * @param {string|null} label1 - LTM label for column 1
     * @param {string|null} label2 - LTM label for column 2
     */
    setLTMLabels(label1, label2) {
        this.ltmLabel1 = label1;
        this.ltmLabel2 = label2;
    }

    /**
     * Set LTM mode and period information
     * @param {boolean} isLTMMode - Whether LTM multi-column mode is active
     * @param {Object} ltmInfo - LTM period information with ranges
     */
    setLTMMode(isLTMMode, ltmInfo) {
        this.isLTMMode = isLTMMode;
        this.ltmInfo = ltmInfo;
    }

    /**
     * Build complete column definitions
     * @returns {Array<Object>} Array of column definitions
     */
    build() {
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
        const varianceMode = document.getElementById('variance-selector')?.value || 'none';

        const columns = [
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
     * @returns {Array<Object>} Array of column definitions
     */
    buildLTMColumns() {
        const columns = [this.buildCategoryColumn()];

        const viewType = document.getElementById('view-type')?.value || 'period';
        const isIncomeStatement = this.statementType === 'IS' || this.statementType === 'income-statement';
        const isBalanceSheet = this.statementType === 'BS' || this.statementType === 'balance-sheet';

        let monthIndex = 1;

        // Build 12 period columns
        for (const range of this.ltmInfo.ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                const headerName = `${range.year} P${period}`;

                columns.push(this.buildAmountColumn(columnName, headerName));
                monthIndex++;
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
     * @returns {Object} Column definition
     */
    buildCategoryColumn() {
        return {
            field: 'label',
            headerName: 'Category',
            minWidth: 400,
            cellRenderer: params => {
                if (!params.data) return '';
                
                // Support both 'indent' (from report definitions) and 'level' (legacy)
                const indentLevel = params.data.indent !== undefined ? params.data.indent : (params.data.level || 0);
                const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(indentLevel);
                const label = params.data.label || '';
                
                return indent + label;
            },
            cellClass: params => {
                // Support both 'indent' and 'level' for styling
                const indentLevel = params.data?.indent !== undefined ? params.data.indent : (params.data?.level || 0);
                return indentLevel === 0 ? 'group-cell' : 'detail-cell';
            }
        };
    }

    /**
     * Build amount column
     * @param {string} field - Field name
     * @param {string} headerName - Column header text
     * @returns {Object} Column definition
     */
    buildAmountColumn(field, headerName) {
        return {
            field: field,
            headerName: headerName,
            type: 'numericColumn',
            valueFormatter: params => this.formatCurrency ? this.formatCurrency(params.value, params) : params.value,
            cellClass: 'number-cell'
        };
    }

    /**
     * Build variance amount column
     * @param {string} field - Field name
     * @param {boolean} hide - Whether to hide the column
     * @returns {Object} Column definition
     */
    buildVarianceAmountColumn(field, hide = false) {
        return {
            field: field,
            headerName: 'Var €',
            type: 'numericColumn',
            valueFormatter: params => this.formatCurrency ? this.formatCurrency(params.value, params) : params.value,
            cellRenderer: params => this.varianceRenderer ? this.varianceRenderer(params) : params.valueFormatted,
            hide: hide
        };
    }

    /**
     * Build variance percent column
     * @param {string} field - Field name
     * @param {boolean} hide - Whether to hide the column
     * @returns {Object} Column definition
     */
    buildVariancePercentColumn(field, hide = false) {
        return {
            field: field,
            headerName: 'Var %',
            type: 'numericColumn',
            valueFormatter: params => {
                if (params?.data?._rowType === 'spacer') return '';
                if (params.value == null || isNaN(params.value)) return '-';
                return params.value.toFixed(1) + '%';
            },
            cellRenderer: params => this.varianceRenderer ? this.varianceRenderer(params) : params.valueFormatted,
            hide: hide
        };
    }

    /**
     * Get period label from dropdown
     * @param {string} year - Year
     * @returns {string} Period label
     */
    getPeriodLabel(year) {
        const periodSelector = document.getElementById('period-selector');
        const viewTypeSelector = document.getElementById('view-type');

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
