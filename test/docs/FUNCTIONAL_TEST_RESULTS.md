# Functional Test Results: Account Mapping Validation

## Test Overview

**Test Name:** Account Mapping Validation  
**Test Script:** `test_account_mapping.ts`  
**Purpose:** Verify all trial balance accounts exist in DimAccounts.xlsx  
**Date:** 2024-11-16  
**Status:** ❌ FAILED (2 unmapped accounts found)

## Test Execution

### Command
```bash
deno run --allow-read --allow-env --allow-sys test_account_mapping.ts
```

### Test Logic
1. Load all account codes from `trial_balance_2024.xlsx`
2. Load all account codes from `trial_balance_2025.xlsx`
3. Combine into unique set of trial balance accounts
4. Load all account codes from `DimAccounts.xlsx` (Rekening column)
5. Normalize account codes (remove leading zeros for comparison)
6. Identify accounts in trial balance but missing from DimAccounts
7. Report results and exit with appropriate code

## Test Results

### Summary
- **Total accounts in trial balances:** 253
- **Mapped accounts in DimAccounts:** 251
- **Unmapped accounts:** 2
- **Mapping coverage:** 99.2%

### Unmapped Accounts

| # | Account Code | Notes |
|---|--------------|-------|
| 1 | 1213 | Numeric account, needs to be added to DimAccounts |
| 2 | Afrondingsverschil | Dutch for "rounding difference", special account |

## Technical Details

### Account Code Normalization

The test handles the difference between:
- **Trial Balance format:** Strings with leading zeros (e.g., "0080", "0210")
- **DimAccounts format:** Numbers without leading zeros (e.g., 80, 210)

**Normalization logic:**
```typescript
function normalizeAccountCode(code: string | number): string {
    const codeStr = String(code);
    const normalized = parseInt(codeStr, 10);
    return isNaN(normalized) ? codeStr : String(normalized);
}
```

This ensures:
- "0080" matches 80
- "0210" matches 210
- "Afrondingsverschil" remains as-is (non-numeric)

### Files Analyzed

1. **input/trial_balance_2024.xlsx**
   - 234 unique accounts
   - Format: 3 columns (account_code, account_description, amount)

2. **input/trial_balance_2025.xlsx**
   - 225 unique accounts
   - Format: 3 columns (account_code, account_description, amount)

3. **input/DimAccounts.xlsx**
   - 268 account codes defined
   - Column 6: Rekening (account code)
   - Includes formula cells (handled automatically)

## Action Required

### Option 1: Add Missing Accounts to DimAccounts.xlsx

Add the following accounts to DimAccounts.xlsx:

**Account 1213:**
- Statement: Balans (or appropriate type)
- Nivo0: Activa/Passiva (determine based on account nature)
- Nivo1: Appropriate category
- Nivo2: Appropriate subcategory
- Sort values: Appropriate ordering

**Account "Afrondingsverschil":**
- This is a rounding difference account
- Typically mapped to equity or a special category
- Consider if this should be included in statements or filtered out

### Option 2: Remove from Trial Balance

If these accounts should not be in the financial statements:
- Update the transformation script to filter them out
- Document why they are excluded

### Option 3: Accept as Known Issue

If these accounts are intentionally unmapped:
- Document the reason
- Update the test to expect these specific unmapped accounts
- Modify exit code to pass with known unmapped accounts

## Recommendations

1. **Investigate Account 1213:**
   - Check the source data to understand what this account represents
   - Determine appropriate statement type and categorization
   - Add to DimAccounts.xlsx with proper mapping

2. **Handle Rounding Differences:**
   - "Afrondingsverschil" is a technical account
   - Options:
     - Map to a special "Adjustments" category
     - Filter out during transformation
     - Include in equity as a balancing item

3. **Re-run Test:**
   - After adding accounts to DimAccounts.xlsx
   - Verify test passes (exit code 0)
   - Commit changes

## Exit Codes

The test uses the following exit codes:

- **0:** All accounts mapped successfully (test passed)
- **1:** Unmapped accounts found (test failed)
- **2:** Fatal error during test execution

## Integration with CI/CD

This test can be integrated into a CI/CD pipeline:

```bash
# Run test
deno run --allow-read --allow-env --allow-sys test_account_mapping.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Account mapping validation passed"
    # Proceed with deployment
else
    echo "❌ Account mapping validation failed"
    # Block deployment
    exit 1
fi
```

## Next Steps

1. ✅ Test created and working
2. ⏳ Add missing accounts to DimAccounts.xlsx
3. ⏳ Re-run test to verify
4. ⏳ Commit changes when test passes
5. ⏳ Document any intentionally unmapped accounts

## Related Documentation

- `TRANSFORMATION_SUMMARY.md` - Data transformation details
- `SAMPLE_DATA_FORMAT.md` - Expected file formats
- `TESTING_CHECKLIST.md` - Manual testing procedures
- `TEST_RESULTS.md` - Automated test results
