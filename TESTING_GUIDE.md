# Testing Guide

## Overview

This project includes functional tests to validate data integrity before running the financial statement generator.

## Test Suite

### 1. Account Mapping Validation
**Script:** `test_account_mapping.ts`  
**Purpose:** Verify all trial balance accounts exist in DimAccounts.xlsx

**What it checks:**
- Loads all account codes from trial_balance_2024.xlsx
- Loads all account codes from trial_balance_2025.xlsx
- Compares against account codes in DimAccounts.xlsx (Rekening column)
- Handles account code normalization (leading zeros)
- Reports any unmapped accounts

**Current Status:** ❌ FAILED (2 unmapped accounts)
- Account 1213
- Afrondingsverschil (rounding difference)

### 2. Period Mapping Validation
**Script:** `test_period_mapping.ts`  
**Purpose:** Verify all trial balance periods exist in DimDates.xlsx

**What it checks:**
- Identifies required periods from trial balance files
- Loads available periods from DimDates.xlsx (Year column)
- Reports any missing periods

**Current Status:** ✅ PASSED
- Required periods: 2024, 2025
- All periods available in DimDates

## Running Tests

### Run Individual Tests

**Account Mapping Test:**
```bash
deno run --allow-read --allow-env --allow-sys test_account_mapping.ts
```

**Period Mapping Test:**
```bash
deno run --allow-read --allow-env --allow-sys test_period_mapping.ts
```

### Run All Tests

```bash
deno run --allow-read --allow-env --allow-sys --allow-run run_all_tests.ts
```

Or use the shorthand:
```bash
./run_all_tests.ts
```

## Exit Codes

All tests use standard exit codes:

- **0:** Test passed - all validations successful
- **1:** Test failed - validation errors found
- **2:** Fatal error - test could not execute

## Test Output

### Successful Test
```
✅ TEST PASSED: All required periods exist in DimDates.xlsx

All trial balance periods have corresponding date dimension data.
The application can proceed with period-based analysis.
```

### Failed Test
```
❌ TEST FAILED: Unmapped accounts found!

The following accounts exist in trial balances but are missing from DimAccounts.xlsx:
======================================================================
    1. Account Code: 1213
    2. Account Code: Afrondingsverschil
======================================================================

⚠️  ACTION REQUIRED:
   1. Add the missing accounts to DimAccounts.xlsx
   ...
```

## Fixing Test Failures

### Account Mapping Failures

**Problem:** Accounts in trial balance not found in DimAccounts.xlsx

**Solutions:**

1. **Add missing accounts to DimAccounts.xlsx:**
   - Open DimAccounts.xlsx
   - Add new row for each missing account
   - Fill in required columns:
     - Statement (Balans/Omzet/Kosten)
     - Nivo0 (Activa/Passiva/Omzet/Kosten)
     - Nivo1, Nivo2 (categories)
     - Rekening (account code)
     - Sort values
   - Save and re-run test

2. **Filter out accounts during transformation:**
   - Edit `transform_trial_balance.ts`
   - Add filter logic to exclude specific accounts
   - Re-run transformation
   - Re-run test

3. **Document as known issue:**
   - If accounts should remain unmapped
   - Update test to expect specific unmapped accounts
   - Document reason in code comments

### Period Mapping Failures

**Problem:** Periods in trial balance not found in DimDates.xlsx

**Solutions:**

1. **Add missing periods to DimDates.xlsx:**
   - Ensure DimDates has date records for the missing year
   - Include all required columns (Date, Year, Quarter, etc.)
   - Save and re-run test

2. **Remove unused trial balance files:**
   - Delete trial_balance_YYYY.xlsx for unused periods
   - Update config.json
   - Re-run test

## Integration with Workflow

### Recommended Workflow

1. **Transform data:**
   ```bash
   deno run --allow-read --allow-write --allow-env --allow-sys transform_trial_balance.ts
   ```

2. **Run tests:**
   ```bash
   deno run --allow-read --allow-env --allow-sys --allow-run run_all_tests.ts
   ```

3. **Fix any issues** identified by tests

4. **Re-run tests** until all pass

5. **Open application** and load data

### CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Transform Data
  run: deno run --allow-read --allow-write --allow-env --allow-sys transform_trial_balance.ts

- name: Run Tests
  run: deno run --allow-read --allow-env --allow-sys --allow-run run_all_tests.ts

- name: Deploy
  if: success()
  run: # deployment commands
```

## Test Development

### Adding New Tests

1. Create new test file: `test_your_validation.ts`
2. Follow the pattern from existing tests:
   - Load data
   - Perform validation
   - Report results
   - Exit with appropriate code
3. Add to `run_all_tests.ts` test suite
4. Document in this guide

### Test Template

```typescript
#!/usr/bin/env -S deno run --allow-read --allow-env --allow-sys
import ExcelJS from "npm:exceljs@4.4.0";

async function testYourValidation(): Promise<boolean> {
    console.log('Running your validation...');
    
    // Load data
    // Perform checks
    // Return true if passed, false if failed
    
    return true;
}

async function main() {
    try {
        const passed = await testYourValidation();
        
        if (passed) {
            console.log('✅ TEST PASSED');
            Deno.exit(0);
        } else {
            console.log('❌ TEST FAILED');
            Deno.exit(1);
        }
    } catch (error) {
        console.error('❌ FATAL ERROR:', error.message);
        Deno.exit(2);
    }
}

main();
```

## Troubleshooting

### "File not found" errors
- Ensure you're running tests from the project root
- Check that input/ directory exists
- Verify all required files are present

### "Permission denied" errors
- Add appropriate --allow-* flags to deno command
- Check file permissions

### Tests pass but application fails
- Tests validate data structure, not business logic
- Check application logs for runtime errors
- Verify data values are correct (not just structure)

## Related Documentation

- `FUNCTIONAL_TEST_RESULTS.md` - Detailed test results
- `TEST_RESULTS.md` - Automated test results
- `TESTING_CHECKLIST.md` - Manual testing procedures
- `TRANSFORMATION_SUMMARY.md` - Data transformation details

## Current Test Status

Last run: 2024-11-16

| Test | Status | Issues |
|------|--------|--------|
| Account Mapping | ❌ FAILED | 2 unmapped accounts |
| Period Mapping | ✅ PASSED | None |

**Overall:** 1/2 tests passing (50%)

**Action Required:** Add missing accounts to DimAccounts.xlsx
