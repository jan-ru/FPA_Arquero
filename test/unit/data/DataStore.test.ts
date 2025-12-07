#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: DataStore
 * Tests for singleton state management
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import DataStore from "../../../src/data/DataStore.ts";

// Mock Arquero table
class MockTable {
    constructor(private rowCount: number = 10) {}
    numRows() { return this.rowCount; }
}

Deno.test("DataStore - singleton pattern", () => {
    const store1 = new DataStore();
    const store2 = new DataStore();
    assertEquals(store1, store2, "Should return same instance");
});

Deno.test("DataStore.setFactTable / getFactTable - movements", () => {
    const store = new DataStore();
    store.clear(); // Reset state

    const mockTable = new MockTable(100) as any;
    store.setFactTable(mockTable, '2024', 'movements');

    const retrieved = store.getFactTable('2024', 'movements');
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.setFactTable / getFactTable - balances", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable(50) as any;
    store.setFactTable(mockTable, '2024', 'balances');

    const retrieved = store.getFactTable('2024', 'balances');
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.getFactTable - returns null for non-existent", () => {
    const store = new DataStore();
    store.clear();

    const retrieved = store.getFactTable('2030', 'movements');
    assertEquals(retrieved, null);
});

Deno.test("DataStore.getMovementsTable - shorthand", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable(75) as any;
    store.setFactTable(mockTable, '2025', 'movements');

    const retrieved = store.getMovementsTable('2025');
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.getBalancesTable - shorthand", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable(30) as any;
    store.setFactTable(mockTable, '2025', 'balances');

    const retrieved = store.getBalancesTable('2025');
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.getRowCounts - returns correct counts", () => {
    const store = new DataStore();
    store.clear();

    const movementsTable = new MockTable(100) as any;
    const balancesTable = new MockTable(50) as any;

    store.setFactTable(movementsTable, '2024', 'movements');
    store.setFactTable(balancesTable, '2024', 'balances');

    const counts = store.getRowCounts('2024');
    assertEquals(counts.movements, 100);
    assertEquals(counts.balances, 50);
});

Deno.test("DataStore.getRowCounts - returns zero for missing tables", () => {
    const store = new DataStore();
    store.clear();

    const counts = store.getRowCounts('2030');
    assertEquals(counts.movements, 0);
    assertEquals(counts.balances, 0);
});

Deno.test("DataStore.setHierarchyTable / getHierarchyTable", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable(200) as any;
    store.setHierarchyTable(mockTable);

    const retrieved = store.getHierarchyTable();
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.getAllPeriods - returns loaded periods", () => {
    const store = new DataStore();
    store.clear();

    const mockTable1 = new MockTable() as any;
    const mockTable2 = new MockTable() as any;

    store.setFactTable(mockTable1, '2024', 'movements');
    store.setFactTable(mockTable2, '2025', 'movements');

    const periods = store.getAllPeriods();
    assertEquals(periods.sort(), ['2024', '2025']);
});

Deno.test("DataStore.getAllPeriods - returns empty array when no data", () => {
    const store = new DataStore();
    store.clear();

    const periods = store.getAllPeriods();
    assertEquals(periods, []);
});

Deno.test("DataStore.setCombinedMovements / getCombinedMovements", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable(500) as any;
    store.setCombinedMovements(mockTable);

    const retrieved = store.getCombinedMovements();
    assertEquals(retrieved, mockTable);
});

Deno.test("DataStore.isDataComplete - returns true when all data loaded", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable() as any;

    store.setFactTable(mockTable, '2024', 'movements');
    store.setFactTable(mockTable, '2024', 'balances');
    store.setFactTable(mockTable, '2025', 'movements');
    store.setFactTable(mockTable, '2025', 'balances');
    store.setCombinedMovements(mockTable);
    store.setCombinedBalances(mockTable);

    assertEquals(store.isDataComplete(), true);
});

Deno.test("DataStore.isDataComplete - returns false when missing 2024 movements", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable() as any;

    // Missing 2024 movements
    store.setFactTable(mockTable, '2024', 'balances');
    store.setFactTable(mockTable, '2025', 'movements');
    store.setFactTable(mockTable, '2025', 'balances');
    store.setCombinedMovements(mockTable);

    assertEquals(store.isDataComplete(), false);
});

Deno.test("DataStore.isDataComplete - returns false when missing combined movements", () => {
    const store = new DataStore();
    store.clear();

    const mockTable = new MockTable() as any;

    store.setFactTable(mockTable, '2024', 'movements');
    store.setFactTable(mockTable, '2024', 'balances');
    store.setFactTable(mockTable, '2025', 'movements');
    store.setFactTable(mockTable, '2025', 'balances');
    // Missing combined movements

    assertEquals(store.isDataComplete(), false);
});

Deno.test("DataStore.clear - clears all data", () => {
    const store = new DataStore();

    const mockTable = new MockTable() as any;
    store.setFactTable(mockTable, '2024', 'movements');
    store.setCombinedMovements(mockTable);

    store.clear();

    assertEquals(store.getAllPeriods(), []);
    assertEquals(store.getCombinedMovements(), null);
    assertEquals(store.isDataComplete(), false);
});

Deno.test("DataStore - multiple periods can be stored", () => {
    const store = new DataStore();
    store.clear();

    const table2024 = new MockTable(100) as any;
    const table2025 = new MockTable(150) as any;
    const table2026 = new MockTable(200) as any;

    store.setFactTable(table2024, '2024', 'movements');
    store.setFactTable(table2025, '2025', 'movements');
    store.setFactTable(table2026, '2026', 'movements');

    assertEquals(store.getFactTable('2024', 'movements'), table2024);
    assertEquals(store.getFactTable('2025', 'movements'), table2025);
    assertEquals(store.getFactTable('2026', 'movements'), table2026);
});
