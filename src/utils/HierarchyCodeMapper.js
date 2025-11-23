/**
 * HierarchyCodeMapper - Maps account codes to hierarchy levels
 *
 * Determines code0 (Activa/Passiva) and name0 based on code1 values.
 * Uses predefined ranges from constants to categorize accounts.
 */

import { HIERARCHY_CODES } from '../constants.js';

export class HierarchyCodeMapper {
    /**
     * Get code0 and name0 based on code1
     * @param {string|number} code1 - Level 1 code
     * @returns {Object} Object with code0 and name0 properties
     *
     * @example
     * HierarchyCodeMapper.getCode0AndName0('10')
     * // Returns: { code0: 'Activa', name0: 'vaste activa' }
     *
     * HierarchyCodeMapper.getCode0AndName0('80')
     * // Returns: { code0: 'Passiva', name0: 'korte termijn schulden' }
     */
    static getCode0AndName0(code1) {
        const code1Num = parseInt(code1);

        // Check each category range
        if (HIERARCHY_CODES.ACTIVA_VASTE.includes(code1Num)) {
            return { code0: 'Activa', name0: 'vaste activa' };
        }

        if (HIERARCHY_CODES.ACTIVA_VLOTTENDE.includes(code1Num)) {
            return { code0: 'Activa', name0: 'vlottende activa' };
        }

        if (HIERARCHY_CODES.PASSIVA_EIGEN_VERMOGEN.includes(code1Num)) {
            return { code0: 'Passiva', name0: 'eigen vermogen' };
        }

        if (HIERARCHY_CODES.PASSIVA_LANGE_TERMIJN.includes(code1Num)) {
            return { code0: 'Passiva', name0: 'lange termijn schulden' };
        }

        if (HIERARCHY_CODES.PASSIVA_KORTE_TERMIJN.includes(code1Num)) {
            return { code0: 'Passiva', name0: 'korte termijn schulden' };
        }

        // Default: empty strings
        return { code0: '', name0: '' };
    }

    /**
     * Check if code1 is in Activa range
     * @param {string|number} code1 - Level 1 code
     * @returns {boolean} True if Activa
     */
    static isActiva(code1) {
        const code1Num = parseInt(code1);
        return HIERARCHY_CODES.ACTIVA_VASTE.includes(code1Num) ||
               HIERARCHY_CODES.ACTIVA_VLOTTENDE.includes(code1Num);
    }

    /**
     * Check if code1 is in Passiva range
     * @param {string|number} code1 - Level 1 code
     * @returns {boolean} True if Passiva
     */
    static isPassiva(code1) {
        const code1Num = parseInt(code1);
        return HIERARCHY_CODES.PASSIVA_EIGEN_VERMOGEN.includes(code1Num) ||
               HIERARCHY_CODES.PASSIVA_LANGE_TERMIJN.includes(code1Num) ||
               HIERARCHY_CODES.PASSIVA_KORTE_TERMIJN.includes(code1Num);
    }

    /**
     * Get all valid code1 values
     * @returns {Array<number>} Array of all valid code1 values
     */
    static getAllValidCodes() {
        return [
            ...HIERARCHY_CODES.ACTIVA_VASTE,
            ...HIERARCHY_CODES.ACTIVA_VLOTTENDE,
            ...HIERARCHY_CODES.PASSIVA_EIGEN_VERMOGEN,
            ...HIERARCHY_CODES.PASSIVA_LANGE_TERMIJN,
            ...HIERARCHY_CODES.PASSIVA_KORTE_TERMIJN
        ];
    }
}

export default HierarchyCodeMapper;
