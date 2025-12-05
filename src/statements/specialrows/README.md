# ⚠️ DEPRECATED: Special Rows System

**Status:** Deprecated as of Phase 2 cleanup  
**Removal:** Scheduled for next major version

## Why Deprecated?

The SpecialRows system was used to insert calculated rows (totals, subtotals, metrics) into financial statements after data generation. This approach had several issues:

1. **Hardcoded Logic:** Each statement type had its own hardcoded insertion logic
2. **Difficult to Maintain:** Changes required modifying multiple files
3. **Not Configurable:** Users couldn't customize calculated rows without code changes
4. **Duplicate Logic:** Similar calculations repeated across different statement types

## Replacement

All functionality has been moved to the **Configurable Report System** using report definitions:

- **Calculated Rows:** Use `type: 'calculated'` layout items with expressions
- **Subtotals:** Use `type: 'subtotal'` layout items with from/to ranges
- **Metrics:** Define as calculated variables or layout items
- **Spacers:** Use `type: 'spacer'` layout items

### Example Migration

**Old (SpecialRows):**
```javascript
// Hardcoded in BalanceSheetSpecialRows.js
const totalAssets = calculateTotalAssets(data);
result.splice(insertIndex, 0, {
    label: 'Totaal activa',
    amount_2024: totalAssets[2024],
    amount_2025: totalAssets[2025],
    _isMetric: true
});
```

**New (Report Definition):**
```json
{
    "order": 400,
    "label": "Totaal activa",
    "type": "calculated",
    "expression": "fixed_assets + current_assets",
    "format": "currency",
    "style": "total"
}
```

## Files in This Directory

- `SpecialRowsFactory.js` - Factory for creating statement-specific handlers
- `BalanceSheetSpecialRows.js` - Balance sheet totals (Totaal activa, Totaal passiva)
- `IncomeStatementSpecialRows.js` - Income statement metrics (Bruto marge, etc.)
- `CashFlowStatementSpecialRows.js` - Cash flow reconciliation rows

## Migration Guide

If you have custom code using this system:

1. Create a report definition JSON file
2. Define calculated rows using `type: 'calculated'` with expressions
3. Define subtotals using `type: 'subtotal'` with from/to ranges
4. Load the report definition using `ReportRegistry`
5. Generate statements using `StatementGenerator.generateStatementFromDefinition()`

See `docs/REPORT_DEFINITIONS.md` for complete documentation.

## Removal Timeline

- **Phase 1 (Complete):** Deprecation warnings added
- **Phase 2 (Complete):** Removed from AgGridStatementRenderer
- **Phase 3 (Planned):** Complete removal of files

## Questions?

See the main documentation or check the report definition examples in `reports/definitions/`.
