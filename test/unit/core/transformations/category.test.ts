import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    containsPattern,
    matchesAnyPattern,
    matchesNoPattern,
    matches,
    isAsset,
    isLiability,
    isEquity,
    isRevenue,
    isCOGS,
    isOperatingExpense,
    isOtherIncome,
    isTax,
    isDepreciation,
    isCurrentAsset,
    isFixedAsset,
    isLongTermLiability,
    isLiabilityOrEquity,
    classifyCategory,
    filterByCategory
} from "../../../../src/core/transformations/category.ts";

describe('Category Matching', () => {
    describe('containsPattern', () => {
        it('matches pattern case-insensitively', () => {
            assertEquals(containsPattern('Total Assets', 'asset'), true);
            assertEquals(containsPattern('Total Assets', 'ASSET'), true);
            assertEquals(containsPattern('total assets', 'Asset'), true);
        });

        it('returns false when pattern not found', () => {
            assertEquals(containsPattern('Total Assets', 'liability'), false);
        });
    });

    describe('matchesAnyPattern', () => {
        it('matches any pattern in array', () => {
            const matcher = matchesAnyPattern(['asset', 'activa']);
            assertEquals(matcher('Total Assets'), true);
            assertEquals(matcher('Vaste activa'), true);
            assertEquals(matcher('Liabilities'), false);
        });

        it('handles empty pattern array', () => {
            const matcher = matchesAnyPattern([]);
            assertEquals(matcher('Anything'), false);
        });
    });

    describe('matchesNoPattern', () => {
        it('returns true when no patterns match', () => {
            const matcher = matchesNoPattern(['kostprijs']);
            assertEquals(matcher('Revenue'), true);
            assertEquals(matcher('Omzet'), true);
        });

        it('returns false when pattern matches', () => {
            const matcher = matchesNoPattern(['kostprijs']);
            assertEquals(matcher('Kostprijs van omzet'), false);
        });
    });

    describe('matches', () => {
        it('matches with include patterns only', () => {
            const matcher = matches(['omzet']);
            assertEquals(matcher('Omzet'), true);
            assertEquals(matcher('Revenue'), false);
        });

        it('matches with include and exclude patterns', () => {
            const matcher = matches(['omzet'], ['kostprijs']);
            assertEquals(matcher('Omzet'), true);
            assertEquals(matcher('Kostprijs van omzet'), false);
        });

        it('handles null and undefined', () => {
            const matcher = matches(['omzet']);
            assertEquals(matcher(null), false);
            assertEquals(matcher(undefined), false);
        });
    });

    describe('Balance Sheet Categories', () => {
        describe('isAsset', () => {
            it('identifies asset categories', () => {
                assertEquals(isAsset('Materiële vaste activa'), true);
                assertEquals(isAsset('Immateriële vaste activa'), true);
                assertEquals(isAsset('Voorraden'), true);
                assertEquals(isAsset('Vorderingen'), true);
                assertEquals(isAsset('Liquide middelen'), true);
            });

            it('rejects non-asset categories', () => {
                assertEquals(isAsset('Schulden'), false);
                assertEquals(isAsset('Eigen vermogen'), false);
            });

            it('handles null and undefined', () => {
                assertEquals(isAsset(null), false);
                assertEquals(isAsset(undefined), false);
            });
        });

        describe('isLiability', () => {
            it('identifies liability categories', () => {
                assertEquals(isLiability('Schulden'), true);
                assertEquals(isLiability('Voorzieningen'), true);
                assertEquals(isLiability('Passiva'), true);
            });

            it('rejects non-liability categories', () => {
                assertEquals(isLiability('Assets'), false);
                assertEquals(isLiability('Eigen vermogen'), false);
            });
        });

        describe('isEquity', () => {
            it('identifies equity categories', () => {
                assertEquals(isEquity('Eigen vermogen'), true);
                assertEquals(isEquity('Equity'), true);
            });

            it('rejects non-equity categories', () => {
                assertEquals(isEquity('Assets'), false);
                assertEquals(isEquity('Schulden'), false);
            });
        });
    });

    describe('Income Statement Categories', () => {
        describe('isRevenue', () => {
            it('identifies revenue', () => {
                assertEquals(isRevenue('Omzet'), true);
                assertEquals(isRevenue('Netto omzet'), true);
            });

            it('excludes COGS from revenue', () => {
                assertEquals(isRevenue('Kostprijs van omzet'), false);
            });

            it('rejects non-revenue', () => {
                assertEquals(isRevenue('Kosten'), false);
            });
        });

        describe('isCOGS', () => {
            it('identifies cost of goods sold', () => {
                assertEquals(isCOGS('Kostprijs van omzet'), true);
                assertEquals(isCOGS('Kostprijs'), true);
            });

            it('rejects non-COGS', () => {
                assertEquals(isCOGS('Omzet'), false);
                assertEquals(isCOGS('Kosten'), false);
            });
        });

        describe('isOperatingExpense', () => {
            it('identifies operating expenses', () => {
                assertEquals(isOperatingExpense('Bedrijfskosten'), true);
                assertEquals(isOperatingExpense('Kosten'), true);
            });

            it('rejects non-operating items', () => {
                assertEquals(isOperatingExpense('Omzet'), false);
            });
        });

        describe('isOtherIncome', () => {
            it('identifies other income', () => {
                assertEquals(isOtherIncome('Overige opbrengsten'), true);
                assertEquals(isOtherIncome('Financiële baten'), true);
                assertEquals(isOtherIncome('Buitengewone baten'), true);
                assertEquals(isOtherIncome('Afrondingsverschil'), true);
            });

            it('rejects regular income', () => {
                assertEquals(isOtherIncome('Omzet'), false);
            });
        });

        describe('isTax', () => {
            it('identifies tax items', () => {
                assertEquals(isTax('Belastingen'), true);
                assertEquals(isTax('Tax'), true);
            });

            it('rejects non-tax items', () => {
                assertEquals(isTax('Revenue'), false);
            });
        });
    });

    describe('Cash Flow Categories', () => {
        describe('isDepreciation', () => {
            it('identifies depreciation', () => {
                assertEquals(isDepreciation('Afschrijvingen'), true);
                assertEquals(isDepreciation('Depreciation'), true);
                assertEquals(isDepreciation('Amortization'), true);
            });

            it('rejects non-depreciation', () => {
                assertEquals(isDepreciation('Revenue'), false);
            });
        });

        describe('isCurrentAsset', () => {
            it('identifies current assets', () => {
                assertEquals(isCurrentAsset('Vlottende activa'), true);
                assertEquals(isCurrentAsset('Current assets'), true);
            });

            it('rejects non-current assets', () => {
                assertEquals(isCurrentAsset('Vaste activa'), false);
            });
        });

        describe('isFixedAsset', () => {
            it('identifies fixed assets', () => {
                assertEquals(isFixedAsset('Vaste activa'), true);
                assertEquals(isFixedAsset('Fixed assets'), true);
            });

            it('rejects non-fixed assets', () => {
                assertEquals(isFixedAsset('Vlottende activa'), false);
            });
        });

        describe('isLongTermLiability', () => {
            it('identifies long-term liabilities', () => {
                assertEquals(isLongTermLiability('Langlopende schulden'), true);
                assertEquals(isLongTermLiability('Long-term debt'), true);
                assertEquals(isLongTermLiability('Eigen vermogen'), true);
            });

            it('rejects short-term items', () => {
                assertEquals(isLongTermLiability('Kortlopende schulden'), false);
            });
        });
    });

    describe('isLiabilityOrEquity', () => {
        it('identifies liabilities and equity', () => {
            assertEquals(isLiabilityOrEquity('Passiva'), true);
            assertEquals(isLiabilityOrEquity('Eigen vermogen'), true);
            assertEquals(isLiabilityOrEquity('Schulden'), true);
            assertEquals(isLiabilityOrEquity('Equity'), true);
        });

        it('rejects assets', () => {
            assertEquals(isLiabilityOrEquity('Assets'), false);
            assertEquals(isLiabilityOrEquity('Activa'), false);
        });
    });

    describe('classifyCategory', () => {
        it('classifies assets', () => {
            assertEquals(classifyCategory('Materiële vaste activa'), 'asset');
        });

        it('classifies liabilities', () => {
            assertEquals(classifyCategory('Schulden'), 'liability');
        });

        it('classifies equity', () => {
            assertEquals(classifyCategory('Eigen vermogen'), 'equity');
        });

        it('classifies revenue', () => {
            assertEquals(classifyCategory('Omzet'), 'revenue');
        });

        it('classifies COGS', () => {
            assertEquals(classifyCategory('Kostprijs van omzet'), 'cogs');
        });

        it('classifies operating expenses', () => {
            assertEquals(classifyCategory('Bedrijfskosten'), 'operating_expense');
        });

        it('classifies other income', () => {
            assertEquals(classifyCategory('Overige opbrengsten'), 'other_income');
        });

        it('classifies tax', () => {
            assertEquals(classifyCategory('Belastingen'), 'tax');
        });

        it('returns unknown for unrecognized categories', () => {
            assertEquals(classifyCategory('Something else'), 'unknown');
            assertEquals(classifyCategory(null), 'unknown');
        });
    });

    describe('filterByCategory', () => {
        it('filters items by category predicate', () => {
            const items = [
                { category: 'Materiële vaste activa', value: 100 },
                { category: 'Schulden', value: 200 },
                { category: 'Voorraden', value: 300 }
            ] as Array<{ category?: string; value: number }>;

            const assets = filterByCategory(isAsset)(items);
            assertEquals(assets.length, 2);
            assertEquals(assets[0]!.value, 100);
            assertEquals(assets[1]!.value, 300);
        });

        it('handles empty arrays', () => {
            const items: Array<{ category?: string }> = [];
            const result = filterByCategory(isAsset)(items);
            assertEquals(result.length, 0);
        });

        it('handles items with null categories', () => {
            const items = [
                { category: 'Materiële vaste activa', value: 100 },
                { category: null, value: 200 }
            ] as Array<{ category?: string | null; value: number }>;

            const assets = filterByCategory(isAsset)(items);
            assertEquals(assets.length, 1);
            assertEquals(assets[0]!.value, 100);
        });
    });
});
