# Financial Statement Generator

A browser-based application that transforms trial balance data into professional financial statements including Balance Sheet, Income Statement, and Cash Flow Statement.

## Features

- **Single-Page Application**: No installation required, runs entirely in the browser
- **Professional Data Grid**: Built with ag-Grid Community Edition for fast, responsive display
- **Configurable Reports**: Define custom financial statement layouts using JSON configuration files
- **Multi-Period Analysis**: Compare any two periods with automatic variance calculations
- **LTM (Latest Twelve Months)**: Rolling 12-month analysis that automatically spans fiscal year boundaries
- **Flexible Period Selection**: Choose from yearly, quarterly (Q1-Q4), monthly (P1-P12), or LTM
- **CSV Export**: Export statements to CSV format (opens in Excel)
- **Data Validation**: Automatic detection of unmapped accounts and balance verification
- **Debug Tools**: View report definitions, inspect data columns, and diagnose issues (Dev mode)
- **Robust Error Handling**: Comprehensive error system with detailed error messages and tracking

## Quick Start

### Prerequisites

This application uses ES6 modules and **must be served from a web server**. It will NOT work if you open `index.html` directly.

**Start a local web server:**

```bash
# Python 3 (recommended)
python3 -m http.server 8000

# Then open: http://localhost:8000
```

See [docs/QUICK_START.md](docs/QUICK_START.md) for more options.

### Browser Compatibility

Requires File System Access API support:
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

### Basic Usage

1. **Prepare Data**: Create an `input` directory with your Excel files:
   - `2024_BalansenWinstverliesperperiode.xlsx` - Trial balance for 2024
   - `2025_BalansenWinstverliesperperiode.xlsx` - Trial balance for 2025
   - `DimDates.xlsx` - Period definitions

2. **Open Application**: Navigate to `http://localhost:8000` in your browser

3. **Select Directory**: Click "Select Directory" and choose your `input` folder

4. **View Statements**: Use the dropdowns to select statement type, report definition, and periods

5. **Export**: Click "Export to CSV" to download the current statement

## Technology Stack

- **ag-Grid Community**: Professional data grid
- **Arquero**: Data manipulation and transformation
- **TypeScript + JavaScript**: Gradual TypeScript migration
- **Deno**: Native TypeScript runtime for testing
- **HTML5/CSS3**: Modern web standards

## Configuration

Edit `config.json` to customize file names and directories:

```json
{
  "inputFiles": {
    "trialBalance2024": "2024_BalansenWinstverliesperperiode.xlsx",
    "trialBalance2025": "2025_BalansenWinstverliesperperiode.xlsx",
    "dates": "DimDates.xlsx"
  },
  "directories": {
    "input": "input",
    "output": "output"
  }
}
```

## Project Structure

```
financial-statement-generator/
├── index.html                  # Main HTML file
├── config.json                 # Configuration
├── package.json                # Version and metadata
├── src/                        # Application modules
│   ├── app.js                  # Main entry point
│   ├── data/                   # Data management
│   ├── utils/                  # Utility classes
│   ├── services/               # Service layer (TypeScript)
│   ├── reports/                # Configurable report system
│   ├── statements/             # Statement generation
│   ├── export/                 # Export functionality
│   └── ui/                     # UI components
├── reports/                    # Report definition files (JSON)
│   ├── income_statement_default.json
│   ├── balance_sheet_default.json
│   ├── cash_flow_default.json
│   └── examples/               # Example reports
├── test/                       # Testing directory
│   ├── unit/                   # Unit tests
│   ├── property/               # Property-based tests
│   └── integration/            # Integration tests
├── docs/                       # Documentation
│   ├── USER_GUIDE.md           # User guide
│   ├── REPORT_DEFINITIONS.md   # Report definition reference
│   ├── ARCHITECTURE.md         # Technical architecture
│   └── DEVELOPMENT.md          # Development guide
└── input/                      # Your data files (create this)
```

## Creating Custom Reports

Define custom financial statement layouts using JSON configuration files:

1. Copy an example from `/reports/examples/`
2. Modify variables, layout, and formatting
3. Save to `/reports/` directory
4. Select from report dropdown in UI

See [docs/REPORT_DEFINITIONS.md](docs/REPORT_DEFINITIONS.md) for complete guide.

## Development

### Running Tests

```bash
# Run all unit tests
deno test --allow-read test/unit/

# Run with coverage
deno test --allow-read --coverage=coverage test/unit/
deno coverage coverage

# Run in watch mode
deno test --allow-read --watch test/unit/
```

### Test Coverage

- 273+ unit tests with comprehensive coverage
- Custom error system: 177 tests with 100% coverage
- Property-based tests for core logic
- Integration tests for end-to-end workflows

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development guide.

## Documentation

- **[docs/QUICK_START.md](docs/QUICK_START.md)** - Quick start guide
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - Complete user guide
- **[docs/REPORT_DEFINITIONS.md](docs/REPORT_DEFINITIONS.md)** - Report definition reference
- **[docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)** - Migration from hardcoded reports
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical architecture
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Development guide
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Version history and release notes
- **[docs/SERVER_SETUP.md](docs/SERVER_SETUP.md)** - Development server setup
- **[docs/TYPESCRIPT_SETUP_FIX.md](docs/TYPESCRIPT_SETUP_FIX.md)** - TypeScript configuration

## Troubleshooting

### "Browser not supported" error
Use Chrome, Edge, or Opera browser (version 2020 or later)

### "File not found" error
- Verify all required files are in the input directory
- Check that file names match the configuration
- Ensure files are valid Excel format (.xlsx)

### Balance Sheet doesn't balance
- Review the imbalance amount shown
- Check for missing accounts in trial balance
- Verify all accounts are properly mapped

### Grid not displaying data
- Check browser console (F12) for error messages
- Verify debug logs show data is loaded
- Refresh the page and try again

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for more troubleshooting tips.

## Performance

- Handles up to 5,000 trial balance accounts efficiently
- Statement generation typically completes in under 2 seconds
- ag-Grid provides smooth scrolling even with large datasets
- Export operations complete in 1-3 seconds

## Version

**Current Version:** 0.13.0

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for detailed version history and release notes.

## License

This project is provided as-is for educational and business use.

## Support

For issues or questions:
1. Check the [docs/USER_GUIDE.md](docs/USER_GUIDE.md) troubleshooting section
2. Review the browser console for error messages (F12)
3. Verify your browser compatibility
4. Check the documentation in the `docs/` directory
