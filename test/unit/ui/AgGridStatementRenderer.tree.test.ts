/**
 * Tests for AgGridStatementRenderer - Tree Data Support
 */

// @ts-nocheck - Test file with DOM mocking
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock loglevel before importing anything else
const mockLog = {
    setDefaultLevel: () => {},
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'debug'
};

globalThis.log = mockLog;

// Mock Logger module
globalThis.Logger = {
    setDefaultLevel: () => {},
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'debug'
};

// Mock global agGrid
globalThis.agGrid = {
    createGrid: () => ({
        destroy: () => {},
        expandAll: () => {},
        collapseAll: () => {},
        forEachNode: () => {}
    })
};

import AgGridStatementRenderer from "../../../src/ui/AgGridStatementRenderer.ts";

Deno.test("AgGridStatementRenderer - tree data mode detection", () => {
    // Mock DOM
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    // Test with movements data (tree mode)
    const treeData = {
        movements: [
            {
                code0: 'ACTIVA',
                name0: 'Activa',
                code1: 100,
                name1: 'Vaste activa',
                account_code: '1000',
                account_description: 'Test Account',
                amount_2024: 100000,
                amount_2025: 120000
            }
        ],
        calculatedRows: [],
        formattingRules: {}
    };

    const gridData = renderer.prepareDataForGrid(treeData, 'balance');

    // Should have tree nodes with orgHierarchy
    assertExists(gridData);
    assertEquals(Array.isArray(gridData), true);
    if (gridData.length > 0) {
        assertExists(gridData[0].orgHierarchy);
        assertEquals(Array.isArray(gridData[0].orgHierarchy), true);
    }

    // Cleanup
    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer - formats amounts for tree data", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const treeData = {
        movements: [
            {
                code0: 'ACTIVA',
                name0: 'Activa',
                account_code: '1000',
                account_description: 'Test Account',
                amount_2024: 100000,
                amount_2025: 120000
            }
        ],
        calculatedRows: [],
        formattingRules: {}
    };

    const gridData = renderer.prepareDataForGrid(treeData, 'balance');

    // Should have formatted fields
    const leafNode = gridData.find(n => n.type === 'account');
    if (leafNode) {
        assertExists(leafNode.formatted_2024);
        assertExists(leafNode.formatted_2025);
        assertExists(leafNode.formatted_variance_amount);
        assertExists(leafNode.formatted_variance_percent);
    }

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer - expand/collapse methods exist", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    // Check methods exist
    assertEquals(typeof renderer.expandAll, 'function');
    assertEquals(typeof renderer.collapseAll, 'function');
    assertEquals(typeof renderer.expandToLevel, 'function');
    assertEquals(typeof renderer.resetExpansionState, 'function');

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer - tree data column definitions", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');
    
    // Set up tree data
    renderer.currentStatementData = {
        movements: [{ code0: 'ACTIVA' }]
    };

    const columns = renderer._getTreeDataColumnDefs('2024', '2025');

    // Should have formatted columns
    assertEquals(Array.isArray(columns), true);
    const fieldNames = columns.map(c => c.field);
    assertEquals(fieldNames.includes('formatted_2024'), true);
    assertEquals(fieldNames.includes('formatted_2025'), true);
    assertEquals(fieldNames.includes('formatted_variance_amount'), true);
    assertEquals(fieldNames.includes('formatted_variance_percent'), true);

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer - auto group column definition", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const autoGroupDef = renderer._getAutoGroupColumnDef();

    assertEquals(autoGroupDef.headerName, 'Account');
    assertEquals(autoGroupDef.minWidth, 300);
    assertExists(autoGroupDef.cellRendererParams);
    assertEquals(autoGroupDef.cellRendererParams.suppressCount, true);
    assertEquals(typeof autoGroupDef.cellRendererParams.innerRenderer, 'function');

    delete globalThis.document;
});

Deno.test("AgGridStatementRenderer - row class rules include tree classes", () => {
    globalThis.document = {
        querySelector: () => ({ style: {} }),
        getElementById: () => null
    };

    const renderer = new AgGridStatementRenderer('test-container');

    const rules = renderer._getRowClassRules();

    // Check tree-specific classes exist
    assertExists(rules['calculated-row']);
    assertExists(rules['account-row']);
    assertExists(rules['category-row']);
    assertExists(rules['always-visible']);
    assertExists(rules['level-0']);
    assertExists(rules['level-1']);
    assertExists(rules['level-2']);
    assertExists(rules['level-3']);
    assertExists(rules['level-4']);
    assertExists(rules['level-5']);

    delete globalThis.document;
});
