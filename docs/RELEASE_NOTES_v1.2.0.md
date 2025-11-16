# Release Notes - Version 1.2.0

**Release Date:** November 16, 2024

## Overview

Version 1.2.0 brings enhanced period validation, improved test organization, and comprehensive documentation updates. This release focuses on data integrity validation and developer experience improvements.

## 🎯 Key Features

### Enhanced Period Validation
- **Year-Month Validation:** Now validates not just years (2024, 2025) but all 22 year-month combinations
- **Dutch Month Support:** Automatically maps Dutch month names (januari, februari, maart, etc.) to English month numbers
- **Comprehensive Coverage:** Validates all monthly columns from source files against DimDates
- **Test Result:** ✅ PASSED - All 22 year-month combinations validated successfully

### Reorganized Test Structure
```
test/
├── scripts/              # All test scripts
│   ├── run_all_tests.ts
│   ├── test_account_mapping.ts
│   ├── test_period_mapping.ts
│   └── utilities...
└── docs/                 # All test documentation
    ├── TESTING_GUIDE.md
    ├── TEST_SUITE_SUMMARY.md
    └── more...
```

### File Naming Clarity
- Created `FILE_NAMING_REFERENCE.md` for clear documentation
- Updated all references from `hierarchy.xlsx` → `DimAccounts.xlsx`
- Updated all references from `dates.xlsx` → `DimDates.xlsx`
- Corrected default config in application

## 📊 Test Results

### Period Mapping Validation: ✅ PASSED
- **Years Validated:** 2/2 (2024, 2025)
- **Year-Month Combinations:** 22/22 (100%)
- **Coverage:** Complete
- **Status:** Production Ready

### Account Mapping Validation: 99.2% Coverage
- **Accounts Mapped:** 251/253
- **Coverage:** 99.2%
- **Unmapped Accounts:** 2 (documented as known issues)
  - Account 1213
  - Afrondingsverschil (rounding difference)

## 🚀 What's New

### For Users
- More reliable data validation before processing
- Clear error messages with actionable recommendations
- Convenient test runner: `./run_tests.sh`
- Comprehensive file naming documentation

### For Developers
- Well-organized test directory structure
- Enhanced test coverage for period validation
- Clear separation of test scripts and documentation
- Easy-to-extend test framework

## 📝 Documentation Updates

### New Documents
- `FILE_NAMING_REFERENCE.md` - Complete file naming guide
- `test/README.md` - Test directory documentation

### Updated Documents
- `README.md` - New test locations, version info
- `CHANGELOG.md` - Complete v1.2.0 release notes
- `SAMPLE_DATA_FORMAT.md` - Correct file names
- `DATA_TRANSFORMATION_PROPOSAL.md` - Updated references

## 🔧 Technical Changes

### Period Validation Enhancement
```typescript
// Now validates:
- Years: 2024, 2025
- Months: januari2024, februari2024, ..., december2024
- Months: januari2025, februari2025, ..., oktober2025
- Total: 22 year-month combinations

// Maps Dutch to English:
januari → 1 (January)
februari → 2 (February)
maart → 3 (March)
// ... etc
```

### File Name Corrections
```json
// config.json now correctly references:
{
  "hierarchy": "DimAccounts.xlsx",  // ✅ Correct
  "dates": "DimDates.xlsx"          // ✅ Correct
}
```

## 🐛 Known Issues

### Unmapped Accounts (2)
1. **Account 1213** - Needs to be added to DimAccounts.xlsx
2. **Afrondingsverschil** - Rounding difference account (special handling needed)

**Impact:** Minimal - 99.2% of accounts are properly mapped

**Workaround:** These accounts can be:
- Added to DimAccounts.xlsx with appropriate categorization
- Filtered out during transformation if not needed
- Documented as intentionally unmapped

## 📦 Installation & Upgrade

### New Installation
```bash
# Clone repository
git clone <repository-url>

# Transform data
./transform_trial_balance.ts

# Run tests
./run_tests.sh

# Open application
open index.html
```

### Upgrading from v1.1.0
```bash
# Pull latest changes
git pull

# No data migration needed
# Tests are now in test/ directory
# Run tests to verify
./run_tests.sh
```

## 🧪 Testing

### Run All Tests
```bash
./run_tests.sh
```

### Run Individual Tests
```bash
# Account mapping
deno run --allow-read --allow-env --allow-sys test/scripts/test_account_mapping.ts

# Period mapping
deno run --allow-read --allow-env --allow-sys test/scripts/test_period_mapping.ts
```

## 📚 Documentation

- **Quick Start:** See `QUICK_START.md`
- **Testing Guide:** See `test/docs/TESTING_GUIDE.md`
- **File Naming:** See `FILE_NAMING_REFERENCE.md`
- **Transformation:** See `TRANSFORMATION_SUMMARY.md`
- **Full Changelog:** See `CHANGELOG.md`

## 🎉 Highlights

- ✅ Enhanced period validation with month-level granularity
- ✅ 100% period coverage (22/22 year-month combinations)
- ✅ 99.2% account coverage (251/253 accounts)
- ✅ Reorganized test structure for better maintainability
- ✅ Comprehensive file naming documentation
- ✅ All documentation updated with correct file names

## 🔮 Coming in Future Releases

- Deno CLI version for command-line usage
- Drill-down capability to view underlying accounts
- Advanced filtering options
- Custom report templates
- Multi-year comparison (3+ periods)
- PDF export option

## 💬 Support

For issues or questions:
1. Check `FILE_NAMING_REFERENCE.md` for file name issues
2. Review `test/docs/TESTING_GUIDE.md` for testing help
3. See `TROUBLESHOOTING.md` for common issues
4. Check browser console for error messages

## 🙏 Acknowledgments

Thank you for using the Financial Statement Generator!

---

**Version:** 1.2.0  
**Release Date:** November 16, 2024  
**Status:** Stable  
**Test Coverage:** Period 100%, Account 99.2%
