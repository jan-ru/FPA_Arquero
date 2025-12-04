/**
 * FilterEngine - Applies filter specifications to Arquero tables
 * 
 * Supports exact match filters, array filters (OR logic), and range filters on movements data.
 * All filters within a specification are combined with AND logic.
 * 
 * @example
 * const filterEngine = new FilterEngine();
 * 
 * // Exact match filter
 * const filtered1 = filterEngine.applyFilter(table, { code1: "700" });
 * 
 * // Array filter (OR logic)
 * const filtered2 = filterEngine.applyFilter(table, { code1: ["700", "710"] });
 * 
 * // Range filter
 * const filtered3 = filterEngine.applyFilter(table, { code1: { gte: "700", lte: "799" } });
 * 
 * // Multiple fields (AND logic)
 * const filtered4 = filterEngine.applyFilter(table, { 
 *   code1: "700", 
 *   statement_type: "Winst & verlies" 
 * });
 */
export default class FilterEngine {
    /**
     * Supported filter operators
     */
    static OPERATORS = {
        equals: '===',
        in: 'includes',
        gte: '>=',
        lte: '<=',
        gt: '>',
        lt: '<'
    };

    /**
     * Valid filter fields that can be used in filter specifications
     */
    static VALID_FIELDS = [
        'code1', 'code2', 'code3',
        'name1', 'name2', 'name3',
        'statement_type',
        'account_code'
    ];

    /**
     * Apply filter specification to an Arquero table
     * 
     * @param {Object} table - Arquero table to filter
     * @param {Object} filterSpec - Filter specification object
     * @returns {Object} Filtered Arquero table
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
    applyFilter(table, filterSpec) {
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

        // Build filter expression
        const filterExpression = this.buildFilterExpression(filterSpec);

        // Apply filter using Arquero's filter method
        try {
            return table.filter(filterExpression);
        } catch (error) {
            throw new Error(`Failed to apply filter: ${error.message}`);
        }
    }

    /**
     * Build Arquero filter expression from filter specification
     * 
     * Combines multiple filter criteria with AND logic.
     * Array values are treated as OR logic within that field.
     * Range objects support gte, lte, gt, lt operators.
     * 
     * @param {Object} filterSpec - Filter specification object
     * @returns {string} Arquero filter expression
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
    buildFilterExpression(filterSpec) {
        const conditions = [];

        for (const [field, value] of Object.entries(filterSpec)) {
            if (Array.isArray(value)) {
                // Array filter: use includes for OR logic
                // Escape single quotes in values
                const escapedValues = value.map(v => `'${String(v).replace(/'/g, "\\'")}'`);
                conditions.push(`[${escapedValues.join(',')}].includes(d.${field})`);
            } else if (typeof value === 'object' && value !== null) {
                // Range filter: support gte, lte, gt, lt
                const rangeConditions = [];
                
                if (value.gte !== undefined) {
                    const escapedValue = String(value.gte).replace(/'/g, "\\'");
                    rangeConditions.push(`d.${field} >= '${escapedValue}'`);
                }
                if (value.lte !== undefined) {
                    const escapedValue = String(value.lte).replace(/'/g, "\\'");
                    rangeConditions.push(`d.${field} <= '${escapedValue}'`);
                }
                if (value.gt !== undefined) {
                    const escapedValue = String(value.gt).replace(/'/g, "\\'");
                    rangeConditions.push(`d.${field} > '${escapedValue}'`);
                }
                if (value.lt !== undefined) {
                    const escapedValue = String(value.lt).replace(/'/g, "\\'");
                    rangeConditions.push(`d.${field} < '${escapedValue}'`);
                }
                
                if (rangeConditions.length > 0) {
                    conditions.push(rangeConditions.join(' && '));
                }
            } else {
                // Exact match filter
                // Escape single quotes in value
                const escapedValue = String(value).replace(/'/g, "\\'");
                conditions.push(`d.${field} === '${escapedValue}'`);
            }
        }

        // Combine all conditions with AND logic
        const expression = `d => ${conditions.join(' && ')}`;
        return expression;
    }

    /**
     * Validate filter specification
     * 
     * Checks that:
     * - All filter fields are valid
     * - Filter values are of correct types
     * - Range operators are valid
     * 
     * @param {Object} filterSpec - Filter specification to validate
     * @returns {Object} Validation result with isValid flag and errors array
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
    validateFilter(filterSpec) {
        const result = {
            isValid: true,
            errors: []
        };

        if (!filterSpec || typeof filterSpec !== 'object') {
            result.isValid = false;
            result.errors.push('Filter specification must be an object');
            return result;
        }

        // Check for empty filter spec
        if (Object.keys(filterSpec).length === 0) {
            // Empty filter is valid (returns all rows)
            return result;
        }

        // Valid range operators
        const validRangeOperators = ['gte', 'lte', 'gt', 'lt'];

        // Validate each filter field
        for (const [field, value] of Object.entries(filterSpec)) {
            // Check if field is valid
            if (!FilterEngine.VALID_FIELDS.includes(field)) {
                result.isValid = false;
                result.errors.push(
                    `Invalid filter field: ${field}. Valid fields are: ${FilterEngine.VALID_FIELDS.join(', ')}`
                );
                continue;
            }

            // Check value type
            if (value === null || value === undefined) {
                result.isValid = false;
                result.errors.push(`Filter value for ${field} cannot be null or undefined`);
                continue;
            }

            // Validate array values
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    result.isValid = false;
                    result.errors.push(`Filter array for ${field} cannot be empty`);
                    continue;
                }

                // Check that all array elements are valid
                const hasInvalidElements = value.some(v => v === null || v === undefined);
                if (hasInvalidElements) {
                    result.isValid = false;
                    result.errors.push(`Filter array for ${field} contains null or undefined values`);
                }
            } else if (typeof value === 'object') {
                // Validate range filter
                const rangeKeys = Object.keys(value);
                
                if (rangeKeys.length === 0) {
                    result.isValid = false;
                    result.errors.push(`Range filter for ${field} cannot be empty`);
                    continue;
                }

                // Check that all keys are valid range operators
                const invalidOperators = rangeKeys.filter(key => !validRangeOperators.includes(key));
                if (invalidOperators.length > 0) {
                    result.isValid = false;
                    result.errors.push(
                        `Invalid range operators for ${field}: ${invalidOperators.join(', ')}. ` +
                        `Valid operators are: ${validRangeOperators.join(', ')}`
                    );
                }

                // Check that all range values are not null/undefined
                for (const [operator, rangeValue] of Object.entries(value)) {
                    if (rangeValue === null || rangeValue === undefined) {
                        result.isValid = false;
                        result.errors.push(`Range value for ${field}.${operator} cannot be null or undefined`);
                    }
                }
            }
        }

        return result;
    }
}
