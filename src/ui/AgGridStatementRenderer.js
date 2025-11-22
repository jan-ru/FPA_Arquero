/**
 * AgGridStatementRenderer - ag-Grid based statement renderer
 *
 * This class is responsible for rendering financial statements using ag-Grid.
 * It provides advanced features like sorting, filtering, grouping, and CSV export.
 *
 * Depends on:
 * - ag-Grid (agGrid) - loaded globally from CDN
 * - CategoryMatcher for category identification
 * - VarianceCalculator for variance calculations
 * - YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES constants
 */

import CategoryMatcher from '../utils/CategoryMatcher.js';
import VarianceCalculator from '../utils/VarianceCalculator.js';
import { YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES } from '../constants.js';

class AgGridStatementRenderer {
    constructor(containerId) {
        this.gridDiv = document.querySelector(`#${containerId}`);
        this.gridApi = null;
        this.columnApi = null;
        this.currentStatementType = null;
        this.currentStatementData = null;
    }

    // Initialize grid with data
    render(statementData, statementType) {
        console.log('AgGridStatementRenderer.render called', { statementType, rowCount: statementData?.details?.numRows() });

        this.currentStatementType = statementType;
        this.currentStatementData = statementData;

        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Prepare data for grid
        const gridData = this.prepareDataForGrid(statementData, statementType);
        console.log('Grid data prepared', { dataLength: gridData.length });

        // Get column definitions
        const columnDefs = this.getColumnDefs(statementType, year1, year2);
        console.log('Column definitions', { columnCount: columnDefs.length });

        // Get detail level setting
        const detailLevel = document.getElementById('detail-level')?.value || 'all';
        const expandGroups = detailLevel === 'all' ? -1 : 0;  // -1 = expand all, 0 = collapse all

        // Create grid options
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: gridData,
            defaultColDef: {
                sortable: false,  // Rows have fixed order based on code hierarchy
                filter: false,    // No filtering needed
                resizable: true,
                flex: 1
            },

            // Auto-group column configuration
            autoGroupColumnDef: {
                headerName: 'Category',
                minWidth: 250,
                cellRendererParams: {
                    suppressCount: true,  // Don't show row count in group headers
                    innerRenderer: params => {
                        // Custom rendering for group rows
                        return params.value || '';
                    }
                }
            },

            // Group by name1, but exclude special rows (empty name1 or special _rowType)
            getRowId: params => {
                // Generate unique ID for each row
                return params.data.name2 + (params.data.name1 || '') + Math.random();
            },

            // Customize grouping behavior
            isRowMaster: params => {
                // Special rows (totals, metrics, spacers) should not be group masters
                if (!params.name1 || params._rowType === 'total' ||
                    params._rowType === 'metric' || params._rowType === 'spacer') {
                    return false;
                }
                return false;  // We're using rowGroup instead of master/detail
            },

            groupDefaultExpanded: expandGroups,  // Controlled by detail level dropdown
            suppressAggFuncInHeader: true,  // Clean header display
            rowClass: params => this.getRowClass(params),

            onGridReady: params => {
                console.log('Grid ready!', { rowCount: params.api.getDisplayedRowCount() });
                this.gridApi = params.api;
                this.columnApi = params.columnApi;
                params.api.sizeColumnsToFit();
            },

            onFirstDataRendered: params => {
                console.log('First data rendered!', { rowCount: params.api.getDisplayedRowCount() });
                params.api.sizeColumnsToFit();
            }
        };

        // Destroy existing grid if it exists
        if (this.gridApi) {
            this.gridApi.destroy();
        }

        // Create new grid
        new agGrid.Grid(this.gridDiv, gridOptions);
    }

    // Prepare data for ag-Grid
    prepareDataForGrid(statementData, statementType) {
        const details = statementData.details.objects();

        // Add metadata for row styling and behavior
        let gridData = details.map(row => ({
            ...row,
            _isMetric: false,
            _rowType: 'detail'
        }));

        // Insert special rows based on statement type
        switch(statementType) {
            case UI_STATEMENT_TYPES.BALANCE_SHEET:
                gridData = this.insertBalanceSheetSpecialRows(gridData, statementData);
                break;

            case UI_STATEMENT_TYPES.INCOME_STATEMENT:
                gridData = this.insertIncomeStatementMetrics(gridData, statementData);
                break;

            case UI_STATEMENT_TYPES.CASH_FLOW:
                gridData = this.insertCashFlowReconciliation(gridData, statementData);
                break;
        }

        return gridData;
    }

    // Insert Balance Sheet special rows (Total Assets, Total L&E)
    insertBalanceSheetSpecialRows(data, statementData) {
        const result = [...data];
        const totals = statementData.totals?.objects() || [];

        // Calculate Total Assets from category totals
        let totalAssetsYear1 = 0, totalAssetsYear2 = 0;
        totals.forEach(row => {
            if (CategoryMatcher.isAsset(row.name1)) {
                totalAssetsYear1 += row.amount_2024 || 0;
                totalAssetsYear2 += row.amount_2025 || 0;
            }
        });

        // Find insertion point: before first liability/equity category
        let insertIndex = result.findIndex(row =>
            CategoryMatcher.isLiabilityOrEquity(row.name1)
        );

        if (insertIndex > 0) {
            const assetsVariance = totalAssetsYear2 - totalAssetsYear1;
            const assetsVariancePercent = totalAssetsYear1 !== 0 ?
                ((totalAssetsYear2 - totalAssetsYear1) / Math.abs(totalAssetsYear1)) * 100 : 0;

            // Insert TOTAL ASSETS row
            result.splice(insertIndex, 0, {
                name1: '',
                name2: 'TOTAL ASSETS',
                amount_2024: totalAssetsYear1,
                amount_2025: totalAssetsYear2,
                variance_amount: assetsVariance,
                variance_percent: assetsVariancePercent,
                _isMetric: true,
                _rowType: 'total'
            });
        }

        // Calculate Total Liabilities & Equity
        let totalLEYear1 = 0, totalLEYear2 = 0;
        totals.forEach(row => {
            if (CategoryMatcher.isLiabilityOrEquity(row.name1)) {
                totalLEYear1 += row.amount_2024 || 0;
                totalLEYear2 += row.amount_2025 || 0;
            }
        });

        // Append TOTAL LIABILITIES & EQUITY at end
        const leVariance = totalLEYear2 - totalLEYear1;
        const leVariancePercent = totalLEYear1 !== 0 ?
            ((totalLEYear2 - totalLEYear1) / Math.abs(totalLEYear1)) * 100 : 0;

        result.push({
            name1: '',
            name2: 'TOTAL LIABILITIES & EQUITY',
            amount_2024: totalLEYear1,
            amount_2025: totalLEYear2,
            variance_amount: leVariance,
            variance_percent: leVariancePercent,
            _isMetric: true,
            _rowType: 'total'
        });

        return result;
    }

    // Insert Income Statement metrics (Gross Profit, Operating Income, Net Income)
    insertIncomeStatementMetrics(data, statementData) {
        if (!statementData.metrics) return data;

        const result = [...data];
        const metrics = statementData.metrics;
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // 1. Insert Gross Profit after COGS
        // Try multiple patterns to find COGS row
        let cogsIndex = result.findIndex(row =>
            row.name2 && (
                row.name2.toLowerCase().includes('kostprijs') ||
                row.name2.toLowerCase().includes('cogs') ||
                row.name2.toLowerCase().includes('cost of goods')
            )
        );

        if (cogsIndex >= 0 && metrics.grossProfit) {
            const gpVariance = metrics.grossProfit[year2] - metrics.grossProfit[year1];
            const gpVariancePercent = metrics.grossProfit[year1] !== 0 ?
                ((metrics.grossProfit[year2] - metrics.grossProfit[year1]) / Math.abs(metrics.grossProfit[year1])) * 100 : 0;

            result.splice(cogsIndex + 1, 0, {
                name1: '',
                name2: 'Brutowinst (Gross Profit)',
                amount_2024: metrics.grossProfit[year1],
                amount_2025: metrics.grossProfit[year2],
                variance_amount: gpVariance,
                variance_percent: gpVariancePercent,
                _isMetric: true,
                _rowType: 'metric'
            });
        }

        // 2. Insert Operating Income after operating expenses
        // Try multiple patterns to find last operating expense row
        let opexIndex = result.findIndex(row =>
            row.name2 && (
                row.name2.toLowerCase().includes('overige personeelskosten') ||
                row.name2.toLowerCase().includes('operating expense') ||
                row.name1 && row.name1.toLowerCase().includes('operating')
            )
        );

        // If not found, try to find the last expense before "Other" categories
        if (opexIndex < 0) {
            opexIndex = result.findIndex(row =>
                row.name1 && row.name1.toLowerCase().includes('overige')
            );
            if (opexIndex > 0) opexIndex -= 1;  // Insert before "Other" section
        }

        if (opexIndex >= 0 && metrics.operatingIncome) {
            const oiVariance = metrics.operatingIncome[year2] - metrics.operatingIncome[year1];
            const oiVariancePercent = metrics.operatingIncome[year1] !== 0 ?
                ((metrics.operatingIncome[year2] - metrics.operatingIncome[year1]) / Math.abs(metrics.operatingIncome[year1])) * 100 : 0;

            result.splice(opexIndex + 1, 0, {
                name1: '',
                name2: 'Operating Income',
                amount_2024: metrics.operatingIncome[year1],
                amount_2025: metrics.operatingIncome[year2],
                variance_amount: oiVariance,
                variance_percent: oiVariancePercent,
                _isMetric: true,
                _rowType: 'metric'
            });
        }

        // 3. Append Net Income at bottom
        if (metrics.netIncome) {
            const niVariance = metrics.netIncome[year2] - metrics.netIncome[year1];
            const niVariancePercent = metrics.netIncome[year1] !== 0 ?
                ((metrics.netIncome[year2] - metrics.netIncome[year1]) / Math.abs(metrics.netIncome[year1])) * 100 : 0;

            result.push({
                name1: '',
                name2: 'NET INCOME',
                amount_2024: metrics.netIncome[year1],
                amount_2025: metrics.netIncome[year2],
                variance_amount: niVariance,
                variance_percent: niVariancePercent,
                _isMetric: true,
                _rowType: 'total'
            });
        }

        return result;
    }

    // Insert Cash Flow reconciliation rows
    insertCashFlowReconciliation(data, statementData) {
        if (!statementData.metrics) return data;

        const result = [...data];
        const metrics = statementData.metrics;
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);

        // Add spacing row
        result.push({
            name1: '',
            name2: '',
            amount_2024: null,
            amount_2025: null,
            _isMetric: false,
            _rowType: 'spacer'
        });

        // Starting Cash
        if (metrics.startingCash) {
            const scVariance = metrics.startingCash[year2] - metrics.startingCash[year1];
            const scVariancePercent = metrics.startingCash[year1] !== 0 ?
                ((metrics.startingCash[year2] - metrics.startingCash[year1]) / Math.abs(metrics.startingCash[year1])) * 100 : 0;

            result.push({
                name1: 'Cash Reconciliation',
                name2: 'Starting Cash',
                amount_2024: metrics.startingCash[year1],
                amount_2025: metrics.startingCash[year2],
                variance_amount: scVariance,
                variance_percent: scVariancePercent,
                _isMetric: false,
                _rowType: 'detail'
            });
        }

        // Net Change in Cash
        if (metrics.netChange) {
            const ncVariance = metrics.netChange.variance;
            const ncVariancePercent = metrics.netChange[year1] !== 0 ?
                (ncVariance / Math.abs(metrics.netChange[year1])) * 100 : 0;

            result.push({
                name1: 'Cash Reconciliation',
                name2: 'Changes in Cash',
                amount_2024: metrics.netChange[year1],
                amount_2025: metrics.netChange[year2],
                variance_amount: ncVariance,
                variance_percent: ncVariancePercent,
                _isMetric: false,
                _rowType: 'detail'
            });
        }

        // Ending Cash
        if (metrics.endingCash) {
            const ecVariance = metrics.endingCash[year2] - metrics.endingCash[year1];
            const ecVariancePercent = metrics.endingCash[year1] !== 0 ?
                ((metrics.endingCash[year2] - metrics.endingCash[year1]) / Math.abs(metrics.endingCash[year1])) * 100 : 0;

            result.push({
                name1: 'Cash Reconciliation',
                name2: 'Ending Cash',
                amount_2024: metrics.endingCash[year1],
                amount_2025: metrics.endingCash[year2],
                variance_amount: ecVariance,
                variance_percent: ecVariancePercent,
                _isMetric: true,
                _rowType: 'total'
            });
        }

        return result;
    }

    // Get column definitions based on statement type
    getColumnDefs(statementType, year1, year2) {
        // Get period labels from dropdowns
        const period1Dropdown = document.getElementById(`period-${year1}-header`);
        const period2Dropdown = document.getElementById(`period-${year2}-header`);
        const period1Label = period1Dropdown ? period1Dropdown.options[period1Dropdown.selectedIndex].text : year1;
        const period2Label = period2Dropdown ? period2Dropdown.options[period2Dropdown.selectedIndex].text : year2;

        // Get variance modes from dropdowns
        const variance1Mode = document.getElementById('variance-1-header')?.value || 'none';
        const variance2Mode = document.getElementById('variance-2-header')?.value || 'none';

        // Base columns
        const columns = [
            // Category/Item columns
            {
                field: 'name1',
                headerName: 'Category',
                rowGroup: true,
                hide: true
            },
            {
                field: 'name2',
                headerName: 'Line Item',
                minWidth: 300,
                cellClass: params => params.node.group ? 'group-cell' : 'detail-cell'
            },

            // Year columns
            {
                field: 'amount_2024',
                headerName: period1Label,
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value),
                aggFunc: 'sum',
                cellClass: 'number-cell'
            },
            {
                field: 'amount_2025',
                headerName: period2Label,
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value),
                aggFunc: 'sum',
                cellClass: 'number-cell'
            }
        ];

        // Add variance columns based on variance mode settings
        // Variance for Year 1 (appears after Year 1 column)
        if (variance1Mode === 'amount' || variance1Mode === 'both') {
            columns.push({
                field: 'variance_amount_1',
                headerName: 'Var €',
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value),
                cellRenderer: params => this.varianceRenderer(params),
                aggFunc: 'sum',
                hide: true  // Not implemented yet - placeholder
            });
        }
        if (variance1Mode === 'percent' || variance1Mode === 'both') {
            columns.push({
                field: 'variance_percent_1',
                headerName: 'Var %',
                type: 'numericColumn',
                valueFormatter: params => params.value != null ? params.value.toFixed(1) + '%' : '',
                cellRenderer: params => this.varianceRenderer(params),
                hide: true  // Not implemented yet - placeholder
            });
        }

        // Variance for Year 2 (default variance - comparing Year 2 to Year 1)
        if (variance2Mode === 'amount' || variance2Mode === 'both') {
            columns.push({
                field: 'variance_amount',
                headerName: 'Var €',
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value),
                cellRenderer: params => this.varianceRenderer(params),
                aggFunc: 'sum'
            });
        }
        if (variance2Mode === 'percent' || variance2Mode === 'both') {
            columns.push({
                field: 'variance_percent',
                headerName: 'Var %',
                type: 'numericColumn',
                valueFormatter: params => params.value != null ? params.value.toFixed(1) + '%' : '',
                cellRenderer: params => this.varianceRenderer(params),
                aggFunc: params => this.calculateGroupVariancePercent(params)
            });
        }

        return columns;
    }

    // Format currency
    formatCurrency(value) {
        if (value == null || isNaN(value)) return '-';
        return new Intl.NumberFormat('nl-NL', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    // Variance cell renderer (color coding)
    varianceRenderer(params) {
        if (params.value == null) return '';

        const value = params.value;
        const isPositive = value >= 0;
        const cssClass = isPositive ? 'positive-variance' : 'negative-variance';

        return `<span class="${cssClass}">${params.valueFormatted}</span>`;
    }

    // Calculate group variance percent
    calculateGroupVariancePercent(params) {
        const total1 = params.values.reduce((sum, val, idx) => {
            const row = params.rowNode.allLeafChildren[idx];
            return sum + (row.data.amount_2024 || 0);
        }, 0);

        const total2 = params.values.reduce((sum, val, idx) => {
            const row = params.rowNode.allLeafChildren[idx];
            return sum + (row.data.amount_2025 || 0);
        }, 0);

        return total1 !== 0 ? ((total2 - total1) / Math.abs(total1)) * 100 : 0;
    }

    // Get row class for styling
    getRowClass(params) {
        if (!params.data) return '';

        const rowType = params.data._rowType;

        switch(rowType) {
            case 'total': return 'total-row';
            case 'metric': return 'metric-row';
            case 'spacer': return 'spacer-row';
            case 'detail': return 'detail-row';
            default: return params.node.group ? 'group-row' : '';
        }
    }

    // Export to CSV (Excel export requires ag-Grid Enterprise)
    exportToExcel(statementName) {
        if (!this.gridApi) {
            console.error('Grid not initialized');
            return;
        }

        const fileName = statementName || this.currentStatementType || 'Statement';
        const timestamp = new Date().toISOString().split('T')[0];

        // Note: exportDataAsExcel() requires ag-Grid Enterprise
        // Using exportDataAsCsv() instead (Community Edition)
        const params = {
            fileName: `${fileName}_${timestamp}.csv`
        };

        this.gridApi.exportDataAsCsv(params);
        console.log('Exported to CSV:', params.fileName);
    }

    // Legacy Excel export code (requires ag-Grid Enterprise - not available in Community)
    exportToExcelEnterprise(statementName) {
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

        const params = {
            fileName: `${fileName}_${timestamp}.xlsx`,
            sheetName: fileName,
            excelStyles: excelStyles,

            // Apply styles based on row type and cell content
            processCellCallback: (params) => {
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
            processHeaderCallback: (params) => {
                return { styleId: 'header' };
            },

            // Custom column widths
            columnWidth: (params) => {
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
