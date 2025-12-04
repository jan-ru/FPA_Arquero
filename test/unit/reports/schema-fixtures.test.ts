import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Load the schema
const schemaPath = new URL("../../../src/reports/schema/report-definition.schema.json", import.meta.url);
const schemaText = await Deno.readTextFile(schemaPath);
const schema = JSON.parse(schemaText);

describe("Report Definition Schema - Fixture Files", () => {
  it("should have valid JSON schema structure", () => {
    // Verify schema has required properties
    assertEquals(schema.$schema, "http://json-schema.org/draft-07/schema#");
    assertEquals(schema.type, "object");
    assert(Array.isArray(schema.required), "Schema should have required array");
    assert(schema.properties, "Schema should have properties");
    assert(schema.definitions, "Schema should have definitions");
  });

  it("should define all required top-level fields", () => {
    const required = schema.required;
    assert(required.includes("reportId"), "reportId should be required");
    assert(required.includes("name"), "name should be required");
    assert(required.includes("version"), "version should be required");
    assert(required.includes("statementType"), "statementType should be required");
    assert(required.includes("layout"), "layout should be required");
  });

  it("should define reportId with pattern validation", () => {
    const reportIdProp = schema.properties.reportId;
    assertEquals(reportIdProp.type, "string");
    assertEquals(reportIdProp.pattern, "^[a-z0-9_-]+$");
  });

  it("should define version with semantic versioning pattern", () => {
    const versionProp = schema.properties.version;
    assertEquals(versionProp.type, "string");
    assertEquals(versionProp.pattern, "^\\d+\\.\\d+\\.\\d+$");
  });

  it("should define statementType enum", () => {
    const statementTypeProp = schema.properties.statementType;
    assertEquals(statementTypeProp.type, "string");
    assert(Array.isArray(statementTypeProp.enum), "statementType should have enum");
    assertEquals(statementTypeProp.enum.length, 3);
    assert(statementTypeProp.enum.includes("balance"));
    assert(statementTypeProp.enum.includes("income"));
    assert(statementTypeProp.enum.includes("cashflow"));
  });

  it("should define VariableDefinition with required fields", () => {
    const varDef = schema.definitions.VariableDefinition;
    assertEquals(varDef.type, "object");
    assert(Array.isArray(varDef.required), "VariableDefinition should have required array");
    assert(varDef.required.includes("filter"));
    assert(varDef.required.includes("aggregate"));
  });

  it("should define aggregate function enum", () => {
    const varDef = schema.definitions.VariableDefinition;
    const aggregateProp = varDef.properties.aggregate;
    assertEquals(aggregateProp.type, "string");
    assert(Array.isArray(aggregateProp.enum), "aggregate should have enum");
    
    const expectedAggregates = ["sum", "average", "count", "min", "max", "first", "last"];
    assertEquals(aggregateProp.enum.length, expectedAggregates.length);
    
    for (const agg of expectedAggregates) {
      assert(aggregateProp.enum.includes(agg), `aggregate enum should include ${agg}`);
    }
  });

  it("should define FilterSpecification with valid properties", () => {
    const filterSpec = schema.definitions.FilterSpecification;
    assertEquals(filterSpec.type, "object");
    assertEquals(filterSpec.additionalProperties, false);
    
    const props = filterSpec.properties;
    assert(props.code1, "FilterSpecification should have code1");
    assert(props.code2, "FilterSpecification should have code2");
    assert(props.code3, "FilterSpecification should have code3");
    assert(props.name1, "FilterSpecification should have name1");
    assert(props.name2, "FilterSpecification should have name2");
    assert(props.name3, "FilterSpecification should have name3");
    assert(props.statement_type, "FilterSpecification should have statement_type");
  });

  it("should define LayoutItem with type enum", () => {
    const layoutItem = schema.definitions.LayoutItem;
    assertEquals(layoutItem.type, "object");
    
    const typeProp = layoutItem.properties.type;
    assertEquals(typeProp.type, "string");
    assert(Array.isArray(typeProp.enum), "type should have enum");
    
    const expectedTypes = ["variable", "calculated", "category", "subtotal", "spacer"];
    assertEquals(typeProp.enum.length, expectedTypes.length);
    
    for (const type of expectedTypes) {
      assert(typeProp.enum.includes(type), `type enum should include ${type}`);
    }
  });

  it("should define format type enum", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const formatProp = layoutItem.properties.format;
    assertEquals(formatProp.type, "string");
    assert(Array.isArray(formatProp.enum), "format should have enum");
    
    const expectedFormats = ["currency", "percent", "integer", "decimal"];
    assertEquals(formatProp.enum.length, expectedFormats.length);
    
    for (const format of expectedFormats) {
      assert(formatProp.enum.includes(format), `format enum should include ${format}`);
    }
  });

  it("should define style type enum", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const styleProp = layoutItem.properties.style;
    assertEquals(styleProp.type, "string");
    assert(Array.isArray(styleProp.enum), "style should have enum");
    
    const expectedStyles = ["normal", "metric", "subtotal", "total", "spacer"];
    assertEquals(styleProp.enum.length, expectedStyles.length);
    
    for (const style of expectedStyles) {
      assert(styleProp.enum.includes(style), `style enum should include ${style}`);
    }
  });

  it("should define indent with range 0-3", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const indentProp = layoutItem.properties.indent;
    assertEquals(indentProp.type, "integer");
    assertEquals(indentProp.minimum, 0);
    assertEquals(indentProp.maximum, 3);
  });

  it("should define FormattingRules with all format types", () => {
    const formattingRules = schema.definitions.FormattingRules;
    assertEquals(formattingRules.type, "object");
    assertEquals(formattingRules.additionalProperties, false);
    
    const props = formattingRules.properties;
    assert(props.currency, "FormattingRules should have currency");
    assert(props.percent, "FormattingRules should have percent");
    assert(props.integer, "FormattingRules should have integer");
    assert(props.decimal, "FormattingRules should have decimal");
  });

  it("should define decimals with range 0-4", () => {
    const formattingRules = schema.definitions.FormattingRules;
    const currencyProps = formattingRules.properties.currency.properties;
    const decimalsProp = currencyProps.decimals;
    
    assertEquals(decimalsProp.type, "integer");
    assertEquals(decimalsProp.minimum, 0);
    assertEquals(decimalsProp.maximum, 4);
  });

  it("should validate valid_income_simple.json fixture", async () => {
    const fixturePath = new URL("../../fixtures/reports/valid_income_simple.json", import.meta.url);
    const fixtureText = await Deno.readTextFile(fixturePath);
    const fixture = JSON.parse(fixtureText);
    
    // Basic structure checks
    assertEquals(fixture.reportId, "income_simple");
    assertEquals(fixture.name, "Simple Income Statement");
    assertEquals(fixture.version, "1.0.0");
    assertEquals(fixture.statementType, "income");
    assert(fixture.variables, "Should have variables");
    assert(Array.isArray(fixture.layout), "Should have layout array");
    assert(fixture.layout.length > 0, "Layout should not be empty");
  });

  it("should validate valid_balance_sheet.json fixture", async () => {
    const fixturePath = new URL("../../fixtures/reports/valid_balance_sheet.json", import.meta.url);
    const fixtureText = await Deno.readTextFile(fixturePath);
    const fixture = JSON.parse(fixtureText);
    
    // Basic structure checks
    assertEquals(fixture.reportId, "balance_sheet_nl");
    assertEquals(fixture.name, "Balance Sheet (NL)");
    assertEquals(fixture.version, "1.0.0");
    assertEquals(fixture.statementType, "balance");
    assert(fixture.variables, "Should have variables");
    assert(Array.isArray(fixture.layout), "Should have layout array");
    assert(fixture.layout.length > 0, "Layout should not be empty");
  });

  it("should identify invalid_missing_required.json as invalid", async () => {
    const fixturePath = new URL("../../fixtures/reports/invalid_missing_required.json", import.meta.url);
    const fixtureText = await Deno.readTextFile(fixturePath);
    const fixture = JSON.parse(fixtureText);
    
    // Should be missing reportId
    assertEquals(fixture.reportId, undefined);
    assert(fixture.name, "Should have name");
    assert(fixture.version, "Should have version");
  });

  it("should identify invalid_wrong_types.json as invalid", async () => {
    const fixturePath = new URL("../../fixtures/reports/invalid_wrong_types.json", import.meta.url);
    const fixtureText = await Deno.readTextFile(fixturePath);
    const fixture = JSON.parse(fixtureText);
    
    // Should have invalid enum values
    assertEquals(fixture.statementType, "invalid_type");
    assertEquals(fixture.layout[0].type, "invalid_layout_type");
  });

  it("should have conditional validation for layout item types", () => {
    const layoutItem = schema.definitions.LayoutItem;
    assert(Array.isArray(layoutItem.allOf), "LayoutItem should have allOf for conditional validation");
    
    // Should have at least 4 conditional validations (variable, calculated, category, subtotal)
    assert(layoutItem.allOf.length >= 4, "Should have conditional validations for each type");
  });

  it("should require variable field for variable type", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const variableCondition = layoutItem.allOf.find((cond: any) => 
      cond.if?.properties?.type?.const === "variable"
    );
    
    assert(variableCondition, "Should have conditional validation for variable type");
    assert(Array.isArray(variableCondition.then.required), "Should require fields for variable type");
    assert(variableCondition.then.required.includes("variable"), "Should require variable field");
  });

  it("should require expression field for calculated type", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const calculatedCondition = layoutItem.allOf.find((cond: any) => 
      cond.if?.properties?.type?.const === "calculated"
    );
    
    assert(calculatedCondition, "Should have conditional validation for calculated type");
    assert(Array.isArray(calculatedCondition.then.required), "Should require fields for calculated type");
    assert(calculatedCondition.then.required.includes("expression"), "Should require expression field");
  });

  it("should require filter field for category type", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const categoryCondition = layoutItem.allOf.find((cond: any) => 
      cond.if?.properties?.type?.const === "category"
    );
    
    assert(categoryCondition, "Should have conditional validation for category type");
    assert(Array.isArray(categoryCondition.then.required), "Should require fields for category type");
    assert(categoryCondition.then.required.includes("filter"), "Should require filter field");
  });

  it("should require from and to fields for subtotal type", () => {
    const layoutItem = schema.definitions.LayoutItem;
    const subtotalCondition = layoutItem.allOf.find((cond: any) => 
      cond.if?.properties?.type?.const === "subtotal"
    );
    
    assert(subtotalCondition, "Should have conditional validation for subtotal type");
    assert(Array.isArray(subtotalCondition.then.required), "Should require fields for subtotal type");
    assert(subtotalCondition.then.required.includes("from"), "Should require from field");
    assert(subtotalCondition.then.required.includes("to"), "Should require to field");
  });
});
