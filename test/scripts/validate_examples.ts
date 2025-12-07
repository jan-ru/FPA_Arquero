/**
 * Validation script for example report definitions
 * Tests that all example reports are valid according to the schema
 */

import ReportValidator from '../../src/reports/ReportValidator.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EXAMPLES_DIR = 'reports/examples';

interface ValidationResult {
  reportId: string;
  fileName: string;
  valid: boolean;
  errors: string[];
}

async function validateExamples(): Promise<void> {
  console.log('🔍 Validating example report definitions...\n');
  
  const validator = new ReportValidator();
  const results: ValidationResult[] = [];
  
  // Get all JSON files in examples directory
  const files = fs.readdirSync(EXAMPLES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ No example files found in', EXAMPLES_DIR);
    process.exit(1);
  }
  
  console.log(`Found ${files.length} example report(s) to validate:\n`);
  
  for (const file of files) {
    const filePath = path.join(EXAMPLES_DIR, file);
    console.log(`📄 Validating: ${file}`);
    
    try {
      // Read and parse the file
      const content = fs.readFileSync(filePath, 'utf-8');
      const reportDef = JSON.parse(content);
      
      // Validate the report definition
      const validationResult = validator.validate(reportDef);
      
      results.push({
        reportId: reportDef.reportId || 'unknown',
        fileName: file,
        valid: validationResult.isValid,
        errors: validationResult.errors || []
      });
      
      if (validationResult.isValid) {
        console.log(`   ✅ Valid - ${reportDef.name}`);
        console.log(`   📋 Report ID: ${reportDef.reportId}`);
        console.log(`   📊 Statement Type: ${reportDef.statementType}`);
        console.log(`   🔢 Variables: ${Object.keys(reportDef.variables || {}).length}`);
        console.log(`   📐 Layout Items: ${reportDef.layout?.length || 0}`);
      } else {
        console.log(`   ❌ Invalid - ${validationResult.errors.length} error(s)`);
        validationResult.errors.forEach((error: any, idx: number) => {
          const errorMsg = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
          console.log(`      ${idx + 1}. ${errorMsg}`);
        });
      }
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Failed to parse JSON`);
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
      
      results.push({
        reportId: 'unknown',
        fileName: file,
        valid: false,
        errors: [`JSON parse error: ${error instanceof Error ? error.message : String(error)}`]
      });
    }
  }
  
  // Print summary
  console.log('═'.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('═'.repeat(60));
  
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;
  
  console.log(`\n✅ Valid reports: ${validCount}/${results.length}`);
  console.log(`❌ Invalid reports: ${invalidCount}/${results.length}\n`);
  
  if (invalidCount > 0) {
    console.log('Invalid reports:');
    results.filter(r => !r.valid).forEach(r => {
      console.log(`  - ${r.fileName} (${r.reportId})`);
      r.errors.forEach(err => {
        const errorMsg = typeof err === 'string' ? err : JSON.stringify(err, null, 2);
        console.log(`    • ${errorMsg}`);
      });
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 All example reports are valid!\n');
    
    // Print report details
    console.log('Report Details:');
    results.forEach(r => {
      console.log(`  ✓ ${r.fileName}`);
      console.log(`    ID: ${r.reportId}`);
    });
    console.log('');
  }
}

// Run validation
validateExamples().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
