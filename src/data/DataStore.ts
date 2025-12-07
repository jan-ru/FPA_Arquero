import Logger from '../utils/Logger.ts';

/**
 * DataStore - Singleton state management for financial data
 * Manages fact tables, hierarchy tables, and combined movements data
 */

// Type for Arquero table (using any since it's loaded globally)
type ArqueroTable = any;

interface FactTables {
    movements?: ArqueroTable;
    balances?: ArqueroTable;
}

interface RowCounts {
    movements: number;
    balances: number;
}

export default class DataStore {
    private static instance: DataStore;
    private factTables: Record<string, FactTables>;
    private combinedMovements: ArqueroTable | null;
    private combinedBalances: ArqueroTable | null;
    private hierarchyTable?: ArqueroTable;

    constructor() {
        if (DataStore.instance) {
            return DataStore.instance;
        }

        this.factTables = {}; // Store FactTables by period and type: {2024: {movements: table, balances: table}, 2025: {...}}
        this.combinedMovements = null; // Combined movements table for both years
        this.combinedBalances = null; // Combined balances table for both years

        DataStore.instance = this;
    }

    // Store FactTable for a specific period and type
    setFactTable(table: ArqueroTable, period: string, type: 'movements' | 'balances' = 'movements'): void {
        if (!this.factTables[period]) {
            this.factTables[period] = {};
        }
        this.factTables[period][type] = table;
        Logger.debug(`FactTable ${type} for ${period} stored (${table.numRows()} rows)`);
    }

    // Retrieve FactTable for a specific period and type
    getFactTable(period: string, type: 'movements' | 'balances' = 'movements'): ArqueroTable | null {
        return this.factTables[period]?.[type] || null;
    }

    // Shorthand: Get movements table for a period
    getMovementsTable(period: string): ArqueroTable | null {
        return this.getFactTable(period, 'movements');
    }

    // Shorthand: Get balances table for a period
    getBalancesTable(period: string): ArqueroTable | null {
        return this.getFactTable(period, 'balances');
    }

    // Get row counts for verification
    getRowCounts(period: string): RowCounts {
        const movements = this.getMovementsTable(period);
        const balances = this.getBalancesTable(period);
        return {
            movements: movements ? movements.numRows() : 0,
            balances: balances ? balances.numRows() : 0
        };
    }

    // Store Hierarchy Table
    setHierarchyTable(table: ArqueroTable): void {
        this.hierarchyTable = table;
        Logger.debug('Hierarchy Table stored');
    }

    // Retrieve Hierarchy Table
    getHierarchyTable(): ArqueroTable | undefined {
        return this.hierarchyTable;
    }

    // Get all loaded periods
    getAllPeriods(): string[] {
        return Object.keys(this.factTables);
    }

    // Store combined movements table
    setCombinedMovements(table: ArqueroTable): void {
        this.combinedMovements = table;
        Logger.debug(`Combined movements table stored (${table.numRows()} rows)`);
    }

    // Retrieve combined movements table
    getCombinedMovements(): ArqueroTable | null {
        return this.combinedMovements;
    }

    // Store combined balances table
    setCombinedBalances(table: ArqueroTable): void {
        this.combinedBalances = table;
        Logger.debug(`Combined balances table stored (${table.numRows()} rows)`);
    }

    // Retrieve combined balances table
    getCombinedBalances(): ArqueroTable | null {
        return this.combinedBalances;
    }

    // Check if all required data is loaded
    isDataComplete(): boolean {
        const has2024Movements = this.factTables['2024']?.movements;
        const has2024Balances = this.factTables['2024']?.balances;
        const has2025Movements = this.factTables['2025']?.movements;
        const has2025Balances = this.factTables['2025']?.balances;
        const hasBothPeriods = has2024Movements && has2024Balances && has2025Movements && has2025Balances;
        return !!(hasBothPeriods && this.combinedMovements && this.combinedBalances);
    }

    // Clear all data
    clear(): void {
        this.factTables = {};
        this.combinedMovements = null;
        this.combinedBalances = null;
        Logger.debug('DataStore cleared');
    }
}
