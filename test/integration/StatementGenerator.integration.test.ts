/**
 * Integration tests for StatementGenerator with configurable reports
 * 
 * Tests the complete flow of generating statements using report definitions
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import StatementGenerator from "../../src/statements/StatementGenerator.js";
import DataStore from "../../src/data/DataStore.js";

// Mock Arquero
const mockAq = {
    from: (data: any[]) => ({
        numRows: () => data.length,
        columnNames: () => Object.keys(data[0] || {}),
        objects: () => data,
        array: (col: string) => data.map(row => row[col]),
        filter: function(fn: any) { return this; },
        groupby: function(...cols: string[]) { return this; },
        rollup: function(spec: any) { return this; },
        derive: function(spec: any) { return this; },
        select: function(...cols: string[]) { return this; },
        orderby: function(...cols: string[]) { return this; },
        params: function(p: any) { return this; }
    })
};

(globalThis as any).aq = mockAq;

/**
 * Create test data for statements
 */
function createTestData(statementType: string) {
    const data = [];
    const years = [2024, 2025];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (const year of years) {
        for (const period of periods) {
            // Revenue
            data.push({
                statement_type: statementType,
                name1: 'Revenue',
                name2: 'Sales',
                name3: 'Product Sales',
                code0: 'IS',
                name0: 'Income Statement',
                code1: '500',
                code2: '5000',
                code3: '50000',
                account_code: '50000',
                account_description: 'Product Sales',
                year,
                period,
                movement_amount: -10000 * (year - 2023) // Negative for revenue
            });
            
            // COGS
            data.push({
                statement_type: statementType,
                name1: 'Cost of Goods Sold',
                name2: 'Direct Costs',
                name3: 'Materials',
                code0: 'IS',
                name0: 'Income Statement',
                code1: '510',
                code2: '5100',
                code3: '51000',
                account_code: '51000',
                account_description: 'Materials',
                year,
                period,
                movement_amount: 4000 * (year - 2023) // Positive for expenses
            });
        }
    }
    
    return data;
}

/**
 * Create a simple test report definition
 */
function createTestReport(statementType: string) {
    return {
        reportId: `test_${statementType}`,
        name: `Test ${statementType} Statement`,
        version: '1.0.0',
        statementType: statementType,
        variables: [
            {
                id: 'revenue',
                name: 'Revenue',
                filter: { code1: '500' },
                aggregate: 'sum'
            },
            {
                id: 'cogs',
                name: 'Cost of Goods Sold',
                filter: { code1: '510' },
                aggregate: 'sum'
            }
        ],
        layout: [
            {
                order: 10,
                type: 'variable',
                label: 'Revenue',
                variable: 'revenue',
                format: { type: 'currency', decimals: 0 }
            },
            {
                order: 20,
                type: 'variable',
                label: 'Cost of Goods Sold',
                variable: 'cogs',
                format: { type: 'currency', decimals: 0 }
            },
            {
                order: 30,
                type: 'calculated',
                label: 'Gross Profit',
                expression: 'revenue + cogs',
                format: { type: 'currency', decimals: 0 },
                style: 'bold'
            }
        ]
    };
}

Deno.test("StatementGenerator Integration: Generate Income Statement from definition", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.details);
    assertExists(result.rows);
    assertEquals(result.rows.length, 3); // Revenue, COGS, Gross Profit
    
    // Check metadata
    assertExists(result.metadata);
    assertEquals(result.metadata.reportId, 'test_income');
    assertEquals(result.metadata.reportName, 'Test income Statement');
});

Deno.test("StatementGenerator Integration: Generate Balance Sheet from definition", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('BS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('balance');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.details);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Generate Cash Flow from definition", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('CF');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('cashflow');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.details);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Period filtering - All periods", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Period filtering - Specific period", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-6',
        period2025: '2025-6',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Period filtering - Quarter", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-Q1',
        period2025: '2025-Q1',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Variance modes - Amount only", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Amount',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Variance modes - Percent only", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Percent',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Variance modes - None", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'None',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Detail levels - All Levels", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'All Levels'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});

Deno.test("StatementGenerator Integration: Detail levels - Summary Only", () => {
    const dataStore = new DataStore();
    dataStore.clear();
    
    const testData = createTestData('IS');
    dataStore.setCombinedMovements(mockAq.from(testData));
    
    const generator = new StatementGenerator(dataStore as any);
    const report = createTestReport('income');
    
    const options = {
        period2024: '2024-all',
        period2025: '2025-all',
        varianceMode: 'Both',
        detailLevel: 'Summary Only'
    };
    
    const result = generator.generateStatementFromDefinition(report, options);
    
    assertExists(result);
    assertExists(result.rows);
});
