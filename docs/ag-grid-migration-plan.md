# ag-Grid Migration Plan
## Financial Statement Generator - UI Modernization

**Version:** 1.0
**Date:** 2025-01-22
**Current Version:** v2.9.0 (3,401 lines)
**Estimated Completion:** 3-5 days

---

## Executive Summary

Migrate the Financial Statement Generator from custom HTML table rendering to ag-Grid Enterprise Community Edition. This will reduce codebase by ~500-650 lines (15-19%), improve maintainability, and unlock advanced features for free.

### Key Benefits
- ✅ **Code Reduction**: 500-650 lines eliminated
- ✅ **Free Features**: Sorting, filtering, grouping, Excel export, column management
- ✅ **Performance**: Virtual scrolling for large datasets
- ✅ **Future-Ready**: Cost center drill-down, multi-year comparison trivial to add
- ✅ **Single File**: Remains a single `index.html` page

---

## Current State Analysis

### Code to be Replaced (~750-850 lines)

| Component | Lines | Purpose | ag-Grid Replacement |
|-----------|-------|---------|---------------------|
| `renderStatement()` | 384 | Main rendering logic | Grid initialization + columnDefs |
| `renderTableRow()` | 14 | Row HTML generation | Built-in row rendering |
| `renderPeriodDropdown()` | 28 | Period filter dropdowns | Custom header components |
| `formatNumber()` + utilities | 38 | Number formatting | valueFormatter |
| `ExportHandler` class | 180 | Excel export | grid.exportDataAsExcel() |
| Event listeners | 100 | User interactions | Grid event system |
| Tooltip logic | 70 | Cell tooltips | Built-in tooltip support |
| Column visibility | 50 | Show/hide columns | columnApi.setColumnsVisible() |

### Current UI Features

✅ **Must Keep:**
- Three statement types (Balance Sheet, Income, Cash Flow)
- Hierarchical display (code0 → code1 → code2 → code3)
- Dynamic year columns (2024, 2025, future years)
- Variance columns (amount & percent)
- Period filtering (All, Q1-Q4, P1-P12)
- Detail level toggle (Category vs Subcategory)
- Custom metrics (Total Assets, Net Income, etc.)
- Excel export
- Number formatting (currency, percentages)
- Color coding (positive/negative variances)

✅ **Nice to Have (Currently Manual):**
- Column resizing/reordering
- Sorting
- Advanced filtering
- Copy/paste to Excel

---

## Migration Strategy

### Phase 1: Setup & Infrastructure (Day 1 - 4 hours)

#### 1.1 Add ag-Grid Dependencies
```html
<!-- In <head> section -->
<!-- ag-Grid Community (free) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31/styles/ag-theme-alpine.css">
<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31/dist/ag-grid-community.min.js"></script>
```

**Size Impact:** +150KB (minified)
**Can Remove:** ExcelJS dependency -100KB (ag-Grid has built-in Excel export)

#### 1.2 Create ag-Grid Container
```html
<!-- Replace <div id="statement-display"></div> with: -->
<div id="ag-grid-container" class="ag-theme-alpine" style="height: 600px; width: 100%;"></div>
```

#### 1.3 Create Grid Wrapper Class
```javascript
class AgGridStatementRenderer {
    constructor(containerId) {
        this.gridDiv = document.querySelector(`#${containerId}`);
        this.gridApi = null;
        this.columnApi = null;
    }

    initialize(statementData, statementType, options) {
        // Grid setup logic
    }

    updateData(newData) {
        this.gridApi.setRowData(newData);
    }
}
```

**Deliverable:** Empty ag-Grid renders successfully

---

### Phase 2: Basic Balance Sheet (Day 1-2 - 8 hours)

#### 2.1 Column Definitions
```javascript
getBalanceSheetColumns(year1, year2) {
    return [
        // Grouping column (hidden, used for row grouping)
        {
            field: 'name1',
            headerName: 'Category',
            rowGroup: true,
            hide: true
        },

        // Main display columns
        {
            field: 'name2',
            headerName: 'Line Item',
            cellClass: params => params.node.group ? 'group-cell' : 'detail-cell',
            minWidth: 300
        },

        // Year columns
        {
            field: 'amount_2024',
            headerName: year1,
            type: 'numericColumn',
            valueFormatter: params => this.formatCurrency(params.value),
            aggFunc: 'sum',
            cellClass: 'number-cell'
        },
        {
            field: 'amount_2025',
            headerName: year2,
            type: 'numericColumn',
            valueFormatter: params => this.formatCurrency(params.value),
            aggFunc: 'sum',
            cellClass: 'number-cell'
        },

        // Variance columns
        {
            field: 'variance_amount',
            headerName: 'Variance (€)',
            type: 'numericColumn',
            valueFormatter: params => this.formatCurrency(params.value),
            cellRenderer: 'varianceRenderer',
            aggFunc: 'sum'
        },
        {
            field: 'variance_percent',
            headerName: 'Variance (%)',
            type: 'numericColumn',
            valueFormatter: params => params.value.toFixed(1) + '%',
            cellRenderer: 'varianceRenderer',
            aggFunc: params => this.calculateGroupVariancePercent(params)
        }
    ];
}
```

#### 2.2 Grid Options
```javascript
getGridOptions(statementType, year1, year2) {
    return {
        columnDefs: this.getBalanceSheetColumns(year1, year2),
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1
        },

        // Tree data / grouping
        autoGroupColumnDef: {
            headerName: 'Category',
            minWidth: 250,
            cellRendererParams: {
                suppressCount: true,  // Don't show row count
                innerRenderer: params => params.value  // Custom formatting
            }
        },
        groupDefaultExpanded: 1,  // Expand first level

        // Aggregation
        aggFuncs: {
            sum: params => params.values.reduce((a, b) => a + b, 0)
        },

        // Custom renderers
        components: {
            varianceRenderer: this.VarianceRenderer
        },

        // Styling
        rowClass: params => {
            if (params.node.group) return 'group-row';
            if (params.data.type === 'total') return 'total-row';
            return 'detail-row';
        },

        // Events
        onGridReady: params => {
            this.gridApi = params.api;
            this.columnApi = params.columnApi;
            params.api.sizeColumnsToFit();
        },

        onFirstDataRendered: params => {
            params.api.sizeColumnsToFit();
        }
    };
}
```

#### 2.3 Custom Cell Renderers
```javascript
// Variance cell renderer (color coding)
VarianceRenderer(params) {
    if (params.value == null) return '';

    const value = params.value;
    const isPositive = value >= 0;
    const color = isPositive ? '#28a745' : '#dc3545';

    return `<span style="color: ${color}">${params.valueFormatted}</span>`;
}

// Currency formatter
formatCurrency(value) {
    if (value == null || isNaN(value)) return '-';
    return new Intl.NumberFormat('nl-NL', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}
```

#### 2.4 Data Transformation
```javascript
prepareDataForGrid(statementData, statementType) {
    const details = statementData.details.objects();

    // ag-Grid expects flat data with grouping fields
    return details.map(row => ({
        ...row,
        // Add metadata for special rendering
        _isMetric: false,
        _rowType: 'detail'
    }));
}
```

#### 2.5 Insert Custom Rows (Totals, Metrics)
```javascript
// Option 1: Add as regular data rows with special flag
insertCustomRows(data, statementData, statementType) {
    const result = [...data];

    if (statementType === 'balance-sheet') {
        // Insert "TOTAL ASSETS" after asset categories
        const assetIndex = result.findIndex(r => r.name1.includes('Liabilities'));
        if (assetIndex > 0) {
            result.splice(assetIndex, 0, {
                name2: 'TOTAL ASSETS',
                amount_2024: statementData.totalAssets2024,
                amount_2025: statementData.totalAssets2025,
                variance_amount: statementData.totalAssets2025 - statementData.totalAssets2024,
                _isMetric: true,
                _rowType: 'total'
            });
        }
    }

    return result;
}

// Option 2: Use pinnedTopRowData / pinnedBottomRowData
getPinnedBottomRows(statementData, statementType) {
    if (statementType === 'income-statement') {
        return [{
            name2: 'NET INCOME',
            amount_2024: statementData.metrics.netIncome['2024'],
            amount_2025: statementData.metrics.netIncome['2025'],
            _rowType: 'total'
        }];
    }
    return [];
}
```

**Deliverable:** Balance Sheet displays correctly with grouping and totals

---

### Phase 3: Period Filtering & Column Headers (Day 2 - 4 hours)

#### 3.1 Custom Header Components
```javascript
// Period dropdown in column header
class PeriodHeaderComponent {
    init(params) {
        this.params = params;
        this.eGui = document.createElement('div');
        this.eGui.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <select class="period-dropdown" id="period-${params.column.colId}">
                    <option value="all">All</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="1">P1</option>
                    <!-- ... all periods -->
                </select>
                <span>${params.displayName}</span>
            </div>
        `;

        // Add event listener
        const select = this.eGui.querySelector('select');
        select.addEventListener('change', (e) => {
            this.params.onPeriodChange(e.target.value);
        });
    }

    getGui() {
        return this.eGui;
    }
}

// Register component
gridOptions.components = {
    periodHeaderComponent: PeriodHeaderComponent
};

// Use in column definition
{
    field: 'amount_2024',
    headerComponent: 'periodHeaderComponent',
    headerComponentParams: {
        onPeriodChange: (period) => {
            // Re-fetch data with new period filter
            this.handlePeriodChange('2024', period);
        }
    }
}
```

#### 3.2 Detail Level Toggle
```javascript
// Add toolbar above grid
<div class="grid-toolbar">
    <label>Detail Level:</label>
    <select id="detail-level-select">
        <option value="name1">Category</option>
        <option value="name2">Subcategory</option>
    </select>
</div>

// Handle change
document.getElementById('detail-level-select').addEventListener('change', (e) => {
    const level = e.target.value;

    if (level === 'name1') {
        // Show only category totals
        this.gridApi.setRowData(this.getCategoryTotals());
    } else {
        // Show detailed rows
        this.gridApi.setRowData(this.getDetailedRows());
    }
});
```

**Deliverable:** Period filtering and detail level toggle working

---

### Phase 4: Income Statement & Cash Flow (Day 3 - 4 hours)

#### 4.1 Statement-Specific Configurations
```javascript
getColumnDefs(statementType, year1, year2) {
    const baseColumns = this.getBaseColumns(year1, year2);

    switch(statementType) {
        case 'balance-sheet':
            return this.enhanceForBalanceSheet(baseColumns);

        case 'income-statement':
            return this.enhanceForIncome(baseColumns);

        case 'cash-flow':
            // Cash flow only shows year2 column
            return baseColumns.filter(col =>
                col.field !== 'amount_2024' && col.field !== 'variance_percent'
            );

        default:
            return baseColumns;
    }
}
```

#### 4.2 Statement-Specific Row Insertion
```javascript
prepareStatementData(statementData, statementType) {
    let data = statementData.details.objects();

    switch(statementType) {
        case 'income-statement':
            // Insert Gross Profit after COGS
            data = this.insertMetric(data, 'kostprijs', {
                name2: 'Brutowinst (Gross Profit)',
                amount_2024: statementData.metrics.grossProfit['2024'],
                amount_2025: statementData.metrics.grossProfit['2025'],
                _rowType: 'metric'
            });

            // Insert Operating Income after operating expenses
            data = this.insertMetric(data, 'personeelskosten', {
                name2: 'Operating Income',
                amount_2024: statementData.metrics.operatingIncome['2024'],
                amount_2025: statementData.metrics.operatingIncome['2025'],
                _rowType: 'metric'
            });
            break;

        case 'cash-flow':
            // Add cash reconciliation at bottom
            data = this.appendCashReconciliation(data, statementData.metrics);
            break;
    }

    return data;
}
```

**Deliverable:** All three statements render correctly

---

### Phase 5: Excel Export (Day 3 - 2 hours)

#### 5.1 Built-in Excel Export
```javascript
exportToExcel() {
    const params = {
        fileName: `financial_statements_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: this.currentStatementType,

        // Custom formatting
        processCellCallback: (params) => {
            // Apply bold to totals
            if (params.node.data._rowType === 'total') {
                return {
                    value: params.value,
                    styleId: 'boldStyle'
                };
            }
            return params.value;
        },

        // Excel styles
        excelStyles: [
            {
                id: 'boldStyle',
                font: { bold: true }
            },
            {
                id: 'header',
                interior: {
                    color: '#4472C4',
                    pattern: 'Solid'
                },
                font: {
                    color: '#FFFFFF',
                    bold: true
                }
            }
        ]
    };

    this.gridApi.exportDataAsExcel(params);
}

// Replace old export button handler
document.getElementById('export-all').addEventListener('click', () => {
    this.agGridRenderer.exportToExcel();
});
```

**What to Remove:**
- ❌ Entire `ExportHandler` class (180 lines)
- ❌ ExcelJS dependency

**Deliverable:** Excel export works with formatting

---

### Phase 6: Styling & Polish (Day 4 - 4 hours)

#### 6.1 Custom CSS
```css
/* ag-Grid theme customization */
.ag-theme-alpine {
    --ag-header-background-color: #2c5282;
    --ag-header-foreground-color: white;
    --ag-odd-row-background-color: #f7fafc;
    --ag-border-color: #e2e8f0;
}

/* Custom row styling */
.ag-row.total-row {
    font-weight: bold;
    border-top: 2px solid #2c5282;
    border-bottom: 2px solid #2c5282;
    background-color: #edf2f7 !important;
}

.ag-row.metric-row {
    font-weight: 600;
    background-color: #f0f4f8 !important;
    font-style: italic;
}

.ag-row.group-row {
    background-color: #e6f2ff !important;
    font-weight: 600;
}

/* Cell styling */
.number-cell {
    text-align: right;
    font-family: 'Courier New', monospace;
}

.detail-cell {
    padding-left: 20px;
}

/* Variance colors */
.positive-variance {
    color: #28a745;
}

.negative-variance {
    color: #dc3545;
}
```

#### 6.2 Row Styling Function
```javascript
getRowClass(params) {
    if (!params.data) return '';

    const rowType = params.data._rowType;

    switch(rowType) {
        case 'total': return 'total-row';
        case 'metric': return 'metric-row';
        case 'detail': return 'detail-row';
        default: return params.node.group ? 'group-row' : '';
    }
}
```

#### 6.3 Responsive Design
```javascript
onGridSizeChanged(params) {
    // Auto-size columns to fit container
    params.api.sizeColumnsToFit();
}

// In gridOptions
gridOptions.onGridSizeChanged = this.onGridSizeChanged;
```

**Deliverable:** Grid matches current visual design

---

### Phase 7: Migration & Cleanup (Day 4-5 - 4 hours)

#### 7.1 Remove Old Code

**Files/Classes to Delete:**
```javascript
// ❌ Remove these functions from InteractiveUI class
- renderStatement() // 384 lines
- renderTableRow() // 14 lines
- renderPeriodDropdown() // 28 lines
- formatNumber() // 38 lines
- enableTooltips() // 70 lines
- showTooltip() // 30 lines
- hideTooltip() // 10 lines

// ❌ Remove entire class
- class ExportHandler // 180 lines

// ❌ Remove event listeners
- Period dropdown listeners // ~50 lines
- Variance dropdown listeners // ~50 lines
- Detail level listeners // ~30 lines
```

**Dependencies to Remove:**
```html
<!-- ❌ Remove ExcelJS (if only used for export) -->
<script src="https://cdn.jsdelivr.net/npm/exceljs@4/dist/exceljs.min.js"></script>
```

**Total Removed: ~750-850 lines**

#### 7.2 Update UIController
```javascript
class UIController {
    constructor() {
        this.dataStore = new DataStore();
        this.dataLoader = new DataLoader(this.dataStore);
        this.statementGenerator = new StatementGenerator(this.dataStore);

        // ✅ New: ag-Grid renderer instead of InteractiveUI
        this.gridRenderer = new AgGridStatementRenderer('ag-grid-container');

        // ❌ Old: this.interactiveUI = new InteractiveUI();
        // ❌ Old: this.exportHandler = new ExportHandler();
    }

    generateAndDisplayStatement(statementType) {
        // Get data (unchanged)
        const statementData = this.statementGenerator.generateBalanceSheet(periodOptions);

        // ✅ New: Render with ag-Grid
        this.gridRenderer.render(statementData, statementType);

        // ❌ Old: this.interactiveUI.renderStatement(statementData, statementType, 'statement-display');
    }
}
```

#### 7.3 Testing Checklist
- [ ] Balance Sheet displays with correct grouping
- [ ] Income Statement shows inline metrics (Gross Profit, Operating Income, Net Income)
- [ ] Cash Flow shows only 2025 column
- [ ] Period filtering works for all statements
- [ ] Detail level toggle (Category vs Subcategory) works
- [ ] Variance columns calculate correctly
- [ ] Excel export includes all data with formatting
- [ ] Responsive design (resize browser window)
- [ ] All keyboard navigation works
- [ ] Column resizing, reordering works
- [ ] Sorting works on all columns
- [ ] Number formatting matches current design

**Deliverable:** Migration complete, all tests passing

---

## Code Size Comparison

### Before Migration
```
Total Lines: 3,401
  - renderStatement: 384
  - renderTableRow: 14
  - renderPeriodDropdown: 28
  - formatNumber + utilities: 38
  - ExportHandler: 180
  - Event listeners: 100
  - Tooltips: 70
  - Column management: 50
```

### After Migration
```
Total Lines: ~2,650-2,850 (reduction of 500-650 lines)
  + ag-Grid dependencies: 3 lines
  + AgGridStatementRenderer class: 180-280 lines
  + Column definitions: 80-100 lines
  + Custom renderers: 50-80 lines
  + Grid configuration: 30-50 lines

  - All rendering logic: -384 lines
  - ExportHandler: -180 lines
  - Event management: -100 lines
  - All other removed code: -486 lines
```

**Net Reduction: 15-19%**

---

## Risk Mitigation

### Risk 1: Browser Compatibility
**Risk:** ag-Grid may not work in older browsers
**Mitigation:** ag-Grid supports all modern browsers. Same compatibility as current code (File System Access API required)
**Impact:** Low

### Risk 2: Learning Curve
**Risk:** Team unfamiliar with ag-Grid API
**Mitigation:** Excellent documentation, active community, similar concepts to current code
**Impact:** Medium (1-2 days learning time)

### Risk 3: Custom Metric Insertion
**Risk:** Inserting "Total Assets", "Net Income" between data rows may be complex
**Mitigation:** Multiple approaches available:
1. Add as special data rows with `_rowType` flag
2. Use `pinnedTopRowData` / `pinnedBottomRowData`
3. Use row grouping with custom group footer
**Impact:** Low

### Risk 4: Period Filtering
**Risk:** Custom header dropdowns may be complex
**Mitigation:** ag-Grid has built-in header component framework. Can also use toolbar above grid
**Impact:** Low

### Risk 5: File Size Increase
**Risk:** ag-Grid adds ~150KB
**Mitigation:** Remove ExcelJS (-100KB). Net increase +50KB (~3%). Enable gzip compression
**Impact:** Low

### Risk 6: Feature Parity
**Risk:** Missing a current feature
**Mitigation:** Detailed feature mapping in Phase 7 testing checklist. All current features are possible in ag-Grid
**Impact:** Low

---

## Feature Roadmap Unlocked

Once migration is complete, these features become **trivial** to add:

### Immediate (0-1 hour each):
- ✅ Column resizing, reordering, pinning
- ✅ Sorting (single and multi-column)
- ✅ Advanced filtering (text, number, date)
- ✅ Copy/paste to Excel
- ✅ Keyboard navigation
- ✅ CSV export

### Short-term (2-4 hours each):
- ✅ Cost Center drill-down (Master/Detail feature)
- ✅ 3rd year column (just add to columnDefs)
- ✅ Multiple variance columns
- ✅ Conditional formatting rules
- ✅ Chart integration
- ✅ Save/load grid state (column positions, filters)

### Medium-term (1-2 days):
- ✅ Budget vs Actual comparison
- ✅ Forecast scenarios
- ✅ Commenting on cells
- ✅ Historical trend sparklines
- ✅ Custom context menus

---

## Timeline & Effort

### Conservative Estimate (with buffer)
- **Day 1:** Setup + Basic Balance Sheet (8 hours)
- **Day 2:** Period Filtering + Headers (4 hours)
- **Day 3:** Income & Cash Flow + Export (6 hours)
- **Day 4:** Styling + Migration (8 hours)
- **Day 5:** Testing + Refinement (4 hours)

**Total: 30 hours (3.75 days)**

### Optimistic Estimate
- **Day 1-2:** Core implementation (12 hours)
- **Day 3:** All statements + export (6 hours)
- **Day 4:** Polish + testing (4 hours)

**Total: 22 hours (2.75 days)**

### Recommendation
**Plan for 4 days, aim for 3 days**

---

## Success Metrics

### Functional Requirements
- [ ] All 3 statements display correctly
- [ ] Period filtering works
- [ ] Detail level toggle works
- [ ] Variance calculations correct
- [ ] Excel export includes all data
- [ ] Visual design matches current app

### Non-Functional Requirements
- [ ] Code reduced by 15-19% (500-650 lines)
- [ ] No performance degradation
- [ ] Remains single HTML file
- [ ] File size < 3.5MB total
- [ ] All tests passing

### Quality Metrics
- [ ] No console errors
- [ ] Passes accessibility audit
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Mobile-responsive (if needed)

---

## Migration Approach

### Option A: Big Bang (Recommended)
Replace entire rendering system in one PR. Faster, cleaner, less confusion.

**Pros:**
- Single cutover point
- Less code duplication
- Faster completion

**Cons:**
- Higher risk if issues found
- Need full testing before merge

### Option B: Parallel Implementation
Keep old code, add ag-Grid alongside, feature flag to toggle.

**Pros:**
- Easy rollback
- Can compare side-by-side
- Lower risk

**Cons:**
- Temporary code bloat
- More complex testing
- Slower overall

**Recommendation: Option A** (Big Bang) - the current codebase is small enough that this is safe.

---

## Post-Migration Tasks

### Immediate (Day 5)
- [ ] Update documentation
- [ ] Create user guide for new features (sorting, filtering)
- [ ] Performance benchmark comparison
- [ ] Commit to git with detailed commit message

### Short-term (Week 2)
- [ ] Gather user feedback
- [ ] Add keyboard shortcuts guide
- [ ] Optimize column widths
- [ ] Add more variance column options

### Long-term (Month 2)
- [ ] Implement cost center drill-down
- [ ] Add 3rd year support
- [ ] Create dashboard view
- [ ] Add chart visualizations

---

## Decision Points

### Before Starting
- ✅ Confirm ag-Grid Community Edition is sufficient (yes, all needed features are free)
- ✅ Verify browser support requirements
- ✅ Backup current working version
- ✅ Review this plan with team

### During Migration
- **End of Day 1:** Does basic Balance Sheet work? (Go/No-Go decision)
- **End of Day 2:** Are all statements displaying? (Continue/Pivot decision)
- **End of Day 3:** Is Excel export working? (Feature complete check)

### After Migration
- **Day 5:** Production ready? (Merge/Hold decision)
- **Week 2:** User acceptance? (Keep/Rollback decision)

---

## Appendix A: ag-Grid Community vs Enterprise

We only need **Community Edition** (free, MIT license):

### Community Features (Free) ✅
- Row grouping
- Tree data
- Aggregation
- Custom cell renderers
- Excel/CSV export
- Column management
- Sorting & filtering
- Custom headers

### Enterprise Features (Paid) ❌ Not Needed
- Advanced filtering UI
- Range selection
- Clipboard (copy ranges)
- Master/Detail (cost centers - but workaround exists)
- Row grouping panel
- Status bar
- Integrated charts

**Verdict:** Community Edition sufficient. Can upgrade later if needed.

---

## Appendix B: Alternative Libraries Considered

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **ag-Grid** | Best-in-class, free tier, huge community | Learning curve | ✅ **Recommended** |
| **Perspective** | Blazing fast, great for exploration | Overkill for fixed reports | ❌ Too complex |
| **Tabulator** | Simpler API, lightweight | Less features, smaller community | ❌ Limited features |
| **Handsontable** | Excel-like, familiar | Limited grouping, paid tier needed | ❌ Not ideal for hierarchy |
| **DataTables** | jQuery-based, simple | Old tech, poor tree data support | ❌ Outdated |

---

## Appendix C: Quick Reference

### Key ag-Grid Concepts

```javascript
// 1. Column Definitions (what to display)
columnDefs: [
  { field: 'name', headerName: 'Item' },  // Simple column
  { field: 'amount', type: 'numericColumn' }  // Number column
]

// 2. Row Data (what data to show)
rowData: [
  { name: 'Item 1', amount: 100 },
  { name: 'Item 2', amount: 200 }
]

// 3. Grid Options (how to behave)
gridOptions: {
  columnDefs: [...],
  rowData: [...],
  groupDefaultExpanded: 1,  // Expand first level
  aggFuncs: { sum: ... }    // Custom aggregation
}

// 4. Grid API (programmatic control)
gridApi.setRowData(newData);  // Update data
gridApi.exportDataAsExcel();  // Export
columnApi.setColumnsVisible(['col1'], false);  // Hide column
```

### Common Patterns

```javascript
// Pattern 1: Value Formatting
valueFormatter: params => formatCurrency(params.value)

// Pattern 2: Custom Rendering
cellRenderer: params => `<span class="custom">${params.value}</span>`

// Pattern 3: Conditional Styling
cellClass: params => params.value > 0 ? 'positive' : 'negative'

// Pattern 4: Aggregation
aggFunc: params => params.values.reduce((a, b) => a + b, 0)

// Pattern 5: Row Grouping
{ field: 'category', rowGroup: true, hide: true }
```

---

## Conclusion

This migration will:
- ✅ **Reduce code by 500-650 lines** (15-19%)
- ✅ **Improve maintainability** (declarative config vs imperative rendering)
- ✅ **Add features for free** (sorting, filtering, grouping, export)
- ✅ **Future-proof the application** (cost centers, more years trivial to add)
- ✅ **Maintain single-file architecture** (remains `index.html`)

**Estimated Time:** 3-5 days
**Risk Level:** Low-Medium
**Recommended Approach:** Big Bang migration

**Next Steps:**
1. Review this plan
2. Create backup branch
3. Start Phase 1: Setup & Infrastructure
4. Proceed phase by phase with testing after each

---

**Document Version:** 1.0
**Last Updated:** 2025-01-22
**Author:** Claude Code Assistant
**Status:** Ready for Review
