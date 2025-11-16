# Financial Statement Generator

A browser-based application that transforms trial balance data into professional financial statements including Balance Sheet, Income Statement, and Cash Flow Statement.

## Features

- **Single-Page Application**: No installation required, runs entirely in the browser
- **Multi-Period Analysis**: Compare 2024 and 2025 data with automatic variance calculations
- **Interactive Tables**: Sort columns, hover for details, and navigate between statements
- **Excel Integration**: Import data from Excel files and export results back to Excel
- **Data Validation**: Automatic detection of unmapped accounts and balance verification
- **Professional Styling**: Modern, gradient-based UI with responsive design

## Technology Stack

- **Arquero**: Data manipulation and transformation
- **ExcelJS**: Excel file reading and writing
- **Vanilla JavaScript**: No framework dependencies
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
- `trial_balance_2024.xlsx` - Trial balance for 2024
- `trial_balance_2025.xlsx` - Trial balance for 2025
- `hierarchy.xlsx` - Account categorization and statement mapping
- `dates.xlsx` - Period definitions
- `format.xlsx` - Statement formatting rules

See [SAMPLE_DATA_FORMAT.md](SAMPLE_DATA_FORMAT.md) for detailed file format specifications.

### 2. Open the Application

1. Open `index.html` in a compatible browser (Chrome or Edge recommended)
2. Click "Select Input Directory" and choose your `input` folder
3. Click "Load All Files" to import your data
4. Review validation messages for any data issues

### 3. View Financial Statements

- Use the tabs to switch between Balance Sheet, Income Statement, and Cash Flow Statement
- Click column headers to sort data
- Hover over amounts to see additional details
- Review variance calculations to analyze year-over-year changes

### 4. Export Results

- Click "Export Current Statement" to download the currently displayed statement
- Click "Export All Statements" to download a workbook with all three statements
- Files are saved to your browser's default download location

## File Structure

```
financial-statement-generator/
├── index.html                  # Main application file
├── config.json                 # Configuration (file names, directories)
├── README.md                   # This file
├── SAMPLE_DATA_FORMAT.md       # Data format specifications
├── TESTING_CHECKLIST.md        # Testing procedures
└── input/                      # Your data files (create this)
    ├── trial_balance_2024.xlsx
    ├── trial_balance_2025.xlsx
    ├── hierarchy.xlsx
    ├── dates.xlsx
    └── format.xlsx
```

## Configuration

Edit `config.json` to customize file names and directories:

```json
{
  "inputFiles": {
    "trialBalance2024": "trial_balance_2024.xlsx",
    "trialBalance2025": "trial_balance_2025.xlsx",
    "hierarchy": "hierarchy.xlsx",
    "dates": "dates.xlsx",
    "format": "format.xlsx"
  },
  "outputFiles": {
    "balanceSheet": "balance_sheet.xlsx",
    "incomeStatement": "income_statement.xlsx",
    "cashFlowStatement": "cash_flow_statement.xlsx",
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
- **Required columns**: `account_code`, `account_description`, `amount`
- Must include all accounts for the period
- Amounts should be in numeric format

### Hierarchy File
- **Required columns**: `account_code`, `statement_type`, `category`, `subcategory`, `line_order`
- Maps each account to its financial statement category
- Statement types: "BS" (Balance Sheet), "IS" (Income Statement), "CF" (Cash Flow)

### Dates File
- **Required columns**: `period`, `year`, `period_start`, `period_end`
- Defines the time periods for analysis

### Format File
- **Required columns**: `statement_type`, `line_number`, `line_type`, `line_label`
- Controls the presentation order and formatting of statements

## Features in Detail

### Balance Sheet
- Automatically groups accounts into Assets, Liabilities, and Equity
- Calculates subtotals for each category
- Verifies the accounting equation: Assets = Liabilities + Equity
- Displays warning if imbalance exceeds 0.01

### Income Statement
- Groups accounts into Revenue, COGS, Operating Expenses, Other Income, and Taxes
- Calculates Gross Profit, Operating Income, and Net Income
- Shows key metrics in a highlighted section

### Cash Flow Statement
- Categorizes cash flows into Operating, Investing, and Financing activities
- Calculates net cash flow for each category
- Displays total net change in cash

### Variance Analysis
- Automatically calculates absolute variance (2025 - 2024)
- Calculates percentage variance ((2025 - 2024) / 2024 * 100)
- Color codes positive (green) and negative (red) variances
- Handles division by zero gracefully

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

### Unmapped accounts warning
- Review the list of unmapped account codes
- Add missing accounts to hierarchy.xlsx
- Reload the data after updating hierarchy

## Performance

- Handles up to 5,000 trial balance accounts efficiently
- Statement generation typically completes in under 2 seconds
- Memory usage remains stable even with large datasets
- Export operations complete in 1-3 seconds

## Limitations

- Requires modern browser with File System Access API
- All processing happens in browser memory (no server-side storage)
- Data is not persisted between sessions
- Limited to Excel file format for import/export

## Future Enhancements

Potential features for future versions:
- Drill-down capability to view underlying accounts
- Advanced filtering options
- Custom report templates
- Multi-year comparison (3+ periods)
- PDF export option
- Chart and graph visualizations
- Budget vs. actual analysis
- Deno CLI version for command-line usage

## Testing

See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for comprehensive testing procedures.

## License

This project is provided as-is for educational and business use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the sample data format documentation
3. Verify your browser compatibility
4. Check the browser console for error messages

## Version History

### Version 1.1.0 (Current)
- Added support for DimAccounts.xlsx format (no transformation needed)
- Added support for DimDates.xlsx format (no transformation needed)
- Created trial balance transformation script (wide → long format)
- Automatic Dutch to English translation for categories
- Enhanced DataLoader to handle formula cells in Excel
- Added transformation documentation and quick start guide

### Version 1.0.0
- Initial release
- Balance Sheet, Income Statement, and Cash Flow Statement generation
- Excel import/export functionality
- Interactive table features (sorting, tooltips)
- Data validation and error handling
- Professional UI with gradient styling
