#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys
/**
 * Functional Test: Verify all trial balance periods exist in DimDates
 * 
 * This test ensures data integrity by checking that every period referenced
 * in the trial balance files has corresponding date dimension data.
 * 
 * Validates both:
 * 1. Years (2024, 2025)
 * 2. Year-Month combinations (januari2024, februari2024, etc.)
 */

import ExcelJS from "npm:exceljs@4.4.0";

interface TestResult {
    passed: boolean;
    requiredYears: string[];
    availableYears: string[];
    missingYears: string[];
    requiredMonths: string[];
    availableMonths: Set<string>;
    missingMonths: string[];
}

// Dutch to English month mapping
const MONTH_TRANSLATION: Record<string, number> = {
    'januari': 1,
    'februari': 2,
    'maart': 3,
    'april': 4,
    'mei': 5,
    'juni': 6,
    'juli': 7,
    'augustus': 8,
    'september': 9,
    'oktober': 10,
    'november': 11,
    'december': 12
};

async function getSourceFileMonthColumns(filename: string): Promise<string[]> {
    console.log(`  Analyzing ${filename} for month columns...`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    
    const worksheet = workbook.worksheets[0];
    const monthColumns: string[] = [];
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        const header = String(cell.value || '').toLowerCase();
        
        // Check if header matches pattern: monthYYYY (e.g., januari2024, februari2024)
        for (const [dutchMonth, monthNum] of Object.entries(MONTH_TRANSLATION)) {
            if (header.startsWith(dutchMonth) && /\d{4}$/.test(header)) {
                monthColumns.push(header);
                break;
            }
        }
    });
    
    console.log(`    Found ${monthColumns.length} month columns: ${monthColumns.slice(0, 3).join(', ')}...`);
    return monthColumns;
}

async function getTrialBalancePeriods(): Promise<{ years: Set<string>; months: string[] }> {
    console.log('Identifying required periods from source files...');
    
    const years = new Set<string>();
    const allMonths: string[] = [];
    
    // Check which source files exist
    const files = [
        { path: 'input/2024_BalansenWinstverliesperperiode.xlsx', year: '2024' },
        { path: 'input/2025_BalansenWinstverliesperperiode.xlsx', year: '2025' }
    ];
    
    for (const file of files) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(file.path);
            
            years.add(file.year);
            console.log(`  ✓ Found ${file.path} - requires year ${file.year}`);
            
            // Get month columns from this file
            const monthColumns = await getSourceFileMonthColumns(file.path);
            allMonths.push(...monthColumns);
            
        } catch (error) {
            console.log(`  ⚠ ${file.path} not found - year ${file.year} not required`);
        }
    }
    
    return { years, months: allMonths };
}

async function loadDimDatesPeriods(filename: string): Promise<{ years: Set<string>; yearMonths: Set<string> }> {
    console.log(`\nLoading available periods from ${filename}...`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    
    const worksheet = workbook.worksheets[0];
    const years = new Set<string>();
    const yearMonths = new Set<string>();
    
    // Find required columns
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '');
    });
    
    const yearColumnIndex = headers.findIndex(h => h === 'Year');
    const monthNumberIndex = headers.findIndex(h => h === 'MonthNumber');
    
    if (yearColumnIndex === -1) {
        throw new Error('Could not find "Year" column in DimDates.xlsx');
    }
    
    if (monthNumberIndex === -1) {
        throw new Error('Could not find "MonthNumber" column in DimDates.xlsx');
    }
    
    console.log(`  Found Year column at index ${yearColumnIndex}`);
    console.log(`  Found MonthNumber column at index ${monthNumberIndex}`);
    
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const values = row.values as any[];
        const year = values[yearColumnIndex];
        const monthNumber = values[monthNumberIndex];
        
        if (year !== null && year !== undefined && year !== '') {
            years.add(String(year));
            
            if (monthNumber !== null && monthNumber !== undefined && monthNumber !== '') {
                // Create yearMonth key (e.g., "2024-1", "2024-2")
                yearMonths.add(`${year}-${monthNumber}`);
            }
        }
    });
    
    // Get unique years
    const uniqueYears = Array.from(years).sort();
    console.log(`  Found ${uniqueYears.length} unique years: ${uniqueYears.join(', ')}`);
    console.log(`  Found ${yearMonths.size} unique year-month combinations`);
    
    return { years, yearMonths };
}

function parseMonthColumn(columnName: string): { month: number; year: string } | null {
    // Parse columns like "januari2024", "februari2024"
    const match = columnName.match(/^([a-z]+)(\d{4})$/);
    if (!match) return null;
    
    const [, dutchMonth, year] = match;
    const monthNumber = MONTH_TRANSLATION[dutchMonth];
    
    if (!monthNumber) return null;
    
    return { month: monthNumber, year };
}

async function testPeriodMapping(): Promise<TestResult> {
    console.log('\n' + '='.repeat(70));
    console.log('FUNCTIONAL TEST: Period Mapping Validation');
    console.log('='.repeat(70) + '\n');
    
    try {
        // Get required periods from source files
        const required = await getTrialBalancePeriods();
        
        if (required.years.size === 0) {
            throw new Error('No source files found. Cannot determine required periods.');
        }
        
        console.log(`\nRequired years: ${Array.from(required.years).sort().join(', ')}`);
        console.log(`Required months: ${required.months.length} month columns found`);
        
        // Load available periods from DimDates
        const available = await loadDimDatesPeriods('input/DimDates.xlsx');
        
        // Check years
        const missingYears: string[] = [];
        for (const year of required.years) {
            if (!available.years.has(year)) {
                missingYears.push(year);
            }
        }
        
        // Check year-month combinations
        const missingMonths: string[] = [];
        const requiredYearMonths: string[] = [];
        
        for (const monthColumn of required.months) {
            const parsed = parseMonthColumn(monthColumn);
            if (parsed) {
                const yearMonthKey = `${parsed.year}-${parsed.month}`;
                requiredYearMonths.push(yearMonthKey);
                
                if (!available.yearMonths.has(yearMonthKey)) {
                    missingMonths.push(`${monthColumn} (${parsed.year}-${String(parsed.month).padStart(2, '0')})`);
                }
            }
        }
        
        console.log(`\nValidating ${requiredYearMonths.length} year-month combinations...`);
        
        return {
            passed: missingYears.length === 0 && missingMonths.length === 0,
            requiredYears: Array.from(required.years).sort(),
            availableYears: Array.from(available.years).sort(),
            missingYears: missingYears.sort(),
            requiredMonths: requiredYearMonths.sort(),
            availableMonths: available.yearMonths,
            missingMonths: missingMonths.sort()
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
        console.log(`Required years:                       ${result.requiredYears.join(', ')}`);
        console.log(`Available years (in DimDates):        ${result.availableYears.join(', ')}`);
        console.log(`Missing years:                        ${result.missingYears.length === 0 ? 'None' : result.missingYears.join(', ')}`);
        console.log('');
        console.log(`Required year-month combinations:     ${result.requiredMonths.length}`);
        console.log(`Available year-month combinations:    ${result.availableMonths.size}`);
        console.log(`Missing year-month combinations:      ${result.missingMonths.length}`);
        console.log('='.repeat(70));
        
        if (result.passed) {
            console.log('\n✅ TEST PASSED: All required periods exist in DimDates.xlsx');
            console.log('\nValidation successful:');
            console.log(`  ✓ All ${result.requiredYears.length} required years found`);
            console.log(`  ✓ All ${result.requiredMonths.length} required year-month combinations found`);
            console.log('\nThe application can proceed with period-based analysis.\n');
            
            // Show additional available years
            const extraYears = result.availableYears.filter(y => !result.requiredYears.includes(y));
            if (extraYears.length > 0) {
                console.log('ℹ️  Additional years available in DimDates (not currently used):');
                console.log(`   ${extraYears.join(', ')}\n`);
            }
            
            Deno.exit(0);
        } else {
            console.log('\n❌ TEST FAILED: Missing period data!');
            
            if (result.missingYears.length > 0) {
                console.log('\nMissing YEARS:');
                console.log('='.repeat(70));
                result.missingYears.forEach((year, index) => {
                    console.log(`  ${(index + 1).toString().padStart(2)}. Year: ${year}`);
                });
            }
            
            if (result.missingMonths.length > 0) {
                console.log('\nMissing YEAR-MONTH combinations:');
                console.log('='.repeat(70));
                result.missingMonths.forEach((month, index) => {
                    console.log(`  ${(index + 1).toString().padStart(2)}. ${month}`);
                });
            }
            
            console.log('='.repeat(70));
            console.log('\n⚠️  ACTION REQUIRED:');
            console.log('   1. Add the missing periods to DimDates.xlsx');
            console.log('   2. Ensure DimDates has date records for all required months');
            console.log('   3. Verify columns: Date, Year, MonthNumber, etc.');
            console.log('   4. Month numbers: 1=January, 2=February, ..., 12=December');
            console.log('   5. Re-run this test to verify');
            console.log('\n   Example: For "januari2024", DimDates needs rows with:');
            console.log('            Year=2024 AND MonthNumber=1\n');
            
            Deno.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error('\nTest execution failed. Please check:');
        console.error('  - Source files exist: input/2024_BalansenWinstverliesperperiode.xlsx');
        console.error('  - DimDates.xlsx exists in the input/ directory');
        console.error('  - Files are valid Excel format (.xlsx)');
        console.error('  - DimDates.xlsx has "Year" and "MonthNumber" columns');
        console.error('  - You have read permissions for the files\n');
        Deno.exit(2);
    }
}

main();
