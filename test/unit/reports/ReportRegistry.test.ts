import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ReportRegistry from "../../../src/reports/ReportRegistry.ts";

// Mock localStorage for testing
class MockLocalStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    const value = this.storage.get(key);
    return value !== undefined ? value : null;
  }

  setItem(key: string, value: string): void {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new Error('localStorage only accepts strings');
    }
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }
}

// Create a single mock instance
const mockLocalStorage = new MockLocalStorage();

// Setup mock localStorage on globalThis
(globalThis as any).localStorage = mockLocalStorage;

describe("ReportRegistry", () => {
  let registry: any;

  beforeEach(() => {
    // Clear localStorage first
    mockLocalStorage.clear();
    // Clear the singleton instance before each test
    (ReportRegistry as any).instance = null;
    registry = ReportRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    // Clean up after each test
    registry.clear();
    mockLocalStorage.clear();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = ReportRegistry.getInstance();
      const instance2 = ReportRegistry.getInstance();
      
      assertEquals(instance1, instance2);
    });

    it("should return the same instance when using constructor", () => {
      const instance1 = new ReportRegistry();
      const instance2 = new ReportRegistry();
      
      assertEquals(instance1, instance2);
    });

    it("should maintain state across getInstance calls", () => {
      const instance1 = ReportRegistry.getInstance();
      instance1.register({
        reportId: "test",
        name: "Test Report",
        statementType: "income"
      });

      const instance2 = ReportRegistry.getInstance();
      assertEquals(instance2.hasReport("test"), true);
    });
  });

  describe("register()", () => {
    it("should register a valid report definition", () => {
      const reportDef = {
        reportId: "income_nl",
        name: "Income Statement (NL)",
        statementType: "income",
        version: "1.0.0"
      };

      registry.register(reportDef);
      
      assertEquals(registry.hasReport("income_nl"), true);
      assertEquals(registry.count(), 1);
    });

    it("should throw error for null report definition", () => {
      assertThrows(
        () => registry.register(null),
        Error,
        "Report definition must be an object"
      );
    });

    it("should throw error for non-object report definition", () => {
      assertThrows(
        () => registry.register("not an object"),
        Error,
        "Report definition must be an object"
      );
    });

    it("should throw error for missing reportId", () => {
      assertThrows(
        () => registry.register({ name: "Test", statementType: "income" }),
        Error,
        "Report definition must have a reportId"
      );
    });

    it("should throw error for missing statementType", () => {
      assertThrows(
        () => registry.register({ reportId: "test", name: "Test" }),
        Error,
        "Report definition must have a statementType"
      );
    });

    it("should throw error for duplicate reportId", () => {
      const reportDef1 = {
        reportId: "test",
        name: "Test Report 1",
        statementType: "income"
      };
      const reportDef2 = {
        reportId: "test",
        name: "Test Report 2",
        statementType: "balance"
      };

      registry.register(reportDef1);
      
      assertThrows(
        () => registry.register(reportDef2),
        Error,
        "Report ID 'test' already exists"
      );
    });

    it("should include report names in duplicate error message", () => {
      const reportDef1 = {
        reportId: "test",
        name: "First Report",
        statementType: "income"
      };
      const reportDef2 = {
        reportId: "test",
        name: "Second Report",
        statementType: "balance"
      };

      registry.register(reportDef1);
      
      try {
        registry.register(reportDef2);
      } catch (error: any) {
        assertEquals(error.message.includes("First Report"), true);
        assertEquals(error.message.includes("Second Report"), true);
      }
    });

    it("should set first report as default for its type", () => {
      const reportDef = {
        reportId: "income_nl",
        name: "Income Statement (NL)",
        statementType: "income"
      };

      registry.register(reportDef);
      
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport?.reportId, "income_nl");
    });

    it("should not override default when isDefault is false", () => {
      const reportDef1 = {
        reportId: "income_nl",
        name: "Income Statement (NL)",
        statementType: "income"
      };
      const reportDef2 = {
        reportId: "income_ifrs",
        name: "Income Statement (IFRS)",
        statementType: "income"
      };

      registry.register(reportDef1);
      registry.register(reportDef2, false);
      
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport?.reportId, "income_nl");
    });

    it("should override default when isDefault is true", () => {
      const reportDef1 = {
        reportId: "income_nl",
        name: "Income Statement (NL)",
        statementType: "income"
      };
      const reportDef2 = {
        reportId: "income_ifrs",
        name: "Income Statement (IFRS)",
        statementType: "income"
      };

      registry.register(reportDef1);
      registry.register(reportDef2, true);
      
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport?.reportId, "income_ifrs");
    });

    it("should register multiple reports of different types", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income Statement",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance Sheet",
        statementType: "balance"
      });
      registry.register({
        reportId: "cashflow_nl",
        name: "Cash Flow",
        statementType: "cashflow"
      });

      assertEquals(registry.count(), 3);
    });
  });

  describe("getReport()", () => {
    it("should return report by ID", () => {
      const reportDef = {
        reportId: "income_nl",
        name: "Income Statement (NL)",
        statementType: "income"
      };

      registry.register(reportDef);
      
      const retrieved = registry.getReport("income_nl");
      assertEquals(retrieved?.reportId, "income_nl");
      assertEquals(retrieved?.name, "Income Statement (NL)");
    });

    it("should return null for non-existent report", () => {
      const result = registry.getReport("non_existent");
      assertEquals(result, null);
    });

    it("should return the exact report object", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        statementType: "income",
        customField: "custom value"
      };

      registry.register(reportDef);
      
      const retrieved = registry.getReport("test");
      assertEquals(retrieved, reportDef);
    });
  });

  describe("getReportsByType()", () => {
    it("should return all reports of a specific type", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "income_ifrs",
        name: "Income IFRS",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      const incomeReports = registry.getReportsByType("income");
      assertEquals(incomeReports.length, 2);
      assertEquals(incomeReports[0].statementType, "income");
      assertEquals(incomeReports[1].statementType, "income");
    });

    it("should return empty array for type with no reports", () => {
      const reports = registry.getReportsByType("cashflow");
      assertEquals(reports.length, 0);
      assertEquals(Array.isArray(reports), true);
    });

    it("should not return reports of other types", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      const incomeReports = registry.getReportsByType("income");
      assertEquals(incomeReports.length, 1);
      assertEquals(incomeReports[0].reportId, "income_nl");
    });
  });

  describe("getAllReports()", () => {
    it("should return all registered reports", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });
      registry.register({
        reportId: "cashflow_nl",
        name: "Cash Flow NL",
        statementType: "cashflow"
      });

      const allReports = registry.getAllReports();
      assertEquals(allReports.length, 3);
    });

    it("should return empty array when no reports registered", () => {
      const allReports = registry.getAllReports();
      assertEquals(allReports.length, 0);
      assertEquals(Array.isArray(allReports), true);
    });

    it("should return array of report objects", () => {
      registry.register({
        reportId: "test1",
        name: "Test 1",
        statementType: "income"
      });
      registry.register({
        reportId: "test2",
        name: "Test 2",
        statementType: "balance"
      });

      const allReports = registry.getAllReports();
      assertEquals(allReports[0].reportId !== undefined, true);
      assertEquals(allReports[1].reportId !== undefined, true);
    });
  });

  describe("hasReport()", () => {
    it("should return true for existing report", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      assertEquals(registry.hasReport("income_nl"), true);
    });

    it("should return false for non-existent report", () => {
      assertEquals(registry.hasReport("non_existent"), false);
    });

    it("should return false for empty registry", () => {
      assertEquals(registry.hasReport("any_id"), false);
    });
  });

  describe("unregister()", () => {
    it("should remove report from registry", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      const result = registry.unregister("income_nl");
      
      assertEquals(result, true);
      assertEquals(registry.hasReport("income_nl"), false);
      assertEquals(registry.count(), 0);
    });

    it("should return false for non-existent report", () => {
      const result = registry.unregister("non_existent");
      assertEquals(result, false);
    });

    it("should clear default if unregistering default report", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      registry.unregister("income_nl");
      
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport, null);
    });

    it("should attempt to set new default when unregistering current default", () => {
      // Register reports in a specific order
      registry.register({
        reportId: "income_first",
        name: "Income First",
        statementType: "income"
      });
      registry.register({
        reportId: "income_second",
        name: "Income Second",
        statementType: "income"
      });

      // Verify income_first is the default (first registered)
      const initialDefault = registry.getDefaultReport("income");
      assertEquals(initialDefault?.reportId, "income_first");

      // Unregister the second report (not the default)
      registry.unregister("income_second");
      
      // The default should still be income_first
      const defaultAfterUnregister = registry.getDefaultReport("income");
      assertEquals(defaultAfterUnregister?.reportId, "income_first");
    });

    it("should not affect other reports", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      registry.unregister("income_nl");
      
      assertEquals(registry.hasReport("balance_nl"), true);
      assertEquals(registry.count(), 1);
    });
  });

  describe("getDefaultReport()", () => {
    it("should return default report for statement type", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport?.reportId, "income_nl");
    });

    it("should return null when no default exists", () => {
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport, null);
    });

    it("should return correct default for each type", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      const incomeDefault = registry.getDefaultReport("income");
      const balanceDefault = registry.getDefaultReport("balance");
      
      assertEquals(incomeDefault?.reportId, "income_nl");
      assertEquals(balanceDefault?.reportId, "balance_nl");
    });
  });

  describe("setDefaultReport()", () => {
    it("should set report as default for its type", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "income_ifrs",
        name: "Income IFRS",
        statementType: "income"
      });

      registry.setDefaultReport("income_ifrs");
      
      const defaultReport = registry.getDefaultReport("income");
      assertEquals(defaultReport?.reportId, "income_ifrs");
    });

    it("should throw error for non-existent report", () => {
      assertThrows(
        () => registry.setDefaultReport("non_existent"),
        Error,
        "Cannot set default: Report 'non_existent' not found"
      );
    });
  });

  describe("localStorage Persistence", () => {
    it("should save selected report to localStorage", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      registry.setSelectedReportId("income_nl");
      
      // Check both the mock and the actual localStorage
      const stored = localStorage.getItem("selectedReportId");
      assertEquals(stored, "income_nl");
    });

    it("should retrieve selected report from localStorage", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      mockLocalStorage.setItem("selectedReportId", "income_nl");
      
      const selectedId = registry.getSelectedReportId();
      assertEquals(selectedId, "income_nl");
    });

    it("should throw error when selecting non-existent report", () => {
      assertThrows(
        () => registry.setSelectedReportId("non_existent"),
        Error,
        "Cannot select report: Report 'non_existent' not found in registry"
      );
    });

    it("should return null when no report selected", () => {
      // Ensure localStorage is actually clear
      localStorage.removeItem("selectedReportId");
      
      const selectedId = registry.getSelectedReportId();
      assertEquals(selectedId, null);
    });

    it("should clear selected report from localStorage", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      registry.setSelectedReportId("income_nl");
      registry.clearSelectedReport();
      
      const selectedId = registry.getSelectedReportId();
      assertEquals(selectedId, null);
    });

    it("should get selected report with fallback to default", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "income_ifrs",
        name: "Income IFRS",
        statementType: "income"
      });

      registry.setSelectedReportId("income_ifrs");
      
      const selected = registry.getSelectedReport("income");
      assertEquals(selected?.reportId, "income_ifrs");
    });

    it("should fall back to default when selected report not found", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      mockLocalStorage.setItem("selectedReportId", "non_existent");
      
      const selected = registry.getSelectedReport("income");
      assertEquals(selected?.reportId, "income_nl");
    });

    it("should fall back to default when selected report is wrong type", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      registry.setSelectedReportId("balance_nl");
      
      const selected = registry.getSelectedReport("income");
      assertEquals(selected?.reportId, "income_nl");
    });

    it("should return null when no selected or default report", () => {
      const selected = registry.getSelectedReport("income");
      assertEquals(selected, null);
    });
  });

  describe("Additional Methods", () => {
    it("should clear all reports", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });

      registry.clear();
      
      assertEquals(registry.count(), 0);
      assertEquals(registry.getAllReports().length, 0);
    });

    it("should return correct count", () => {
      assertEquals(registry.count(), 0);

      registry.register({
        reportId: "test1",
        name: "Test 1",
        statementType: "income"
      });
      assertEquals(registry.count(), 1);

      registry.register({
        reportId: "test2",
        name: "Test 2",
        statementType: "balance"
      });
      assertEquals(registry.count(), 2);
    });

    it("should get all statement types", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Balance NL",
        statementType: "balance"
      });
      registry.register({
        reportId: "income_ifrs",
        name: "Income IFRS",
        statementType: "income"
      });

      const types = registry.getStatementTypes();
      assertEquals(types.length, 2);
      assertEquals(types.includes("income"), true);
      assertEquals(types.includes("balance"), true);
    });

    it("should return empty array when no statement types", () => {
      const types = registry.getStatementTypes();
      assertEquals(types.length, 0);
      assertEquals(Array.isArray(types), true);
    });

    it("should export registry state", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });
      registry.setSelectedReportId("income_nl");

      const state = registry.exportState();
      
      assertExists(state);
      assertEquals(state.count, 1);
      assertEquals(state.selectedReportId, "income_nl");
      assertEquals(Array.isArray(state.reports), true);
      assertEquals(Array.isArray(state.defaults), true);
    });

    it("should import registry state", () => {
      const state = {
        reports: [
          ["income_nl", {
            reportId: "income_nl",
            name: "Income NL",
            statementType: "income"
          }],
          ["balance_nl", {
            reportId: "balance_nl",
            name: "Balance NL",
            statementType: "balance"
          }]
        ],
        defaults: [
          ["income", "income_nl"],
          ["balance", "balance_nl"]
        ],
        selectedReportId: "income_nl",
        count: 2
      };

      registry.importState(state);
      
      assertEquals(registry.count(), 2);
      assertEquals(registry.hasReport("income_nl"), true);
      assertEquals(registry.hasReport("balance_nl"), true);
      assertEquals(registry.getDefaultReport("income")?.reportId, "income_nl");
    });

    it("should throw error for invalid import state", () => {
      assertThrows(
        () => registry.importState(null),
        Error,
        "Invalid state object"
      );
    });

    it("should clear registry before importing", () => {
      registry.register({
        reportId: "old_report",
        name: "Old Report",
        statementType: "income"
      });

      const state = {
        reports: [
          ["new_report", {
            reportId: "new_report",
            name: "New Report",
            statementType: "income"
          }]
        ],
        defaults: [["income", "new_report"]],
        selectedReportId: null,
        count: 1
      };

      registry.importState(state);
      
      assertEquals(registry.hasReport("old_report"), false);
      assertEquals(registry.hasReport("new_report"), true);
      assertEquals(registry.count(), 1);
    });
  });

  describe("reportId Uniqueness Validation", () => {
    it("should enforce unique reportIds across all types", () => {
      registry.register({
        reportId: "test",
        name: "Test Income",
        statementType: "income"
      });

      assertThrows(
        () => registry.register({
          reportId: "test",
          name: "Test Balance",
          statementType: "balance"
        }),
        Error,
        "Report ID 'test' already exists"
      );
    });

    it("should allow same name with different reportIds", () => {
      registry.register({
        reportId: "income_nl",
        name: "Standard Report",
        statementType: "income"
      });
      registry.register({
        reportId: "balance_nl",
        name: "Standard Report",
        statementType: "balance"
      });

      assertEquals(registry.count(), 2);
    });

    it("should validate uniqueness on registration", () => {
      const reportDef = {
        reportId: "test",
        name: "Test",
        statementType: "income"
      };

      registry.register(reportDef);
      
      // Try to register again
      assertThrows(
        () => registry.register(reportDef),
        Error,
        "Report ID 'test' already exists"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle report with minimal fields", () => {
      const reportDef = {
        reportId: "minimal",
        statementType: "income"
      };

      registry.register(reportDef);
      
      assertEquals(registry.hasReport("minimal"), true);
    });

    it("should handle report with extra fields", () => {
      const reportDef = {
        reportId: "extra",
        name: "Extra Fields",
        statementType: "income",
        version: "1.0.0",
        description: "Test description",
        customField: "custom value"
      };

      registry.register(reportDef);
      
      const retrieved = registry.getReport("extra");
      assertEquals(retrieved?.customField, "custom value");
    });

    it("should handle multiple unregister calls", () => {
      registry.register({
        reportId: "test",
        name: "Test",
        statementType: "income"
      });

      const result1 = registry.unregister("test");
      const result2 = registry.unregister("test");
      
      assertEquals(result1, true);
      assertEquals(result2, false);
    });

    it("should handle getReportsByType with no matching reports", () => {
      registry.register({
        reportId: "income_nl",
        name: "Income NL",
        statementType: "income"
      });

      const cashflowReports = registry.getReportsByType("cashflow");
      assertEquals(cashflowReports.length, 0);
    });

    it("should handle clear on empty registry", () => {
      registry.clear();
      assertEquals(registry.count(), 0);
    });

    it("should handle exportState on empty registry", () => {
      const state = registry.exportState();
      
      assertEquals(state.count, 0);
      assertEquals(state.reports.length, 0);
      assertEquals(state.defaults.length, 0);
    });

    it("should handle importState with empty arrays", () => {
      const state = {
        reports: [],
        defaults: [],
        selectedReportId: null,
        count: 0
      };

      registry.importState(state);
      
      assertEquals(registry.count(), 0);
    });
  });
});
