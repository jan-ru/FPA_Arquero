#!/usr/bin/env -S deno run --allow-read
/**
 * Inspect Excel file structure using ExcelJS via Deno
 */

import ExcelJS from "npm:exceljs@4.4.0";

async function inspectExcel(filename: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`Inspecting: ${filename}`);
    console.log('='.repeat(80) + '\n');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filename);
        
        console.log(`Worksheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}\n`);
        
        workbook.worksheets.forEach(worksheet => {
            console.log(`\n--- Sheet: ${worksheet.name} ---`);
            console.log(`Row count: ${worksheet.rowCount}, Column count: ${worksheet.columnCount}\n`);
            
            // Print first 20 rows to see the structure
            console.log('First 20 rows:');
            let rowNum = 0;
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= 20) {
                    const values = row.values as any[];
                    // Skip index 0 which is undefined in ExcelJS
                    const cleanValues = values.slice(1);
                    console.log(`Row ${rowNumber}: [${cleanValues.map(v => 
                        v === null || v === undefined ? 'null' : 
                        typeof v === 'object' ? JSON.stringify(v) : 
                        `"${v}"`
                    ).join(', ')}]`);
                }
            });
            
            // Print column headers (assuming row 1)
            console.log('\nColumn Headers (Row 1):');
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell, colNumber) => {
                console.log(`  Col ${colNumber}: "${cell.value}"`);
            });
            
            // Show data types in row 2
            console.log('\nData types in Row 2:');
            const dataRow = worksheet.getRow(2);
            dataRow.eachCell((cell, colNumber) => {
                console.log(`  Col ${colNumber}: ${typeof cell.value} - "${cell.value}"`);
            });
            
            console.log('\n' + '-'.repeat(80));
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error(error.stack);
    }
}

async function main() {
    const files = [
        'input/2024_BalansenWinstverliesperperiode.xlsx',
        'input/2025_BalansenWinstverliesperperiode.xlsx',
        'input/DimAccounts.xlsx',
        'input/DimDates.xlsx'
    ];
    
    for (const file of files) {
        try {
            await inspectExcel(file);
        } catch (error) {
            console.log(`\nCould not inspect ${file}: ${error.message}\n`);
        }
    }
}

main().catch(console.error);
