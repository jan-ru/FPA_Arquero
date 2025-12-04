#!/usr/bin/env node

/**
 * Report Definition Validation Tool
 * 
 * CLI tool to validate report definition files against the schema
 * and business rules.
 * 
 * Usage:
 *   node tools/validate-report.js <report-file.json>
 *   node tools/validate-report.js reports/*.json
 * 
 * Exit codes:
 *   0 - All reports valid
 *   1 - Validation errors found
 *   2 - File not found or invalid JSON
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import validation components
import ReportValidator from '../src/reports/ReportValidator.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schema
const schemaPath = resolve(__dirname, '../src/reports/schema/report-definition.schema.json');
const reportSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Print colored output
 */
function print(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
    print('\n' + '='.repeat(60), 'cyan');
    print(title, 'bright');
    print('='.repeat(60), 'cyan');
}

/**
 * Print validation result
 */
function printValidationResult(filename, result) {
    if (result.isValid) {
        print(`✓ ${filename}`, 'green');
    } else {
        print(`✗ ${filename}`, 'red');
        
        // Print errors
        if (result.errors && result.errors.length > 0) {
            print('\n  Errors:', 'red');
            result.errors.forEach(error => {
                print(`    • ${error.message}`, 'red');
                if (error.field) {
                    print(`      Field: ${error.field}`, 'yellow');
                }
                if (error.value !== undefined) {
                    print(`      Value: ${JSON.stringify(error.value)}`, 'yellow');
                }
            });
        }
        
        // Print warnings
        if (result.warnings && result.warnings.length > 0) {
            print('\n  Warnings:', 'yellow');
            result.warnings.forEach(warning => {
                print(`    • ${warning.message}`, 'yellow');
            });
        }
    }
}

/**
 * Validate a single report file
 */
function validateReportFile(filePath, validator) {
    const filename = basename(filePath);
    
    try {
        // Check if file exists
        if (!existsSync(filePath)) {
            return {
                filename,
                success: false,
                error: 'File not found',
                result: null
            };
        }
        
        // Read and parse JSON
        const content = readFileSync(filePath, 'utf-8');
        let reportDef;
        
        try {
            reportDef = JSON.parse(content);
        } catch (parseError) {
            return {
                filename,
                success: false,
                error: `Invalid JSON: ${parseError.message}`,
                result: null
            };
        }
        
        // Validate report definition
        const result = validator.validate(reportDef);
        
        return {
            filename,
            success: result.isValid,
            error: null,
            result
        };
        
    } catch (error) {
        return {
            filename,
            success: false,
            error: error.message,
            result: null
        };
    }
}

/**
 * Main validation function
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Print usage if no arguments
    if (args.length === 0) {
        print('Report Definition Validation Tool', 'bright');
        print('\nUsage:', 'cyan');
        print('  node tools/validate-report.js <report-file.json>');
        print('  node tools/validate-report.js reports/*.json');
        print('\nOptions:', 'cyan');
        print('  --help, -h    Show this help message');
        print('  --verbose, -v Show detailed validation information');
        print('\nExamples:', 'cyan');
        print('  node tools/validate-report.js reports/income_statement_default.json');
        print('  node tools/validate-report.js reports/**/*.json');
        process.exit(0);
    }
    
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
        print('Report Definition Validation Tool', 'bright');
        print('\nValidates report definition files against the JSON schema', 'cyan');
        print('and business rules.');
        print('\nUsage:', 'cyan');
        print('  node tools/validate-report.js <report-file.json>');
        print('  node tools/validate-report.js reports/*.json');
        print('\nExit Codes:', 'cyan');
        print('  0 - All reports valid');
        print('  1 - Validation errors found');
        print('  2 - File not found or invalid JSON');
        process.exit(0);
    }
    
    const verbose = args.includes('--verbose') || args.includes('-v');
    const filePatterns = args.filter(arg => !arg.startsWith('-'));
    
    printHeader('Report Definition Validator');
    
    // Initialize validator
    const validator = new ReportValidator(reportSchema);
    
    // Collect all files to validate
    const filesToValidate = [];
    for (const pattern of filePatterns) {
        const resolvedPath = resolve(pattern);
        
        // Check if it's a directory
        if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
            // Read all JSON files in directory
            const files = readdirSync(resolvedPath)
                .filter(f => f.endsWith('.json'))
                .map(f => join(resolvedPath, f));
            filesToValidate.push(...files);
        } else if (pattern.includes('*')) {
            // Simple glob support for *.json in current directory
            const dir = dirname(resolvedPath);
            const ext = basename(pattern);
            if (existsSync(dir)) {
                const files = readdirSync(dir)
                    .filter(f => f.endsWith('.json'))
                    .map(f => join(dir, f));
                filesToValidate.push(...files);
            }
        } else {
            filesToValidate.push(resolvedPath);
        }
    }
    
    if (filesToValidate.length === 0) {
        print('\n✗ No files found matching the pattern', 'red');
        process.exit(2);
    }
    
    print(`\nValidating ${filesToValidate.length} file(s)...\n`);
    
    // Validate each file
    const results = [];
    for (const filePath of filesToValidate) {
        const result = validateReportFile(filePath, validator);
        results.push(result);
        
        if (result.error) {
            print(`✗ ${result.filename}`, 'red');
            print(`  Error: ${result.error}`, 'red');
        } else {
            printValidationResult(result.filename, result.result);
        }
        
        if (verbose && result.result) {
            print(`  Report ID: ${result.result.reportId || 'N/A'}`, 'cyan');
            print(`  Variables: ${result.result.variables?.length || 0}`, 'cyan');
            print(`  Layout Items: ${result.result.layout?.length || 0}`, 'cyan');
        }
    }
    
    // Print summary
    printHeader('Validation Summary');
    
    const validCount = results.filter(r => r.success).length;
    const invalidCount = results.filter(r => !r.success).length;
    const errorCount = results.filter(r => r.error).length;
    
    print(`\nTotal files:    ${results.length}`);
    print(`Valid:          ${validCount}`, validCount > 0 ? 'green' : 'reset');
    print(`Invalid:        ${invalidCount}`, invalidCount > 0 ? 'red' : 'reset');
    print(`Errors:         ${errorCount}`, errorCount > 0 ? 'red' : 'reset');
    
    // Exit with appropriate code
    if (errorCount > 0) {
        print('\n✗ Validation failed: File errors found', 'red');
        process.exit(2);
    } else if (invalidCount > 0) {
        print('\n✗ Validation failed: Invalid report definitions found', 'red');
        process.exit(1);
    } else {
        print('\n✓ All reports are valid!', 'green');
        process.exit(0);
    }
}

// Run main function
main().catch(error => {
    print(`\n✗ Fatal error: ${error.message}`, 'red');
    if (error.stack) {
        print(error.stack, 'red');
    }
    process.exit(2);
});
