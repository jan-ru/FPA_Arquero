/**
 * CategoryMatcher - Utility for matching categories against patterns
 * Used for identifying financial statement categories (Assets, Liabilities, Revenue, etc.)
 */

import { CATEGORY_DEFINITIONS } from '../constants.js';

export default class CategoryMatcher {
    /**
     * Check if a category name matches any of the given patterns
     * @param categoryName - The category name to check
     * @param patterns - Array of patterns to match
     * @param excludePatterns - Optional patterns to exclude
     * @returns True if matches any pattern and not excluded
     */
    static matches(categoryName: string | null | undefined, patterns: string[], excludePatterns: string[] = []): boolean {
        if (!categoryName) return false;

        const lower = categoryName.toLowerCase();
        const hasMatch = patterns.some(pattern => lower.includes(pattern.toLowerCase()));
        const hasExclude = excludePatterns.length > 0 &&
                          excludePatterns.some(pattern => lower.includes(pattern.toLowerCase()));

        return hasMatch && !hasExclude;
    }

    // Balance Sheet category matchers
    static isAsset(categoryName: string | null | undefined): boolean {
        return CATEGORY_DEFINITIONS.ASSETS.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    static isLiability(categoryName: string | null | undefined): boolean {
        return CATEGORY_DEFINITIONS.LIABILITIES.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    static isEquity(categoryName: string | null | undefined): boolean {
        return CATEGORY_DEFINITIONS.EQUITY.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    // Income Statement category matchers
    static isRevenue(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['omzet'], ['kostprijs']);
    }

    static isCOGS(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['kostprijs']);
    }

    static isOperatingExpense(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['kosten', 'bedrijf']);
    }

    static isOtherIncome(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, [
            'overige', 'opbrengst',
            'financiële', 'baten', 'lasten',  // Financiële baten en lasten
            'buitengewone',                    // Buitengewone baten en lasten
            'afrondingsverschil', 'afronding'  // Afrondingsverschil
        ]);
    }

    static isTax(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['belasting', 'tax']);
    }

    // Cash Flow category matchers
    static isDepreciation(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['afschrijving', 'depreciation', 'amortization']);
    }

    static isCurrentAsset(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['vlottende', 'current']);
    }

    static isFixedAsset(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['vaste activa', 'fixed assets']);
    }

    static isLongTermLiability(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['eigen vermogen', 'equity', 'langlopend', 'long-term']);
    }

    // UI rendering helpers
    static isLiabilityOrEquity(categoryName: string | null | undefined): boolean {
        return this.matches(categoryName, ['passiva', 'vermogen', 'liabilit', 'equity', 'schuld']);
    }
}
