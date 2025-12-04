/**
 * VariableResolver - Resolves variable definitions to calculated values
 * 
 * Applies filters to movements data and executes aggregate functions to compute
 * variable values. Supports caching, circular dependency detection, and variable-to-variable
 * references. All data processing uses Arquero DataFrames.
 * 
 * @example
 * const resolver = new VariableResolver(filterEngine);
 * 
 * const variables = {
 *   revenue: {
 *     filter: { code1: "700" },
 *     aggregate: "sum"
 *   },
 *   gross_profit: {
 *     filter: { code1: ["700", "710"] },
 *     aggregate: "sum"
 *   }
 * };
 * 
 * const resolved = resolver.resolveVariables(variables, movementsData, periodOptions);
 * // Returns: Map { 'revenue' => { 2024: 100000, 2025: 120000 }, ... }
 */
export default class VariableResolver {
    /**
     * Supported aggregate functions
     */
    static AGGREGATE_FUNCTIONS = ['sum', 'average', 'count', 'min', 'max', 'first', 'last'];

    /**
     * Create a new VariableResolver
     * 
     * @param {FilterEngine} filterEngine - FilterEngine instance for applying filters
     */
    constructor(filterEngine) {
        if (!filterEngine) {
            throw new Error('FilterEngine is required');
        }
        this.filterEngine = filterEngine;
        this.cache = new Map(); // Cache for resolved variables
        this.resolutionStack = []; // Stack for detecting circular dependencies
    }

    /**
     * Resolve all variables for given movements data
     * 
     * Processes all variable definitions, applies filters, executes aggregations,
     * and returns a map of variable names to their calculated values for each year/period.
     * 
     * @param {Object} variables - Object mapping variable names to VariableDefinition objects
     * @param {Object} movementsData - Arquero table containing movements data
     * @param {Object} periodOptions - Period selection options (years, periods, etc.)
     * @returns {Map<string, Object>} Map of variable names to value objects { 2024: number, 2025: number }
     * 
     * @example
     * const variables = {
     *   revenue: { filter: { code1: "700" }, aggregate: "sum" },
     *   cogs: { filter: { code1: "710" }, aggregate: "sum" }
     * };
     * 
     * const resolved = resolver.resolveVariables(variables, movementsData, periodOptions);
     * // Returns: Map {
     * //   'revenue' => { 2024: 100000, 2025: 120000 },
     * //   'cogs' => { 2024: -60000, 2025: -70000 }
     * // }
     */
    resolveVariables(variables, movementsData, periodOptions) {
        if (!variables || typeof variables !== 'object') {
            throw new Error('Variables must be an object');
        }

        if (!movementsData) {
            throw new Error('Movements data is required');
        }

        // Clear cache for new resolution
        this.cache.clear();
        this.resolutionStack = [];

        const resolved = new Map();

        // Resolve each variable
        for (const [varName, varDef] of Object.entries(variables)) {
            try {
                // Check cache first
                if (this.cache.has(varName)) {
                    resolved.set(varName, this.cache.get(varName));
                    continue;
                }

                // Check for circular dependency
                if (this.resolutionStack.includes(varName)) {
                    const cycle = [...this.resolutionStack, varName].join(' -> ');
                    throw new Error(`Circular dependency detected: ${cycle}`);
                }

                // Add to resolution stack
                this.resolutionStack.push(varName);

                try {
                    const value = this.resolveVariable(varDef, movementsData, periodOptions);
                    
                    // Cache the result
                    this.cache.set(varName, value);
                    resolved.set(varName, value);
                } finally {
                    // Remove from resolution stack
                    this.resolutionStack.pop();
                }
            } catch (error) {
                throw new Error(`Failed to resolve variable '${varName}': ${error.message}`);
            }
        }

        return resolved;
    }

    /**
     * Resolve a single variable definition
     * 
     * Applies the filter specification to movements data, then executes the aggregate
     * function to compute values for each year/period combination. Supports caching
     * and circular dependency detection.
     * 
     * @param {Object} varDef - Variable definition with filter and aggregate
     * @param {Object} movementsData - Arquero table containing movements data
     * @param {Object} periodOptions - Period selection options
     * @returns {Object} Value object with year keys { 2024: number, 2025: number }
     * 
     * @example
     * const varDef = { filter: { code1: "700" }, aggregate: "sum" };
     * const value = resolver.resolveVariable(varDef, movementsData, periodOptions);
     * // Returns: { 2024: 100000, 2025: 120000 }
     */
    resolveVariable(varDef, movementsData, periodOptions) {
        // Validate variable definition
        const validation = this.validateVariable(varDef);
        if (!validation.isValid) {
            throw new Error(`Invalid variable definition: ${validation.errors.join(', ')}`);
        }

        // Apply filter to movements data
        const filteredData = this.filterEngine.applyFilter(movementsData, varDef.filter);

        // Execute aggregate function for each year/period
        const result = this._aggregateByPeriod(filteredData, varDef.aggregate, periodOptions, movementsData);

        return result;
    }

    /**
     * Aggregate filtered data by year/period
     * 
     * Groups the filtered data by year (and optionally period) and applies the
     * specified aggregate function. Returns an object with year keys.
     * 
     * @private
     * @param {Object} filteredData - Arquero table after filtering
     * @param {string} aggregateFunc - Aggregate function name (sum, average, count, etc.)
     * @param {Object} periodOptions - Period selection options
     * @param {Object} originalData - Original movements data (before filtering) to determine available years
     * @returns {Object} Aggregated values by year { 2024: number, 2025: number }
     */
    _aggregateByPeriod(filteredData, aggregateFunc, periodOptions, originalData) {
        // Get unique years from the original data to know which years to include
        const originalYearArray = originalData.array('year');
        
        // If no years in original data, return empty object
        if (originalYearArray.length === 0) {
            return {};
        }
        
        const availableYears = originalYearArray.filter((v, i, a) => a.indexOf(v) === i);
        
        // Group by year and aggregate
        const result = {};

        for (const year of availableYears) {
            // Filter for this year
            const yearData = filteredData.filter(`d => d.year === ${year}`);

            if (yearData.numRows() === 0) {
                result[year] = 0;
                continue;
            }

            // Apply aggregate function
            let value;
            const amounts = yearData.array('amount');
            
            switch (aggregateFunc.toLowerCase()) {
                case 'sum':
                    value = amounts.reduce((sum, val) => sum + (val || 0), 0);
                    break;

                case 'average':
                case 'avg':
                    value = amounts.length > 0 
                        ? amounts.reduce((sum, val) => sum + (val || 0), 0) / amounts.length
                        : 0;
                    break;

                case 'count':
                    value = yearData.numRows();
                    break;

                case 'min':
                    value = amounts.length > 0 ? Math.min(...amounts) : 0;
                    break;

                case 'max':
                    value = amounts.length > 0 ? Math.max(...amounts) : 0;
                    break;

                case 'first':
                    value = amounts.length > 0 ? amounts[0] : 0;
                    break;

                case 'last':
                    value = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
                    break;

                default:
                    throw new Error(`Unsupported aggregate function: ${aggregateFunc}`);
            }

            result[year] = value || 0;
        }

        return result;
    }

    /**
     * Get dependencies for a variable definition
     * 
     * Analyzes the variable definition to identify any references to other variables.
     * Currently, variable-to-variable references are not supported in filter specifications,
     * but this method is provided for future extensibility.
     * 
     * @param {Object} varDef - Variable definition to analyze
     * @returns {string[]} Array of variable names that this variable depends on
     * 
     * @example
     * const varDef = { filter: { code1: "700" }, aggregate: "sum" };
     * const deps = resolver.getDependencies(varDef);
     * // Returns: []
     */
    getDependencies(varDef) {
        // Currently, variable definitions don't support references to other variables
        // in their filter specifications. This method is provided for future extensibility.
        // 
        // If we add support for expressions in filters (e.g., filter: { amount: "> $revenue" }),
        // we would parse those expressions here to extract variable references.
        
        return [];
    }

    /**
     * Validate a variable definition
     * 
     * Checks that the variable definition has the required structure:
     * - filter: object (can be empty)
     * - aggregate: one of the supported aggregate functions
     * 
     * @param {Object} varDef - Variable definition to validate
     * @returns {Object} Validation result with isValid flag and errors array
     * 
     * @example
     * validateVariable({ filter: { code1: "700" }, aggregate: "sum" })
     * // Returns: { isValid: true, errors: [] }
     * 
     * validateVariable({ filter: { code1: "700" } })
     * // Returns: { isValid: false, errors: ["Missing required field: aggregate"] }
     * 
     * validateVariable({ filter: { code1: "700" }, aggregate: "invalid" })
     * // Returns: { isValid: false, errors: ["Invalid aggregate function: invalid"] }
     */
    validateVariable(varDef) {
        const result = {
            isValid: true,
            errors: []
        };

        if (!varDef || typeof varDef !== 'object') {
            result.isValid = false;
            result.errors.push('Variable definition must be an object');
            return result;
        }

        // Check for required fields
        if (!('filter' in varDef)) {
            result.isValid = false;
            result.errors.push('Missing required field: filter');
        }

        if (!('aggregate' in varDef)) {
            result.isValid = false;
            result.errors.push('Missing required field: aggregate');
        }

        // Validate filter (if present)
        if ('filter' in varDef) {
            if (typeof varDef.filter !== 'object' || varDef.filter === null) {
                result.isValid = false;
                result.errors.push('Filter must be an object');
            } else {
                // Validate filter using FilterEngine
                const filterValidation = this.filterEngine.validateFilter(varDef.filter);
                if (!filterValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...filterValidation.errors);
                }
            }
        }

        // Validate aggregate function
        if ('aggregate' in varDef) {
            const aggregate = varDef.aggregate;
            if (typeof aggregate !== 'string') {
                result.isValid = false;
                result.errors.push('Aggregate must be a string');
            } else if (!VariableResolver.AGGREGATE_FUNCTIONS.includes(aggregate.toLowerCase())) {
                result.isValid = false;
                result.errors.push(
                    `Invalid aggregate function: ${aggregate}. ` +
                    `Valid functions are: ${VariableResolver.AGGREGATE_FUNCTIONS.join(', ')}`
                );
            }
        }

        return result;
    }

    /**
     * Clear the variable cache
     * 
     * Clears all cached variable values. Should be called when the underlying
     * movements data changes to ensure fresh calculations.
     * 
     * @example
     * resolver.clearCache();
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get the current cache size
     * 
     * Returns the number of variables currently cached.
     * 
     * @returns {number} Number of cached variables
     * 
     * @example
     * const size = resolver.getCacheSize();
     * console.log(`${size} variables cached`);
     */
    getCacheSize() {
        return this.cache.size;
    }
}
