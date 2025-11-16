#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys
/**
 * Functional Test: Verify all trial balance accounts are mapped in DimAccounts
 * 
 * This test ensures data integrity by checking that every account in the
 * trial balance files has a corresponding entry in the hierarchy (DimAccounts).
 */

import ExcelJS from "npm:exceljs@4.4.0";

interface TestResult {
    passed: boolean;
    totalAccounts: number;
    mappedAccounts: number;
    unmappedAccounts: string[];
}

async function loadTrialBalanceAccounts(filename: string): Promise<Set<string>> {
    console.log(`Loading accounts from ${filename}...`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    
    const worksheet = workbook.worksheets[0];
    const accounts = new Set<string>();
    
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        // Column 11 (K): account_code in source files
        let accountCode = row.getCell(11).value;
        const accountLabel = row.getCell(12).value; // Column 12 (L): account name
        const statementType = row.getCell(4).value; // Column 4 (D): Balans/Winst & verlies
        
        if (accountCode && accountCode !== '') {
            // Handle Afrondingsverschil - replace based on statement type
            if (String(accountCode).toLowerCase().includes('afrondingsverschil') || 
                (accountLabel && String(accountLabel).toLowerCase().includes('afrondingsverschil'))) {
                if (statementType === 'Balans') {
                    accountCode = '1999';
                } else if (statementType === 'Winst & verlies') {
                    accountCode = '9910';
                }
            }
            accounts.add(String(accountCode));
        }
    });
    
    console.log(`  Found ${accounts.size} accounts`);
    return accounts;
}

function normalizeAccountCode(code: string | number): string {
    // Convert to string and remove leading zeros for comparison
    const codeStr = String(code);
    // Parse as number and convert back to remove leading zeros
    const normalized = parseInt(codeStr, 10);
    return isNaN(normalized) ? codeStr : String(normalized);
}

async function loadSourceFileAccounts(filename: string): Promise<Set<string>> {
    console.log(`Loading account codes from ${filename}...`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    
    const worksheet = workbook.worksheets[0];
    const accounts = new Set<string>();
    
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        // Column 11 (K): account_code
        let accountCode = row.getCell(11).value;
        
        if (accountCode !== null && accountCode !== undefined && accountCode !== '') {
            const codeStr = String(accountCode);
            accounts.add(normalizeAccountCode(codeStr));
        }
    });
    
    console.log(`  Found ${accounts.size} account codes`);
    return accounts;
}

async function testAccountMapping(): Promise<TestResult> {
    console.log('\n' + '='.repeat(70));
    console.log('FUNCTIONAL TEST: Account Mapping Validation');
    console.log('='.repeat(70) + '\n');
    
    try {
        // Load trial balance accounts
        const accounts2024 = await loadTrialBalanceAccounts('input/trial_balance_2024.xlsx');
        const accounts2025 = await loadTrialBalanceAccounts('input/trial_balance_2025.xlsx');
        
        // Combine all trial balance accounts
        const allTrialBalanceAccounts = new Set([...accounts2024, ...accounts2025]);
        console.log(`\nTotal unique accounts in trial balances: ${allTrialBalanceAccounts.size}`);
        
        // Load DimAccounts
        const dimAccounts = await loadDimAccountsCodes('input/DimAccounts.xlsx');
        
        // Find unmapped accounts (normalize for comparison)
        const unmappedAccounts: string[] = [];
        
        for (const account of allTrialBalanceAccounts) {
            const normalized = normalizeAccountCode(account);
            if (!dimAccounts.has(normalized)) {
                unmappedAccounts.push(account);
            }
        }
        
        const mappedCount = allTrialBalanceAccounts.size - unmappedAccounts.length;
        
        return {
            passed: unmappedAccounts.length === 0,
            totalAccounts: allTrialBalanceAccounts.size,
            mappedAccounts: mappedCount,
            unmappedAccounts: unmappedAccounts.sort()
        };
        
    } catch (error) {
        console.error('\n❌ Error during test execution:', error.message);
        throw error;
    }
}

async function main() {
    try {
        const result = await testAccountMapping();
        
        console.log('\n' + '='.repeat(70));
        console.log('TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`Total accounts in trial balances: ${result.totalAccounts}`);
        console.log(`Mapped accounts in DimAccounts:   ${result.mappedAccounts}`);
        console.log(`Unmapped accounts:                ${result.unmappedAccounts.length}`);
        console.log('='.repeat(70));
        
        if (result.passed) {
            console.log('\n✅ TEST PASSED: All accounts are mapped in DimAccounts.xlsx');
            console.log('\nAll trial balance accounts have corresponding entries in the hierarchy.');
            console.log('The application can proceed with statement generation.\n');
            Deno.exit(0);
        } else {
            console.log('\n❌ TEST FAILED: Unmapped accounts found!');
            console.log('\nThe following accounts exist in trial balances but are missing from DimAccounts.xlsx:');
            console.log('='.repeat(70));
            
            result.unmappedAccounts.forEach((account, index) => {
                console.log(`  ${(index + 1).toString().padStart(3)}. Account Code: ${account}`);
            });
            
            console.log('='.repeat(70));
            console.log('\n⚠️  ACTION REQUIRED:');
            console.log('   1. Add the missing accounts to DimAccounts.xlsx');
            console.log('   2. Specify their Statement type (Balans/Omzet/Kosten)');
            console.log('   3. Assign appropriate Nivo0, Nivo1, Nivo2 categories');
            console.log('   4. Set Sort values for proper ordering');
            console.log('   5. Re-run this test to verify\n');
            
            Deno.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error('\nTest execution failed. Please check:');
        console.error('  - All required files exist in the input/ directory');
        console.error('  - Files are valid Excel format (.xlsx)');
        console.error('  - You have read permissions for the files\n');
        Deno.exit(2);
    }
}

main();
