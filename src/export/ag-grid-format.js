/**
 * ag-grid-format.js - Functions that compute cell styles for the ag-Grid
 *
 * This module defines the styling rules for ag-Grid cells based on:
 * - Row type (total, metric, group, detail, spacer)
 * - Cell type (category, amount, variance)
 * - Data values (positive/negative, zero)
 *
 * These styles are then mapped to Excel formats by excel-format.js
 */

/**
 * Get cell style for a grid cell based on row type and column
 * @param {Object} params - ag-Grid cell renderer params
 * @param {Object} params.data - Row data
 * @param {Object} params.colDef - Column definition
 * @param {*} params.value - Cell value
 * @returns {Object} Style object with properties: font, fill, alignment, border, numFmt
 */
export function getCellStyle(params) {
    if (!params.data) {
        return getDefaultStyle();
    }

    const rowType = params.data._rowType || 'detail';
    const field = params.colDef.field;
    const value = params.value;

    // Base style
    const style = {
        font: {
            name: 'Calibri',
            size: 11,
            bold: false,
            italic: false,
            color: { argb: 'FF000000' }
        },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
        },
        alignment: {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: false
        },
        border: {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        },
        numFmt: null
    };

    // Apply row type styling
    switch (rowType) {
        case 'total':
            style.font.bold = true;
            style.font.size = 11;
            style.fill.fgColor = { argb: 'FFF0F0F0' };
            style.border.top = { style: 'medium', color: { argb: 'FF000000' } };
            style.border.bottom = { style: 'double', color: { argb: 'FF000000' } };
            break;

        case 'metric':
            style.font.bold = true;
            style.font.size = 11;
            style.fill.fgColor = { argb: 'FFF8F9FA' };
            style.border.top = { style: 'thin', color: { argb: 'FF666666' } };
            style.border.bottom = { style: 'thin', color: { argb: 'FF666666' } };
            break;

        case 'group':
            style.font.bold = true;
            style.font.size = 11;
            style.fill.fgColor = { argb: 'FFFAFAFA' };
            break;

        case 'spacer':
            style.fill.fgColor = { argb: 'FFFFFFFF' };
            style.border = {}; // No borders for spacer rows
            break;

        case 'detail':
        default:
            // Default detail styling already set
            break;
    }

    // Apply column-specific styling
    if (field === 'label') {
        // Category column
        const level = params.data.level || 0;
        style.alignment.horizontal = 'left';
        style.alignment.indent = level; // Indent based on hierarchy level

        if (rowType === 'total' || rowType === 'group') {
            style.font.bold = true;
        }
    } else if (field && (field.startsWith('amount_') || field.startsWith('month_') || field === 'ltm_total')) {
        // Amount columns
        style.alignment.horizontal = 'right';
        style.numFmt = '#,##0;[Red]-#,##0'; // Number format with red negatives (no decimals)

        // Color negative values red
        if (value != null && typeof value === 'number' && value < 0) {
            style.font.color = { argb: 'FFDC3545' }; // Red for negative
        }
    } else if (field && field.startsWith('variance_')) {
        // Variance columns
        style.alignment.horizontal = 'right';

        if (field === 'variance_amount') {
            style.numFmt = '#,##0;[Red]-#,##0'; // No decimals
        } else if (field === 'variance_percent') {
            style.numFmt = '0.0"%"';
        }

        // Color variance based on value
        if (value != null && typeof value === 'number') {
            if (value > 0) {
                style.font.color = { argb: 'FF28A745' }; // Green for positive
                style.font.bold = true;
            } else if (value < 0) {
                style.font.color = { argb: 'FFDC3545' }; // Red for negative
                style.font.bold = true;
            }
        }
    }

    return style;
}

/**
 * Get header style for column headers
 * @param {string} headerName - Column header text
 * @param {string} field - Column field name
 * @returns {Object} Style object for header cell
 */
export function getHeaderStyle(headerName, field) {
    return {
        font: {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFFFF' }
        },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Blue header background
        },
        alignment: {
            vertical: 'middle',
            horizontal: field === 'label' ? 'left' : 'center',
            wrapText: true
        },
        border: {
            top: { style: 'medium', color: { argb: 'FF2F5597' } },
            bottom: { style: 'medium', color: { argb: 'FF2F5597' } },
            left: { style: 'thin', color: { argb: 'FF2F5597' } },
            right: { style: 'thin', color: { argb: 'FF2F5597' } }
        }
    };
}

/**
 * Get default style for empty/undefined cells
 * @returns {Object} Default style object
 */
function getDefaultStyle() {
    return {
        font: {
            name: 'Calibri',
            size: 11,
            bold: false,
            color: { argb: 'FF000000' }
        },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
        },
        alignment: {
            vertical: 'middle',
            horizontal: 'left'
        },
        border: {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        }
    };
}

/**
 * Get row height based on row type
 * @param {string} rowType - Type of row (total, metric, group, detail, spacer)
 * @returns {number} Height in points
 */
export function getRowHeight(rowType) {
    switch (rowType) {
        case 'total':
            return 24; // 32px
        case 'metric':
            return 22; // 29px
        case 'group':
            return 20; // 27px
        case 'spacer':
            return 12; // 16px
        case 'detail':
        default:
            return 18; // 24px
    }
}

/**
 * Get column width based on field
 * @param {string} field - Column field name
 * @param {string} headerName - Column header text
 * @returns {number} Width in characters (Excel units)
 */
export function getColumnWidth(field, headerName) {
    if (field === 'label') {
        return 50; // Category column is widest
    } else if (field && (field.startsWith('amount_') || field.startsWith('month_') || field === 'ltm_total')) {
        return 15; // Amount columns
    } else if (field && field.startsWith('variance_')) {
        return 12; // Variance columns
    }
    return 12; // Default width
}

export default {
    getCellStyle,
    getHeaderStyle,
    getRowHeight,
    getColumnWidth
};
