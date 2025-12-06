# User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Loading Data](#loading-data)
3. [Viewing Statements](#viewing-statements)
4. [Period Selection](#period-selection)
5. [Report Selection](#report-selection)
6. [Variance Analysis](#variance-analysis)
7. [Exporting Data](#exporting-data)
8. [Debug Tools](#debug-tools)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements

- **Browser**: Chrome 86+, Edge 86+, or Opera 72+
- **Web Server**: Required for ES6 modules (see Quick Start)
- **Data Files**: Excel files (.xlsx) with trial balance and period data

### First Time Setup

1. **Start Web Server**:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open Browser**: Navigate to `http://localhost:8000`

3. **Prepare Data Directory**: Create an `input` folder with your Excel files

## Loading Data

### Required Files

Your `input` directory must contain:

1. **Trial Balance Files**:
   - `2024_BalansenWinstverliesperperiode.xlsx`
   - `2025_BalansenWinstverliesperperiode.xlsx`

2. **Period Definitions**:
   - `DimDates.xlsx`

### Required Columns

**Trial Balance Files**:
- `account_code`, `account_description` - Account identification
- Monthly movement columns (e.g., `januari2024`, `februari2024`)
- Balance columns (e.g., `Saldo2024`)
- Hierarchy columns: `statement_type`, `level1_code`, `level1_label`, `level2_code`, `level2_label`, `level3_code`, `level3_label`

**Dates File**:
- `period`, `year`, `period_start`, `period_end`, `MonthNumber`, `Year`

### Loading Process

1. Click **"Select Directory"** button
2. Navigate to your `input` folder
3. Click **"Select"** or **"Open"**
4. Wait for automatic file loading (2-5 seconds)
5. Review validation messages

### Validation Messages

The application automatically validates your data:

- ✅ **Green**: All files loaded successfully
- ⚠️ **Yellow**: Warnings (e.g., unmapped accounts)
- ❌ **Red**: Errors (e.g., missing required columns)

## Viewing Statements

### Statement Types

Use the **Statement Type** dropdown to select:

1. **Balance Sheet**: Assets, Liabilities, and Equity
2. **Income Statement**: Revenue, Expenses, and Net Income
3. **Cash Flow Statement**: Operating, Investing, and Financing activities

### Balance Sheet

- Groups accounts into Assets, Liabilities, and Equity
- Displays TOTAL ASSETS and TOTAL LIABILITIES & EQUITY
- Verifies accounting equation: Assets = Liabilities + Equity
- Shows imbalance warning if equation doesn't balance

### Income Statement

- Groups accounts into Revenue, COGS, Operating Expenses, Other Income, and Taxes
- Displays calculated metrics:
  - **Gross Profit** (Revenue - COGS)
  - **Operating Income** (Gross Profit - Operating Expenses)
  - **Net Income** (Operating Income + Other Income - Taxes)
- Metric rows styled with italic font and highlighted background

### Cash Flow Statement

- Categorizes cash flows into Operating, Investing, and Financing activities
- Displays cash reconciliation:
  - **Starting Cash**
  - **Net Change in Cash**
  - **Ending Cash**

## Period Selection

### Period Types

**Year Selection**:
- 2024, 2025, or LTM (Latest Twelve Months)

**Period Selection**:
- **All**: Full year totals
- **Q1-Q4**: Quarterly totals
- **P1-P12**: Monthly totals
- **LTM**: Rolling 12-month total

### LTM (Latest Twelve Months)

LTM provides rolling 12-month analysis:

- Automatically calculates the most recent 12 consecutive months
- Spans fiscal year boundaries (e.g., 2024 P7-P12 + 2025 P1-P6)
- Displays period range in column headers
- Shows warnings if fewer than 12 months available

**Example**: If latest data is 2025 P6, LTM shows:
- 2024 P7, P8, P9, P10, P11, P12
- 2025 P1, P2, P3, P4, P5, P6
- Total: 12 months

### Comparing Periods

Select two different periods to see variance:
- **Period 1**: Base period for comparison
- **Period 2**: Current period
- **Variance**: Automatically calculated (Period 2 - Period 1)

## Report Selection

### Available Reports

Use the **Report Definition** dropdown to choose:

- **Default Reports**: Standard financial statements
- **Detailed Reports**: Comprehensive breakdowns with subcategories
- **IFRS Reports**: International Financial Reporting Standards format
- **Custom Reports**: Your own custom report definitions

### Creating Custom Reports

1. Copy an example from `/reports/examples/`
2. Modify the JSON file:
   - Change `reportId` and `name`
   - Define your variables (filters + aggregations)
   - Specify layout items (order, labels, calculations)
   - Set formatting rules
3. Save to `/reports/` directory
4. Reload the application
5. Select your report from the dropdown

See [REPORT_DEFINITIONS.md](REPORT_DEFINITIONS.md) for complete guide.

## Variance Analysis

### Variance Modes

Use the **Variance Columns** dropdown to control display:

- **None**: Show only period amounts
- **Amount**: Show variance in currency (€)
- **Percent**: Show variance as percentage (%)
- **Both**: Show both amount and percent

### Variance Calculation

- **Absolute Variance**: Period 2 - Period 1
- **Percentage Variance**: ((Period 2 - Period 1) / Period 1) × 100
- **Color Coding**: Green for positive, red for negative
- **Division by Zero**: Handled gracefully (shows N/A)

### Interpreting Variances

**Income Statement**:
- Positive variance in Revenue = Good (increased revenue)
- Positive variance in Expenses = Bad (increased costs)

**Balance Sheet**:
- Positive variance in Assets = Growth
- Positive variance in Liabilities = Increased debt

**Cash Flow**:
- Positive variance in Operating Cash Flow = Good
- Positive variance in Financing Cash Flow = Increased financing

## Exporting Data

### CSV Export

1. Configure your desired view (statement, periods, variance)
2. Click **"Export to CSV"** button
3. File downloads to your browser's default location
4. Format: `{Statement Name}_{Date}.csv`
5. Open in Excel or other spreadsheet software

### Export Features

- Exports currently displayed statement
- Includes all visible columns (periods + variances)
- Preserves formatting (currency symbols, thousands separators)
- Numbers rounded to whole values (no decimals)
- Hierarchical structure maintained

### Opening in Excel

CSV files open directly in Excel:
- Double-click the downloaded file
- Or: Open Excel → File → Open → Select CSV file
- Data imports with proper formatting

## Debug Tools

### View Report Definition

The **"👁️ View Definition"** button allows you to inspect the current report's JSON configuration:

1. Select a report from the dropdown
2. Click **"👁️ View Definition"** button
3. Modal displays:
   - Report name, version, and type
   - Complete JSON definition (read-only)
   - **"📋 Copy JSON"** button to copy to clipboard

**Use Cases**:
- Understand how a report is structured
- Diagnose variable resolution issues
- Copy report definition for modification
- Learn report definition syntax

### Debug Columns (Dev Mode)

The **"🔍 Debug Columns"** button helps diagnose data issues:

1. Enable **Dev mode** (check the Dev checkbox)
2. Load your data files
3. Click **"🔍 Debug Columns"** button
4. Alert displays:
   - All available column names in your data
   - Sample row showing actual data structure
   - Expected column names for filters

**Use Cases**:
- Diagnose "Failed to resolve variable" errors
- Verify column names match report filters
- Check if hierarchy columns (code1, code2, code3) exist
- Inspect data structure after loading

### Report Status Display

The report status bar shows:
- **Loading**: "Loading report definitions..."
- **Success**: "✓ Loaded X report definitions"
- **Reload**: "✓ Reloaded X report definitions successfully"
- **Error**: "⚠️ Failed to load report definitions"

This persistent status helps you:
- Confirm reports loaded successfully
- Know how many reports are available
- Diagnose report loading issues

## Troubleshooting

### Application Won't Load

**Problem**: "Select Directory" button does nothing

**Solution**: You must run a web server. Opening `index.html` directly won't work.

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Browser Not Supported

**Problem**: Error message about browser compatibility

**Solution**: Use Chrome, Edge, or Opera (version 86 or later)

### Files Not Loading

**Problem**: "File not found" error

**Solutions**:
- Verify all required files are in the `input` directory
- Check file names match exactly (case-sensitive)
- Ensure files are valid Excel format (.xlsx)
- Check browser console (F12) for detailed error messages

### Missing Columns Error

**Problem**: "Missing required columns" error

**Solutions**:
- Open Excel file and verify column headers
- Ensure column names match exactly (case-sensitive)
- Check for extra spaces in column names
- Compare with sample data format

### Balance Sheet Doesn't Balance

**Problem**: Imbalance warning shown

**Solutions**:
- Review the imbalance amount displayed
- Check for missing accounts in trial balance
- Verify all accounts are properly mapped in hierarchy
- Look for data entry errors in amounts

### Failed to Resolve Variable Error

**Problem**: Error message "Failed to resolve variable 'revenue'" or similar

**Diagnosis Steps**:
1. Enable **Dev mode** (check Dev checkbox)
2. Click **"🔍 Debug Columns"** to see available columns
3. Click **"👁️ View Definition"** to see what the report expects
4. Compare column names in your data vs. report filters

**Common Causes**:
- Column name mismatch (e.g., report expects `code1` but data has `account_code`)
- Missing hierarchy columns (`code1`, `code2`, `code3`)
- Data not fully loaded when report tries to use it
- Filter criteria doesn't match any rows in data

**Solutions**:
- Verify your data has the expected columns (use Debug Columns button)
- Check that hierarchy columns exist and are populated
- Ensure `statement_type` column matches report filters
- Reload data files if loading was interrupted
- Edit report JSON to match your actual column names

### No Data Displayed

**Problem**: Grid shows but no data appears

**Solutions**:
- Check browser console (F12) for error messages
- Verify debug logs show "Data loaded successfully"
- Ensure grid container has proper height
- Try refreshing the page
- Clear browser cache and reload

### Export Not Working

**Problem**: CSV export button doesn't download file

**Solutions**:
- Check browser's download settings
- Verify pop-up blocker isn't blocking download
- Try a different browser
- Check browser console for errors
- Ensure you have write permissions to download folder

### Slow Performance

**Problem**: Application is slow or unresponsive

**Solutions**:
- Check data file size (works best with < 5,000 accounts)
- Close other browser tabs
- Clear browser cache
- Try a different browser
- Check system memory usage

### Incorrect Calculations

**Problem**: Numbers don't match expectations

**Solutions**:
- Verify source data in Excel files
- Check period selection matches intended periods
- Review hierarchy mappings
- Verify account codes are correct
- Check for duplicate accounts

## Advanced Features

### Detail Level Control

Toggle between:
- **All Levels**: Show all hierarchy levels (expanded)
- **Summary Only**: Show only top-level categories (collapsed)

### Row Hierarchy

Data is organized by code hierarchy:
- **Level 0**: Statement type (Assets, Liabilities, Revenue, etc.)
- **Level 1**: Major categories (Current Assets, Fixed Assets, etc.)
- **Level 2**: Subcategories (Cash, Accounts Receivable, etc.)
- **Level 3**: Individual accounts

### Column Resizing

- Drag column borders to adjust width
- Double-click border to auto-fit content
- Changes persist during session

### Data Validation Warnings

The application warns about:
- **Unmapped Accounts**: Accounts without hierarchy mapping
- **Balance Verification**: Balance sheet imbalances
- **Missing Periods**: Periods without data
- **LTM Data Availability**: Insufficient months for LTM calculation

## Tips and Best Practices

### Data Preparation

1. **Consistent Naming**: Use consistent column names across years
2. **Complete Hierarchy**: Ensure all accounts have hierarchy codes
3. **Clean Data**: Remove empty rows and invalid characters
4. **Backup Files**: Keep backup copies of original data

### Report Selection

1. **Start Simple**: Use default reports first
2. **Understand Structure**: Review example reports before creating custom ones
3. **Test Thoroughly**: Validate custom reports with sample data
4. **Version Control**: Track changes to custom report definitions

### Performance Optimization

1. **Limit Data Size**: Keep trial balance under 5,000 accounts
2. **Close Unused Tabs**: Free up browser memory
3. **Use Modern Browser**: Latest Chrome/Edge for best performance
4. **Clear Cache**: Periodically clear browser cache

### Export Best Practices

1. **Descriptive Names**: Use clear file names for exports
2. **Organize Files**: Create folders for different periods
3. **Document Assumptions**: Note period selections and variance modes
4. **Verify Exports**: Spot-check exported data against screen display

## Keyboard Shortcuts

- **F12**: Open browser developer console
- **Ctrl/Cmd + R**: Refresh page
- **Ctrl/Cmd + Shift + R**: Hard refresh (clear cache)
- **Ctrl/Cmd + F**: Find in page

## Getting Help

1. **Check Documentation**: Review this guide and other docs
2. **Browser Console**: Check F12 console for error messages
3. **Validation Messages**: Read on-screen validation warnings
4. **Example Reports**: Study examples in `/reports/examples/`
5. **Contact Support**: Reach out to your IT team or administrator

## Additional Resources

- **[REPORT_DEFINITIONS.md](REPORT_DEFINITIONS.md)** - Complete report definition reference
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migrating from hardcoded reports
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture details
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development and testing guide
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes

---

**Last Updated**: December 2025  
**Version**: 0.11.0
