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
import VarianceCalculator from '../utils/VarianceCalculator.ts';
import Logger from '../utils/Logger.ts';
import HierarchyBuilder from '../utils/HierarchyBuilder.ts';
// SpecialRowsFactory removed - all statements now use configurable report system with calculated/subtotal rows
import ColumnDefBuilder from './columns/ColumnDefBuilder.js';
import { YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES } from '../constants.js';
import { exportGridToExcel, exportLTMGridToExcel } from '../export/excel-export.js';

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
        Logger.debug('AgGridStatementRenderer.render called', { statementType, rowCount: statementData?.details?.numRows() });

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

            suppressAggFuncInHeader: true,  // Clean header display

            // Row styling based on type and level
            // Support both legacy _rowType and new style attribute from report definitions
            rowClassRules: {
                // Style-based classes (from report definitions)
                'total-row': params => params.data?.style === 'total' || params.data?._rowType === 'total',
                'metric-row': params => params.data?.style === 'metric' || params.data?._rowType === 'metric',
                'subtotal-row': params => params.data?.style === 'subtotal',
                'spacer-row': params => params.data?.style === 'spacer' || params.data?._rowType === 'spacer',
                'normal-row': params => params.data?.style === 'normal',
                
                // Legacy type-based classes (for backward compatibility)
                'group-row': params => params.data?._rowType === 'group',
                
                // Indent-based classes (from report definitions)
                'indent-0': params => params.data?.indent === 0,
                'indent-1': params => params.data?.indent === 1,
                'indent-2': params => params.data?.indent === 2,
                'indent-3': params => params.data?.indent === 3,
                
                // Legacy level-based classes (for backward compatibility)
                'level-0-row': params => params.data?.level === 0,
                'level-1-row': params => params.data?.level === 1,
                'level-2-row': params => params.data?.level === 2,
                'level-3-row': params => params.data?.level === 3,
                
                // Special case classes
                'totaal-activa-row': params => params.data?.label === 'Totaal activa',
                'spacer-after-activa': params => params.data?.hierarchy?.[0] === 'SPACER_1'
            },

            onGridReady: params => {
                Logger.debug('Grid ready!', { rowCount: params.api.getDisplayedRowCount() });
                this.gridApi = params.api;
                this.columnApi = params.columnApi;
                params.api.sizeColumnsToFit();
            },

            onFirstDataRendered: params => {
                Logger.debug('First data rendered!', { rowCount: params.api.getDisplayedRowCount() });
                params.api.sizeColumnsToFit();
            }
        };

        // Destroy existing grid if it exists
        if (this.gridApi) {
            this.gridApi.destroy();
        }

        // Create new grid using v31 API
        this.gridApi = agGrid.createGrid(this.gridDiv, gridOptions);
    }

    // Prepare data for ag-Grid
    prepareDataForGrid(statementData, statementType) {
        // All statements now use configurable report system with rows array
        if (statementData.rows && Array.isArray(statementData.rows)) {
            Logger.debug('Using configurable report data', { rowCount: statementData.rows.length });
            return this._prepareConfigurableReportData(statementData);
        }

        // Fallback for unexpected data format
        Logger.error('Statement data missing rows array - expected configurable report format', statementData);
        throw new Error('Invalid statement data format: missing rows array. All statements must use configurable report definitions.');
    }

    /**
     * Prepare configurable report data for ag-Grid
     * 
     * Transforms report definition rows into ag-Grid compatible format.
     * Applies indentation, styling, and formatting from report definition.
     * Supports all layout item types: variable, calculated, category, subtotal, spacer.
     * 
     * @private
     * @param {Object} statementData - Statement data from report renderer
     * @param {Array} statementData.rows - Array of row objects from report definition
     * @param {Object} statementData.metadata - Report metadata (reportId, reportName, reportVersion)
     * @returns {Array} Grid data ready for ag-Grid with proper styling and indentation
     * 
     * @example
     * const gridData = this._prepareConfigurableReportData({
     *   rows: [
     *     { order: 10, label: 'Revenue', type: 'variable', style: 'normal', indent: 0, ... },
     *     { order: 20, label: 'Expenses', type: 'variable', style: 'normal', indent: 0, ... },
     *     { order: 30, label: 'Net Income', type: 'calculated', style: 'total', indent: 0, ... }
     *   ],
     *   metadata: { reportId: 'income_simple', reportName: 'Simple Income Statement', ... }
     * });
     */
    _prepareConfigurableReportData(statementData) {
        const gridData = statementData.rows.map(row => {
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
    buildHierarchicalTree(details, detailLevel) {
        console.log('buildHierarchicalTree called', { detailCount: details.length, detailLevel });
        console.log('Sample detail row received:', details[0]);

        // Check how many rows have name3 and account data populated
        const rowsWithName3 = details.filter(d => d.name3 && d.name3.trim() !== '').length;
        const rowsWithAccounts = details.filter(d => {
            const hasCode = d.account_code && typeof d.account_code === 'string' && d.account_code.trim() !== '';
            return hasCode;
        }).length;
        const rowsWithEmptyAccount = details.filter(d => !d.account_code || d.account_code === '').length;
        const rowsWithUndefinedAccount = details.filter(d => d.account_code === undefined).length;

        console.log(`Rows with name3: ${rowsWithName3} out of ${details.length}`);
        console.log(`Rows with account_code (non-empty): ${rowsWithAccounts} out of ${details.length}`);
        console.log(`Rows with empty account_code: ${rowsWithEmptyAccount}`);
        console.log(`Rows with undefined account_code: ${rowsWithUndefinedAccount}`);

        // Show sample of first few rows with account data
        const samplesWithAccounts = details.filter(d => d.account_code && typeof d.account_code === 'string' && d.account_code.trim() !== '').slice(0, 3);
        console.log('Sample rows with accounts:', samplesWithAccounts);

        // Create hierarchy map to aggregate data
        const hierarchyMap = new Map();

        // Determine max depth based on detail level
        // Level hierarchy: code0 (Activa/Passiva) -> name0 (vaste/vlottende activa) -> name1 -> name2 -> name3 -> account
        const maxDepth = {
            'level0': 1,  // Show code0 only (Activa/Passiva)
            'level1': 2,  // Show code0 + name0
            'level2': 3,  // Show code0 + name0 + name1
            'level3': 4,  // Show code0 + name0 + name1 + name2
            'level4': 5,  // Show code0 + name0 + name1 + name2 + name3 (where applicable)
            'level5': 6   // Show all including account_code + account_description
        }[detailLevel] || 6;

        console.log('Max depth:', maxDepth);

        // Process each detail row
        details.forEach((row, idx) => {
            // Build hierarchy path based on detail level
            const pathParts = [];
            const codes = [];

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
                console.log(`Row ${idx}:`, {
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
                    const node = {
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
                const node = hierarchyMap.get(pathKey);
                node.amount_2024 += row.amount_2024 || 0;
                node.amount_2025 += row.amount_2025 || 0;
            }
        });

        // Calculate variances
        hierarchyMap.forEach(node => {
            node.variance_amount = node.amount_2025 - node.amount_2024;
            node.variance_percent = VarianceCalculator.calculatePercent(node.amount_2025 || 0, node.amount_2024 || 0);
        });

        // Convert to array and sort by code hierarchy (code0, code1, code2, then hierarchy path)
        const result = Array.from(hierarchyMap.values());
        result.sort((a, b) => {
            // Helper function to convert code to number for sorting
            const toNum = (code) => {
                if (!code && code !== 0) return 999999; // Empty codes go last
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
            const maxLength = Math.max(a.hierarchy.length, b.hierarchy.length);
            for (let i = 0; i < maxLength; i++) {
                const aVal = a.hierarchy[i] || '';
                const bVal = b.hierarchy[i] || '';
                if (aVal !== bVal) return aVal.localeCompare(bVal);
            }

            return 0;
        });

        console.log('Built hierarchy tree:', {
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
    getColumnDefs(statementType, year1, year2) {
        // Use ColumnDefBuilder to create column definitions
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
                this.currentStatementData.ltmInfo
            );
        }

        return builder.build();

        // OLD IMPLEMENTATION KEPT FOR REFERENCE - CAN BE REMOVED AFTER TESTING
        /*
        const columns = [
            // Category column with hierarchy indentation
            {
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
            },
            // Account code column removed - not available in aggregated data

            // Year columns
            {
                field: 'amount_2024',
                headerName: period1Label,
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value, params),
                cellClass: 'number-cell'
            },
            {
                field: 'amount_2025',
                headerName: period2Label,
                type: 'numericColumn',
                valueFormatter: params => this.formatCurrency(params.value, params),
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
                valueFormatter: params => this.formatCurrency(params.value, params),
                cellRenderer: params => this.varianceRenderer(params)
            });
        }
        if (variance2Mode === 'percent' || variance2Mode === 'both') {
            columns.push({
                field: 'variance_percent',
                headerName: 'Var %',
                type: 'numericColumn',
                valueFormatter: params => {
                    // For spacer rows, return empty string
                    if (params?.data?._rowType === 'spacer') return '';
                    return params.value != null ? params.value.toFixed(1) + '%' : '';
                },
                cellRenderer: params => this.varianceRenderer(params)
            });
        }

        return columns;
        */
    }

    // Format currency
    formatCurrency(value, params) {
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

        return VarianceCalculator.calculatePercent(total2, total1);
    }

    // Get row class for styling (not used with rowClassRules)
    getRowClass(params) {
        // Deprecated - now using rowClassRules instead
        return '';
    }

    // Export to Excel using ExcelJS
    async exportToExcel(statementName) {
        if (!this.gridApi) {
            console.error('Grid not initialized');
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

            console.log('Successfully exported to Excel');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
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
