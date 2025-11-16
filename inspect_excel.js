#!/usr/bin/env node
/**
 * Inspect Excel file structure using ExcelJS
 */

const ExcelJS = require('exceljs');
const fs = require('fs');

async function inspectExcel(filename) {
    console.log('\n' + '='.repeat(80));
    console.log(`Inspecting: ${filename}`);
    console.log('='.repeat(80) + '\n');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filename);
        
        console.log(`Worksheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}\n`);
        
        workbook.worksheets.forEach(worksheet => {
            console.log(`\n--- Sheet: ${worksheet.name} ---`);
            console.log(`Dimensions: ${worksheet.dimensions?.model || 'N/A'}`);
            console.log(`Row count: ${worksheet.rowCount}, Column count: ${worksheet.columnCount}\n`);
            
            // Print first 15 rows
            console.log('First 15 rows:');
            let rowNum = 0;
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= 15) {
                    const values = row.values.slice(1); // Skip index 0
                    console.log(`Row ${rowNumber}: ${JSON.stringify(values)}`);
                }
            });
            
            // Print column headers
            console.log('\nColumn Headers (Row 1):');
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell, colNumber) => {
                console.log(`  Col ${colNumber}: ${cell.value}`);
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
        'input/DimAccounts.xlsx',
        'input/DimDates.xlsx'
    ];
    
    for (const file of files) {
        if (fs.existsSync(file)) {
            await inspectExcel(file);
        } else {
            console.log(`File not found: ${file}`);
        }
    }
}

main().catch(console.error);
