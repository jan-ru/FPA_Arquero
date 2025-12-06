import Logger from '../utils/Logger.ts';

/**
 * DataStore - Singleton state management for financial data
 * Manages fact tables, hierarchy tables, and combined movements data
 */

export default class DataStore {
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
    setFactTable(table, period, type = 'movements') {
        if (!this.factTables[period]) {
            this.factTables[period] = {};
        }
        this.factTables[period][type] = table;
        Logger.debug(`FactTable ${type} for ${period} stored (${table.numRows()} rows)`);
    }

    // Retrieve FactTable for a specific period and type
    getFactTable(period, type = 'movements') {
        return this.factTables[period]?.[type] || null;
    }

    // Shorthand: Get movements table for a period
    getMovementsTable(period) {
        return this.getFactTable(period, 'movements');
    }

    // Shorthand: Get balances table for a period
    getBalancesTable(period) {
        return this.getFactTable(period, 'balances');
    }

    // Get row counts for verification
    getRowCounts(period) {
        const movements = this.getMovementsTable(period);
        const balances = this.getBalancesTable(period);
        return {
            movements: movements ? movements.numRows() : 0,
            balances: balances ? balances.numRows() : 0
        };
    }

    // Store Hierarchy Table
    setHierarchyTable(table) {
        this.hierarchyTable = table;
        Logger.debug('Hierarchy Table stored');
    }

    // Retrieve Hierarchy Table
    getHierarchyTable() {
        return this.hierarchyTable;
    }

    // Get all loaded periods
    getAllPeriods() {
        return Object.keys(this.factTables);
    }

    // Store combined movements table
    setCombinedMovements(table) {
        this.combinedMovements = table;
        Logger.debug(`Combined movements table stored (${table.numRows()} rows)`);
    }

    // Retrieve combined movements table
    getCombinedMovements() {
        return this.combinedMovements;
    }

    // Store combined balances table
    setCombinedBalances(table) {
        this.combinedBalances = table;
        Logger.debug(`Combined balances table stored (${table.numRows()} rows)`);
    }

    // Retrieve combined balances table
    getCombinedBalances() {
        return this.combinedBalances;
    }

    // Check if all required data is loaded
    isDataComplete() {
        const has2024Movements = this.factTables['2024']?.movements;
        const has2024Balances = this.factTables['2024']?.balances;
        const has2025Movements = this.factTables['2025']?.movements;
        const has2025Balances = this.factTables['2025']?.balances;
        const hasBothPeriods = has2024Movements && has2024Balances && has2025Movements && has2025Balances;
        return !!(hasBothPeriods && this.combinedMovements && this.combinedBalances);
    }

    // Clear all data
    clear() {
        this.factTables = {};
        this.combinedMovements = null;
        this.combinedBalances = null;
        Logger.debug('DataStore cleared');
    }
}
