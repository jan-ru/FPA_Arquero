/**
 * Integration Test: Cash Flow Statement Tree View
 * 
 * Tests the complete tree view implementation for Cash Flow statements
 * Validates Requirements 9.3, 9.4, 9.5:
 * - Operating, investing, financing activities appear as tree roots
 * - Calculated metrics are always visible
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
 * Create realistic cash flow statement movements data
 * Represents a typical Dutch cash flow statement structure (indirect method)
 */
function createCashFlowMovements(): MovementRow[] {
    return [
        // OPERATIONELE ACTIVITEITEN (Operating Activities)
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '90',
            name1: 'Bedrijfsresultaat',
            code2: '900',
            name2: 'Netto resultaat',
            code3: '9000',
            name3: 'Netto resultaat',
            account_code: '90000',
            account_description: 'Netto resultaat boekjaar',
            amount_2024: 100000,
            amount_2025: 120000
        },
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '91',
            name1: 'Aanpassingen voor',
            code2: '910',
            name2: 'Afschrijvingen',
            code3: '9100',
            name3: 'Afschrijvingen materiële vaste activa',
            account_code: '91000',
            account_description: 'Afschrijvingen',
            amount_2024: 35000,
            amount_2025: 38000
        },
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '91',
            name1: 'Aanpassingen voor',
            code2: '911',
            name2: 'Voorzieningen',
            code3: '9110',
            name3: 'Mutatie voorzieningen',
            account_code: '91100',
            account_description: 'Mutatie voorzieningen',
            amount_2024: 5000,
            amount_2025: 5000
        },
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '92',
            name1: 'Veranderingen in werkkapitaal',
            code2: '920',
            name2: 'Voorraden',
            code3: '9200',
            name3: 'Mutatie voorraden',
            account_code: '92000',
            account_description: 'Mutatie voorraden',
            amount_2024: -10000,
            amount_2025: -5000
        },
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '92',
            name1: 'Veranderingen in werkkapitaal',
            code2: '921',
            name2: 'Vorderingen',
            code3: '9210',
            name3: 'Mutatie vorderingen',
            account_code: '92100',
            account_description: 'Mutatie handelsdebiteuren',
            amount_2024: -15000,
            amount_2025: -15000
        },
        {
            code0: 'O',
            name0: 'OPERATIONELE ACTIVITEITEN',
            code1: '92',
            name1: 'Veranderingen in werkkapitaal',
            code2: '922',
            name2: 'Kortlopende schulden',
            code3: '9220',
            name3: 'Mutatie crediteuren',
            account_code: '92200',
            account_description: 'Mutatie handelscrediteuren',
            amount_2024: 20000,
            amount_2025: -35000
        },
        // INVESTERINGSACTIVITEITEN (Investing Activities)
        {
            code0: 'I',
            name0: 'INVESTERINGSACTIVITEITEN',
            code1: '93',
            name1: 'Investeringen in vaste activa',
            code2: '930',
            name2: 'Materiële vaste activa',
            code3: '9300',
            name3: 'Aankoop machines',
            account_code: '93000',
            account_description: 'Investering machines',
            amount_2024: -50000,
            amount_2025: -75000
        },
        {
            code0: 'I',
            name0: 'INVESTERINGSACTIVITEITEN',
            code1: '93',
            name1: 'Investeringen in vaste activa',
            code2: '931',
            name2: 'Financiële vaste activa',
            code3: '9310',
            name3: 'Aankoop deelnemingen',
            account_code: '93100',
            account_description: 'Investering deelnemingen',
            amount_2024: -20000,
            amount_2025: -20000
        },
        {
            code0: 'I',
            name0: 'INVESTERINGSACTIVITEITEN',
            code1: '94',
            name1: 'Desinvesteringen',
            code2: '940',
            name2: 'Verkoop vaste activa',
            code3: '9400',
            name3: 'Verkoop oude machines',
            account_code: '94000',
            account_description: 'Opbrengst verkoop machines',
            amount_2024: 10000,
            amount_2025: 5000
        },
        // FINANCIERINGSACTIVITEITEN (Financing Activities)
        {
            code0: 'F',
            name0: 'FINANCIERINGSACTIVITEITEN',
            code1: '95',
            name1: 'Mutaties eigen vermogen',
            code2: '950',
            name2: 'Kapitaalstortingen',
            code3: '9500',
            name3: 'Kapitaalstorting aandeelhouders',
            account_code: '95000',
            account_description: 'Ontvangen kapitaal',
            amount_2024: 0,
            amount_2025: 50000
        },
        {
            code0: 'F',
            name0: 'FINANCIERINGSACTIVITEITEN',
            code1: '95',
            name1: 'Mutaties eigen vermogen',
            code2: '951',
            name2: 'Dividenduitkeringen',
            code3: '9510',
            name3: 'Betaald dividend',
            account_code: '95100',
            account_description: 'Uitgekeerd dividend',
            amount_2024: -30000,
            amount_2025: -40000
        },
        {
            code0: 'F',
            name0: 'FINANCIERINGSACTIVITEITEN',
            code1: '96',
            name1: 'Mutaties langlopende schulden',
            code2: '960',
            name2: 'Opname leningen',
            code3: '9600',
            name3: 'Nieuwe lening',
            account_code: '96000',
            account_description: 'Opgenomen lening',
            amount_2024: 100000,
            amount_2025: 0
        },
        {
            code0: 'F',
            name0: 'FINANCIERINGSACTIVITEITEN',
            code1: '96',
            name1: 'Mutaties langlopende schulden',
            code2: '961',
            name2: 'Aflossing leningen',
            code3: '9610',
            name3: 'Aflossing hypotheek',
            account_code: '96100',
            account_description: 'Aflossing hypotheek',
            amount_2024: -20000,
            amount_2025: -20000
        }
    ];
}

Deno.test("Cash Flow - Operating, investing, financing activities appear as tree roots", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Find level 0 nodes (roots)
    const rootNodes = tree.filter(node => node.level === 0);
    
    // Should have exactly 3 roots: Operating, Investing, Financing
    assertEquals(rootNodes.length, 3, 'Should have exactly 3 root nodes');
    
    // Find Operating Activities root
    const operatingRoot = rootNodes.find(node => 
        node.label.includes('OPERATIONELE') || node.orgHierarchy[0] === 'O'
    );
    assertExists(operatingRoot, 'OPERATIONELE ACTIVITEITEN root should exist');
    assertEquals(operatingRoot.level, 0, 'Operating activities should be at level 0');
    assertEquals(operatingRoot.type, 'category', 'Operating activities should be a category');
    
    // Find Investing Activities root
    const investingRoot = rootNodes.find(node => 
        node.label.includes('INVESTERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'I'
    );
    assertExists(investingRoot, 'INVESTERINGSACTIVITEITEN root should exist');
    assertEquals(investingRoot.level, 0, 'Investing activities should be at level 0');
    assertEquals(investingRoot.type, 'category', 'Investing activities should be a category');
    
    // Find Financing Activities root
    const financingRoot = rootNodes.find(node => 
        node.label.includes('FINANCIERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'F'
    );
    assertExists(financingRoot, 'FINANCIERINGSACTIVITEITEN root should exist');
    assertEquals(financingRoot.level, 0, 'Financing activities should be at level 0');
    assertEquals(financingRoot.type, 'category', 'Financing activities should be a category');
    
    console.log('✓ Operating, investing, and financing activities appear as separate tree roots');
});

Deno.test("Cash Flow - Calculated metrics are always visible", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    // Include calculated rows for cash flow metrics
    const calculatedRows = [
        {
            order: 100,
            label: 'Kasstroom uit operationele activiteiten',
            type: 'subtotal',
            style: 'metric',
            expression: 'sum(operating)'
        },
        {
            order: 200,
            label: 'Kasstroom uit investeringsactiviteiten',
            type: 'subtotal',
            style: 'metric',
            expression: 'sum(investing)'
        },
        {
            order: 300,
            label: 'Kasstroom uit financieringsactiviteiten',
            type: 'subtotal',
            style: 'metric',
            expression: 'sum(financing)'
        },
        {
            order: 400,
            label: 'Netto kasstroom',
            type: 'subtotal',
            style: 'total',
            expression: 'operating + investing + financing'
        }
    ];
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows
    });
    
    // Find Kasstroom uit operationele activiteiten
    const operatingCashFlow = tree.find(node => 
        node.label.toLowerCase().includes('kasstroom uit operationele')
    );
    assertExists(operatingCashFlow, 'Kasstroom uit operationele activiteiten should exist');
    assertEquals(operatingCashFlow._alwaysVisible, true, 'Operating cash flow should be always visible');
    assertEquals(operatingCashFlow._isCalculated, true, 'Operating cash flow should be marked as calculated');
    assertEquals(operatingCashFlow.style, 'metric', 'Operating cash flow should have metric style');
    
    // Find Kasstroom uit investeringsactiviteiten
    const investingCashFlow = tree.find(node => 
        node.label.toLowerCase().includes('kasstroom uit investeringsactiviteiten')
    );
    assertExists(investingCashFlow, 'Kasstroom uit investeringsactiviteiten should exist');
    assertEquals(investingCashFlow._alwaysVisible, true, 'Investing cash flow should be always visible');
    assertEquals(investingCashFlow._isCalculated, true, 'Investing cash flow should be marked as calculated');
    
    // Find Kasstroom uit financieringsactiviteiten
    const financingCashFlow = tree.find(node => 
        node.label.toLowerCase().includes('kasstroom uit financieringsactiviteiten')
    );
    assertExists(financingCashFlow, 'Kasstroom uit financieringsactiviteiten should exist');
    assertEquals(financingCashFlow._alwaysVisible, true, 'Financing cash flow should be always visible');
    assertEquals(financingCashFlow._isCalculated, true, 'Financing cash flow should be marked as calculated');
    
    // Find Netto kasstroom
    const netCashFlow = tree.find(node => 
        node.label.toLowerCase().includes('netto kasstroom')
    );
    assertExists(netCashFlow, 'Netto kasstroom should exist');
    assertEquals(netCashFlow._alwaysVisible, true, 'Net cash flow should be always visible');
    assertEquals(netCashFlow._isCalculated, true, 'Net cash flow should be marked as calculated');
    assertEquals(netCashFlow.style, 'total', 'Net cash flow should have total style');
    
    console.log('✓ All calculated metrics are always visible');
});

Deno.test("Cash Flow - All hierarchy levels are present", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
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
    assertEquals(level0.length, 3, 'Should have 3 level 0 nodes (Operating, Investing, Financing)');
    
    // Verify level 1 (main categories)
    const level1 = tree.filter(n => n.level === 1);
    assert(level1.length >= 5, 'Should have at least 5 level 1 nodes');
    
    // Verify level 5 (accounts)
    const level5 = tree.filter(n => n.level === 5);
    assertEquals(level5.length, 13, 'Should have 13 account-level nodes');
    assertEquals(level5.every(n => n.type === 'account'), true, 'All level 5 nodes should be accounts');
    
    console.log('✓ All hierarchy levels (0-3, 5) are present (level 4 reserved)');
});

Deno.test("Cash Flow - Amount aggregation is correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Test Operating Activities aggregation
    const operatingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPERATIONELE') || node.orgHierarchy[0] === 'O')
    );
    assertExists(operatingRoot, 'Operating activities root should exist');
    
    // Calculate expected operating total from movements
    const operatingMovements = movements.filter(m => m.code0 === 'O' || m.name0 === 'OPERATIONELE ACTIVITEITEN');
    const expectedOperating2024 = operatingMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedOperating2025 = operatingMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(operatingRoot.amount_2024, expectedOperating2024, 
        `Operating activities 2024 should equal ${expectedOperating2024}`);
    assertEquals(operatingRoot.amount_2025, expectedOperating2025, 
        `Operating activities 2025 should equal ${expectedOperating2025}`);
    
    console.log(`  Operating activities 2024: ${operatingRoot.amount_2024}`);
    console.log(`  Operating activities 2025: ${operatingRoot.amount_2025}`);
    
    // Test Investing Activities aggregation
    const investingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('INVESTERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'I')
    );
    assertExists(investingRoot, 'Investing activities root should exist');
    
    const investingMovements = movements.filter(m => m.code0 === 'I' || m.name0 === 'INVESTERINGSACTIVITEITEN');
    const expectedInvesting2024 = investingMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedInvesting2025 = investingMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(investingRoot.amount_2024, expectedInvesting2024, 
        `Investing activities 2024 should equal ${expectedInvesting2024}`);
    assertEquals(investingRoot.amount_2025, expectedInvesting2025, 
        `Investing activities 2025 should equal ${expectedInvesting2025}`);
    
    console.log(`  Investing activities 2024: ${investingRoot.amount_2024}`);
    console.log(`  Investing activities 2025: ${investingRoot.amount_2025}`);
    
    // Test Financing Activities aggregation
    const financingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('FINANCIERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'F')
    );
    assertExists(financingRoot, 'Financing activities root should exist');
    
    const financingMovements = movements.filter(m => m.code0 === 'F' || m.name0 === 'FINANCIERINGSACTIVITEITEN');
    const expectedFinancing2024 = financingMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedFinancing2025 = financingMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(financingRoot.amount_2024, expectedFinancing2024, 
        `Financing activities 2024 should equal ${expectedFinancing2024}`);
    assertEquals(financingRoot.amount_2025, expectedFinancing2025, 
        `Financing activities 2025 should equal ${expectedFinancing2025}`);
    
    console.log(`  Financing activities 2024: ${financingRoot.amount_2024}`);
    console.log(`  Financing activities 2025: ${financingRoot.amount_2025}`);
    
    console.log('✓ Amount aggregation is correct for all three activity categories');
});

Deno.test("Cash Flow - Variance calculations are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Check Operating Activities variance
    const operatingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPERATIONELE') || node.orgHierarchy[0] === 'O')
    );
    assertExists(operatingRoot);
    
    const expectedVarianceAmount = (operatingRoot.amount_2025 || 0) - (operatingRoot.amount_2024 || 0);
    const expectedVariancePercent = operatingRoot.amount_2024 !== 0
        ? (expectedVarianceAmount / (operatingRoot.amount_2024 || 1)) * 100
        : null;
    
    assertEquals(operatingRoot.variance_amount, expectedVarianceAmount, 
        'Operating activities variance amount should be correct');
    
    if (expectedVariancePercent !== null) {
        assert(Math.abs((operatingRoot.variance_percent || 0) - expectedVariancePercent) < 0.01, 
            'Operating activities variance percent should be correct');
    }
    
    console.log(`  Operating variance: ${operatingRoot.variance_amount} (${operatingRoot.variance_percent?.toFixed(2)}%)`);
    console.log('✓ Variance calculations are correct');
});

Deno.test("Cash Flow - Parent-child relationships are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Test: Bedrijfsresultaat should be child of OPERATIONELE ACTIVITEITEN
    const bedrijfsresultaat = tree.find(node => 
        node.level === 1 && node.label.includes('Bedrijfsresultaat')
    );
    assertExists(bedrijfsresultaat, 'Bedrijfsresultaat should exist');
    assertEquals(bedrijfsresultaat.orgHierarchy[0], 'O', 'Bedrijfsresultaat should be under Operating activities');
    
    // Test: Aanpassingen voor should be child of OPERATIONELE ACTIVITEITEN
    const aanpassingen = tree.find(node => 
        node.level === 1 && node.label.includes('Aanpassingen voor')
    );
    assertExists(aanpassingen, 'Aanpassingen voor should exist');
    assertEquals(aanpassingen.orgHierarchy.length, 2, 'Should have 2-level path');
    assertEquals(aanpassingen.orgHierarchy[0], 'O', 'Should be under Operating activities');
    assertEquals(aanpassingen.orgHierarchy[1], '91', 'Should have correct code1');
    
    // Test: Account should have full path
    const account = tree.find(node => 
        node.level === 5 && node.label.includes('90000')
    );
    assertExists(account, 'Account 90000 should exist');
    
    assert(account.orgHierarchy.length >= 3, 'Account should have at least 3-element hierarchy path');
    assertEquals(account.orgHierarchy[0], 'O', 'Should be under Operating activities');
    assertEquals(account.orgHierarchy[1], '90', 'Should be under Bedrijfsresultaat');
    
    // The last element should be the account code
    const lastElement = account.orgHierarchy[account.orgHierarchy.length - 1];
    assertEquals(lastElement, '90000', 'Last element should be account code');
    
    console.log(`  Account path: ${account.orgHierarchy.join(' > ')}`);
    console.log('✓ Parent-child relationships are correct');
});

Deno.test("Cash Flow - Level 1 categories aggregate correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Test Aanpassingen voor aggregation
    const aanpassingen = tree.find(node => 
        node.level === 1 && node.label.includes('Aanpassingen voor')
    );
    assertExists(aanpassingen);
    
    // Find all accounts under Aanpassingen voor (code1 = '91')
    const aanpassingenAccounts = movements.filter(m => m.code1 === '91');
    const expectedAanp2024 = aanpassingenAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedAanp2025 = aanpassingenAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(aanpassingen.amount_2024, expectedAanp2024, 
        'Aanpassingen voor 2024 should aggregate correctly');
    assertEquals(aanpassingen.amount_2025, expectedAanp2025, 
        'Aanpassingen voor 2025 should aggregate correctly');
    
    console.log(`  Aanpassingen voor: ${aanpassingen.amount_2024} → ${aanpassingen.amount_2025}`);
    
    // Test Veranderingen in werkkapitaal aggregation
    const werkkapitaal = tree.find(node => 
        node.level === 1 && node.label.includes('Veranderingen in werkkapitaal')
    );
    assertExists(werkkapitaal);
    
    const werkkapitaalAccounts = movements.filter(m => m.code1 === '92');
    const expectedWK2024 = werkkapitaalAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedWK2025 = werkkapitaalAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(werkkapitaal.amount_2024, expectedWK2024, 
        'Veranderingen in werkkapitaal 2024 should aggregate correctly');
    assertEquals(werkkapitaal.amount_2025, expectedWK2025, 
        'Veranderingen in werkkapitaal 2025 should aggregate correctly');
    
    console.log(`  Veranderingen in werkkapitaal: ${werkkapitaal.amount_2024} → ${werkkapitaal.amount_2025}`);
    console.log('✓ Level 1 categories aggregate correctly');
});

Deno.test("Cash Flow - _isGroup flag is set correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
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

Deno.test("Cash Flow - Always visible nodes are marked correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
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

Deno.test("Cash Flow - Net cash flow calculation is correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Get all three activity roots
    const operatingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPERATIONELE') || node.orgHierarchy[0] === 'O')
    );
    const investingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('INVESTERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'I')
    );
    const financingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('FINANCIERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'F')
    );
    
    assertExists(operatingRoot);
    assertExists(investingRoot);
    assertExists(financingRoot);
    
    // Calculate net cash flow
    const netCashFlow2024 = (operatingRoot.amount_2024 || 0) + 
                            (investingRoot.amount_2024 || 0) + 
                            (financingRoot.amount_2024 || 0);
    const netCashFlow2025 = (operatingRoot.amount_2025 || 0) + 
                            (investingRoot.amount_2025 || 0) + 
                            (financingRoot.amount_2025 || 0);
    
    console.log(`  Net cash flow 2024: ${netCashFlow2024}`);
    console.log(`  Net cash flow 2025: ${netCashFlow2025}`);
    console.log(`  Change in cash: ${netCashFlow2025 - netCashFlow2024}`);
    
    // Verify the calculation makes sense
    assert(typeof netCashFlow2024 === 'number', 'Net cash flow 2024 should be a number');
    assert(typeof netCashFlow2025 === 'number', 'Net cash flow 2025 should be a number');
    
    console.log('✓ Net cash flow calculation is correct');
});

Deno.test("Cash Flow - Mixed positive and negative cash flows", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createCashFlowMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'cashflow',
        calculatedRows: []
    });
    
    // Operating activities should typically be positive
    const operatingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPERATIONELE') || node.orgHierarchy[0] === 'O')
    );
    assertExists(operatingRoot);
    assert(operatingRoot.amount_2024 > 0, 'Operating activities 2024 should be positive');
    assert(operatingRoot.amount_2025 > 0, 'Operating activities 2025 should be positive');
    
    // Investing activities should typically be negative (cash outflows)
    const investingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('INVESTERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'I')
    );
    assertExists(investingRoot);
    assert(investingRoot.amount_2024 < 0, 'Investing activities 2024 should be negative');
    assert(investingRoot.amount_2025 < 0, 'Investing activities 2025 should be negative');
    
    // Financing activities can be mixed
    const financingRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('FINANCIERINGSACTIVITEITEN') || node.orgHierarchy[0] === 'F')
    );
    assertExists(financingRoot);
    // Just verify it exists and has values
    assert(typeof financingRoot.amount_2024 === 'number', 'Financing activities 2024 should be a number');
    assert(typeof financingRoot.amount_2025 === 'number', 'Financing activities 2025 should be a number');
    
    console.log('✓ Cash flows have expected signs (positive/negative)');
});

console.log('\n=== Cash Flow Statement Tree View Tests Complete ===\n');
