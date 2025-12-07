/**
 * FilterEngine - Compatibility Wrapper
 * 
 * Provides OOP interface for backward compatibility while using
 * the new functional implementation under the hood.
 * 
 * This wrapper maintains the same API as the original class-based
 * implementation but delegates to pure functions.
 */

import {
    applyFilter,
    validateFilter,
    buildFilterExpression,
    VALID_FIELDS,
    OPERATORS,
    type FilterSpec,
    type ValidationResult,
    type FilterField,
    type RangeFilter,
    type FilterValue
} from '../core/filters/filter.ts';

// Arquero table type
type ColumnTable = any;

export type { FilterSpec, ValidationResult, FilterField, RangeFilter, FilterValue };

export default class FilterEngine {
    /**
     * Supported filter operators
     */
    static readonly OPERATORS = OPERATORS;

    /**
     * Valid filter fields that can be used in filter specifications
     */
    static readonly VALID_FIELDS = VALID_FIELDS;

    /**
     * Create a new FilterEngine
     */
    constructor() {
        // No state needed - all operations are pure functions
    }

    /**
     * Apply filter specification to an Arquero table
     * 
     * @param table - Arquero table to filter
     * @param filterSpec - Filter specification object
     * @returns Filtered Arquero table
     * 
     * @example
     * // Single field exact match
     * applyFilter(table, { code1: "700" })
     * 
     * // Array filter (OR logic)
     * applyFilter(table, { code1: ["700", "710", "720"] })
     * 
     * // Range filter
     * applyFilter(table, { code1: { gte: "700", lte: "799" } })
     * 
     * // Multiple fields (AND logic)
     * applyFilter(table, { code1: "700", statement_type: "Winst & verlies" })
     */
    applyFilter(table: ColumnTable, filterSpec: FilterSpec): ColumnTable {
        if (!table) {
            throw new Error('Table is required');
        }

        if (!filterSpec || Object.keys(filterSpec).length === 0) {
            // No filter specified, return original table
            return table;
        }

        // Validate filter specification
        const validation = this.validateFilter(filterSpec);
        if (!validation.isValid) {
            throw new Error(`Invalid filter specification: ${validation.errors.join(', ')}`);
        }

        // Apply filter using functional implementation
        try {
            return applyFilter(filterSpec)(table);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to apply filter: ${errorMessage}`);
        }
    }

    /**
     * Build Arquero filter expression from filter specification
     * 
     * @param filterSpec - Filter specification object
     * @returns Arquero filter expression
     * 
     * @example
     * buildFilterExpression({ code1: "700" })
     * // Returns: "d => d.code1 === '700'"
     */
    buildFilterExpression(filterSpec: FilterSpec): string {
        return buildFilterExpression(filterSpec);
    }

    /**
     * Validate filter specification
     * 
     * @param filterSpec - Filter specification to validate
     * @returns Validation result with isValid flag and errors array
     * 
     * @example
     * validateFilter({ code1: "700" })
     * // Returns: { isValid: true, errors: [] }
     */
    validateFilter(filterSpec: FilterSpec): ValidationResult {
        return validateFilter(filterSpec);
    }
}
