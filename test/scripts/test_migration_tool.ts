/**
 * Test script for ReportMigrationTool
 * 
 * This script tests the migration tool by:
 * 1. Generating report definitions for all statement types
 * 2. Validating the generated definitions
 * 3. Saving them to files for inspection
 * 4. Comparing structure with existing default reports
 */

import ReportMigrationTool from '../../src/reports/ReportMigrationTool.js';
import ReportValidator from '../../src/reports/ReportValidator.js';

// Load JSON Schema
const schemaPath = new URL("../../src/reports/schema/report-definition.schema.json", import.meta.url);
const schemaText = await Deno.readTextFile(schemaPath);
const schema = JSON.parse(schemaText);

console.log('=== Report Migration Tool Test ===\n');

// Create validator and migration tool
const validator = new ReportValidator(schema);
const migrationTool = new ReportMigrationTool(validator);

// Test each statement type
const statementTypes = ['income', 'balance', 'cashflow'];

for (const statementType of statementTypes) {
    console.log(`\n--- Testing ${statementType} statement migration ---`);
    
    try {
        // Generate report definition
        const reportDef = migrationTool.exportToJSON(statementType);
        
        console.log(`✓ Generated ${statementType} report definition`);
        console.log(`  Report ID: ${reportDef.reportId}`);
        console.log(`  Name: ${reportDef.name}`);
        console.log(`  Version: ${reportDef.version}`);
        console.log(`  Variables: ${Object.keys(reportDef.variables).length}`);
        console.log(`  Layout items: ${reportDef.layout.length}`);
        
        // Validate the generated definition
        const validation = validator.validate(reportDef);
        
        if (validation.valid) {
            console.log(`✓ Validation passed`);
        } else {
            console.log(`✗ Validation failed:`);
            validation.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }
        
        // Save to file for inspection
        const outputPath = `./reports/${statementType}_statement_migrated.json`;
        await Deno.writeTextFile(
            outputPath,
            JSON.stringify(reportDef, null, 2)
        );
        console.log(`✓ Saved to ${outputPath}`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        console.error(error);
    }
}

// Test exportAll method
console.log('\n--- Testing exportAll() method ---');
try {
    const allReports = migrationTool.exportAll();
    console.log(`✓ Generated all reports:`);
    console.log(`  - Income: ${allReports.income.reportId}`);
    console.log(`  - Balance: ${allReports.balance.reportId}`);
    console.log(`  - Cash Flow: ${allReports.cashflow.reportId}`);
} catch (error) {
    console.log(`✗ Error: ${error.message}`);
}

// Compare structure with existing default reports
console.log('\n--- Comparing with existing default reports ---');

for (const statementType of statementTypes) {
    const defaultReportPath = `./reports/${statementType}_statement_default.json`;
    const migratedReportPath = `./reports/${statementType}_statement_migrated.json`;
    
    try {
        const defaultReport = JSON.parse(await Deno.readTextFile(defaultReportPath));
        const migratedReport = JSON.parse(await Deno.readTextFile(migratedReportPath));
        
        console.log(`\n${statementType} statement comparison:`);
        console.log(`  Default variables: ${Object.keys(defaultReport.variables).length}`);
        console.log(`  Migrated variables: ${Object.keys(migratedReport.variables).length}`);
        console.log(`  Default layout items: ${defaultReport.layout.length}`);
        console.log(`  Migrated layout items: ${migratedReport.layout.length}`);
        
        // Check if variable names match
        const defaultVars = Object.keys(defaultReport.variables).sort();
        const migratedVars = Object.keys(migratedReport.variables).sort();
        const varsMatch = JSON.stringify(defaultVars) === JSON.stringify(migratedVars);
        
        if (varsMatch) {
            console.log(`  ✓ Variable names match`);
        } else {
            console.log(`  ✗ Variable names differ`);
            console.log(`    Default: ${defaultVars.join(', ')}`);
            console.log(`    Migrated: ${migratedVars.join(', ')}`);
        }
        
        // Check if layout structure is similar
        const defaultLayoutTypes = defaultReport.layout.map((item: any) => item.type);
        const migratedLayoutTypes = migratedReport.layout.map((item: any) => item.type);
        
        console.log(`  Default layout types: ${defaultLayoutTypes.join(', ')}`);
        console.log(`  Migrated layout types: ${migratedLayoutTypes.join(', ')}`);
        
    } catch (error) {
        console.log(`  ⚠ Could not compare: ${error.message}`);
    }
}

console.log('\n=== Migration Tool Test Complete ===\n');
