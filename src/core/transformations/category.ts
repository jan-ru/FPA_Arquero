/**
 * Category Matching - Pure Functions
 * 
 * Functional implementation for matching financial statement categories.
 * All functions are pure - no side effects, no state, fully testable.
 */

import { CATEGORY_DEFINITIONS } from '../../constants.ts';

/**
 * Category definition with patterns
 */
export interface CategoryDefinition {
    readonly name: string;
    readonly patterns: readonly string[];
    readonly excludePatterns?: readonly string[];
}

/**
 * Normalize a string for case-insensitive matching
 */
const normalize = (str: string): string => str.toLowerCase();

/**
 * Check if a string contains a pattern (case-insensitive)
 * 
 * @param text - Text to search in
 * @param pattern - Pattern to search for
 * @returns True if pattern is found
 * 
 * @example
 * containsPattern('Total Assets', 'asset'); // true
 * containsPattern('Total Assets', 'liability'); // false
 */
export const containsPattern = (text: string, pattern: string): boolean =>
    normalize(text).includes(normalize(pattern));

/**
 * Check if a string matches any of the given patterns
 * 
 * @param patterns - Array of patterns to match
 * @returns Function that checks if text matches any pattern
 * 
 * @example
 * const isAssetPattern = matchesAnyPattern(['asset', 'activa']);
 * isAssetPattern('Total Assets'); // true
 */
export const matchesAnyPattern = (patterns: readonly string[]) => 
    (text: string): boolean =>
        patterns.some(pattern => containsPattern(text, pattern));

/**
 * Check if a string matches none of the given patterns
 * 
 * @param patterns - Array of patterns to exclude
 * @returns Function that checks if text matches no pattern
 * 
 * @example
 * const notCOGS = matchesNoPattern(['kostprijs']);
 * notCOGS('Revenue'); // true
 * notCOGS('Kostprijs van omzet'); // false
 */
export const matchesNoPattern = (patterns: readonly string[]) =>
    (text: string): boolean =>
        !patterns.some(pattern => containsPattern(text, pattern));

/**
 * Check if a category name matches patterns with optional exclusions
 * 
 * @param patterns - Patterns that must match
 * @param excludePatterns - Patterns that must not match
 * @returns Function that checks if category matches
 * 
 * @example
 * const isRevenue = matches(['omzet'], ['kostprijs']);
 * isRevenue('Omzet'); // true
 * isRevenue('Kostprijs van omzet'); // false
 */
export const matches = (
    patterns: readonly string[],
    excludePatterns: readonly string[] = []
) => (categoryName: string | null | undefined): boolean => {
    if (!categoryName) return false;
    
    const hasMatch = matchesAnyPattern(patterns)(categoryName);
    const hasExclude = excludePatterns.length > 0 && 
                      matchesAnyPattern(excludePatterns)(categoryName);
    
    return hasMatch && !hasExclude;
};

/**
 * Create a category matcher from a definition
 * 
 * @param definition - Category definition with patterns
 * @returns Function that checks if category matches definition
 * 
 * @example
 * const assetDef = { name: 'Asset', patterns: ['asset', 'activa'] };
 * const isAsset = matchesCategory(assetDef);
 * isAsset('Total Assets'); // true
 */
export const matchesCategory = (definition: CategoryDefinition) =>
    matches(definition.patterns, definition.excludePatterns);

// Balance Sheet Category Matchers

/**
 * Check if category is an Asset
 * 
 * @example
 * isAsset('Materiële vaste activa'); // true
 * isAsset('Schulden'); // false
 */
export const isAsset = (categoryName: string | null | undefined): boolean =>
    CATEGORY_DEFINITIONS.ASSETS.some(cat =>
        matches([cat])(categoryName)
    );

/**
 * Check if category is a Liability
 * 
 * @example
 * isLiability('Schulden'); // true
 * isLiability('Assets'); // false
 */
export const isLiability = (categoryName: string | null | undefined): boolean =>
    CATEGORY_DEFINITIONS.LIABILITIES.some(cat =>
        matches([cat])(categoryName)
    );

/**
 * Check if category is Equity
 * 
 * @example
 * isEquity('Eigen vermogen'); // true
 * isEquity('Assets'); // false
 */
export const isEquity = (categoryName: string | null | undefined): boolean =>
    CATEGORY_DEFINITIONS.EQUITY.some(cat =>
        matches([cat])(categoryName)
    );

// Income Statement Category Matchers

/**
 * Check if category is Revenue
 * Matches 'omzet' but excludes 'kostprijs'
 * 
 * @example
 * isRevenue('Omzet'); // true
 * isRevenue('Kostprijs van omzet'); // false
 */
export const isRevenue = matches(['omzet'], ['kostprijs']);

/**
 * Check if category is Cost of Goods Sold (COGS)
 * 
 * @example
 * isCOGS('Kostprijs van omzet'); // true
 * isCOGS('Omzet'); // false
 */
export const isCOGS = matches(['kostprijs']);

/**
 * Check if category is Operating Expense
 * 
 * @example
 * isOperatingExpense('Bedrijfskosten'); // true
 * isOperatingExpense('Revenue'); // false
 */
export const isOperatingExpense = matches(['kosten', 'bedrijf']);

/**
 * Check if category is Other Income
 * Includes financial income/expenses, extraordinary items, rounding differences
 * 
 * @example
 * isOtherIncome('Overige opbrengsten'); // true
 * isOtherIncome('Financiële baten'); // true
 */
export const isOtherIncome = matches([
    'overige', 'opbrengst',
    'financiële', 'baten', 'lasten',
    'buitengewone',
    'afrondingsverschil', 'afronding'
]);

/**
 * Check if category is Tax
 * 
 * @example
 * isTax('Belastingen'); // true
 * isTax('Revenue'); // false
 */
export const isTax = matches(['belasting', 'tax']);

// Cash Flow Category Matchers

/**
 * Check if category is Depreciation/Amortization
 * 
 * @example
 * isDepreciation('Afschrijvingen'); // true
 * isDepreciation('Revenue'); // false
 */
export const isDepreciation = matches(['afschrijving', 'depreciation', 'amortization']);

/**
 * Check if category is Current Asset
 * 
 * @example
 * isCurrentAsset('Vlottende activa'); // true
 * isCurrentAsset('Fixed assets'); // false
 */
export const isCurrentAsset = matches(['vlottende', 'current']);

/**
 * Check if category is Fixed Asset
 * 
 * @example
 * isFixedAsset('Vaste activa'); // true
 * isFixedAsset('Current assets'); // false
 */
export const isFixedAsset = matches(['vaste activa', 'fixed assets']);

/**
 * Check if category is Long-term Liability
 * 
 * @example
 * isLongTermLiability('Langlopende schulden'); // true
 * isLongTermLiability('Current liabilities'); // false
 */
export const isLongTermLiability = matches(['eigen vermogen', 'equity', 'langlopend', 'long-term']);

/**
 * Check if category is Liability or Equity (for balance sheet right side)
 * 
 * @example
 * isLiabilityOrEquity('Passiva'); // true
 * isLiabilityOrEquity('Assets'); // false
 */
export const isLiabilityOrEquity = matches(['passiva', 'vermogen', 'liabilit', 'equity', 'schuld']);

/**
 * Create a category classifier that returns the category type
 * 
 * @param categoryName - Category name to classify
 * @returns Category type or 'unknown'
 * 
 * @example
 * classifyCategory('Materiële vaste activa'); // 'asset'
 * classifyCategory('Schulden'); // 'liability'
 */
export const classifyCategory = (categoryName: string | null | undefined): string => {
    if (isAsset(categoryName)) return 'asset';
    if (isLiability(categoryName)) return 'liability';
    if (isEquity(categoryName)) return 'equity';
    if (isRevenue(categoryName)) return 'revenue';
    if (isCOGS(categoryName)) return 'cogs';
    if (isOperatingExpense(categoryName)) return 'operating_expense';
    if (isOtherIncome(categoryName)) return 'other_income';
    if (isTax(categoryName)) return 'tax';
    return 'unknown';
};

/**
 * Create a category filter for arrays
 * 
 * @param predicate - Category matching function
 * @returns Function that filters array by category
 * 
 * @example
 * const assets = filterByCategory(isAsset)(categories);
 */
export const filterByCategory = <T extends Record<string, any>>(
    predicate: (categoryName: string | null | undefined) => boolean
) => (items: readonly T[]): T[] =>
    items.filter(item => predicate(item.category));
