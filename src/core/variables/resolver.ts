/**
 * Variable Resolution Functions - Functional Implementation
 * 
 * Pure functions for resolving variable definitions to calculated values.
 * Applies filters to movements data and executes aggregate functions to compute
 * variable values. Supports caching, circular dependency detection, and variable-to-variable
 * references. All data processing uses Arquero DataFrames.
 * 
 * @example
 * import { resolveVariables, resolveVariable } from './resolver.ts';
 * 
 * // Define variables
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
 * // Resolve all variables
 * const result = resolveVariables(variables)(movementsData)({});
 * if (result.success) {
 *   const resolved = result.value;
 *   console.log('Revenue 2024:', resolved.get('revenue')[2024]);
 * }
 */

import { type Result, ok, err, type Option, some, none, memoize } from '../utils/index.ts';
import { applyFilter, type FilterSpec, validateFilter } from '../filters/filter.ts';

// ============================================================================
// Types
// ============================================================================

// Arquero table type (using any since arquero is loaded globally via CDN)
type ColumnTable = any;

/**
 * Aggregate function types
 */
export type AggregateFunction = 'sum' | 'average' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

/**
 * Variable definition
 */
export interface VariableDefinition {
    readonly filter: FilterSpec;
    readonly aggregate: AggregateFunction;
    readonly description?: string;
}

/**
 * Variables object mapping variable names to definitions
 */
export interface Variables {
    readonly [varName: string]: VariableDefinition;
}

/**
 * Period options for variable resolution
 */
export interface PeriodOptions {
    readonly [key: string]: string | boolean | number;
}

/**
 * Resolved variable values by year
 */
export interface ResolvedValues {
    readonly [year: number]: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
}

/**
 * Resolution context for tracking state during resolution
 */
interface ResolutionContext {
    readonly cache: ReadonlyMap<string, ResolvedValues>;
    readonly stack: readonly string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Supported aggregate functions
 */
export const AGGREGATE_FUNCTIONS: readonly AggregateFunction[] = [
    'sum', 'average', 'avg', 'count', 'min', 'max', 'first', 'last'
] as const;

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if an aggregate function is valid
 * 
 * @param aggregate - Aggregate function name
 * @returns True if aggregate is valid
 * 
 * @example
 * isValidAggregate('sum') // Returns: true
 * isValidAggregate('invalid') // Returns: false
 */
export const isValidAggregate = (aggregate: string): aggregate is AggregateFunction =>
    AGGREGATE_FUNCTIONS.includes(aggregate.toLowerCase() as AggregateFunction);

/**
 * Validate a variable definition
 * 
 * Checks that the variable definition has the required structure:
 * - filter: object (can be empty)
 * - aggregate: one of the supported aggregate functions
 * 
 * @param varDef - Variable definition to validate
 * @returns Validation result with isValid flag and errors array
 * 
 * @example
 * validateVariable({ filter: { code1: "700" }, aggregate: "sum" })
 * // Returns: { isValid: true, errors: [] }
 * 
 * validateVariable({ filter: { code1: "700" } })
 * // Returns: { isValid: false, errors: ["Missing required field: aggregate"] }
 */
export const validateVariable = (varDef: VariableDefinition): ValidationResult => {
    const errors: string[] = [];
    
    // Check if varDef is an object
    if (!varDef || typeof varDef !== 'object') {
        return {
            isValid: false,
            errors: ['Variable definition must be an object']
        };
    }
    
    // Check for required fields
    if (!('filter' in varDef)) {
        errors.push('Missing required field: filter');
    }
    
    if (!('aggregate' in varDef)) {
        errors.push('Missing required field: aggregate');
    }
    
    // Validate filter (if present)
    if ('filter' in varDef) {
        if (typeof varDef.filter !== 'object' || varDef.filter === null) {
            errors.push('Filter must be an object');
        } else {
            // Validate filter using filter module
            const filterValidation = validateFilter(varDef.filter);
            if (!filterValidation.isValid) {
                errors.push(...filterValidation.errors);
            }
        }
    }
    
    // Validate aggregate function
    if ('aggregate' in varDef) {
        const aggregate = varDef.aggregate;
        if (typeof aggregate !== 'string') {
            errors.push('Aggregate must be a string');
        } else if (!isValidAggregate(aggregate)) {
            errors.push(
                `Invalid aggregate function: ${aggregate}. ` +
                `Valid functions are: ${AGGREGATE_FUNCTIONS.join(', ')}`
            );
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Get unique years from a table
 * 
 * @param table - Arquero table
 * @returns Array of unique years
 */
const getUniqueYears = (table: ColumnTable): readonly number[] => {
    if (!table || table.numRows() === 0) {
        return [];
    }
    
    const yearArray = table.array('year') as number[];
    return yearArray.filter((v, i, a) => a.indexOf(v) === i);
};

/**
 * Apply aggregate function to an array of amounts
 * 
 * @param amounts - Array of amounts
 * @param aggregateFunc - Aggregate function name
 * @returns Aggregated value
 * 
 * @example
 * applyAggregate([100, 200, 300], 'sum') // Returns: 600
 * applyAggregate([100, 200, 300], 'average') // Returns: 200
 * applyAggregate([100, 200, 300], 'count') // Returns: 3
 */
const applyAggregate = (amounts: readonly number[], aggregateFunc: AggregateFunction): number => {
    if (amounts.length === 0) {
        return 0;
    }
    
    switch (aggregateFunc.toLowerCase()) {
        case 'sum':
            return amounts.reduce((sum, val) => sum + (val || 0), 0);
        
        case 'average':
        case 'avg':
            return amounts.reduce((sum, val) => sum + (val || 0), 0) / amounts.length;
        
        case 'count':
            return amounts.length;
        
        case 'min':
            return Math.min(...amounts);
        
        case 'max':
            return Math.max(...amounts);
        
        case 'first':
            return amounts[0];
        
        case 'last':
            return amounts[amounts.length - 1];
        
        default:
            throw new Error(`Unsupported aggregate function: ${aggregateFunc}`);
    }
};

/**
 * Aggregate filtered data by year
 * 
 * Groups the filtered data by year and applies the specified aggregate function.
 * Returns an object with year keys.
 * 
 * @param filteredData - Arquero table after filtering
 * @param aggregateFunc - Aggregate function name
 * @param originalData - Original movements data (before filtering) to determine available years
 * @returns Aggregated values by year
 * 
 * @example
 * aggregateByYear(filteredData, 'sum', originalData)
 * // Returns: { 2024: 3000, 2025: 4000 }
 */
const aggregateByYear = (
    filteredData: ColumnTable,
    aggregateFunc: AggregateFunction,
    originalData: ColumnTable
): ResolvedValues => {
    // Get unique years from original data
    const availableYears = getUniqueYears(originalData);
    
    if (availableYears.length === 0) {
        return {};
    }
    
    // Aggregate for each year
    const result: Record<number, number> = {};
    
    for (const year of availableYears) {
        // Filter for this year
        const yearData = filteredData.filter(`d => d.year === ${year}`);
        
        if (yearData.numRows() === 0) {
            result[year] = 0;
            continue;
        }
        
        // Get amounts for this year
        // Try 'movement_amount' first, then fall back to 'amount' for backward compatibility
        try {
            let amounts: number[];
            const columns = yearData.columnNames();
            
            if (columns.includes('movement_amount')) {
                amounts = yearData.array('movement_amount') as number[];
            } else if (columns.includes('amount')) {
                amounts = yearData.array('amount') as number[];
            } else {
                throw new Error(
                    `Neither 'movement_amount' nor 'amount' column found in data. ` +
                    `Available columns: ${columns.join(', ')}`
                );
            }
            
            result[year] = applyAggregate(amounts, aggregateFunc) || 0;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to get amount column: ${String(error)}`);
        }
    }
    
    return result;
};

// ============================================================================
// Variable Resolution
// ============================================================================

/**
 * Resolve a single variable definition
 * 
 * Applies the filter specification to movements data, then executes the aggregate
 * function to compute values for each year/period combination.
 * 
 * @param varDef - Variable definition with filter and aggregate
 * @returns Curried function that takes movements data and returns Result with resolved values
 * 
 * @example
 * const varDef = { filter: { code1: "700" }, aggregate: "sum" };
 * const result = resolveVariable(varDef)(movementsData);
 * if (result.success) {
 *   console.log('2024:', result.value[2024]);
 * }
 */
export const resolveVariable = (varDef: VariableDefinition) => (
    movementsData: ColumnTable
): Result<ResolvedValues, Error> => {
    // Validate variable definition
    const validation = validateVariable(varDef);
    if (!validation.isValid) {
        return err(new Error(`Invalid variable definition: ${validation.errors.join(', ')}`));
    }
    
    // Check if movementsData is valid
    if (!movementsData || typeof movementsData.filter !== 'function') {
        return err(new Error('Invalid movements data provided. Data may not be loaded yet.'));
    }
    
    // Apply filter to movements data
    let filteredData: ColumnTable;
    try {
        filteredData = applyFilter(varDef.filter)(movementsData);
    } catch (filterError) {
        const filterDesc = JSON.stringify(varDef.filter);
        const errorMessage = filterError instanceof Error ? filterError.message : String(filterError);
        return err(new Error(`Filter failed: ${errorMessage}. Filter: ${filterDesc}`));
    }
    
    // Check if filter returned any data
    if (!filteredData || filteredData.numRows() === 0) {
        // Return zeros for all years in original data
        const availableYears = getUniqueYears(movementsData);
        const result: Record<number, number> = {};
        for (const year of availableYears) {
            result[year] = 0;
        }
        return ok(result);
    }
    
    // Execute aggregate function for each year
    try {
        const result = aggregateByYear(filteredData, varDef.aggregate, movementsData);
        return ok(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return err(new Error(`Aggregation failed: ${errorMessage}`));
    }
};

/**
 * Check for circular dependency in resolution stack
 * 
 * @param varName - Variable name to check
 * @param stack - Current resolution stack
 * @returns Option with error if circular dependency detected
 */
const checkCircularDependency = (
    varName: string,
    stack: readonly string[]
): Option<Error> => {
    if (stack.includes(varName)) {
        const cycle = [...stack, varName].join(' -> ');
        return some(new Error(`Circular dependency detected: ${cycle}`));
    }
    return none();
};

/**
 * Resolve a single variable with context
 * 
 * @param varName - Variable name
 * @param varDef - Variable definition
 * @param movementsData - Movements data
 * @param context - Resolution context with cache and stack
 * @returns Result with updated context and resolved value
 */
const resolveVariableWithContext = (
    varName: string,
    varDef: VariableDefinition,
    movementsData: ColumnTable,
    context: ResolutionContext
): Result<{ context: ResolutionContext; value: ResolvedValues }, Error> => {
    // Check cache first
    if (context.cache.has(varName)) {
        return ok({
            context,
            value: context.cache.get(varName)!
        });
    }
    
    // Check for circular dependency
    const circularCheck = checkCircularDependency(varName, context.stack);
    if (circularCheck.some) {
        return err(circularCheck.value);
    }
    
    // Add to resolution stack
    const newStack = [...context.stack, varName];
    const newContext: ResolutionContext = {
        ...context,
        stack: newStack
    };
    
    // Resolve the variable
    const result = resolveVariable(varDef)(movementsData);
    
    if (!result.success) {
        return err(new Error(`Failed to resolve variable '${varName}': ${result.error.message}`));
    }
    
    // Update cache and remove from stack
    const updatedCache = new Map(context.cache);
    updatedCache.set(varName, result.value);
    
    const finalContext: ResolutionContext = {
        cache: updatedCache,
        stack: context.stack // Restore original stack
    };
    
    return ok({
        context: finalContext,
        value: result.value
    });
};

/**
 * Resolve all variables for given movements data
 * 
 * Processes all variable definitions, applies filters, executes aggregations,
 * and returns a map of variable names to their calculated values for each year/period.
 * 
 * @param variables - Object mapping variable names to VariableDefinition objects
 * @returns Curried function that takes movements data and period options, returns Result with resolved variables
 * 
 * @example
 * const variables = {
 *   revenue: { filter: { code1: "700" }, aggregate: "sum" },
 *   cogs: { filter: { code1: "710" }, aggregate: "sum" }
 * };
 * 
 * const result = resolveVariables(variables)(movementsData)({});
 * if (result.success) {
 *   const resolved = result.value;
 *   console.log('Revenue 2024:', resolved.get('revenue')[2024]);
 *   console.log('COGS 2024:', resolved.get('cogs')[2024]);
 * }
 */
export const resolveVariables = (variables: Variables) => (
    movementsData: ColumnTable
) => (
    _periodOptions: PeriodOptions
): Result<ReadonlyMap<string, ResolvedValues>, Error> => {
    // Validate inputs
    if (!variables || typeof variables !== 'object') {
        return err(new Error('Variables must be an object'));
    }
    
    if (!movementsData) {
        return err(new Error('Movements data is required'));
    }
    
    // Initialize context
    let context: ResolutionContext = {
        cache: new Map(),
        stack: []
    };
    
    const resolved = new Map<string, ResolvedValues>();
    
    // Resolve each variable
    for (const [varName, varDef] of Object.entries(variables)) {
        const result = resolveVariableWithContext(varName, varDef, movementsData, context);
        
        if (!result.success) {
            return err(result.error);
        }
        
        context = result.value.context;
        resolved.set(varName, result.value.value);
    }
    
    return ok(resolved);
};

// ============================================================================
// Curried Versions
// ============================================================================

/**
 * Create a resolver for a specific aggregate function
 * 
 * @param aggregateFunc - Aggregate function name
 * @returns Function that takes a filter and returns a resolver
 * 
 * @example
 * const sumResolver = resolveWithAggregate('sum');
 * const result = sumResolver({ code1: "700" })(movementsData);
 */
export const resolveWithAggregate = (aggregateFunc: AggregateFunction) => (
    filter: FilterSpec
) => (
    movementsData: ColumnTable
): Result<ResolvedValues, Error> =>
    resolveVariable({ filter, aggregate: aggregateFunc })(movementsData);

/**
 * Create a sum resolver for a specific filter
 * 
 * @param filter - Filter specification
 * @returns Function that takes movements data and returns sum values
 * 
 * @example
 * const revenueSum = resolveSum({ code1: "700" });
 * const result = revenueSum(movementsData);
 */
export const resolveSum = (filter: FilterSpec) => (
    movementsData: ColumnTable
): Result<ResolvedValues, Error> =>
    resolveVariable({ filter, aggregate: 'sum' })(movementsData);

/**
 * Create an average resolver for a specific filter
 * 
 * @param filter - Filter specification
 * @returns Function that takes movements data and returns average values
 * 
 * @example
 * const avgAmount = resolveAverage({ code1: "700" });
 * const result = avgAmount(movementsData);
 */
export const resolveAverage = (filter: FilterSpec) => (
    movementsData: ColumnTable
): Result<ResolvedValues, Error> =>
    resolveVariable({ filter, aggregate: 'average' })(movementsData);

/**
 * Create a count resolver for a specific filter
 * 
 * @param filter - Filter specification
 * @returns Function that takes movements data and returns count values
 * 
 * @example
 * const accountCount = resolveCount({ code1: "700" });
 * const result = accountCount(movementsData);
 */
export const resolveCount = (filter: FilterSpec) => (
    movementsData: ColumnTable
): Result<ResolvedValues, Error> =>
    resolveVariable({ filter, aggregate: 'count' })(movementsData);

// ============================================================================
// Dependency Analysis
// ============================================================================

/**
 * Get dependencies for a variable definition
 * 
 * Analyzes the variable definition to identify any references to other variables.
 * Currently, variable-to-variable references are not supported in filter specifications,
 * but this function is provided for future extensibility.
 * 
 * @param _varDef - Variable definition to analyze
 * @returns Array of variable names that this variable depends on
 * 
 * @example
 * const varDef = { filter: { code1: "700" }, aggregate: "sum" };
 * const deps = getDependencies(varDef);
 * // Returns: []
 */
export const getDependencies = (_varDef: VariableDefinition): readonly string[] => {
    // Currently, variable definitions don't support references to other variables
    // in their filter specifications. This function is provided for future extensibility.
    // 
    // If we add support for expressions in filters (e.g., filter: { amount: "> $revenue" }),
    // we would parse those expressions here to extract variable references.
    
    return [];
};
