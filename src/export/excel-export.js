import Logger from '../utils/Logger.ts';

/**
 * excel-export.js - Main Excel export functionality
 *
 * This module glues together:
 * - ag-grid-format.js (grid styling)
 * - excel-format.js (ExcelJS mapping)
 * - Current grid data and column definitions
 *
 * It creates properly formatted Excel files that preserve the look and feel
 * of the ag-Grid display.
 */

import { getCellStyle, getHeaderStyle, getRowHeight, getColumnWidth } from './ag-grid-format.js';
import {
    applyCellStyle,
    applyHeaderStyle,
    setColumnWidth,
    setRowHeight,
    freezePanes,
    applyAutoFilter,
    addMetadata,
    addPrintSettings,
    addHeaderFooter
} from './excel-format.js';

class ExcelExporter {
    constructor() {
        this.workbook = null;
        this.worksheet = null;
    }

    /**
     * Export grid data to Excel
     * @param {Object} gridApi - ag-Grid API
     * @param {Array} columnDefs - Column definitions from ag-Grid
     * @param {string} statementName - Name of the statement
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async exportToExcel(gridApi, columnDefs, statementName, options = {}) {
        if (!gridApi) {
            throw new Error('Grid API not available');
        }

        // Create new workbook
        this.workbook = new ExcelJS.Workbook();
        addMetadata(this.workbook, statementName);

        // Add worksheet
        this.worksheet = this.workbook.addWorksheet(statementName, {
            properties: { tabColor: { argb: 'FF4472C4' } }
        });

        // Get grid data
        const rowData = [];
        gridApi.forEachNodeAfterFilterAndSort((node) => {
            if (node.data) {
                rowData.push(node.data);
            }
        });

        // Write data to worksheet
        await this.writeDataToWorksheet(rowData, columnDefs, options);

        // Apply formatting
        this.applyFormatting(columnDefs, rowData.length, options);

        // Download file
        await this.downloadWorkbook(statementName);
    }

    /**
     * Write data to worksheet
     * @param {Array} rowData - Row data from grid
     * @param {Array} columnDefs - Column definitions
     * @param {Object} options - Export options
     */
    async writeDataToWorksheet(rowData, columnDefs, options) {
        // Write header row
        const headerRow = this.worksheet.getRow(1);
        const visibleColumns = columnDefs.filter(col => !col.hide);

        visibleColumns.forEach((colDef, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = colDef.headerName || colDef.field;

            // Apply header style
            const headerStyle = getHeaderStyle(colDef.headerName, colDef.field);
            applyHeaderStyle(cell, headerStyle);

            // Set column width
            const column = this.worksheet.getColumn(index + 1);
            const width = getColumnWidth(colDef.field, colDef.headerName);
            setColumnWidth(column, width);
        });

        setRowHeight(headerRow, 20); // Header row height

        // Write data rows
        rowData.forEach((data, rowIndex) => {
            const excelRow = this.worksheet.getRow(rowIndex + 2); // +2 because row 1 is header
            const rowType = data._rowType || 'detail';

            visibleColumns.forEach((colDef, colIndex) => {
                const cell = excelRow.getCell(colIndex + 1);
                const value = data[colDef.field];

                // Set cell value
                if (value !== undefined && value !== null) {
                    // For label column, handle indentation
                    if (colDef.field === 'label') {
                        cell.value = value;
                    } else if (typeof value === 'number') {
                        cell.value = value;
                    } else {
                        cell.value = value;
                    }
                }

                // Apply cell style
                const cellStyle = getCellStyle({
                    data: data,
                    colDef: colDef,
                    value: value
                });
                applyCellStyle(cell, cellStyle);
            });

            // Set row height based on row type
            const height = getRowHeight(rowType);
            setRowHeight(excelRow, height);
        });
    }

    /**
     * Apply formatting to worksheet
     * @param {Array} columnDefs - Column definitions
     * @param {number} dataRowCount - Number of data rows
     * @param {Object} options - Export options
     */
    applyFormatting(columnDefs, dataRowCount, options) {
        const visibleColumns = columnDefs.filter(col => !col.hide);

        // Freeze panes (header row and category column)
        freezePanes(this.worksheet, 2, 2);

        // Apply auto-filter to header row
        applyAutoFilter(this.worksheet, 1, 1, visibleColumns.length);

        // Add print settings
        addPrintSettings(this.worksheet);

        // Add header/footer with title and period info
        const subtitle = options.subtitle || new Date().toLocaleDateString();
        addHeaderFooter(this.worksheet, options.title || 'Financial Statement', subtitle);
    }

    /**
     * Download workbook as Excel file
     * @param {string} fileName - Base file name
     */
    async downloadWorkbook(fileName) {
        const timestamp = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}_${timestamp}.xlsx`;

        // Generate Excel file as buffer
        const buffer = await this.workbook.xlsx.writeBuffer();

        // Create blob and download
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fullFileName;
        link.click();

        // Cleanup
        window.URL.revokeObjectURL(url);

        Logger.info('Exported to Excel:', fullFileName);
    }

    /**
     * Export with LTM-specific formatting
     * @param {Object} gridApi - ag-Grid API
     * @param {Array} columnDefs - Column definitions
     * @param {string} statementName - Name of the statement
     * @param {Object} ltmInfo - LTM information
     */
    async exportLTMToExcel(gridApi, columnDefs, statementName, ltmInfo) {
        const options = {
            title: statementName,
            subtitle: ltmInfo.label || 'LTM Report',
            isLTM: true
        };

        await this.exportToExcel(gridApi, columnDefs, statementName, options);
    }

    /**
     * Export multiple statements to a single workbook (optional enhancement)
     * @param {Array} statements - Array of {gridApi, columnDefs, name}
     * @param {string} workbookName - Workbook name
     */
    async exportMultipleStatements(statements, workbookName) {
        this.workbook = new ExcelJS.Workbook();
        addMetadata(this.workbook, workbookName);

        for (const statement of statements) {
            this.worksheet = this.workbook.addWorksheet(statement.name, {
                properties: { tabColor: { argb: 'FF4472C4' } }
            });

            const rowData = [];
            statement.gridApi.forEachNodeAfterFilterAndSort((node) => {
                if (node.data) {
                    rowData.push(node.data);
                }
            });

            await this.writeDataToWorksheet(rowData, statement.columnDefs, {});
            this.applyFormatting(statement.columnDefs, rowData.length, {
                title: statement.name
            });
        }

        await this.downloadWorkbook(workbookName);
    }
}

// Export singleton instance
const excelExporter = new ExcelExporter();

/**
 * Convenience function to export current grid
 * @param {Object} gridApi - ag-Grid API
 * @param {Array} columnDefs - Column definitions
 * @param {string} statementName - Name of the statement
 * @param {Object} options - Export options
 */
export async function exportGridToExcel(gridApi, columnDefs, statementName, options = {}) {
    return excelExporter.exportToExcel(gridApi, columnDefs, statementName, options);
}

/**
 * Convenience function to export LTM grid
 * @param {Object} gridApi - ag-Grid API
 * @param {Array} columnDefs - Column definitions
 * @param {string} statementName - Name of the statement
 * @param {Object} ltmInfo - LTM information
 */
export async function exportLTMGridToExcel(gridApi, columnDefs, statementName, ltmInfo) {
    return excelExporter.exportLTMToExcel(gridApi, columnDefs, statementName, ltmInfo);
}

/**
 * Convenience function to export multiple statements
 * @param {Array} statements - Array of {gridApi, columnDefs, name}
 * @param {string} workbookName - Workbook name
 */
export async function exportMultipleStatementsToExcel(statements, workbookName) {
    return excelExporter.exportMultipleStatements(statements, workbookName);
}

export default {
    exportGridToExcel,
    exportLTMGridToExcel,
    exportMultipleStatementsToExcel,
    ExcelExporter
};
