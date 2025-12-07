/**
 * Account Sign Handling - Pure Functions
 * 
 * Handles sign adjustments for Balance Sheet accounts.
 * In Dutch accounting, Passiva (liabilities and equity) are stored as negative
 * numbers in trial balance but displayed as positive in financial statements.
 */

import { HIERARCHY_CODES } from '../../constants.ts';

/**
 * Account code range
 */
export interface CodeRange {
    readonly min: number;
    readonly max: number;
}

/**
 * Arquero table type (minimal typing for external library)
 */
type ArqueroTable = any;

/**
 * Parse account code to number
 * 
 * @param code - Account code (string or number)
 * @returns Parsed number
 * 
 * @example
 * parseCode('60'); // 60
 * parseCode(60);   // 60
 */
export const parseCode = (code: string | number): number =>
    typeof code === 'number' ? code : parseInt(String(code));

/**
 * Check if a code is within a range
 * 
 * @param range - Code range with min and max
 * @returns Function that checks if code is in range
 * 
 * @example
 * const isPassivaRange = isInRange({ min: 60, max: 90 });
 * isPassivaRange(70); // true
 * isPassivaRange(50); // false
 */
export const isInRange = (range: CodeRange) => (code: number): boolean =>
    code >= range.min && code <= range.max;

/**
 * Check if an account is a Passiva account
 * Passiva accounts are liabilities and equity (codes 60-90)
 * 
 * @param code1 - Level 1 account code
 * @returns True if Passiva account
 * 
 * @example
 * isPassiva(60); // true (Eigen vermogen)
 * isPassiva(80); // true (Kortlopende schulden)
 * isPassiva(30); // false (Activa)
 */
export const isPassiva = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return isInRange(HIERARCHY_CODES.PASSIVA_RANGE)(codeNum);
};

/**
 * Check if an account is an Activa account
 * Activa accounts are assets (codes 0-50)
 * 
 * @param code1 - Level 1 account code
 * @returns True if Activa account
 * 
 * @example
 * isActiva(10); // true (Vaste activa)
 * isActiva(30); // true (Vlottende activa)
 * isActiva(60); // false (Passiva)
 */
export const isActiva = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return isInRange(HIERARCHY_CODES.ACTIVA_RANGE)(codeNum);
};

/**
 * Get the sign multiplier for an account
 * Passiva accounts need sign flip (-1), Activa accounts don't (1)
 * 
 * @param code1 - Level 1 account code
 * @returns -1 for Passiva, 1 for Activa
 * 
 * @example
 * getSignMultiplier(60); // -1 (Passiva)
 * getSignMultiplier(30); // 1 (Activa)
 */
export const getSignMultiplier = (code1: string | number): number =>
    isPassiva(code1) ? -1 : 1;

/**
 * Apply sign adjustment to a value based on account code
 * 
 * @param code1 - Level 1 account code
 * @param value - Value to adjust
 * @returns Adjusted value (flipped for Passiva, unchanged for Activa)
 * 
 * @example
 * applySignAdjustment(60, -100); // 100 (Passiva: flip sign)
 * applySignAdjustment(30, 100);  // 100 (Activa: no change)
 */
export const applySignAdjustment = (code1: string | number, value: number): number =>
    value * getSignMultiplier(code1);

/**
 * Create a sign adjustment function for a specific code
 * Curried for partial application
 * 
 * @param code1 - Level 1 account code
 * @returns Function that adjusts values for this account
 * 
 * @example
 * const adjustPassiva = createSignAdjuster(60);
 * adjustPassiva(-100); // 100
 * adjustPassiva(-200); // 200
 */
export const createSignAdjuster = (code1: string | number) =>
    (value: number): number =>
        applySignAdjustment(code1, value);

/**
 * Flip signs for Balance Sheet Passiva accounts
 * Uses Arquero's derive() to create new columns with adjusted signs
 * 
 * @param data - Arquero table with aggregated data
 * @param col1 - First amount column name (e.g., 'amount_2024')
 * @param col2 - Second amount column name (e.g., 'amount_2025')
 * @returns Arquero table with sign-adjusted amounts
 * 
 * @example
 * const adjusted = flipSignForPassiva(
 *   aggregated,
 *   'amount_2024',
 *   'amount_2025'
 * );
 */
export const flipSignForPassiva = (
    data: ArqueroTable,
    col1: string,
    col2: string
): ArqueroTable => {
    // Access global Arquero
    const aq = (globalThis as any).aq;
    
    return data.derive({
        [col1]: aq.escape((d: any) => {
            const shouldFlip = isPassiva(d.code1);
            return shouldFlip ? -d[col1] : d[col1];
        }),
        [col2]: aq.escape((d: any) => {
            const shouldFlip = isPassiva(d.code1);
            return shouldFlip ? -d[col2] : d[col2];
        })
    });
};

/**
 * Create a sign flipper for specific columns
 * Curried for partial application
 * 
 * @param col1 - First column name
 * @param col2 - Second column name
 * @returns Function that flips signs in Arquero table
 * 
 * @example
 * const flipYears = createSignFlipper('amount_2024', 'amount_2025');
 * const adjusted = flipYears(data);
 */
export const createSignFlipper = (col1: string, col2: string) =>
    (data: ArqueroTable): ArqueroTable =>
        flipSignForPassiva(data, col1, col2);

/**
 * Check if an account is fixed assets (Vaste activa)
 * 
 * @param code1 - Level 1 account code
 * @returns True if fixed assets
 * 
 * @example
 * isFixedAssets(10); // true
 * isFixedAssets(30); // false (current assets)
 */
export const isFixedAssets = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return HIERARCHY_CODES.ACTIVA_VASTE.includes(codeNum);
};

/**
 * Check if an account is current assets (Vlottende activa)
 * 
 * @param code1 - Level 1 account code
 * @returns True if current assets
 * 
 * @example
 * isCurrentAssets(30); // true
 * isCurrentAssets(10); // false (fixed assets)
 */
export const isCurrentAssets = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return HIERARCHY_CODES.ACTIVA_VLOTTENDE.includes(codeNum);
};

/**
 * Check if an account is equity (Eigen vermogen)
 * 
 * @param code1 - Level 1 account code
 * @returns True if equity
 * 
 * @example
 * isEquity(60); // true
 * isEquity(80); // false (liabilities)
 */
export const isEquity = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return HIERARCHY_CODES.PASSIVA_EIGEN_VERMOGEN.includes(codeNum);
};

/**
 * Check if an account is long-term liability (Langlopende schulden)
 * 
 * @param code1 - Level 1 account code
 * @returns True if long-term liability
 * 
 * @example
 * isLongTermLiability(65); // true
 * isLongTermLiability(80); // false (short-term)
 */
export const isLongTermLiability = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return HIERARCHY_CODES.PASSIVA_LANGE_TERMIJN.includes(codeNum);
};

/**
 * Check if an account is short-term liability (Kortlopende schulden)
 * 
 * @param code1 - Level 1 account code
 * @returns True if short-term liability
 * 
 * @example
 * isShortTermLiability(80); // true
 * isShortTermLiability(65); // false (long-term)
 */
export const isShortTermLiability = (code1: string | number): boolean => {
    const codeNum = parseCode(code1);
    return HIERARCHY_CODES.PASSIVA_KORTE_TERMIJN.includes(codeNum);
};

/**
 * Classify an account by its code
 * 
 * @param code1 - Level 1 account code
 * @returns Account classification
 * 
 * @example
 * classifyAccount(10); // 'fixed_assets'
 * classifyAccount(60); // 'equity'
 * classifyAccount(80); // 'short_term_liability'
 */
export const classifyAccount = (code1: string | number): string => {
    if (isFixedAssets(code1)) return 'fixed_assets';
    if (isCurrentAssets(code1)) return 'current_assets';
    if (isEquity(code1)) return 'equity';
    if (isLongTermLiability(code1)) return 'long_term_liability';
    if (isShortTermLiability(code1)) return 'short_term_liability';
    return 'unknown';
};

/**
 * Batch apply sign adjustments to multiple values
 * 
 * @param code1 - Level 1 account code
 * @param values - Array of values to adjust
 * @returns Array of adjusted values
 * 
 * @example
 * batchApplySignAdjustment(60, [-100, -200, -300]);
 * // [100, 200, 300] (all flipped for Passiva)
 */
export const batchApplySignAdjustment = (
    code1: string | number,
    values: readonly number[]
): number[] => {
    const multiplier = getSignMultiplier(code1);
    return values.map(v => v * multiplier);
};
