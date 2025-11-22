# Testing Checklist for Financial Statement Generator

## Pre-Testing Setup

- [ ] Create sample Excel files according to SAMPLE_DATA_FORMAT.md
- [ ] Place all files in an `input` directory
- [ ] Open index.html in a compatible browser (Chrome, Edge, or Opera)
- [ ] Open browser console (F12) to monitor for errors

## 1. File Loading Tests

### Valid File Loading
- [ ] Click "Select Input Directory" button
- [ ] Select the directory containing sample files
- [ ] Verify directory name appears next to button
- [ ] Verify "Load All Files" button becomes enabled
- [ ] Click "Load All Files"
- [ ] Verify all 5 file status indicators turn green with row counts
- [ ] Verify success message appears
- [ ] Verify no errors in browser console

### Invalid File Handling
- [ ] Try loading files with missing required columns
- [ ] Verify appropriate error message is displayed
- [ ] Try loading empty Excel files
- [ ] Verify error handling works correctly
- [ ] Try loading files with incorrect data types
- [ ] Verify validation catches the issues

## 2. Data Validation Tests

### Unmapped Accounts Detection
- [ ] Load data with some accounts not in hierarchy
- [ ] Verify warning message shows unmapped accounts
- [ ] Verify unmapped account codes are listed
- [ ] Verify count is accurate

### Balance Sheet Validation
- [ ] Load complete dataset
- [ ] Generate Balance Sheet
- [ ] Verify accounting equation check (Assets = Liabilities + Equity)
- [ ] If imbalanced, verify warning message appears with imbalance amount
- [ ] Verify imbalance is within tolerance (0.01) or flagged

### Missing Period Data
- [ ] Load only 2024 data (skip 2025)
- [ ] Verify appropriate warning about missing period
- [ ] Verify variance calculations handle missing data gracefully

## 3. Balance Sheet Generation Tests

### Data Accuracy
- [ ] Generate Balance Sheet
- [ ] Verify all asset accounts are included
- [ ] Verify all liability accounts are included
- [ ] Verify all equity accounts are included
- [ ] Verify subtotals are calculated correctly
- [ ] Verify Total Assets = Total Liabilities + Total Equity
- [ ] Verify 2024 column shows correct amounts
- [ ] Verify 2025 column shows correct amounts

### Variance Calculations
- [ ] Verify variance amount column (2025 - 2024)
- [ ] Verify variance percent column ((2025-2024)/2024 * 100)
- [ ] Verify positive variances show in green
- [ ] Verify negative variances show in red
- [ ] Verify zero amounts don't cause division errors

### Formatting
- [ ] Verify numbers have thousand separators
- [ ] Verify numbers show 2 decimal places
- [ ] Verify category headers are bold
- [ ] Verify subtotal rows are highlighted
- [ ] Verify empty rows for visual separation

## 4. Income Statement Generation Tests

### Data Accuracy
- [ ] Switch to Income Statement tab
- [ ] Verify revenue accounts are included
- [ ] Verify COGS accounts are included
- [ ] Verify operating expense accounts are included
- [ ] Verify other income/expense accounts are included
- [ ] Verify tax accounts are included

### Calculated Metrics
- [ ] Verify Gross Profit = Revenue - COGS
- [ ] Verify Operating Income = Gross Profit - Operating Expenses
- [ ] Verify Net Income = Operating Income + Other Income - Taxes
- [ ] Verify metrics section displays correctly
- [ ] Verify variance calculations for all metrics

### Formatting
- [ ] Verify proper categorization
- [ ] Verify metric rows are highlighted differently
- [ ] Verify all amounts align properly

## 5. Cash Flow Statement Generation Tests

### Data Accuracy
- [ ] Switch to Cash Flow Statement tab
- [ ] Verify Operating Activities section
- [ ] Verify Investing Activities section
- [ ] Verify Financing Activities section
- [ ] Verify each category has correct accounts

### Net Change Calculation
- [ ] Verify Net Change in Cash = Operating + Investing + Financing
- [ ] Verify calculation for both 2024 and 2025
- [ ] Verify variance is calculated correctly
- [ ] Verify net change row is prominently displayed

## 6. Interactive Features Tests

### Sorting
- [ ] Click on "2024" column header
- [ ] Verify table sorts by 2024 amounts (ascending)
- [ ] Click again to verify descending sort
- [ ] Verify sort indicator (▲/▼) appears
- [ ] Try sorting by other columns (2025, Variance $, Variance %)
- [ ] Verify sorting works correctly for each column

### Tooltips
- [ ] Hover over any amount cell
- [ ] Verify tooltip appears near cursor
- [ ] Verify tooltip shows value information
- [ ] Move mouse away and verify tooltip disappears
- [ ] Try hovering over multiple cells
- [ ] Verify tooltips work consistently

### Tab Navigation
- [ ] Click each tab (Balance Sheet, Income Statement, Cash Flow)
- [ ] Verify active tab is highlighted
- [ ] Verify correct statement displays for each tab
- [ ] Verify switching between tabs works smoothly
- [ ] Verify data persists when switching back

## 7. Export Functionality Tests

### Export Current Statement
- [ ] View Balance Sheet
- [ ] Click "Export Current Statement"
- [ ] Verify Excel file downloads
- [ ] Open downloaded file
- [ ] Verify data matches displayed statement
- [ ] Verify formatting is preserved (bold headers, number format)
- [ ] Verify column widths are appropriate
- [ ] Repeat for Income Statement
- [ ] Repeat for Cash Flow Statement

### Export All Statements
- [ ] Click "Export All Statements"
- [ ] Verify single Excel workbook downloads
- [ ] Open downloaded file
- [ ] Verify workbook has 3 worksheets
- [ ] Verify each worksheet contains correct statement
- [ ] Verify all data is accurate
- [ ] Verify formatting is consistent across sheets

### Export Error Handling
- [ ] Try exporting before loading data
- [ ] Verify appropriate error message
- [ ] Load data and export successfully
- [ ] Verify success message appears

## 8. Large Dataset Tests

### Performance
- [ ] Create dataset with 1000+ accounts
- [ ] Load the large dataset
- [ ] Verify loading completes within 5 seconds
- [ ] Generate Balance Sheet
- [ ] Verify generation completes within 2 seconds
- [ ] Verify UI remains responsive
- [ ] Test sorting with large dataset
- [ ] Test export with large dataset

### Memory
- [ ] Monitor browser memory usage
- [ ] Load large dataset multiple times
- [ ] Verify no memory leaks
- [ ] Switch between statements multiple times
- [ ] Verify memory usage remains stable

## 9. Browser Compatibility Tests

### Chrome
- [ ] Test all features in Chrome
- [ ] Verify File System Access API works
- [ ] Verify all UI elements render correctly
- [ ] Verify exports work correctly

### Edge
- [ ] Test all features in Edge
- [ ] Verify File System Access API works
- [ ] Verify all UI elements render correctly
- [ ] Verify exports work correctly

### Firefox
- [ ] Test in Firefox
- [ ] Note: File System Access API may not be supported
- [ ] Verify appropriate error message if not supported

### Safari
- [ ] Test in Safari (if available)
- [ ] Note: File System Access API may not be supported
- [ ] Verify appropriate error message if not supported

## 10. Error Recovery Tests

### Arquero Operation Failures
- [ ] Intentionally corrupt data structure
- [ ] Verify error is caught and logged
- [ ] Verify user-friendly error message displays
- [ ] Verify application doesn't crash

### Excel Export Failures
- [ ] Test export with invalid data
- [ ] Verify error handling works
- [ ] Verify user is notified of failure

### State Recovery
- [ ] Load data successfully
- [ ] Cause an error in statement generation
- [ ] Verify application can recover
- [ ] Reload data and verify it works again

## 11. UI/UX Tests

### Visual Design
- [ ] Verify gradient background displays correctly
- [ ] Verify sections have proper shadows and borders
- [ ] Verify buttons have hover effects
- [ ] Verify color scheme is consistent
- [ ] Verify text is readable on all backgrounds

### Responsive Design
- [ ] Test on different screen sizes
- [ ] Verify layout adapts appropriately
- [ ] Verify tables are scrollable on small screens
- [ ] Verify buttons remain accessible

### User Feedback
- [ ] Verify loading indicators appear during operations
- [ ] Verify success messages are clear
- [ ] Verify error messages are helpful
- [ ] Verify status updates are timely

## 12. Edge Cases

### Zero Amounts
- [ ] Include accounts with zero balances
- [ ] Verify they display correctly
- [ ] Verify variance calculations handle zeros

### Negative Amounts
- [ ] Include accounts with negative balances
- [ ] Verify they display correctly
- [ ] Verify variance calculations handle negatives
- [ ] Verify color coding works (red for negative)

### Very Large Numbers
- [ ] Test with amounts over 1 billion
- [ ] Verify formatting works correctly
- [ ] Verify no overflow issues

### Very Small Numbers
- [ ] Test with amounts less than 0.01
- [ ] Verify rounding works correctly
- [ ] Verify display is appropriate

## Test Results Summary

### Passed Tests: _____ / _____

### Failed Tests:
- List any failed tests here
- Include error messages and screenshots
- Note browser and version

### Known Issues:
- Document any known limitations
- Note any browser-specific issues
- List any features not yet implemented

### Recommendations:
- Suggest improvements based on testing
- Note any usability issues
- Recommend additional features

## Sign-off

- Tester Name: _______________
- Date: _______________
- Browser(s) Tested: _______________
- Test Data Used: _______________
- Overall Assessment: _______________
