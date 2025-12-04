import { describe, it, beforeAll } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ReportValidator from "../../../src/reports/ReportValidator.js";

// Load the schema
let schema: any;
let validator: any;

beforeAll(async () => {
  const schemaPath = new URL("../../../src/reports/schema/report-definition.schema.json", import.meta.url);
  const schemaText = await Deno.readTextFile(schemaPath);
  schema = JSON.parse(schemaText);
  validator = new ReportValidator(schema);
});

describe("ReportValidator", () => {
  describe("validate() - Complete Validation", () => {
    it("should validate a complete valid report definition", () => {
      const reportDef = {
        reportId: "test_report",
        name: "Test Report",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: { code1: "700" },
            aggregate: "sum"
          }
        },
        layout: [
          {
            order: 10,
            label: "Revenue",
            type: "variable",
            variable: "revenue",
            format: "currency"
          }
        ]
      };

      const result = validator.validate(reportDef);
      assertEquals(result.isValid, true, `Expected valid but got errors: ${result.formatMessages()}`);
      assertEquals(result.hasErrors(), false);
    });

    it("should collect all validation errors", () => {
      const reportDef = {
        reportId: "Test Report!",  // Invalid characters
        name: "Test",
        version: "1.0",  // Invalid format
        statementType: "invalid",  // Invalid type
        layout: [
          {
            order: 10,
            type: "variable"
            // Missing variable field
          },
          {
            order: 10,  // Duplicate order
            type: "calculated"
            // Missing expression field
          }
        ]
      };

      const result = validator.validate(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.hasErrors(), true);
      
      // Should have multiple errors
      const errorCount = result.errors.length;
      assertEquals(errorCount > 5, true, `Expected multiple errors, got ${errorCount}`);
    });
  });

  describe("validateStructure()", () => {
    it("should validate required fields", () => {
      const reportDef = {
        name: "Test"
        // Missing reportId, version, statementType, layout
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.hasErrors(), true);
      
      // Check for specific required field errors
      const errorFields = result.errors.map((e: any) => e.field);
      assertEquals(errorFields.includes("reportId"), true);
      assertEquals(errorFields.includes("version"), true);
      assertEquals(errorFields.includes("statementType"), true);
      assertEquals(errorFields.includes("layout"), true);
    });

    it("should validate reportId format", () => {
      const reportDef = {
        reportId: "Invalid Report!",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      
      const reportIdErrors = result.getErrorsForField("reportId");
      assertEquals(reportIdErrors.length > 0, true);
    });

    it("should validate version format", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0",  // Invalid - needs three parts
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      
      const versionErrors = result.getErrorsForField("version");
      assertEquals(versionErrors.length > 0, true);
    });

    it("should validate statementType enum", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "invalid",
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      
      const typeErrors = result.getErrorsForField("statementType");
      assertEquals(typeErrors.length > 0, true);
    });

    it("should validate layout is non-empty array", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: []
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      
      const layoutErrors = result.getErrorsForField("layout");
      assertEquals(layoutErrors.length > 0, true);
    });

    it("should validate layout item types", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "variable",
            variable: "test"
          },
          {
            order: 20,
            type: "calculated",
            expression: "test * 2"
          },
          {
            order: 30,
            type: "category",
            filter: { code1: "700" }
          },
          {
            order: 40,
            type: "subtotal",
            from: 10,
            to: 30
          },
          {
            order: 50,
            type: "spacer"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, true, `Expected valid but got: ${result.formatMessages()}`);
    });

    it("should validate type-specific required fields", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "variable"
            // Missing variable field
          },
          {
            order: 20,
            type: "calculated"
            // Missing expression field
          },
          {
            order: 30,
            type: "category"
            // Missing filter field
          },
          {
            order: 40,
            type: "subtotal"
            // Missing from and to fields
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.errors.length >= 4, true);
    });

    it("should validate indent range", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer",
            indent: 5  // Invalid - max is 3
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate format enum", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer",
            format: "invalid"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate style enum", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer",
            style: "invalid"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate variable definitions", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: "700" },
            aggregate: "sum"
          },
          invalid: {
            // Missing filter and aggregate
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate filter specifications", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: {},  // Empty filter
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate formatting rules", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          currency: {
            decimals: 5  // Invalid - max is 4
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });
  });

  describe("validateBusinessRules()", () => {
    it("should detect duplicate order numbers", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          { order: 10, type: "spacer" },
          { order: 10, type: "spacer" },  // Duplicate
          { order: 20, type: "spacer" }
        ]
      };

      const result = validator.validateBusinessRules(reportDef);
      assertEquals(result.isValid, false);
      
      const layoutErrors = result.getErrorsForField("layout");
      assertEquals(layoutErrors.length > 0, true);
      assertEquals(layoutErrors[0].message.includes("Duplicate"), true);
    });

    it("should validate subtotal ranges", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          { order: 10, type: "spacer" },
          {
            order: 20,
            type: "subtotal",
            from: 30,  // from >= to is invalid
            to: 20
          }
        ]
      };

      const result = validator.validateBusinessRules(reportDef);
      assertEquals(result.isValid, false);
    });
  });

  describe("validateExpressions()", () => {
    it("should validate expression syntax", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "revenue + expenses"
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should detect unbalanced parentheses", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "(revenue + expenses"  // Missing closing paren
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should detect invalid characters", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "revenue & expenses"  // Invalid character &
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should detect consecutive operators", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "revenue ++ expenses"  // Consecutive operators
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });
  });

  describe("validateReferences()", () => {
    it("should detect undefined variable references", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: { code1: "700" },
            aggregate: "sum"
          }
        },
        layout: [
          {
            order: 10,
            type: "variable",
            variable: "undefined_var"  // Not defined
          }
        ]
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, false);
      
      const varErrors = result.errors.filter((e: any) => e.message.includes("undefined_var"));
      assertEquals(varErrors.length > 0, true);
    });

    it("should detect undefined order references in expressions", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "@999"  // Order 999 doesn't exist
          }
        ]
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, false);
      
      const orderErrors = result.errors.filter((e: any) => e.message.includes("@999"));
      assertEquals(orderErrors.length > 0, true);
    });

    it("should detect undefined variable references in expressions", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: { code1: "700" },
            aggregate: "sum"
          }
        },
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "revenue + undefined_var"  // undefined_var not defined
          }
        ]
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, false);
      
      const varErrors = result.errors.filter((e: any) => e.message.includes("undefined_var"));
      assertEquals(varErrors.length > 0, true);
    });

    it("should detect undefined order references in subtotals", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer"
          },
          {
            order: 20,
            type: "subtotal",
            from: 5,   // Order 5 doesn't exist
            to: 999    // Order 999 doesn't exist
          }
        ]
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.errors.length >= 2, true);
    });

    it("should validate all references are defined", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: { code1: "700" },
            aggregate: "sum"
          },
          expenses: {
            filter: { code1: "710" },
            aggregate: "sum"
          }
        },
        layout: [
          {
            order: 10,
            type: "variable",
            variable: "revenue"
          },
          {
            order: 20,
            type: "variable",
            variable: "expenses"
          },
          {
            order: 30,
            type: "calculated",
            expression: "revenue + expenses"
          },
          {
            order: 40,
            type: "calculated",
            expression: "@10 + @20"
          },
          {
            order: 50,
            type: "subtotal",
            from: 10,
            to: 40
          }
        ]
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, true, `Expected valid but got: ${result.formatMessages()}`);
    });
  });

  describe("Helper Methods", () => {
    it("should extract order references from expressions", () => {
      const expression = "@10 + @20 * @30";
      const refs = validator.extractOrderReferences(expression);
      
      assertEquals(refs.length, 3);
      assertEquals(refs.includes(10), true);
      assertEquals(refs.includes(20), true);
      assertEquals(refs.includes(30), true);
    });

    it("should extract variable references from expressions", () => {
      const expression = "revenue + expenses - cogs";
      const refs = validator.extractVariableReferences(expression);
      
      assertEquals(refs.length, 3);
      assertEquals(refs.includes("revenue"), true);
      assertEquals(refs.includes("expenses"), true);
      assertEquals(refs.includes("cogs"), true);
    });

    it("should not extract order references as variables", () => {
      const expression = "@10 + revenue";
      const refs = validator.extractVariableReferences(expression);
      
      assertEquals(refs.length, 1);
      assertEquals(refs.includes("revenue"), true);
      assertEquals(refs.includes("10"), false);
    });
  });

  describe("Edge Cases and Additional Coverage", () => {
    it("should handle null reportDef", () => {
      const result = validator.validateStructure(null);
      assertEquals(result.isValid, false);
    });

    it("should handle non-object reportDef", () => {
      const result = validator.validateStructure("not an object");
      assertEquals(result.isValid, false);
    });

    it("should validate reportId length constraints", () => {
      const tooLong = {
        reportId: "a".repeat(101),
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(tooLong);
      assertEquals(result.isValid, false);
    });

    it("should validate name length constraints", () => {
      const tooLong = {
        reportId: "test",
        name: "a".repeat(201),
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(tooLong);
      assertEquals(result.isValid, false);
    });

    it("should validate layout is not an object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: "not an array"
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate variables is not an object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        variables: "not an object"
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate filter with array of non-strings", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: [123, 456] },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate filter with empty array", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: [] },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate pattern match with non-string values", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { name1: { contains: 123 } },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate pattern match with empty object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { name1: {} },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate pattern match with invalid property", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { name1: { invalidProp: "value" } },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate formatting with non-object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: "not an object"
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate currency formatting with non-boolean thousands", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          currency: {
            thousands: "yes"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate currency formatting with invalid symbol length", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          currency: {
            symbol: "TOOLONG"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate percent formatting rules", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          percent: {
            decimals: 2,
            symbol: "%"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should validate integer formatting rules", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          integer: {
            thousands: true
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should validate decimal formatting rules", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          decimal: {
            decimals: 2,
            thousands: true
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should validate expression with empty string", () => {
      const result = validator.validateExpression("", "test");
      assertEquals(result.isValid, false);
    });

    it("should validate expression with only whitespace", () => {
      const result = validator.validateExpression("   ", "test");
      assertEquals(result.isValid, false);
    });

    it("should validate expression starting with operator", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "+ revenue"
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate expression ending with operator", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: "revenue +"
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate expression with closing paren before opening", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated",
            expression: ")revenue + expenses("
          }
        ]
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should handle multiple duplicate order numbers", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          { order: 10, type: "spacer" },
          { order: 10, type: "spacer" },
          { order: 20, type: "spacer" },
          { order: 20, type: "spacer" },
          { order: 20, type: "spacer" }
        ]
      };

      const result = validator.validateBusinessRules(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.errors[0].message.includes("10"), true);
      assertEquals(result.errors[0].message.includes("20"), true);
    });

    it("should validate filter with null value", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: null,
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate filter with non-object type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: "not an object",
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const filterErrors = result.errors.filter((e: any) => e.message.includes("Filter must be an object"));
      assertEquals(filterErrors.length > 0, true);
    });

    it("should validate variable definition with null", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: null
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate name filter with invalid type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { name1: 123 },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate statement_type filter", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { statement_type: "Winst & verlies" },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should validate statement_type filter with non-string", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { statement_type: 123 },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate invalid aggregate function", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: "700" },
            aggregate: "invalid_aggregate"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const aggErrors = result.getErrorsForField("variables.test.aggregate");
      assertEquals(aggErrors.length > 0, true);
    });

    it("should validate invalid filter field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { invalid_field: "value" },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const filterErrors = result.errors.filter((e: any) => e.message.includes("Invalid filter field"));
      assertEquals(filterErrors.length > 0, true);
    });

    it("should validate code filter with non-string and non-array", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: 123 },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate percent formatting with invalid decimals", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          percent: {
            decimals: 5  // Invalid - max is 4
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate percent formatting with invalid symbol length", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          percent: {
            symbol: "TOOLONG"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate integer formatting with non-boolean thousands", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          integer: {
            thousands: "yes"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate decimal formatting with invalid decimals", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          decimal: {
            decimals: -1  // Invalid - must be >= 0
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate decimal formatting with non-boolean thousands", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          decimal: {
            thousands: "yes"
          }
        }
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
    });

    it("should validate layout item with negative order", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: -5,
            type: "spacer"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const orderErrors = result.getErrorsForField("layout[0].order");
      assertEquals(orderErrors.length > 0, true);
    });

    it("should validate layout item with non-number order", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: "10",  // String instead of number
            type: "spacer"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const orderErrors = result.getErrorsForField("layout[0].order");
      assertEquals(orderErrors.length > 0, true);
      assertEquals(orderErrors[0].message.includes("must be a number"), true);
    });

    it("should validate layout item with missing type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10
            // Missing type
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const typeErrors = result.getErrorsForField("layout[0].type");
      assertEquals(typeErrors.length > 0, true);
    });

    it("should validate layout item with invalid type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "invalid_type"
          }
        ]
      };

      const result = validator.validateStructure(reportDef);
      assertEquals(result.isValid, false);
      const typeErrors = result.getErrorsForField("layout[0].type");
      assertEquals(typeErrors.length > 0, true);
    });

    it("should validate business rules with null reportDef", () => {
      const result = validator.validateBusinessRules(null);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should validate business rules with missing layout", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income"
      };

      const result = validator.validateBusinessRules(reportDef);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should validate expressions with null reportDef", () => {
      const result = validator.validateExpressions(null);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should validate expressions with missing layout", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income"
      };

      const result = validator.validateExpressions(reportDef);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should validate references with null reportDef", () => {
      const result = validator.validateReferences(null);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should validate references with missing layout", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income"
      };

      const result = validator.validateReferences(reportDef);
      assertEquals(result.isValid, true);  // Should return empty result
      assertEquals(result.hasErrors(), false);
    });

    it("should provide helpful error messages", () => {
      const reportDef = {
        reportId: "test!invalid",
        name: "Test",
        version: "1.0",
        statementType: "invalid",
        layout: []
      };

      const result = validator.validate(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.hasErrors(), true);
      
      // Check that we have multiple errors
      assertEquals(result.errors.length >= 3, true);
      
      // Check that error messages are descriptive and include field names
      const errorFields = result.errors.map((e: any) => e.field);
      assertEquals(errorFields.includes("reportId"), true);
      assertEquals(errorFields.includes("layout"), true);
      assertEquals(errorFields.includes("statementType"), true);
    });

    it("should validate all aggregate functions", () => {
      const validAggregates = ['sum', 'average', 'count', 'min', 'max', 'first', 'last'];
      
      for (const agg of validAggregates) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: "income",
          variables: {
            test: {
              filter: { code1: "700" },
              aggregate: agg
            }
          },
          layout: [{ order: 10, type: "spacer" }]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Aggregate '${agg}' should be valid`);
      }
    });

    it("should validate all format types", () => {
      const validFormats = ['currency', 'percent', 'integer', 'decimal'];
      
      for (const format of validFormats) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: "income",
          layout: [
            {
              order: 10,
              type: "spacer",
              format: format
            }
          ]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Format '${format}' should be valid`);
      }
    });

    it("should validate all style types", () => {
      const validStyles = ['normal', 'metric', 'subtotal', 'total', 'spacer'];
      
      for (const style of validStyles) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: "income",
          layout: [
            {
              order: 10,
              type: "spacer",
              style: style
            }
          ]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Style '${style}' should be valid`);
      }
    });

    it("should validate all statement types", () => {
      const validTypes = ['balance', 'income', 'cashflow'];
      
      for (const type of validTypes) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: type,
          layout: [{ order: 10, type: "spacer" }]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Statement type '${type}' should be valid`);
      }
    });

    it("should validate all filter fields", () => {
      const validFields = ['code1', 'code2', 'code3', 'name1', 'name2', 'name3', 'statement_type'];
      
      for (const field of validFields) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: "income",
          variables: {
            test: {
              filter: { [field]: "value" },
              aggregate: "sum"
            }
          },
          layout: [{ order: 10, type: "spacer" }]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Filter field '${field}' should be valid`);
      }
    });

    it("should validate pattern match with all valid properties", () => {
      const validProps = ['contains', 'startsWith', 'endsWith', 'regex'];
      
      for (const prop of validProps) {
        const reportDef = {
          reportId: "test",
          name: "Test",
          version: "1.0.0",
          statementType: "income",
          variables: {
            test: {
              filter: { name1: { [prop]: "value" } },
              aggregate: "sum"
            }
          },
          layout: [{ order: 10, type: "spacer" }]
        };

        const result = validator.validateStructure(reportDef);
        assertEquals(result.isValid, true, `Pattern match property '${prop}' should be valid`);
      }
    });
  });
});
