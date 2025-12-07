/**
 * Tests for AgGridStatementRenderer - Configurable Report Support
 */

// @ts-nocheck - Test file with DOM mocking
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import AgGridStatementRenderer from "../../../src/ui/AgGridStatementRenderer.ts";

Deno.test("AgGridStatementRenderer._prepareConfigurableReportData - transforms report rows to grid format", () => {
    // Mock DOM
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const statementData = {
        rows: [
            {
                order: 10,
                label: 'Revenue',
                type: 'variable',
                style: 'normal',
                indent: 0,
                amount_2024: 100000,
                amount_2025: 120000,
                variance_amount: 20000,
                variance_percent: 20.0,
                formatted_2024: '€100,000',
                formatted_2025: '€120,000',
                formatted_variance_amount: '€20,000',
                formatted_variance_percent: '20.0%',
                _metadata: { variable: 'revenue' }
            },
            {
                order: 20,
                label: 'Expenses',
                type: 'variable',
                style: 'normal',
                indent: 0,
                amount_2024: -60000,
                amount_2025: -70000,
                variance_amount: -10000,
                variance_percent: 16.7,
                formatted_2024: '€-60,000',
                formatted_2025: '€-70,000',
                formatted_variance_amount: '€-10,000',
                formatted_variance_percent: '16.7%',
                _metadata: { variable: 'expenses' }
            },
            {
                order: 30,
                label: 'Net Income',
                type: 'calculated',
                style: 'total',
                indent: 0,
                amount_2024: 40000,
                amount_2025: 50000,
                variance_amount: 10000,
                variance_percent: 25.0,
                formatted_2024: '€40,000',
                formatted_2025: '€50,000',
                formatted_variance_amount: '€10,000',
                formatted_variance_percent: '25.0%',
                _metadata: { expression: 'revenue + expenses' }
            }
        ],
        metadata: {
            reportId: 'income_simple',
            reportName: 'Simple Income Statement',
            reportVersion: '1.0.0'
        }
    };

    const gridData = renderer._prepareConfigurableReportData(statementData);

    // Verify transformation
    assertEquals(gridData.length, 3);

    // Check first row
    assertEquals(gridData[0].order, 10);
    assertEquals(gridData[0].label, 'Revenue');
    assertEquals(gridData[0].type, 'variable');
    assertEquals(gridData[0].style, 'normal');
    assertEquals(gridData[0].indent, 0);
    assertEquals(gridData[0].amount_2024, 100000);
    assertEquals(gridData[0].amount_2025, 120000);
    assertEquals(gridData[0]._rowType, 'normal'); // style becomes _rowType
    assertEquals(gridData[0].level, 0); // indent becomes level for backward compatibility

    // Check total row
    assertEquals(gridData[2].style, 'total');
    assertEquals(gridData[2]._rowType, 'total');

    // Cleanup
    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer._prepareConfigurableReportData - handles spacer rows", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const statementData = {
        rows: [
            {
                order: 10,
                label: 'Revenue',
                type: 'variable',
                style: 'normal',
                indent: 0,
                amount_2024: 100000,
                amount_2025: 120000
            },
            {
                order: 20,
                type: 'spacer',
                style: 'spacer',
                indent: 0,
                amount_2024: null,
                amount_2025: null
            }
        ],
        metadata: {}
    };

    const gridData = renderer._prepareConfigurableReportData(statementData);

    assertEquals(gridData.length, 2);
    assertEquals(gridData[1].type, 'spacer');
    assertEquals(gridData[1].style, 'spacer');
    assertEquals(gridData[1]._rowType, 'spacer');

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer._prepareConfigurableReportData - handles different indent levels", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const statementData = {
        rows: [
            {
                order: 10,
                label: 'Category',
                type: 'category',
                style: 'normal',
                indent: 0,
                amount_2024: 100000,
                amount_2025: 120000
            },
            {
                order: 20,
                label: 'Subcategory',
                type: 'variable',
                style: 'normal',
                indent: 1,
                amount_2024: 50000,
                amount_2025: 60000
            },
            {
                order: 30,
                label: 'Detail',
                type: 'variable',
                style: 'normal',
                indent: 2,
                amount_2024: 25000,
                amount_2025: 30000
            }
        ],
        metadata: {}
    };

    const gridData = renderer._prepareConfigurableReportData(statementData);

    assertEquals(gridData.length, 3);
    assertEquals(gridData[0].indent, 0);
    assertEquals(gridData[0].level, 0);
    assertEquals(gridData[1].indent, 1);
    assertEquals(gridData[1].level, 1);
    assertEquals(gridData[2].indent, 2);
    assertEquals(gridData[2].level, 2);

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer._prepareConfigurableReportData - preserves metadata", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const statementData = {
        rows: [
            {
                order: 10,
                label: 'Revenue',
                type: 'variable',
                style: 'normal',
                indent: 0,
                amount_2024: 100000,
                amount_2025: 120000,
                _metadata: {
                    variable: 'revenue',
                    filter: { code1: '500' }
                }
            }
        ],
        metadata: {}
    };

    const gridData = renderer._prepareConfigurableReportData(statementData);

    assertEquals(gridData.length, 1);
    assertExists(gridData[0]._metadata);
    assertEquals(gridData[0]._metadata.variable, 'revenue');
    assertEquals(gridData[0]._metadata.filter.code1, '500');

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer.prepareDataForGrid - detects configurable report data", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    // Configurable report data (has rows array)
    const configurableData = {
        rows: [
            {
                order: 10,
                label: 'Test',
                type: 'variable',
                style: 'normal',
                indent: 0,
                amount_2024: 100,
                amount_2025: 200
            }
        ],
        metadata: {}
    };

    const gridData = renderer.prepareDataForGrid(configurableData, 'income-statement');

    // Should use configurable path
    assertEquals(gridData.length, 1);
    assertEquals(gridData[0].label, 'Test');

    delete globalThis.document;
});
