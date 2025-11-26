# Multi-Statement Export - Design Document

## Overview

Design for exporting all financial statements (Balance Sheet, Income Statement, Cash Flow) into a single Excel workbook with each statement on a separate worksheet tab.

## User Experience

### Option 1: Single Button (Recommended)
**Simple and intuitive**

```
┌─────────────────────────────────────────────┐
│  Export Controls                             │
├─────────────────────────────────────────────┤
│  [Export Current Statement]  [Export All ▼] │
└─────────────────────────────────────────────┘
```

- **"Export Current Statement"** - Exports only the visible statement
- **"Export All"** dropdown with options:
  - "All Statements (One File)" - Single workbook with 3 tabs
  - "All Statements (Separate Files)" - 3 separate .xlsx files

**Pros:**
- Clear and simple
- Matches user's mental model
- Easy to discover
- No confusion about what gets exported

**Cons:**
- Takes up more horizontal space

### Option 2: Dropdown Menu (Space Efficient)
**More compact**

```
┌─────────────────────────────────────┐
│  [Export ▼]                          │
│    ├─ Current Statement              │
│    ├─ All Statements (One File)      │
│    └─ All Statements (Separate Files)│
└─────────────────────────────────────┘
```

**Pros:**
- Compact design
- All export options in one place
- Scalable (can add more options later)

**Cons:**
- Requires extra click to see options
- Less discoverable for primary action

### Option 3: Checkbox Selection (Advanced)
**Power user feature**

```
┌──────────────────────────────────────────────┐
│  Select Statements to Export:                │
│  ☑ Balance Sheet  ☑ Income Statement  ☑ Cash Flow │
│  [Export Selected Statements]                │
└──────────────────────────────────────────────┘
```

**Pros:**
- Flexible - export any combination
- Good for custom reports

**Cons:**
- More complex UI
- Takes up vertical space
- Might be overkill for most users

## Recommended Approach: **Option 1** (Single Button)

Most intuitive and aligns with common patterns (Word, Excel, etc.)

## Technical Implementation

### Architecture

```
UIController
    │
    ├─> handleExportCurrent() ──> AgGridStatementRenderer.exportToExcel()
    │                                    │
    │                                    └─> excel-export.js::exportGridToExcel()
    │
    └─> handleExportAll() ────> generateAllStatements()
                                    │
                                    ├─> Generate BS
                                    ├─> Generate IS
                                    ├─> Generate CF
                                    │
                                    └─> excel-export.js::exportMultipleStatementsToExcel()
```

### Step-by-Step Implementation

#### Step 1: Update UI (index.html)

```html
<!-- Export Controls -->
<div class="export-controls" style="display: flex; gap: 10px; align-items: center;">
    <button id="export-current" class="btn btn-secondary">
        Export Current Statement
    </button>

    <div class="dropdown" style="position: relative;">
        <button id="export-all-button" class="btn btn-primary dropdown-toggle">
            Export All ▼
        </button>
        <div id="export-all-menu" class="dropdown-menu" style="display: none;">
            <a href="#" id="export-all-single" class="dropdown-item">
                All Statements (One File)
            </a>
            <a href="#" id="export-all-separate" class="dropdown-item">
                All Statements (Separate Files)
            </a>
        </div>
    </div>

    <span id="export-status" class="status-text"></span>
</div>

<style>
.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    min-width: 200px;
    padding: 5px 0;
    margin: 2px 0 0;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 6px 12px rgba(0,0,0,.175);
}

.dropdown-item {
    display: block;
    padding: 8px 16px;
    clear: both;
    font-weight: normal;
    color: #333;
    text-decoration: none;
    white-space: nowrap;
}

.dropdown-item:hover {
    background-color: #f5f5f5;
    color: #262626;
}
</style>
```

#### Step 2: Add UIController Methods

```javascript
// In UIController.js

setupExportEventListeners() {
    // Export current statement
    document.getElementById('export-current').addEventListener('click', () => {
        this.handleExportCurrent();
    });

    // Export all dropdown toggle
    const exportAllButton = document.getElementById('export-all-button');
    const exportAllMenu = document.getElementById('export-all-menu');

    exportAllButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = exportAllMenu.style.display === 'block';
        exportAllMenu.style.display = isVisible ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        exportAllMenu.style.display = 'none';
    });

    // Export all to single file
    document.getElementById('export-all-single').addEventListener('click', async (e) => {
        e.preventDefault();
        exportAllMenu.style.display = 'none';
        await this.handleExportAllSingle();
    });

    // Export all to separate files
    document.getElementById('export-all-separate').addEventListener('click', async (e) => {
        e.preventDefault();
        exportAllMenu.style.display = 'none';
        await this.handleExportAllSeparate();
    });
}

async handleExportCurrent() {
    try {
        if (!this.currentStatementType) {
            this.showExportStatus('No statement to export', 'error');
            return;
        }

        this.showExportStatus('Exporting...', 'loading');

        const statementName = this.getStatementDisplayName(this.currentStatementType);
        await this.agGridRenderer.exportToExcel(statementName);

        this.showExportStatus('Export successful!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        this.showExportStatus('Export failed', 'error');
    }
}

async handleExportAllSingle() {
    try {
        // Validate data is loaded
        if (!this.dataStore.getCombinedMovements()) {
            this.showExportStatus('No data loaded', 'error');
            return;
        }

        this.showExportStatus('Generating all statements...', 'loading');

        // Get current period settings
        const periodOptions = this.getPeriodOptions();

        // Generate all three statements
        const statements = await this.generateAllStatements(periodOptions);

        // Export to single workbook
        const workbookName = 'Financial_Statements';
        await this.exportMultipleStatements(statements, workbookName);

        this.showExportStatus('All statements exported!', 'success');
    } catch (error) {
        console.error('Export all error:', error);
        this.showExportStatus('Export failed', 'error');
    }
}

async handleExportAllSeparate() {
    try {
        if (!this.dataStore.getCombinedMovements()) {
            this.showExportStatus('No data loaded', 'error');
            return;
        }

        this.showExportStatus('Exporting statements...', 'loading');

        const periodOptions = this.getPeriodOptions();
        const statements = await this.generateAllStatements(periodOptions);

        // Export each statement separately
        for (const statement of statements) {
            // Create temporary grid for this statement
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);

            const tempRenderer = new AgGridStatementRenderer(tempContainer.id);
            tempRenderer.render(statement.data, statement.type);

            await tempRenderer.exportToExcel(statement.name);

            // Cleanup
            tempRenderer.destroy();
            document.body.removeChild(tempContainer);

            // Small delay between exports
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.showExportStatus('All statements exported!', 'success');
    } catch (error) {
        console.error('Export separate error:', error);
        this.showExportStatus('Export failed', 'error');
    }
}

async generateAllStatements(periodOptions) {
    const statements = [];

    // Balance Sheet
    const balanceSheetData = this.statementGenerator.generateBalanceSheet(periodOptions);
    statements.push({
        type: 'balance-sheet',
        name: 'Balance Sheet',
        data: balanceSheetData,
        gridApi: null, // Will be set when rendering
        columnDefs: null // Will be set when rendering
    });

    // Income Statement
    const incomeStatementData = this.statementGenerator.generateIncomeStatement(periodOptions);
    statements.push({
        type: 'income-statement',
        name: 'Income Statement',
        data: incomeStatementData,
        gridApi: null,
        columnDefs: null
    });

    // Cash Flow Statement
    const cashFlowData = this.statementGenerator.generateCashFlowStatement(periodOptions);
    statements.push({
        type: 'cash-flow',
        name: 'Cash Flow Statement',
        data: cashFlowData,
        gridApi: null,
        columnDefs: null
    });

    return statements;
}

async exportMultipleStatements(statements, workbookName) {
    // Import the multi-statement export function
    const { exportMultipleStatementsToExcel } = await import('../export/excel-export.js');

    // Create temporary grids for each statement to get gridApi and columnDefs
    const statementData = [];

    for (const statement of statements) {
        // Create hidden container
        const container = document.createElement('div');
        container.id = `temp-grid-${statement.type}`;
        container.style.display = 'none';
        document.body.appendChild(container);

        // Create temporary renderer
        const renderer = new AgGridStatementRenderer(container.id);
        renderer.render(statement.data, statement.type);

        // Get grid API and column defs
        statementData.push({
            gridApi: renderer.gridApi,
            columnDefs: renderer.gridApi.getColumnDefs(),
            name: statement.name
        });

        // Note: We'll clean up after export
    }

    // Export all statements
    await exportMultipleStatementsToExcel(statementData, workbookName);

    // Cleanup temporary grids
    for (const statement of statements) {
        const container = document.getElementById(`temp-grid-${statement.type}`);
        if (container) {
            document.body.removeChild(container);
        }
    }
}

getStatementDisplayName(statementType) {
    const names = {
        'balance-sheet': 'Balance Sheet',
        'income-statement': 'Income Statement',
        'cash-flow': 'Cash Flow Statement'
    };
    return names[statementType] || statementType;
}

getPeriodOptions() {
    const periodSelector = document.getElementById('period-selector');
    const viewType = document.getElementById('view-type')?.value || 'cumulative';
    const periodValue = periodSelector?.value || 'all';

    return {
        period2024: `2024-${periodValue}`,
        period2025: `2025-${periodValue}`,
        viewType: viewType
    };
}
```

#### Step 3: Update excel-export.js

The `exportMultipleStatementsToExcel()` function is already implemented! Just need to ensure it handles the data properly:

```javascript
// Already in excel-export.js
async exportMultipleStatements(statements, workbookName) {
    this.workbook = new ExcelJS.Workbook();
    addMetadata(this.workbook, workbookName);

    for (const statement of statements) {
        // Create worksheet for this statement
        this.worksheet = this.workbook.addWorksheet(statement.name, {
            properties: {
                tabColor: { argb: this.getTabColor(statement.name) }
            }
        });

        // Get row data
        const rowData = [];
        statement.gridApi.forEachNodeAfterFilterAndSort((node) => {
            if (node.data) {
                rowData.push(node.data);
            }
        });

        // Write data with formatting
        await this.writeDataToWorksheet(rowData, statement.columnDefs, {
            title: statement.name
        });

        this.applyFormatting(statement.columnDefs, rowData.length, {
            title: statement.name
        });
    }

    await this.downloadWorkbook(workbookName);
}

getTabColor(statementName) {
    const colors = {
        'Balance Sheet': 'FF4472C4',      // Blue
        'Income Statement': 'FF70AD47',   // Green
        'Cash Flow Statement': 'FFFFC000' // Orange
    };
    return colors[statementName] || 'FF4472C4';
}
```

### Alternative: Optimized Implementation (No Temporary Grids)

**Problem**: Creating temporary grids is inefficient and hacky.

**Better Solution**: Generate data structures directly without rendering.

```javascript
// Improved approach - generate export data without rendering

async exportMultipleStatementsOptimized(statements, workbookName) {
    const { ExcelExporter } = await import('../export/excel-export.js');
    const exporter = new ExcelExporter();

    exporter.workbook = new ExcelJS.Workbook();
    addMetadata(exporter.workbook, workbookName);

    for (const statement of statements) {
        // Create worksheet
        exporter.worksheet = exporter.workbook.addWorksheet(statement.name, {
            properties: { tabColor: { argb: this.getTabColor(statement.name) } }
        });

        // Convert statement data to grid format
        const gridData = this.convertStatementToGridData(statement.data, statement.type);
        const columnDefs = this.getColumnDefsForStatement(statement.type);

        // Write directly to worksheet
        await exporter.writeDataToWorksheet(gridData, columnDefs, {
            title: statement.name
        });

        exporter.applyFormatting(columnDefs, gridData.length, {
            title: statement.name
        });
    }

    await exporter.downloadWorkbook(workbookName);
}

convertStatementToGridData(statementData, statementType) {
    // Use the same logic as AgGridStatementRenderer.prepareDataForGrid()
    // This avoids creating actual grid instances
    const renderer = new AgGridStatementRenderer('dummy-id');
    return renderer.prepareDataForGrid(statementData, statementType);
}

getColumnDefsForStatement(statementType) {
    // Use ColumnDefBuilder to get column definitions
    const year1 = YEAR_CONFIG.getYear(0);
    const year2 = YEAR_CONFIG.getYear(1);

    const builder = new ColumnDefBuilder(statementType, year1, year2);
    builder.setFormatters(
        (value, params) => value, // Simplified for export
        (params) => params.value
    );

    return builder.build();
}
```

## Performance Considerations

### Temporary Grid Approach
- **Pros**: Reuses existing rendering logic
- **Cons**: Creates 3 hidden DOM elements, more memory usage
- **Time**: ~1-2 seconds per statement = 3-6 seconds total

### Direct Data Approach
- **Pros**: No DOM manipulation, faster
- **Cons**: Requires extracting rendering logic
- **Time**: ~0.5-1 second per statement = 1.5-3 seconds total

**Recommendation**: Start with temporary grid approach (simpler), optimize later if needed.

## UI/UX Flow

### Single File Export Flow
```
1. User clicks "Export All" → "All Statements (One File)"
2. Show loading status: "Generating all statements..."
3. Generate Balance Sheet data
4. Generate Income Statement data
5. Generate Cash Flow data
6. Create Excel workbook with 3 tabs
7. Apply formatting to each tab
8. Download "Financial_Statements_2025-01-26.xlsx"
9. Show success: "All statements exported!"
```

### Separate Files Export Flow
```
1. User clicks "Export All" → "All Statements (Separate Files)"
2. Show loading status: "Exporting statements... (1/3)"
3. Export Balance Sheet
4. Update status: "Exporting statements... (2/3)"
5. Export Income Statement
6. Update status: "Exporting statements... (3/3)"
7. Export Cash Flow
8. Show success: "3 files exported!"
```

## File Naming Conventions

### Single File
- Format: `Financial_Statements_YYYY-MM-DD.xlsx`
- Example: `Financial_Statements_2025-01-26.xlsx`
- Tabs: "Balance Sheet", "Income Statement", "Cash Flow Statement"

### Separate Files
- Format: `{Statement_Name}_YYYY-MM-DD.xlsx`
- Examples:
  - `Balance_Sheet_2025-01-26.xlsx`
  - `Income_Statement_2025-01-26.xlsx`
  - `Cash_Flow_Statement_2025-01-26.xlsx`

### LTM Mode
- Format: `Financial_Statements_LTM_YYYY-MM-DD.xlsx`
- Example: `Financial_Statements_LTM_2025-01-26.xlsx`
- Each tab includes LTM columns

## Testing Checklist

- [ ] Export current statement (normal mode)
- [ ] Export current statement (LTM mode)
- [ ] Export all to single file (normal mode)
- [ ] Export all to single file (LTM mode)
- [ ] Export all to separate files (normal mode)
- [ ] Export all to separate files (LTM mode)
- [ ] Verify each tab has correct formatting
- [ ] Verify tab colors are distinct
- [ ] Verify freeze panes work on all tabs
- [ ] Verify print settings on all tabs
- [ ] Test with large datasets
- [ ] Test error handling (no data loaded)
- [ ] Test cancellation (if implemented)

## Future Enhancements

### Progress Bar
```html
<div id="export-progress" style="display: none;">
    <div class="progress-bar">
        <div id="progress-fill" style="width: 0%;"></div>
    </div>
    <span id="progress-text">Exporting... 0%</span>
</div>
```

### Custom Selection
```html
<div class="statement-selector">
    <label><input type="checkbox" value="BS" checked> Balance Sheet</label>
    <label><input type="checkbox" value="IS" checked> Income Statement</label>
    <label><input type="checkbox" value="CF" checked> Cash Flow</label>
</div>
```

### Cancellation
```javascript
let exportCancelled = false;

async function handleExportAllWithCancel() {
    const cancelButton = document.getElementById('cancel-export');
    cancelButton.style.display = 'block';

    for (const statement of statements) {
        if (exportCancelled) {
            showStatus('Export cancelled', 'error');
            return;
        }
        await exportStatement(statement);
    }

    cancelButton.style.display = 'none';
}
```

## Conclusion

**Recommended Implementation Path**:

1. **Phase 1**: Add "Export Current Statement" button (rename existing)
2. **Phase 2**: Add "Export All" dropdown with single file option
3. **Phase 3**: Add separate files option
4. **Phase 4**: Optimize with direct data approach (if needed)
5. **Phase 5**: Add progress indicator
6. **Phase 6**: Add custom selection (optional)

**Estimated Implementation Time**:
- Phase 1: 15 minutes
- Phase 2: 1-2 hours
- Phase 3: 30 minutes
- Total: 2-3 hours

**Benefits**:
- Professional multi-sheet reports
- Saves user time (one click vs three)
- Consistent formatting across all statements
- Easy to share complete financial picture

Start with the simple approach (temporary grids), and optimize later if performance becomes an issue. The architecture is flexible enough to support either approach.
