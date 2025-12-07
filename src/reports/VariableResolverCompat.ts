/**
 * VariableResolver Compatibility Wrapper
 * 
 * Provides backward compatibility for the OOP VariableResolver interface
 * while using the functional implementation under the hood.
 * 
 * This wrapper maintains the same API as the original class-based implementation
 * to ensure existing code continues to work without modifications.
 */

import {
    resolveVariable,
    resolveVariables,
    validateVariable,
    getDependencies,
    AGGREGATE_FUNCTIONS,
    type VariableDefinition,
    type Variables,
    type PeriodOptions,
    type ResolvedValues,
    type AggregateFunction
} from '../core/variables/resolver.ts';
import type FilterEngine from './FilterEngineCompat.ts';

// Re-export types for backward compatibility
export type { VariableDefinition, Variables, PeriodOptions, ResolvedValues, AggregateFunction };

/**
 * Validation result type
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * VariableResolver - Compatibility wrapper for functional implementation
 * 
 * Maintains the same API as the original class-based implementation.
 * All methods delegate to the functional implementation.
 */
export default class VariableResolver {
    /**
     * Supported aggregate functions
     */
    static readonly AGGREGATE_FUNCTIONS: readonly AggregateFunction[] = AGGREGATE_FUNCTIONS;

    private filterEngine: FilterEngine;
    private cache: Map<string, ResolvedValues>;
    public resolutionStack: string[];

    /**
     * Create a new VariableResolver
     * 
     * @param filterEngine - FilterEngine instance for applying filters
     */
    constructor(filterEngine: FilterEngine) {
        if (!filterEngine) {
            throw new Error('FilterEngine is required');
        }
        this.filterEngine = filterEngine;
        this.cache = new Map();
        this.resolutionStack = [];
    }

    /**
     * Resolve all variables for given movements data
     * 
     * @param variables - Object mapping variable names to VariableDefinition objects
     * @param movementsData - Arquero table containing movements data
     * @param periodOptions - Period selection options (years, periods, etc.)
     * @returns Map of variable names to value objects { 2024: number, 2025: number }
     */
    resolveVariables(
        variables: Variables,
        movementsData: any,
        periodOptions: PeriodOptions
    ): Map<string, ResolvedValues> {
        if (!variables || typeof variables !== 'object') {
            throw new Error('Variables must be an object');
        }

        if (!movementsData) {
            throw new Error('Movements data is required');
        }

        // Clear cache for new resolution
        this.cache.clear();
        this.resolutionStack = [];

        const resolved = new Map<string, ResolvedValues>();

        // Resolve each variable
        for (const [varName, varDef] of Object.entries(variables)) {
            try {
                // Check cache first
                if (this.cache.has(varName)) {
                    resolved.set(varName, this.cache.get(varName)!);
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
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to resolve variable '${varName}': ${errorMessage}`);
            }
        }

        return resolved;
    }

    /**
     * Resolve a single variable definition
     * 
     * @param varDef - Variable definition with filter and aggregate
     * @param movementsData - Arquero table containing movements data
     * @param periodOptions - Period selection options
     * @returns Value object with year keys { 2024: number, 2025: number }
     */
    resolveVariable(
        varDef: VariableDefinition,
        movementsData: any,
        _periodOptions: PeriodOptions
    ): ResolvedValues {
        // Use functional implementation
        const result = resolveVariable(varDef)(movementsData);
        
        if (!result.success) {
            throw result.error;
        }
        
        return result.value;
    }

    /**
     * Get dependencies for a variable definition
     * 
     * @param varDef - Variable definition to analyze
     * @returns Array of variable names that this variable depends on
     */
    getDependencies(varDef: VariableDefinition): string[] {
        return getDependencies(varDef) as string[];
    }

    /**
     * Validate a variable definition
     * 
     * @param varDef - Variable definition to validate
     * @returns Validation result with isValid flag and errors array
     */
    validateVariable(varDef: VariableDefinition): ValidationResult {
        const result = validateVariable(varDef);
        return {
            isValid: result.isValid,
            errors: result.errors as string[]
        };
    }

    /**
     * Clear the variable cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get the current cache size
     * 
     * @returns Number of cached variables
     */
    getCacheSize(): number {
        return this.cache.size;
    }
}
