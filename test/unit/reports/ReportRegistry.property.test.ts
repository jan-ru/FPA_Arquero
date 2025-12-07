/**
 * Property-Based Tests for ReportRegistry
 * 
 * Feature: configurable-report-definitions, Property 9: Report Registry Uniqueness
 * Validates: Requirements 9.3, 7.11
 * 
 * These tests verify that the ReportRegistry maintains uniqueness of reportIds
 * and correctly manages the collection of report definitions.
 */

import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import fc from "fast-check";
import ReportRegistry from "../../../src/reports/ReportRegistry.ts";

describe("ReportRegistry - Property-Based Tests", () => {
    let registry: ReportRegistry;

    beforeEach(() => {
        // Get fresh registry instance and clear it
        registry = ReportRegistry.getInstance();
        registry.clear();
    });

    afterEach(() => {
        // Clean up after each test
        registry.clear();
    });

    describe("Property 9: Report Registry Uniqueness", () => {
        /**
         * Property: For any report registry, no two registered reports can have the same reportId
         * 
         * This test generates random report definitions and verifies that:
         * 1. Reports with unique IDs can be registered successfully
         * 2. Attempting to register a report with a duplicate ID throws an error
         * 3. The registry maintains uniqueness invariant at all times
         */
        it("should enforce reportId uniqueness across all registered reports", () => {
            fc.assert(
                fc.property(
                    // Generate an array of report definitions with potentially duplicate IDs
                    fc.array(
                        fc.record({
                            reportId: fc.stringMatching(/^[a-z_]{3,20}$/),
                            name: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                            version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
                            statementType: fc.constantFrom("balance", "income", "cashflow"),
                            variables: fc.constant({}),
                            layout: fc.constant([])
                        }),
                        { minLength: 2, maxLength: 20 }
                    ),
                    (reportDefs) => {
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Track which reportIds we've successfully registered
                        const registeredIds = new Set<string>();
                        
                        // Try to register each report
                        for (const reportDef of reportDefs) {
                            if (registeredIds.has(reportDef.reportId)) {
                                // This is a duplicate - should throw an error
                                assertThrows(
                                    () => registry.register(reportDef),
                                    Error,
                                    `Report ID '${reportDef.reportId}' already exists`,
                                    `Registry should reject duplicate reportId: ${reportDef.reportId}`
                                );
                            } else {
                                // This is unique - should succeed
                                registry.register(reportDef);
                                registeredIds.add(reportDef.reportId);
                            }
                        }
                        
                        // Verify the registry contains exactly the unique reports
                        assertEquals(
                            registry.count(),
                            registeredIds.size,
                            `Registry should contain ${registeredIds.size} unique reports, but has ${registry.count()}`
                        );
                        
                        // Verify all registered IDs are in the registry
                        for (const reportId of registeredIds) {
                            assertEquals(
                                registry.hasReport(reportId),
                                true,
                                `Registry should contain report with ID: ${reportId}`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Registering reports with unique IDs should always succeed
         * 
         * This test verifies that when all reportIds are unique, all registrations succeed
         */
        it("should successfully register all reports when reportIds are unique", () => {
            fc.assert(
                fc.property(
                    // Generate an array of report definitions with guaranteed unique IDs
                    fc.uniqueArray(
                        fc.record({
                            reportId: fc.stringMatching(/^[a-z_]{3,20}$/),
                            name: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                            version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
                            statementType: fc.constantFrom("balance", "income", "cashflow"),
                            variables: fc.constant({}),
                            layout: fc.constant([])
                        }),
                        {
                            selector: (report) => report.reportId,
                            minLength: 1,
                            maxLength: 15
                        }
                    ),
                    (reportDefs) => {
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Register all reports - should all succeed
                        for (const reportDef of reportDefs) {
                            registry.register(reportDef);
                        }
                        
                        // Verify all reports were registered
                        assertEquals(
                            registry.count(),
                            reportDefs.length,
                            `Registry should contain all ${reportDefs.length} reports`
                        );
                        
                        // Verify each report can be retrieved
                        for (const reportDef of reportDefs) {
                            const retrieved = registry.getReport(reportDef.reportId);
                            assertEquals(
                                retrieved?.reportId,
                                reportDef.reportId,
                                `Should retrieve report with ID: ${reportDef.reportId}`
                            );
                            assertEquals(
                                retrieved?.name,
                                reportDef.name,
                                `Retrieved report should have correct name`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: After unregistering a report, its ID can be reused
         * 
         * This test verifies that unregistering a report frees up its ID for reuse
         */
        it("should allow reusing reportId after unregistering", () => {
            fc.assert(
                fc.property(
                    // Generate two reports with the same ID but different names
                    fc.stringMatching(/^[a-z_]{3,20}$/),
                    fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                    fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                    fc.constantFrom("balance", "income", "cashflow"),
                    (reportId, name1, name2, statementType) => {
                        // Ensure names are different
                        if (name1 === name2) {
                            name2 = name2 + " v2";
                        }
                        
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Create first report
                        const report1 = {
                            reportId,
                            name: name1,
                            version: "1.0.0",
                            statementType,
                            variables: {},
                            layout: []
                        };
                        
                        // Register first report
                        registry.register(report1);
                        assertEquals(registry.hasReport(reportId), true);
                        
                        // Unregister it
                        const unregistered = registry.unregister(reportId);
                        assertEquals(unregistered, true, "Unregister should return true");
                        assertEquals(registry.hasReport(reportId), false, "Report should be removed");
                        
                        // Create second report with same ID
                        const report2 = {
                            reportId,
                            name: name2,
                            version: "2.0.0",
                            statementType,
                            variables: {},
                            layout: []
                        };
                        
                        // Should be able to register with the same ID
                        registry.register(report2);
                        assertEquals(registry.hasReport(reportId), true);
                        
                        // Verify it's the second report
                        const retrieved = registry.getReport(reportId);
                        assertEquals(retrieved?.name, name2, "Should retrieve the second report");
                        assertEquals(retrieved?.version, "2.0.0", "Should have version 2.0.0");
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Registry count should equal the number of unique reportIds
         * 
         * This test verifies that the registry count accurately reflects unique reports
         */
        it("should maintain accurate count of unique reports", () => {
            fc.assert(
                fc.property(
                    // Generate reports with some potential duplicates
                    fc.array(
                        fc.record({
                            reportId: fc.stringMatching(/^[a-z_]{3,15}$/),
                            name: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                            version: fc.constantFrom("1.0.0", "1.1.0"),
                            statementType: fc.constantFrom("balance", "income", "cashflow"),
                            variables: fc.constant({}),
                            layout: fc.constant([])
                        }),
                        { minLength: 1, maxLength: 20 }
                    ),
                    (reportDefs) => {
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Track unique IDs
                        const uniqueIds = new Set<string>();
                        
                        // Try to register each report
                        for (const reportDef of reportDefs) {
                            try {
                                registry.register(reportDef);
                                uniqueIds.add(reportDef.reportId);
                            } catch (error) {
                                // Duplicate ID - expected, skip
                            }
                        }
                        
                        // Verify count matches unique IDs
                        assertEquals(
                            registry.count(),
                            uniqueIds.size,
                            `Registry count should equal number of unique IDs (${uniqueIds.size})`
                        );
                        
                        // Verify getAllReports returns correct number
                        const allReports = registry.getAllReports();
                        assertEquals(
                            allReports.length,
                            uniqueIds.size,
                            `getAllReports should return ${uniqueIds.size} reports`
                        );
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: getReportsByType should only return reports of the specified type
         * 
         * This test verifies type filtering works correctly
         */
        it("should correctly filter reports by statement type", () => {
            fc.assert(
                fc.property(
                    // Generate reports with various types
                    fc.uniqueArray(
                        fc.record({
                            reportId: fc.stringMatching(/^[a-z_]{3,20}$/),
                            name: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                            version: fc.constantFrom("1.0.0", "1.1.0"),
                            statementType: fc.constantFrom("balance", "income", "cashflow"),
                            variables: fc.constant({}),
                            layout: fc.constant([])
                        }),
                        {
                            selector: (report) => report.reportId,
                            minLength: 3,
                            maxLength: 15
                        }
                    ),
                    fc.constantFrom("balance", "income", "cashflow"),
                    (reportDefs, filterType) => {
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Register all reports
                        for (const reportDef of reportDefs) {
                            registry.register(reportDef);
                        }
                        
                        // Get reports by type
                        const filteredReports = registry.getReportsByType(filterType);
                        
                        // Count expected reports of this type
                        const expectedCount = reportDefs.filter(
                            r => r.statementType === filterType
                        ).length;
                        
                        // Verify count
                        assertEquals(
                            filteredReports.length,
                            expectedCount,
                            `Should return ${expectedCount} reports of type ${filterType}`
                        );
                        
                        // Verify all returned reports have the correct type
                        for (const report of filteredReports) {
                            assertEquals(
                                report.statementType,
                                filterType,
                                `All returned reports should have statementType=${filterType}`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Clearing the registry should remove all reports
         * 
         * This test verifies that clear() removes all reports
         */
        it("should remove all reports when cleared", () => {
            fc.assert(
                fc.property(
                    // Generate unique reports
                    fc.uniqueArray(
                        fc.record({
                            reportId: fc.stringMatching(/^[a-z_]{3,20}$/),
                            name: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
                            version: fc.constantFrom("1.0.0"),
                            statementType: fc.constantFrom("balance", "income", "cashflow"),
                            variables: fc.constant({}),
                            layout: fc.constant([])
                        }),
                        {
                            selector: (report) => report.reportId,
                            minLength: 1,
                            maxLength: 10
                        }
                    ),
                    (reportDefs) => {
                        // Clear registry for this test run
                        registry.clear();
                        
                        // Register all reports
                        for (const reportDef of reportDefs) {
                            registry.register(reportDef);
                        }
                        
                        // Verify reports are registered
                        assertEquals(
                            registry.count(),
                            reportDefs.length,
                            `Should have ${reportDefs.length} reports before clear`
                        );
                        
                        // Clear the registry
                        registry.clear();
                        
                        // Verify all reports are removed
                        assertEquals(
                            registry.count(),
                            0,
                            "Registry should be empty after clear"
                        );
                        
                        // Verify no reports can be retrieved
                        for (const reportDef of reportDefs) {
                            assertEquals(
                                registry.hasReport(reportDef.reportId),
                                false,
                                `Report ${reportDef.reportId} should not exist after clear`
                            );
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
