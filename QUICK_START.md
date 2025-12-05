# Quick Start Guide

## ⚠️ Important: Web Server Required

This application uses **ES6 modules** and must be served from a web server. Opening `index.html` directly in your browser will NOT work due to CORS restrictions.

---

## 🚀 Start the Application

### Step 1: Run a Local Web Server

Choose one of these options:

#### Option 1: Deno Dev Server (Recommended - Handles TypeScript)
```bash
# Easy way - automatically handles port conflicts
./start-dev.sh

# Or manually
deno task dev
```
This starts a development server that automatically transpiles TypeScript files.

#### Option 2: Python 3 (Simple but doesn't handle TypeScript)
```bash
python3 -m http.server 8000
```
⚠️ **Note:** Python server won't transpile TypeScript. Use Option 1 for development.

#### Option 3: Node.js http-server
```bash
# Install once
npm install -g http-server

# Run
http-server -p 8000
```
⚠️ **Note:** This won't transpile TypeScript. Use Option 1 for development.

#### Option 4: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

⚠️ **Note:** Live Server won't transpile TypeScript. Use Option 1 for development.

### Step 2: Open in Browser

Navigate to: **http://localhost:8000**

---

## 📁 Load Your Data

1. Click **"Select Directory"** button
2. Navigate to your `input` folder containing:
   - `2024_BalansenWinstverliesperperiode.xlsx`
   - `2025_BalansenWinstverliesperperiode.xlsx`
   - `DimDates.xlsx` (optional)
3. Files will load automatically
4. View statements in the ag-Grid table

---

## 🎯 Use the Application

### Select Statement Type
Use the dropdown to choose:
- Income Statement
- Balance Sheet  
- Cash Flow Statement

### Select Report Definition (NEW)
Choose from available report templates:
- **Default Reports**: Standard financial statements
- **Detailed Reports**: Comprehensive breakdowns with subcategories
- **IFRS Reports**: International Financial Reporting Standards format
- **Custom Reports**: Your own custom report definitions

### Filter by Period
- **Year Selector**: Choose 2024, 2025, or LTM (Last Twelve Months)
- **Period Selector**: Choose yearly, quarterly (Q1-Q4), or monthly (P1-P12)

### Adjust Variance Display
Choose how to display variance:
- None
- Amount (€)
- Percent (%)
- Both

### Export Data
Click **"Export to Excel"** to download the current statement

---

## ❌ Troubleshooting

### "Select Directory" Button Does Nothing

**Problem:** You opened `index.html` directly (file:// protocol)

**Solution:** Run a web server (see Step 1 above)

**Why:** ES6 modules require HTTP protocol due to browser security (CORS)

### Console Error: "Failed to load module"

**Problem:** Same as above - file:// protocol

**Solution:** Use http://localhost:8000 instead

### Browser Not Supported

**Supported Browsers:**
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+

**Not Supported:**
- ❌ Firefox (no File System Access API)
- ❌ Safari (no File System Access API)

---

## 📊 Application Architecture

```
├── index.html          # Entry point (minimal HTML)
├── src/                # ES6 modules
│   ├── app.js         # Initialization
│   ├── config/        # Configuration
│   ├── data/          # Data loading & storage
│   ├── statements/    # Statement generation
│   ├── ui/            # User interface
│   ├── services/      # Cross-cutting services
│   ├── utils/         # Utility functions
│   └── export/        # Export functionality
├── test/              # Unit tests (Deno)
└── input/             # Your data files (create this)
```

---

## 🧪 Run Tests

```bash
# Run all tests
deno test --allow-read test/unit/

# Run with coverage
deno test --allow-read --coverage=coverage test/unit/
deno coverage coverage
```

---

## 📝 Creating Custom Reports

Want to create your own custom financial statement layouts?

### Quick Start
1. Copy an example: `reports/examples/income_simple.json`
2. Modify the JSON file:
   - Change `reportId` and `name`
   - Define your variables (filters + aggregations)
   - Specify layout items (order, labels, calculations)
   - Set formatting rules
3. Save to `reports/` directory
4. Reload the application
5. Select your report from the dropdown

### Example Report Structure
```json
{
  "reportId": "my_custom_report",
  "name": "My Custom Income Statement",
  "version": "1.0.0",
  "statementType": "income",
  "variables": {
    "revenue": {
      "filter": { "code1": "700" },
      "aggregate": "sum"
    }
  },
  "layout": [
    {
      "order": 100,
      "label": "Revenue",
      "type": "variable",
      "variable": "revenue",
      "format": "currency"
    }
  ]
}
```

### Learn More
- **Complete Guide**: [docs/REPORT_DEFINITIONS.md](docs/REPORT_DEFINITIONS.md)
- **Migration Guide**: [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
- **Example Reports**: [reports/examples/](reports/examples/)

## 📚 More Information

- **Full Documentation**: See [README.md](README.md)
- **Version History**: See [CHANGELOG.md](CHANGELOG.md)
- **Report Definitions**: See [docs/REPORT_DEFINITIONS.md](docs/REPORT_DEFINITIONS.md)
- **Migration Guide**: See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
- **Data Format**: See [docs/SAMPLE_DATA_FORMAT.md](docs/SAMPLE_DATA_FORMAT.md)
- **Testing Guide**: See [test/docs/TESTING_GUIDE.md](test/docs/TESTING_GUIDE.md)

---

## 🆘 Still Having Issues?

1. Check browser console for error messages (F12)
2. Verify you're using http://localhost:8000 (not file://)
3. Confirm your browser is Chrome, Edge, or Opera
4. Check that your data files are in the correct format
5. Review the troubleshooting section in README.md

---

**Version:** 0.11.0  
**Last Updated:** November 18, 2025
