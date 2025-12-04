import { describe, it, beforeAll } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ReportLoader from "../../../src/reports/ReportLoader.js";
import ReportValidator from "../../../src/reports/ReportValidator.js";

// Load the schema
let schema: any;
let validator: any;
let loader: any;

beforeAll(async () => {
  const schemaPath = new URL("../../../src/reports/schema/report-definition.schema.json", import.meta.url);
  const schemaText = await Deno.readTextFile(schemaPath);
  schema = JSON.parse(schemaText);
  validator = new ReportValidator(schema);
  loader = new ReportLoader(validator);
});

describe("ReportLoader", () => {
  describe("constructor", () => {
    it("should create a ReportLoader instance", () => {
      const testLoader = new ReportLoader(validator);
      assertExists(testLoader);
      assertEquals(testLoader.validator, validator);
    });

    it("should initialize empty cache", () => {
      const testLoader = new ReportLoader(validator);
      assertEquals(testLoader.cache.size, 0);
      assertEquals(testLoader.lastModified.size, 0);
    });
  });

  describe("parseJSON()", () => {
    it("should parse valid JSON", () => {
      const jsonString = '{"reportId": "test", "name": "Test Report"}';
      const result = loader.parseJSON(jsonString);
      
      assertEquals(result.reportId, "test");
      assertEquals(result.name, "Test Report");
    });

    it("should throw error for invalid JSON", () => {
      const jsonString = '{"reportId": "test", invalid}';
      
      try {
        loader.parseJSON(jsonString, "test.json");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("JSON parse error"), true);
        assertEquals(error.message.includes("test.json"), true);
      }
    });

    it("should handle empty string", () => {
      try {
        loader.parseJSON("", "empty.json");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("JSON parse error"), true);
      }
    });

    it("should provide helpful error messages", () => {
      const jsonString = '{"reportId": "test",\n"name": invalid}';
      
      try {
        loader.parseJSON(jsonString, "test.json");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("test.json"), true);
      }
    });
  });

  describe("validateReport()", () => {
    it("should validate a valid report definition", () => {
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

      const result = loader.validateReport(reportDef);
      assertEquals(result.isValid, true);
    });

    it("should detect invalid report definition", () => {
      const reportDef = {
        reportId: "test",
        // Missing required fields
      };

      const result = loader.validateReport(reportDef);
      assertEquals(result.isValid, false);
      assertEquals(result.hasErrors(), true);
    });

    it("should work without validator", () => {
      const testLoader = new ReportLoader(null);
      const reportDef = {
        reportId: "test",
        name: "Test"
      };

      const result = testLoader.validateReport(reportDef);
      assertExists(result);
    });

    it("should detect non-object report definition", () => {
      const testLoader = new ReportLoader(null);
      const result = testLoader.validateReport(null);
      
      assertEquals(result.isValid, false);
      assertEquals(result.hasErrors(), true);
    });
  });

  describe("clearCache()", () => {
    it("should clear specific file from cache", () => {
      loader.cache.set("/test/report.json", { reportId: "test" });
      loader.lastModified.set("/test/report.json", new Date());
      
      assertEquals(loader.cache.size, 1);
      
      loader.clearCache("/test/report.json");
      
      assertEquals(loader.cache.size, 0);
      assertEquals(loader.lastModified.size, 0);
    });

    it("should clear entire cache when no path provided", () => {
      loader.cache.set("/test/report1.json", { reportId: "test1" });
      loader.cache.set("/test/report2.json", { reportId: "test2" });
      loader.lastModified.set("/test/report1.json", new Date());
      loader.lastModified.set("/test/report2.json", new Date());
      
      assertEquals(loader.cache.size, 2);
      
      loader.clearCache();
      
      assertEquals(loader.cache.size, 0);
      assertEquals(loader.lastModified.size, 0);
    });
  });

  describe("getCachedReports()", () => {
    it("should return all cached reports", () => {
      loader.clearCache();
      
      const report1 = { reportId: "test1", name: "Test 1" };
      const report2 = { reportId: "test2", name: "Test 2" };
      
      loader.cache.set("/test/report1.json", report1);
      loader.cache.set("/test/report2.json", report2);
      
      const cached = loader.getCachedReports();
      
      assertEquals(cached.length, 2);
      assertEquals(cached.includes(report1), true);
      assertEquals(cached.includes(report2), true);
    });

    it("should return empty array when cache is empty", () => {
      loader.clearCache();
      
      const cached = loader.getCachedReports();
      
      assertEquals(cached.length, 0);
    });
  });

  describe("isCached()", () => {
    it("should return true for cached reports", () => {
      loader.clearCache();
      loader.cache.set("/test/report.json", { reportId: "test" });
      
      assertEquals(loader.isCached("/test/report.json"), true);
    });

    it("should return false for non-cached reports", () => {
      loader.clearCache();
      
      assertEquals(loader.isCached("/test/report.json"), false);
    });
  });
  describe("loadReport()", () => {
    it("should load valid report definition from file", async () => {
      // Use an actual report file from the project
      const reportPath = new URL("../../../reports/income_statement_default.json", import.meta.url);
      
      const report = await loader.loadReport(reportPath.pathname);
      
      assertExists(report);
      assertExists(report.reportId);
      assertExists(report.name);
      assertExists(report.statementType);
    });

    it("should cache loaded reports", async () => {
      loader.clearCache();
      
      const reportPath = new URL("../../../reports/income_statement_default.json", import.meta.url);
      
      assertEquals(loader.cache.size, 0);
      
      await loader.loadReport(reportPath.pathname);
      
      assertEquals(loader.cache.size, 1);
      assertEquals(loader.isCached(reportPath.pathname), true);
    });

    it("should return cached report on subsequent loads", async () => {
      loader.clearCache();
      
      const reportPath = new URL("../../../reports/income_statement_default.json", import.meta.url);
      
      const report1 = await loader.loadReport(reportPath.pathname);
      const report2 = await loader.loadReport(reportPath.pathname);
      
      // Should be the same object reference (from cache)
      assertEquals(report1, report2);
    });

    it("should throw error for non-existent file", async () => {
      try {
        await loader.loadReport("/non/existent/file.json");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("Failed to load report"), true);
      }
    });

    it("should throw error for invalid JSON in file", async () => {
      // Create a temporary invalid JSON file
      const tempPath = await Deno.makeTempFile({ suffix: ".json" });
      await Deno.writeTextFile(tempPath, '{"invalid": json}');
      
      try {
        await loader.loadReport(tempPath);
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("JSON parse error"), true);
      } finally {
        await Deno.remove(tempPath);
      }
    });

    it("should throw error for invalid report definition", async () => {
      // Create a temporary file with valid JSON but invalid report
      const tempPath = await Deno.makeTempFile({ suffix: ".json" });
      await Deno.writeTextFile(tempPath, '{"reportId": "test"}');
      
      try {
        await loader.loadReport(tempPath);
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("validation failed"), true);
      } finally {
        await Deno.remove(tempPath);
      }
    });
  });

  describe("loadReportsFromDirectory()", () => {
    it("should load all JSON files from directory", async () => {
      const reportsDir = new URL("../../../reports/", import.meta.url);
      
      const reports = await loader.loadReportsFromDirectory(reportsDir.pathname);
      
      assertExists(reports);
      assertEquals(Array.isArray(reports), true);
      assertEquals(reports.length > 0, true);
      
      // Check that all loaded reports are valid
      reports.forEach((report: any) => {
        assertExists(report.reportId);
        assertExists(report.name);
        assertExists(report.statementType);
      });
    });

    it("should skip non-JSON files", async () => {
      // Create a temp directory with mixed files
      const tempDir = await Deno.makeTempDir();
      
      await Deno.writeTextFile(`${tempDir}/report.json`, JSON.stringify({
        reportId: "test",
        name: "Test",
        version: "1.0.0",
        statementType: "income",
        layout: []
      }));
      await Deno.writeTextFile(`${tempDir}/readme.txt`, "Not a JSON file");
      
      try {
        const reports = await loader.loadReportsFromDirectory(tempDir);
        
        assertEquals(reports.length, 1);
        assertEquals(reports[0].reportId, "test");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should handle empty directory", async () => {
      const tempDir = await Deno.makeTempDir();
      
      try {
        const reports = await loader.loadReportsFromDirectory(tempDir);
        
        assertEquals(reports.length, 0);
      } finally {
        await Deno.remove(tempDir);
      }
    });

    it("should throw error for non-existent directory", async () => {
      try {
        await loader.loadReportsFromDirectory("/non/existent/directory");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("Failed to load reports"), true);
      }
    });

    it("should skip invalid report files and continue", async () => {
      const tempDir = await Deno.makeTempDir();
      
      // Valid report
      await Deno.writeTextFile(`${tempDir}/valid.json`, JSON.stringify({
        reportId: "valid",
        name: "Valid",
        version: "1.0.0",
        statementType: "income",
        layout: []
      }));
      
      // Invalid JSON
      await Deno.writeTextFile(`${tempDir}/invalid.json`, '{"invalid": json}');
      
      try {
        const reports = await loader.loadReportsFromDirectory(tempDir);
        
        // Should load the valid one and skip the invalid one
        assertEquals(reports.length, 1);
        assertEquals(reports[0].reportId, "valid");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("loadReportFromURL()", () => {
    it("should load report from file:// URL", async () => {
      const reportPath = new URL("../../../reports/income_statement_default.json", import.meta.url);
      
      const report = await loader.loadReportFromURL(reportPath.href);
      
      assertExists(report);
      assertExists(report.reportId);
      assertExists(report.name);
    });

    it("should cache reports loaded from URL", async () => {
      loader.clearCache();
      
      const reportPath = new URL("../../../reports/income_statement_default.json", import.meta.url);
      
      await loader.loadReportFromURL(reportPath.href);
      
      assertEquals(loader.cache.size, 1);
    });

    it("should throw error for invalid URL", async () => {
      try {
        await loader.loadReportFromURL("invalid://url");
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("Failed to load report"), true);
      }
    });
  });

  describe("hot-reload functionality", () => {
    it("should detect file changes and reload", async () => {
      const tempPath = await Deno.makeTempFile({ suffix: ".json" });
      
      // Write initial version
      const report1 = {
        reportId: "test",
        name: "Version 1",
        version: "1.0.0",
        statementType: "income",
        layout: []
      };
      await Deno.writeTextFile(tempPath, JSON.stringify(report1));
      
      try {
        // Load first version
        const loaded1 = await loader.loadReport(tempPath);
        assertEquals(loaded1.name, "Version 1");
        
        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update file
        const report2 = {
          reportId: "test",
          name: "Version 2",
          version: "2.0.0",
          statementType: "income",
          layout: []
        };
        await Deno.writeTextFile(tempPath, JSON.stringify(report2));
        
        // Load again - should detect change and reload
        const loaded2 = await loader.loadReport(tempPath, { forceReload: true });
        assertEquals(loaded2.name, "Version 2");
      } finally {
        await Deno.remove(tempPath);
      }
    });
  });

  describe("error handling", () => {
    it("should provide helpful error messages for JSON parse errors", async () => {
      const tempPath = await Deno.makeTempFile({ suffix: ".json" });
      await Deno.writeTextFile(tempPath, '{"reportId": "test",\n"name": invalid}');
      
      try {
        await loader.loadReport(tempPath);
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("JSON parse error"), true);
        assertEquals(error.message.includes(tempPath), true);
      } finally {
        await Deno.remove(tempPath);
      }
    });

    it("should provide helpful error messages for validation errors", async () => {
      const tempPath = await Deno.makeTempFile({ suffix: ".json" });
      await Deno.writeTextFile(tempPath, JSON.stringify({
        reportId: "test"
        // Missing required fields
      }));
      
      try {
        await loader.loadReport(tempPath);
        throw new Error("Should have thrown");
      } catch (error: any) {
        assertEquals(error.message.includes("validation failed"), true);
      } finally {
        await Deno.remove(tempPath);
      }
    });
  });
});
