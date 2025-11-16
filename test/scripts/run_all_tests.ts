#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys --allow-run
/**
 * Test Runner: Execute all functional tests
 * 
 * Runs all validation tests and reports overall status
 */

interface TestSuite {
    name: string;
    script: string;
    description: string;
}

const tests: TestSuite[] = [
    {
        name: 'Account Mapping Validation',
        script: 'test/scripts/test_account_mapping.ts',
        description: 'Verify all trial balance accounts exist in DimAccounts.xlsx'
    },
    {
        name: 'Period Mapping Validation',
        script: 'test/scripts/test_period_mapping.ts',
        description: 'Verify all trial balance periods exist in DimDates.xlsx'
    }
];

async function runTest(test: TestSuite): Promise<{ passed: boolean; exitCode: number }> {
    console.log('\n' + '='.repeat(80));
    console.log(`Running: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log('='.repeat(80));
    
    try {
        const command = new Deno.Command('deno', {
            args: ['run', '--allow-read', '--allow-env', '--allow-sys', test.script],
            stdout: 'inherit',
            stderr: 'inherit'
        });
        
        const { code } = await command.output();
        
        return {
            passed: code === 0,
            exitCode: code
        };
    } catch (error) {
        console.error(`\n❌ Failed to run test: ${error.message}`);
        return {
            passed: false,
            exitCode: 2
        };
    }
}

async function main() {
    console.log('\n' + '█'.repeat(80));
    console.log('FUNCTIONAL TEST SUITE');
    console.log('Financial Statement Generator - Data Validation');
    console.log('█'.repeat(80));
    
    const results: { test: TestSuite; passed: boolean; exitCode: number }[] = [];
    
    for (const test of tests) {
        const result = await runTest(test);
        results.push({ test, ...result });
    }
    
    // Summary
    console.log('\n' + '█'.repeat(80));
    console.log('TEST SUITE SUMMARY');
    console.log('█'.repeat(80));
    
    let allPassed = true;
    
    results.forEach((result, index) => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        const exitCode = result.exitCode === 0 ? '' : ` (exit code: ${result.exitCode})`;
        console.log(`${index + 1}. ${result.test.name}: ${status}${exitCode}`);
        if (!result.passed) {
            allPassed = false;
        }
    });
    
    console.log('█'.repeat(80));
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    console.log(`\nResults: ${passedCount}/${totalCount} tests passed`);
    
    if (allPassed) {
        console.log('\n✅ ALL TESTS PASSED');
        console.log('\nData validation successful. The application is ready to use.');
        console.log('You can proceed with:');
        console.log('  1. Opening index.html in your browser');
        console.log('  2. Loading the input files');
        console.log('  3. Generating financial statements\n');
        Deno.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        console.log('\nPlease review the test output above and take corrective action.');
        console.log('Common issues:');
        console.log('  - Missing accounts in DimAccounts.xlsx');
        console.log('  - Missing periods in DimDates.xlsx');
        console.log('  - Data format inconsistencies\n');
        console.log('After fixing issues, re-run: ./test/scripts/run_all_tests.ts\n');
        Deno.exit(1);
    }
}

main();
