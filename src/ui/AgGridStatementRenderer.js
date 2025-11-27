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
import Logger from '../utils/Logger.js';
import HierarchyBuilder from '../utils/HierarchyBuilder.js';
import SpecialRowsFactory from '../statements/specialrows/SpecialRowsFactory.js';
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
            rowClassRules: {
                'total-row': params => params.data?._rowType === 'total',
                'metric-row': params => params.data?._rowType === 'metric',
                'group-row': params => params.data?._rowType === 'group',
                'level-0-row': params => params.data?.level === 0,
                'level-1-row': params => params.data?.level === 1,
                'level-2-row': params => params.data?.level === 2,
                'level-3-row': params => params.data?.level === 3,
                'totaal-activa-row': params => params.data?.label === 'Totaal activa'
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
        const details = statementData.details.objects();

        // Get detail level setting
        const detailLevel = document.getElementById('detail-level')?.value || 'level5';

        // Build hierarchical tree structure using HierarchyBuilder
        let gridData = HierarchyBuilder.buildTree(details, detailLevel);

        // Insert special rows based on statement type using factory
        const specialRowsHandler = SpecialRowsFactory.create(statementType);
        gridData = specialRowsHandler.insert(gridData, statementData);

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

    // Insert Balance Sheet special rows (Totaal activa, Totaal passiva)
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
            CategoryMatcher.isLiabilityOrEquity(row.name1) ||
            CategoryMatcher.isLiabilityOrEquity(row.name0)
        );

        if (insertIndex > 0) {
            const assetsVariance = totalAssetsYear2 - totalAssetsYear1;
            const assetsVariancePercent = VarianceCalculator.calculatePercent(totalAssetsYear2, totalAssetsYear1);

            // Insert Totaal activa row
            result.splice(insertIndex, 0, {
                hierarchy: ['Totaal activa'],
                level: 0,
                label: 'Totaal activa',
                name0: '',
                name1: '',
                name2: 'Totaal activa',
                amount_2024: totalAssetsYear1,
                amount_2025: totalAssetsYear2,
                variance_amount: assetsVariance,
                variance_percent: assetsVariancePercent,
                _isMetric: true,
                _rowType: 'total'
            });

            // Insert blank/spacer row after Totaal activa
            result.splice(insertIndex + 1, 0, {
                hierarchy: ['SPACER_1'],
                level: 0,
                label: '',
                name0: '',
                name1: '',
                name2: '',
                amount_2024: null,
                amount_2025: null,
                variance_amount: null,
                variance_percent: null,
                _isMetric: false,
                _rowType: 'spacer'
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
        const leVariancePercent = VarianceCalculator.calculatePercent(totalLEYear2, totalLEYear1);

        result.push({
            hierarchy: ['Totaal passiva'],
            level: 0,
            label: 'Totaal passiva',
            name0: '',
            name1: '',
            name2: 'Totaal passiva',
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

        // 1. Insert Bruto marge (Gross Margin) after COGS
        // Try multiple patterns to find COGS row
        let cogsIndex = result.findIndex(row =>
            row.label && (
                row.label.toLowerCase().includes('kostprijs') ||
                row.label.toLowerCase().includes('cogs') ||
                row.label.toLowerCase().includes('cost of goods')
            )
        );

        console.log('Income Statement - looking for COGS:', { cogsIndex, hasMetrics: !!metrics.grossProfit });
        console.log('Sample rows:', result.slice(0, 10).map(r => ({ label: r.label, name2: r.name2 })));

        if (cogsIndex >= 0 && metrics.grossProfit) {
            const gpVariance = metrics.grossProfit[year2] - metrics.grossProfit[year1];
            const gpVariancePercent = VarianceCalculator.calculatePercent(metrics.grossProfit[year2], metrics.grossProfit[year1]);

            // Insert Bruto marge subtotal
            result.splice(cogsIndex + 1, 0, {
                hierarchy: ['Bruto marge'],
                level: 0,
                label: 'Bruto marge',
                name0: '',
                name1: '',
                name2: 'Bruto marge',
                amount_2024: metrics.grossProfit[year1],
                amount_2025: metrics.grossProfit[year2],
                variance_amount: gpVariance,
                variance_percent: gpVariancePercent,
                _isMetric: true,
                _rowType: 'metric'
            });

            // Insert blank/spacer row after Bruto marge
            result.splice(cogsIndex + 2, 0, {
                hierarchy: ['SPACER_GROSS_MARGIN'],
                level: 0,
                label: '',
                name0: '',
                name1: '',
                name2: '',
                amount_2024: null,
                amount_2025: null,
                variance_amount: null,
                variance_percent: null,
                _isMetric: false,
                _rowType: 'spacer'
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
            const oiVariancePercent = VarianceCalculator.calculatePercent(metrics.operatingIncome[year2], metrics.operatingIncome[year1]);

            result.splice(opexIndex + 1, 0, {
                hierarchy: ['Operating Income'],
                level: 0,
                label: 'Operating Income',
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
            const niVariancePercent = VarianceCalculator.calculatePercent(metrics.netIncome[year2], metrics.netIncome[year1]);

            result.push({
                hierarchy: ['NET INCOME'],
                level: 0,
                label: 'NET INCOME',
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

        // Starting Cash
        if (metrics.startingCash) {
            const scVariance = metrics.startingCash[year2] - metrics.startingCash[year1];
            const scVariancePercent = VarianceCalculator.calculatePercent(metrics.startingCash[year2], metrics.startingCash[year1]);

            result.push({
                hierarchy: ['Cash Reconciliation', 'Starting Cash'],
                level: 1,
                label: 'Starting Cash',
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
                hierarchy: ['Cash Reconciliation', 'Changes in Cash'],
                level: 1,
                label: 'Changes in Cash',
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
            const ecVariancePercent = VarianceCalculator.calculatePercent(metrics.endingCash[year2], metrics.endingCash[year1]);

            result.push({
                hierarchy: ['Cash Reconciliation', 'Ending Cash'],
                level: 1,
                label: 'Ending Cash',
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
        // Use ColumnDefBuilder to create column definitions
        const builder = new ColumnDefBuilder(statementType, year1, year2);
        builder.setFormatters(
            (value, params) => this.formatCurrency(value, params),
            (params) => this.varianceRenderer(params)
        );

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
