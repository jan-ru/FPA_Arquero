/**
 * AccountSignHandler - Handles sign adjustments for Balance Sheet accounts
 *
 * In Dutch accounting, Balance Sheet Passiva (liabilities and equity) are stored
 * as negative numbers in the trial balance but displayed as positive numbers in
 * financial statements. This utility handles the sign conversion.
 */

import { HIERARCHY_CODES } from '../constants.js';

// Type for Arquero table (minimal typing)
type ArqueroTable = any;

// Declare global Arquero
declare const aq: any;

export class AccountSignHandler {
    /**
     * Check if an account is a Passiva account based on code1
     * @param code1 - Level 1 account code
     * @returns True if Passiva account
     */
    static isPassiva(code1: string | number): boolean {
        const code1Num = parseInt(String(code1));
        return code1Num >= HIERARCHY_CODES.PASSIVA_RANGE.min &&
               code1Num <= HIERARCHY_CODES.PASSIVA_RANGE.max;
    }

    /**
     * Check if an account is an Activa account based on code1
     * @param code1 - Level 1 account code
     * @returns True if Activa account
     */
    static isActiva(code1: string | number): boolean {
        const code1Num = parseInt(String(code1));
        return code1Num >= HIERARCHY_CODES.ACTIVA_RANGE.min &&
               code1Num <= HIERARCHY_CODES.ACTIVA_RANGE.max;
    }

    /**
     * Flip signs for Balance Sheet Passiva accounts to show as positive
     * Uses Arquero's derive() with aq.escape() to allow JavaScript closures
     *
     * @param data - Arquero table with aggregated data
     * @param col1 - First amount column name (e.g., 'amount_2024')
     * @param col2 - Second amount column name (e.g., 'amount_2025')
     * @returns Arquero table with sign-adjusted amounts
     *
     * @example
     * const adjusted = AccountSignHandler.flipSignForPassiva(
     *   aggregated,
     *   'amount_2024',
     *   'amount_2025'
     * );
     */
    static flipSignForPassiva(data: ArqueroTable, col1: string, col2: string): ArqueroTable {
        return data.derive({
            [col1]: aq.escape((d: any) => {
                const isPassiva = AccountSignHandler.isPassiva(d.code1);
                return isPassiva ? -d[col1] : d[col1];
            }),
            [col2]: aq.escape((d: any) => {
                const isPassiva = AccountSignHandler.isPassiva(d.code1);
                return isPassiva ? -d[col2] : d[col2];
            })
        });
    }

    /**
     * Get the sign multiplier for a specific account
     * @param code1 - Level 1 account code
     * @returns -1 for Passiva, 1 for Activa
     */
    static getSignMultiplier(code1: string | number): number {
        return this.isPassiva(code1) ? -1 : 1;
    }
}

export default AccountSignHandler;
