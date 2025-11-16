# Quick Start Guide

## Prerequisites

- Deno installed (`brew install deno` on macOS)
- Chrome or Edge browser
- Your Excel files in the `input/` directory

## Step 1: Transform Trial Balance Files

Run the transformation script to convert wide format to long format:

```bash
deno run --allow-read --allow-write transform_trial_balance.ts
```

**Expected Output:**
```
✅ Successfully created input/trial_balance_2024.xlsx
   Accounts: 235

✅ Successfully created input/trial_balance_2025.xlsx
   Accounts: 226
```

## Step 2: Open the Application

1. Open `index.html` in Chrome or Edge
2. You should see the welcome screen

## Step 3: Load Your Data

1. Click **"Select Input Directory"**
2. Navigate to and select the `input` folder
3. Click **"Load All Files"**
4. Wait for all files to load (you'll see green checkmarks)

## Step 4: View Financial Statements

- Click the **Balance Sheet** tab to view assets, liabilities, and equity
- Click the **Income Statement** tab to view revenue and expenses
- Click the **Cash Flow Statement** tab to view cash flows

## Step 5: Export Results

- Click **"Export Current Statement"** to download the currently displayed statement
- Click **"Export All Statements"** to download all three statements in one workbook

## That's It!

Your financial statements are generated with:
- 2024 and 2025 data side-by-side
- Variance calculations (amount and percentage)
- Professional formatting

## If Something Goes Wrong

### Files Not Loading?
- Make sure you ran the transformation script first
- Check that `input/trial_balance_2024.xlsx` and `input/trial_balance_2025.xlsx` exist

### Unmapped Accounts Warning?
- Some accounts in your trial balance aren't in DimAccounts.xlsx
- Review the list and add missing accounts to DimAccounts if needed

### Balance Sheet Doesn't Balance?
- Check the imbalance amount shown
- Review account categorizations in DimAccounts.xlsx
- Ensure all accounts are properly mapped

## Re-running After Data Updates

When your source data changes:

1. Update the source files in `input/`:
   - `2024_BalansenWinstverliesperperiode.xlsx`
   - `2025_BalansenWinstverliesperperiode.xlsx`

2. Re-run the transformation:
   ```bash
   deno run --allow-read --allow-write transform_trial_balance.ts
   ```

3. Reload the application and load files again

## Need More Help?

- See `TRANSFORMATION_SUMMARY.md` for detailed information
- See `README.md` for full documentation
- See `DATA_TRANSFORMATION_PROPOSAL.md` for technical details
