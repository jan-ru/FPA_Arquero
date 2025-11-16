#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-sys
/**
 * Transform trial balance files from wide format to long format
 * 
 * Input: 2024_BalansenWinstverliesperperiode.xlsx (wide format with months as columns)
 * Output: trial_balance_2024.xlsx (long format with account_code, account_description, amount)
 */

import ExcelJS from "npm:exceljs@4.4.0";

interface TrialBalanceRow {
    account_code: string;
    account_description: string;
    amount: number;
}

async function transformTrialBalance(inputFile: string, outputFile: string, year: string) {
    console.log(`\nTransforming ${inputFile} → ${outputFile}`);
    console.log('='.repeat(60));
    
    try {
        // Read input file
        const inputWorkbook = new ExcelJS.Workbook();
        await inputWorkbook.xlsx.readFile(inputFile);
        
        const worksheet = inputWorkbook.worksheets[0];
        console.log(`Reading sheet: ${worksheet.name}`);
        console.log(`Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
        
        // Extract data
        const trialBalanceData: TrialBalanceRow[] = [];
        let skippedRows = 0;
        let processedRows = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            // Skip header row
            if (rowNumber === 1) return;
            
            const values = row.values as any[];
            
            // Column 11: CodeGrootboekrekening (account_code)
            // Column 12: NaamGrootboekrekening (account_description)
            // Column 33 (2024) or 30 (2025): Saldo (amount)
            const accountCode = values[11];
            const accountDescription = values[12];
            const saldoColumnIndex = year === '2024' ? 33 : 30;
            const amount = values[saldoColumnIndex];
            
            // Skip if account code or amount is missing
            if (!accountCode || accountCode === '' || amount === null || amount === undefined) {
                skippedRows++;
                return;
            }
            
            // Convert to number if needed
            const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
            
            if (isNaN(numericAmount)) {
                skippedRows++;
                return;
            }
            
            trialBalanceData.push({
                account_code: String(accountCode),
                account_description: String(accountDescription || ''),
                amount: numericAmount
            });
            
            processedRows++;
        });
        
        console.log(`Processed: ${processedRows} rows`);
        console.log(`Skipped: ${skippedRows} rows`);
        console.log(`Total accounts: ${trialBalanceData.length}`);
        
        // Create output workbook
        const outputWorkbook = new ExcelJS.Workbook();
        const outputSheet = outputWorkbook.addWorksheet('TrialBalance');
        
        // Add headers
        outputSheet.addRow(['account_code', 'account_description', 'amount']);
        
        // Add data
        trialBalanceData.forEach(row => {
            outputSheet.addRow([row.account_code, row.account_description, row.amount]);
        });
        
        // Format columns
        outputSheet.getColumn(1).width = 15;  // account_code
        outputSheet.getColumn(2).width = 50;  // account_description
        outputSheet.getColumn(3).width = 15;  // amount
        
        // Format header row
        const headerRow = outputSheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        
        // Format amount column as number
        outputSheet.getColumn(3).numFmt = '#,##0.00';
        
        // Write output file
        await outputWorkbook.xlsx.writeFile(outputFile);
        
        console.log(`✅ Successfully created ${outputFile}`);
        console.log(`   Accounts: ${trialBalanceData.length}`);
        
        // Show sample data
        console.log('\nSample data (first 5 rows):');
        trialBalanceData.slice(0, 5).forEach(row => {
            console.log(`  ${row.account_code.padEnd(10)} | ${row.account_description.substring(0, 40).padEnd(40)} | ${row.amount.toFixed(2).padStart(15)}`);
        });
        
    } catch (error) {
        console.error(`❌ Error transforming ${inputFile}:`, error.message);
        throw error;
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Trial Balance Transformation Script');
    console.log('Wide Format → Long Format');
    console.log('='.repeat(60));
    
    const transformations = [
        {
            input: 'input/2024_BalansenWinstverliesperperiode.xlsx',
            output: 'input/trial_balance_2024.xlsx',
            year: '2024'
        },
        {
            input: 'input/2025_BalansenWinstverliesperperiode.xlsx',
            output: 'input/trial_balance_2025.xlsx',
            year: '2025'
        }
    ];
    
    for (const { input, output, year } of transformations) {
        try {
            await transformTrialBalance(input, output, year);
        } catch (error) {
            console.error(`Failed to transform ${input}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Transformation complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update config.json to use the new file names');
    console.log('2. Open index.html in your browser');
    console.log('3. Select the input directory');
    console.log('4. Load the transformed files\n');
}

main().catch(console.error);
