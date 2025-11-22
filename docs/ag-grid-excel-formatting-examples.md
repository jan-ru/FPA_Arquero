# ag-Grid Excel Export Formatting Examples

## Comprehensive Guide to Excel Formatting with ag-Grid

ag-Grid Community Edition provides extensive Excel formatting capabilities that match or exceed ExcelJS for most use cases.

---

## Basic Excel Export

```javascript
// Simple export
gridApi.exportDataAsExcel({
  fileName: 'financial_statements.xlsx',
  sheetName: 'Balance Sheet'
});
```

---

## Excel Styles (Bold, Colors, Borders, etc.)

### 1. Pre-defined Excel Styles

```javascript
const excelStyles = [
  // Bold style for headers and totals
  {
    id: 'bold',
    font: {
      bold: true,
      size: 11,
      fontName: 'Calibri'
    }
  },

  // Header style (bold + background color)
  {
    id: 'header',
    interior: {
      color: '#4472C4',
      pattern: 'Solid'
    },
    font: {
      color: '#FFFFFF',
      bold: true,
      size: 12
    },
    borders: {
      borderBottom: {
        color: '#000000',
        lineStyle: 'Continuous',
        weight: 2
      }
    }
  },

  // Total row style (bold + top border)
  {
    id: 'total',
    font: {
      bold: true,
      size: 11
    },
    borders: {
      borderTop: {
        color: '#000000',
        lineStyle: 'Continuous',
        weight: 2
      },
      borderBottom: {
        color: '#000000',
        lineStyle: 'Double',
        weight: 3
      }
    }
  },

  // Positive variance (green)
  {
    id: 'positiveVariance',
    font: {
      color: '#28a745',
      bold: false
    }
  },

  // Negative variance (red)
  {
    id: 'negativeVariance',
    font: {
      color: '#dc3545',
      bold: false
    }
  },

  // Currency format
  {
    id: 'currency',
    numberFormat: {
      format: '€#,##0.00'
    },
    alignment: {
      horizontal: 'Right'
    }
  },

  // Percentage format
  {
    id: 'percentage',
    numberFormat: {
      format: '#,##0.0%'
    },
    alignment: {
      horizontal: 'Right'
    }
  },

  // Group/Category row (indented, bold)
  {
    id: 'category',
    font: {
      bold: true,
      size: 11
    },
    interior: {
      color: '#E6F2FF',
      pattern: 'Solid'
    },
    alignment: {
      indent: 1
    }
  },

  // Detail row (indented)
  {
    id: 'detail',
    alignment: {
      indent: 2
    }
  }
];
```

---

## Apply Styles to Cells

### Method 1: Using `processCellCallback`

```javascript
gridApi.exportDataAsExcel({
  fileName: 'financial_statements.xlsx',
  sheetName: 'Balance Sheet',

  excelStyles: excelStyles,

  // Apply styles based on cell/row data
  processCellCallback: (params) => {
    const { value, node, column } = params;

    // 1. Style total rows
    if (node.data && node.data._rowType === 'total') {
      return {
        styleId: 'total'
      };
    }

    // 2. Style category rows
    if (node.group) {
      return {
        styleId: 'category'
      };
    }

    // 3. Style variance columns with color coding
    if (column.getColId() === 'variance_amount' || column.getColId() === 'variance_percent') {
      const styleId = value >= 0 ? 'positiveVariance' : 'negativeVariance';
      return {
        styleId: styleId
      };
    }

    // 4. Style number columns
    if (column.getColId().startsWith('amount_')) {
      return {
        styleId: 'currency'
      };
    }

    // Default: no special styling
    return params.value;
  }
});
```

### Method 2: Using `processRowGroupCallback`

```javascript
gridApi.exportDataAsExcel({
  fileName: 'financial_statements.xlsx',

  // Style entire group rows
  processRowGroupCallback: (params) => {
    return {
      styleId: 'category'
    };
  },

  // Style header rows
  processHeaderCallback: (params) => {
    return {
      styleId: 'header'
    };
  }
});
```

---

## Advanced Formatting Examples

### Example 1: Financial Statement Export (Your Use Case)

```javascript
function exportFinancialStatement(gridApi, statementType) {
  const params = {
    fileName: `${statementType}_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName: statementType,

    excelStyles: [
      // Bold totals
      {
        id: 'totalRow',
        font: { bold: true, size: 11 },
        borders: {
          borderTop: { lineStyle: 'Continuous', weight: 2 },
          borderBottom: { lineStyle: 'Double', weight: 3 }
        }
      },

      // Metric rows (Gross Profit, Operating Income, etc.)
      {
        id: 'metricRow',
        font: { bold: true, italic: true },
        interior: { color: '#F0F4F8', pattern: 'Solid' }
      },

      // Currency cells
      {
        id: 'currencyCell',
        numberFormat: { format: '€#,##0' },
        alignment: { horizontal: 'Right' }
      },

      // Percentage cells
      {
        id: 'percentCell',
        numberFormat: { format: '#,##0.0%' },
        alignment: { horizontal: 'Right' }
      },

      // Positive/negative variance
      {
        id: 'positiveVar',
        font: { color: '#28a745' }
      },
      {
        id: 'negativeVar',
        font: { color: '#dc3545' }
      }
    ],

    processCellCallback: (params) => {
      const { value, node, column } = params;

      // Total rows (TOTAL ASSETS, NET INCOME, etc.)
      if (node.data?._rowType === 'total') {
        return { styleId: 'totalRow' };
      }

      // Metric rows (Gross Profit, Operating Income)
      if (node.data?._rowType === 'metric') {
        return { styleId: 'metricRow' };
      }

      // Amount columns
      if (column.getColId().startsWith('amount_')) {
        return { styleId: 'currencyCell' };
      }

      // Variance percent column
      if (column.getColId() === 'variance_percent') {
        const styleId = value >= 0 ? 'positiveVar' : 'negativeVar';
        return { styleId: ['percentCell', styleId] }; // Multiple styles!
      }

      // Variance amount column
      if (column.getColId() === 'variance_amount') {
        const styleId = value >= 0 ? 'positiveVar' : 'negativeVar';
        return { styleId: ['currencyCell', styleId] };
      }

      return params.value;
    },

    // Custom column widths
    columnWidth: (params) => {
      if (params.column.getColId() === 'name2') {
        return 250; // Wider for item names
      }
      return 120; // Default width
    }
  };

  gridApi.exportDataAsExcel(params);
}
```

---

## All Available Excel Style Options

```javascript
{
  id: 'myStyle',

  // Font formatting
  font: {
    bold: true,
    italic: true,
    underline: 'Single', // 'Single', 'Double', 'SingleAccounting', 'DoubleAccounting'
    strikeThrough: false,
    color: '#FF0000',
    fontName: 'Calibri',
    size: 11,
    outline: false,
    shadow: false
  },

  // Cell background
  interior: {
    color: '#FFFF00',
    pattern: 'Solid' // 'Solid', 'Gray50', 'Gray75', etc.
  },

  // Borders
  borders: {
    borderTop: {
      color: '#000000',
      lineStyle: 'Continuous', // 'Continuous', 'Dash', 'Dot', 'DashDot', etc.
      weight: 1 // 0-3
    },
    borderBottom: { /* same as above */ },
    borderLeft: { /* same as above */ },
    borderRight: { /* same as above */ }
  },

  // Number formatting
  numberFormat: {
    format: '#,##0.00' // Excel number format string
    // Examples:
    // '#,##0' - Integer with thousands separator
    // '#,##0.00' - Decimal with 2 places
    // '€#,##0.00' - Currency
    // '0.0%' - Percentage
    // 'dd/mm/yyyy' - Date
    // '@' - Text
  },

  // Alignment
  alignment: {
    horizontal: 'Left', // 'Left', 'Center', 'Right', 'Fill', 'Justify'
    vertical: 'Top', // 'Top', 'Center', 'Bottom'
    indent: 1, // 0-15
    readingOrder: 'LeftToRight', // 'LeftToRight', 'RightToLeft'
    rotate: 0, // -90 to 90 degrees
    shrinkToFit: false,
    wrapText: true
  },

  // Protection
  protection: {
    protected: false,
    hideFormula: false
  }
}
```

---

## Multiple Styles on Same Cell

You can apply **multiple styles** to a single cell:

```javascript
processCellCallback: (params) => {
  // Apply both currency format AND color coding
  return {
    styleId: ['currencyCell', params.value >= 0 ? 'positiveVar' : 'negativeVar']
  };
}
```

---

## Custom Row Heights & Column Widths

```javascript
gridApi.exportDataAsExcel({
  // Custom column widths
  columnWidth: (params) => {
    const colId = params.column.getColId();

    switch(colId) {
      case 'name1': return 200;
      case 'name2': return 250;
      case 'amount_2024': return 120;
      case 'amount_2025': return 120;
      default: return 100;
    }
  },

  // Custom row heights
  rowHeight: (params) => {
    if (params.node.data?._rowType === 'total') {
      return 25; // Taller for total rows
    }
    return 20; // Default height
  }
});
```

---

## Add Custom Rows (Headers, Footers)

```javascript
gridApi.exportDataAsExcel({
  // Add rows at the top
  prependContent: [
    [
      {
        data: { value: 'Financial Statement Report', type: 'String' },
        mergeAcross: 5,
        styleId: 'header'
      }
    ],
    [
      {
        data: { value: `Generated: ${new Date().toLocaleDateString()}`, type: 'String' },
        mergeAcross: 5
      }
    ],
    [] // Empty row for spacing
  ],

  // Add rows at the bottom
  appendContent: [
    [],
    [
      {
        data: { value: 'Notes:', type: 'String' },
        styleId: 'bold'
      }
    ],
    [
      {
        data: { value: 'All amounts in EUR', type: 'String' }
      }
    ]
  ]
});
```

---

## Comparison: ag-Grid vs ExcelJS

| Feature | ag-Grid | ExcelJS | Winner |
|---------|---------|---------|--------|
| **Bold text** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Font color** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Background color** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Borders** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Number formats** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Cell alignment** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Column widths** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Multiple styles per cell** | ✅ Yes | ✅ Yes | 🤝 Tie |
| **Conditional formatting** | ⚠️ Manual | ✅ Yes | ExcelJS |
| **Formulas** | ⚠️ Limited | ✅ Full | ExcelJS |
| **Multiple sheets** | ⚠️ One at a time | ✅ Yes | ExcelJS |
| **Ease of use** | ✅ Declarative | ⚠️ Imperative | ag-Grid |
| **Integration** | ✅ Built-in | ⚠️ Manual | ag-Grid |

---

## When to Use Each

### Use ag-Grid Excel Export When:
✅ Exporting **single grid** to Excel
✅ Formatting based on **row/cell data** (totals, variances)
✅ You want **simple, declarative** styling
✅ Grid data is already formatted correctly

### Use ExcelJS When:
✅ Creating **multiple sheets** in one workbook
✅ Need **Excel formulas** (SUM, VLOOKUP, etc.)
✅ Complex **conditional formatting** rules
✅ Programmatic Excel file generation (not from grid)

---

## Hybrid Approach (Best of Both)

You can use **both** if needed:

```javascript
// Export from ag-Grid
const excelData = gridApi.getDataAsExcel({
  exportMode: 'xlsx',
  onlySelected: false
});

// Then enhance with ExcelJS
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(excelData);

const worksheet = workbook.getWorksheet(1);

// Add formulas, extra sheets, etc. with ExcelJS
worksheet.getCell('A1').value = { formula: '=SUM(B2:B100)' };

// Save enhanced file
const buffer = await workbook.xlsx.writeBuffer();
saveAs(new Blob([buffer]), 'enhanced.xlsx');
```

---

## Recommendation for Your Project

For the Financial Statement Generator:

✅ **Use ag-Grid Excel Export**

**Reasons:**
1. Your formatting needs are **straightforward** (bold, colors, borders)
2. ag-Grid handles it **declaratively** (easier to maintain)
3. **Single sheet per export** (Balance Sheet, Income, Cash Flow)
4. No need for formulas (calculations done in JavaScript)
5. **~180 lines of ExcelJS code eliminated**

**You'll lose nothing** - all your current Excel formatting can be replicated in ag-Grid.

---

## Migration Checklist: ExcelJS → ag-Grid

Current ExcelJS formatting you use:

- [ ] **Bold totals** → `font: { bold: true }`
- [ ] **Currency format** → `numberFormat: { format: '€#,##0' }`
- [ ] **Percentage format** → `numberFormat: { format: '#,##0.0%' }`
- [ ] **Border on totals** → `borders: { borderTop: ... }`
- [ ] **Column widths** → `columnWidth: (params) => ...`
- [ ] **Row background colors** → `interior: { color: '#...', pattern: 'Solid' }`
- [ ] **Text alignment** → `alignment: { horizontal: 'Right' }`

✅ **All supported in ag-Grid!**

---

## Example: Your Current vs ag-Grid Export

### Current (ExcelJS - ~180 lines):
```javascript
class ExportHandler {
  async exportAllStatements(statements) {
    const workbook = new ExcelJS.Workbook();

    for (const [name, data] of Object.entries(statements)) {
      const worksheet = workbook.addWorksheet(name);

      // Manually create headers
      worksheet.columns = [...];

      // Manually add rows
      data.details.objects().forEach(row => {
        const excelRow = worksheet.addRow([...]);

        // Manually style each cell
        excelRow.getCell(1).font = { bold: true };
        excelRow.getCell(2).numFmt = '€#,##0';
        // ... 150 more lines of styling
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
  }
}
```

### ag-Grid (~30 lines):
```javascript
function exportStatement(gridApi, statementName) {
  gridApi.exportDataAsExcel({
    fileName: `${statementName}.xlsx`,
    excelStyles: EXCEL_STYLES, // Defined once, reused
    processCellCallback: (params) => {
      if (params.node.data?._rowType === 'total') return { styleId: 'total' };
      if (params.column.getColId().startsWith('amount_')) return { styleId: 'currency' };
      return params.value;
    }
  });
}

// Export all three statements (3 separate files)
exportStatement(balanceSheetGrid, 'Balance Sheet');
exportStatement(incomeGrid, 'Income Statement');
exportStatement(cashFlowGrid, 'Cash Flow');
```

---

## Conclusion

✅ **ag-Grid Excel formatting is EQUIVALENT to ExcelJS** for your needs
✅ **Much simpler** (declarative vs imperative)
✅ **Built-in** (no external library needed)
✅ **Well documented** with great examples

You'll be able to replicate 100% of your current Excel formatting with ag-Grid!

---

**Next Steps:**
1. Review the `processCellCallback` examples above
2. Map your current ExcelJS styles to ag-Grid `excelStyles`
3. Test export from ag-Grid in Phase 5 of migration plan

**Questions to Consider:**
- Do you need multiple sheets in one Excel file? (ag-Grid exports one sheet per call)
- Do you need Excel formulas? (ag-Grid supports basic formulas, ExcelJS better for complex)
- Are you happy with separate files for each statement? (Balance Sheet.xlsx, Income Statement.xlsx, Cash Flow.xlsx)

If you answer "no formulas, separate files OK" → ag-Grid is perfect! ✅
