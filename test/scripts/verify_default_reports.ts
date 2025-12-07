/**
 * Verification script for default report definitions
 * Tests that all default reports can be loaded and validated
 */

import ReportLoader from '../../src/reports/ReportLoader.ts';
import ReportValidator from '../../src/reports/ReportValidator.ts';
import ReportRegistry from '../../src/reports/ReportRegistry.ts';

console.log('🔍 Verifying Default Report Definitions...\n');

// Initialize components
const validator = new ReportValidator();
const loader = new ReportLoader(validator);
const registry = ReportRegistry.getInstance();

// Clear registry to start fresh
registry.clear();

// List of default reports to verify
const defaultReports = [
  'reports/income_statement_default.json',
  'reports/balance_sheet_default.json',
  'reports/cash_flow_default.json'
];

let allValid = true;

// Test each report
for (const reportPath of defaultReports) {
  console.log(`📄 Testing: ${reportPath}`);
  
  try {
    // Read the file
    const reportJson = await Deno.readTextFile(reportPath);
    
    // Parse JSON
    const reportDef = loader.parseJSON(reportJson);
    console.log(`  ✓ JSON parsing successful`);
    
    // Validate structure
    const validationResult = validator.validate(reportDef);
    
    if (validationResult.isValid) {
      console.log(`  ✓ Validation passed`);
      
      // Register the report
      registry.register(reportDef);
      console.log(`  ✓ Registration successful`);
      console.log(`    - Report ID: ${reportDef.reportId}`);
      console.log(`    - Name: ${reportDef.name}`);
      console.log(`    - Version: ${reportDef.version}`);
      console.log(`    - Type: ${reportDef.statementType}`);
      console.log(`    - Variables: ${Object.keys(reportDef.variables || {}).length}`);
      console.log(`    - Layout Items: ${reportDef.layout.length}`);
    } else {
      console.error(`  ✗ Validation failed:`);
      console.error(validationResult.formatMessages());
      allValid = false;
    }
    
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    allValid = false;
  }
  
  console.log('');
}

// Verify registry state
console.log('📊 Registry Summary:');
console.log(`  - Total reports: ${registry.count()}`);
console.log(`  - Income reports: ${registry.getReportsByType('income').length}`);
console.log(`  - Balance reports: ${registry.getReportsByType('balance').length}`);
console.log(`  - Cash flow reports: ${registry.getReportsByType('cashflow').length}`);
console.log('');

// Verify default reports are set
console.log('🎯 Default Reports:');
const incomeDefault = registry.getDefaultReport('income');
const balanceDefault = registry.getDefaultReport('balance');
const cashflowDefault = registry.getDefaultReport('cashflow');

console.log(`  - Income: ${incomeDefault ? incomeDefault.name : 'None'}`);
console.log(`  - Balance: ${balanceDefault ? balanceDefault.name : 'None'}`);
console.log(`  - Cash Flow: ${cashflowDefault ? cashflowDefault.name : 'None'}`);
console.log('');

// Final result
if (allValid && incomeDefault && balanceDefault && cashflowDefault) {
  console.log('✅ All default reports verified successfully!');
  Deno.exit(0);
} else {
  console.error('❌ Some reports failed verification');
  Deno.exit(1);
}
