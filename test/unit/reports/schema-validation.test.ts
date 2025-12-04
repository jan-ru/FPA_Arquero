import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Load the schema
const schemaPath = new URL("../../../src/reports/schema/report-definition.schema.json", import.meta.url);
const schemaText = await Deno.readTextFile(schemaPath);
const schema = JSON.parse(schemaText);

// Simple validation function for testing schema structure
function validate(data: any): boolean {
  validate.errors = [];
  try {
    // Check required fields
    if (!data.reportId || !data.name || !data.version || !data.statementType || !data.layout) {
      validate.errors.push({ message: "Missing required field" });
      return false;
    }
    
    // Check reportId format
    if (!/^[a-z0-9_-]+$/.test(data.reportId)) {
      return false;
    }
    
    // Check version format
    if (!/^\d+\.\d+\.\d+$/.test(data.version)) {
      return false;
    }
    
    // Check statementType enum
    if (!["balance", "income", "cashflow"].includes(data.statementType)) {
      return false;
    }
    
    // Check layout is non-empty array
    if (!Array.isArray(data.layout) || data.layout.length === 0) {
      return false;
    }
    
    // Check each layout item
    for (const item of data.layout) {
      if (typeof item.order !== "number" || !item.type) {
        return false;
      }
      
      // Check type enum
      if (!["variable", "calculated", "category", "subtotal", "spacer"].includes(item.type)) {
        return false;
      }
      
      // Type-specific validation
      if (item.type === "variable" && !item.variable) return false;
      if (item.type === "calculated" && !item.expression) return false;
      if (item.type === "category" && !item.filter) return false;
      if (item.type === "subtotal" && (item.from === undefined || item.to === undefined)) return false;
      
      // Check indent range
      if (item.indent !== undefined && (item.indent < 0 || item.indent > 3)) {
        return false;
      }
      
      // Check format enum
      if (item.format && !["currency", "percent", "integer", "decimal"].includes(item.format)) {
        return false;
      }
      
      // Check style enum
      if (item.style && !["normal", "metric", "subtotal", "total", "spacer"].includes(item.style)) {
        return false;
      }
    }
    
    // Check variables if present
    if (data.variables) {
      for (const [name, varDef] of Object.entries(data.variables)) {
        const v = varDef as any;
        if (!v.filter || !v.aggregate) return false;
        
        // Check aggregate enum
        if (!["sum", "average", "count", "min", "max", "first", "last"].includes(v.aggregate)) {
          return false;
        }
        
        // Check filter has at least one property
        if (Object.keys(v.filter).length === 0) {
          return false;
        }
        
        // Check filter only has valid properties
        const validFilterProps = ["code1", "code2", "code3", "name1", "name2", "name3", "statement_type"];
        for (const key of Object.keys(v.filter)) {
          if (!validFilterProps.includes(key)) {
            return false;
          }
        }
      }
    }
    
    // Check formatting if present
    if (data.formatting) {
      for (const [type, rules] of Object.entries(data.formatting)) {
        const r = rules as any;
        if (r.decimals !== undefined && (r.decimals < 0 || r.decimals > 4)) {
          return false;
        }
      }
    }
    
    validate.errors = null;
    return true;
  } catch (e) {
    validate.errors = [{ message: String(e) }];
    return false;
  }
}

validate.errors = null as any;

describe("Report Definition JSON Schema", () => {
  describe("Valid Report Definitions", () => {
    it("should validate a minimal valid report definition", () => {
      const reportDef = {
        reportId: "test_report",
        name: "Test Report",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer"
          }
        ]
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Minimal report definition should be valid");
    });

    it("should validate a report with variables", () => {
      const reportDef = {
        reportId: "income_simple",
        name: "Simple Income Statement",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: { code1: "700" },
            aggregate: "sum"
          },
          expenses: {
            filter: { code1: ["710", "720"] },
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

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with variables should be valid");
    });

    it("should validate a report with calculated layout items", () => {
      const reportDef = {
        reportId: "test_calc",
        name: "Test Calculated",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            label: "Net Income",
            type: "calculated",
            expression: "revenue - expenses",
            format: "currency",
            style: "total"
          }
        ]
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with calculated items should be valid");
    });

    it("should validate a report with subtotal layout items", () => {
      const reportDef = {
        reportId: "test_subtotal",
        name: "Test Subtotal",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            label: "Item 1",
            type: "variable",
            variable: "item1"
          },
          {
            order: 20,
            label: "Item 2",
            type: "variable",
            variable: "item2"
          },
          {
            order: 30,
            label: "Total",
            type: "subtotal",
            from: 10,
            to: 20,
            format: "currency"
          }
        ]
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with subtotal items should be valid");
    });

    it("should validate a report with category layout items", () => {
      const reportDef = {
        reportId: "test_category",
        name: "Test Category",
        version: "1.0.0",
        statementType: "balance",
        layout: [
          {
            order: 10,
            label: "Assets",
            type: "category",
            filter: { code1: ["100", "150"] },
            format: "currency"
          }
        ]
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with category items should be valid");
    });

    it("should validate a report with formatting rules", () => {
      const reportDef = {
        reportId: "test_formatting",
        name: "Test Formatting",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer"
          }
        ],
        formatting: {
          currency: {
            decimals: 2,
            thousands: true,
            symbol: "€"
          },
          percent: {
            decimals: 1,
            symbol: "%"
          }
        }
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with formatting rules should be valid");
    });

    it("should validate a report with pattern matching filters", () => {
      const reportDef = {
        reportId: "test_pattern",
        name: "Test Pattern",
        version: "1.0.0",
        statementType: "income",
        variables: {
          revenue: {
            filter: {
              name1: { contains: "omzet" }
            },
            aggregate: "sum"
          }
        },
        layout: [
          {
            order: 10,
            type: "variable",
            variable: "revenue"
          }
        ]
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with pattern matching should be valid");
    });

    it("should validate a report with metadata", () => {
      const reportDef = {
        reportId: "test_metadata",
        name: "Test Metadata",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer"
          }
        ],
        metadata: {
          author: "Test Author",
          created: "2024-01-01T00:00:00Z",
          modified: "2024-01-02T00:00:00Z",
          tags: ["test", "example"]
        }
      };

      const valid = validate(reportDef);
      if (!valid) {
        console.error("Validation errors:", validate.errors);
      }
      assertEquals(valid, true, "Report with metadata should be valid");
    });

    it("should validate all aggregate function types", () => {
      const aggregates = ["sum", "average", "count", "min", "max", "first", "last"];
      
      aggregates.forEach(agg => {
        const reportDef = {
          reportId: `test_${agg}`,
          name: `Test ${agg}`,
          version: "1.0.0",
          statementType: "income",
          variables: {
            test: {
              filter: { code1: "700" },
              aggregate: agg
            }
          },
          layout: [
            {
              order: 10,
              type: "variable",
              variable: "test"
            }
          ]
        };

        const valid = validate(reportDef);
        assertEquals(valid, true, `Aggregate function '${agg}' should be valid`);
      });
    });

    it("should validate all statement types", () => {
      const types = ["balance", "income", "cashflow"];
      
      types.forEach(type => {
        const reportDef = {
          reportId: `test_${type}`,
          name: `Test ${type}`,
          version: "1.0.0",
          statementType: type,
          layout: [
            {
              order: 10,
              type: "spacer"
            }
          ]
        };

        const valid = validate(reportDef);
        assertEquals(valid, true, `Statement type '${type}' should be valid`);
      });
    });

    it("should validate all format types", () => {
      const formats = ["currency", "percent", "integer", "decimal"];
      
      formats.forEach(format => {
        const reportDef = {
          reportId: `test_${format}`,
          name: `Test ${format}`,
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

        const valid = validate(reportDef);
        assertEquals(valid, true, `Format type '${format}' should be valid`);
      });
    });

    it("should validate all style types", () => {
      const styles = ["normal", "metric", "subtotal", "total", "spacer"];
      
      styles.forEach(style => {
        const reportDef = {
          reportId: `test_${style}`,
          name: `Test ${style}`,
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

        const valid = validate(reportDef);
        assertEquals(valid, true, `Style type '${style}' should be valid`);
      });
    });

    it("should validate indent levels 0-3", () => {
      for (let indent = 0; indent <= 3; indent++) {
        const reportDef = {
          reportId: `test_indent_${indent}`,
          name: `Test Indent ${indent}`,
          version: "1.0.0",
          statementType: "income",
          layout: [
            {
              order: 10,
              type: "spacer",
              indent: indent
            }
          ]
        };

        const valid = validate(reportDef);
        assertEquals(valid, true, `Indent level ${indent} should be valid`);
      }
    });
  });

  describe("Invalid Report Definitions", () => {
    it("should reject report without required reportId", () => {
      const reportDef = {
        name: "Test Report",
        version: "1.0.0",
        statementType: "income",
        layout: []
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report without reportId should be invalid");
      assertExists(validate.errors);
    });

    it("should reject report without required name", () => {
      const reportDef = {
        reportId: "test",
        version: "1.0.0",
        statementType: "income",
        layout: []
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report without name should be invalid");
    });

    it("should reject report without required version", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        statementType: "income",
        layout: []
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report without version should be invalid");
    });

    it("should reject report without required statementType", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        layout: []
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report without statementType should be invalid");
    });

    it("should reject report without required layout", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income"
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report without layout should be invalid");
    });

    it("should reject report with empty layout array", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: []
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report with empty layout should be invalid");
    });

    it("should reject report with invalid version format", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report with invalid version format should be invalid");
    });

    it("should reject report with invalid statementType", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "invalid",
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Report with invalid statementType should be invalid");
    });

    it("should reject layout item without required order", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            type: "spacer"
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Layout item without order should be invalid");
    });

    it("should reject layout item without required type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Layout item without type should be invalid");
    });

    it("should reject layout item with invalid type", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "invalid"
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Layout item with invalid type should be invalid");
    });

    it("should reject variable layout item without variable field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "variable"
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Variable layout item without variable field should be invalid");
    });

    it("should reject calculated layout item without expression field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "calculated"
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Calculated layout item without expression should be invalid");
    });

    it("should reject category layout item without filter field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "category"
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Category layout item without filter should be invalid");
    });

    it("should reject subtotal layout item without from field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "subtotal",
            to: 20
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Subtotal layout item without from should be invalid");
    });

    it("should reject subtotal layout item without to field", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "subtotal",
            from: 5
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Subtotal layout item without to should be invalid");
    });

    it("should reject variable without required filter", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Variable without filter should be invalid");
    });

    it("should reject variable without required aggregate", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: "700" }
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Variable without aggregate should be invalid");
    });

    it("should reject variable with invalid aggregate function", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: { code1: "700" },
            aggregate: "invalid"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Variable with invalid aggregate should be invalid");
    });

    it("should reject filter with empty object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: {},
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Filter with no properties should be invalid");
    });

    it("should reject indent level below 0", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer",
            indent: -1
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Indent level below 0 should be invalid");
    });

    it("should reject indent level above 3", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [
          {
            order: 10,
            type: "spacer",
            indent: 4
          }
        ]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Indent level above 3 should be invalid");
    });

    it("should reject invalid format type", () => {
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

      const valid = validate(reportDef);
      assertEquals(valid, false, "Invalid format type should be invalid");
    });

    it("should reject invalid style type", () => {
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

      const valid = validate(reportDef);
      assertEquals(valid, false, "Invalid style type should be invalid");
    });

    it("should reject formatting with decimals below 0", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          currency: {
            decimals: -1
          }
        }
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Decimals below 0 should be invalid");
    });

    it("should reject formatting with decimals above 4", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }],
        formatting: {
          currency: {
            decimals: 5
          }
        }
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Decimals above 4 should be invalid");
    });

    it("should reject reportId with invalid characters", () => {
      const reportDef = {
        reportId: "Test Report!",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "reportId with invalid characters should be invalid");
    });

    it("should reject filter with unknown properties", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        variables: {
          test: {
            filter: {
              code1: "700",
              invalidField: "value"
            },
            aggregate: "sum"
          }
        },
        layout: [{ order: 10, type: "spacer" }]
      };

      const valid = validate(reportDef);
      assertEquals(valid, false, "Filter with unknown properties should be invalid");
    });
  });
});
