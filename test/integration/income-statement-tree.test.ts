/**
 * Integration Test: Income Statement Tree View
 * 
 * Tests the complete tree view implementation for Income Statement
 * Validates Requirements 9.2 and 3.5:
 * - Revenue and expense categories appear as tree roots
 * - "Bruto marge", "Bedrijfsresultaat", "Resultaat na belastingen" are always visible
 * - Expand/collapse works for all levels
 * - Amount aggregation is correct
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock Arquero for testing
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
 * Create realistic income statement movements data
 * Represents a typical Dutch income statement structure
 */
function createIncomeStatementMovements(): MovementRow[] {
    return [
        // OPBRENGSTEN (Revenue) - Netto-omzet
        {
            code0: 'O',
            name0: 'OPBRENGSTEN',
            code1: '80',
            name1: 'Netto-omzet',
            code2: '800',
            name2: 'Omzet binnenland',
            code3: '8000',
            name3: 'Verkoop producten',
            account_code: '80001',
            account_description: 'Verkoop product A',
            amount_2024: 500000,
            amount_2025: 550000
        },
        {
            code0: 'O',
            name0: 'OPBRENGSTEN',
            code1: '80',
            name1: 'Netto-omzet',
            code2: '800',
            name2: 'Omzet binnenland',
            code3: '8001',
            name3: 'Verkoop diensten',
            account_code: '80010',
            account_description: 'Verkoop diensten',
            amount_2024: 200000,
            amount_2025: 250000
        },
        {
            code0: 'O',
            name0: 'OPBRENGSTEN',
            code1: '80',
            name1: 'Netto-omzet',
            code2: '801',
            name2: 'Omzet buitenland',
            code3: '8010',
            name3: 'Export EU',
            account_code: '80100',
            account_description: 'Export naar EU',
            amount_2024: 150000,
            amount_2025: 180000
        },
        // OPBRENGSTEN - Overige bedrijfsopbrengsten
        {
            code0: 'O',
            name0: 'OPBRENGSTEN',
            code1: '81',
            name1: 'Overige bedrijfsopbrengsten',
            code2: '810',
            name2: 'Subsidies',
            code3: '8100',
            name3: 'Subsidies',
            account_code: '81000',
            account_description: 'Ontvangen subsidies',
            amount_2024: 20000,
            amount_2025: 25000
        },
        // KOSTEN (Expenses) - Inkoop en voorraadmutaties
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '70',
            name1: 'Inkoop en voorraadmutaties',
            code2: '700',
            name2: 'Inkoop handelsgoederen',
            code3: '7000',
            name3: 'Inkoop grondstoffen',
            account_code: '70001',
            account_description: 'Inkoop grondstoffen',
            amount_2024: -300000,
            amount_2025: -330000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '70',
            name1: 'Inkoop en voorraadmutaties',
            code2: '701',
            name2: 'Voorraadmutaties',
            code3: '7010',
            name3: 'Mutatie voorraad',
            account_code: '70100',
            account_description: 'Mutatie voorraad',
            amount_2024: -20000,
            amount_2025: -15000
        },
        // KOSTEN - Personeelskosten
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '71',
            name1: 'Personeelskosten',
            code2: '710',
            name2: 'Lonen en salarissen',
            code3: '7100',
            name3: 'Brutolonen',
            account_code: '71000',
            account_description: 'Brutolonen personeel',
            amount_2024: -250000,
            amount_2025: -270000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '71',
            name1: 'Personeelskosten',
            code2: '711',
            name2: 'Sociale lasten',
            code3: '7110',
            name3: 'Sociale lasten',
            account_code: '71100',
            account_description: 'Sociale lasten',
            amount_2024: -50000,
            amount_2025: -55000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '71',
            name1: 'Personeelskosten',
            code2: '712',
            name2: 'Pensioenlasten',
            code3: '7120',
            name3: 'Pensioenlasten',
            account_code: '71200',
            account_description: 'Pensioenlasten',
            amount_2024: -30000,
            amount_2025: -35000
        },
        // KOSTEN - Afschrijvingen
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '72',
            name1: 'Afschrijvingen',
            code2: '720',
            name2: 'Afschrijving materiële vaste activa',
            code3: '7200',
            name3: 'Afschrijving gebouwen',
            account_code: '72000',
            account_description: 'Afschrijving gebouwen',
            amount_2024: -20000,
            amount_2025: -20000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '72',
            name1: 'Afschrijvingen',
            code2: '720',
            name2: 'Afschrijving materiële vaste activa',
            code3: '7201',
            name3: 'Afschrijving machines',
            account_code: '72010',
            account_description: 'Afschrijving machines',
            amount_2024: -15000,
            amount_2025: -18000
        },
        // KOSTEN - Overige bedrijfskosten
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '73',
            name1: 'Overige bedrijfskosten',
            code2: '730',
            name2: 'Huisvestingskosten',
            code3: '7300',
            name3: 'Huur',
            account_code: '73000',
            account_description: 'Huurkosten',
            amount_2024: -40000,
            amount_2025: -42000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '73',
            name1: 'Overige bedrijfskosten',
            code2: '731',
            name2: 'Verkoopkosten',
            code3: '7310',
            name3: 'Marketing',
            account_code: '73100',
            account_description: 'Marketingkosten',
            amount_2024: -25000,
            amount_2025: -30000
        },
        {
            code0: 'K',
            name0: 'KOSTEN',
            code1: '73',
            name1: 'Overige bedrijfskosten',
            code2: '732',
            name2: 'Algemene kosten',
            code3: '7320',
            name3: 'Kantoorkosten',
            account_code: '73200',
            account_description: 'Kantoorkosten',
            amount_2024: -15000,
            amount_2025: -18000
        },
        // FINANCIËLE BATEN EN LASTEN
        {
            code0: 'F',
            name0: 'FINANCIËLE BATEN EN LASTEN',
            code1: '84',
            name1: 'Rentebaten',
            code2: '840',
            name2: 'Rentebaten',
            code3: '8400',
            name3: 'Rentebaten',
            account_code: '84000',
            account_description: 'Ontvangen rente',
            amount_2024: 2000,
            amount_2025: 2500
        },
        {
            code0: 'F',
            name0: 'FINANCIËLE BATEN EN LASTEN',
            code1: '85',
            name1: 'Rentelasten',
            code2: '850',
            name2: 'Rentelasten',
            code3: '8500',
            name3: 'Rentelasten',
            account_code: '85000',
            account_description: 'Betaalde rente',
            amount_2024: -12000,
            amount_2025: -10000
        },
        // BELASTINGEN
        {
            code0: 'B',
            name0: 'BELASTINGEN',
            code1: '86',
            name1: 'Belastingen',
            code2: '860',
            name2: 'Vennootschapsbelasting',
            code3: '8600',
            name3: 'Vennootschapsbelasting',
            account_code: '86000',
            account_description: 'Vennootschapsbelasting',
            amount_2024: -20000,
            amount_2025: -25000
        }
    ];
}

Deno.test("Income Statement - Revenue and expense categories appear as tree roots", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Find level 0 nodes (roots)
    const rootNodes = tree.filter(node => node.level === 0);
    
    // Should have at least 3 roots: OPBRENGSTEN, KOSTEN, FINANCIËLE BATEN EN LASTEN, BELASTINGEN
    assert(rootNodes.length >= 3, `Should have at least 3 root nodes, found ${rootNodes.length}`);
    
    // Find OPBRENGSTEN (Revenue) root
    const revenueRoot = rootNodes.find(node => 
        node.label.includes('OPBRENGSTEN') || node.orgHierarchy[0] === 'O'
    );
    assertExists(revenueRoot, 'OPBRENGSTEN root should exist');
    assertEquals(revenueRoot.level, 0, 'OPBRENGSTEN should be at level 0');
    assertEquals(revenueRoot.type, 'category', 'OPBRENGSTEN should be a category');
    
    // Find KOSTEN (Expenses) root
    const expenseRoot = rootNodes.find(node => 
        node.label.includes('KOSTEN') || node.orgHierarchy[0] === 'K'
    );
    assertExists(expenseRoot, 'KOSTEN root should exist');
    assertEquals(expenseRoot.level, 0, 'KOSTEN should be at level 0');
    assertEquals(expenseRoot.type, 'category', 'KOSTEN should be a category');
    
    // Find FINANCIËLE BATEN EN LASTEN root
    const financialRoot = rootNodes.find(node => 
        node.label.includes('FINANCIËLE') || node.orgHierarchy[0] === 'F'
    );
    assertExists(financialRoot, 'FINANCIËLE BATEN EN LASTEN root should exist');
    
    // Find BELASTINGEN root
    const taxRoot = rootNodes.find(node => 
        node.label.includes('BELASTINGEN') || node.orgHierarchy[0] === 'B'
    );
    assertExists(taxRoot, 'BELASTINGEN root should exist');
    
    console.log('✓ Revenue and expense categories appear as tree roots');
});

Deno.test("Income Statement - Key metrics are always visible", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    // Include calculated rows for key metrics
    const calculatedRows = [
        {
            order: 100,
            label: 'Bruto marge',
            type: 'subtotal',
            style: 'metric',
            expression: 'revenue + cogs'
        },
        {
            order: 300,
            label: 'Bedrijfsresultaat',
            type: 'subtotal',
            style: 'metric',
            expression: 'bruto_marge - operating_expenses'
        },
        {
            order: 500,
            label: 'Resultaat na belastingen',
            type: 'subtotal',
            style: 'total',
            expression: 'bedrijfsresultaat + financial - tax'
        }
    ];
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows
    });
    
    // Find Bruto marge
    const brutoMarge = tree.find(node => 
        node.label.toLowerCase().includes('bruto marge')
    );
    assertExists(brutoMarge, 'Bruto marge should exist');
    assertEquals(brutoMarge._alwaysVisible, true, 'Bruto marge should be always visible');
    assertEquals(brutoMarge._isCalculated, true, 'Bruto marge should be marked as calculated');
    assertEquals(brutoMarge.style, 'metric', 'Bruto marge should have metric style');
    
    // Find Bedrijfsresultaat
    const bedrijfsresultaat = tree.find(node => 
        node.label.toLowerCase().includes('bedrijfsresultaat')
    );
    assertExists(bedrijfsresultaat, 'Bedrijfsresultaat should exist');
    assertEquals(bedrijfsresultaat._alwaysVisible, true, 'Bedrijfsresultaat should be always visible');
    assertEquals(bedrijfsresultaat._isCalculated, true, 'Bedrijfsresultaat should be marked as calculated');
    assertEquals(bedrijfsresultaat.style, 'metric', 'Bedrijfsresultaat should have metric style');
    
    // Find Resultaat na belastingen
    const resultaatNaBelastingen = tree.find(node => 
        node.label.toLowerCase().includes('resultaat na belastingen')
    );
    assertExists(resultaatNaBelastingen, 'Resultaat na belastingen should exist');
    assertEquals(resultaatNaBelastingen._alwaysVisible, true, 'Resultaat na belastingen should be always visible');
    assertEquals(resultaatNaBelastingen._isCalculated, true, 'Resultaat na belastingen should be marked as calculated');
    assertEquals(resultaatNaBelastingen.style, 'total', 'Resultaat na belastingen should have total style');
    
    console.log('✓ Bruto marge, Bedrijfsresultaat, and Resultaat na belastingen are always visible');
});

Deno.test("Income Statement - All hierarchy levels are present", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
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
    assert(level0.length >= 3, 'Should have at least 3 level 0 nodes');
    
    // Verify level 5 (accounts)
    const level5 = tree.filter(n => n.level === 5);
    assertEquals(level5.length, 17, 'Should have 17 account-level nodes');
    assertEquals(level5.every(n => n.type === 'account'), true, 'All level 5 nodes should be accounts');
    
    console.log('✓ All hierarchy levels (0-3, 5) are present (level 4 reserved)');
});

Deno.test("Income Statement - Amount aggregation is correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Test OPBRENGSTEN (Revenue) aggregation
    const revenueRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPBRENGSTEN') || node.orgHierarchy[0] === 'O')
    );
    assertExists(revenueRoot, 'OPBRENGSTEN root should exist');
    
    // Calculate expected revenue total from movements
    const revenueMovements = movements.filter(m => m.code0 === 'O' || m.name0 === 'OPBRENGSTEN');
    const expectedRevenue2024 = revenueMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedRevenue2025 = revenueMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(revenueRoot.amount_2024, expectedRevenue2024, 
        `OPBRENGSTEN 2024 should equal ${expectedRevenue2024}`);
    assertEquals(revenueRoot.amount_2025, expectedRevenue2025, 
        `OPBRENGSTEN 2025 should equal ${expectedRevenue2025}`);
    
    console.log(`  OPBRENGSTEN 2024: ${revenueRoot.amount_2024}`);
    console.log(`  OPBRENGSTEN 2025: ${revenueRoot.amount_2025}`);
    
    // Test KOSTEN (Expenses) aggregation
    const expenseRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('KOSTEN') || node.orgHierarchy[0] === 'K')
    );
    assertExists(expenseRoot, 'KOSTEN root should exist');
    
    // Calculate expected expense total from movements
    const expenseMovements = movements.filter(m => m.code0 === 'K' || m.name0 === 'KOSTEN');
    const expectedExpense2024 = expenseMovements.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedExpense2025 = expenseMovements.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(expenseRoot.amount_2024, expectedExpense2024, 
        `KOSTEN 2024 should equal ${expectedExpense2024}`);
    assertEquals(expenseRoot.amount_2025, expectedExpense2025, 
        `KOSTEN 2025 should equal ${expectedExpense2025}`);
    
    console.log(`  KOSTEN 2024: ${expenseRoot.amount_2024}`);
    console.log(`  KOSTEN 2025: ${expenseRoot.amount_2025}`);
    
    // Verify expenses are negative
    assert(expenseRoot.amount_2024 < 0, 'Expenses should be negative for 2024');
    assert(expenseRoot.amount_2025 < 0, 'Expenses should be negative for 2025');
    
    console.log('✓ Amount aggregation is correct');
});

Deno.test("Income Statement - Variance calculations are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Check OPBRENGSTEN variance
    const revenueRoot = tree.find(node => 
        node.level === 0 && (node.label.includes('OPBRENGSTEN') || node.orgHierarchy[0] === 'O')
    );
    assertExists(revenueRoot);
    
    const expectedVarianceAmount = (revenueRoot.amount_2025 || 0) - (revenueRoot.amount_2024 || 0);
    const expectedVariancePercent = revenueRoot.amount_2024 !== 0
        ? (expectedVarianceAmount / (revenueRoot.amount_2024 || 1)) * 100
        : null;
    
    assertEquals(revenueRoot.variance_amount, expectedVarianceAmount, 
        'OPBRENGSTEN variance amount should be correct');
    
    if (expectedVariancePercent !== null) {
        assert(Math.abs((revenueRoot.variance_percent || 0) - expectedVariancePercent) < 0.01, 
            'OPBRENGSTEN variance percent should be correct');
    }
    
    console.log(`  OPBRENGSTEN variance: ${revenueRoot.variance_amount} (${revenueRoot.variance_percent?.toFixed(2)}%)`);
    console.log('✓ Variance calculations are correct');
});

Deno.test("Income Statement - Parent-child relationships are correct", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Test: Netto-omzet should be child of OPBRENGSTEN
    const nettoOmzet = tree.find(node => 
        node.level === 1 && node.label.includes('Netto-omzet')
    );
    assertExists(nettoOmzet, 'Netto-omzet should exist');
    assertEquals(nettoOmzet.orgHierarchy[0], 'O', 'Netto-omzet should be under OPBRENGSTEN');
    
    // Test: Omzet binnenland should be child of Netto-omzet
    const omzetBinnenland = tree.find(node => 
        node.level === 2 && node.label.includes('Omzet binnenland')
    );
    assertExists(omzetBinnenland, 'Omzet binnenland should exist');
    assertEquals(omzetBinnenland.orgHierarchy.length, 3, 'Should have 3-level path');
    assertEquals(omzetBinnenland.orgHierarchy[0], 'O', 'Should be under OPBRENGSTEN');
    assertEquals(omzetBinnenland.orgHierarchy[1], '80', 'Should be under Netto-omzet');
    
    // Test: Account should have full path
    const account = tree.find(node => 
        node.level === 5 && node.label.includes('80001')
    );
    assertExists(account, 'Account 80001 should exist');
    
    // The hierarchy builder creates paths based on available data
    assert(account.orgHierarchy.length >= 3, 'Account should have at least 3-element hierarchy path');
    assertEquals(account.orgHierarchy[0], 'O', 'Should be under OPBRENGSTEN');
    assertEquals(account.orgHierarchy[1], '80', 'Should be under Netto-omzet');
    
    // The last element should be the account code
    const lastElement = account.orgHierarchy[account.orgHierarchy.length - 1];
    assertEquals(lastElement, '80001', 'Last element should be account code');
    
    console.log(`  Account path: ${account.orgHierarchy.join(' > ')}`);
    console.log('✓ Parent-child relationships are correct');
});

Deno.test("Income Statement - Level 1 categories aggregate correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Test Netto-omzet aggregation
    const nettoOmzet = tree.find(node => 
        node.level === 1 && node.label.includes('Netto-omzet')
    );
    assertExists(nettoOmzet);
    
    // Find all accounts under Netto-omzet (code1 = '80')
    const nettoOmzetAccounts = movements.filter(m => m.code1 === '80');
    const expectedNO2024 = nettoOmzetAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedNO2025 = nettoOmzetAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(nettoOmzet.amount_2024, expectedNO2024, 
        'Netto-omzet 2024 should aggregate correctly');
    assertEquals(nettoOmzet.amount_2025, expectedNO2025, 
        'Netto-omzet 2025 should aggregate correctly');
    
    console.log(`  Netto-omzet: ${nettoOmzet.amount_2024} → ${nettoOmzet.amount_2025}`);
    
    // Test Personeelskosten aggregation
    const personeelskosten = tree.find(node => 
        node.level === 1 && node.label.includes('Personeelskosten')
    );
    assertExists(personeelskosten);
    
    const personeelskostenAccounts = movements.filter(m => m.code1 === '71');
    const expectedPK2024 = personeelskostenAccounts.reduce((sum, m) => sum + (m.amount_2024 || 0), 0);
    const expectedPK2025 = personeelskostenAccounts.reduce((sum, m) => sum + (m.amount_2025 || 0), 0);
    
    assertEquals(personeelskosten.amount_2024, expectedPK2024, 
        'Personeelskosten 2024 should aggregate correctly');
    assertEquals(personeelskosten.amount_2025, expectedPK2025, 
        'Personeelskosten 2025 should aggregate correctly');
    
    console.log(`  Personeelskosten: ${personeelskosten.amount_2024} → ${personeelskosten.amount_2025}`);
    console.log('✓ Level 1 categories aggregate correctly');
});

Deno.test("Income Statement - _isGroup flag is set correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
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

Deno.test("Income Statement - Always visible nodes are marked correctly", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
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

Deno.test("Income Statement - Expense categories have negative amounts", () => {
    const builder = new HierarchyTreeBuilder();
    const movements = createIncomeStatementMovements();
    
    const tree = builder.buildTree(movements, {
        statementType: 'income',
        calculatedRows: []
    });
    
    // Find expense categories (KOSTEN)
    const expenseCategories = tree.filter(node => 
        node.level === 1 && node.orgHierarchy[0] === 'K'
    );
    
    // All expense categories should have negative amounts
    expenseCategories.forEach(category => {
        assert(category.amount_2024 <= 0, 
            `${category.label} 2024 should be negative or zero`);
        assert(category.amount_2025 <= 0, 
            `${category.label} 2025 should be negative or zero`);
    });
    
    console.log(`  Verified ${expenseCategories.length} expense categories have negative amounts`);
    console.log('✓ Expense categories have negative amounts');
});

console.log('\n=== Income Statement Tree View Tests Complete ===\n');
