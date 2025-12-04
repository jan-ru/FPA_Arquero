# Report Migration Tool

The Report Migration Tool (`ReportMigrationTool.js`) generates JSON report definitions from the hardcoded report logic in `StatementGenerator.js`. This tool is essential for migrating from hardcoded reports to the configurable report system while maintaining identical output.

## Purpose

The migration tool:
- Exports hardcoded report structures to JSON format
- Preserves all calculated metrics and formulas
- Maintains formatting rules and row ordering
- Validates generated definitions automatically
- Enables comparison between hardcoded and configurable outputs

## Usage

### Basic Usage

```javascript
import ReportMigrationTool from './src/reports/ReportMigrationTool.js';
import ReportValidator from './src/reports/ReportValidator.js';

// Create validator (optional but recommended)
const validator = new ReportValidator(schema);

// Create migration tool
const migrationTool = new ReportMigrationTool(validator);

// Export a single statement type
const incomeDef = migrationTool.exportToJSON('income');
console.log(JSON.stringify(incomeDef, null, 2));

// Export all statement types
const allReports = migrationTool.exportAll();
console.log(JSON.stringify(allReports.income, null, 2));
console.log(JSON.stringify(allReports.balance, null, 2));
console.log(JSON.stringify(allReports.cashflow, null, 2));
```

### Command Line Usage

Use the test script to generate all migrated reports:

```bash
deno run --allow-read --allow-write test/scripts/test_migration_tool.ts
```

This will:
1. Generate report definitions for all three statement types
2. Validate each generated definition
3. Save them to `reports/*_statement_migrated.json`
4. Compare structure with existing default reports

## Generated Report Definitions

The tool generates three report definitions:

### 1. Income Statement (`income_statement_migrated.json`)

**Variables:**
- `revenue` - Netto-omzet (code1=500)
- `cogs` - Kostprijs van de omzet (code1=510)
- `operating_costs` - Bedrijfslasten (code1=520)
- `other_operating_costs` - Overige bedrijfslasten (code1=530)
- `financial` - Financiële baten en lasten (code1=540)
- `taxes` - Belastingen (code1=550)

**Calculated Metrics:**
- Bruto marge (Gross Margin) = revenue + cogs
- Bedrijfsresultaat (Operating Result) = revenue + cogs + operating_costs
- Resultaat voor belastingen (Result Before Taxes) = revenue + cogs + operating_costs + other_operating_costs + financial
- Resultaat na belastingen (Net Income) = all revenues and expenses

### 2. Balance Sheet (`balance_sheet_migrated.json`)

**Variables:**
- `fixed_assets` - Vaste activa (code1=10)
- `current_assets` - Vlottende activa (code1=20,30,40,50)
- `equity` - Eigen vermogen (code1=60)
- `provisions` - Voorzieningen (code1=70)
- `liabilities` - Schulden (code1=80,90)

**Calculated Metrics:**
- Totaal activa (Total Assets) = fixed_assets + current_assets
- Totaal passiva (Total Liabilities & Equity) = equity + provisions + liabilities

### 3. Cash Flow Statement (`cash_flow_migrated.json`)

**Variables:**
- `net_income` - Net Income from Income Statement
- `depreciation` - Depreciation (non-cash expense)
- `inventory_change` - Change in Inventory
- `receivables_change` - Change in Receivables
- `payables_change` - Change in Payables
- `fixed_assets_change` - Change in Fixed Assets (CapEx)
- `long_term_debt_change` - Change in Long-term Debt

**Calculated Metrics:**
- Kasstroom uit operationele activiteiten (Operating Cash Flow)
- Kasstroom uit investeringsactiviteiten (Investing Cash Flow)
- Kasstroom uit financieringsactiviteiten (Financing Cash Flow)
- Netto verandering liquide middelen (Net Change in Cash)

## Validation

The migration tool automatically validates generated definitions if a validator is provided. Validation checks:

- Required fields are present
- Field types are correct
- Enum values are valid
- Variable references exist
- Order numbers are unique
- Expression syntax is valid
- Filter fields are valid

## Comparison with Hardcoded Reports

To verify that migrated reports produce identical output:

1. Generate the migrated report definition
2. Load the same movements data
3. Run both hardcoded and configurable report generation
4. Compare outputs row by row

Example comparison:

```javascript
// Generate with hardcoded method
const hardcodedResult = generator.generateIncomeStatement(options);

// Generate with migrated definition
const migratedDef = migrationTool.exportToJSON('income');
const configurableResult = generator.generateStatementFromDefinition(migratedDef, options);

// Compare outputs
const hardcodedRows = hardcodedResult.details.objects();
const configurableRows = configurableResult.rows;

// Verify row counts match
console.assert(hardcodedRows.length === configurableRows.length);

// Verify amounts match
for (let i = 0; i < hardcodedRows.length; i++) {
    console.assert(hardcodedRows[i].amount_2024 === configurableRows[i].amount_2024);
    console.assert(hardcodedRows[i].amount_2025 === configurableRows[i].amount_2025);
}
```

## Customization

After generating migrated reports, you can customize them:

1. **Add new variables**: Define additional filters and aggregations
2. **Add calculated metrics**: Create new expressions using existing variables
3. **Reorder rows**: Change order numbers to rearrange layout
4. **Modify formatting**: Adjust currency symbols, decimal places, etc.
5. **Add subtotals**: Create section totals using subtotal layout items
6. **Add spacers**: Insert blank rows for visual separation

## Migration Strategy

Recommended migration approach:

1. **Generate migrated definitions** using the migration tool
2. **Validate** that generated definitions are correct
3. **Test** with real data to verify identical output
4. **Deploy** migrated definitions alongside hardcoded reports
5. **Enable feature flag** to switch between systems
6. **Monitor** for any differences in production
7. **Deprecate** hardcoded reports once confident

## Troubleshooting

### Validation Errors

If validation fails, check:
- Filter fields use valid column names (code1, code2, code3, name1, name2, name3, statement_type)
- All variable references in expressions exist
- Order numbers are unique
- Subtotal ranges are valid (from < to)
- Layout item types are valid

### Output Differences

If migrated reports produce different output:
- Verify filter criteria match hardcoded logic
- Check expression formulas are correct
- Ensure aggregation functions are appropriate
- Verify sign handling (income statement flips signs)
- Check period filtering logic

## API Reference

### `exportToJSON(statementType)`

Generate a report definition for a specific statement type.

**Parameters:**
- `statementType` (string): 'income', 'balance', or 'cashflow'

**Returns:**
- Object: Report definition ready for JSON serialization

**Throws:**
- Error: If statement type is invalid or validation fails

### `exportAll()`

Generate report definitions for all statement types.

**Returns:**
- Object: Keys 'income', 'balance', 'cashflow' with report definitions

### `compareWithHardcoded(statementType, movementsData)`

Compare generated definition with hardcoded output (placeholder for future implementation).

**Parameters:**
- `statementType` (string): Statement type to compare
- `movementsData` (Object): Movements data for testing

**Returns:**
- Object: Comparison result with differences

## See Also

- [Report Definitions Guide](./REPORT_DEFINITIONS.md) - Complete guide to report definition format
- [Migration Guide](./MIGRATION_GUIDE.md) - Step-by-step migration process
- [Testing Strategy](../test/docs/TESTING_STRATEGY.md) - How to test migrated reports
