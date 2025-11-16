# Sample Data File Formats

This document describes the expected format for input Excel files.

## Directory Structure

Create an `input` directory with the following files:
- `trial_balance_2024.xlsx`
- `trial_balance_2025.xlsx`
- `hierarchy.xlsx`
- `dates.xlsx`
- `format.xlsx`

## 1. Trial Balance Files (trial_balance_2024.xlsx, trial_balance_2025.xlsx)

### Required Columns:
- `account_code` (string): Unique account identifier (e.g., "1000", "2000")
- `account_description` (string): Account name (e.g., "Cash", "Accounts Receivable")
- `amount` (number): Account balance

### Sample Data:

| account_code | account_description | amount |
|--------------|---------------------|--------|
| 1000 | Cash | 50000.00 |
| 1100 | Accounts Receivable | 75000.00 |
| 1200 | Inventory | 100000.00 |
| 1500 | Equipment | 200000.00 |
| 2000 | Accounts Payable | 45000.00 |
| 2100 | Notes Payable | 100000.00 |
| 3000 | Common Stock | 150000.00 |
| 3100 | Retained Earnings | 130000.00 |
| 4000 | Sales Revenue | 500000.00 |
| 5000 | Cost of Goods Sold | 300000.00 |
| 6000 | Salaries Expense | 80000.00 |
| 6100 | Rent Expense | 24000.00 |
| 6200 | Utilities Expense | 12000.00 |

## 2. Hierarchy File (hierarchy.xlsx)

### Required Columns:
- `account_code` (string): Must match account codes in trial balance
- `statement_type` (string): "BS" (Balance Sheet), "IS" (Income Statement), or "CF" (Cash Flow)
- `category` (string): Main category (e.g., "Assets", "Revenue", "Operating Activities")
- `subcategory` (string): Subcategory (e.g., "Current Assets", "Operating Revenue")
- `line_order` (number): Display order within statement

### Sample Data:

| account_code | statement_type | category | subcategory | line_order |
|--------------|----------------|----------|-------------|------------|
| 1000 | BS | Assets | Current Assets | 10 |
| 1100 | BS | Assets | Current Assets | 20 |
| 1200 | BS | Assets | Current Assets | 30 |
| 1500 | BS | Assets | Fixed Assets | 40 |
| 2000 | BS | Liabilities | Current Liabilities | 50 |
| 2100 | BS | Liabilities | Long-term Liabilities | 60 |
| 3000 | BS | Equity | Shareholders Equity | 70 |
| 3100 | BS | Equity | Shareholders Equity | 80 |
| 4000 | IS | Revenue | Operating Revenue | 10 |
| 5000 | IS | Cost of Goods Sold | COGS | 20 |
| 6000 | IS | Operating Expenses | Salaries | 30 |
| 6100 | IS | Operating Expenses | Rent | 40 |
| 6200 | IS | Operating Expenses | Utilities | 50 |

## 3. Dates File (dates.xlsx)

### Required Columns:
- `period` (string): Period identifier (e.g., "2024", "2025")
- `year` (number): Year
- `period_start` (date): Period start date
- `period_end` (date): Period end date

### Sample Data:

| period | year | period_start | period_end |
|--------|------|--------------|------------|
| 2024 | 2024 | 2024-01-01 | 2024-12-31 |
| 2025 | 2025 | 2025-01-01 | 2025-12-31 |

## 4. Format File (format.xlsx)

### Required Columns:
- `statement_type` (string): "BS", "IS", or "CF"
- `line_number` (number): Line order in statement
- `line_type` (string): "detail", "subtotal", or "empty"
- `line_label` (string): Display label for the line
- `category_filter` (string, optional): Category to filter/group

### Sample Data:

| statement_type | line_number | line_type | line_label | category_filter |
|----------------|-------------|-----------|------------|-----------------|
| BS | 10 | detail | Current Assets | Current Assets |
| BS | 20 | subtotal | Total Current Assets | Current Assets |
| BS | 30 | empty | | |
| BS | 40 | detail | Fixed Assets | Fixed Assets |
| BS | 50 | subtotal | Total Assets | Assets |
| IS | 10 | detail | Revenue | Revenue |
| IS | 20 | detail | Cost of Goods Sold | COGS |
| IS | 30 | subtotal | Gross Profit | |
| IS | 40 | detail | Operating Expenses | Operating Expenses |
| IS | 50 | subtotal | Net Income | |

## Complete Sample Dataset

### Balance Sheet Accounts (50+ accounts)

**Assets:**
- 1000: Cash - $50,000
- 1010: Petty Cash - $500
- 1100: Accounts Receivable - $75,000
- 1110: Allowance for Doubtful Accounts - ($2,000)
- 1200: Inventory - Raw Materials - $40,000
- 1210: Inventory - Finished Goods - $60,000
- 1300: Prepaid Insurance - $6,000
- 1310: Prepaid Rent - $12,000
- 1500: Land - $100,000
- 1510: Buildings - $300,000
- 1520: Accumulated Depreciation - Buildings - ($50,000)
- 1530: Equipment - $200,000
- 1540: Accumulated Depreciation - Equipment - ($40,000)
- 1600: Intangible Assets - $25,000

**Liabilities:**
- 2000: Accounts Payable - $45,000
- 2010: Salaries Payable - $8,000
- 2020: Interest Payable - $2,000
- 2030: Taxes Payable - $15,000
- 2100: Notes Payable (Short-term) - $30,000
- 2200: Notes Payable (Long-term) - $100,000
- 2210: Bonds Payable - $150,000
- 2300: Deferred Revenue - $10,000

**Equity:**
- 3000: Common Stock - $150,000
- 3100: Retained Earnings - $130,000
- 3200: Additional Paid-in Capital - $50,000

### Income Statement Accounts

**Revenue:**
- 4000: Sales Revenue - $500,000
- 4100: Service Revenue - $75,000
- 4200: Interest Income - $2,000

**Cost of Goods Sold:**
- 5000: Cost of Goods Sold - $300,000

**Operating Expenses:**
- 6000: Salaries Expense - $80,000
- 6100: Rent Expense - $24,000
- 6200: Utilities Expense - $12,000
- 6300: Insurance Expense - $8,000
- 6400: Depreciation Expense - $15,000
- 6500: Advertising Expense - $10,000
- 6600: Office Supplies Expense - $5,000
- 6700: Professional Fees - $7,000
- 6800: Repairs and Maintenance - $6,000

**Other Income/Expenses:**
- 7000: Interest Expense - $8,000
- 7100: Gain on Sale of Assets - $3,000

**Taxes:**
- 8000: Income Tax Expense - $25,000

### Cash Flow Statement Accounts

**Operating Activities:**
- 9000: Cash from Customers - $550,000
- 9010: Cash to Suppliers - ($320,000)
- 9020: Cash for Operating Expenses - ($150,000)
- 9030: Interest Paid - ($8,000)
- 9040: Taxes Paid - ($25,000)

**Investing Activities:**
- 9100: Purchase of Equipment - ($50,000)
- 9110: Sale of Equipment - $10,000
- 9120: Purchase of Investments - ($20,000)

**Financing Activities:**
- 9200: Proceeds from Stock Issuance - $30,000
- 9210: Repayment of Notes Payable - ($15,000)
- 9220: Dividends Paid - ($10,000)

## Notes

1. All Excel files should have headers in the first row
2. Numeric values should be formatted as numbers (not text)
3. Dates should be in Excel date format
4. Account codes should be consistent across all files
5. The application will automatically add the `period` field to trial balance data based on which file is loaded (2024 or 2025)
6. For 2025 data, adjust amounts to show year-over-year changes (typically 5-15% growth or decline)
