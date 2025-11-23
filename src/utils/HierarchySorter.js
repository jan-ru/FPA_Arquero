/**
 * HierarchySorter - Handles sorting of hierarchy nodes
 *
 * Provides consistent sorting logic for financial statement hierarchies
 * based on code fields (code0-code3), account codes, and hierarchy paths
 */

export class HierarchySorter {
    /**
     * Compare two hierarchy nodes for sorting
     * @param {Object} a - First node
     * @param {Object} b - Second node
     * @returns {number} Negative if a < b, positive if a > b, 0 if equal
     */
    static compareNodes(a, b) {
        // Sort by code hierarchy: code0 -> code1 -> code2 -> code3
        const codeFields = ['code0', 'code1', 'code2', 'code3'];

        for (const field of codeFields) {
            const diff = this.compareCodeField(a[field], b[field]);
            if (diff !== 0) return diff;
        }

        // Then by account_code
        const acctA = a.account_code || '';
        const acctB = b.account_code || '';
        if (acctA !== acctB) return acctA.localeCompare(acctB);

        // If all codes are equal, sort by hierarchy path
        return this.compareHierarchyPath(a.hierarchy || [], b.hierarchy || []);
    }

    /**
     * Compare two code field values
     * Handles both numeric codes and text codes (e.g., 'Activa', 'Passiva')
     * @param {string|number} codeA - First code
     * @param {string|number} codeB - Second code
     * @returns {number} Comparison result
     */
    static compareCodeField(codeA, codeB) {
        const numA = this.toNum(codeA);
        const numB = this.toNum(codeB);

        // If both are non-numeric (text), use alphabetic comparison
        if (numA === 999999 && numB === 999999) {
            const strA = codeA || '';
            const strB = codeB || '';
            return strA.localeCompare(strB);
        }

        // Otherwise use numeric comparison
        return numA - numB;
    }

    /**
     * Convert code to number for sorting
     * Returns 999999 for empty/non-numeric codes (sorts them last)
     * @param {string|number} code - Code to convert
     * @returns {number} Numeric value
     */
    static toNum(code) {
        if (!code && code !== 0) return 999999; // Empty codes go last
        const num = parseInt(code);
        return isNaN(num) ? 999999 : num;
    }

    /**
     * Compare hierarchy paths element by element
     * @param {Array<string>} pathA - First hierarchy path
     * @param {Array<string>} pathB - Second hierarchy path
     * @returns {number} Comparison result
     */
    static compareHierarchyPath(pathA, pathB) {
        const maxLength = Math.max(pathA.length, pathB.length);
        for (let i = 0; i < maxLength; i++) {
            const valA = pathA[i] || '';
            const valB = pathB[i] || '';
            if (valA !== valB) return valA.localeCompare(valB);
        }
        return 0;
    }
}

export default HierarchySorter;
