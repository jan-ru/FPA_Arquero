#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys
import ExcelJS from "npm:exceljs@4.4.0";

async function checkAccounts() {
    // Check trial balance
    const tb = new ExcelJS.Workbook();
    await tb.xlsx.readFile('input/trial_balance_2024.xlsx');
    const tbSheet = tb.worksheets[0];
    
    console.log('Trial Balance accounts (first 10):');
    let count = 0;
    tbSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (count++ >= 10) return;
        const values = row.values as any[];
        console.log(`  Row ${rowNumber}: account_code = "${values[1]}" (type: ${typeof values[1]})`);
    });
    
    // Check DimAccounts
    const dim = new ExcelJS.Workbook();
    await dim.xlsx.readFile('input/DimAccounts.xlsx');
    const dimSheet = dim.worksheets[0];
    
    console.log('\nDimAccounts Rekening column (first 10):');
    count = 0;
    dimSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (count++ >= 10) return;
        const values = row.values as any[];
        let rekening = values[6];
        if (rekening && typeof rekening === 'object' && 'result' in rekening) {
            rekening = rekening.result;
        }
        console.log(`  Row ${rowNumber}: Rekening = "${rekening}" (type: ${typeof rekening})`);
    });
}

checkAccounts();
