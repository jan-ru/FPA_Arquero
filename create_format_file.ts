#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Create a minimal format.xlsx file for statement formatting
 */

import ExcelJS from "npm:exceljs@4.4.0";

async function createFormatFile() {
    console.log('Creating format.xlsx...');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Format');
    
    // Add headers
    worksheet.addRow(['statement_type', 'line_number', 'line_type', 'line_label', 'category_filter']);
    
    // Add minimal format data (this is optional - the app will work without detailed formatting)
    const formatData = [
        // Balance Sheet
        ['BS', 10, 'detail', 'Assets', 'Assets'],
        ['BS', 20, 'subtotal', 'Total Assets', 'Assets'],
        ['BS', 30, 'empty', '', ''],
        ['BS', 40, 'detail', 'Liabilities', 'Liabilities'],
        ['BS', 50, 'subtotal', 'Total Liabilities', 'Liabilities'],
        ['BS', 60, 'empty', '', ''],
        
        // Income Statement
        ['IS', 10, 'detail', 'Revenue', 'Revenue'],
        ['IS', 20, 'detail', 'Expenses', 'Expenses'],
        ['IS', 30, 'subtotal', 'Net Income', ''],
        
        // Cash Flow (placeholder)
        ['CF', 10, 'detail', 'Operating Activities', 'Operating Activities'],
        ['CF', 20, 'detail', 'Investing Activities', 'Investing Activities'],
        ['CF', 30, 'detail', 'Financing Activities', 'Financing Activities']
    ];
    
    formatData.forEach(row => {
        worksheet.addRow(row);
    });
    
    // Format header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Set column widths
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 12;
    worksheet.getColumn(3).width = 12;
    worksheet.getColumn(4).width = 30;
    worksheet.getColumn(5).width = 20;
    
    await workbook.xlsx.writeFile('input/format.xlsx');
    console.log('✅ Created input/format.xlsx');
}

createFormatFile().catch(console.error);
