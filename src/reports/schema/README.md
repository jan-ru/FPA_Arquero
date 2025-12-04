# Report Definition JSON Schema

This directory contains the JSON Schema for configurable financial statement report definitions.

## Schema File

- `report-definition.schema.json` - The complete JSON Schema definition

## Overview

The schema defines the structure for report definition JSON files that configure financial statement layouts. Report definitions specify:

- **Variables**: Named references to filtered and aggregated data
- **Layout Items**: Rows in the report (variables, calculations, subtotals, etc.)
- **Formatting Rules**: How numbers should be displayed
- **Metadata**: Information about the report

## Required Fields

Every report definition must include:

- `reportId` (string): Unique identifier (lowercase, numbers, hyphens, underscores only)
- `name` (string): Display name for the report
- `version` (string): Semantic version number (e.g., "1.0.0")
- `statementType` (enum): One of "balance", "income", or "cashflow"
- `layout` (array): At least one layout item

## Optional Fields

- `description` (string): Description of the report
- `variables` (object): Named variable definitions
- `formatting` (object): Default formatting rules
- `metadata` (object): Author, dates, tags, etc.

## Variable Definition

Variables filter and aggregate data from the movements table:

```json
{
  "revenue": {
    "filter": { "code1": "700" },
    "aggregate": "sum",
    "description": "Total revenue"
  }
}
```

**Required:**
- `filter` (object): Filter specification
- `aggregate` (enum): One of "sum", "average", "count", "min", "max", "first", "last"

**Optional:**
- `description` (string): Description of the variable

## Filter Specification

Filters select specific rows from the movements table:

```json
{
  "code1": "700",
  "code2": ["100", "200"],
  "name1": { "contains": "revenue" },
  "statement_type": "Winst & verlies"
}
```

**Supported Fields:**
- `code1`, `code2`, `code3`: Hierarchy codes (string or array)
- `name1`, `name2`, `name3`: Hierarchy names (string or pattern match)
- `statement_type`: Statement type filter

**Pattern Matching:**
```json
{
  "name1": {
    "contains": "substring",
    "startsWith": "prefix",
    "endsWith": "suffix",
    "regex": "pattern"
  }
}
```

## Layout Item

Layout items define individual rows in the report:

```json
{
  "order": 10,
  "label": "Revenue",
  "type": "variable",
  "variable": "revenue",
  "format": "currency",
  "style": "normal",
  "indent": 0
}
```

**Required:**
- `order` (number): Sequence number for ordering rows
- `type` (enum): One of "variable", "calculated", "category", "subtotal", "spacer"

**Type-Specific Required Fields:**
- `variable` type requires: `variable` (string)
- `calculated` type requires: `expression` (string)
- `category` type requires: `filter` (object)
- `subtotal` type requires: `from` (number), `to` (number)
- `spacer` type requires: nothing additional

**Optional:**
- `label` (string): Display label
- `format` (enum): "currency", "percent", "integer", "decimal"
- `style` (enum): "normal", "metric", "subtotal", "total", "spacer"
- `indent` (integer): 0-3
- `description` (string): Description
- `_comment` (string): Comment (ignored by parser)

## Layout Item Types

### Variable
References a defined variable:
```json
{
  "order": 10,
  "label": "Revenue",
  "type": "variable",
  "variable": "revenue"
}
```

### Calculated
Evaluates an expression:
```json
{
  "order": 20,
  "label": "Gross Profit",
  "type": "calculated",
  "expression": "revenue + cogs"
}
```

### Category
Filters and displays a category:
```json
{
  "order": 30,
  "label": "Operating Expenses",
  "type": "category",
  "filter": { "code1": ["520", "530"] }
}
```

### Subtotal
Sums a range of layout items:
```json
{
  "order": 40,
  "label": "Total Expenses",
  "type": "subtotal",
  "from": 10,
  "to": 30
}
```

### Spacer
Empty row for visual separation:
```json
{
  "order": 50,
  "type": "spacer"
}
```

## Formatting Rules

Default formatting for different number types:

```json
{
  "formatting": {
    "currency": {
      "decimals": 0,
      "thousands": true,
      "symbol": "€"
    },
    "percent": {
      "decimals": 1,
      "symbol": "%"
    },
    "integer": {
      "thousands": true
    },
    "decimal": {
      "decimals": 2,
      "thousands": true
    }
  }
}
```

**Currency/Percent/Decimal:**
- `decimals` (integer): 0-4 decimal places
- `thousands` (boolean): Use thousands separator
- `symbol` (string): Symbol to display

**Integer:**
- `thousands` (boolean): Use thousands separator

## Validation Rules

The schema enforces:

1. **Required Fields**: All required fields must be present
2. **Field Types**: All fields must have correct types
3. **Enum Values**: Enum fields must use valid values
4. **Patterns**: reportId and version must match patterns
5. **Ranges**: indent (0-3), decimals (0-4), order (≥0)
6. **Conditional Requirements**: Type-specific fields based on layout item type
7. **No Additional Properties**: Filters cannot have unknown fields

## Example Report Definition

See `test/fixtures/reports/valid_income_simple.json` for a complete example.

## Testing

The schema is tested with:
- `test/unit/reports/schema-validation.test.ts` - Validation tests
- `test/unit/reports/schema-fixtures.test.ts` - Schema structure tests
- `test/fixtures/reports/` - Example valid and invalid reports

Run tests with:
```bash
deno test --allow-read test/unit/reports/
```

## Validation

To validate a report definition against this schema, use a JSON Schema validator like Ajv:

```javascript
import Ajv from "ajv";
const ajv = new Ajv();
const schema = JSON.parse(await Deno.readTextFile("report-definition.schema.json"));
const validate = ajv.compile(schema);
const valid = validate(reportDefinition);
if (!valid) {
  console.error(validate.errors);
}
```

## References

- JSON Schema Draft 07: https://json-schema.org/draft-07/schema
- Requirements: `.kiro/specs/configurable-report-definitions/requirements.md`
- Design: `.kiro/specs/configurable-report-definitions/design.md`
