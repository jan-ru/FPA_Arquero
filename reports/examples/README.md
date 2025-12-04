# Example Report Definitions

This directory contains example report definitions that demonstrate various features and use cases of the configurable report system.

## Available Examples

### Income Statements

#### 1. `income_simple.json` - Simple Income Statement
**Purpose**: Minimal example for beginners  
**Complexity**: ⭐ Basic  
**Features**:
- Basic revenue and expense variables
- Simple calculated net income
- Minimal layout with spacers
- Perfect starting point for learning

**Use Case**: Small businesses or quick analysis where you only need to see total revenue, total expenses, and net income.

---

#### 2. `income_detailed_nl.json` - Detailed Dutch Income Statement
**Purpose**: Comprehensive P&L following Dutch GAAP  
**Complexity**: ⭐⭐⭐ Advanced  
**Features**:
- Detailed revenue breakdown (products, services, other)
- Cost of goods sold with subcategories (materials, production, subcontracting)
- Personnel costs breakdown (salaries, social costs)
- Operating expenses by category (depreciation, rent, marketing, IT)
- Financial income and expenses breakdown
- Multiple subtotals and calculated metrics
- Extensive use of indentation for hierarchy

**Use Case**: Dutch companies requiring detailed financial reporting with comprehensive cost breakdowns following local GAAP standards.

---

#### 3. `income_ifrs.json` - IFRS Income Statement
**Purpose**: International reporting following IFRS standards  
**Complexity**: ⭐⭐ Intermediate  
**Features**:
- IFRS-compliant classifications
- Standard IFRS sections (Revenue, Cost of sales, Distribution, Administrative, R&D)
- Finance income and costs
- Share of profit from associates (IAS 28)
- References to specific IFRS/IAS standards in descriptions
- Operating profit (EBIT) calculation

**Use Case**: International companies or those preparing IFRS-compliant financial statements.

---

### Balance Sheets

#### 4. `balance_sheet_nl.json` - Dutch Balance Sheet
**Purpose**: Detailed balance sheet following Dutch GAAP  
**Complexity**: ⭐⭐⭐ Advanced  
**Features**:
- Fixed assets breakdown (intangible, tangible, financial)
- Current assets (inventory, receivables, securities, cash)
- Equity components (share capital, reserves, retained earnings)
- Provisions
- Long-term liabilities (debt, deferred tax, other)
- Current liabilities (debt, payables, tax, other)
- Proper Dutch terminology
- Balanced structure (Assets = Liabilities + Equity)

**Use Case**: Dutch companies requiring detailed balance sheet reporting following local GAAP.

---

#### 5. `balance_sheet_ifrs.json` - IFRS Statement of Financial Position
**Purpose**: International balance sheet following IFRS  
**Complexity**: ⭐⭐⭐ Advanced  
**Features**:
- IFRS-compliant classifications
- Non-current assets (PPE, intangibles, investment property, associates)
- Current assets (inventories, receivables, contract assets, cash)
- Equity with non-controlling interests (IFRS 10)
- Non-current liabilities (borrowings, leases, provisions, deferred tax, employee benefits)
- Current liabilities (payables, contract liabilities, borrowings, leases, tax, provisions)
- References to specific IFRS/IAS standards
- Proper IFRS terminology

**Use Case**: International companies preparing IFRS-compliant statements of financial position.

---

## Key Features Demonstrated

### Variables
All examples show how to:
- Define variables with filters
- Use aggregate functions (sum, average, count, etc.)
- Add descriptions for documentation
- Filter by hierarchy codes (code1, code2, code3)

### Layout Items
Examples demonstrate all layout item types:
- **variable**: Display aggregated data from variables
- **calculated**: Compute values using expressions
- **category**: Direct filtering without variables
- **subtotal**: Sum ranges of other items
- **spacer**: Add blank rows for visual separation

### Expressions
Examples show:
- Simple arithmetic (`revenue + cogs`)
- Order references (`@140 + @240`)
- Variable references (`revenue + expenses`)
- Complex calculations with multiple terms

### Formatting
All examples include:
- Currency formatting with thousands separators
- Percent formatting
- Proper decimal places
- Consistent styling (normal, metric, subtotal, total)

### Indentation
Examples demonstrate:
- Hierarchical structure with indent levels (0-3)
- Visual organization of related items
- Clear section grouping

### Comments
All examples include:
- Top-level `_comment` fields for documentation
- `_comment` fields in layout items explaining purpose
- Descriptive variable descriptions
- Clear section markers

## Validation

All example reports have been validated against the JSON schema and pass all validation checks:

```bash
deno run --allow-read test/scripts/validate_examples.ts
```

Expected output:
```
✅ Valid reports: 5/5
❌ Invalid reports: 0/5
🎉 All example reports are valid!
```

## Using These Examples

### As Templates
1. Copy an example file to `reports/` directory
2. Rename it (e.g., `income_custom.json`)
3. Modify the `reportId`, `name`, and `version`
4. Adjust variables and layout to your needs
5. Validate using the validation script

### For Learning
1. Start with `income_simple.json` to understand basics
2. Progress to `income_ifrs.json` for intermediate features
3. Study `income_detailed_nl.json` or `balance_sheet_ifrs.json` for advanced patterns

### For Reference
- Check how to structure specific sections
- See examples of expression syntax
- Learn proper use of subtotals and calculated items
- Understand indentation and styling patterns

## Best Practices

Based on these examples:

1. **Use Descriptive Names**: Clear variable names and labels help maintainability
2. **Add Comments**: Use `_comment` fields to explain complex logic
3. **Consistent Ordering**: Use order numbers with gaps (100, 200, 300) for easy insertion
4. **Proper Indentation**: Use indent levels to show hierarchy
5. **Appropriate Styling**: Use style attributes (normal, metric, subtotal, total) consistently
6. **Spacers for Clarity**: Add blank rows between major sections
7. **Document Standards**: Reference accounting standards (IFRS, GAAP) in descriptions
8. **Test Thoroughly**: Validate reports before deployment

## Customization Tips

### Adding New Variables
```json
"new_variable": {
  "filter": { "code1": "XXX" },
  "aggregate": "sum",
  "description": "Clear description of what this represents"
}
```

### Creating Calculated Metrics
```json
{
  "order": 300,
  "label": "Gross Margin %",
  "type": "calculated",
  "expression": "(@300 / @100) * 100",
  "format": "percent",
  "style": "metric"
}
```

### Using Subtotals
```json
{
  "order": 500,
  "label": "Total Operating Expenses",
  "type": "subtotal",
  "from": 400,
  "to": 490,
  "format": "currency",
  "style": "subtotal"
}
```

## Support

For more information:
- See `docs/REPORT_DEFINITIONS.md` for complete documentation
- Check the JSON schema at `src/reports/schema/report-definition.schema.json`
- Review validation rules in `src/reports/ReportValidator.js`

## Contributing

When adding new examples:
1. Follow the naming convention: `{statement_type}_{variant}.json`
2. Include comprehensive comments
3. Validate against the schema
4. Add entry to this README
5. Test with actual data if possible
