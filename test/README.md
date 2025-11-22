# Test Directory

This directory contains all testing-related files for the Financial Statement Generator.

## Structure

```
test/
├── scripts/              # Test scripts
│   ├── run_all_tests.ts           # Main test runner
│   ├── test_account_mapping.ts    # Account validation test
│   ├── test_period_mapping.ts     # Period validation test
│   ├── check_accounts.ts          # Account inspection utility
│   ├── inspect_excel.ts           # Excel file inspector (Deno)
│   └── inspect_excel.js           # Excel file inspector (Node)
├── docs/                 # Test documentation
│   ├── TESTING_GUIDE.md           # Complete testing guide
│   ├── TEST_SUITE_SUMMARY.md      # Test suite overview
│   ├── FUNCTIONAL_TEST_RESULTS.md # Detailed test results
│   ├── TEST_RESULTS.md            # Automated test results
│   └── TESTING_CHECKLIST.md       # Manual testing checklist
└── README.md            # This file
```

## Quick Start

### Run All Tests

From project root:
```bash
./run_tests.sh
```

Or directly:
```bash
deno run --allow-read --allow-env --allow-sys --allow-run test/scripts/run_all_tests.ts
```

### Run Individual Tests

```bash
# Account mapping validation
deno run --allow-read --allow-env --allow-sys test/scripts/test_account_mapping.ts

# Period mapping validation
deno run --allow-read --allow-env --allow-sys test/scripts/test_period_mapping.ts
```

## Test Scripts

### run_all_tests.ts
Main test runner that executes all functional tests and provides a summary.

**Usage:**
```bash
./test/scripts/run_all_tests.ts
```

**Exit Codes:**
- 0: All tests passed
- 1: Some tests failed

### test_account_mapping.ts
Validates that all accounts in trial balance files exist in DimAccounts.xlsx.

**What it checks:**
- Loads accounts from trial_balance_2024.xlsx and trial_balance_2025.xlsx
- Compares against DimAccounts.xlsx (Rekening column)
- Handles account code normalization (leading zeros)
- Reports unmapped accounts

**Exit Codes:**
- 0: All accounts mapped
- 1: Unmapped accounts found
- 2: Fatal error

### test_period_mapping.ts
Validates that all periods in trial balance files exist in DimDates.xlsx.

**What it checks:**
- Identifies required periods from trial balance files
- Compares against DimDates.xlsx (Year column)
- Reports missing periods

**Exit Codes:**
- 0: All periods found
- 1: Missing periods
- 2: Fatal error

### Utility Scripts

**check_accounts.ts** - Inspect account codes in files  
**inspect_excel.ts** - Detailed Excel file inspection (Deno)  
**inspect_excel.js** - Detailed Excel file inspection (Node)

## Documentation

### docs/TESTING_GUIDE.md
Complete guide to running and understanding tests. Includes:
- Test descriptions
- How to run tests
- Fixing test failures
- CI/CD integration

### docs/TEST_SUITE_SUMMARY.md
Overview of the test suite with current status and results.

### docs/FUNCTIONAL_TEST_RESULTS.md
Detailed results from functional test runs.

### docs/TEST_RESULTS.md
Automated test execution results.

### docs/TESTING_CHECKLIST.md
Manual testing procedures for the application.

## Current Test Status

| Test | Status | Coverage |
|------|--------|----------|
| Account Mapping | ❌ FAILED | 99.2% (251/253) |
| Period Mapping | ✅ PASSED | 100% (2/2) |

**Overall:** 1/2 tests passing

**Issues:**
- 2 unmapped accounts: 1213, Afrondingsverschil

## Integration

### With Transformation
```bash
# 1. Transform data
./transform_trial_balance.ts

# 2. Run tests
./run_tests.sh

# 3. If tests pass, use application
```

### With Git
```bash
# Before committing
./run_tests.sh && git commit -m "Your message"
```

### With CI/CD
```yaml
test:
  script:
    - ./run_tests.sh
```

## Adding New Tests

1. Create test script in `test/scripts/`
2. Follow existing test patterns
3. Add to `run_all_tests.ts`
4. Document in `docs/TESTING_GUIDE.md`
5. Update this README

## Requirements

- Deno installed
- Input files in `input/` directory
- Read permissions for test files

## Related Files

- `/run_tests.sh` - Convenience script in project root
- `/input/` - Data files being tested
- `/transform_trial_balance.ts` - Data transformation script

## Support

See `docs/TESTING_GUIDE.md` for detailed documentation and troubleshooting.
