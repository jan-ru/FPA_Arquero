# Financial Statement Generator
**Version 0.9.0**

A browser-based application that transforms trial balance data into professional financial statements including Balance Sheet, Income Statement, and Cash Flow Statement.

## Recent Updates (v0.9.0+)

- **TypeScript Migration**: Core utilities and service layer migrated to TypeScript with comprehensive type definitions
- **Service Layer Architecture**: Extracted 4 specialized services from UIController (30% code reduction)
- **Code Quality**: Enhanced VarianceCalculator utility, eliminated 30+ duplicate calculations
- **Dynamic Versioning**: Version now reads from package.json automatically
- **96 Unit Tests**: Comprehensive test coverage (68.3%) with Deno test runner

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Features

- **Single-Page Application**: No installation required, runs entirely in the browser
- **Professional Data Grid**: Built with ag-Grid Community Edition for fast, responsive display
- **Multi-Period Analysis**: Compare any two periods (year, quarter, or month) with automatic variance calculations
- **Flexible Period Selection**: Choose from yearly (All), quarterly (Q1-Q4), monthly (P1-P12), or **LTM (Latest 12 Months)**
- **LTM (Latest Twelve Months)**: Rolling 12-month analysis that automatically spans fiscal year boundaries
- **Dynamic Variance Columns**: Configurable variance display (Amount, Percent, or Both)
- **CSV Export**: Export current statement to CSV (opens in Excel) with LTM labels
- **Data Validation**: Automatic detection of unmapped accounts and balance verification with LTM data availability warnings
- **Modern UI**: Clean, responsive design with professional styling

## Technology Stack

- **ag-Grid Community**: Professional data grid for statement display
- **Arquero**: Data manipulation and transformation
- **TypeScript + JavaScript**: Gradual TypeScript migration with ES6 modules
- **Deno**: Native TypeScript runtime for testing (96 unit tests, 68.3% coverage)
- **HTML5/CSS3**: Modern web standards
- **File System Access API**: Direct directory access in compatible browsers

## Browser Compatibility

This application requires a browser that supports the File System Access API:
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

## Getting Started

### 1. Prepare Your Data

Create an `input` directory with the following Excel files:
- `2024_BalansenWinstverliesperperiode.xlsx` - Trial balance for 2024 (includes hierarchy columns)
- `2025_BalansenWinstverliesperperiode.xlsx` - Trial balance for 2025 (includes hierarchy columns)
- `DimDates.xlsx` - Period definitions (date dimension)

### 2. Open the Application

1. Open `index.html` in a compatible browser (Chrome or Edge recommended)
2. Click "Select Directory" and choose your `input` folder
3. Wait for automatic file loading
4. Review validation messages for any data issues

### 3. View Financial Statements

- **Statement Selector**: Use the dropdown to switch between Balance Sheet, Income Statement, and Cash Flow Statement
- **Period Selection**: Choose periods for comparison (supports Year, Quarter, Month, or LTM)
- **LTM (Latest 12 Months)**: Select "LTM" from the period dropdown to view rolling 12-month data
  - Automatically calculates the most recent 12 consecutive months
  - Spans fiscal year boundaries (e.g., 2024 P7-P12 + 2025 P1-P6)
  - Displays period range in column headers (e.g., "LTM (2024 P7 - 2025 P6)")
  - Shows warnings if fewer than 12 months of data are available
- **Variance Columns**: Configure what variance data to display (Amount/Percent/Both/None)
- **Detail Level**: Toggle between "All Levels" (expanded) and "Summary Only" (collapsed)
- **Row Hierarchy**: Data is organized by code hierarchy (code0 → code1 → code2 → code3)

### 4. Export Results

- Click "Export to CSV" to download the currently displayed statement
- Files are saved to your browser's default download location
- Format: `{Statement Name}_{Date}.csv`
- CSV files can be opened in Excel

## File Structure

```
financial-statement-generator/
├── index.html                  # Main HTML file (imports from src/)
├── config.json                 # Configuration (file names, directories)
├── package.json                # Version and project metadata
├── deno.json                   # Deno TypeScript configuration
├── tsconfig.json               # TypeScript IDE configuration
├── README.md                   # This file
├── CHANGELOG.md                # Version history
├── src/                        # Application modules (ES6 + TypeScript)
│   ├── app.js                  # Main application entry point
│   ├── constants.js            # All application constants
│   ├── data/                   # Data management
│   │   ├── DataStore.js        # Singleton state management
│   │   └── DataLoader.js       # Excel file loading/parsing
│   ├── utils/                  # Utility classes
│   │   ├── CategoryMatcher.js  # Financial category pattern matching
│   │   └── VarianceCalculator.ts/.js # Variance calculations (TypeScript)
│   ├── services/               # Service layer (TypeScript)
│   │   ├── FileSelectionService.ts/.js # Directory selection
│   │   ├── StatusMessageService.ts/.js # UI status messages
│   │   ├── FileMetricsService.ts/.js   # File metrics calculation
│   │   └── ValidationService.ts/.js    # Data validation
│   ├── statements/             # Financial statement generation
│   │   ├── StatementGenerator.js # BS, IS, CF generation logic
│   │   └── specialrows/        # Special row insertion
│   │       ├── BalanceSheetSpecialRows.js
│   │       ├── IncomeStatementSpecialRows.js
│   │       └── CashFlowStatementSpecialRows.js
│   ├── export/                 # Export functionality
│   │   └── ExportHandler.js    # Excel export (deprecated)
│   └── ui/                     # UI components
│       ├── UIController.js     # Main UI orchestrator
│       ├── AgGridStatementRenderer.js # ag-Grid renderer
│       └── InteractiveUI.js    # Legacy HTML renderer (deprecated)
├── test/                       # Testing directory
│   ├── unit/                   # Unit tests
│   │   ├── utils/              # Tests for utils
│   │   ├── data/               # Tests for data layer
│   │   ├── statements/         # Tests for statement generation
│   │   └── ...
│   └── scripts/                # Functional tests
│       ├── run_all_tests.ts    # Test runner
│       └── test_period_mapping.ts # Period validation
├── docs/                       # Documentation
│   ├── ag-grid-migration-plan.md
│   └── ag-grid-excel-formatting-examples.md
└── input/                      # Your data files (create this)
    ├── 2024_BalansenWinstverliesperperiode.xlsx
    ├── 2025_BalansenWinstverliesperperiode.xlsx
    └── DimDates.xlsx
```

## Configuration

Edit `config.json` to customize file names and directories:

```json
{
  "inputFiles": {
    "trialBalance2024": "2024_BalansenWinstverliesperperiode.xlsx",
    "trialBalance2025": "2025_BalansenWinstverliesperperiode.xlsx",
    "dates": "DimDates.xlsx"
  },
  "outputFiles": {
    "allStatements": "financial_statements_all.xlsx"
  },
  "directories": {
    "input": "input",
    "output": "output"
  }
}
```

## Data Requirements

### Trial Balance Files
- **Required columns**:
  - `account_code`, `account_description` - Account identification
  - Monthly movement columns (e.g., `januari2024`, `februari2024`, etc.)
  - Balance columns (e.g., `Saldo2024`)
  - Hierarchy columns: `statement_type`, `level1_code`, `level1_label`, `level2_code`, `level2_label`, `level3_code`, `level3_label`
- Hierarchy information is embedded directly in the trial balance files
- Statement types: "Balans" (Balance Sheet), "Winst & verlies" (Income Statement)
- Supports Dutch month names (januari, februari, maart, etc.)

### Dates File
- **Required columns**: `period`, `year`, `period_start`, `period_end`, `MonthNumber`, `Year`
- Defines the time periods for analysis
- Maps month names to period numbers

## Features in Detail

### Balance Sheet
- Automatically groups accounts into Assets, Liabilities, and Equity
- Displays TOTAL ASSETS and TOTAL LIABILITIES & EQUITY rows
- Verifies the accounting equation: Assets = Liabilities + Equity
- Hierarchical display with expandable/collapsible groups

### Income Statement
- Groups accounts into Revenue, COGS, Operating Expenses, Other Income, and Taxes
- Displays calculated metrics:
  - **Gross Profit** (Revenue - COGS)
  - **Operating Income** (Gross Profit - Operating Expenses)
  - **Net Income** (Operating Income + Other Income - Taxes)
- Metric rows are styled with italic font and highlighted background

### Cash Flow Statement
- Categorizes cash flows into Operating, Investing, and Financing activities
- Displays cash reconciliation:
  - **Starting Cash**
  - **Net Change in Cash**
  - **Ending Cash**

### Variance Analysis
- Automatically calculates absolute variance (Period 2 - Period 1)
- Calculates percentage variance ((Period 2 - Period 1) / Period 1 * 100)
- Color codes positive (green) and negative (red) variances
- Handles division by zero gracefully
- Configurable display via variance column dropdowns

### ag-Grid Features
- **Fixed Row Order**: Rows maintain hierarchical order (no sorting/filtering)
- **Resizable Columns**: Drag column borders to adjust width
- **Professional Styling**: Custom theme with enhanced typography
- **Responsive Design**: Adapts to different screen sizes
- **Row Types**: Different styling for totals, metrics, groups, and details

## Troubleshooting

### "Browser not supported" error
- Use Chrome, Edge, or Opera browser
- Ensure you're using a recent version (2020 or later)

### "File not found" error
- Verify all required files are in the input directory
- Check that file names match the configuration
- Ensure files are valid Excel format (.xlsx)

### "Missing required columns" error
- Open the Excel file and verify column headers
- Ensure column names match exactly (case-sensitive)
- Check for extra spaces in column names

### Balance Sheet doesn't balance
- Review the imbalance amount shown
- Check for missing accounts in trial balance
- Verify all accounts are properly mapped in hierarchy
- Look for data entry errors in amounts

### Grid not displaying data
- Check browser console (F12) for error messages
- Verify debug logs show data is loaded
- Ensure grid container has height (should be 600px)
- Refresh the page and try again

### Export not working
- CSV export requires ag-Grid Community Edition (free)
- Files download to browser's default download folder
- Check browser's download settings if files aren't appearing

## Performance

- Handles up to 5,000 trial balance accounts efficiently
- Statement generation typically completes in under 2 seconds
- ag-Grid provides smooth scrolling even with large datasets
- Memory usage remains stable
- Export operations complete in 1-3 seconds

## Development

### Running Tests

The project uses Deno for running TypeScript tests:

```bash
# Run all unit tests
deno test --allow-read test/unit/

# Run tests with coverage
deno test --allow-read --coverage=coverage test/unit/
deno coverage coverage

# Run tests in watch mode (auto-rerun on file changes)
deno test --allow-read --watch test/unit/

# Type-check TypeScript files
deno check src/**/*.ts
```

**Test Suite**: 96 unit tests with 68.3% line coverage and 96.1% branch coverage

### TypeScript Development

The project is gradually migrating to TypeScript:
- `.ts` files contain TypeScript source code with type definitions
- `.js` files are copies for browser compatibility (browsers can't load .ts directly)
- Deno provides native TypeScript support for testing
- `deno.json` configures TypeScript compilation options
- `tsconfig.json` provides IDE/editor support

**Migrated to TypeScript**:
- `VarianceCalculator.ts` - Variance calculation utility
- `FileSelectionService.ts` - Directory selection and validation
- `StatusMessageService.ts` - UI status messages
- `FileMetricsService.ts` - File metrics calculation
- `ValidationService.ts` - Data validation

## Architecture

### Modular Design (v0.9.0+)
The application is organized into ES6 modules with TypeScript for better maintainability:
- **Main entry**: `index.html` imports from `src/app.js`
- **Modules**: TypeScript + JavaScript files in `src/` directory
- **Service Layer**: 4 specialized services extracted from UIController (30% code reduction)
- **Tests**: 96 unit tests covering core business logic
- **External dependencies**: CDN libraries (ag-Grid, Arquero, ExcelJS)
- **Test coverage**: 68.3% line coverage, 96.1% branch coverage

### Key Components
- **DataStore** (`src/data/DataStore.js`): Manages trial balance and date dimension data (Singleton pattern)
- **DataLoader** (`src/data/DataLoader.js`): Handles Excel file loading via File System Access API
- **Services** (`src/services/*.ts`): Specialized service layer (TypeScript)
  - `FileSelectionService` - Directory selection/validation
  - `StatusMessageService` - UI status messaging
  - `FileMetricsService` - Metrics calculation
  - `ValidationService` - Data validation
- **StatementGenerator** (`src/statements/StatementGenerator.js`): Transforms trial balance into financial statements
- **AgGridStatementRenderer** (`src/ui/AgGridStatementRenderer.js`): Renders statements using ag-Grid
- **UIController** (`src/ui/UIController.js`): Coordinates user interactions and data flow
- **CategoryMatcher** (`src/utils/CategoryMatcher.js`): Pattern matching for financial categories
- **VarianceCalculator** (`src/utils/VarianceCalculator.js`): Variance and percentage calculations

### Data Flow
1. User selects input directory
2. DataLoader loads Excel files
3. DataStore stores data in Arquero tables
4. StatementGenerator creates statement data
5. AgGridStatementRenderer displays in ag-Grid
6. User can export to CSV

## Development

### Running Tests

Run all tests (unit + functional):
```bash
./run_tests.sh
```

Run only unit tests:
```bash
deno test test/unit/ --allow-read
```

Run specific test file:
```bash
deno test test/unit/utils/VarianceCalculator.test.ts --allow-read
```

### Test Coverage

Current test coverage (68.3% overall):
- ✅ constants.js: 100% (9 tests)
- ✅ CategoryMatcher: 100% (17 tests)
- ✅ VarianceCalculator: 100% (17 tests)
- ✅ DataStore: 100% (17 tests)
- ✅ StatementGenerator: 61.3% (20 tests)
- ✅ DataLoader: 42.1% (16 tests)
- ✅ Period Mapping Validation: 1 functional test
- **Total: 96 unit tests + 1 functional test**

### Module Structure

All modules use ES6 import/export syntax:
```javascript
// Import from constants
import { YEAR_CONFIG, CATEGORY_DEFINITIONS } from '../constants.js';

// Import utilities
import CategoryMatcher from '../utils/CategoryMatcher.js';

// Export class
export default class MyClass { ... }
```

### Adding New Tests

Create test files in `test/unit/`:
```typescript
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import MyClass from "../../../src/path/MyClass.js";

Deno.test("MyClass - basic test", () => {
    const result = MyClass.someMethod();
    assertEquals(result, expected);
});
```

## Migration History

### v3.0.0 - ag-Grid Migration
Complete UI rewrite from custom HTML tables to ag-Grid Community Edition:
- **Removed**: ~950 lines of custom table rendering code
- **Added**: ag-Grid integration with professional styling
- **Result**: More maintainable, better performance, professional appearance

See `docs/ag-grid-migration-plan.md` for detailed migration documentation.

## Limitations

- Requires modern browser with File System Access API
- All processing happens in browser memory (no server-side storage)
- Data is not persisted between sessions
- CSV export only (Excel export requires ag-Grid Enterprise)
- Row order is fixed (sorting/filtering disabled to preserve hierarchy)
- Single statement export (not all three at once)

## Future Enhancements

Potential features for future versions:
- Excel export with formatting (requires ag-Grid Enterprise or ExcelJS integration)
- Multi-statement workbook export
- Chart and graph visualizations
- Budget vs. actual analysis
- Drill-down to view account details
- PDF export option
- Custom report templates
- Multi-year comparison (3+ periods)
- Deno CLI version for command-line usage

## Testing

### Automated Tests

Run functional tests to validate data integrity:

```bash
./run_tests.sh
```

Or directly:
```bash
deno run --allow-read --allow-env --allow-sys --allow-run test/scripts/run_all_tests.ts
```

**Available Tests:**
- Period Mapping Validation - Verifies all trial balance periods exist in DimDates.xlsx

See [test/docs/TESTING_GUIDE.md](test/docs/TESTING_GUIDE.md) for complete testing documentation.

## License

This project is provided as-is for educational and business use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages (F12)
3. Verify your browser compatibility
4. Check the ag-Grid migration documentation in `docs/`

## Version

**Current Version:** 2.8.0 (with v3.0 ag-Grid features implemented)

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and release notes.

### What's New in 2.8.0
- **Modular Architecture**: Complete ES6 module extraction (11 modules across 5 functional areas)
- **Comprehensive Testing**: 96 unit tests with 68.3% code coverage using Deno
- **Factory Pattern**: SpecialRowsFactory for statement-specific row handlers
- **Utility Modules**: CategoryMatcher, VarianceCalculator, Logger, HierarchyBuilder, HierarchySorter
- **Configuration-Driven**: Multiple config objects (APP_CONFIG, YEAR_CONFIG, EXPORT_CONFIG, UI_CONFIG, CATEGORY_DEFINITIONS)
- **Enhanced Maintainability**: Clear separation of concerns, single responsibility modules

### ag-Grid Features (v3.0 Implementation)
- **Professional Data Grid**: ag-Grid Community Edition v31 for statement rendering
- **CSV Export**: Export current statement to CSV (opens in Excel)
- **Custom Styling**: Enhanced typography and spacing with custom CSS
- **Row Classification**: Different styling for totals, metrics, groups, and detail rows
- **Column Resizing**: User-customizable column widths
- **Fixed Row Order**: Sorting disabled to maintain hierarchical code order
- **Responsive Design**: Adapts to different screen sizes
- **Code Reduction**: ~950 lines of legacy HTML table code deprecated
- All tests passing ✅

### Migration Notes
- Export format changed from Excel to CSV (ag-Grid Community limitation)
- Row sorting/filtering disabled (preserves hierarchical order)
- Old ExcelJS export code deprecated but kept for reference
- See `docs/ag-grid-migration-plan.md` for technical details
