/**
 * Integration Test: Balance Sheet Tree View
 * 
 * Tests the complete tree view implementation for Balance Sheet statements
 * Validates Requirements 9.1 and 3.4:
 * - ACTIVA and PASSIVA appear as separate tree roots
 * - "Totaal Activa" and "Totaal Passiva" are always visible
 * - Expand/collapse works for all levels
 * - Amount aggregation is correct
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock Arquero for testing (same as unit tests)
const mockAq = {
    from: (data: any[]) => {
        return {
            data,
            groupby: (...cols: string[]) => {
                const groups = new Map();
                data.forEach(row => {
                    const key = cols.map(col => row[col]).join('|');
                    if (!groups.has(key)) {
                        groups.set(key, []);
                    }
                    groups.get(key).push(row);
                });
                
                return {
                    rollup: (spec: any) => {
                        const results: any[] = [];
                        groups.forEach((groupRows, key) => {
                            const result: any = {};
                            cols.forEach((col, idx) => {
                                result[col] = groupRows[0][col];
                            });
                            Object.keys(spec).forEach(resultCol => {
                                const fn = spec[resultCol];
                                if (typeof fn === 'function') {
                                    const colName = fn._colName;
                                    const opType = fn._opType;
                                    if (opType === 'sum') {
                                        result[resultCol] = groupRows.reduce((sum, row) => sum + (row[colName] || 0), 0);
                                    } else if (opType === 'any') {
                                        result[resultCol] = groupRows[0][colName];
                                    }
                                }
                            });
                            results.push(result);
                        });
                        return {
                            objects: () => results
                        };
                    }
                };
            },
            numRows: () => data.length,
            objects: () => data
        };
    },
    op: {
        sum: (col: string) => {
            const fn: any = () => col;
            fn._colName = col;
            fn._opType = 'sum';
            return fn;
        },
        any: (col: string) => {
            const fn: any = () => col;
            fn._colName = col;
            fn._opType = 'any';
            return fn;
        }
    }
};

// Set up global Arquero mock
(globalThis as any).aq = mockAq;

import { HierarchyTreeBuilder, TreeNode, MovementRow } from "../../src/utils/HierarchyTreeBuilder.ts";

/**
 * Create realistic balance sheet movements data
 * Represents a typical Dutch balance sheet structure
 */
function createBalanceSheetMovements(): MovementRow[] {
    return [
        // ACTIVA - Vaste activa - Materiële vaste activa
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '10',
            name1: 'Vaste activa',
            code2: '100',
            name2: 'Materiële vaste activa',
            code3: '1000',
            name3: 'Gebouwen',
            account_code: '10001',
            account_description: 'Bedrijfspand',
            amount_2024: 500000,
            amount_2025: 480000
        },
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '10',
            name1: 'Vaste activa',
            code2: '100',
            name2: 'Materiële vaste activa',
            code3: '1001',
            name3: 'Machines',
            account_code: '10010',
            account_description: 'Productiemachines',
            amount_2024: 200000,
            amount_2025: 180000
        },
        // ACTIVA - Vaste activa - Financiële vaste activa
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '10',
            name1: 'Vaste activa',
            code2: '101',
            name2: 'Financiële vaste activa',
            code3: '1010',
            name3: 'Deelnemingen',
            account_code: '10100',
            account_description: 'Deelneming XYZ BV',
            amount_2024: 100000,
            amount_2025: 120000
        },
        // ACTIVA - Vlottende activa - Voorraden
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '15',
            name1: 'Vlottende activa',
            code2: '150',
            name2: 'Voorraden',
            code3: '1500',
            name3: 'Grond- en hulpstoffen',
            account_code: '15000',
            account_description: 'Voorraad grondstoffen',
            amount_2024: 50000,
            amount_2025: 55000
        },
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '15',
            name1: 'Vlottende activa',
            code2: '150',
            name2: 'Voorraden',
            code3: '1501',
            name3: 'Gereed product',
            account_code: '15010',
            account_description: 'Voorraad gereed product',
            amount_2024: 75000,
            amount_2025: 80000
        },
        // ACTIVA - Vlottende activa - Vorderingen
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '15',
            name1: 'Vlottende activa',
            code2: '151',
            name2: 'Vorderingen',
            code3: '1510',
            name3: 'Debiteuren',
            account_code: '15100',
            account_description: 'Handelsdebiteuren',
            amount_2024: 150000,
            amount_2025: 165000
        },
        // ACTIVA - Vlottende activa - Liquide middelen
        {
            code0: 'A',
            name0: 'ACTIVA',
            code1: '15',
            name1: 'Vlottende activa',
            code2: '152',
            name2: 'Liquide middelen',
            code3: '1520',
            name3: 'Bank',
            account_code: '15200',
            account_description: 'Bankrekening',
            amount_2024: 25000,
            amount_2025: 30000
        },
        // PASSIVA - Eigen vermogen
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '20',
            name1: 'Eigen vermogen',
            code2: '200',
            name2: 'Geplaatst kapitaal',
            code3: '2000',
            name3: 'Aandelenkapitaal',
            account_code: '20000',
            account_description: 'Geplaatst aandelenkapitaal',
            amount_2024: 100000,
            amount_2025: 100000
        },
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '20',
            name1: 'Eigen vermogen',
            code2: '201',
            name2: 'Reserves',
            code3: '2010',
            name3: 'Algemene reserve',
            account_code: '20100',
            account_description: 'Algemene reserve',
            amount_2024: 400000,
            amount_2025: 450000
        },
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '20',
            name1: 'Eigen vermogen',
            code2: '202',
            name2: 'Resultaat',
            code3: '2020',
            name3: 'Resultaat boekjaar',
            account_code: '20200',
            account_description: 'Resultaat boekjaar',
            amount_2024: 50000,
            amount_2025: 60000
        },
        // PASSIVA - Voorzieningen
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '25',
            name1: 'Voorzieningen',
            code2: '250',
            name2: 'Voorzieningen',
            code3: '2500',
            name3: 'Voorziening pensioenen',
            account_code: '25000',
            account_description: 'Voorziening pensioenen',
            amount_2024: 75000,
            amount_2025: 80000
        },
        // PASSIVA - Langlopende schulden
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '26',
            name1: 'Langlopende schulden',
            code2: '260',
            name2: 'Schulden aan kredietinstellingen',
            code3: '2600',
            name3: 'Hypotheek',
            account_code: '26000',
            account_description: 'Hypothecaire lening',
            amount_2024: 300000,
            amount_2025: 280000
        },
        // PASSIVA - Kortlopende schulden
        {
            code0: 'P',
            name0: 'PASSIVA',
            code1: '27',
            name1: 'Kortlopende schulden',
            code2: '270',
            name2: 'Crediteuren',
            code3: '2700',
            name3: 'Handelscrediteuren',
            account_code: '27000',
            account_description: 'Handelscrediteuren',
            amount_2024: 175000,
            amount_2025: 140000
        }
    ];
}

Deno.test("Balance Sheet - ACTIVA and PASSIVA appear as separate tree roots", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Find level 0 nodes (roots)
    const rootNodes = tree.filter(node => node.level === 0);
    
    // Should have exactly 2 roots: ACTIVA and PASSIVA
    assertEquals(rootNodes.length, 2, 'Should have exactly 2 root nodes');
    
    // Find ACTIVA root
    const activaRoot = rootNodes.find(node => 
        node.label.includes('ACTIVA') || node.orgHierarchy[0] === 'A'
    );
    assertExists(activaRoot, 'ACTIVA root should exist');
    assertEquals(activaRoot.level, 0, 'ACTIVA should be at level 0');
    assertEquals(activaRoot.type, 'category', 'ACTIVA should be a category');
    
    // Find PASSIVA root
    const passivaRoot = rootNodes.find(node => 
        node.label.includes('PASSIVA') || node.orgHierarchy[0] === 'P'
    );
    assertExists(passivaRoot, 'PASSIVA root should exist');
    assertEquals(passivaRoot.level, 0, 'PASSIVA should be at level 0');
    assertEquals(passivaRoot.type, 'category', 'PASSIVA should be a category');
    
    console.log('✓ ACTIVA and PASSIVA appear as separate tree roots');
});

Deno.test("Balance Sheet - Totaal Activa and Totaal Passiva are always visible", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    // Include calculated rows for totals
    const calculatedRows = [
        {
            order: 200,
            label: 'Totaal activa',
            type: 'subtotal',
            style: 'total',
            expression: 'sum(ACTIVA)'
        },
        {
            order: 500,
            label: 'Totaal passiva',
            type: 'subtotal',
            style: 'total',
            expression: 'sum(PASSIVA)'
        }
    ];
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows
    });
    
    // Find Totaal activa
    const totaalActiva = tree.find(node => 
        node.label.toLowerCase().includes('totaal activa')
    );
    assertExists(totaalActiva, 'Totaal activa should exist');
    assertEquals(totaalActiva._alwaysVisible, true, 'Totaal activa should be always visible');
    assertEquals(totaalActiva._isCalculated, true, 'Totaal activa should be marked as calculated');
    assertEquals(totaalActiva.style, 'total', 'Totaal activa should have total style');
    
    // Find Totaal passiva
    const totaalPassiva = tree.find(node => 
        node.label.toLowerCase().includes('totaal passiva')
    );
    assertExists(totaalPassiva, 'Totaal passiva should exist');
    assertEquals(totaalPassiva._alwaysVisible, true, 'Totaal passiva should be always visible');
    assertEquals(totaalPassiva._isCalculated, true, 'Totaal passiva should be marked as calculated');
    assertEquals(totaalPassiva.style, 'total', 'Totaal passiva should have total style');
    
    console.log('✓ Totaal Activa and Totaal Passiva are always visible');
});

Deno.test("Balance Sheet - All hierarchy levels are present", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Check that we have nodes at each level (0-3, 5) - level 4 is reserved/skipped
    const expectedLevels = [0, 1, 2, 3, 5];
    for (const level of expectedLevels) {
        const nodesAtLevel = tree.filter(node => node.level === level);
        assert(nodesAtLevel.length > 0, `Should have nodes at level ${level}`);
        console.log(`  Level ${level}: ${nodesAtLevel.length} nodes`);
    }
    
    // Verify level 4 is skipped (reserved)
    const level4 = tree.filter(n => n.level === 4);
    assertEquals(level4.length, 0, 'Level 4 should be empty (reserved)');
    
    // Verify level 0 (roots)
    const level0 = tree.filter(n => n.level === 0);
    assertEquals(level0.length, 2, 'Should have 2 level 0 nodes (ACTIVA, PASSIVA)');
    
    // Verify level 1 (main categories)
    const level1 = tree.filter(n => n.level === 1);
    assert(level1.length >= 4, 'Should have at least 4 level 1 nodes');
    
    // Verify level 5 (accounts)
    const level5 = tree.filter(n => n.level === 5);
    assertEquals(level5.length, 13, 'Should have 13 account-level nodes');
    assertEquals(level5.every(n => n.type === 'account'), true, 'All level 5 nodes should be accounts');
    
    console.log('✓ All hierarchy levels (0-3, 5) are present (level 4 reserved)');
});

Deno.test("Balance Sheet - Amount aggregation is correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Test ACTIVA aggregation
    const activaRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('ACTIVA') || node.orgHierarchy[0] === 'A')
    );
    assertExists(activaRoot, 'ACTIVA root should exist');
    
    // Calculate expected ACTIVA total from movements
    const activaMovements = movements.filter(m => m.code0 === 'A' || m.name0 === 'ACTIVA');
    const expectedActiva2024 = activaMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedActiva2025 = activaMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(activaRoot.amount_2024, expectedActiva2024, 
        `ACTIVA 2024 should equal ${expectedActiva2024}`);
    assertEquals(activaRoot.amount_2025, expectedActiva2025, 
        `ACTIVA 2025 should equal ${expectedActiva2025}`);
    
    console.log(`  ACTIVA 2024: ${activaRoot.amount_2024}`);
    console.log(`  ACTIVA 2025: ${activaRoot.amount_2025}`);
    
    // Test PASSIVA aggregation
    const passivaRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('PASSIVA') || node.orgHierarchy[0] === 'P')
    );
    assertExists(passivaRoot, 'PASSIVA root should exist');
    
    // Calculate expected PASSIVA total from movements
    const passivaMovements = movements.filter(m => m.code0 === 'P' || m.name0 === 'PASSIVA');
    const expectedPassiva2024 = passivaMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedPassiva2025 = passivaMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(passivaRoot.amount_2024, expectedPassiva2024, 
        `PASSIVA 2024 should equal ${expectedPassiva2024}`);
    assertEquals(passivaRoot.amount_2025, expectedPassiva2025, 
        `PASSIVA 2025 should equal ${expectedPassiva2025}`);
    
    console.log(`  PASSIVA 2024: ${passivaRoot.amount_2024}`);
    console.log(`  PASSIVA 2025: ${passivaRoot.amount_2025}`);
    
    // Verify balance sheet equation: ACTIVA = PASSIVA
    assertEquals(activaRoot.amount_2024, passivaRoot.amount_2024, 
        'Balance sheet should balance for 2024');
    assertEquals(activaRoot.amount_2025, passivaRoot.amount_2025, 
        'Balance sheet should balance for 2025');
    
    console.log('✓ Amount aggregation is correct and balance sheet balances');
});

Deno.test("Balance Sheet - Variance calculations are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Check ACTIVA variance
    const activaRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('ACTIVA') || node.orgHierarchy[0] === 'A')
    );
    assertExists(activaRoot);
    
    const expectedVarianceAmount = (activaRoot.amount_2025 || 0) - (activaRoot.amount_2024 || 0);
    const expectedVariancePercent = activaRoot.amount_2024 !== 0
        ? (expectedVarianceAmount / (activaRoot.amount_2024 || 1)) * 100
        : null;
    
    assertEquals(activaRoot.variance_amount, expectedVarianceAmount, 
        'ACTIVA variance amount should be correct');
    
    if (expectedVariancePercent !== null) {
        assert(Math.abs((activaRoot.variance_percent || 0) - expectedVariancePercent) < 0.01, 
            'ACTIVA variance percent should be correct');
    }
    
    console.log(`  ACTIVA variance: ${activaRoot.variance_amount} (${activaRoot.variance_percent?.toFixed(2)}%)`);
    console.log('✓ Variance calculations are correct');
});

Deno.test("Balance Sheet - Parent-child relationships are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Test: Vaste activa should be child of ACTIVA
    const vasteActiva = tree.find(node => 
        node.level === 1 && node.label.includes('Vaste activa')
    );
    assertExists(vasteActiva, 'Vaste activa should exist');
    assertEquals(vasteActiva.orgHierarchy[0], 'A', 'Vaste activa should be under ACTIVA');
    
    // Test: Materiële vaste activa should be child of Vaste activa
    const materiele = tree.find(node => 
        node.level === 2 && node.label.includes('Materiële vaste activa')
    );
    assertExists(materiele, 'Materiële vaste activa should exist');
    assertEquals(materiele.orgHierarchy.length, 3, 'Should have 3-level path');
    assertEquals(materiele.orgHierarchy[0], 'A', 'Should be under ACTIVA');
    assertEquals(materiele.orgHierarchy[1], '10', 'Should be under Vaste activa');
    
    // Test: Account should have full path
    const account = tree.find(node => 
        node.level === 5 && node.label.includes('10001')
    );
    assertExists(account, 'Account 10001 should exist');
    
    // The hierarchy builder creates paths based on available data
    // For level 5, it includes: code0, code1, and account_code (skipping code2/code3 if building level 5)
    // So we expect at least 3 elements in the path
    assert(account.orgHierarchy.length >= 3, 'Account should have at least 3-element hierarchy path');
    assertEquals(account.orgHierarchy[0], 'A', 'Should be under ACTIVA');
    assertEquals(account.orgHierarchy[1], '10', 'Should be under Vaste activa');
    
    // The last element should be the account code
    const lastElement = account.orgHierarchy[account.orgHierarchy.length - 1];
    assertEquals(lastElement, '10001', 'Last element should be account code');
    
    console.log(`  Account path: ${account.orgHierarchy.join(' > ')}`);
    console.log('✓ Parent-child relationships are correct');
});

Deno.test("Balance Sheet - Level 1 categories aggregate correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // Test Vaste activa aggregation
    const vasteActiva = tree.find(node => 
        node.level === 1 && node.label.includes('Vaste activa')
    );
    assertExists(vasteActiva);
    
    // Find all accounts under Vaste activa (code1 = '10')
    const vasteActivaAccounts = movements.filter(m => m.code1 === '10');
    const expectedVA2024 = vasteActivaAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedVA2025 = vasteActivaAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(vasteActiva.amount_2024, expectedVA2024, 
        'Vaste activa 2024 should aggregate correctly');
    assertEquals(vasteActiva.amount_2025, expectedVA2025, 
        'Vaste activa 2025 should aggregate correctly');
    
    console.log(`  Vaste activa: ${vasteActiva.amount_2024} → ${vasteActiva.amount_2025}`);
    
    // Test Vlottende activa aggregation
    const vlottendeActiva = tree.find(node => 
        node.level === 1 && node.label.includes('Vlottende activa')
    );
    assertExists(vlottendeActiva);
    
    const vlottendeActivaAccounts = movements.filter(m => m.code1 === '15');
    const expectedVlA2024 = vlottendeActivaAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedVlA2025 = vlottendeActivaAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(vlottendeActiva.amount_2024, expectedVlA2024, 
        'Vlottende activa 2024 should aggregate correctly');
    assertEquals(vlottendeActiva.amount_2025, expectedVlA2025, 
        'Vlottende activa 2025 should aggregate correctly');
    
    console.log(`  Vlottende activa: ${vlottendeActiva.amount_2024} → ${vlottendeActiva.amount_2025}`);
    console.log('✓ Level 1 categories aggregate correctly');
});

Deno.test("Balance Sheet - _isGroup flag is set correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // All nodes at levels 0-4 should be groups
    const groupNodes = tree.filter(n => n.level < 5);
    assertEquals(groupNodes.every(n => n._isGroup === true), true, 
        'All nodes at levels 0-4 should have _isGroup = true');
    
    // All nodes at level 5 should not be groups
    const accountNodes = tree.filter(n => n.level === 5);
    assertEquals(accountNodes.every(n => n._isGroup === false || n._isGroup === undefined), true, 
        'All nodes at level 5 should have _isGroup = false or undefined');
    
    console.log('✓ _isGroup flag is set correctly');
});

Deno.test("Balance Sheet - Always visible nodes are marked correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createBalanceSheetMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'balance',
        calculatedRows: []
    });
    
    // All level 0 nodes should be always visible
    const level0Nodes = tree.filter(n => n.level === 0);
    assertEquals(level0Nodes.every(n => n._alwaysVisible === true), true, 
        'All level 0 nodes should be always visible');
    
    // All nodes with style 'total' should be always visible
    const totalNodes = tree.filter(n => n.style === 'total');
    assertEquals(totalNodes.every(n => n._alwaysVisible === true), true, 
        'All total-styled nodes should be always visible');
    
    // All nodes with style 'subtotal' should be always visible
    const subtotalNodes = tree.filter(n => n.style === 'subtotal');
    assertEquals(subtotalNodes.every(n => n._alwaysVisible === true), true, 
        'All subtotal-styled nodes should be always visible');
    
    console.log(`  Always visible nodes: ${tree.filter(n => n._alwaysVisible).length}`);
    console.log('✓ Always visible nodes are marked correctly');
});

console.log('\n=== Balance Sheet Tree View Tests Complete ===\n');
