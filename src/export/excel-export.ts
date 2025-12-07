import Logger from '../utils/Logger.ts';

/**
 * excel-export.ts - Main Excel export functionality
 *
 * This module glues together:
 * - ag-grid-format.ts (grid styling)
 * - excel-format.ts (ExcelJS mapping)
 * - Current grid data and column definitions
 *
 * It creates properly formatted Excel files that preserve the look and feel
 * of the ag-Grid display.
 */

import { getCellStyle, getHeaderStyle, getRowHeight, getColumnWidth } from './ag-grid-format.ts';
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
} from './excel-format.ts';

// Global ExcelJS type
declare const ExcelJS: any;

// Type definitions
interface GridApi {
    forEachNodeAfterFilterAndSort(callback: (node: any) => void): void;
}

interface ColumnDef {
    field?: string;
    headerName?: string;
    hide?: boolean;
    [key: string]: any;
}

interface ExportOptions {
    title?: string;
    subtitle?: string;
    isLTM?: boolean;
    [key: string]: any;
}

interface LTMInfo {
    label?: string;
    [key: string]: any;
}

interface Statement {
    gridApi: GridApi;
    columnDefs: ColumnDef[];
    name: string;
}

class ExcelExporter {
    private workbook: any;
    private worksheet: any;

    constructor() {
        this.workbook = null;
        this.worksheet = null;
    }

    /**
     * Export grid data to Excel
     * @param gridApi - ag-Grid API
     * @param columnDefs - Column definitions from ag-Grid
     * @param statementName - Name of the statement
     * @param options - Export options
     */
    async exportToExcel(
        gridApi: GridApi,
        columnDefs: ColumnDef[],
        statementName: string,
        options: ExportOptions = {}
    ): Promise<void> {
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
        const rowData: any[] = [];
        gridApi.forEachNodeAfterFilterAndSort((node: any) => {
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
     * @param rowData - Row data from grid
     * @param columnDefs - Column definitions
     * @param options - Export options
     */
    async writeDataToWorksheet(
        rowData: any[],
        columnDefs: ColumnDef[],
        options: ExportOptions
    ): Promise<void> {
        // Write header row
        const headerRow = this.worksheet.getRow(1);
        const visibleColumns = columnDefs.filter(col => !col.hide);

        visibleColumns.forEach((colDef, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = colDef.headerName || colDef.field;

            // Apply header style
            const headerStyle = getHeaderStyle(colDef.headerName || '', colDef.field);
            applyHeaderStyle(cell, headerStyle);

            // Set column width
            const column = this.worksheet.getColumn(index + 1);
            const width = getColumnWidth(colDef.field || '', colDef.headerName);
            setColumnWidth(column, width);
        });

        setRowHeight(headerRow, 20); // Header row height

        // Write data rows
        rowData.forEach((data, rowIndex) => {
            const excelRow = this.worksheet.getRow(rowIndex + 2); // +2 because row 1 is header
            const rowType = data._rowType || 'detail';

            visibleColumns.forEach((colDef, colIndex) => {
                const cell = excelRow.getCell(colIndex + 1);
                const value = data[colDef.field || ''];

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
     * @param columnDefs - Column definitions
     * @param dataRowCount - Number of data rows
     * @param options - Export options
     */
    applyFormatting(columnDefs: ColumnDef[], dataRowCount: number, options: ExportOptions): void {
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
     * @param fileName - Base file name
     */
    async downloadWorkbook(fileName: string): Promise<void> {
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
     * @param gridApi - ag-Grid API
     * @param columnDefs - Column definitions
     * @param statementName - Name of the statement
     * @param ltmInfo - LTM information
     */
    async exportLTMToExcel(
        gridApi: GridApi,
        columnDefs: ColumnDef[],
        statementName: string,
        ltmInfo: LTMInfo
    ): Promise<void> {
        const options: ExportOptions = {
            title: statementName,
            subtitle: ltmInfo.label || 'LTM Report',
            isLTM: true
        };

        await this.exportToExcel(gridApi, columnDefs, statementName, options);
    }

    /**
     * Export multiple statements to a single workbook (optional enhancement)
     * @param statements - Array of {gridApi, columnDefs, name}
     * @param workbookName - Workbook name
     */
    async exportMultipleStatements(statements: Statement[], workbookName: string): Promise<void> {
        this.workbook = new ExcelJS.Workbook();
        addMetadata(this.workbook, workbookName);

        for (const statement of statements) {
            this.worksheet = this.workbook.addWorksheet(statement.name, {
                properties: { tabColor: { argb: 'FF4472C4' } }
            });

            const rowData: any[] = [];
            statement.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
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
 * @param gridApi - ag-Grid API
 * @param columnDefs - Column definitions
 * @param statementName - Name of the statement
 * @param options - Export options
 */
export async function exportGridToExcel(
    gridApi: GridApi,
    columnDefs: ColumnDef[],
    statementName: string,
    options: ExportOptions = {}
): Promise<void> {
    return excelExporter.exportToExcel(gridApi, columnDefs, statementName, options);
}

/**
 * Convenience function to export LTM grid
 * @param gridApi - ag-Grid API
 * @param columnDefs - Column definitions
 * @param statementName - Name of the statement
 * @param ltmInfo - LTM information
 */
export async function exportLTMGridToExcel(
    gridApi: GridApi,
    columnDefs: ColumnDef[],
    statementName: string,
    ltmInfo: LTMInfo
): Promise<void> {
    return excelExporter.exportLTMToExcel(gridApi, columnDefs, statementName, ltmInfo);
}

/**
 * Convenience function to export multiple statements
 * @param statements - Array of {gridApi, columnDefs, name}
 * @param workbookName - Workbook name
 */
export async function exportMultipleStatementsToExcel(
    statements: Statement[],
    workbookName: string
): Promise<void> {
    return excelExporter.exportMultipleStatements(statements, workbookName);
}

export default {
    exportGridToExcel,
    exportLTMGridToExcel,
    exportMultipleStatementsToExcel,
    ExcelExporter
};
