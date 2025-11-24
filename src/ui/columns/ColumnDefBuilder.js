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
     * Build complete column definitions
     * @returns {Array<Object>} Array of column definitions
     */
    build() {
        // Get UI settings
        const period1Label = this.getPeriodLabel(this.year1);
        const period2Label = this.getPeriodLabel(this.year2);
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
     * Build category column with hierarchy indentation
     * @returns {Object} Column definition
     */
    buildCategoryColumn() {
        return {
            field: 'label',
            headerName: 'Category',
            minWidth: 400,
            cellRenderer: params => {
                if (!params.data) return '';
                const level = params.data.level || 0;
                const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
                const label = params.data.label || '';
                return indent + label;
            },
            cellClass: params => {
                const level = params.data?.level || 0;
                return level === 0 ? 'group-cell' : 'detail-cell';
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
