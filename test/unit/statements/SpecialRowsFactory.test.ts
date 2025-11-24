/**
 * Tests for SpecialRowsFactory and related classes
 */

// @ts-nocheck - Test file with dynamic mock objects
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import SpecialRowsFactory from "../../../src/statements/specialrows/SpecialRowsFactory.js";
import BalanceSheetSpecialRows from "../../../src/statements/specialrows/BalanceSheetSpecialRows.js";
import IncomeStatementSpecialRows from "../../../src/statements/specialrows/IncomeStatementSpecialRows.js";

// Mock Arquero table for testing
const createMockTable = (data) => ({
    objects: () => data
});

Deno.test("SpecialRowsFactory.create - returns BalanceSheetSpecialRows for BS", () => {
    const handler = SpecialRowsFactory.create('BS');
    assertEquals(handler instanceof BalanceSheetSpecialRows, true);
});

Deno.test("SpecialRowsFactory.create - returns IncomeStatementSpecialRows for IS", () => {
    const handler = SpecialRowsFactory.create('IS');
    assertEquals(handler instanceof IncomeStatementSpecialRows, true);
});

Deno.test("SpecialRowsFactory.create - returns NoSpecialRows for unknown type", () => {
    const handler = SpecialRowsFactory.create('CF');
    assertEquals(typeof handler.insert, 'function');
});

Deno.test("SpecialRowsFactory.create - NoSpecialRows returns data unchanged", () => {
    const handler = SpecialRowsFactory.create('CF');
    const data = [{ test: true }];
    const result = handler.insert(data, {});
    assertEquals(result, data);
});

// BalanceSheetSpecialRows Tests

Deno.test("BalanceSheetSpecialRows.calculateTotalAssets - sums asset categories", () => {
    const handler = new BalanceSheetSpecialRows();
    const totals = [
        { name1: 'Materiële vaste activa', amount_2024: 1000, amount_2025: 1100 },
        { name1: 'Voorraden', amount_2024: 500, amount_2025: 550 },
        { name1: 'eigen vermogen', amount_2024: 800, amount_2025: 850 }
    ];

    const result = handler.calculateTotalAssets(totals);

    assertEquals(result.year1, 1500); // 1000 + 500
    assertEquals(result.year2, 1650); // 1100 + 550
});

Deno.test("BalanceSheetSpecialRows.calculateTotalLiabilitiesEquity - sums liability categories", () => {
    const handler = new BalanceSheetSpecialRows();
    const totals = [
        { name1: 'Materiële vaste activa', amount_2024: 1000, amount_2025: 1100 },
        { name1: 'eigen vermogen', amount_2024: 800, amount_2025: 850 },
        { name1: 'korte termijn schulden', amount_2024: 200, amount_2025: 250 }
    ];

    const result = handler.calculateTotalLiabilitiesEquity(totals);

    assertEquals(result.year1, 1000); // 800 + 200
    assertEquals(result.year2, 1100); // 850 + 250
});

Deno.test("BalanceSheetSpecialRows.createTotalAssetsRow - creates correct row", () => {
    const handler = new BalanceSheetSpecialRows();
    const totals = { year1: 1000, year2: 1200 };

    const row = handler.createTotalAssetsRow(totals, '2024', '2025');

    assertEquals(row.label, 'Totaal activa');
    assertEquals(row.amount_2024, 1000);
    assertEquals(row.amount_2025, 1200);
    assertEquals(row.variance_amount, 200);
    assertEquals(row.variance_percent, 20);
    assertEquals(row._rowType, 'total');
    assertEquals(row._isMetric, true);
});

Deno.test("BalanceSheetSpecialRows.createTotalPassivaRow - creates correct row", () => {
    const handler = new BalanceSheetSpecialRows();
    const totals = { year1: 1000, year2: 1200 };

    const row = handler.createTotalPassivaRow(totals, '2024', '2025');

    assertEquals(row.label, 'Totaal passiva');
    assertEquals(row.amount_2024, 1000);
    assertEquals(row.amount_2025, 1200);
    assertEquals(row.variance_amount, 200);
    assertEquals(row.variance_percent, 20);
    assertEquals(row._rowType, 'total');
});

Deno.test("BalanceSheetSpecialRows.createSpacerRow - creates spacer row", () => {
    const handler = new BalanceSheetSpecialRows();
    const spacer = handler.createSpacerRow('TEST_SPACER');

    assertEquals(spacer.label, '');
    assertEquals(spacer.amount_2024, null);
    assertEquals(spacer.amount_2025, null);
    assertEquals(spacer._rowType, 'spacer');
    assertEquals(spacer.hierarchy[0], 'TEST_SPACER');
});

Deno.test("BalanceSheetSpecialRows.insert - inserts total rows and spacer", () => {
    const handler = new BalanceSheetSpecialRows();
    const data = [
        { name0: 'vaste activa', name1: 'Materiële vaste activa', label: 'Materiële vaste activa' },
        { name0: 'eigen vermogen', name1: 'eigen vermogen', label: 'eigen vermogen' }
    ];
    const statementData = {
        totals: createMockTable([
            { name1: 'Materiële vaste activa', amount_2024: 1000, amount_2025: 1100 },
            { name1: 'eigen vermogen', amount_2024: 800, amount_2025: 850 }
        ])
    };

    const result = handler.insert(data, statementData);

    // Should insert Totaal activa, spacer before liabilities, and Totaal passiva at end
    assertEquals(result.length > data.length, true);

    // Check for Totaal activa
    const totalActivaRow = result.find(r => r.label === 'Totaal activa');
    assertExists(totalActivaRow);

    // Check for spacer
    const spacerRow = result.find(r => r._rowType === 'spacer');
    assertExists(spacerRow);

    // Check for Totaal passiva
    const totalPassivaRow = result.find(r => r.label === 'Totaal passiva');
    assertExists(totalPassivaRow);
});

// IncomeStatementSpecialRows Tests

Deno.test("IncomeStatementSpecialRows.findCogsIndex - finds COGS row", () => {
    const handler = new IncomeStatementSpecialRows();
    const data = [
        { label: 'Netto-omzet' },
        { label: 'Kostprijs van de omzet' },
        { label: 'Personeelskosten' }
    ];

    const index = handler.findCogsIndex(data);
    assertEquals(index, 1);
});

Deno.test("IncomeStatementSpecialRows.findCogsIndex - returns -1 when not found", () => {
    const handler = new IncomeStatementSpecialRows();
    const data = [
        { label: 'Netto-omzet' },
        { label: 'Personeelskosten' }
    ];

    const index = handler.findCogsIndex(data);
    assertEquals(index, -1);
});

Deno.test("IncomeStatementSpecialRows.createBrutoMargeRow - creates correct row", () => {
    const handler = new IncomeStatementSpecialRows();
    const amounts = { '2024': 1000, '2025': 1200 };

    const row = handler.createBrutoMargeRow(amounts, '2024', '2025');

    assertEquals(row.label, 'Bruto marge');
    assertEquals(row.amount_2024, 1000);
    assertEquals(row.amount_2025, 1200);
    assertEquals(row.variance_amount, 200);
    assertEquals(row.variance_percent, 20);
    assertEquals(row._rowType, 'metric');
});

Deno.test("IncomeStatementSpecialRows.createOperatingIncomeRow - creates correct row", () => {
    const handler = new IncomeStatementSpecialRows();
    const amounts = { '2024': 500, '2025': 550 };

    const row = handler.createOperatingIncomeRow(amounts, '2024', '2025');

    assertEquals(row.label, 'Operating Income');
    assertEquals(row.amount_2024, 500);
    assertEquals(row.amount_2025, 550);
    assertEquals(row._rowType, 'metric');
});

Deno.test("IncomeStatementSpecialRows.createResultaatNaBelastingenRow - creates correct row", () => {
    const handler = new IncomeStatementSpecialRows();
    const amounts = { '2024': 300, '2025': 350 };

    const row = handler.createResultaatNaBelastingenRow(amounts, '2024', '2025');

    assertEquals(row.label, 'Resultaat na belastingen');
    assertEquals(row.amount_2024, 300);
    assertEquals(row.amount_2025, 350);
    assertEquals(row._rowType, 'total');
});

Deno.test("IncomeStatementSpecialRows.insert - inserts metric rows", () => {
    const handler = new IncomeStatementSpecialRows();
    const data = [
        { label: 'Netto-omzet' },
        { label: 'Kostprijs van de omzet' },
        { label: 'Bedrijfslasten', code1: '520' },
        { label: 'Personeelskosten' }
    ];
    const statementData = {
        metrics: {
            grossProfit: { '2024': 1000, '2025': 1100 },
            operatingIncome: { '2024': 500, '2025': 550 },
            netIncome: { '2024': 300, '2025': 350 }
        }
    };

    const result = handler.insert(data, statementData);

    // Should insert Bruto marge, spacer, and NET INCOME
    assertEquals(result.length > data.length, true);

    // Check for Bruto marge
    const brutoMargeRow = result.find(r => r.label === 'Bruto marge');
    assertExists(brutoMargeRow);

    // Check for Resultaat na belastingen
    const netIncomeRow = result.find(r => r.label === 'Resultaat na belastingen');
    assertExists(netIncomeRow);
});

Deno.test("IncomeStatementSpecialRows.insert - returns unchanged when no metrics", () => {
    const handler = new IncomeStatementSpecialRows();
    const data = [{ label: 'Test' }];
    const statementData = {};

    const result = handler.insert(data, statementData);
    assertEquals(result, data);
});

Deno.test("IncomeStatementSpecialRows.insert - handles missing gross profit", () => {
    const handler = new IncomeStatementSpecialRows();
    const data = [
        { label: 'Netto-omzet' },
        { label: 'Kostprijs van de omzet' }
    ];
    const statementData = {
        metrics: {
            netIncome: { '2024': 300, '2025': 350 }
        }
    };

    const result = handler.insert(data, statementData);

    // Should still insert Resultaat na belastingen but not Bruto marge
    const netIncomeRow = result.find(r => r.label === 'Resultaat na belastingen');
    assertExists(netIncomeRow);

    const brutoMargeRow = result.find(r => r.label === 'Bruto marge');
    assertEquals(brutoMargeRow, undefined);
});
