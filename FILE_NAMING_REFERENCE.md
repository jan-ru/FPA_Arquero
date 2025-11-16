# File Naming Reference

## Correct File Names

This document clarifies the correct file names used in the Financial Statement Generator.

### Input Files

| Purpose | Correct File Name | Description |
|---------|------------------|-------------|
| Trial Balance 2024 | `trial_balance_2024.xlsx` | Transformed from source (long format) |
| Trial Balance 2025 | `trial_balance_2025.xlsx` | Transformed from source (long format) |
| Account Hierarchy | `DimAccounts.xlsx` | Account categorization and mapping |
| Date Dimension | `DimDates.xlsx` | Period and date information |
| Statement Format | `format.xlsx` | Statement formatting rules |

### Source Files (Original)

| Purpose | File Name | Description |
|---------|-----------|-------------|
| Source 2024 | `2024_BalansenWinstverliesperperiode.xlsx` | Wide format with monthly columns |
| Source 2025 | `2025_BalansenWinstverliesperperiode.xlsx` | Wide format with monthly columns |

## Common Confusion

### ❌ Incorrect Names (Do Not Use)
- `hierarchy.xlsx` - This file does NOT exist
- `dates.xlsx` - This file does NOT exist

### ✅ Correct Names (Use These)
- `DimAccounts.xlsx` - Account hierarchy and mapping
- `DimDates.xlsx` - Date dimension table

## Configuration

The `config.json` file uses these correct names:

```json
{
  "inputFiles": {
    "trialBalance2024": "trial_balance_2024.xlsx",
    "trialBalance2025": "trial_balance_2025.xlsx",
    "hierarchy": "DimAccounts.xlsx",
    "dates": "DimDates.xlsx",
    "format": "format.xlsx"
  }
}
```

**Note:** The config keys are `hierarchy` and `dates`, but the actual file names are `DimAccounts.xlsx` and `DimDates.xlsx`.

## File Transformation

### No Transformation Needed
- `DimAccounts.xlsx` - Used as-is by the application
- `DimDates.xlsx` - Used as-is by the application
- `format.xlsx` - Created once, then used as-is

### Transformation Required
- `2024_BalansenWinstverliesperperiode.xlsx` → `trial_balance_2024.xlsx`
- `2025_BalansenWinstverliesperperiode.xlsx` → `trial_balance_2025.xlsx`

Run transformation:
```bash
./transform_trial_balance.ts
```

## Application Behavior

### DataLoader Class

The application's `DataLoader` class handles the file formats:

1. **loadTrialBalance()** - Reads `trial_balance_YYYY.xlsx` (transformed files)
2. **loadHierarchy()** - Reads `DimAccounts.xlsx` and maps columns:
   - `Rekening` → `account_code`
   - `Statement` → `statement_type`
   - `Nivo0` → `category`
   - `Nivo2` → `subcategory`
   - `Sort2` → `line_order`

3. **loadDates()** - Reads `DimDates.xlsx` and extracts:
   - `Year` → `period` and `year`
   - Calculates `period_start` and `period_end`

4. **loadFormat()** - Reads `format.xlsx` (standard format)

## Testing

Tests validate against the correct file names:

- `test_account_mapping.ts` - Checks `trial_balance_*.xlsx` against `DimAccounts.xlsx`
- `test_period_mapping.ts` - Checks source files against `DimDates.xlsx`

## Directory Structure

```
input/
├── 2024_BalansenWinstverliesperperiode.xlsx  (source)
├── 2025_BalansenWinstverliesperperiode.xlsx  (source)
├── trial_balance_2024.xlsx                   (transformed)
├── trial_balance_2025.xlsx                   (transformed)
├── DimAccounts.xlsx                           (dimension table)
├── DimDates.xlsx                              (dimension table)
└── format.xlsx                                (configuration)
```

## Quick Reference

**When you see in documentation:**
- "hierarchy" or "hierarchy file" → means `DimAccounts.xlsx`
- "dates" or "dates file" → means `DimDates.xlsx`
- "trial balance" → means `trial_balance_YYYY.xlsx` (transformed)
- "source file" → means `YYYY_BalansenWinstverliesperperiode.xlsx` (original)

## Troubleshooting

### "File not found: hierarchy.xlsx"
**Solution:** The file is actually named `DimAccounts.xlsx`. Update your config.json or check the file name.

### "File not found: dates.xlsx"
**Solution:** The file is actually named `DimDates.xlsx`. Update your config.json or check the file name.

### "Cannot find trial_balance_2024.xlsx"
**Solution:** Run the transformation script first:
```bash
./transform_trial_balance.ts
```

## Version History

- **v1.0.0** - Initial release with hierarchy.xlsx and dates.xlsx (incorrect names in docs)
- **v1.1.0** - Corrected to use DimAccounts.xlsx and DimDates.xlsx throughout
- **Current** - All documentation updated with correct file names
