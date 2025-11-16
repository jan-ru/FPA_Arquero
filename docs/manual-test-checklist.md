# Manual Test Checklist

## Date: November 17, 2025

## Overview
This checklist covers all functionality of the Financial Statement Generator application. Use this to verify the application works correctly after changes.

---

## Pre-Test Setup

### Required Files
Create a directory named "input" with these files:
- `2024_BalansenWinstverliesperperiode.xlsx`
- `2025_BalansenWinstverliesperperiode.xlsx`
- `DimDates.xlsx` (optional)

### Browser Requirements
- Chrome 86+ or Edge 86+ (File System Access API support)
- JavaScript enabled
- Console open for debugging (F12)

---

## Test Suite

### 1. Application Loading
- [ ] Open `index.html` in browser
- [ ] Page loads without errors
- [ ] Title shows "Statement Generator v2.1.0"
- [ ] Purple gradient background displays
- [ ] "Select Directory" button visible
- [ ] File status indicators show ⚪ (white circle)
- [ ] No console errors

**Expected Result**: Clean UI with no errors

---

### 2. Directory Selection - Success Path

#### Test 2.1: Select "input" Directory with Files
- [ ] Click "Select Directory"
- [ ] Navigate to and select "input" directory
- [ ] Directory name displays: "📁 input"
- [ ] Files automatically start loading
- [ ] Loading messages appear:
  - "Loading 2024 trial balance..."
  - "Loading 2025 trial balance..."
  - "Combining data..."
- [ ] Loading message clears when complete
- [ ] File status indicators update:
  - TB 2024: ✅ M:#### B:###
  - TB 2025: ✅ M:#### B:###
  - TB 2024+2025: ✅ (#### total)
- [ ] Statement section appears
- [ ] Balance Sheet displays automatically
- [ ] Console shows: "✅ All files loaded successfully!"

**Expected Result**: Automatic loading and statement display

---

### 3. Directory Selection - Error Paths

#### Test 3.1: Wrong Directory Name
- [ ] Click "Select Directory"
- [ ] Select directory NOT named "input" (e.g., "data")
- [ ] Error message displays: "❌ Directory must be named 'input' (current: 'data')"
- [ ] File status indicators remain ⚪
- [ ] Statement section does not appear
- [ ] Console shows error

**Expected Result**: Clear error message, no loading

#### Test 3.2: "input" Directory Without Files
- [ ] Create empty "input" directory
- [ ] Click "Select Directory"
- [ ] Select empty "input" directory
- [ ] Error message displays: "❌ Required files not found in directory..."
- [ ] File status indicators remain ⚪
- [ ] Statement section does not appear

**Expected Result**: Clear error about missing files

#### Test 3.3: Cancel Directory Selection
- [ ] Click "Select Directory"
- [ ] Click "Cancel" in file picker
- [ ] No error message
- [ ] Application remains in initial state

**Expected Result**: Graceful cancellation

---

### 4. File Status Indicators

#### Test 4.1: Click TB 2024
- [ ] After successful load, click "TB 2024" button
- [ ] Preview panel opens
- [ ] Shows first 20 rows of 2024 movements
- [ ] Columns visible: account_code, statement_type, level codes, etc.
- [ ] Row count displayed in title
- [ ] Close button (×) visible

**Expected Result**: Preview displays 2024 data

#### Test 4.2: Click TB 2025
- [ ] Click "TB 2025" button
- [ ] Preview shows 2025 movements
- [ ] Different data than 2024

**Expected Result**: Preview displays 2025 data

#### Test 4.3: Click TB 2024+2025
- [ ] Click "TB 2024+2025" button
- [ ] Preview shows combined movements
- [ ] Both 2024 and 2025 data visible
- [ ] Total row count = 2024 + 2025

**Expected Result**: Preview displays combined data

#### Test 4.4: Close Preview
- [ ] Open any preview
- [ ] Click × button
- [ ] Preview panel closes

**Expected Result**: Preview closes cleanly

---

### 5. Statement Tabs

#### Test 5.1: Balance Sheet Tab
- [ ] Click "Balance Sheet" tab
- [ ] Tab becomes active (purple background)
- [ ] Balance Sheet displays
- [ ] Shows categories: Assets, Liabilities, Equity
- [ ] Total Assets displayed
- [ ] Total Liabilities & Equity displayed
- [ ] Balance check message at bottom (✅ or ⚠️)

**Expected Result**: Balance Sheet displays correctly

#### Test 5.2: Income Statement Tab
- [ ] Click "Income Statement" tab
- [ ] Tab becomes active
- [ ] Income Statement displays
- [ ] Shows revenue and expense categories
- [ ] Gross Profit displayed inline (yellow background)
- [ ] Operating Income displayed inline (yellow background)
- [ ] Net Income at bottom
- [ ] Revenue shows as positive (sign flipped)

**Expected Result**: Income Statement with inline metrics

#### Test 5.3: Cash Flow Tab
- [ ] Click "Cash Flow" tab
- [ ] Tab becomes active
- [ ] Cash Flow Statement displays
- [ ] Only 2025 column shown (no 2024)
- [ ] No variance columns
- [ ] Shows: Operating, Investing, Financing activities
- [ ] Cash Reconciliation section at bottom
- [ ] Starting Cash, Changes, Ending Cash displayed

**Expected Result**: Cash Flow 2025 only

---

### 6. Period Selection Dropdowns

#### Test 6.1: Default Selection
- [ ] Check first column dropdown: "2024 (All)" selected
- [ ] Check second column dropdown: "2025 (All)" selected
- [ ] Variance columns visible

**Expected Result**: Default year-over-year comparison

#### Test 6.2: Change First Column to 2024 P6
- [ ] Open first column dropdown
- [ ] Select "2024 (P6)"
- [ ] Statement regenerates
- [ ] Shows cumulative data through June 2024
- [ ] Dropdown shows "2024 (P6)" after regeneration
- [ ] Variance calculated correctly

**Expected Result**: Period selection works, persists

#### Test 6.3: Change Second Column to 2025 P3
- [ ] Open second column dropdown
- [ ] Select "2025 (P3)"
- [ ] Statement regenerates
- [ ] Shows cumulative data through March 2025
- [ ] Dropdown shows "2025 (P3)" after regeneration

**Expected Result**: Independent period selection

#### Test 6.4: Same Year Comparison (2024 P1 vs 2024 P12)
- [ ] Set first column to "2024 (P1)"
- [ ] Set second column to "2024 (P12)"
- [ ] Statement regenerates
- [ ] Shows January vs December 2024
- [ ] Variance shows growth within year

**Expected Result**: Within-year comparison works

#### Test 6.5: Cross-Year Same Period (2024 P6 vs 2025 P6)
- [ ] Set first column to "2024 (P6)"
- [ ] Set second column to "2025 (P6)"
- [ ] Statement regenerates
- [ ] Shows June-to-June comparison
- [ ] Variance shows year-over-year change

**Expected Result**: Period-matched comparison

#### Test 6.6: Period Selection Persists Across Tabs
- [ ] Set periods to 2024 P3 and 2025 P9
- [ ] Switch to Income Statement tab
- [ ] Dropdowns still show 2024 P3 and 2025 P9
- [ ] Switch to Cash Flow tab
- [ ] Dropdowns still show selected periods

**Expected Result**: Selections persist across statements

---

### 7. Display Options

#### Test 7.1: Toggle Variance
- [ ] Uncheck "Show Variance"
- [ ] Variance columns disappear
- [ ] Only amount columns visible
- [ ] Check "Show Variance"
- [ ] Variance columns reappear

**Expected Result**: Variance toggle works

#### Test 7.2: Toggle Category Totals
- [ ] Uncheck "Show Category Totals"
- [ ] Category total rows disappear
- [ ] Only detail rows visible
- [ ] Check "Show Category Totals"
- [ ] Category totals reappear

**Expected Result**: Category totals toggle works

---

### 8. Export Functionality

#### Test 8.1: Export All Statements
- [ ] Click "Export All" button
- [ ] Export status shows: "⏳ Generating Excel file..."
- [ ] File downloads: "financial_statements_all.xlsx"
- [ ] Export status shows: "✅ Export completed successfully"
- [ ] Status clears after 3 seconds
- [ ] Console shows success message

**Expected Result**: Excel file downloads successfully

#### Test 8.2: Verify Export Content
- [ ] Open downloaded Excel file
- [ ] First sheet: "Export Info"
  - [ ] Export date and time present
  - [ ] Generated by: "System User"
  - [ ] Input files listed
  - [ ] Statements included listed
- [ ] Second sheet: "Balance Sheet"
  - [ ] Headers center-aligned
  - [ ] Numbers formatted as whole numbers (no decimals)
  - [ ] Total Assets row present
  - [ ] Total Liabilities & Equity row present
  - [ ] Formulas in total rows (click cell, see =SUM(...))
- [ ] Third sheet: "Income Statement"
  - [ ] Gross Profit row present with formula
  - [ ] Operating Income row present with formula
  - [ ] Net Income row present with formula
  - [ ] All metrics highlighted (yellow background)
- [ ] Fourth sheet: "Cash Flow Statement"
  - [ ] Only 2025 column
  - [ ] Starting Cash, Changes, Ending Cash present
  - [ ] Formulas in total rows

**Expected Result**: Complete, formatted Excel file with formulas

#### Test 8.3: Export with Custom Period Selection
- [ ] Set periods to 2024 P6 and 2025 P3
- [ ] Click "Export All"
- [ ] Open Excel file
- [ ] Verify data reflects selected periods
- [ ] Formulas still work correctly

**Expected Result**: Export reflects period selection

#### Test 8.4: Export Error Handling
- [ ] Close all statements (refresh page)
- [ ] Try to click "Export All" (should be disabled)
- [ ] Load files
- [ ] Export should now work

**Expected Result**: Export only enabled when data loaded

---

### 9. Data Validation

#### Test 9.1: Balance Sheet Equation
- [ ] View Balance Sheet
- [ ] Check bottom message
- [ ] If balanced: "✅ Balance Sheet is balanced"
- [ ] If imbalanced: "⚠️ Balance Sheet imbalance: ###"
- [ ] Verify: Total Assets ≈ Total Liabilities & Equity

**Expected Result**: Balance check works

#### Test 9.2: Income Statement Calculations
- [ ] View Income Statement
- [ ] Verify Gross Profit = Revenue + COGS
- [ ] Verify Operating Income = Gross Profit + Operating Expenses
- [ ] Verify Net Income = Operating Income + Other - Taxes
- [ ] All calculations correct

**Expected Result**: Metrics calculated correctly

#### Test 9.3: Cash Flow Reconciliation
- [ ] View Cash Flow Statement
- [ ] Verify Ending Cash = Starting Cash + Changes in Cash
- [ ] Calculation correct

**Expected Result**: Cash reconciliation works

---

### 10. UI/UX

#### Test 10.1: Layout
- [ ] File status buttons aligned to right of "Select Directory"
- [ ] Status messages fit within buttons (no overflow)
- [ ] All text readable
- [ ] No overlapping elements
- [ ] Responsive to window resize

**Expected Result**: Clean, professional layout

#### Test 10.2: Hover Effects
- [ ] Hover over "Select Directory" button - transforms
- [ ] Hover over file status buttons - transforms
- [ ] Hover over tab buttons - transforms
- [ ] Hover over table rows - highlights

**Expected Result**: Smooth hover effects

#### Test 10.3: Loading Indicators
- [ ] During file loading, status indicators show ⏳
- [ ] Loading messages update progressively
- [ ] No UI freezing during load

**Expected Result**: Clear loading feedback

---

### 11. Error Recovery

#### Test 11.1: Reload After Error
- [ ] Trigger an error (wrong directory)
- [ ] Click "Select Directory" again
- [ ] Select correct "input" directory
- [ ] Files load successfully
- [ ] Error message clears

**Expected Result**: Can recover from errors

#### Test 11.2: Multiple Load Cycles
- [ ] Load files successfully
- [ ] Click "Select Directory" again
- [ ] Select same directory
- [ ] Files reload
- [ ] No errors, data updates

**Expected Result**: Can reload multiple times

---

### 12. Console Logging

#### Test 12.1: Success Messages
- [ ] Open browser console (F12)
- [ ] Load files successfully
- [ ] Console shows:
  - "Directory named 'input' detected, checking for files..."
  - "Required files found, loading..."
  - "✅ All files loaded successfully!"
  - Trial balance load details
  - Combined movements count

**Expected Result**: Comprehensive console logging

#### Test 12.2: Error Messages
- [ ] Trigger errors (wrong directory, missing files)
- [ ] Console shows detailed error messages
- [ ] Stack traces available for debugging

**Expected Result**: Helpful error logging

---

### 13. Browser Compatibility

#### Test 13.1: Chrome
- [ ] Test in Chrome 86+
- [ ] All features work
- [ ] File System Access API works

**Expected Result**: Full functionality

#### Test 13.2: Edge
- [ ] Test in Edge 86+
- [ ] All features work
- [ ] File System Access API works

**Expected Result**: Full functionality

#### Test 13.3: Firefox (Expected Failure)
- [ ] Test in Firefox
- [ ] Error message about unsupported browser
- [ ] File System Access API not available

**Expected Result**: Clear error message

---

### 14. Performance

#### Test 14.1: Large Files
- [ ] Load files with 5000+ rows
- [ ] Loading completes within reasonable time (<10 seconds)
- [ ] Statement generation < 1 second
- [ ] UI remains responsive

**Expected Result**: Acceptable performance

#### Test 14.2: Period Changes
- [ ] Change period dropdown
- [ ] Statement regenerates within 1 second
- [ ] No lag or freezing

**Expected Result**: Fast regeneration

---

### 15. Edge Cases

#### Test 15.1: Zero Values
- [ ] Verify zero values display correctly
- [ ] Variance % handles division by zero (shows 0 or N/A)

**Expected Result**: Handles zeros gracefully

#### Test 15.2: Negative Values
- [ ] Verify negative values display correctly
- [ ] Color coding works (red for negative)

**Expected Result**: Negatives handled correctly

#### Test 15.3: Empty Categories
- [ ] If any category has no data
- [ ] Category still displays (may show 0)
- [ ] No errors

**Expected Result**: Empty categories handled

---

## Test Results Template

### Test Session Information
- **Date**: _______________
- **Tester**: _______________
- **Browser**: _______________
- **Version**: _______________

### Summary
- **Total Tests**: 100+
- **Passed**: _____
- **Failed**: _____
- **Skipped**: _____

### Failed Tests
List any failed tests with details:

1. Test #: _______________
   - Issue: _______________
   - Steps to reproduce: _______________
   - Expected: _______________
   - Actual: _______________

### Notes
Additional observations:

---

## Quick Smoke Test (5 minutes)

For rapid verification after small changes:

1. [ ] Open application - no errors
2. [ ] Select "input" directory - auto-loads
3. [ ] View Balance Sheet - displays correctly
4. [ ] Change period dropdown - regenerates
5. [ ] Switch to Income Statement - displays correctly
6. [ ] Export All - downloads successfully
7. [ ] Open Excel - formatted correctly

**If all pass**: Basic functionality intact
**If any fail**: Run full test suite

---

## Automated Testing Recommendations

### Future Improvements
1. **Unit Tests**: Test helper methods (formatCellsAsNumbers, styleMetricRow)
2. **Integration Tests**: Test statement generation logic
3. **E2E Tests**: Automate UI interactions with Playwright/Cypress
4. **Visual Regression**: Screenshot comparison for UI changes
5. **Performance Tests**: Measure load times, generation times

### Test Framework Suggestions
- **Jest**: For unit tests
- **Playwright**: For E2E tests
- **Percy**: For visual regression
- **Lighthouse**: For performance audits

---

## Conclusion

This manual test checklist ensures all functionality works correctly. Run the full suite after major changes, and the quick smoke test after minor changes.

**Estimated Time**:
- Full test suite: 45-60 minutes
- Quick smoke test: 5 minutes
- Per-feature testing: 5-10 minutes each
