/**
 * Tests for HierarchyBuilder utility
 */

// @ts-nocheck - Test file with dynamic test data
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import HierarchyBuilder from "../../../src/utils/HierarchyBuilder.js";

Deno.test("HierarchyBuilder.getMaxDepth - returns correct depth for each level", () => {
    assertEquals(HierarchyBuilder.getMaxDepth('level0'), 1);
    assertEquals(HierarchyBuilder.getMaxDepth('level1'), 2);
    assertEquals(HierarchyBuilder.getMaxDepth('level2'), 3);
    assertEquals(HierarchyBuilder.getMaxDepth('level3'), 4);
    assertEquals(HierarchyBuilder.getMaxDepth('level4'), 5);
    assertEquals(HierarchyBuilder.getMaxDepth('level5'), 6);
});

Deno.test("HierarchyBuilder.getMaxDepth - defaults to 6 for unknown level", () => {
    assertEquals(HierarchyBuilder.getMaxDepth('unknown'), 6);
    assertEquals(HierarchyBuilder.getMaxDepth(''), 6);
});

Deno.test("HierarchyBuilder.buildPathParts - level 0 (code0 only)", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Test',
        name2: 'Detail'
    };

    const path = HierarchyBuilder.buildPathParts(row, 1);
    assertEquals(path, ['Activa']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 1 (code0 + name0)", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Test',
        name2: 'Detail'
    };

    const path = HierarchyBuilder.buildPathParts(row, 2);
    assertEquals(path, ['Activa', 'vaste activa']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 2 (up to name1)", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Immateriele vaste activa',
        name2: 'Detail'
    };

    const path = HierarchyBuilder.buildPathParts(row, 3);
    assertEquals(path, ['Activa', 'vaste activa', 'Immateriele vaste activa']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 3 (up to name2)", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Immateriele vaste activa',
        name2: 'Ontwikkelingskosten'
    };

    const path = HierarchyBuilder.buildPathParts(row, 4);
    assertEquals(path, ['Activa', 'vaste activa', 'Immateriele vaste activa', 'Ontwikkelingskosten']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 4 includes name3 when present", () => {
    const row = {
        code0: 'Passiva',
        name0: 'korte termijn schulden',
        name1: 'Belastingen',
        name2: 'Belastingen en premies sociale verz.',
        name3: 'Omzetbelasting'
    };

    const path = HierarchyBuilder.buildPathParts(row, 5);
    assertEquals(path, ['Passiva', 'korte termijn schulden', 'Belastingen', 'Belastingen en premies sociale verz.', 'Omzetbelasting']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 4 skips empty name3", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Immateriele vaste activa',
        name2: 'Ontwikkelingskosten',
        name3: ''
    };

    const path = HierarchyBuilder.buildPathParts(row, 5);
    assertEquals(path, ['Activa', 'vaste activa', 'Immateriele vaste activa', 'Ontwikkelingskosten']);
});

Deno.test("HierarchyBuilder.buildPathParts - level 5 includes account code", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Immateriele vaste activa',
        name2: 'Ontwikkelingskosten',
        account_code: '1000',
        account_description: 'R&D Costs'
    };

    const path = HierarchyBuilder.buildPathParts(row, 6);
    assertEquals(path.length, 5);
    assertEquals(path[4], '1000 - R&D Costs');
});

Deno.test("HierarchyBuilder.buildPathParts - level 5 account code only", () => {
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        name1: 'Immateriele vaste activa',
        name2: 'Ontwikkelingskosten',
        account_code: '1000',
        account_description: ''
    };

    const path = HierarchyBuilder.buildPathParts(row, 6);
    assertEquals(path[4], '1000');
});

Deno.test("HierarchyBuilder.buildTree - creates hierarchy from flat data", () => {
    const details = [
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Immateriele vaste activa',
            code2: '00010',
            name2: 'Ontwikkelingskosten',
            amount_2024: 1000,
            amount_2025: 1100
        },
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Immateriele vaste activa',
            code2: '00020',
            name2: 'Concessies',
            amount_2024: 500,
            amount_2025: 550
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    // Should create nodes for: Activa, vaste activa, Immateriele vaste activa, Ontwikkelingskosten, Concessies
    assertEquals(tree.length > 4, true);

    // Check that amounts are aggregated
    const activaNode = tree.find(n => n.label === 'Activa');
    assertExists(activaNode);
    assertEquals(activaNode.amount_2024, 1500); // 1000 + 500
    assertEquals(activaNode.amount_2025, 1650); // 1100 + 550
});

Deno.test("HierarchyBuilder.buildTree - calculates variance", () => {
    const details = [
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Test',
            code2: '1',
            name2: 'Detail',
            amount_2024: 1000,
            amount_2025: 1200
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    const node = tree.find(n => n.label === 'Detail');
    assertExists(node);
    assertEquals(node.variance_amount, 200); // 1200 - 1000
    assertEquals(node.variance_percent, 20); // (200 / 1000) * 100
});

Deno.test("HierarchyBuilder.buildTree - handles zero base for variance percent", () => {
    const details = [
        {
            code0: 'Activa',
            name0: 'test',
            code1: '0',
            name1: 'Test',
            code2: '1',
            name2: 'Detail',
            amount_2024: 0,
            amount_2025: 100
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    const node = tree.find(n => n.label === 'Detail');
    assertExists(node);
    assertEquals(node.variance_percent, 0); // Avoid division by zero
});

Deno.test("HierarchyBuilder.buildTree - sorts nodes correctly", () => {
    const details = [
        {
            code0: 'Passiva',
            name0: 'eigen vermogen',
            code1: '60',
            name1: 'Equity',
            code2: '1',
            name2: 'Detail B',
            amount_2024: 100,
            amount_2025: 110
        },
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Assets',
            code2: '1',
            name2: 'Detail A',
            amount_2024: 200,
            amount_2025: 220
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    // Activa should come before Passiva (alphabetically)
    const activaIndex = tree.findIndex(n => n.label === 'Activa');
    const passivaIndex = tree.findIndex(n => n.label === 'Passiva');

    assertEquals(activaIndex >= 0, true);
    assertEquals(passivaIndex >= 0, true);
    assertEquals(activaIndex < passivaIndex, true);
});

Deno.test("HierarchyBuilder.buildTree - preserves all code fields", () => {
    const details = [
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Test',
            code2: '00010',
            name2: 'Detail',
            code3: '100',
            name3: 'SubDetail',
            amount_2024: 1000,
            amount_2025: 1100
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    const node = tree.find(n => n.label === 'Detail');
    assertExists(node);
    assertEquals(node.code0, 'Activa');
    assertEquals(node.code1, '0');
    assertEquals(node.code2, '00010');
    assertEquals(node.name0, 'vaste activa');
    assertEquals(node.name1, 'Test');
    assertEquals(node.name2, 'Detail');
});

Deno.test("HierarchyBuilder.buildTree - sets correct rowType", () => {
    const details = [
        {
            code0: 'Activa',
            name0: 'vaste activa',
            code1: '0',
            name1: 'Parent',
            code2: '1',
            name2: 'Child',
            amount_2024: 100,
            amount_2025: 110
        }
    ];

    const tree = HierarchyBuilder.buildTree(details, 'level3');

    const parentNode = tree.find(n => n.label === 'Parent');
    const childNode = tree.find(n => n.label === 'Child');

    assertExists(parentNode);
    assertExists(childNode);

    // Parent should be 'group', leaf should be 'detail'
    assertEquals(parentNode._rowType, 'group');
    assertEquals(childNode._rowType, 'detail');
});

Deno.test("HierarchyBuilder.buildTree - handles empty details array", () => {
    const tree = HierarchyBuilder.buildTree([], 'level3');
    assertEquals(tree.length, 0);
});

Deno.test("HierarchyBuilder.addToHierarchy - aggregates amounts at all levels", () => {
    const hierarchyMap = new Map();
    const pathParts = ['Activa', 'vaste activa', 'Test'];
    const row = {
        code0: 'Activa',
        name0: 'vaste activa',
        code1: '0',
        name1: 'Test',
        amount_2024: 100,
        amount_2025: 110
    };

    HierarchyBuilder.addToHierarchy(hierarchyMap, pathParts, row);

    // Should create 3 nodes
    assertEquals(hierarchyMap.size, 3);

    // All nodes should have aggregated amounts
    const activaNode = hierarchyMap.get('Activa');
    assertEquals(activaNode.amount_2024, 100);
    assertEquals(activaNode.amount_2025, 110);

    const vasteActivaNode = hierarchyMap.get('Activa|vaste activa');
    assertEquals(vasteActivaNode.amount_2024, 100);
    assertEquals(vasteActivaNode.amount_2025, 110);
});
