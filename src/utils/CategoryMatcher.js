/**
 * CategoryMatcher - Utility for matching categories against patterns
 * Used for identifying financial statement categories (Assets, Liabilities, Revenue, etc.)
 */

import { CATEGORY_DEFINITIONS } from '../constants.js';

export default class CategoryMatcher {
    /**
     * Check if a category name matches any of the given patterns
     * @param {string} categoryName - The category name to check
     * @param {string[]} patterns - Array of patterns to match
     * @param {string[]} excludePatterns - Optional patterns to exclude
     * @returns {boolean} True if matches any pattern and not excluded
     */
    static matches(categoryName, patterns, excludePatterns = []) {
        if (!categoryName) return false;

        const lower = categoryName.toLowerCase();
        const hasMatch = patterns.some(pattern => lower.includes(pattern.toLowerCase()));
        const hasExclude = excludePatterns.length > 0 &&
                          excludePatterns.some(pattern => lower.includes(pattern.toLowerCase()));

        return hasMatch && !hasExclude;
    }

    // Balance Sheet category matchers
    static isAsset(categoryName) {
        return CATEGORY_DEFINITIONS.ASSETS.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    static isLiability(categoryName) {
        return CATEGORY_DEFINITIONS.LIABILITIES.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    static isEquity(categoryName) {
        return CATEGORY_DEFINITIONS.EQUITY.some(cat =>
            this.matches(categoryName, [cat])
        );
    }

    // Income Statement category matchers
    static isRevenue(categoryName) {
        return this.matches(categoryName, ['omzet'], ['kostprijs']);
    }

    static isCOGS(categoryName) {
        return this.matches(categoryName, ['kostprijs']);
    }

    static isOperatingExpense(categoryName) {
        return this.matches(categoryName, ['kosten', 'bedrijf']);
    }

    static isOtherIncome(categoryName) {
        return this.matches(categoryName, ['overige', 'opbrengst']);
    }

    static isTax(categoryName) {
        return this.matches(categoryName, ['belasting', 'tax']);
    }

    // Cash Flow category matchers
    static isDepreciation(categoryName) {
        return this.matches(categoryName, ['afschrijving', 'depreciation', 'amortization']);
    }

    static isCurrentAsset(categoryName) {
        return this.matches(categoryName, ['vlottende', 'current']);
    }

    static isFixedAsset(categoryName) {
        return this.matches(categoryName, ['vaste activa', 'fixed assets']);
    }

    static isLongTermLiability(categoryName) {
        return this.matches(categoryName, ['eigen vermogen', 'equity', 'langlopend', 'long-term']);
    }

    // UI rendering helpers
    static isLiabilityOrEquity(categoryName) {
        return this.matches(categoryName, ['passiva', 'vermogen', 'liabilit', 'equity', 'schuld']);
    }
}
