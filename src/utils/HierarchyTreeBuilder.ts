/**
 * HierarchyTreeBuilder - Builds tree structures for ag-Grid Tree Data feature
 *
 * Transforms flat movements data into hierarchical tree structure with
 * orgHierarchy paths for ag-Grid's tree data mode. Supports all detail
 * levels (0-5) and integrates calculated metrics from report definitions.
 * 
 * PERFORMANCE: Uses Arquero for vectorized columnar operations instead of
 * row-by-row iteration. This provides significant performance improvements
 * for large datasets (10,000+ accounts).
 */

// Access Arquero from global scope (loaded via CDN)
declare const aq: any;

// Safe logger wrapper that handles missing loglevel gracefully
const safeLogger = {
    debug: (...args: any[]) => {
        try {
            // Try to use Logger if available
            const Logger = (globalThis as any).Logger;
            if (Logger && Logger.debug) {
                Logger.debug(...args);
            }
        } catch {
            // Silently ignore in test environments
        }
    },
    info: (...args: any[]) => {
        try {
            const Logger = (globalThis as any).Logger;
            if (Logger && Logger.info) {
                Logger.info(...args);
            }
        } catch {
            // Silently ignore
        }
    },
    warn: (...args: any[]) => {
        try {
            const Logger = (globalThis as any).Logger;
            if (Logger && Logger.warn) {
                Logger.warn(...args);
            }
        } catch {
            // Silently ignore
        }
    },
    error: (...args: any[]) => {
        try {
            const Logger = (globalThis as any).Logger;
            if (Logger && Logger.error) {
                Logger.error(...args);
            }
        } catch {
            // Silently ignore
        }
    }
};

export interface TreeNode {
    orgHierarchy: string[];           // Path from root to this node
    label: string;                    // Display label
    level: number;                    // Hierarchy depth (0-5)
    type: 'account' | 'category' | 'calculated' | 'spacer';
    style: 'normal' | 'metric' | 'subtotal' | 'total' | 'spacer';
    
    // Amount fields
    amount_2024: number | null;
    amount_2025: number | null;
    variance_amount: number | null;
    variance_percent: number | null;
    
    // Formatted fields
    formatted_2024?: string;
    formatted_2025?: string;
    formatted_variance_amount?: string;
    formatted_variance_percent?: string;
    
    // Tree metadata
    _alwaysVisible?: boolean;         // Always show regardless of collapse state
    _isCalculated?: boolean;          // Calculated from expression
    _isGroup?: boolean;               // Has children
    _metadata?: any;                  // Additional metadata
    
    // For calculated rows
    order?: number;                   // Position from report definition
    expression?: string;              // Calculation expression
}

export interface HierarchyBuildOptions {
    statementType: 'balance' | 'income' | 'cashflow';
    calculatedRows?: any[];           // From report definition
    formattingRules?: any;            // From report definition
}

export interface MovementRow {
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

export class HierarchyTreeBuilder {
    /**
     * Build complete tree structure from movements data and report definition
     * 
     * @param movementsData - Can be either Arquero table or plain array (for backward compatibility)
     * @param options - Build options including statement type and calculated rows
     * @returns Array of TreeNode objects ready for ag-Grid tree data
     */
    buildTree(movementsData: any, options: HierarchyBuildOptions): TreeNode[] {
        // Convert to Arquero table if plain array
        const movementsTable = Array.isArray(movementsData) 
            ? aq.from(movementsData)
            : movementsData;
        
        const rowCount = movementsTable.numRows ? movementsTable.numRows() : movementsData.length;
        
        safeLogger.debug('HierarchyTreeBuilder.buildTree called', {
            movementCount: rowCount,
            statementType: options.statementType,
            isArqueroTable: !Array.isArray(movementsData)
        });

        // Step 1: Build account hierarchy from movements using Arquero
        const accountNodes = this.buildAccountHierarchyArquero(movementsTable, options.statementType);
        
        // Step 2: Aggregate amounts at each level (already done in Arquero)
        // No separate aggregation step needed - Arquero handles it
        
        // Step 3: Insert calculated metrics (if provided)
        const withMetrics = options.calculatedRows && options.calculatedRows.length > 0
            ? this.insertCalculatedMetrics(accountNodes, options.calculatedRows)
            : accountNodes;
        
        // Step 4: Mark always-visible rows
        const finalTree = this.markAlwaysVisibleRows(withMetrics);
        
        safeLogger.debug('Built tree structure', {
            nodeCount: finalTree.length,
            accountNodes: accountNodes.length
        });
        
        return finalTree;
    }

    /**
     * Build account hierarchy from movements data using Arquero (OPTIMIZED)
     * 
     * Uses Arquero's vectorized operations for grouping and aggregation.
     * This is significantly faster than row-by-row iteration for large datasets.
     * 
     * @param movementsTable - Arquero table with movements data
     * @param statementType - Type of statement (balance, income, cashflow)
     * @returns Array of TreeNode objects with aggregated amounts
     */
    buildAccountHierarchyArquero(movementsTable: any, statementType: string): TreeNode[] {
        safeLogger.debug('buildAccountHierarchyArquero called', {
            movementCount: movementsTable.numRows(),
            statementType
        });

        const allNodes: TreeNode[] = [];
        const nodeMap = new Map<string, TreeNode>();

        // Process each level (0-5) using Arquero groupby and rollup
        for (let level = 0; level <= 5; level++) {
            // Skip level 4 (reserved)
            if (level === 4) continue;

            // Build groupby columns for this level
            const groupCols = this.getGroupColumnsForLevel(level);
            
            // Group and aggregate using Arquero
            const grouped = movementsTable
                .groupby(...groupCols)
                .rollup({
                    amount_2024: aq.op.sum('amount_2024'),
                    amount_2025: aq.op.sum('amount_2025'),
                    // Keep first non-null values for labels
                    code0: aq.op.any('code0'),
                    name0: aq.op.any('name0'),
                    code1: aq.op.any('code1'),
                    name1: aq.op.any('name1'),
                    code2: aq.op.any('code2'),
                    name2: aq.op.any('name2'),
                    code3: aq.op.any('code3'),
                    name3: aq.op.any('name3'),
                    account_code: aq.op.any('account_code'),
                    account_description: aq.op.any('account_description')
                });

            // Convert to array and create TreeNode objects
            const rows = grouped.objects();
            
            rows.forEach((row: any) => {
                const path = this.buildPathForLevelFromRow(row, level);
                
                // Skip if path is empty
                if (path.length === 0) return;
                
                const pathKey = path.join('|');
                
                // Skip if already processed (shouldn't happen with Arquero groupby, but safety check)
                if (nodeMap.has(pathKey)) return;
                
                // Create node
                const node: TreeNode = {
                    orgHierarchy: path,
                    label: this.getLabelForLevelFromRow(row, level),
                    level: level,
                    type: level === 5 ? 'account' : 'category',
                    style: level === 0 ? 'total' : 'normal',
                    amount_2024: row.amount_2024 || 0,
                    amount_2025: row.amount_2025 || 0,
                    variance_amount: null,  // Will be calculated
                    variance_percent: null,  // Will be calculated
                    _isGroup: level < 5
                };
                
                // Calculate variances
                const amt2024 = node.amount_2024 || 0;
                const amt2025 = node.amount_2025 || 0;
                node.variance_amount = amt2025 - amt2024;
                node.variance_percent = amt2024 !== 0
                    ? ((amt2025 - amt2024) / amt2024) * 100
                    : null;
                
                allNodes.push(node);
                nodeMap.set(pathKey, node);
            });
        }

        safeLogger.debug('buildAccountHierarchyArquero complete', {
            totalNodes: allNodes.length,
            uniquePaths: nodeMap.size
        });

        return allNodes;
    }

    /**
     * Get Arquero groupby columns for a specific hierarchy level
     */
    private getGroupColumnsForLevel(level: number): string[] {
        const cols: string[] = [];
        
        // Level 0: group by code0 or name0
        if (level >= 0) {
            cols.push('code0', 'name0');
        }
        
        // Level 1: add code1/name1
        if (level >= 1) {
            cols.push('code1', 'name1');
        }
        
        // Level 2: add code2/name2
        if (level >= 2) {
            cols.push('code2', 'name2');
        }
        
        // Level 3: add code3/name3
        if (level >= 3) {
            cols.push('code3', 'name3');
        }
        
        // Level 5: add account_code
        if (level >= 5) {
            cols.push('account_code');
        }
        
        return cols;
    }

    /**
     * Build hierarchy path from aggregated row
     */
    private buildPathForLevelFromRow(row: any, level: number): string[] {
        const path: string[] = [];

        // Level 0: code0 or name0
        if (level >= 0) {
            const code0 = row.code0;
            const name0 = row.name0;
            if (code0) {
                path.push(String(code0));
            } else if (name0) {
                path.push(String(name0));
            } else {
                return []; // No valid level 0
            }
        }

        // Level 1: code1 or name1
        if (level >= 1) {
            const code1 = row.code1;
            const name1 = row.name1;
            if (code1 !== undefined && code1 !== null && String(code1).trim() !== '') {
                path.push(String(code1));
            } else if (name1) {
                path.push(String(name1));
            } else {
                return path; // Stop at level 0
            }
        }

        // Level 2: code2 or name2
        if (level >= 2 && level < 5) {
            const code2 = row.code2;
            const name2 = row.name2;
            if (code2 !== undefined && code2 !== null && String(code2).trim() !== '') {
                path.push(String(code2));
            } else if (name2 && String(name2).trim() !== '') {
                path.push(String(name2));
            } else if (level === 2) {
                return path;
            }
        }

        // Level 3: code3 or name3
        if (level >= 3 && level < 5) {
            const code3 = row.code3;
            const name3 = row.name3;
            if (code3 !== undefined && code3 !== null && String(code3).trim() !== '') {
                path.push(String(code3));
            } else if (name3 && String(name3).trim() !== '') {
                path.push(String(name3));
            } else if (level === 3) {
                return path;
            }
        }

        // Level 5: account_code
        if (level >= 5) {
            const accountCode = row.account_code;
            if (accountCode && String(accountCode).trim() !== '') {
                path.push(String(accountCode));
            } else {
                return path;
            }
        }

        return path;
    }

    /**
     * Get display label from aggregated row
     */
    private getLabelForLevelFromRow(row: any, level: number): string {
        if (level === 5) {
            const code = row.account_code;
            const desc = row.account_description;
            if (desc && String(desc).trim() !== '') {
                return `${desc} (${code})`;
            }
            return String(code || 'Unknown');
        }

        // For levels 0-3, prefer name over code
        const name = row[`name${level}`];
        const code = row[`code${level}`];

        if (name && String(name).trim() !== '') {
            if (code !== undefined && code !== null && String(code).trim() !== '') {
                return `${name} (${code})`;
            }
            return String(name);
        }

        if (code !== undefined && code !== null) {
            return String(code);
        }

        return `Level ${level}`;
    }

    /**
     * Build account hierarchy from movements data (LEGACY - kept for backward compatibility)
     * 
     * @deprecated Use buildAccountHierarchyArquero for better performance
     * Extracts hierarchy levels (0-5) and creates TreeNode objects
     */
    buildAccountHierarchy(movementsData: MovementRow[], statementType: string): TreeNode[] {
        safeLogger.debug('buildAccountHierarchy called', {
            movementCount: movementsData.length,
            statementType
        });

        const nodes: TreeNode[] = [];
        const nodeMap = new Map<string, TreeNode>();

        // Process each movement record
        movementsData.forEach((movement, idx) => {
            // Build hierarchy path for each level (0-5)
            for (let level = 0; level <= 5; level++) {
                const path = this.buildPathForLevel(movement, level);
                
                // Skip if path is empty
                if (path.length === 0) continue;
                
                const pathKey = path.join('|');
                
                // Skip if already processed
                if (nodeMap.has(pathKey)) {
                    // Still need to aggregate amounts for leaf nodes
                    if (level === 5) {
                        const existingNode = nodeMap.get(pathKey)!;
                        existingNode.amount_2024 = (existingNode.amount_2024 || 0) + (movement.amount_2024 || 0);
                        existingNode.amount_2025 = (existingNode.amount_2025 || 0) + (movement.amount_2025 || 0);
                    }
                    continue;
                }
                
                // Create node
                const node: TreeNode = {
                    orgHierarchy: path,
                    label: this.getLabelForLevel(movement, level),
                    level: level,
                    type: level === 5 ? 'account' : 'category',
                    style: level === 0 ? 'total' : 'normal',
                    amount_2024: level === 5 ? (movement.amount_2024 || 0) : 0,
                    amount_2025: level === 5 ? (movement.amount_2025 || 0) : 0,
                    variance_amount: null,
                    variance_percent: null,
                    _isGroup: level < 5
                };
                
                nodes.push(node);
                nodeMap.set(pathKey, node);
                
                if (idx < 3 && level <= 2) {
                    safeLogger.debug(`Created node at level ${level}:`, {
                        label: node.label,
                        orgHierarchy: node.orgHierarchy,
                        type: node.type
                    });
                }
            }
        });

        safeLogger.debug('buildAccountHierarchy complete', {
            totalNodes: nodes.length,
            uniquePaths: nodeMap.size
        });

        return nodes;
    }

    /**
     * Build hierarchy path for a specific level
     */
    private buildPathForLevel(movement: MovementRow, level: number): string[] {
        const path: string[] = [];

        // Level 0: code0 or name0
        if (level >= 0) {
            const code0 = movement.code0;
            const name0 = movement.name0;
            if (code0) {
                path.push(String(code0));
            } else if (name0) {
                path.push(String(name0));
            } else {
                return []; // No valid level 0, skip this row
            }
        }

        // Level 1: code1 or name1
        if (level >= 1) {
            const code1 = movement.code1;
            const name1 = movement.name1;
            if (code1 !== undefined && code1 !== null && String(code1).trim() !== '') {
                path.push(String(code1));
            } else if (name1) {
                path.push(String(name1));
            } else {
                return path; // Stop at level 0
            }
        }

        // Level 2: code2 or name2 (optional for level 5)
        if (level >= 2 && level < 5) {
            const code2 = movement.code2;
            const name2 = movement.name2;
            if (code2 !== undefined && code2 !== null && String(code2).trim() !== '') {
                path.push(String(code2));
            } else if (name2 && String(name2).trim() !== '') {
                path.push(String(name2));
            } else if (level === 2) {
                // If we're specifically building level 2 and don't have data, stop
                return path;
            }
            // Otherwise continue to level 3 or 5
        }

        // Level 3: code3 or name3 (optional for level 5)
        if (level >= 3 && level < 5) {
            const code3 = movement.code3;
            const name3 = movement.name3;
            if (code3 !== undefined && code3 !== null && String(code3).trim() !== '') {
                path.push(String(code3));
            } else if (name3 && String(name3).trim() !== '') {
                path.push(String(name3));
            } else if (level === 3) {
                // If we're specifically building level 3 and don't have data, stop
                return path;
            }
            // Otherwise continue to level 5 if requested
        }

        // Level 4 is reserved (skip)

        // Level 5: account_code
        if (level >= 5) {
            const accountCode = movement.account_code;
            if (accountCode && String(accountCode).trim() !== '') {
                path.push(String(accountCode));
            } else {
                return path; // Stop - no account code
            }
        }

        return path;
    }

    /**
     * Get display label for a specific level
     */
    private getLabelForLevel(movement: MovementRow, level: number): string {
        if (level === 5) {
            // Account level: "Description (Code)" or just "Code"
            const code = movement.account_code;
            const desc = movement.account_description;
            if (desc && String(desc).trim() !== '') {
                return `${desc} (${code})`;
            }
            return String(code || 'Unknown');
        }

        // For levels 0-3, prefer name over code
        const codeField = `code${level}` as keyof MovementRow;
        const nameField = `name${level}` as keyof MovementRow;
        
        const name = movement[nameField];
        const code = movement[codeField];

        if (name && String(name).trim() !== '') {
            if (code !== undefined && code !== null && String(code).trim() !== '') {
                return `${name} (${code})`;
            }
            return String(name);
        }

        if (code !== undefined && code !== null) {
            return String(code);
        }

        return `Level ${level}`;
    }

    /**
     * Aggregate amounts at each hierarchy level (LEGACY - no longer needed)
     * 
     * @deprecated Arquero handles aggregation during groupby/rollup operations
     * This method is kept for backward compatibility but does nothing when using Arquero
     */
    aggregateAmounts(nodes: TreeNode[]): TreeNode[] {
        safeLogger.debug('aggregateAmounts called (legacy method - no-op with Arquero)', { nodeCount: nodes.length });
        // Arquero already aggregated during groupby/rollup
        // Just return nodes as-is
        return nodes;
    }

    /**
     * Insert calculated metrics at correct positions
     */
    insertCalculatedMetrics(hierarchy: TreeNode[], calculatedRows: any[]): TreeNode[] {
        safeLogger.debug('insertCalculatedMetrics called', {
            hierarchyCount: hierarchy.length,
            calculatedRowCount: calculatedRows.length
        });

        const result = [...hierarchy];
        
        calculatedRows.forEach(calc => {
            const metricNode: TreeNode = {
                orgHierarchy: ['_METRICS_', calc.label || calc.name || 'Metric'],
                label: calc.label || calc.name || 'Metric',
                level: 0,
                type: 'calculated',
                style: calc.style || 'metric',
                amount_2024: null,  // Will be calculated by expression evaluator
                amount_2025: null,
                variance_amount: null,
                variance_percent: null,
                _alwaysVisible: true,
                _isCalculated: true,
                order: calc.order || 0,
                expression: calc.expression
            };
            
            result.push(metricNode);
        });
        
        // Sort by order number
        result.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
            const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });
        
        safeLogger.debug('insertCalculatedMetrics complete', { resultCount: result.length });
        return result;
    }

    /**
     * Mark rows that should always be visible
     */
    markAlwaysVisibleRows(nodes: TreeNode[]): TreeNode[] {
        safeLogger.debug('markAlwaysVisibleRows called', { nodeCount: nodes.length });

        nodes.forEach(node => {
            // Mark level 0 nodes as always visible
            if (node.level === 0) {
                node._alwaysVisible = true;
            }
            
            // Mark calculated metrics as always visible
            if (node._isCalculated) {
                node._alwaysVisible = true;
            }
            
            // Mark total/subtotal rows as always visible
            if (node.style === 'total' || node.style === 'subtotal') {
                node._alwaysVisible = true;
            }
        });

        const alwaysVisibleCount = nodes.filter(n => n._alwaysVisible).length;
        safeLogger.debug('markAlwaysVisibleRows complete', { alwaysVisibleCount });

        return nodes;
    }
}

export default HierarchyTreeBuilder;
