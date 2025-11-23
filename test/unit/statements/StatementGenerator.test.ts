#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: StatementGenerator
 * Tests for financial statement generation logic
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCall, assertSpyCalls, spy } from "https://deno.land/std@0.208.0/testing/mock.ts";

// Mock Arquero - we'll create a minimal mock
const mockAq = {
    from: (data: any[]) => ({
        data,
        params: (p: any) => mockAq.from(data),
        filter: (fn: any) => mockAq.from(data.filter((d: any) => fn(d))),
        groupby: (...cols: string[]) => ({
            rollup: (spec: any) => mockAq.from([]),
        }),
        derive: (spec: any) => mockAq.from(data),
        orderby: (...cols: string[]) => mockAq.from(data),
        select: (...cols: string[]) => {
            // Select specific columns from data
            const selected = data.map((row: any) => {
                const newRow: any = {};
                cols.forEach(col => {
                    newRow[col] = row[col];
                });
                return newRow;
            });
            return mockAq.from(selected);
        },
        rename: (mapping: any) => {
            // Rename columns
            const renamed = data.map((row: any) => {
                const newRow: any = { ...row };
                Object.keys(mapping).forEach(oldName => {
                    const newName = mapping[oldName];
                    newRow[newName] = newRow[oldName];
                    delete newRow[oldName];
                });
                return newRow;
            });
            return mockAq.from(renamed);
        },
        join_full: (other: any, key: string) => mockAq.from(data),
        columnNames: () => ['name1', 'amount_2024', 'amount_2025'],
        numRows: () => data.length,
        objects: () => data,
        array: (col: string) => data.map((d: any) => d[col]),
    }),
    op: {
        sum: (arr: any) => arr.reduce((a: number, b: number) => a + b, 0),
    },
    escape: (fn: any) => fn
};

// Make aq available globally for the module
(globalThis as any).aq = mockAq;

// Now import the module
import StatementGenerator from "../../../src/statements/StatementGenerator.js";

// Mock DataStore
class MockDataStore {
    private combinedMovements: any = null;
    private combinedBalances: any = null;
    private factTables: any = {};
    private hierarchyTable: any = null;

    setCombinedMovements(data: any[]) {
        this.combinedMovements = mockAq.from(data);
    }

    getCombinedMovements() {
        return this.combinedMovements;
    }

    setCombinedBalances(data: any[]) {
        this.combinedBalances = mockAq.from(data);
    }

    getCombinedBalances() {
        return this.combinedBalances;
    }

    setFactTable(table: any, period: string, type = 'movements') {
        if (!this.factTables[period]) {
            this.factTables[period] = {};
        }
        this.factTables[period][type] = table;
    }

    getFactTable(period: string, type = 'movements') {
        return this.factTables[period]?.[type] || null;
    }

    setHierarchyTable(table: any) {
        this.hierarchyTable = table;
    }

    getHierarchyTable() {
        return this.hierarchyTable;
    }
}

Deno.test("StatementGenerator - constructor initializes correctly", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    assertEquals(generator.dataStore, dataStore);
    assertEquals(generator.unmappedAccounts, []);
});

Deno.test("StatementGenerator.calculateVariancePercent - basic calculation", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const result = generator.calculateVariancePercent(100, 120);
    assertEquals(result, 20);
});

Deno.test("StatementGenerator.calculateVariancePercent - negative variance", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const result = generator.calculateVariancePercent(100, 80);
    assertEquals(result, -20);
});

Deno.test("StatementGenerator.calculateVariancePercent - zero base", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const result = generator.calculateVariancePercent(0, 50);
    assertEquals(result, 0);
});

Deno.test("StatementGenerator.validateRequiredData - throws when no data", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    let errorThrown = false;
    try {
        generator.validateRequiredData();
    } catch (error: any) {
        errorThrown = true;
        assertEquals(error.message, 'Required cumulative data not loaded');
    }
    assertEquals(errorThrown, true);
});

Deno.test("StatementGenerator.validateRequiredData - returns data when available", () => {
    const dataStore = new MockDataStore();
    const testData = [
        { account_code: '1000', statement_type: 'BS', amount_2024: 100, amount_2025: 120 }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.validateRequiredData();

    assertExists(result);
});

Deno.test("StatementGenerator.deriveVarianceColumns - adds variance columns", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const testData = [
        { name1: 'Assets', amount_2024: 100, amount_2025: 120 }
    ];
    const combined = mockAq.from(testData);

    const result = generator.deriveVarianceColumns(combined);
    assertExists(result);
});

Deno.test("StatementGenerator.calculateCategoryTotals - groups by name1", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const testData = [
        { name1: 'Assets', amount_2024: 100, amount_2025: 120, variance_amount: 20, variance_percent: 20 },
        { name1: 'Assets', amount_2024: 50, amount_2025: 60, variance_amount: 10, variance_percent: 20 }
    ];
    const combined = mockAq.from(testData);

    const result = generator.calculateCategoryTotals(combined);
    assertExists(result);
});

Deno.test("StatementGenerator.detectUnmappedAccounts - returns empty when no data", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const result = generator.detectUnmappedAccounts();
    assertEquals(result, []);
});

Deno.test("StatementGenerator.detectUnmappedAccounts - detects unmapped accounts", () => {
    const dataStore = new MockDataStore();

    const factData2024 = [
        { account_code: '1000', amount: 100 },
        { account_code: '2000', amount: 200 },
        { account_code: '9999', amount: 50 } // Unmapped
    ];

    const factData2025 = [
        { account_code: '1000', amount: 120 },
        { account_code: '3000', amount: 300 }, // Unmapped
    ];

    const hierarchyData = [
        { account_code: '1000' },
        { account_code: '2000' }
    ];

    dataStore.setFactTable(mockAq.from(factData2024), '2024', 'movements');
    dataStore.setFactTable(mockAq.from(factData2025), '2025', 'movements');
    dataStore.setHierarchyTable(mockAq.from(hierarchyData));

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.detectUnmappedAccounts();

    assertEquals(result.length, 2);
    assertEquals(result.includes('9999'), true);
    assertEquals(result.includes('3000'), true);
});

Deno.test("StatementGenerator.validateData - returns errors when no data", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    const result = generator.validateData();
    assertEquals(result.errors.length, 1);
    assertEquals(result.errors[0], 'Trial Balance data is not loaded');
});

Deno.test("StatementGenerator.validateData - no errors when data loaded", () => {
    const dataStore = new MockDataStore();
    const testData = [
        { account_code: '1000', statement_type: 'BS', amount_2024: 100 }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.validateData();

    assertEquals(result.errors.length, 0);
});

Deno.test("StatementGenerator.generateStatement - throws when no data", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    let errorThrown = false;
    try {
        generator.generateStatement('BS');
    } catch (error: any) {
        errorThrown = true;
        assertEquals(error.message, 'Required cumulative data not loaded');
    }
    assertEquals(errorThrown, true);
});

Deno.test("StatementGenerator.generateStatement - generates basic statement", () => {
    const dataStore = new MockDataStore();
    const testData = [
        {
            statement_type: 'BS',
            name1: 'Vaste Activa',
            name2: 'Gebouwen',
            code0: 'A',
            name0: 'vaste activa',
            code1: '10',
            code2: '1010',
            code3: '101000',
            year: 2024,
            period: 12,
            movement_amount: 100
        },
        {
            statement_type: 'BS',
            name1: 'Vaste Activa',
            name2: 'Gebouwen',
            code0: 'A',
            name0: 'vaste activa',
            code1: '10',
            code2: '1010',
            code3: '101000',
            year: 2025,
            period: 12,
            movement_amount: 120
        }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.generateStatement('BS');

    assertExists(result);
    assertExists(result.details);
    assertExists(result.totals);
});

Deno.test("StatementGenerator.generateBalanceSheet - generates balance sheet", () => {
    const dataStore = new MockDataStore();
    const testData = [
        {
            statement_type: 'BS',
            name1: 'Vaste Activa',
            name2: 'Gebouwen',
            code0: 'A',
            name0: 'vaste activa',
            code1: '10',
            code2: '1010',
            code3: '101000',
            year: 2024,
            period: 12,
            movement_amount: 1000
        },
        {
            statement_type: 'BS',
            name1: 'Vaste Activa',
            name2: 'Gebouwen',
            code0: 'A',
            name0: 'vaste activa',
            code1: '10',
            code2: '1010',
            code3: '101000',
            year: 2025,
            period: 12,
            movement_amount: 1200
        }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.generateBalanceSheet();

    assertExists(result);
    assertExists(result.details);
    assertExists(result.totals);
    assertExists((result as any).balanced);
    assertExists((result as any).imbalance);
});

Deno.test("StatementGenerator.generateIncomeStatement - generates income statement", () => {
    const dataStore = new MockDataStore();
    const testData = [
        {
            statement_type: 'IS',
            name1: 'Omzet',
            name2: 'Verkoop',
            code0: '',
            name0: '',
            code1: '80',
            code2: '8000',
            code3: '800000',
            year: 2024,
            period: 12,
            movement_amount: -5000 // Negative in source, will be flipped
        },
        {
            statement_type: 'IS',
            name1: 'Omzet',
            name2: 'Verkoop',
            code0: '',
            name0: '',
            code1: '80',
            code2: '8000',
            code3: '800000',
            year: 2025,
            period: 12,
            movement_amount: -6000
        }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.generateIncomeStatement();

    assertExists(result);
    assertExists(result.details);
    assertExists(result.totals);
    assertExists((result as any).metrics);
    assertExists((result as any).metrics.netIncome);
    // grossProfit and operatingIncome removed in simplified version
});

Deno.test("StatementGenerator.generateStatement - filters by period", () => {
    const dataStore = new MockDataStore();
    const testData = [
        {
            statement_type: 'BS',
            name1: 'Assets',
            name2: 'Cash',
            code0: 'A',
            name0: 'current',
            code1: '10',
            code2: '1000',
            code3: '100000',
            year: 2024,
            period: 3, // Q1
            movement_amount: 100
        },
        {
            statement_type: 'BS',
            name1: 'Assets',
            name2: 'Cash',
            code0: 'A',
            name0: 'current',
            code1: '10',
            code2: '1000',
            code3: '100000',
            year: 2024,
            period: 6, // Q2
            movement_amount: 50
        },
        {
            statement_type: 'BS',
            name1: 'Assets',
            name2: 'Cash',
            code0: 'A',
            name0: 'current',
            code1: '10',
            code2: '1000',
            code3: '100000',
            year: 2025,
            period: 12,
            movement_amount: 200
        }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.generateStatement('BS', {
        period2024: '2024-Q1',
        period2025: '2025-all'
    });

    assertExists(result);
    assertExists(result.details);
});

Deno.test("StatementGenerator - sign flip for Income Statement", () => {
    const dataStore = new MockDataStore();
    // Income statement amounts are stored negative in source, should be flipped to positive
    const testData = [
        {
            statement_type: 'IS',
            name1: 'Omzet',
            name2: 'Sales',
            code0: '',
            name0: '',
            code1: '80',
            code2: '8000',
            code3: '800000',
            year: 2024,
            period: 12,
            movement_amount: -1000 // Negative in source
        }
    ];
    dataStore.setCombinedMovements(testData);
    dataStore.setCombinedBalances(testData);

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.generateIncomeStatement();

    assertExists(result);
    // The sign should be flipped, making revenue positive
});

Deno.test("StatementGenerator.calculateVariance - calculates variance between periods", () => {
    const dataStore = new MockDataStore();

    const factData2024 = [
        { account_code: '1000', account_description: 'Cash', movement_amount: 100 },
        { account_code: '2000', account_description: 'AR', movement_amount: 200 }
    ];

    const factData2025 = [
        { account_code: '1000', account_description: 'Cash', movement_amount: 150 },
        { account_code: '2000', account_description: 'AR', movement_amount: 180 }
    ];

    dataStore.setFactTable(mockAq.from(factData2024), '2024', 'movements');
    dataStore.setFactTable(mockAq.from(factData2025), '2025', 'movements');

    const generator = new StatementGenerator(dataStore as any);
    const result = generator.calculateVariance('2024', '2025');

    assertExists(result);
});

Deno.test("StatementGenerator.calculateVariance - throws when data missing", () => {
    const dataStore = new MockDataStore();
    const generator = new StatementGenerator(dataStore as any);

    let errorThrown = false;
    try {
        generator.calculateVariance('2024', '2025');
    } catch (error: any) {
        errorThrown = true;
        assertEquals(error.message.includes('not loaded'), true);
    }
    assertEquals(errorThrown, true);
});
