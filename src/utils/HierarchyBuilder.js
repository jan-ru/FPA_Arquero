/**
 * HierarchyBuilder - Builds hierarchical tree structure from flat data
 *
 * Converts flat financial data into a hierarchical tree structure with
 * aggregated amounts at each level. Supports flexible depth levels.
 */

import HierarchySorter from './HierarchySorter.js';
import Logger from './Logger.js';

export class HierarchyBuilder {
    /**
     * Build hierarchical tree from flat detail data
     * @param {Array<Object>} details - Flat array of detail objects
     * @param {string} detailLevel - Level identifier (level0-level5)
     * @returns {Array<Object>} Sorted array of hierarchy nodes with aggregated amounts
     */
    static buildTree(details, detailLevel) {
        Logger.debug('HierarchyBuilder.buildTree called', { detailCount: details.length, detailLevel });

        // Determine max depth based on detail level
        const maxDepth = this.getMaxDepth(detailLevel);
        Logger.debug('Max depth:', maxDepth);

        // Create hierarchy map to aggregate data
        const hierarchyMap = new Map();

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
            node.variance_percent = node.amount_2024 !== 0 ?
                ((node.amount_2025 - node.amount_2024) / Math.abs(node.amount_2024)) * 100 : 0;
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
     * @param {string} detailLevel - Level identifier
     * @returns {number} Maximum depth (1-6)
     */
    static getMaxDepth(detailLevel) {
        const depthMap = {
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
     * @param {Object} row - Data row
     * @param {number} maxDepth - Maximum depth to build
     * @returns {Array<string>} Array of path parts
     */
    static buildPathParts(row, maxDepth) {
        const pathParts = [];

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
     * @param {Map} hierarchyMap - Map of hierarchy nodes
     * @param {Array<string>} pathParts - Path parts
     * @param {Object} row - Source data row
     */
    static addToHierarchy(hierarchyMap, pathParts, row) {
        for (let i = 0; i < pathParts.length; i++) {
            const path = pathParts.slice(0, i + 1);
            const pathKey = path.join('|');

            if (!hierarchyMap.has(pathKey)) {
                const node = {
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
            const node = hierarchyMap.get(pathKey);
            node.amount_2024 += row.amount_2024 || 0;
            node.amount_2025 += row.amount_2025 || 0;
        }
    }
}

export default HierarchyBuilder;
