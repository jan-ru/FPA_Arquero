import ValidationResult from '../utils/ValidationResult.ts';

/**
 * ReportValidator - Validates report definitions against schema and business rules
 * 
 * Provides comprehensive validation of report definitions including:
 * - JSON Schema structure validation
 * - Business rule validation (uniqueness, references)
 * - Expression syntax validation
 * - Variable reference validation
 * 
 * @example
 * const validator = new ReportValidator(schema);
 * const result = validator.validate(reportDef);
 * 
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.formatMessages());
 * }
 */

/**
 * Valid statement types
 */
export type StatementType = 'balance' | 'income' | 'cashflow';

/**
 * Valid layout item types
 */
export type LayoutType = 'variable' | 'calculated' | 'category' | 'subtotal' | 'spacer';

/**
 * Valid aggregate functions
 */
export type AggregateFunction = 'sum' | 'average' | 'count' | 'min' | 'max' | 'first' | 'last';

/**
 * Valid format types
 */
export type FormatType = 'currency' | 'percent' | 'integer' | 'decimal';

/**
 * Valid style types
 */
export type StyleType = 'normal' | 'metric' | 'subtotal' | 'total' | 'spacer';

/**
 * Valid filter fields
 */
export type FilterField = 'code1' | 'code2' | 'code3' | 'name1' | 'name2' | 'name3' | 'statement_type';

/**
 * Pattern match object for name filters
 */
export interface PatternMatch {
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    regex?: string;
}

/**
 * Filter specification
 */
export interface FilterSpec {
    code1?: string | string[];
    code2?: string | string[];
    code3?: string | string[];
    name1?: string | PatternMatch;
    name2?: string | PatternMatch;
    name3?: string | PatternMatch;
    statement_type?: string;
}

/**
 * Variable definition
 */
export interface VariableDefinition {
    filter: FilterSpec;
    aggregate: AggregateFunction;
}

/**
 * Layout item base interface
 */
export interface BaseLayoutItem {
    order: number;
    label?: string;
    format?: FormatType;
    style?: StyleType;
    indent?: number;
    filter?: FilterSpec;
}

/**
 * Variable layout item
 */
export interface VariableLayoutItem extends BaseLayoutItem {
    type: 'variable';
    variable: string;
}

/**
 * Calculated layout item
 */
export interface CalculatedLayoutItem extends BaseLayoutItem {
    type: 'calculated';
    expression: string;
}

/**
 * Category layout item
 */
export interface CategoryLayoutItem extends BaseLayoutItem {
    type: 'category';
    filter: FilterSpec;
}

/**
 * Subtotal layout item
 */
export interface SubtotalLayoutItem extends BaseLayoutItem {
    type: 'subtotal';
    from: number;
    to: number;
}

/**
 * Spacer layout item
 */
export interface SpacerLayoutItem extends BaseLayoutItem {
    type: 'spacer';
}

/**
 * Union of all layout item types
 */
export type LayoutItem = 
    | VariableLayoutItem 
    | CalculatedLayoutItem 
    | CategoryLayoutItem 
    | SubtotalLayoutItem 
    | SpacerLayoutItem;

/**
 * Currency formatting rules
 */
export interface CurrencyFormatting {
    decimals?: number;
    thousands?: boolean;
    symbol?: string;
}

/**
 * Percent formatting rules
 */
export interface PercentFormatting {
    decimals?: number;
    symbol?: string;
}

/**
 * Integer formatting rules
 */
export interface IntegerFormatting {
    thousands?: boolean;
}

/**
 * Decimal formatting rules
 */
export interface DecimalFormatting {
    decimals?: number;
    thousands?: boolean;
}

/**
 * Formatting rules
 */
export interface FormattingRules {
    currency?: CurrencyFormatting;
    percent?: PercentFormatting;
    integer?: IntegerFormatting;
    decimal?: DecimalFormatting;
}

/**
 * Report definition interface
 */
export interface ReportDefinition {
    reportId: string;
    name: string;
    version: string;
    statementType: StatementType;
    layout: LayoutItem[];
    variables?: Record<string, VariableDefinition>;
    formatting?: FormattingRules;
}

/**
 * JSON Schema interface (simplified)
 */
export interface JSONSchema {
    [key: string]: any;
}

export default class ReportValidator {
    private schema: JSONSchema;
    private validStatementTypes: readonly StatementType[];
    private validLayoutTypes: readonly LayoutType[];
    private validAggregates: readonly AggregateFunction[];
    private validFormatTypes: readonly FormatType[];
    private validStyleTypes: readonly StyleType[];
    private validFilterFields: readonly FilterField[];

    /**
     * Create a new ReportValidator
     * @param schema - JSON Schema for report definitions
     */
    constructor(schema: JSONSchema) {
        this.schema = schema;
        
        // Valid values for enums
        this.validStatementTypes = ['balance', 'income', 'cashflow'] as const;
        this.validLayoutTypes = ['variable', 'calculated', 'category', 'subtotal', 'spacer'] as const;
        this.validAggregates = ['sum', 'average', 'count', 'min', 'max', 'first', 'last'] as const;
        this.validFormatTypes = ['currency', 'percent', 'integer', 'decimal'] as const;
        this.validStyleTypes = ['normal', 'metric', 'subtotal', 'total', 'spacer'] as const;
        this.validFilterFields = ['code1', 'code2', 'code3', 'name1', 'name2', 'name3', 'statement_type'] as const;
    }

    /**
     * Validate a complete report definition
     * Runs all validation checks and returns combined results
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result with all errors
     */
    validate(reportDef: any): ValidationResult {
        const result = new ValidationResult();

        // Run all validation checks
        const structureResult = this.validateStructure(reportDef);
        const businessResult = this.validateBusinessRules(reportDef);
        const expressionResult = this.validateExpressions(reportDef);
        const referenceResult = this.validateReferences(reportDef);

        // Merge all results
        result.merge(structureResult);
        result.merge(businessResult);
        result.merge(expressionResult);
        result.merge(referenceResult);

        return result;
    }

    /**
     * Validate report definition structure against JSON Schema
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result
     */
    validateStructure(reportDef: any): ValidationResult {
        const result = new ValidationResult();

        // Check if reportDef is an object
        if (!reportDef || typeof reportDef !== 'object') {
            result.addError('reportDef', 'Report definition must be an object');
            return result;
        }

        // Validate required fields
        const requiredFields: (keyof ReportDefinition)[] = ['reportId', 'name', 'version', 'statementType', 'layout'];
        for (const field of requiredFields) {
            if (!reportDef[field]) {
                result.addError(field, `Required field '${field}' is missing`);
            }
        }

        // If required fields are missing, return early
        if (result.hasErrors()) {
            return result;
        }

        // Validate reportId format
        if (!/^[a-z0-9_-]+$/.test(reportDef.reportId)) {
            result.addError('reportId', 'reportId must contain only lowercase letters, numbers, hyphens, and underscores');
        }

        if (reportDef.reportId.length < 1 || reportDef.reportId.length > 100) {
            result.addError('reportId', 'reportId must be between 1 and 100 characters');
        }

        // Validate name
        if (typeof reportDef.name !== 'string' || reportDef.name.length < 1 || reportDef.name.length > 200) {
            result.addError('name', 'name must be a string between 1 and 200 characters');
        }

        // Validate version format (semantic versioning)
        if (!/^\d+\.\d+\.\d+$/.test(reportDef.version)) {
            result.addError('version', 'version must follow semantic versioning format (e.g., "1.0.0")');
        }

        // Validate statementType
        if (!this.validStatementTypes.includes(reportDef.statementType)) {
            result.addError('statementType', `statementType must be one of: ${this.validStatementTypes.join(', ')}`);
        }

        // Validate layout is non-empty array
        if (!Array.isArray(reportDef.layout)) {
            result.addError('layout', 'layout must be an array');
        } else if (reportDef.layout.length === 0) {
            result.addError('layout', 'layout must contain at least one item');
        } else {
            // Validate each layout item
            reportDef.layout.forEach((item: any, index: number) => {
                this.validateLayoutItem(item, index, result);
            });
        }

        // Validate variables if present
        if (reportDef.variables) {
            if (typeof reportDef.variables !== 'object') {
                result.addError('variables', 'variables must be an object');
            } else {
                for (const [varName, varDef] of Object.entries(reportDef.variables)) {
                    this.validateVariable(varName, varDef as any, result);
                }
            }
        }

        // Validate formatting if present
        if (reportDef.formatting) {
            this.validateFormatting(reportDef.formatting, result);
        }

        return result;
    }

    /**
     * Validate a single layout item
     * 
     * @param item - Layout item to validate
     * @param index - Index in layout array
     * @param result - Result to add errors to
     * @private
     */
    private validateLayoutItem(item: any, index: number, result: ValidationResult): void {
        const prefix = `layout[${index}]`;

        // Check required fields
        if (typeof item.order !== 'number') {
            result.addError(`${prefix}.order`, 'order must be a number');
        } else if (item.order < 0) {
            result.addError(`${prefix}.order`, 'order must be >= 0');
        }

        if (!item.type) {
            result.addError(`${prefix}.type`, 'type is required');
        } else if (!this.validLayoutTypes.includes(item.type)) {
            result.addError(`${prefix}.type`, `type must be one of: ${this.validLayoutTypes.join(', ')}`);
        }

        // Type-specific validation
        if (item.type === 'variable' && !item.variable) {
            result.addError(`${prefix}.variable`, 'variable field is required for type="variable"');
        }

        if (item.type === 'calculated' && !item.expression) {
            result.addError(`${prefix}.expression`, 'expression field is required for type="calculated"');
        }

        if (item.type === 'category' && !item.filter) {
            result.addError(`${prefix}.filter`, 'filter field is required for type="category"');
        }

        if (item.type === 'subtotal') {
            if (item.from === undefined) {
                result.addError(`${prefix}.from`, 'from field is required for type="subtotal"');
            }
            if (item.to === undefined) {
                result.addError(`${prefix}.to`, 'to field is required for type="subtotal"');
            }
        }

        // Validate optional fields
        if (item.format && !this.validFormatTypes.includes(item.format)) {
            result.addError(`${prefix}.format`, `format must be one of: ${this.validFormatTypes.join(', ')}`);
        }

        if (item.style && !this.validStyleTypes.includes(item.style)) {
            result.addError(`${prefix}.style`, `style must be one of: ${this.validStyleTypes.join(', ')}`);
        }

        if (item.indent !== undefined) {
            if (!Number.isInteger(item.indent) || item.indent < 0 || item.indent > 3) {
                result.addError(`${prefix}.indent`, 'indent must be an integer between 0 and 3');
            }
        }

        // Validate filter if present
        if (item.filter) {
            this.validateFilter(item.filter, `${prefix}.filter`, result);
        }
    }

    /**
     * Validate a variable definition
     * 
     * @param varName - Variable name
     * @param varDef - Variable definition
     * @param result - Result to add errors to
     * @private
     */
    private validateVariable(varName: string, varDef: any, result: ValidationResult): void {
        const prefix = `variables.${varName}`;

        if (!varDef || typeof varDef !== 'object') {
            result.addError(prefix, 'Variable definition must be an object');
            return;
        }

        // Check required fields
        if (!varDef.filter) {
            result.addError(`${prefix}.filter`, 'filter is required');
        } else {
            this.validateFilter(varDef.filter, `${prefix}.filter`, result);
        }

        if (!varDef.aggregate) {
            result.addError(`${prefix}.aggregate`, 'aggregate is required');
        } else if (!this.validAggregates.includes(varDef.aggregate)) {
            result.addError(`${prefix}.aggregate`, `aggregate must be one of: ${this.validAggregates.join(', ')}`);
        }
    }

    /**
     * Validate a filter specification
     * 
     * @param filter - Filter specification
     * @param prefix - Field path prefix for error messages
     * @param result - Result to add errors to
     * @private
     */
    private validateFilter(filter: any, prefix: string, result: ValidationResult): void {
        if (!filter || typeof filter !== 'object') {
            result.addError(prefix, 'Filter must be an object');
            return;
        }

        // Check that filter has at least one property
        const filterKeys = Object.keys(filter);
        if (filterKeys.length === 0) {
            result.addError(prefix, 'Filter must have at least one property');
            return;
        }

        // Check that all properties are valid filter fields
        for (const key of filterKeys) {
            if (!this.validFilterFields.includes(key as FilterField)) {
                result.addError(`${prefix}.${key}`, `Invalid filter field. Valid fields are: ${this.validFilterFields.join(', ')}`);
            }
        }

        // Validate filter values
        for (const [key, value] of Object.entries(filter)) {
            if (key.startsWith('code')) {
                // code fields can be string or array of strings
                if (typeof value !== 'string' && !Array.isArray(value)) {
                    result.addError(`${prefix}.${key}`, 'Code filter must be a string or array of strings');
                } else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        result.addError(`${prefix}.${key}`, 'Code filter array must not be empty');
                    }
                    if (!value.every(v => typeof v === 'string')) {
                        result.addError(`${prefix}.${key}`, 'Code filter array must contain only strings');
                    }
                }
            } else if (key.startsWith('name')) {
                // name fields can be string or pattern match object
                if (typeof value !== 'string' && (typeof value !== 'object' || value === null)) {
                    result.addError(`${prefix}.${key}`, 'Name filter must be a string or pattern match object');
                } else if (typeof value === 'object') {
                    this.validatePatternMatch(value, `${prefix}.${key}`, result);
                }
            } else if (key === 'statement_type') {
                if (typeof value !== 'string') {
                    result.addError(`${prefix}.${key}`, 'statement_type must be a string');
                }
            }
        }
    }

    /**
     * Validate a pattern match object
     * 
     * @param pattern - Pattern match object
     * @param prefix - Field path prefix for error messages
     * @param result - Result to add errors to
     * @private
     */
    private validatePatternMatch(pattern: any, prefix: string, result: ValidationResult): void {
        const validPatternKeys: (keyof PatternMatch)[] = ['contains', 'startsWith', 'endsWith', 'regex'];
        const patternKeys = Object.keys(pattern);

        if (patternKeys.length === 0) {
            result.addError(prefix, 'Pattern match must have at least one property');
            return;
        }

        for (const key of patternKeys) {
            if (!validPatternKeys.includes(key as keyof PatternMatch)) {
                result.addError(`${prefix}.${key}`, `Invalid pattern match property. Valid properties are: ${validPatternKeys.join(', ')}`);
            } else if (typeof pattern[key] !== 'string') {
                result.addError(`${prefix}.${key}`, 'Pattern match value must be a string');
            }
        }
    }

    /**
     * Validate formatting rules
     * 
     * @param formatting - Formatting rules
     * @param result - Result to add errors to
     * @private
     */
    private validateFormatting(formatting: any, result: ValidationResult): void {
        const prefix = 'formatting';

        if (typeof formatting !== 'object') {
            result.addError(prefix, 'Formatting must be an object');
            return;
        }

        // Validate currency formatting
        if (formatting.currency) {
            this.validateCurrencyFormatting(formatting.currency, `${prefix}.currency`, result);
        }

        // Validate percent formatting
        if (formatting.percent) {
            this.validatePercentFormatting(formatting.percent, `${prefix}.percent`, result);
        }

        // Validate integer formatting
        if (formatting.integer) {
            this.validateIntegerFormatting(formatting.integer, `${prefix}.integer`, result);
        }

        // Validate decimal formatting
        if (formatting.decimal) {
            this.validateDecimalFormatting(formatting.decimal, `${prefix}.decimal`, result);
        }
    }

    /**
     * Validate currency formatting rules
     * @private
     */
    private validateCurrencyFormatting(rules: any, prefix: string, result: ValidationResult): void {
        if (rules.decimals !== undefined) {
            if (!Number.isInteger(rules.decimals) || rules.decimals < 0 || rules.decimals > 4) {
                result.addError(`${prefix}.decimals`, 'decimals must be an integer between 0 and 4');
            }
        }

        if (rules.thousands !== undefined && typeof rules.thousands !== 'boolean') {
            result.addError(`${prefix}.thousands`, 'thousands must be a boolean');
        }

        if (rules.symbol !== undefined) {
            if (typeof rules.symbol !== 'string' || rules.symbol.length > 5) {
                result.addError(`${prefix}.symbol`, 'symbol must be a string with max length 5');
            }
        }
    }

    /**
     * Validate percent formatting rules
     * @private
     */
    private validatePercentFormatting(rules: any, prefix: string, result: ValidationResult): void {
        if (rules.decimals !== undefined) {
            if (!Number.isInteger(rules.decimals) || rules.decimals < 0 || rules.decimals > 4) {
                result.addError(`${prefix}.decimals`, 'decimals must be an integer between 0 and 4');
            }
        }

        if (rules.symbol !== undefined) {
            if (typeof rules.symbol !== 'string' || rules.symbol.length > 5) {
                result.addError(`${prefix}.symbol`, 'symbol must be a string with max length 5');
            }
        }
    }

    /**
     * Validate integer formatting rules
     * @private
     */
    private validateIntegerFormatting(rules: any, prefix: string, result: ValidationResult): void {
        if (rules.thousands !== undefined && typeof rules.thousands !== 'boolean') {
            result.addError(`${prefix}.thousands`, 'thousands must be a boolean');
        }
    }

    /**
     * Validate decimal formatting rules
     * @private
     */
    private validateDecimalFormatting(rules: any, prefix: string, result: ValidationResult): void {
        if (rules.decimals !== undefined) {
            if (!Number.isInteger(rules.decimals) || rules.decimals < 0 || rules.decimals > 4) {
                result.addError(`${prefix}.decimals`, 'decimals must be an integer between 0 and 4');
            }
        }

        if (rules.thousands !== undefined && typeof rules.thousands !== 'boolean') {
            result.addError(`${prefix}.thousands`, 'thousands must be a boolean');
        }
    }

    /**
     * Validate business rules
     * Checks uniqueness constraints and logical consistency
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result
     */
    validateBusinessRules(reportDef: any): ValidationResult {
        const result = new ValidationResult();

        // Skip if structure validation failed
        if (!reportDef || !reportDef.layout) {
            return result;
        }

        // Check for duplicate order numbers
        const orderNumbers = new Set<number>();
        const duplicateOrders = new Set<number>();

        reportDef.layout.forEach((item: any) => {
            if (typeof item.order === 'number') {
                if (orderNumbers.has(item.order)) {
                    duplicateOrders.add(item.order);
                }
                orderNumbers.add(item.order);
            }
        });

        if (duplicateOrders.size > 0) {
            result.addError('layout', `Duplicate order numbers found: ${Array.from(duplicateOrders).join(', ')}`);
        }

        // Validate subtotal ranges
        reportDef.layout.forEach((item: any, _index: number) => {
            if (item.type === 'subtotal' && item.from !== undefined && item.to !== undefined) {
                if (item.from >= item.to) {
                    result.addError(`layout[${_index}]`, `Subtotal 'from' (${item.from}) must be less than 'to' (${item.to})`);
                }
            }
        });

        return result;
    }

    /**
     * Validate expressions in calculated layout items
     * Checks syntax and basic structure
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result
     */
    validateExpressions(reportDef: any): ValidationResult {
        const result = new ValidationResult();

        // Skip if structure validation failed
        if (!reportDef || !reportDef.layout) {
            return result;
        }

        // Validate expressions in calculated layout items
        reportDef.layout.forEach((item: any, index: number) => {
            if (item.type === 'calculated' && item.expression) {
                const exprResult = this.validateExpression(item.expression, `layout[${index}].expression`);
                result.merge(exprResult);
            }
        });

        return result;
    }

    /**
     * Validate a single expression
     * Checks for basic syntax errors
     * 
     * @param expression - Expression to validate
     * @param prefix - Field path prefix for error messages
     * @returns Validation result
     * @private
     */
    private validateExpression(expression: string, prefix: string): ValidationResult {
        const result = new ValidationResult();

        if (typeof expression !== 'string' || expression.trim().length === 0) {
            result.addError(prefix, 'Expression must be a non-empty string');
            return result;
        }

        // Check for balanced parentheses
        let parenCount = 0;
        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === '(') parenCount++;
            if (expression[i] === ')') parenCount--;
            if (parenCount < 0) {
                result.addError(prefix, `Unbalanced parentheses at position ${i}`);
                return result;
            }
        }

        if (parenCount !== 0) {
            result.addError(prefix, 'Unbalanced parentheses: missing closing parenthesis');
        }

        // Check for invalid characters (basic check)
        const validChars = /^[a-zA-Z0-9_@+\-*/().\s]+$/;
        if (!validChars.test(expression)) {
            result.addError(prefix, 'Expression contains invalid characters');
        }

        // Check for consecutive operators
        if (/[+\-*/]{2,}/.test(expression.replace(/--/g, ''))) {
            result.addError(prefix, 'Expression contains consecutive operators');
        }

        // Check for operators at start/end (except unary minus)
        if (/^[+*/]/.test(expression.trim())) {
            result.addError(prefix, 'Expression cannot start with an operator (except minus)');
        }

        if (/[+\-*/]$/.test(expression.trim())) {
            result.addError(prefix, 'Expression cannot end with an operator');
        }

        return result;
    }

    /**
     * Validate references between layout items and variables
     * Checks that all referenced variables and order numbers exist
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result
     */
    validateReferences(reportDef: any): ValidationResult {
        const result = new ValidationResult();

        // Skip if structure validation failed
        if (!reportDef || !reportDef.layout) {
            return result;
        }

        // Build set of defined variables
        const definedVariables = new Set<string>();
        if (reportDef.variables) {
            for (const varName of Object.keys(reportDef.variables)) {
                definedVariables.add(varName);
            }
        }

        // Build set of defined order numbers
        const definedOrders = new Set<number>();
        reportDef.layout.forEach((item: any) => {
            if (typeof item.order === 'number') {
                definedOrders.add(item.order);
            }
        });

        // Check variable references in layout items
        reportDef.layout.forEach((item: any, index: number) => {
            if (item.type === 'variable' && item.variable) {
                if (!definedVariables.has(item.variable)) {
                    result.addError(`layout[${index}].variable`, `Variable '${item.variable}' is not defined in variables section`);
                }
            }

            // Check order references in expressions
            if (item.type === 'calculated' && item.expression) {
                const orderRefs = this.extractOrderReferences(item.expression);
                for (const orderRef of orderRefs) {
                    if (!definedOrders.has(orderRef)) {
                        result.addError(`layout[${index}].expression`, `Order reference @${orderRef} does not exist`);
                    }
                }
            }

            // Check variable references in expressions
            if (item.type === 'calculated' && item.expression) {
                const varRefs = this.extractVariableReferences(item.expression);
                for (const varRef of varRefs) {
                    if (!definedVariables.has(varRef)) {
                        result.addError(`layout[${index}].expression`, `Variable '${varRef}' is not defined in variables section`);
                    }
                }
            }

            // Check subtotal order references
            if (item.type === 'subtotal') {
                if (item.from !== undefined && !definedOrders.has(item.from)) {
                    result.addError(`layout[${index}].from`, `Order number ${item.from} does not exist`);
                }
                if (item.to !== undefined && !definedOrders.has(item.to)) {
                    result.addError(`layout[${index}].to`, `Order number ${item.to} does not exist`);
                }
            }
        });

        return result;
    }

    /**
     * Extract order references from an expression
     * Order references are in the format @10, @20, etc.
     * 
     * @param expression - Expression to parse
     * @returns Array of order numbers
     * @private
     */
    private extractOrderReferences(expression: string): number[] {
        const orderRefs: number[] = [];
        const regex = /@(\d+)/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(expression)) !== null) {
            orderRefs.push(parseInt(match[1], 10));
        }

        return orderRefs;
    }

    /**
     * Extract variable references from an expression
     * Variable references are identifiers (not preceded by @)
     * 
     * @param expression - Expression to parse
     * @returns Array of variable names
     * @private
     */
    private extractVariableReferences(expression: string): string[] {
        const varRefs: string[] = [];
        // Match identifiers that are not preceded by @ and not followed by (
        const regex = /(?<!@)\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(expression)) !== null) {
            varRefs.push(match[1]);
        }

        return varRefs;
    }
}
