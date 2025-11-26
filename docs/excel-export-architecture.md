# Excel Export Architecture

## Overview

The Excel export system replaces the previous CSV export with a full-featured Excel export that preserves all formatting, colors, fonts, and styling from the ag-Grid display.

## Architecture

The system is built with 4 modular components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Excel Export System                      │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌────────────────────────┐          ┌────────────────────────┐
│   ag-grid-format.js    │          │   excel-format.js      │
│  (Grid Style Rules)    │◄─────────┤   (ExcelJS Mapping)    │
└────────────────────────┘          └────────────────────────┘
            │                                   │
            └─────────────┬─────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │ excel-export.js  │
                │  (Main Exporter) │
                └──────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │   ExcelJS API    │
                │  (Global CDN)    │
                └──────────────────┘
```

### 1. ag-grid-format.js

**Purpose**: Define styling rules based on ag-Grid display

**Functions**:
- `getCellStyle(params)` - Returns style object for a cell
- `getHeaderStyle(headerName, field)` - Returns style for headers
- `getRowHeight(rowType)` - Returns row height in points
- `getColumnWidth(field, headerName)` - Returns column width

**Style Categories**:
- Row types: `total`, `metric`, `group`, `detail`, `spacer`
- Cell types: category (label), amount, variance
- Value-based: positive (green), negative (red), zero

**Example Style Object**:
```javascript
{
    font: {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFDC3545' } // Red
    },
    fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' } // Light gray
    },
    alignment: {
        vertical: 'middle',
        horizontal: 'right',
        indent: 2
    },
    border: {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } }
    },
    numFmt: '#,##0.00;[Red]-#,##0.00' // Number format
}
```

### 2. excel-format.js

**Purpose**: Convert ag-grid styles to ExcelJS format

**Functions**:
- `applyCellStyle(cell, style)` - Apply style to ExcelJS cell
- `applyHeaderStyle(cell, headerStyle)` - Apply header style
- `setColumnWidth(column, width)` - Set column width
- `setRowHeight(row, height)` - Set row height
- `freezePanes(worksheet, row, col)` - Freeze header/category
- `applyAutoFilter(worksheet, ...)` - Enable filtering
- `addMetadata(workbook, title, author)` - Document properties
- `addPrintSettings(worksheet)` - A4 landscape optimized
- `addHeaderFooter(worksheet, title, subtitle)` - Print headers

**Key Features**:
- Maps internal style format to ExcelJS API
- Handles print optimization
- Manages freeze panes and auto-filters
- Adds document metadata

### 3. excel-export.js

**Purpose**: Main export orchestrator

**Class**: `ExcelExporter`
- `exportToExcel(gridApi, columnDefs, name, options)` - Main export
- `exportLTMToExcel(gridApi, columnDefs, name, ltmInfo)` - LTM export
- `exportMultipleStatements(statements, name)` - Multi-sheet export

**Export Flow**:
1. Create workbook and worksheet
2. Extract data from grid API
3. Write headers with styling
4. Write data rows with cell-specific styling
5. Apply formatting (freeze, filter, print settings)
6. Generate Excel buffer
7. Download as .xlsx file

**Convenience Functions**:
```javascript
import { exportGridToExcel, exportLTMGridToExcel } from './excel-export.js';

// Normal export
await exportGridToExcel(gridApi, columnDefs, 'Balance Sheet', {
    title: 'Balance Sheet',
    subtitle: '2025 P10'
});

// LTM export
await exportLTMGridToExcel(gridApi, columnDefs, 'Income Statement', ltmInfo);
```

### 4. Integration with AgGridStatementRenderer

**Modified**: `src/ui/AgGridStatementRenderer.js`

```javascript
// Import Excel export
import { exportGridToExcel, exportLTMGridToExcel } from '../export/excel-export.js';

// Updated exportToExcel method
async exportToExcel(statementName) {
    const columnDefs = this.gridApi.getColumnDefs();
    const isLTM = this.currentStatementData?.isLTMMode;
    const ltmInfo = this.currentStatementData?.ltmInfo;

    if (isLTM && ltmInfo) {
        await exportLTMGridToExcel(this.gridApi, columnDefs, statementName, ltmInfo);
    } else {
        await exportGridToExcel(this.gridApi, columnDefs, statementName, options);
    }
}
```

## Styling Rules

### Row Type Styling

| Row Type | Font Weight | Font Size | Background | Border |
|----------|-------------|-----------|------------|--------|
| `total` | Bold | 11pt | Light Gray (#F0F0F0) | Top: Medium, Bottom: Double |
| `metric` | Bold | 11pt | Very Light Gray (#F8F9FA) | Top/Bottom: Thin Gray |
| `group` | Bold | 11pt | Off-White (#FAFAFA) | Standard |
| `detail` | Normal | 11pt | White | Standard |
| `spacer` | Normal | 11pt | White | None |

### Column Type Styling

| Column Type | Alignment | Number Format | Color Rules |
|-------------|-----------|---------------|-------------|
| `label` (Category) | Left + Indent | Text | Bold for totals/groups |
| `amount_*`, `month_*` | Right | `#,##0.00;[Red]-#,##0.00` | Red for negative |
| `variance_amount` | Right | `#,##0.00;[Red]-#,##0.00` | Green (+), Red (-) |
| `variance_percent` | Right | `0.0"%"` | Green (+), Red (-) |

### Color Palette

```javascript
// Excel ARGB format (Alpha + RGB hex)
const COLORS = {
    header: 'FF4472C4',      // Blue
    headerText: 'FFFFFFFF',  // White
    totalBg: 'FFF0F0F0',     // Light gray
    metricBg: 'FFF8F9FA',    // Very light gray
    groupBg: 'FFFAFAFA',     // Off-white
    positive: 'FF28A745',    // Green
    negative: 'FFDC3545',    // Red
    borderLight: 'FFE0E0E0', // Light gray border
    borderMedium: 'FF666666' // Medium gray border
};
```

## Features

### ✅ Implemented Features

1. **Formatting Preservation**
   - All grid colors and fonts preserved
   - Row type styling (totals, metrics, groups)
   - Number formatting with negative values in red
   - Variance colors (green for positive, red for negative)

2. **Excel Features**
   - Freeze panes (header row + category column)
   - Auto-filter on header row
   - Optimized for A4 landscape printing
   - Proper column widths
   - Row heights matching grid

3. **LTM Support**
   - Exports all 12 month columns
   - Includes LTM Total column for Income Statement
   - LTM label in subtitle

4. **Print Optimization**
   - A4 landscape orientation
   - Fit to width, unlimited height
   - Repeating header row on each page
   - Page numbers in footer
   - Generation date in footer

5. **Document Properties**
   - Title, author, created date
   - Keywords and category
   - Description with generation date

### 🚧 Future Enhancements

1. **Multi-Statement Export**
   - Export all statements to one workbook
   - Each statement on separate tab
   - Using `exportMultipleStatementsToExcel()`

2. **Template Support**
   - Load formatting from report-template.xlsx
   - Apply custom company branding
   - Predefined layouts

3. **Chart Generation**
   - Add Excel charts for key metrics
   - Trend analysis charts
   - Variance visualization

4. **Conditional Formatting**
   - Data bars for amounts
   - Color scales for variances
   - Icon sets for trends

## File Locations

```
src/export/
├── ag-grid-format.js      # Grid styling rules (237 lines)
├── excel-format.js        # ExcelJS mapping (265 lines)
├── excel-export.js        # Main exporter (227 lines)
└── ExportHandler.js       # DEPRECATED - Old ExcelJS export
```

## Usage Examples

### Basic Export
```javascript
// In UIController or AgGridStatementRenderer
import { exportGridToExcel } from '../export/excel-export.js';

async function handleExport() {
    const gridApi = this.gridApi;
    const columnDefs = gridApi.getColumnDefs();

    await exportGridToExcel(gridApi, columnDefs, 'Balance Sheet', {
        title: 'Balance Sheet',
        subtitle: '2025 Period 10'
    });
}
```

### LTM Export
```javascript
import { exportLTMGridToExcel } from '../export/excel-export.js';

async function handleLTMExport() {
    const ltmInfo = {
        label: 'LTM (2024 P11 - 2025 P10)',
        ranges: [
            { year: 2024, startPeriod: 11, endPeriod: 12 },
            { year: 2025, startPeriod: 1, endPeriod: 10 }
        ]
    };

    await exportLTMGridToExcel(gridApi, columnDefs, 'Income Statement', ltmInfo);
}
```

### Multi-Statement Export (Future)
```javascript
import { exportMultipleStatementsToExcel } from '../export/excel-export.js';

async function handleExportAll() {
    const statements = [
        { gridApi: balanceSheetApi, columnDefs: bsCols, name: 'Balance Sheet' },
        { gridApi: incomeStatementApi, columnDefs: isCols, name: 'Income Statement' },
        { gridApi: cashFlowApi, columnDefs: cfCols, name: 'Cash Flow' }
    ];

    await exportMultipleStatementsToExcel(statements, 'Financial Statements');
}
```

## Testing

### Manual Testing Checklist

- [ ] Normal mode export (2 columns)
- [ ] LTM mode export (12-13 columns)
- [ ] Balance Sheet export
- [ ] Income Statement export
- [ ] Cash Flow Statement export
- [ ] Verify formatting in Excel:
  - [ ] Header row (blue background, white text)
  - [ ] Total rows (bold, gray background, double border)
  - [ ] Metric rows (bold, light background)
  - [ ] Negative amounts (red color)
  - [ ] Variance colors (green/red)
  - [ ] Number formatting
  - [ ] Column widths
  - [ ] Freeze panes
  - [ ] Auto-filter
- [ ] Print preview (A4 landscape)
- [ ] Footer with date and page numbers

### Browser Compatibility

- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Safari 14+
- ✅ Firefox 78+

**Requirements**:
- ExcelJS library loaded from CDN
- File download capability
- Blob/ArrayBuffer support

## Performance

### Benchmarks (estimated)

| Dataset Size | Rows | Columns | Export Time | File Size |
|--------------|------|---------|-------------|-----------|
| Small | 50 | 3 | <1s | ~15 KB |
| Medium | 200 | 5 | 1-2s | ~30 KB |
| Large | 500 | 5 | 2-3s | ~50 KB |
| LTM (12 cols) | 200 | 13 | 2-4s | ~60 KB |

### Optimization Opportunities

1. **Lazy formatting** - Apply styles only to visible rows
2. **Worker threads** - Generate Excel in background worker
3. **Caching** - Cache formatted cells for similar rows
4. **Streaming** - Stream large datasets instead of buffering

## Troubleshooting

### Common Issues

**Problem**: "ExcelJS is not defined"
**Solution**: Ensure ExcelJS CDN is loaded in index.html:
```html
<script src="https://cdn.jsdelivr.net/npm/exceljs@latest/dist/exceljs.min.js"></script>
```

**Problem**: Export button does nothing
**Solution**: Check browser console for errors. Ensure gridApi is initialized.

**Problem**: Formatting not applied
**Solution**: Verify ag-grid-format.js is returning valid style objects.

**Problem**: Download doesn't start
**Solution**: Check browser popup blocker settings.

## Migration from CSV Export

### Before (CSV)
```javascript
exportToExcel(statementName) {
    const params = { fileName: `${statementName}_${timestamp}.csv` };
    this.gridApi.exportDataAsCsv(params);
}
```

### After (Excel)
```javascript
async exportToExcel(statementName) {
    const columnDefs = this.gridApi.getColumnDefs();
    await exportGridToExcel(this.gridApi, columnDefs, statementName, {
        title: statementName,
        subtitle: new Date().toLocaleDateString()
    });
}
```

### Key Differences

| Feature | CSV Export | Excel Export |
|---------|-----------|--------------|
| **Format** | Plain text | Binary (OpenXML) |
| **Formatting** | None | Full (colors, fonts, borders) |
| **File Size** | Smaller (~10 KB) | Larger (~30-60 KB) |
| **Excel Features** | None | Freeze panes, filters, print settings |
| **Export Time** | <1s | 1-4s |
| **Library** | ag-Grid built-in | ExcelJS |
| **Browser Compatibility** | All browsers | Modern browsers |

## Conclusion

The new Excel export system provides:
- ✅ Full formatting preservation from grid to Excel
- ✅ Professional-looking exports suitable for reporting
- ✅ LTM support with all 12 month columns
- ✅ Print-optimized output
- ✅ Modular, maintainable architecture
- ✅ Easy to extend with new features

The 4-module architecture keeps concerns separated and makes it easy to:
- Modify styling rules (ag-grid-format.js)
- Add Excel features (excel-format.js)
- Extend export functionality (excel-export.js)
- Integrate with other components
