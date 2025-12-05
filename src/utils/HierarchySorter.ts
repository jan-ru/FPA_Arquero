/**
 * HierarchySorter - Handles sorting of hierarchy nodes
 *
 * Provides consistent sorting logic for financial statement hierarchies
 * based on code fields (code0-code3), account codes, and hierarchy paths
 */

export interface HierarchyNode {
    code0?: string | number;
    code1?: string | number;
    code2?: string | number;
    code3?: string | number;
    account_code?: string;
    hierarchy?: string[];
    [key: string]: unknown;
}

export class HierarchySorter {
    /**
     * Compare two hierarchy nodes for sorting
     * @param a - First node
     * @param b - Second node
     * @returns Negative if a < b, positive if a > b, 0 if equal
     */
    static compareNodes(a: HierarchyNode, b: HierarchyNode): number {
        // Sort by code hierarchy: code0 -> code1 -> code2 -> code3
        const codeFields: Array<keyof HierarchyNode> = ['code0', 'code1', 'code2', 'code3'];

        for (const field of codeFields) {
            const diff = this.compareCodeField(a[field] as string | number, b[field] as string | number);
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
     * @param codeA - First code
     * @param codeB - Second code
     * @returns Comparison result
     */
    static compareCodeField(codeA: string | number | undefined, codeB: string | number | undefined): number {
        const numA = this.toNum(codeA);
        const numB = this.toNum(codeB);

        // If both are non-numeric (text), use alphabetic comparison
        if (numA === 999999 && numB === 999999) {
            const strA = codeA?.toString() || '';
            const strB = codeB?.toString() || '';
            return strA.localeCompare(strB);
        }

        // Otherwise use numeric comparison
        return numA - numB;
    }

    /**
     * Convert code to number for sorting
     * Returns 999999 for empty/non-numeric codes (sorts them last)
     * @param code - Code to convert
     * @returns Numeric value
     */
    static toNum(code: string | number | undefined): number {
        if (code === undefined || code === null || code === '') return 999999; // Empty codes go last
        if (code === 0) return 0; // Handle zero explicitly
        
        const num = typeof code === 'number' ? code : parseInt(code.toString());
        return isNaN(num) ? 999999 : num;
    }

    /**
     * Compare hierarchy paths element by element
     * @param pathA - First hierarchy path
     * @param pathB - Second hierarchy path
     * @returns Comparison result
     */
    static compareHierarchyPath(pathA: string[], pathB: string[]): number {
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
