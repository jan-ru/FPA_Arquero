/**
 * Filter Functions - Functional Implementation
 * 
 * Pure functions for filtering Arquero tables based on filter specifications.
 * Supports exact match filters, array filters (OR logic), and range filters.
 * All filters within a specification are combined with AND logic.
 * 
 * @example
 * import { applyFilter, validateFilter } from './filter.ts';
 * 
 * // Exact match filter
 * const filtered1 = applyFilter({ code1: "700" })(table);
 * 
 * // Array filter (OR logic)
 * const filtered2 = applyFilter({ code1: ["700", "710"] })(table);
 * 
 * // Range filter
 * const filtered3 = applyFilter({ code1: { gte: "700", lte: "799" } })(table);
 * 
 * // Multiple fields (AND logic)
 * const filtered4 = applyFilter({ 
 *   code1: "700", 
 *   statement_type: "Winst & verlies" 
 * })(table);
 */

import { type Result, ok, err } from '../utils/index.ts';

// ============================================================================
// Types
// ============================================================================

// Arquero table type (using any since arquero is loaded globally via CDN)
type ColumnTable = any;

/**
 * Range filter operators
 */
export interface RangeFilter {
    readonly gte?: string | number;
    readonly lte?: string | number;
    readonly gt?: string | number;
    readonly lt?: string | number;
}

/**
 * Filter value types
 */
export type FilterValue = string | number | readonly (string | number)[] | RangeFilter;

/**
 * Filter specification object
 */
export interface FilterSpec {
    readonly [field: string]: FilterValue;
}

/**
 * Validation result
 */
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
}

/**
 * Valid filter field names
 */
export type FilterField = 
    | 'code1' 
    | 'code2' 
    | 'code3'
    | 'name1' 
    | 'name2' 
    | 'name3'
    | 'statement_type'
    | 'account_code';

/**
 * Supported filter operators
 */
export const OPERATORS = {
    equals: '===',
    in: 'includes',
    gte: '>=',
    lte: '<=',
    gt: '>',
    lt: '<'
} as const;

/**
 * Valid filter fields that can be used in filter specifications
 */
export const VALID_FIELDS: readonly FilterField[] = [
    'code1', 'code2', 'code3',
    'name1', 'name2', 'name3',
    'statement_type',
    'account_code'
] as const;

// ============================================================================
// Filter Expression Building
// ============================================================================

/**
 * Escape single quotes in a string for use in filter expressions
 * 
 * @param value - Value to escape
 * @returns Escaped value
 * 
 * @example
 * escapeValue("O'Reilly") // Returns: "O\\'Reilly"
 */
const escapeValue = (value: string | number): string =>
    String(value).replace(/'/g, "\\'");

/**
 * Build condition for exact match filter
 * 
 * @param field - Field name
 * @param value - Value to match
 * @returns Filter condition string
 * 
 * @example
 * buildExactMatchCondition('code1', '700')
 * // Returns: "d.code1 === '700'"
 */
const buildExactMatchCondition = (field: string, value: string | number): string =>
    `d.${field} === '${escapeValue(value)}'`;

/**
 * Build condition for array filter (OR logic)
 * 
 * @param field - Field name
 * @param values - Array of values to match
 * @returns Filter condition string
 * 
 * @example
 * buildArrayCondition('code1', ['700', '710'])
 * // Returns: "['700','710'].includes(d.code1)"
 */
const buildArrayCondition = (field: string, values: readonly (string | number)[]): string => {
    const escapedValues = values.map(v => `'${escapeValue(v)}'`);
    return `[${escapedValues.join(',')}].includes(d.${field})`;
};

/**
 * Build condition for range filter
 * 
 * @param field - Field name
 * @param rangeFilter - Range filter specification
 * @returns Filter condition string
 * 
 * @example
 * buildRangeCondition('code1', { gte: '700', lte: '799' })
 * // Returns: "d.code1 >= '700' && d.code1 <= '799'"
 */
const buildRangeCondition = (field: string, rangeFilter: RangeFilter): string => {
    const conditions: string[] = [];
    
    if (rangeFilter.gte !== undefined) {
        conditions.push(`d.${field} >= '${escapeValue(rangeFilter.gte)}'`);
    }
    if (rangeFilter.lte !== undefined) {
        conditions.push(`d.${field} <= '${escapeValue(rangeFilter.lte)}'`);
    }
    if (rangeFilter.gt !== undefined) {
        conditions.push(`d.${field} > '${escapeValue(rangeFilter.gt)}'`);
    }
    if (rangeFilter.lt !== undefined) {
        conditions.push(`d.${field} < '${escapeValue(rangeFilter.lt)}'`);
    }
    
    return conditions.join(' && ');
};

/**
 * Build condition for a single filter field
 * 
 * @param field - Field name
 * @param value - Filter value
 * @returns Filter condition string
 * 
 * @example
 * buildFieldCondition('code1', '700')
 * // Returns: "d.code1 === '700'"
 * 
 * buildFieldCondition('code1', ['700', '710'])
 * // Returns: "['700','710'].includes(d.code1)"
 */
const buildFieldCondition = (field: string, value: FilterValue): string => {
    if (Array.isArray(value)) {
        return buildArrayCondition(field, value);
    }
    
    if (typeof value === 'object' && value !== null) {
        return buildRangeCondition(field, value as RangeFilter);
    }
    
    return buildExactMatchCondition(field, value);
};

/**
 * Build Arquero filter expression from filter specification
 * 
 * Combines multiple filter criteria with AND logic.
 * Array values are treated as OR logic within that field.
 * Range objects support gte, lte, gt, lt operators.
 * 
 * @param filterSpec - Filter specification object
 * @returns Arquero filter expression
 * 
 * @example
 * buildFilterExpression({ code1: "700" })
 * // Returns: "d => d.code1 === '700'"
 * 
 * buildFilterExpression({ code1: ["700", "710"] })
 * // Returns: "d => ['700','710'].includes(d.code1)"
 * 
 * buildFilterExpression({ code1: { gte: "700", lte: "799" } })
 * // Returns: "d => d.code1 >= '700' && d.code1 <= '799'"
 * 
 * buildFilterExpression({ code1: "700", statement_type: "Winst & verlies" })
 * // Returns: "d => d.code1 === '700' && d.statement_type === 'Winst & verlies'"
 */
export const buildFilterExpression = (filterSpec: FilterSpec): string => {
    const conditions = Object.entries(filterSpec)
        .map(([field, value]) => buildFieldCondition(field, value));
    
    return `d => ${conditions.join(' && ')}`;
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a field name is valid
 * 
 * @param field - Field name to check
 * @returns True if field is valid
 * 
 * @example
 * isValidField('code1') // Returns: true
 * isValidField('invalid') // Returns: false
 */
export const isValidField = (field: string): field is FilterField =>
    VALID_FIELDS.includes(field as FilterField);

/**
 * Valid range operators
 */
const VALID_RANGE_OPERATORS: readonly (keyof RangeFilter)[] = ['gte', 'lte', 'gt', 'lt'];

/**
 * Check if a range operator is valid
 * 
 * @param operator - Operator to check
 * @returns True if operator is valid
 */
const isValidRangeOperator = (operator: string): operator is keyof RangeFilter =>
    VALID_RANGE_OPERATORS.includes(operator as keyof RangeFilter);

/**
 * Validate a filter value
 * 
 * @param field - Field name
 * @param value - Filter value to validate
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * validateFilterValue('code1', '700') // Returns: []
 * validateFilterValue('code1', null) // Returns: ['Filter value for code1 cannot be null or undefined']
 */
const validateFilterValue = (field: string, value: FilterValue): readonly string[] => {
    const errors: string[] = [];
    
    // Check for null/undefined
    if (value === null || value === undefined) {
        errors.push(`Filter value for ${field} cannot be null or undefined`);
        return errors;
    }
    
    // Validate array values
    if (Array.isArray(value)) {
        if (value.length === 0) {
            errors.push(`Filter array for ${field} cannot be empty`);
        }
        
        const hasInvalidElements = value.some(v => v === null || v === undefined);
        if (hasInvalidElements) {
            errors.push(`Filter array for ${field} contains null or undefined values`);
        }
        
        return errors;
    }
    
    // Validate range filter
    if (typeof value === 'object') {
        const rangeKeys = Object.keys(value);
        
        if (rangeKeys.length === 0) {
            errors.push(`Range filter for ${field} cannot be empty`);
            return errors;
        }
        
        // Check for invalid operators
        const invalidOperators = rangeKeys.filter(key => !isValidRangeOperator(key));
        if (invalidOperators.length > 0) {
            errors.push(
                `Invalid range operators for ${field}: ${invalidOperators.join(', ')}. ` +
                `Valid operators are: ${VALID_RANGE_OPERATORS.join(', ')}`
            );
        }
        
        // Check for null/undefined range values
        for (const [operator, rangeValue] of Object.entries(value)) {
            if (rangeValue === null || rangeValue === undefined) {
                errors.push(`Range value for ${field}.${operator} cannot be null or undefined`);
            }
        }
    }
    
    return errors;
};

/**
 * Validate filter specification
 * 
 * Checks that:
 * - All filter fields are valid
 * - Filter values are of correct types
 * - Range operators are valid
 * 
 * @param filterSpec - Filter specification to validate
 * @returns Validation result with isValid flag and errors array
 * 
 * @example
 * validateFilter({ code1: "700" })
 * // Returns: { isValid: true, errors: [] }
 * 
 * validateFilter({ code1: { gte: "700", lte: "799" } })
 * // Returns: { isValid: true, errors: [] }
 * 
 * validateFilter({ invalid_field: "value" })
 * // Returns: { isValid: false, errors: ["Invalid filter field: invalid_field"] }
 */
export const validateFilter = (filterSpec: FilterSpec): ValidationResult => {
    // Check if filterSpec is an object
    if (!filterSpec || typeof filterSpec !== 'object') {
        return {
            isValid: false,
            errors: ['Filter specification must be an object']
        };
    }
    
    // Empty filter is valid (returns all rows)
    if (Object.keys(filterSpec).length === 0) {
        return {
            isValid: true,
            errors: []
        };
    }
    
    // Validate each field
    const errors: string[] = [];
    
    for (const [field, value] of Object.entries(filterSpec)) {
        // Check if field is valid
        if (!isValidField(field)) {
            errors.push(
                `Invalid filter field: ${field}. Valid fields are: ${VALID_FIELDS.join(', ')}`
            );
            continue;
        }
        
        // Validate the value
        const valueErrors = validateFilterValue(field, value);
        errors.push(...valueErrors);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// ============================================================================
// Filter Application
// ============================================================================

/**
 * Apply filter specification to an Arquero table
 * 
 * Pure function that returns a new filtered table without modifying the original.
 * Returns the original table if filter spec is empty.
 * 
 * @param filterSpec - Filter specification object
 * @returns Function that takes a table and returns filtered table
 * 
 * @example
 * // Curried usage
 * const filterByCode = applyFilter({ code1: "700" });
 * const filtered = filterByCode(table);
 * 
 * // Direct usage
 * const filtered = applyFilter({ code1: "700" })(table);
 * 
 * // With Result type
 * const result = applyFilterSafe({ code1: "700" })(table);
 * if (result.success) {
 *   console.log('Filtered:', result.value);
 * }
 */
export const applyFilter = (filterSpec: FilterSpec) => (table: ColumnTable): ColumnTable => {
    // Return original table if no filter specified
    if (!filterSpec || Object.keys(filterSpec).length === 0) {
        return table;
    }
    
    // Build and apply filter expression
    const filterExpression = buildFilterExpression(filterSpec);
    return table.filter(filterExpression);
};

/**
 * Apply filter specification to an Arquero table with validation
 * 
 * Safe version that validates the filter spec and returns a Result type.
 * 
 * @param filterSpec - Filter specification object
 * @returns Function that takes a table and returns Result with filtered table or error
 * 
 * @example
 * const result = applyFilterSafe({ code1: "700" })(table);
 * if (result.success) {
 *   console.log('Filtered rows:', result.value.numRows());
 * } else {
 *   console.error('Filter error:', result.error.message);
 * }
 */
export const applyFilterSafe = (filterSpec: FilterSpec) => (table: ColumnTable): Result<ColumnTable, Error> => {
    // Validate table
    if (!table) {
        return err(new Error('Table is required'));
    }
    
    // Validate filter specification
    const validation = validateFilter(filterSpec);
    if (!validation.isValid) {
        return err(new Error(`Invalid filter specification: ${validation.errors.join(', ')}`));
    }
    
    // Apply filter
    try {
        const filtered = applyFilter(filterSpec)(table);
        return ok(filtered);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return err(new Error(`Failed to apply filter: ${errorMessage}`));
    }
};

// ============================================================================
// Curried Versions
// ============================================================================

/**
 * Create a filter function for a specific field
 * 
 * @param field - Field name
 * @returns Function that takes a value and returns a filter function
 * 
 * @example
 * const filterByCode1 = filterByField('code1');
 * const filtered = filterByCode1('700')(table);
 */
export const filterByField = (field: FilterField) => (value: FilterValue) => (table: ColumnTable): ColumnTable =>
    applyFilter({ [field]: value })(table);

/**
 * Create a filter function for exact match
 * 
 * @param field - Field name
 * @param value - Value to match
 * @returns Filter function
 * 
 * @example
 * const filterCode700 = filterExactMatch('code1', '700');
 * const filtered = filterCode700(table);
 */
export const filterExactMatch = (field: FilterField, value: string | number) => (table: ColumnTable): ColumnTable =>
    applyFilter({ [field]: value })(table);

/**
 * Create a filter function for array match (OR logic)
 * 
 * @param field - Field name
 * @param values - Array of values to match
 * @returns Filter function
 * 
 * @example
 * const filterCodes = filterArrayMatch('code1', ['700', '710', '720']);
 * const filtered = filterCodes(table);
 */
export const filterArrayMatch = (field: FilterField, values: readonly (string | number)[]) => (table: ColumnTable): ColumnTable =>
    applyFilter({ [field]: values })(table);

/**
 * Create a filter function for range match
 * 
 * @param field - Field name
 * @param range - Range filter specification
 * @returns Filter function
 * 
 * @example
 * const filterRange = filterRangeMatch('code1', { gte: '700', lte: '799' });
 * const filtered = filterRange(table);
 */
export const filterRangeMatch = (field: FilterField, range: RangeFilter) => (table: ColumnTable): ColumnTable =>
    applyFilter({ [field]: range })(table);

/**
 * Combine multiple filters with AND logic
 * 
 * @param filters - Array of filter specifications
 * @returns Combined filter function
 * 
 * @example
 * const combined = combineFilters([
 *   { code1: '700' },
 *   { statement_type: 'Winst & verlies' }
 * ]);
 * const filtered = combined(table);
 */
export const combineFilters = (filters: readonly FilterSpec[]) => (table: ColumnTable): ColumnTable =>
    filters.reduce(
        (acc, filterSpec) => applyFilter(filterSpec)(acc),
        table
    );
