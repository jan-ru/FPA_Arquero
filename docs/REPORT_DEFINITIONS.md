# Report Definition Guide

## Table of Contents

1. [Introduction](#introduction)
2. [JSON Schema Structure](#json-schema-structure)
3. [Layout Item Types](#layout-item-types)
4. [Expression Syntax](#expression-syntax)
5. [Filter Specifications](#filter-specifications)
6. [Formatting Rules](#formatting-rules)
7. [Common Use Cases](#common-use-cases)
8. [Validation Rules](#validation-rules)
9. [Error Messages](#error-messages)
10. [Best Practices](#best-practices)

## Introduction

Report definitions are JSON configuration files that specify the complete layout and calculation logic for financial statements. They allow financial analysts to customize report structures, add calculated metrics, reorder line items, and modify formatting without changing application code.

**Key Benefits:**
- **Flexibility**: Customize reports without coding
- **Reusability**: Share report definitions across teams
- **Maintainability**: Update reports by editing JSON files
- **Validation**: Catch errors before execution
- **Version Control**: Track changes to report structures

**File Location**: Report definitions should be placed in the `/reports/` directory with a `.json` extension.

**Naming Convention**: Use descriptive names like `income_statement_nl.json` or `balance_sheet_ifrs.json`.

## JSON Schema Structure

### Required Fields

Every report definition must include these required fields:

```json
{
  "reportId": "unique_identifier",
  "name": "Display Name",
  "version": "1.0.0",
  "statementType": "income",
  "layout": []
}
```

### Complete Structure

```json
{
  "reportId": "string",
  "name": "string",
  "version": "string (semantic version)",
  "statementType": "balance | income | cashflow",
  "description": "string (optional)",
  "variables": {
    "variableName": {
      "filter": {},
      "aggregate": "sum | average | count | min | max | first | last",
      "description": "string (optional)"
    }
  },
  "layout": [],
  "formatting": {},
  "metadata": {}
}
```

### Field Descriptions

#### reportId
- **Type**: String
- **Required**: Yes
- **Pattern**: `^[a-z0-9_-]+$` (lowercase letters, numbers, underscores, hyphens)
- **Length**: 1-100 characters
- **Description**: Unique identifier for the report. Must be unique across all loaded definitions.
- **Example**: `"income_statement_nl"`, `"balance_sheet_ifrs"`

#### name
- **Type**: String
- **Required**: Yes
- **Length**: 1-200 characters
- **Description**: Human-readable display name shown in the UI
- **Example**: `"Winst & Verlies Rekening (NL)"`, `"IFRS Balance Sheet"`

#### version
- **Type**: String
- **Required**: Yes
- **Pattern**: `^\d+\.\d+\.\d+$` (semantic versioning)
- **Description**: Version number following semantic versioning (major.minor.patch)
- **Example**: `"1.0.0"`, `"2.1.3"`

#### statementType
- **Type**: String (enum)
- **Required**: Yes
- **Values**: `"balance"`, `"income"`, `"cashflow"`
- **Description**: Type of financial statement this report represents

#### description
- **Type**: String
- **Required**: No
- **Description**: Optional detailed description of the report's purpose and structure

#### variables
- **Type**: Object
- **Required**: No
- **Description**: Named variables that filter and aggregate movements data. Keys are variable names, values are VariableDefinition objects.

#### layout
- **Type**: Array of LayoutItem objects
- **Required**: Yes
- **Min Items**: 1
- **Description**: Ordered list of layout items that define the report structure

#### formatting
- **Type**: FormattingRules object
- **Required**: No
- **Description**: Default formatting rules for currency, percent, integer, and decimal values

#### metadata
- **Type**: Object
- **Required**: No
- **Description**: Optional metadata including author, created date, modified date, and tags

## Layout Item Types

Layout items define the rows in your report. Each item has a type that determines its behavior.

### 1. Variable Type

Displays the value of a named variable.

**Required Fields**: `order`, `type`, `variable`

**Example**:
```json
{
  "order": 100,
  "label": "Revenue",
  "type": "variable",
  "variable": "revenue",
  "format": "currency",
  "indent": 0,
  "style": "normal"
}
```

**Use Case**: Display aggregated data from movements table (e.g., total revenue, total expenses)

### 2. Calculated Type

Displays the result of a calculation expression.

**Required Fields**: `order`, `type`, `expression`

**Example**:
```json
{
  "order": 300,
  "label": "Gross Profit",
  "type": "calculated",
  "expression": "revenue + cogs",
  "format": "currency",
  "style": "metric"
}
```

**Use Case**: Calculate derived metrics (e.g., gross profit = revenue + cogs)

### 3. Category Type

Displays aggregated data directly from a filter without defining a variable.

**Required Fields**: `order`, `type`, `filter`

**Example**:
```json
{
  "order": 200,
  "label": "Cost of Goods Sold",
  "type": "category",
  "filter": { "code1": "710" },
  "format": "currency"
}
```

**Use Case**: One-off calculations that don't need to be reused

### 4. Subtotal Type

Sums a range of layout items by order number.

**Required Fields**: `order`, `type`, `from`, `to`

**Example**:
```json
{
  "order": 400,
  "label": "Total Operating Expenses",
  "type": "subtotal",
  "from": 310,
  "to": 390,
  "format": "currency",
  "style": "subtotal"
}
```

**Use Case**: Create section totals (e.g., total operating expenses)

**Important**: Subtotals exclude spacer items and other subtotal items to avoid double-counting.

### 5. Spacer Type

Creates an empty row for visual separation.

**Required Fields**: `order`, `type`

**Example**:
```json
{
  "order": 250,
  "type": "spacer"
}
```

**Use Case**: Add visual spacing between sections

### Layout Item Attributes

All layout items support these optional attributes:

#### label
- **Type**: String
- **Description**: Display text for the row
- **Example**: `"Total Revenue"`, `"Operating Expenses"`

#### format
- **Type**: String (enum)
- **Values**: `"currency"`, `"percent"`, `"integer"`, `"decimal"`
- **Description**: How to format numeric values
- **Default**: Inherits from report-level formatting rules

#### style
- **Type**: String (enum)
- **Values**: `"normal"`, `"metric"`, `"subtotal"`, `"total"`, `"spacer"`
- **Description**: Visual styling for the row
- **Default**: `"normal"`

**Style Descriptions**:
- `normal`: Regular line item
- `metric`: Key performance indicator (bold)
- `subtotal`: Section subtotal (bold, top border)
- `total`: Final total (bold, double border)
- `spacer`: Empty row (no styling)

#### indent
- **Type**: Integer
- **Range**: 0-3
- **Description**: Hierarchical indentation level
- **Default**: 0 (no indent)

**Indent Levels**:
- `0`: No indentation (main categories)
- `1`: First level (subcategories)
- `2`: Second level (detailed items)
- `3`: Third level (very detailed items)

#### description
- **Type**: String
- **Description**: Optional documentation for the layout item

#### _comment
- **Type**: String
- **Description**: Comment field ignored by the parser (useful for documentation)

## Expression Syntax

Expressions are simple calculation formulas that reference variables and other layout items.

### Supported Operators

- **Addition**: `+`
- **Subtraction**: `-`
- **Multiplication**: `*`
- **Division**: `/`
- **Parentheses**: `(` and `)` for grouping

### Operator Precedence

1. Parentheses `()`
2. Multiplication `*` and Division `/`
3. Addition `+` and Subtraction `-`

### Variable References

Reference variables by name:

```json
"expression": "revenue + cogs"
```

### Order References

Reference other layout items by their order number using `@`:

```json
"expression": "@100 + @200"
```

This references the values from layout items with order 100 and 200.

### Numeric Literals

Use numeric constants in expressions:

```json
"expression": "revenue * 0.21"
```

### Unary Minus

Negate values with unary minus:

```json
"expression": "-1 * expenses"
```

### Expression Examples

**Simple Addition**:
```json
"expression": "revenue + other_income"
```

**Subtraction with Parentheses**:
```json
"expression": "(revenue + other_income) - total_expenses"
```

**Percentage Calculation**:
```json
"expression": "gross_profit / revenue"
```

**Complex Calculation**:
```json
"expression": "(@100 + @200) * (1 - tax_rate)"
```

**Referencing Previous Calculations**:
```json
{
  "order": 300,
  "label": "Gross Profit",
  "type": "calculated",
  "expression": "@100 + @200"
},
{
  "order": 400,
  "label": "Gross Margin %",
  "type": "calculated",
  "expression": "@300 / @100",
  "format": "percent"
}
```

### Expression Validation

The system validates expressions for:
- **Syntax errors**: Invalid operators, mismatched parentheses
- **Undefined references**: Variables or order numbers that don't exist
- **Circular dependencies**: Expressions that reference themselves directly or indirectly
- **Division by zero**: Handled gracefully by returning null

## Filter Specifications

Filters select specific rows from the movements table based on hierarchy codes and names.

### Filter Structure

```json
{
  "code1": "string or array",
  "code2": "string or array",
  "code3": "string or array",
  "name1": "string or pattern",
  "name2": "string or pattern",
  "name3": "string or pattern",
  "statement_type": "string"
}
```

### Exact Match Filters

Match a single value:

```json
{
  "filter": { "code1": "700" }
}
```

### Array Filters (OR Logic)

Match any value in the array:

```json
{
  "filter": { "code1": ["700", "710", "720"] }
}
```

This matches rows where code1 is "700" OR "710" OR "720".

### Multiple Field Filters (AND Logic)

Combine multiple criteria:

```json
{
  "filter": {
    "code1": "500",
    "code2": "501",
    "statement_type": "Winst & verlies"
  }
}
```

This matches rows where code1 is "500" AND code2 is "501" AND statement_type is "Winst & verlies".

### Pattern Matching

Match strings using patterns:

**Contains**:
```json
{
  "filter": {
    "name1": { "contains": "revenue" }
  }
}
```

**Starts With**:
```json
{
  "filter": {
    "name1": { "startsWith": "Total" }
  }
}
```

**Ends With**:
```json
{
  "filter": {
    "name1": { "endsWith": "expense" }
  }
}
```

**Regular Expression**:
```json
{
  "filter": {
    "name1": { "regex": "^(Revenue|Income)$" }
  }
}
```

### Variable Definitions with Filters

Variables combine filters with aggregate functions:

```json
{
  "variables": {
    "revenue": {
      "filter": { "code1": "700" },
      "aggregate": "sum",
      "description": "Total revenue from sales"
    },
    "operating_expenses": {
      "filter": { "code1": ["520", "530"] },
      "aggregate": "sum",
      "description": "Sum of personnel and other operating costs"
    }
  }
}
```

### Aggregate Functions

- **sum**: Sum all matching values (most common for financial data)
- **average**: Calculate the mean of matching values
- **count**: Count the number of matching rows
- **min**: Find the minimum value
- **max**: Find the maximum value
- **first**: Take the first matching value
- **last**: Take the last matching value

## Formatting Rules

Formatting rules control how numbers are displayed in the report.

### Report-Level Formatting

Define default formatting rules for the entire report:

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

### Format Types

#### Currency Format

```json
{
  "format": "currency",
  "formatting": {
    "currency": {
      "decimals": 0,
      "thousands": true,
      "symbol": "€"
    }
  }
}
```

**Output Examples**:
- `1234567` → `€ 1,234,567`
- `1234567.89` → `€ 1,234,568` (rounded)
- `-1234567` → `€ -1,234,567`

#### Percent Format

```json
{
  "format": "percent",
  "formatting": {
    "percent": {
      "decimals": 1,
      "symbol": "%"
    }
  }
}
```

**Output Examples**:
- `0.1234` → `12.3%`
- `0.5` → `50.0%`
- `-0.05` → `-5.0%`

**Note**: Values are automatically multiplied by 100.

#### Integer Format

```json
{
  "format": "integer",
  "formatting": {
    "integer": {
      "thousands": true
    }
  }
}
```

**Output Examples**:
- `1234567` → `1,234,567`
- `1234567.89` → `1,234,568` (rounded)

#### Decimal Format

```json
{
  "format": "decimal",
  "formatting": {
    "decimal": {
      "decimals": 2,
      "thousands": true
    }
  }
}
```

**Output Examples**:
- `1234567.89` → `1,234,567.89`
- `1234567` → `1,234,567.00`

### Item-Level Formatting Override

Individual layout items can override report-level formatting:

```json
{
  "order": 100,
  "label": "Revenue",
  "type": "variable",
  "variable": "revenue",
  "format": "currency"
}
```

If no item-level format is specified, the report-level default is used.

## Common Use Cases

### Use Case 1: Simple Income Statement

```json
{
  "reportId": "income_simple",
  "name": "Simple Income Statement",
  "version": "1.0.0",
  "statementType": "income",
  
  "variables": {
    "revenue": {
      "filter": { "code1": "700" },
      "aggregate": "sum"
    },
    "expenses": {
      "filter": { "code1": ["710", "720", "730"] },
      "aggregate": "sum"
    }
  },
  
  "layout": [
    {
      "order": 10,
      "label": "Revenue",
      "type": "variable",
      "variable": "revenue",
      "format": "currency"
    },
    {
      "order": 20,
      "label": "Expenses",
      "type": "variable",
      "variable": "expenses",
      "format": "currency"
    },
    {
      "order": 30,
      "type": "spacer"
    },
    {
      "order": 40,
      "label": "Net Income",
      "type": "calculated",
      "expression": "revenue + expenses",
      "format": "currency",
      "style": "total"
    }
  ]
}
```

### Use Case 2: Income Statement with Subtotals

```json
{
  "reportId": "income_with_subtotals",
  "name": "Income Statement with Subtotals",
  "version": "1.0.0",
  "statementType": "income",
  
  "variables": {
    "product_sales": { "filter": { "code1": "700", "code2": "701" }, "aggregate": "sum" },
    "service_sales": { "filter": { "code1": "700", "code2": "702" }, "aggregate": "sum" },
    "cogs": { "filter": { "code1": "710" }, "aggregate": "sum" },
    "opex": { "filter": { "code1": ["520", "530"] }, "aggregate": "sum" }
  },
  
  "layout": [
    {
      "order": 100,
      "label": "REVENUE",
      "type": "spacer",
      "style": "metric"
    },
    {
      "order": 110,
      "label": "Product Sales",
      "type": "variable",
      "variable": "product_sales",
      "format": "currency",
      "indent": 1
    },
    {
      "order": 120,
      "label": "Service Sales",
      "type": "variable",
      "variable": "service_sales",
      "format": "currency",
      "indent": 1
    },
    {
      "order": 130,
      "label": "Total Revenue",
      "type": "subtotal",
      "from": 110,
      "to": 120,
      "format": "currency",
      "style": "subtotal"
    },
    {
      "order": 140,
      "type": "spacer"
    },
    {
      "order": 200,
      "label": "Cost of Goods Sold",
      "type": "variable",
      "variable": "cogs",
      "format": "currency"
    },
    {
      "order": 210,
      "type": "spacer"
    },
    {
      "order": 300,
      "label": "Gross Profit",
      "type": "calculated",
      "expression": "@130 + @200",
      "format": "currency",
      "style": "metric"
    }
  ]
}
```

### Use Case 3: Percentage Calculations

```json
{
  "reportId": "income_with_percentages",
  "name": "Income Statement with Percentages",
  "version": "1.0.0",
  "statementType": "income",
  
  "variables": {
    "revenue": { "filter": { "code1": "700" }, "aggregate": "sum" },
    "cogs": { "filter": { "code1": "710" }, "aggregate": "sum" }
  },
  
  "layout": [
    {
      "order": 100,
      "label": "Revenue",
      "type": "variable",
      "variable": "revenue",
      "format": "currency"
    },
    {
      "order": 200,
      "label": "Cost of Goods Sold",
      "type": "variable",
      "variable": "cogs",
      "format": "currency"
    },
    {
      "order": 300,
      "label": "Gross Profit",
      "type": "calculated",
      "expression": "@100 + @200",
      "format": "currency",
      "style": "metric"
    },
    {
      "order": 400,
      "label": "Gross Margin %",
      "type": "calculated",
      "expression": "@300 / @100",
      "format": "percent",
      "style": "metric"
    }
  ]
}
```

### Use Case 4: Multi-Level Hierarchy

```json
{
  "layout": [
    {
      "order": 100,
      "label": "OPERATING EXPENSES",
      "type": "spacer",
      "style": "metric",
      "indent": 0
    },
    {
      "order": 110,
      "label": "Personnel Costs",
      "type": "spacer",
      "indent": 1
    },
    {
      "order": 111,
      "label": "Salaries",
      "type": "variable",
      "variable": "salaries",
      "format": "currency",
      "indent": 2
    },
    {
      "order": 112,
      "label": "Social Security",
      "type": "variable",
      "variable": "social_security",
      "format": "currency",
      "indent": 2
    },
    {
      "order": 120,
      "label": "Total Personnel Costs",
      "type": "subtotal",
      "from": 111,
      "to": 112,
      "format": "currency",
      "style": "subtotal",
      "indent": 1
    },
    {
      "order": 130,
      "label": "Other Operating Costs",
      "type": "variable",
      "variable": "other_opex",
      "format": "currency",
      "indent": 1
    },
    {
      "order": 140,
      "label": "Total Operating Expenses",
      "type": "subtotal",
      "from": 120,
      "to": 130,
      "format": "currency",
      "style": "total",
      "indent": 0
    }
  ]
}
```

## Validation Rules

The system validates report definitions against these rules:

### Structure Validation

1. **Required Fields**: reportId, name, version, statementType, layout must be present
2. **Field Types**: All fields must match their expected types (string, number, array, object)
3. **Enum Values**: statementType, aggregate, format, style must use valid enum values
4. **Array Constraints**: layout must have at least 1 item

### Business Rules Validation

1. **Unique reportId**: No two reports can have the same reportId
2. **Unique Order Numbers**: No two layout items can have the same order number
3. **Valid Version**: Version must follow semantic versioning (e.g., "1.0.0")
4. **reportId Pattern**: Must contain only lowercase letters, numbers, underscores, and hyphens

### Reference Validation

1. **Variable References**: All variables referenced in expressions must exist in the variables section
2. **Order References**: All order numbers referenced with @ must exist in the layout
3. **Filter Fields**: Filter fields must be valid (code1, code2, code3, name1, name2, name3, statement_type)

### Expression Validation

1. **Syntax**: Expressions must have valid syntax (balanced parentheses, valid operators)
2. **Circular Dependencies**: Expressions cannot reference themselves directly or indirectly
3. **Undefined Variables**: All variable names in expressions must be defined

### Type-Specific Validation

1. **Variable Type**: Must have a "variable" field
2. **Calculated Type**: Must have an "expression" field
3. **Category Type**: Must have a "filter" field
4. **Subtotal Type**: Must have "from" and "to" fields, and from < to
5. **Spacer Type**: No additional fields required

### Format Validation

1. **Indent Range**: Indent must be between 0 and 3
2. **Decimal Places**: Decimals must be between 0 and 4
3. **Symbol Length**: Currency and percent symbols must be 5 characters or less

## Error Messages

The system provides detailed error messages to help you fix validation issues.

### Common Error Messages

#### Missing Required Field

```
Error: Missing required field "reportId"
Location: Root object
Fix: Add "reportId": "your_report_id" to the root object
```

#### Invalid reportId Pattern

```
Error: reportId "Income_Statement_NL" does not match pattern ^[a-z0-9_-]+$
Location: reportId
Fix: Use only lowercase letters, numbers, underscores, and hyphens
Example: "income_statement_nl"
```

#### Duplicate Order Number

```
Error: Duplicate order number 100 found in layout
Location: layout[5].order
Fix: Ensure all order numbers are unique
```

#### Undefined Variable Reference

```
Error: Variable "total_revenue" referenced in expression but not defined
Location: layout[10].expression
Fix: Add "total_revenue" to the variables section or use a different variable name
```

#### Undefined Order Reference

```
Error: Order number @500 referenced in expression but not found in layout
Location: layout[15].expression
Fix: Ensure order number 500 exists in the layout or use a different order number
```

#### Expression Syntax Error

```
Error: Syntax error in expression "revenue + + cogs"
Location: layout[20].expression at position 10
Expected: variable, number, or '('
Found: '+'
Fix: Remove the extra '+' operator
```

#### Circular Dependency

```
Error: Circular dependency detected in expression
Location: layout[25].expression
Dependency chain: @100 → @200 → @300 → @100
Fix: Remove the circular reference
```

#### Invalid Filter Field

```
Error: Invalid filter field "account_code"
Location: variables.revenue.filter
Valid fields: code1, code2, code3, name1, name2, name3, statement_type
Fix: Use one of the valid filter fields
```

#### Invalid Aggregate Function

```
Error: Invalid aggregate function "total"
Location: variables.revenue.aggregate
Valid functions: sum, average, count, min, max, first, last
Fix: Use one of the valid aggregate functions
```

#### Subtotal Range Error

```
Error: Subtotal "from" (200) must be less than "to" (100)
Location: layout[30]
Fix: Ensure from < to in subtotal definitions
```

#### Missing Type-Specific Field

```
Error: Layout item of type "variable" is missing required field "variable"
Location: layout[35]
Fix: Add "variable": "variable_name" to the layout item
```

## Best Practices

### 1. Use Descriptive Names

**Good**:
```json
{
  "reportId": "income_statement_detailed_nl",
  "name": "Detailed Income Statement (Dutch GAAP)",
  "variables": {
    "product_revenue": { ... },
    "service_revenue": { ... }
  }
}
```

**Bad**:
```json
{
  "reportId": "report1",
  "name": "Report",
  "variables": {
    "var1": { ... },
    "var2": { ... }
  }
}
```

### 2. Use Order Number Gaps

Leave gaps between order numbers to make it easy to insert new items later:

**Good**:
```json
{
  "layout": [
    { "order": 100, ... },
    { "order": 200, ... },
    { "order": 300, ... }
  ]
}
```

**Bad**:
```json
{
  "layout": [
    { "order": 1, ... },
    { "order": 2, ... },
    { "order": 3, ... }
  ]
}
```

### 3. Add Comments for Documentation

Use `_comment` fields to document your report structure:

```json
{
  "layout": [
    {
      "_comment": "=== REVENUE SECTION ===",
      "order": 100,
      "label": "REVENUE",
      "type": "spacer",
      "style": "metric"
    }
  ]
}
```

### 4. Group Related Items

Use spacers and indentation to create visual hierarchy:

```json
{
  "layout": [
    { "order": 100, "label": "OPERATING EXPENSES", "type": "spacer", "style": "metric" },
    { "order": 110, "label": "Personnel", "type": "variable", "variable": "personnel", "indent": 1 },
    { "order": 120, "label": "Rent", "type": "variable", "variable": "rent", "indent": 1 },
    { "order": 130, "label": "Total", "type": "subtotal", "from": 110, "to": 120, "style": "subtotal" },
    { "order": 140, "type": "spacer" }
  ]
}
```

### 5. Define Reusable Variables

If you use the same filter multiple times, define it as a variable:

**Good**:
```json
{
  "variables": {
    "revenue": { "filter": { "code1": "700" }, "aggregate": "sum" }
  },
  "layout": [
    { "order": 100, "type": "variable", "variable": "revenue" },
    { "order": 200, "expression": "revenue * 0.21" }
  ]
}
```

**Bad**:
```json
{
  "layout": [
    { "order": 100, "type": "category", "filter": { "code1": "700" } },
    { "order": 200, "expression": "@100 * 0.21" }
  ]
}
```

### 6. Use Semantic Versioning

Increment version numbers appropriately:
- **Major** (1.0.0 → 2.0.0): Breaking changes to structure
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, no structural changes

### 7. Test with Sample Data

Always test your report definition with sample data before deploying:

1. Load the report definition
2. Generate a statement with test data
3. Verify all calculations are correct
4. Check formatting and styling
5. Test with different period selections

### 8. Document Complex Expressions

Add descriptions to complex calculations:

```json
{
  "order": 400,
  "label": "Effective Tax Rate",
  "type": "calculated",
  "expression": "@300 / @200",
  "format": "percent",
  "description": "Tax expense divided by pre-tax income"
}
```

### 9. Use Consistent Formatting

Apply consistent formatting rules across similar items:

```json
{
  "formatting": {
    "currency": { "decimals": 0, "thousands": true, "symbol": "€" }
  },
  "layout": [
    { "order": 100, "format": "currency", ... },
    { "order": 200, "format": "currency", ... },
    { "order": 300, "format": "currency", ... }
  ]
}
```

### 10. Validate Before Deploying

Use the validation tool to check your report definition:

```bash
node tools/validate-report.js reports/my_report.json
```

## Additional Resources

- **Example Reports**: See `/reports/examples/` for complete examples
- **JSON Schema**: See `/src/reports/schema/report-definition.schema.json` for the complete schema
- **Migration Guide**: See `docs/MIGRATION_GUIDE.md` for migrating from hardcoded reports
- **Quick Start**: See `QUICK_START.md` for getting started with the application

## Support

If you encounter issues or have questions:

1. Check the error message for specific guidance
2. Review the validation rules in this guide
3. Compare your definition with the example reports
4. Consult the JSON schema for field requirements
5. Contact the development team for assistance
