/**
 * excel-format.ts - Functions that map AG-Grid styles to ExcelJS styles
 *
 * This module converts the style objects from ag-grid-format.ts into
 * ExcelJS-compatible format objects that can be applied to worksheet cells.
 *
 * ExcelJS uses a different API for styling than our internal format,
 * so this module handles the conversion.
 */

import type { CellStyle } from './ag-grid-format.ts';

// ExcelJS types (minimal definitions for what we use)
interface ExcelCell {
    font?: any;
    fill?: any;
    alignment?: any;
    border?: any;
    numFmt?: string;
}

interface ExcelColumn {
    width?: number;
}

interface ExcelRow {
    height?: number;
    getCell(col: number): ExcelCell;
}

interface ExcelWorksheet {
    getRow(row: number): ExcelRow;
    views?: any[];
    autoFilter?: string;
    pageSetup?: any;
    headerFooter?: any;
}

interface ExcelWorkbook {
    creator?: string;
    lastModifiedBy?: string;
    created?: Date;
    modified?: Date;
    lastPrinted?: Date;
    properties?: any;
}

/**
 * Apply style from ag-grid-format to an ExcelJS cell
 * @param cell - ExcelJS cell object
 * @param style - Style object from ag-grid-format.ts
 */
export function applyCellStyle(cell: ExcelCell, style: CellStyle): void {
    if (!cell || !style) return;

    // Apply font
    if (style.font) {
        cell.font = {
            name: style.font.name || 'Calibri',
            size: style.font.size || 11,
            bold: style.font.bold || false,
            italic: style.font.italic || false,
            color: style.font.color || { argb: 'FF000000' }
        };
    }

    // Apply fill
    if (style.fill) {
        cell.fill = {
            type: style.fill.type || 'pattern',
            pattern: style.fill.pattern || 'solid',
            fgColor: style.fill.fgColor || { argb: 'FFFFFFFF' }
        };
    }

    // Apply alignment
    if (style.alignment) {
        cell.alignment = {
            vertical: style.alignment.vertical || 'middle',
            horizontal: style.alignment.horizontal || 'left',
            wrapText: style.alignment.wrapText || false,
            indent: style.alignment.indent || 0
        };
    }

    // Apply border
    if (style.border) {
        cell.border = {};

        if (style.border.top) {
            cell.border.top = {
                style: style.border.top.style || 'thin',
                color: style.border.top.color || { argb: 'FF000000' }
            };
        }
        if (style.border.bottom) {
            cell.border.bottom = {
                style: style.border.bottom.style || 'thin',
                color: style.border.bottom.color || { argb: 'FF000000' }
            };
        }
        if (style.border.left) {
            cell.border.left = {
                style: style.border.left.style || 'thin',
                color: style.border.left.color || { argb: 'FF000000' }
            };
        }
        if (style.border.right) {
            cell.border.right = {
                style: style.border.right.style || 'thin',
                color: style.border.right.color || { argb: 'FF000000' }
            };
        }
    }

    // Apply number format
    if (style.numFmt) {
        cell.numFmt = style.numFmt;
    }
}

/**
 * Apply header style to a cell
 * @param cell - ExcelJS cell object
 * @param headerStyle - Header style from ag-grid-format.ts
 */
export function applyHeaderStyle(cell: ExcelCell, headerStyle: CellStyle): void {
    applyCellStyle(cell, headerStyle);
}

/**
 * Set column width
 * @param column - ExcelJS column object
 * @param width - Width in characters
 */
export function setColumnWidth(column: ExcelColumn, width: number): void {
    column.width = width;
}

/**
 * Set row height
 * @param row - ExcelJS row object
 * @param height - Height in points
 */
export function setRowHeight(row: ExcelRow, height: number): void {
    row.height = height;
}

/**
 * Apply alternating row colors for better readability
 * @param worksheet - ExcelJS worksheet
 * @param startRow - Start row number (1-based)
 * @param endRow - End row number (1-based)
 * @param startCol - Start column number (1-based)
 * @param endCol - End column number (1-based)
 */
export function applyAlternatingRows(
    worksheet: ExcelWorksheet,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number
): void {
    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const row = worksheet.getRow(rowNum);

        // Apply alternating background to even rows
        if (rowNum % 2 === 0) {
            for (let colNum = startCol; colNum <= endCol; colNum++) {
                const cell = row.getCell(colNum);
                if (!cell.fill || cell.fill.fgColor.argb === 'FFFFFFFF') {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9F9F9' } // Very light gray
                    };
                }
            }
        }
    }
}

/**
 * Freeze panes to keep headers visible
 * @param worksheet - ExcelJS worksheet
 * @param row - Row to freeze at (1-based, freeze rows above this)
 * @param column - Column to freeze at (1-based, freeze columns left of this)
 */
export function freezePanes(worksheet: ExcelWorksheet, row: number = 2, column: number = 2): void {
    // Freeze first row (header) and first column (category)
    worksheet.views = [
        {
            state: 'frozen',
            xSplit: column - 1,
            ySplit: row - 1,
            topLeftCell: `${getColumnLetter(column)}${row}`,
            activeCell: 'A1'
        }
    ];
}

/**
 * Apply auto-filter to header row
 * @param worksheet - ExcelJS worksheet
 * @param startRow - Header row number (1-based)
 * @param startCol - Start column (1-based)
 * @param endCol - End column (1-based)
 */
export function applyAutoFilter(
    worksheet: ExcelWorksheet,
    startRow: number,
    startCol: number,
    endCol: number
): void {
    const startCell = `${getColumnLetter(startCol)}${startRow}`;
    const endCell = `${getColumnLetter(endCol)}${startRow}`;
    worksheet.autoFilter = `${startCell}:${endCell}`;
}

/**
 * Convert column number to Excel column letter
 * @param col - Column number (1-based)
 * @returns Column letter (A, B, ..., Z, AA, AB, ...)
 */
function getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
        const remainder = (col - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        col = Math.floor((col - 1) / 26);
    }
    return letter;
}

/**
 * Add metadata to workbook
 * @param workbook - ExcelJS workbook
 * @param title - Report title
 * @param author - Author name
 */
export function addMetadata(
    workbook: ExcelWorkbook,
    title: string,
    author: string = 'Financial Statement Generator'
): void {
    workbook.creator = author;
    workbook.lastModifiedBy = author;
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // Add document properties
    workbook.properties = {
        title: title,
        subject: 'Financial Statement',
        keywords: 'finance, statement, report',
        category: 'Financial Reports',
        description: `Generated on ${new Date().toLocaleDateString()}`
    };
}

/**
 * Add print settings optimized for A4 landscape
 * @param worksheet - ExcelJS worksheet
 */
export function addPrintSettings(worksheet: ExcelWorksheet): void {
    worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // Allow multiple pages vertically
        margins: {
            left: 0.5,
            right: 0.5,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3
        },
        printTitlesRow: '1:1', // Repeat header row on each page
        horizontalCentered: true
    };
}

/**
 * Add header and footer to worksheet
 * @param worksheet - ExcelJS worksheet
 * @param title - Report title
 * @param subtitle - Report subtitle (e.g., period)
 */
export function addHeaderFooter(worksheet: ExcelWorksheet, title: string, subtitle: string): void {
    worksheet.headerFooter = {
        firstHeader: `&C&B${title}\n${subtitle}`,
        firstFooter: `&LGenerated: ${new Date().toLocaleDateString()}&RPage &P of &N`,
        evenHeader: `&C&B${title}\n${subtitle}`,
        evenFooter: `&LGenerated: ${new Date().toLocaleDateString()}&RPage &P of &N`,
        oddHeader: `&C&B${title}\n${subtitle}`,
        oddFooter: `&LGenerated: ${new Date().toLocaleDateString()}&RPage &P of &N`
    };
}

export default {
    applyCellStyle,
    applyHeaderStyle,
    setColumnWidth,
    setRowHeight,
    applyAlternatingRows,
    freezePanes,
    applyAutoFilter,
    addMetadata,
    addPrintSettings,
    addHeaderFooter
};
