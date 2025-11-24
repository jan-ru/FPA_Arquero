/**
 * Tests for ColumnDefBuilder
 */

// @ts-nocheck - Test file with DOM mocking
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ColumnDefBuilder from "../../../src/ui/columns/ColumnDefBuilder.js";

Deno.test("ColumnDefBuilder - constructor sets properties", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');

    assertEquals(builder.statementType, 'BS');
    assertEquals(builder.year1, '2024');
    assertEquals(builder.year2, '2025');
});

Deno.test("ColumnDefBuilder.setFormatters - sets formatter functions", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const mockFormat = (v) => `$${v}`;
    const mockRenderer = (p) => p.value;

    builder.setFormatters(mockFormat, mockRenderer);

    assertEquals(builder.formatCurrency, mockFormat);
    assertEquals(builder.varianceRenderer, mockRenderer);
});

Deno.test("ColumnDefBuilder.buildCategoryColumn - creates category column", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildCategoryColumn();

    assertEquals(column.field, 'label');
    assertEquals(column.headerName, 'Category');
    assertEquals(column.minWidth, 400);
    assertExists(column.cellRenderer);
    assertExists(column.cellClass);
});

Deno.test("ColumnDefBuilder.buildCategoryColumn - cellRenderer creates indentation", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildCategoryColumn();

    const params = {
        data: { level: 2, label: 'Test Label' }
    };

    const result = column.cellRenderer(params);

    // Should have indentation (8 non-breaking spaces for level 2)
    assertEquals(result.includes('Test Label'), true);
    assertEquals(result.startsWith('&nbsp;'), true);
});

Deno.test("ColumnDefBuilder.buildCategoryColumn - cellClass based on level", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildCategoryColumn();

    const params0 = { data: { level: 0 } };
    const params1 = { data: { level: 1 } };

    assertEquals(column.cellClass(params0), 'group-cell');
    assertEquals(column.cellClass(params1), 'detail-cell');
});

Deno.test("ColumnDefBuilder.buildAmountColumn - creates amount column", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildAmountColumn('amount_2024', '2024');

    assertEquals(column.field, 'amount_2024');
    assertEquals(column.headerName, '2024');
    assertEquals(column.type, 'numericColumn');
    assertEquals(column.cellClass, 'number-cell');
    assertExists(column.valueFormatter);
});

Deno.test("ColumnDefBuilder.buildVarianceAmountColumn - creates variance amount column", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVarianceAmountColumn('variance_amount', false);

    assertEquals(column.field, 'variance_amount');
    assertEquals(column.headerName, 'Var €');
    assertEquals(column.type, 'numericColumn');
    assertEquals(column.hide, false);
    assertExists(column.valueFormatter);
    assertExists(column.cellRenderer);
});

Deno.test("ColumnDefBuilder.buildVarianceAmountColumn - can be hidden", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVarianceAmountColumn('variance_amount_1', true);

    assertEquals(column.hide, true);
});

Deno.test("ColumnDefBuilder.buildVariancePercentColumn - creates variance percent column", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVariancePercentColumn('variance_percent', false);

    assertEquals(column.field, 'variance_percent');
    assertEquals(column.headerName, 'Var %');
    assertEquals(column.type, 'numericColumn');
    assertEquals(column.hide, false);
    assertExists(column.valueFormatter);
});

Deno.test("ColumnDefBuilder.buildVariancePercentColumn - valueFormatter handles spacer rows", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVariancePercentColumn('variance_percent', false);

    const spacerParams = {
        data: { _rowType: 'spacer' },
        value: 10.5
    };

    assertEquals(column.valueFormatter(spacerParams), '');
});

Deno.test("ColumnDefBuilder.buildVariancePercentColumn - valueFormatter formats percent", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVariancePercentColumn('variance_percent', false);

    const params = {
        data: { _rowType: 'detail' },
        value: 15.678
    };

    assertEquals(column.valueFormatter(params), '15.7%');
});

Deno.test("ColumnDefBuilder.buildVariancePercentColumn - valueFormatter handles null", () => {
    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const column = builder.buildVariancePercentColumn('variance_percent', false);

    const params = {
        data: { _rowType: 'detail' },
        value: null
    };

    assertEquals(column.valueFormatter(params), '-');
});

Deno.test("ColumnDefBuilder.build - creates basic columns without variance", () => {
    // Mock DOM for getPeriodLabel
    globalThis.document = {
        getElementById: (id) => null
    };

    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const columns = builder.build();

    // Should have 3 columns: Category, Amount 2024, Amount 2025
    assertEquals(columns.length, 3);
    assertEquals(columns[0].field, 'label');
    assertEquals(columns[1].field, 'amount_2024');
    assertEquals(columns[2].field, 'amount_2025');

    // Cleanup
    delete globalThis.document;
});

Deno.test("ColumnDefBuilder.getPeriodLabel - returns year when no dropdown", () => {
    globalThis.document = {
        getElementById: (id) => null
    };

    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const label = builder.getPeriodLabel('2024');

    assertEquals(label, '2024');

    delete globalThis.document;
});

Deno.test("ColumnDefBuilder.getPeriodLabel - returns dropdown text with view indicator", () => {
    globalThis.document = {
        getElementById: (id) => {
            if (id === 'period-selector') {
                return {
                    selectedIndex: 0,
                    options: [{ text: 'All (Year-to-Date)' }]
                };
            }
            if (id === 'view-type') {
                return {
                    value: 'cumulative'
                };
            }
            return null;
        }
    };

    const builder = new ColumnDefBuilder('BS', '2024', '2025');
    const label = builder.getPeriodLabel('2024');

    assertEquals(label, '2024 All (Σ)');

    delete globalThis.document;
});
