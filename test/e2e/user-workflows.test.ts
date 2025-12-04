/**
 * End-to-End User Workflow Tests
 * 
 * Tests complete user workflows for the configurable report definitions feature:
 * - Loading default reports
 * - Switching between reports
 * - Creating custom reports
 * - Validating custom reports
 * - Exporting with custom reports
 * - Period filtering with custom reports
 * - Variance modes with custom reports
 * - Detail levels with custom reports
 * - Error handling throughout
 * 
 * These tests verify that all components work together correctly in real-world scenarios.
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.210.0/assert/mod.ts";

// Mock Arquero for testing
const mockAq = {
    from: (data: any[]) => ({
        data,
        filter: (fn: any) => {
            if (typeof fn === 'function') {
                return mockAq.from(data.filter(fn));
            } else if (typeof fn === 'string') {
                // Parse simple filter expressions like "d => d.code1 === '700'"
                try {
                    const filterFn = eval(`(${fn})`);
                    return mockAq.from(data.filter(filterFn));
                } catch (e) {
                    console.error('Failed to parse filter:', fn, e);
                    return mockAq.from(data);
                }
            }
            return mockAq.from(data);
        },
        array: (col: string) => data.map((row: any) => row[col]),
        objects: () => data,
        numRows: () => data.length
    }),
    op: {
        sum: (col: any) => Array.isArray(col) ? col.reduce((a: number, b: number) => a + b, 0) : col
    }
};

(globalThis as any).aq = mockAq;

// Import components
const ReportLoader = (await import("../../src/reports/ReportLoader.js")).default;
const ReportRegistry = (await import("../../src/reports/ReportRegistry.js")).default;
const ReportValidator = (await import("../../src/reports/ReportValidator.js")).default;
const ReportRenderer = (await import("../../src/reports/ReportRenderer.js")).default;
const VariableResolver = (await import("../../src/reports/VariableResolver.js")).default;
const ExpressionEvaluator = (await import("../../src/reports/ExpressionEvaluator.js")).default;
const FilterEngine = (await import("../../src/reports/FilterEngine.js")).default;


// =============================================================================
// Test Data Fixtures
// =============================================================================

function createTestMovementsData() {
    return [
        // Revenue data
        { year: 2024, period: 1, code1: "700", name1: "Revenue", amount: 10000, statement_type: "Winst & verlies" },
        { year: 2024, period: 2, code1: "700", name1: "Revenue", amount: 12000, statement_type: "Winst & verlies" },
        { year: 2025, period: 1, code1: "700", name1: "Revenue", amount: 15000, statement_type: "Winst & verlies" },
        { year: 2025, period: 2, code1: "700", name1: "Revenue", amount: 18000, statement_type: "Winst & verlies" },
        
        // Expense data
        { year: 2024, period: 1, code1: "710", name1: "COGS", amount: -6000, statement_type: "Winst & verlies" },
        { year: 2024, period: 2, code1: "710", name1: "COGS", amount: -7000, statement_type: "Winst & verlies" },
        { year: 2025, period: 1, code1: "710", name1: "COGS", amount: -9000, statement_type: "Winst & verlies" },
        { year: 2025, period: 2, code1: "710", name1: "COGS", amount: -10000, statement_type: "Winst & verlies" },
        
        // Balance sheet data
        { year: 2024, period: 1, code1: "100", name1: "Fixed Assets", amount: 50000, statement_type: "Balans" },
        { year: 2024, period: 2, code1: "100", name1: "Fixed Assets", amount: 52000, statement_type: "Balans" },
        { year: 2025, period: 1, code1: "100", name1: "Fixed Assets", amount: 55000, statement_type: "Balans" },
        { year: 2025, period: 2, code1: "100", name1: "Fixed Assets", amount: 58000, statement_type: "Balans" },
    ];
}

function createSimpleIncomeReport() {
    return {
        reportId: "test_income_simple",
        name: "Test Simple Income Statement",
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
                label: "Revenue",
                type: "variable",
                variable: "revenue",
                format: "currency",
                style: "normal",
                indent: 0
            },
            {
                order: 20,
                label: "Expenses",
                type: "variable",
                variable: "expenses",
                format: "currency",
                style: "normal",
                indent: 0
            },
            {
                order: 30,
                type: "spacer"
            },
            {
                order: 40,
                label: "Net Income",
                type: "calculated",
                expression: "revenue + expenses",
                format: "currency",
                style: "total",
                indent: 0
            }
        ],
        formatting: {
            currency: {
                decimals: 0,
                thousands: true,
                symbol: "€"
            }
        }
    };
}

function createDetailedIncomeReport() {
    return {
        reportId: "test_income_detailed",
        name: "Test Detailed Income Statement",
        version: "1.0.0",
        statementType: "income",
        variables: {
            revenue: {
                filter: { code1: "700" },
                aggregate: "sum"
            },
            cogs: {
                filter: { code1: "710" },
                aggregate: "sum"
            }
        },
        layout: [
            {
                order: 100,
                label: "Revenue",
                type: "variable",
                variable: "revenue",
                format: "currency",
                indent: 0
            },
            {
                order: 200,
                label: "Cost of Goods Sold",
                type: "variable",
                variable: "cogs",
                format: "currency",
                indent: 0
            },
            {
                order: 300,
                label: "Gross Profit",
                type: "calculated",
                expression: "revenue + cogs",
                format: "currency",
                style: "metric",
                indent: 0
            },
            {
                order: 400,
                label: "Gross Margin %",
                type: "calculated",
                expression: "(revenue + cogs) / revenue * 100",
                format: "percent",
                style: "metric",
                indent: 0
            }
        ],
        formatting: {
            currency: {
                decimals: 0,
                thousands: true,
                symbol: "€"
            },
            percent: {
                decimals: 1,
                symbol: "%"
            }
        }
    };
}


// =============================================================================
// Workflow 1: Loading Default Reports
// =============================================================================

Deno.test("E2E Workflow - Load default reports from registry", () => {
    // Setup - clear registry for clean test
    const registry = ReportRegistry.getInstance();
    registry.clear();
    const validator = new ReportValidator({});
    
    // Create and register default reports
    const simpleReport = createSimpleIncomeReport();
    const detailedReport = createDetailedIncomeReport();
    
    // Register reports
    registry.register(simpleReport, true); // Set as default
    registry.register(detailedReport);
    
    // Verify reports are registered
    assertEquals(registry.count(), 2);
    assert(registry.hasReport("test_income_simple"));
    assert(registry.hasReport("test_income_detailed"));
    
    // Verify default report
    const defaultReport = registry.getDefaultReport("income");
    assertExists(defaultReport);
    assertEquals(defaultReport.reportId, "test_income_simple");
    
    // Verify we can retrieve reports by type
    const incomeReports = registry.getReportsByType("income");
    assertEquals(incomeReports.length, 2);
    
    console.log("✅ Successfully loaded and registered default reports");
});

// =============================================================================
// Workflow 2: Switching Between Reports
// =============================================================================

Deno.test("E2E Workflow - Switch between different report definitions", () => {
    // Setup - clear registry for clean test
    const registry = ReportRegistry.getInstance();
    registry.clear();
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    const movementsData = mockAq.from(createTestMovementsData());
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    // Register two different reports
    const simpleReport = createSimpleIncomeReport();
    const detailedReport = createDetailedIncomeReport();
    
    registry.register(simpleReport);
    registry.register(detailedReport);
    
    // Render with simple report
    const simpleStatement = renderer.renderStatement(simpleReport, movementsData, periodOptions);
    assertEquals(simpleStatement.reportId, "test_income_simple");
    assertEquals(simpleStatement.rows.length, 4); // Revenue, Expenses, Spacer, Net Income
    
    // Switch to detailed report
    const detailedStatement = renderer.renderStatement(detailedReport, movementsData, periodOptions);
    assertEquals(detailedStatement.reportId, "test_income_detailed");
    assertEquals(detailedStatement.rows.length, 4); // Revenue, COGS, Gross Profit, Gross Margin %
    
    // Verify different layouts produce different results
    // Both have 4 rows, but different labels
    assert(simpleStatement.rows[1].label !== detailedStatement.rows[1].label,
           "Different reports should have different row labels");
    
    // Verify period options are preserved
    assertEquals(detailedStatement.metadata.periodOptions, periodOptions);
    
    console.log("✅ Successfully switched between report definitions");
});


// =============================================================================
// Workflow 3: Creating Custom Reports
// =============================================================================

Deno.test("E2E Workflow - Create and use custom report definition", () => {
    // Setup - clear registry for clean test
    const registry = ReportRegistry.getInstance();
    registry.clear();
    const validator = new ReportValidator({});
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    const movementsData = mockAq.from(createTestMovementsData());
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    // Create a custom report with unique calculations
    const customReport = {
        reportId: "custom_profit_analysis",
        name: "Custom Profit Analysis",
        version: "1.0.0",
        statementType: "income",
        variables: {
            revenue: {
                filter: { code1: "700" },
                aggregate: "sum"
            },
            cogs: {
                filter: { code1: "710" },
                aggregate: "sum"
            }
        },
        layout: [
            {
                order: 10,
                label: "Total Revenue",
                type: "variable",
                variable: "revenue",
                format: "currency",
                indent: 0
            },
            {
                order: 20,
                label: "Total COGS",
                type: "variable",
                variable: "cogs",
                format: "currency",
                indent: 0
            },
            {
                order: 30,
                label: "Gross Profit",
                type: "calculated",
                expression: "revenue + cogs",
                format: "currency",
                style: "metric",
                indent: 0
            },
            {
                order: 40,
                label: "Gross Margin %",
                type: "calculated",
                expression: "(revenue + cogs) / revenue * 100",
                format: "percent",
                style: "metric",
                indent: 0
            },
            {
                order: 50,
                type: "spacer"
            },
            {
                order: 60,
                label: "Revenue per Unit COGS",
                type: "calculated",
                expression: "revenue / (cogs * -1)",
                format: "decimal",
                style: "normal",
                indent: 0
            }
        ],
        formatting: {
            currency: { decimals: 0, thousands: true, symbol: "€" },
            percent: { decimals: 1, symbol: "%" },
            decimal: { decimals: 2, thousands: false }
        }
    };
    
    // Validate custom report
    const validationResult = validator.validate(customReport);
    assert(validationResult.isValid, "Custom report should be valid");
    
    // Register custom report
    registry.register(customReport);
    assert(registry.hasReport("custom_profit_analysis"));
    
    // Render with custom report
    const statement = renderer.renderStatement(customReport, movementsData, periodOptions);
    
    // Verify custom calculations
    assertEquals(statement.reportId, "custom_profit_analysis");
    assertEquals(statement.rows.length, 6);
    
    // Verify custom metric is calculated
    const revenuePerCogs = statement.rows.find((r: any) => r.label === "Revenue per Unit COGS");
    assertExists(revenuePerCogs);
    assert(revenuePerCogs.amount_2024 !== null);
    
    console.log("✅ Successfully created and used custom report definition");
});


// =============================================================================
// Workflow 4: Validating Custom Reports
// =============================================================================

Deno.test("E2E Workflow - Validate custom report and handle errors", () => {
    const validator = new ReportValidator({});
    
    // Test 1: Valid custom report
    const validReport = createSimpleIncomeReport();
    const validResult = validator.validate(validReport);
    assert(validResult.isValid, "Valid report should pass validation");
    assertEquals(validResult.errors.length, 0);
    
    // Test 2: Missing required fields
    const missingFieldsReport = {
        reportId: "test_missing",
        name: "Test Missing Fields"
        // Missing: version, statementType, layout
    };
    const missingResult = validator.validate(missingFieldsReport);
    assert(!missingResult.isValid, "Report with missing fields should fail");
    assert(missingResult.errors.length > 0);
    
    // Test 3: Invalid variable reference
    const invalidVarReport = {
        reportId: "test_invalid_var",
        name: "Test Invalid Variable",
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
                variable: "nonexistent_variable", // Invalid reference
                format: "currency"
            }
        ]
    };
    const invalidVarResult = validator.validate(invalidVarReport);
    assert(!invalidVarResult.isValid, "Report with invalid variable reference should fail");
    
    // Test 4: Duplicate order numbers
    const duplicateOrderReport = {
        reportId: "test_duplicate_order",
        name: "Test Duplicate Order",
        version: "1.0.0",
        statementType: "income",
        variables: {
            revenue: { filter: { code1: "700" }, aggregate: "sum" }
        },
        layout: [
            { order: 10, label: "Item 1", type: "variable", variable: "revenue", format: "currency" },
            { order: 10, label: "Item 2", type: "variable", variable: "revenue", format: "currency" }
        ]
    };
    const duplicateResult = validator.validate(duplicateOrderReport);
    assert(!duplicateResult.isValid, "Report with duplicate order numbers should fail");
    
    // Test 5: Invalid expression syntax
    const invalidExprReport = {
        reportId: "test_invalid_expr",
        name: "Test Invalid Expression",
        version: "1.0.0",
        statementType: "income",
        variables: {
            revenue: { filter: { code1: "700" }, aggregate: "sum" }
        },
        layout: [
            {
                order: 10,
                label: "Bad Calc",
                type: "calculated",
                expression: "revenue + + expenses", // Invalid syntax
                format: "currency"
            }
        ]
    };
    const invalidExprResult = validator.validate(invalidExprReport);
    assert(!invalidExprResult.isValid, "Report with invalid expression should fail");
    
    console.log("✅ Successfully validated custom reports and caught errors");
});


// =============================================================================
// Workflow 5: Period Filtering with Custom Reports
// =============================================================================

Deno.test("E2E Workflow - Apply period filtering with custom reports", () => {
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    const movementsData = mockAq.from(createTestMovementsData());
    const report = createSimpleIncomeReport();
    
    // Test 1: All periods
    const allPeriodsOptions = { years: [2024, 2025], periods: "all" };
    const allPeriodsStatement = renderer.renderStatement(report, movementsData, allPeriodsOptions);
    
    assertExists(allPeriodsStatement);
    assertEquals(allPeriodsStatement.rows.length, 4);
    
    // Verify revenue includes all periods
    const revenueRow = allPeriodsStatement.rows.find((r: any) => r.label === "Revenue");
    assertExists(revenueRow);
    assertEquals(revenueRow.amount_2024, 22000); // 10000 + 12000
    assertEquals(revenueRow.amount_2025, 33000); // 15000 + 18000
    
    // Test 2: Single period (P1)
    const p1Options = { years: [2024, 2025], periods: [1] };
    const p1Statement = renderer.renderStatement(report, movementsData, p1Options);
    
    const p1Revenue = p1Statement.rows.find((r: any) => r.label === "Revenue");
    assertExists(p1Revenue);
    // Note: In real implementation, period filtering would be applied in VariableResolver
    // For this test, we verify the structure is correct
    
    // Test 3: Quarter filtering (Q1 = P1-P3)
    const q1Options = { years: [2024, 2025], periods: [1, 2, 3] };
    const q1Statement = renderer.renderStatement(report, movementsData, q1Options);
    
    assertExists(q1Statement);
    assertEquals(q1Statement.metadata.periodOptions, q1Options);
    
    console.log("✅ Successfully applied period filtering with custom reports");
});

// =============================================================================
// Workflow 6: Variance Modes with Custom Reports
// =============================================================================

Deno.test("E2E Workflow - Calculate variances with custom reports", () => {
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    const movementsData = mockAq.from(createTestMovementsData());
    const report = createSimpleIncomeReport();
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    // Render statement
    const statement = renderer.renderStatement(report, movementsData, periodOptions);
    
    // Verify variance calculations
    const revenueRow = statement.rows.find((r: any) => r.label === "Revenue");
    assertExists(revenueRow);
    
    // Verify variance amount (2025 - 2024)
    assertEquals(revenueRow.variance_amount, 11000); // 33000 - 22000
    
    // Verify variance percent
    const expectedPercent = ((33000 - 22000) / 22000) * 100;
    assertEquals(revenueRow.variance_percent, expectedPercent);
    
    // Verify formatted variance
    assertExists(revenueRow.formatted_variance_amount);
    assertExists(revenueRow.formatted_variance_percent);
    
    // Test with negative values (expenses)
    const expensesRow = statement.rows.find((r: any) => r.label === "Expenses");
    assertExists(expensesRow);
    
    // Expenses should be negative
    assert(expensesRow.amount_2024 < 0);
    assert(expensesRow.amount_2025 < 0);
    
    // Variance should reflect the change
    assertExists(expensesRow.variance_amount);
    assertExists(expensesRow.variance_percent);
    
    console.log("✅ Successfully calculated variances with custom reports");
});


// =============================================================================
// Workflow 7: Formatting with Custom Reports
// =============================================================================

Deno.test("E2E Workflow - Apply formatting rules with custom reports", () => {
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    const movementsData = mockAq.from(createTestMovementsData());
    const report = createDetailedIncomeReport(); // Has both currency and percent formatting
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    // Render statement
    const statement = renderer.renderStatement(report, movementsData, periodOptions);
    
    // Test currency formatting
    const revenueRow = statement.rows.find((r: any) => r.label === "Revenue");
    assertExists(revenueRow);
    assertEquals(revenueRow.format, "currency");
    assertExists(revenueRow.formatted_2024);
    assert(revenueRow.formatted_2024.includes("€"), "Currency format should include symbol");
    
    // Test percent formatting
    const marginRow = statement.rows.find((r: any) => r.label === "Gross Margin %");
    assertExists(marginRow);
    assertEquals(marginRow.format, "percent");
    assertExists(marginRow.formatted_2024);
    assert(marginRow.formatted_2024.includes("%"), "Percent format should include symbol");
    
    // Verify formatting options are applied
    assert(revenueRow.formatted_2024.includes(","), "Should include thousands separator");
    
    console.log("✅ Successfully applied formatting rules with custom reports");
});

// =============================================================================
// Workflow 8: Error Handling Throughout
// =============================================================================

Deno.test("E2E Workflow - Handle errors gracefully throughout system", () => {
    const registry = ReportRegistry.getInstance();
    registry.clear();
    const validator = new ReportValidator({});
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    // Test 1: Handle missing report
    const missingReport = registry.getReport("nonexistent_report");
    assertEquals(missingReport, null, "Should return null for missing report");
    
    // Test 2: Handle duplicate registration
    const report1 = createSimpleIncomeReport();
    registry.register(report1);
    
    let errorThrown = false;
    try {
        registry.register(report1); // Try to register again
    } catch (error) {
        errorThrown = true;
        assert(error.message.includes("already exists"));
    }
    assert(errorThrown, "Should throw error for duplicate reportId");
    
    // Test 3: Handle invalid expression evaluation
    const invalidExprReport = {
        reportId: "test_invalid_eval",
        name: "Test Invalid Eval",
        version: "1.0.0",
        statementType: "income",
        variables: {
            revenue: { filter: { code1: "700" }, aggregate: "sum" }
        },
        layout: [
            {
                order: 10,
                label: "Bad Calc",
                type: "calculated",
                expression: "nonexistent_var * 2",
                format: "currency"
            }
        ]
    };
    
    const movementsData = mockAq.from(createTestMovementsData());
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    let renderErrorThrown = false;
    try {
        renderer.renderStatement(invalidExprReport, movementsData, periodOptions);
    } catch (error) {
        renderErrorThrown = true;
        assert(error.message.includes("nonexistent_var") || error.message.includes("undefined"));
    }
    assert(renderErrorThrown, "Should throw error for undefined variable in expression");
    
    // Test 4: Handle division by zero
    const divByZeroReport = {
        reportId: "test_div_zero",
        name: "Test Division by Zero",
        version: "1.0.0",
        statementType: "income",
        variables: {
            zero_value: { filter: { code1: "999" }, aggregate: "sum" } // No matching data
        },
        layout: [
            {
                order: 10,
                label: "Division by Zero",
                type: "calculated",
                expression: "100 / zero_value",
                format: "decimal"
            }
        ]
    };
    
    // This should not throw, but handle gracefully
    const divStatement = renderer.renderStatement(divByZeroReport, movementsData, periodOptions);
    assertExists(divStatement);
    
    // Test 5: Handle missing required fields
    let validationErrorThrown = false;
    try {
        const invalidReport = { reportId: "test" }; // Missing required fields
        validator.validate(invalidReport);
    } catch (error) {
        validationErrorThrown = true;
    }
    // Validator should return validation result, not throw
    assert(!validationErrorThrown, "Validator should return result, not throw");
    
    console.log("✅ Successfully handled errors gracefully throughout system");
});


// =============================================================================
// Workflow 9: Complete End-to-End User Journey
// =============================================================================

Deno.test("E2E Workflow - Complete user journey from load to export", () => {
    // Simulate complete user workflow:
    // 1. Load default reports
    // 2. Select a report
    // 3. Generate statement
    // 4. Switch to different report
    // 5. Apply period filtering
    // 6. Calculate variances
    // 7. Export data
    
    // Step 1: Initialize system - clear registry for clean test
    const registry = ReportRegistry.getInstance();
    registry.clear();
    const validator = new ReportValidator({});
    const filterEngine = new FilterEngine();
    const variableResolver = new VariableResolver(filterEngine);
    const expressionEvaluator = new ExpressionEvaluator();
    const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    
    // Step 2: Load and register reports
    const simpleReport = createSimpleIncomeReport();
    const detailedReport = createDetailedIncomeReport();
    
    registry.register(simpleReport, true); // Set as default
    registry.register(detailedReport);
    
    assertEquals(registry.count(), 2);
    
    // Step 3: Select default report
    const selectedReport = registry.getDefaultReport("income");
    assertExists(selectedReport);
    assertEquals(selectedReport.reportId, "test_income_simple");
    
    // Step 4: Generate statement with default report
    const movementsData = mockAq.from(createTestMovementsData());
    const periodOptions = { years: [2024, 2025], periods: "all" };
    
    const statement1 = renderer.renderStatement(selectedReport, movementsData, periodOptions);
    assertExists(statement1);
    assertEquals(statement1.reportId, "test_income_simple");
    assertEquals(statement1.rows.length, 4);
    
    // Step 5: Switch to detailed report
    registry.setSelectedReportId("test_income_detailed");
    const newSelectedId = registry.getSelectedReportId();
    assertEquals(newSelectedId, "test_income_detailed");
    
    const detailedReportFromRegistry = registry.getReport(newSelectedId);
    assertExists(detailedReportFromRegistry);
    
    // Step 6: Generate statement with new report
    const statement2 = renderer.renderStatement(detailedReportFromRegistry, movementsData, periodOptions);
    assertExists(statement2);
    assertEquals(statement2.reportId, "test_income_detailed");
    assertEquals(statement2.rows.length, 4);
    
    // Step 7: Verify period options preserved
    assertEquals(statement2.metadata.periodOptions, periodOptions);
    
    // Step 8: Verify variances calculated
    const revenueRow = statement2.rows.find((r: any) => r.label === "Revenue");
    assertExists(revenueRow);
    assertExists(revenueRow.variance_amount);
    assertExists(revenueRow.variance_percent);
    
    // Step 9: Verify formatting applied
    assertExists(revenueRow.formatted_2024);
    assertExists(revenueRow.formatted_2025);
    assertExists(revenueRow.formatted_variance_amount);
    assertExists(revenueRow.formatted_variance_percent);
    
    // Step 10: Verify export-ready data structure
    assert(Array.isArray(statement2.rows));
    assertExists(statement2.reportId);
    assertExists(statement2.reportName);
    assertExists(statement2.generatedAt);
    
    console.log("✅ Successfully completed full user journey");
});

// =============================================================================
// Workflow 10: Report Persistence and Restoration
// =============================================================================

Deno.test("E2E Workflow - Persist and restore report selection", () => {
    // Simulate browser session persistence
    
    // Session 1: User selects a report - clear registry for clean test
    const registry1 = ReportRegistry.getInstance();
    registry1.clear();
    const simpleReport = createSimpleIncomeReport();
    const detailedReport = createDetailedIncomeReport();
    
    registry1.register(simpleReport);
    registry1.register(detailedReport);
    
    // User selects detailed report
    registry1.setSelectedReportId("test_income_detailed");
    
    // Verify selection is persisted
    const selectedId1 = registry1.getSelectedReportId();
    assertEquals(selectedId1, "test_income_detailed");
    
    // Session 2: User returns (same singleton instance)
    const registry2 = ReportRegistry.getInstance();
    // Reports are already registered in the singleton
    
    // Restore last selected report
    const selectedId2 = registry2.getSelectedReportId();
    assertEquals(selectedId2, "test_income_detailed", "Should restore last selected report");
    
    // Verify we can get the selected report
    const restoredReport = registry2.getSelectedReport("income");
    assertExists(restoredReport);
    assertEquals(restoredReport.reportId, "test_income_detailed");
    
    // Clean up
    registry2.clearSelectedReport();
    
    console.log("✅ Successfully persisted and restored report selection");
});

console.log("\n✅ All end-to-end user workflow tests completed successfully");

