#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys
/**
 * Functional Test: Verify all trial balance periods exist in DimDates
 * 
 * This test ensures data integrity by checking that every period referenced
 * in the trial balance files has corresponding date dimension data.
 */

import ExcelJS from "npm:exceljs@4.4.0";

interface TestResult {
    passed: boolean;
    requiredPeriods: string[];
    availablePeriods: string[];
    missingPeriods: string[];
}

async function getTrialBalancePeriods(): Promise<Set<string>> {
    console.log('Identifying required periods from trial balance files...');
    
    const periods = new Set<string>();
    
    // Check which trial balance files exist
    const files = [
        { path: 'input/trial_balance_2024.xlsx', period: '2024' },
        { path: 'input/trial_balance_2025.xlsx', period: '2025' }
    ];
    
    for (const file of files) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(file.path);
            
            // If file exists and can be read, we need this period
            periods.add(file.period);
            console.log(`  ✓ Found ${file.path} - requires period ${file.period}`);
        } catch (error) {
            console.log(`  ⚠ ${file.path} not found - period ${file.period} not required`);
        }
    }
    
    return periods;
}

async function loadDimDatesPeriods(filename: string): Promise<Set<string>> {
    console.log(`\nLoading available periods from ${filename}...`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    
    const worksheet = workbook.worksheets[0];
    const periods = new Set<string>();
    
    // Find the Year column (should be column 2 based on inspection)
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '');
    });
    
    const yearColumnIndex = headers.findIndex(h => h === 'Year');
    
    if (yearColumnIndex === -1) {
        throw new Error('Could not find "Year" column in DimDates.xlsx');
    }
    
    console.log(`  Found Year column at index ${yearColumnIndex}`);
    
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const values = row.values as any[];
        const year = values[yearColumnIndex];
        
        if (year !== null && year !== undefined && year !== '') {
            periods.add(String(year));
        }
    });
    
    // Get unique years
    const uniquePeriods = Array.from(periods).sort();
    console.log(`  Found ${uniquePeriods.length} unique years: ${uniquePeriods.join(', ')}`);
    
    return periods;
}

async function testPeriodMapping(): Promise<TestResult> {
    console.log('\n' + '='.repeat(70));
    console.log('FUNCTIONAL TEST: Period Mapping Validation');
    console.log('='.repeat(70) + '\n');
    
    try {
        // Get required periods from trial balance files
        const requiredPeriods = await getTrialBalancePeriods();
        
        if (requiredPeriods.size === 0) {
            throw new Error('No trial balance files found. Cannot determine required periods.');
        }
        
        console.log(`\nRequired periods: ${Array.from(requiredPeriods).sort().join(', ')}`);
        
        // Load available periods from DimDates
        const availablePeriods = await loadDimDatesPeriods('input/DimDates.xlsx');
        
        // Find missing periods
        const missingPeriods: string[] = [];
        
        for (const period of requiredPeriods) {
            if (!availablePeriods.has(period)) {
                missingPeriods.push(period);
            }
        }
        
        return {
            passed: missingPeriods.length === 0,
            requiredPeriods: Array.from(requiredPeriods).sort(),
            availablePeriods: Array.from(availablePeriods).sort(),
            missingPeriods: missingPeriods.sort()
        };
        
    } catch (error) {
        console.error('\n❌ Error during test execution:', error.message);
        throw error;
    }
}

async function main() {
    try {
        const result = await testPeriodMapping();
        
        console.log('\n' + '='.repeat(70));
        console.log('TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`Required periods (from trial balance): ${result.requiredPeriods.join(', ')}`);
        console.log(`Available periods (in DimDates):      ${result.availablePeriods.join(', ')}`);
        console.log(`Missing periods:                      ${result.missingPeriods.length === 0 ? 'None' : result.missingPeriods.join(', ')}`);
        console.log('='.repeat(70));
        
        if (result.passed) {
            console.log('\n✅ TEST PASSED: All required periods exist in DimDates.xlsx');
            console.log('\nAll trial balance periods have corresponding date dimension data.');
            console.log('The application can proceed with period-based analysis.\n');
            
            // Show additional available periods
            const extraPeriods = result.availablePeriods.filter(p => !result.requiredPeriods.includes(p));
            if (extraPeriods.length > 0) {
                console.log('ℹ️  Additional periods available in DimDates (not currently used):');
                console.log(`   ${extraPeriods.join(', ')}\n`);
            }
            
            Deno.exit(0);
        } else {
            console.log('\n❌ TEST FAILED: Missing period data!');
            console.log('\nThe following periods are required but missing from DimDates.xlsx:');
            console.log('='.repeat(70));
            
            result.missingPeriods.forEach((period, index) => {
                console.log(`  ${(index + 1).toString().padStart(2)}. Period: ${period}`);
            });
            
            console.log('='.repeat(70));
            console.log('\n⚠️  ACTION REQUIRED:');
            console.log('   1. Add the missing periods to DimDates.xlsx');
            console.log('   2. Ensure each period has date records for the entire year');
            console.log('   3. Include columns: Date, Year, Quarter, MonthNumber, etc.');
            console.log('   4. Re-run this test to verify');
            console.log('\n   OR');
            console.log('\n   1. Remove the corresponding trial balance files if not needed');
            console.log(`      ${result.missingPeriods.map(p => `- trial_balance_${p}.xlsx`).join('\n      ')}`);
            console.log('   2. Update config.json to remove references to unused periods\n');
            
            Deno.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error('\nTest execution failed. Please check:');
        console.error('  - Trial balance files exist in the input/ directory');
        console.error('  - DimDates.xlsx exists in the input/ directory');
        console.error('  - Files are valid Excel format (.xlsx)');
        console.error('  - DimDates.xlsx has a "Year" column');
        console.error('  - You have read permissions for the files\n');
        Deno.exit(2);
    }
}

main();
