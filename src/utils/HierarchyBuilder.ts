/**
 * HierarchyBuilder - Builds hierarchical tree structure from flat data
 *
 * Converts flat financial data into a hierarchical tree structure with
 * aggregated amounts at each level. Supports flexible depth levels.
 */

import HierarchySorter from './HierarchySorter.ts';
import Logger from './Logger.ts';
import VarianceCalculator from './VarianceCalculator.ts';

export type DetailLevel = 'level0' | 'level1' | 'level2' | 'level3' | 'level4' | 'level5';

export interface DetailRow {
    code0?: string;
    name0?: string;
    code1?: string | number;
    name1?: string;
    code2?: string | number;
    name2?: string;
    code3?: string | number;
    name3?: string;
    account_code?: string;
    account_description?: string;
    amount_2024?: number;
    amount_2025?: number;
    [key: string]: unknown;
}

export interface HierarchyNode {
    hierarchy: string[];
    level: number;
    label: string;
    code0: string;
    name0: string;
    code1: string | number;
    name1: string;
    code2: string | number;
    name2: string;
    code3: string | number;
    name3: string;
    account_code: string;
    account_description: string;
    amount_2024: number;
    amount_2025: number;
    variance_amount: number;
    variance_percent: number;
    _rowType: 'detail' | 'group';
    [key: string]: unknown;
}

export class HierarchyBuilder {
    /**
     * Build hierarchical tree from flat detail data
     * @param details - Flat array of detail objects
     * @param detailLevel - Level identifier (level0-level5)
     * @returns Sorted array of hierarchy nodes with aggregated amounts
     */
    static buildTree(details: DetailRow[], detailLevel: DetailLevel): HierarchyNode[] {
        Logger.debug('HierarchyBuilder.buildTree called', { detailCount: details.length, detailLevel });

        // Determine max depth based on detail level
        const maxDepth = this.getMaxDepth(detailLevel);
        Logger.debug('Max depth:', maxDepth);

        // Create hierarchy map to aggregate data
        const hierarchyMap = new Map<string, HierarchyNode>();

        // Process each detail row
        details.forEach((row, idx) => {
            const pathParts = this.buildPathParts(row, maxDepth);

            if (idx < 5) {
                Logger.debug(`Row ${idx}:`, {
                    code0: row.code0,
                    name0: row.name0,
                    code1: row.code1,
                    name1: row.name1,
                    code2: row.code2,
                    name2: row.name2,
                    code3: row.code3,
                    name3: row.name3,
                    account_code: row.account_code,
                    account_description: row.account_description,
                    maxDepth,
                    pathParts,
                    pathLength: pathParts.length
                });
            }

            if (pathParts.length === 0) return; // Skip rows with no hierarchy

            // Create ALL parent nodes in the hierarchy
            this.addToHierarchy(hierarchyMap, pathParts, row);
        });

        // Convert to array and sort
        const result = Array.from(hierarchyMap.values());
        result.sort((a, b) => HierarchySorter.compareNodes(a, b));

        // Calculate variance percentages
        result.forEach(node => {
            node.variance_amount = node.amount_2025 - node.amount_2024;
            node.variance_percent = VarianceCalculator.calculatePercent(node.amount_2025 || 0, node.amount_2024 || 0);
        });

        Logger.debug('Built hierarchy tree:', {
            nodeCount: result.length,
            sample: result.slice(0, 20).map(r => ({
                level: r.level,
                label: r.label,
                code0: r.code0,
                code1: r.code1,
                code2: r.code2,
                code3: r.code3,
                name0: r.name0,
                name1: r.name1,
                name2: r.name2,
                name3: r.name3,
                hierarchy: r.hierarchy,
                amount_2024: r.amount_2024
            }))
        });

        return result;
    }

    /**
     * Get maximum depth for a detail level
     * @param detailLevel - Level identifier
     * @returns Maximum depth (1-6)
     */
    static getMaxDepth(detailLevel: DetailLevel): number {
        const depthMap: Record<DetailLevel, number> = {
            'level0': 1,  // Show code0 only (Activa/Passiva)
            'level1': 2,  // Show code0 + name0
            'level2': 3,  // Show code0 + name0 + name1
            'level3': 4,  // Show code0 + name0 + name1 + name2
            'level4': 5,  // Show code0 + name0 + name1 + name2 + name3 (where applicable)
            'level5': 6   // Show all including account_code + account_description
        };
        return depthMap[detailLevel] || 6;
    }

    /**
     * Build hierarchy path parts from a data row
     * @param row - Data row
     * @param maxDepth - Maximum depth to build
     * @returns Array of path parts
     */
    static buildPathParts(row: DetailRow, maxDepth: number): string[] {
        const pathParts: string[] = [];

        // Level 0: code0 (Activa or Passiva)
        if (maxDepth >= 1 && row.code0) {
            pathParts.push(row.code0);
        }

        // Level 1: name0 (vaste activa, vlottende activa, etc.)
        if (maxDepth >= 2 && row.name0) {
            pathParts.push(row.name0);
        }

        // Level 2: name1
        if (maxDepth >= 3 && row.name1) {
            pathParts.push(row.name1);
        }

        // Level 3: name2
        if (maxDepth >= 4 && row.name2) {
            pathParts.push(row.name2);
        }

        // Level 4: name3 (only populated for some categories)
        if (maxDepth >= 5 && row.name3 && row.name3.trim() !== '') {
            pathParts.push(row.name3);
        }

        // Level 5: account_code + account_description (individual accounts)
        if (maxDepth >= 6 && row.account_code && row.account_code.trim() !== '') {
            const accountLabel = row.account_description && row.account_description.trim() !== ''
                ? `${row.account_code} - ${row.account_description}`
                : row.account_code;
            pathParts.push(accountLabel);
        }

        return pathParts;
    }

    /**
     * Add path to hierarchy map and aggregate amounts
     * @param hierarchyMap - Map of hierarchy nodes
     * @param pathParts - Path parts
     * @param row - Source data row
     */
    static addToHierarchy(hierarchyMap: Map<string, HierarchyNode>, pathParts: string[], row: DetailRow): void {
        for (let i = 0; i < pathParts.length; i++) {
            const path = pathParts.slice(0, i + 1);
            const pathKey = path.join('|');

            if (!hierarchyMap.has(pathKey)) {
                const node: HierarchyNode = {
                    hierarchy: [...path],
                    level: i,
                    label: pathParts[i],
                    // ALWAYS preserve all code levels for sorting
                    code0: row.code0 || '',
                    name0: row.name0 || '',
                    code1: row.code1 || '',
                    name1: row.name1 || '',
                    code2: row.code2 || '',
                    name2: row.name2 || '',
                    code3: row.code3 || '',
                    name3: row.name3 || '',
                    account_code: row.account_code || '',
                    account_description: row.account_description || '',
                    amount_2024: 0,
                    amount_2025: 0,
                    variance_amount: 0,
                    variance_percent: 0,
                    _rowType: i === pathParts.length - 1 ? 'detail' : 'group'
                };
                hierarchyMap.set(pathKey, node);
            }

            // Aggregate amounts at ALL levels (so parents show totals)
            const node = hierarchyMap.get(pathKey)!;
            node.amount_2024 += row.amount_2024 || 0;
            node.amount_2025 += row.amount_2025 || 0;
        }
    }
}

export default HierarchyBuilder;
