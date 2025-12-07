import { ErrorFactory } from '../errors/index.ts';
import type VariableResolver from './VariableResolver.ts';
import type ExpressionEvaluator from './ExpressionEvaluator.ts';
import FilterEngine from './FilterEngine.ts';
import type { 
    ReportDefinition, 
    LayoutItem, 
    FormattingRules,
    FormatType,
    StyleType,
    LayoutType
} from './ReportValidator.ts';

/**
 * ReportRenderer - Generates statement data from report definitions
 * 
 * Processes report definitions to generate financial statement data by:
 * - Resolving variables using VariableResolver
 * - Evaluating expressions using ExpressionEvaluator
 * - Processing layout items in order
 * - Calculating subtotals
 * - Applying formatting rules
 * - Calculating variances
 * - Generating row metadata for ag-Grid
 * 
 * All data processing uses Arquero DataFrames for consistency with the rest of the application.
 * 
 * @example
 * const renderer = new ReportRenderer(variableResolver, expressionEvaluator);
 * 
 * const statementData = renderer.renderStatement(
 *   reportDefinition,
 *   movementsData,
 *   periodOptions
 * );
 * 
 * // Returns statement data with rows ready for ag-Grid
 */

/**
 * Period options for statement generation
 */
export interface PeriodOptions {
    years: number[];
    periods: string | string[];
    [key: string]: any;
}

/**
 * Row data object for statement display
 */
export interface RowData {
    order: number;
    label: string;
    type: LayoutType;
    style: StyleType;
    indent: number;
    format: FormatType;
    amount_2024: number | null;
    amount_2025: number | null;
    variance_amount: number | null;
    variance_percent: number | null;
    formatted_2024?: string;
    formatted_2025?: string;
    formatted_variance_amount?: string;
    formatted_variance_percent?: string;
    _metadata: RowMetadata;
}

/**
 * Row metadata
 */
export interface RowMetadata {
    variable?: string;
    expression?: string;
    filter?: any;
    calculatedFrom?: [number, number];
}

/**
 * Rendering context
 */
export interface RenderingContext {
    variables: Map<string, Record<number, number>>;
    rows: Map<number, RowData>;
    reportDef: ReportDefinition;
    periodOptions: PeriodOptions;
    movementsData: any; // Arquero table
}

/**
 * Statement data output
 */
export interface StatementData {
    reportId: string;
    reportName: string;
    reportVersion: string;
    statementType: string;
    generatedAt: string;
    rows: RowData[];
    metadata: StatementMetadata;
}

/**
 * Statement metadata
 */
export interface StatementMetadata {
    periodOptions: PeriodOptions;
    variableCount: number;
    layoutItemCount: number;
}

/**
 * Format specification
 */
export type FormatSpec = FormatType | {
    type: FormatType;
    [key: string]: any;
};

/**
 * Format options
 */
export interface FormatOptions {
    decimals?: number;
    thousands?: boolean;
    symbol?: string;
}

/**
 * Subtotal values by year
 */
export interface SubtotalValues {
    [year: number]: number;
}

export default class ReportRenderer {
    /**
     * Supported layout item types
     */
    static readonly LAYOUT_TYPES: readonly LayoutType[] = ['variable', 'calculated', 'category', 'subtotal', 'spacer'];

    /**
     * Supported style types
     */
    static readonly STYLE_TYPES: readonly StyleType[] = ['normal', 'metric', 'subtotal', 'total', 'spacer'];

    /**
     * Supported format types
     */
    static readonly FORMAT_TYPES: readonly FormatType[] = ['currency', 'percent', 'integer', 'decimal'];

    private variableResolver: VariableResolver;
    private expressionEvaluator: ExpressionEvaluator;
    private filterEngine: FilterEngine;

    /**
     * Create a new ReportRenderer
     * 
     * @param variableResolver - VariableResolver instance for resolving variables
     * @param expressionEvaluator - ExpressionEvaluator instance for evaluating expressions
     */
    constructor(variableResolver: VariableResolver, expressionEvaluator: ExpressionEvaluator) {
        if (!variableResolver) {
            throw ErrorFactory.missingField('variableResolver', 'ReportRenderer constructor');
        }
        if (!expressionEvaluator) {
            throw ErrorFactory.missingField('expressionEvaluator', 'ReportRenderer constructor');
        }

        this.variableResolver = variableResolver;
        this.expressionEvaluator = expressionEvaluator;
        this.filterEngine = new FilterEngine();
    }

    /**
     * Render statement from report definition
     * 
     * Main entry point for generating statement data. Processes the report definition
     * to produce an array of row objects ready for display in ag-Grid.
     * 
     * @param reportDef - Report definition object
     * @param movementsData - Arquero table containing movements data
     * @param periodOptions - Period selection options
     * @returns Statement data with rows and metadata
     * 
     * @example
     * const statementData = renderer.renderStatement(
     *   {
     *     reportId: 'income_simple',
     *     name: 'Simple Income Statement',
     *     variables: { revenue: {...}, expenses: {...} },
     *     layout: [...],
     *     formatting: {...}
     *   },
     *   movementsData,
     *   { years: [2024, 2025], periods: 'all' }
     * );
     */
    renderStatement(reportDef: ReportDefinition, movementsData: any, periodOptions: PeriodOptions): StatementData {
        if (!reportDef) {
            throw ErrorFactory.missingField('reportDef', 'renderStatement');
        }
        if (!movementsData) {
            throw ErrorFactory.missingField('movementsData', 'renderStatement');
        }
        if (!periodOptions) {
            throw ErrorFactory.missingField('periodOptions', 'renderStatement');
        }

        // Validate report definition structure
        this._validateReportDefinition(reportDef);

        // Resolve all variables
        // Cast to the VariableResolver's Variables type since ReportValidator's FilterSpec
        // is compatible (it's a subset of FilterEngine's FilterSpec with index signature)
        const resolvedVariables = this.variableResolver.resolveVariables(
            reportDef.variables as any || {},
            movementsData,
            periodOptions
        );

        // Build context for expression evaluation
        const context: RenderingContext = {
            variables: resolvedVariables,
            rows: new Map(),
            reportDef,
            periodOptions,
            movementsData
        };

        // Process layout items
        const rows = this.processLayoutItems(reportDef.layout || [], context);

        // Calculate variances for all rows
        const rowsWithVariances = this._calculateVariances(rows, periodOptions);

        // Apply formatting to all rows
        const formattedRows = this._applyFormattingToRows(
            rowsWithVariances,
            reportDef.formatting || {}
        );

        // Return statement data
        return {
            reportId: reportDef.reportId,
            reportName: reportDef.name,
            reportVersion: reportDef.version,
            statementType: reportDef.statementType,
            generatedAt: new Date().toISOString(),
            rows: formattedRows,
            metadata: {
                periodOptions,
                variableCount: Object.keys(reportDef.variables || {}).length,
                layoutItemCount: (reportDef.layout || []).length
            }
        };
    }

    /**
     * Process layout items in order
     * 
     * Sorts layout items by order number and processes each one to generate row data.
     * Maintains context with variable values and previously processed rows for
     * subtotal calculations and order references.
     * 
     * @param layout - Array of layout item objects
     * @param context - Context object with variables, rows, etc.
     * @returns Array of row data objects
     * 
     * @example
     * const rows = renderer.processLayoutItems(
     *   [
     *     { order: 10, type: 'variable', variable: 'revenue', ... },
     *     { order: 20, type: 'calculated', expression: 'revenue * 0.6', ... }
     *   ],
     *   context
     * );
     */
    processLayoutItems(layout: LayoutItem[], context: RenderingContext): RowData[] {
        if (!Array.isArray(layout)) {
            throw ErrorFactory.invalidValue('layout', layout, 'array');
        }

        // Sort layout items by order number
        const sortedLayout = [...layout].sort((a, b) => a.order - b.order);

        const rows: RowData[] = [];

        // Process each layout item
        for (const item of sortedLayout) {
            try {
                const row = this.processLayoutItem(item, context);
                
                // Store row in context for order references and subtotals
                context.rows.set(item.order, row);
                
                rows.push(row);
            } catch (error) {
                // Re-throw custom errors
                if ((error as any).code) {
                    throw error;
                }
                throw ErrorFactory.layoutError(item.order, item.type, error as Error);
            }
        }

        return rows;
    }

    /**
     * Process a single layout item
     * 
     * Determines the layout item type and processes it accordingly:
     * - variable: Retrieves value from resolved variables
     * - calculated: Evaluates expression
     * - category: Applies filter and aggregates
     * - subtotal: Sums range of rows
     * - spacer: Creates empty row
     * 
     * @param item - Layout item object
     * @param context - Context object with variables, rows, etc.
     * @returns Row data object
     * 
     * @example
     * const row = renderer.processLayoutItem(
     *   { order: 10, type: 'variable', variable: 'revenue', label: 'Revenue', ... },
     *   context
     * );
     * // Returns: { order: 10, label: 'Revenue', amount_2024: 100000, amount_2025: 120000, ... }
     */
    processLayoutItem(item: LayoutItem, context: RenderingContext): RowData {
        // Validate layout item
        this._validateLayoutItem(item);

        // Create base row object
        const row: RowData = {
            order: item.order,
            label: item.label || '',
            type: item.type,
            style: item.style || 'normal',
            indent: item.indent || 0,
            format: item.format || 'decimal',
            amount_2024: null,
            amount_2025: null,
            variance_amount: null,
            variance_percent: null,
            _metadata: {}
        };

        // Process based on type
        switch (item.type) {
            case 'variable':
                this._processVariableItem(item, row, context);
                break;

            case 'calculated':
                this._processCalculatedItem(item, row, context);
                break;

            case 'category':
                this._processCategoryItem(item, row, context);
                break;

            case 'subtotal':
                this._processSubtotalItem(item, row, context);
                break;

            case 'spacer':
                // Spacer rows have no values
                break;

            default:
                throw ErrorFactory.invalidValue('type', (item as any).type, 
                    'variable, calculated, category, subtotal, or spacer');
        }

        return row;
    }

    /**
     * Calculate subtotal for a range of rows
     * 
     * Sums all non-spacer, non-subtotal rows with order numbers in the range [from, to].
     * Calculates separately for each year/period.
     * 
     * @param fromOrder - Starting order number (inclusive)
     * @param toOrder - Ending order number (inclusive)
     * @param rows - Map of order numbers to row data
     * @returns Subtotal values by year { 2024: number, 2025: number }
     * 
     * @example
     * const subtotal = renderer.calculateSubtotal(10, 30, context.rows);
     * // Returns: { 2024: 150000, 2025: 180000 }
     */
    calculateSubtotal(fromOrder: number, toOrder: number, rows: Map<number, RowData>): SubtotalValues {
        if (fromOrder > toOrder) {
            throw ErrorFactory.invalidValue('subtotalRange', `${fromOrder}-${toOrder}`, 
                'from <= to');
        }

        const subtotals: SubtotalValues = {
            2024: 0,
            2025: 0
        };

        // Sum all rows in range
        for (let order = fromOrder; order <= toOrder; order++) {
            const row = rows.get(order);
            
            if (!row) {
                continue; // Skip missing orders
            }

            // Skip spacer and subtotal rows to avoid double-counting
            if (row.type === 'spacer' || row.type === 'subtotal') {
                continue;
            }

            // Add to subtotals
            subtotals[2024] += row.amount_2024 || 0;
            subtotals[2025] += row.amount_2025 || 0;
        }

        return subtotals;
    }

    /**
     * Apply formatting to a value
     * 
     * Formats a numeric value according to the format specification.
     * Supports currency, percent, integer, and decimal formats.
     * 
     * @param value - Value to format
     * @param formatSpec - Format type or format specification object
     * @param defaultFormatting - Default formatting rules from report definition
     * @returns Formatted value
     * 
     * @example
     * applyFormatting(100000, 'currency', { currency: { symbol: '€', decimals: 0 } })
     * // Returns: "€ 100,000"
     * 
     * applyFormatting(0.25, 'percent', { percent: { decimals: 1 } })
     * // Returns: "25.0%"
     */
    applyFormatting(value: number | null, formatSpec: FormatSpec, defaultFormatting: FormattingRules = {}): string {
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return '';
        }

        // Determine format type
        let formatType: FormatType = formatSpec as FormatType;
        let formatOptions: FormatOptions = {};

        if (typeof formatSpec === 'object') {
            formatType = formatSpec.type;
            // Extract only the format options, excluding the 'type' field
            const { type, ...options } = formatSpec;
            formatOptions = options as FormatOptions;
        }

        // Get default formatting for this type
        const defaults = defaultFormatting[formatType] || {};

        // Merge options with defaults
        const options: FormatOptions = { ...defaults, ...formatOptions };

        // Apply formatting based on type
        switch (formatType) {
            case 'currency':
                return this._formatCurrency(value, options);

            case 'percent':
                return this._formatPercent(value, options);

            case 'integer':
                return this._formatInteger(value, options);

            case 'decimal':
                return this._formatDecimal(value, options);

            default:
                // Default to decimal with 2 places
                return this._formatDecimal(value, { decimals: 2, thousands: true });
        }
    }

    /**
     * Validate report definition structure
     * 
     * @private
     * @param reportDef - Report definition to validate
     * @throws Error if report definition is invalid
     */
    private _validateReportDefinition(reportDef: ReportDefinition): void {
        const required: (keyof ReportDefinition)[] = ['reportId', 'name', 'version', 'statementType'];
        
        for (const field of required) {
            if (!(field in reportDef)) {
                throw ErrorFactory.missingField(field, `report definition (${reportDef.reportId || 'unknown'})`);
            }
        }

        if (!reportDef.layout || !Array.isArray(reportDef.layout)) {
            throw ErrorFactory.invalidReport(reportDef.reportId || 'unknown', 
                'Report definition must have a layout array');
        }
    }

    /**
     * Validate layout item structure
     * 
     * @private
     * @param item - Layout item to validate
     * @throws Error if layout item is invalid
     */
    private _validateLayoutItem(item: LayoutItem): void {
        if (!item || typeof item !== 'object') {
            throw ErrorFactory.invalidValue('layoutItem', item, 'object');
        }

        if (!('order' in item)) {
            throw ErrorFactory.missingField('order', 'layout item');
        }

        if (!('type' in item)) {
            throw ErrorFactory.missingField('type', 'layout item');
        }

        if (!ReportRenderer.LAYOUT_TYPES.includes(item.type)) {
            throw ErrorFactory.invalidValue('type', item.type, 
                ReportRenderer.LAYOUT_TYPES.join(', '));
        }

        // Type-specific validation
        switch (item.type) {
            case 'variable':
                if (!item.variable) {
                    throw ErrorFactory.missingField('variable', 
                        `variable layout item (order ${item.order})`);
                }
                break;

            case 'calculated':
                if (!item.expression) {
                    throw ErrorFactory.missingField('expression', 
                        `calculated layout item (order ${item.order})`);
                }
                break;

            case 'category':
                if (!item.filter) {
                    throw ErrorFactory.missingField('filter', 
                        `category layout item (order ${item.order})`);
                }
                break;

            case 'subtotal':
                if (!('from' in item) || !('to' in item)) {
                    throw ErrorFactory.missingField('from/to', 
                        `subtotal layout item (order ${(item as any).order})`);
                }
                break;
        }
    }

    /**
     * Process variable layout item
     * 
     * @private
     * @param item - Layout item
     * @param row - Row object to populate
     * @param context - Context object
     */
    private _processVariableItem(item: any, row: RowData, context: RenderingContext): void {
        const variableValue = context.variables.get(item.variable);
        
        if (!variableValue) {
            throw ErrorFactory.variableNotFound(item.variable, 
                context.reportDef?.reportId || 'unknown');
        }

        // Set amounts from variable
        row.amount_2024 = variableValue[2024] || 0;
        row.amount_2025 = variableValue[2025] || 0;

        // Store metadata
        row._metadata.variable = item.variable;
    }

    /**
     * Process calculated layout item
     * 
     * @private
     * @param item - Layout item
     * @param row - Row object to populate
     * @param context - Context object
     */
    private _processCalculatedItem(item: any, row: RowData, context: RenderingContext): void {
        // Build evaluation context with variables and order references
        const evalContext = this._buildEvaluationContext(context, 2024);
        const evalContext2025 = this._buildEvaluationContext(context, 2025);

        // Evaluate expression for each year
        try {
            row.amount_2024 = this.expressionEvaluator.evaluate(item.expression, evalContext);
            row.amount_2025 = this.expressionEvaluator.evaluate(item.expression, evalContext2025);
        } catch (error) {
            // Re-throw custom errors
            if ((error as any).code) {
                throw error;
            }
            throw ErrorFactory.expressionError(item.expression, error as Error);
        }

        // Store metadata
        row._metadata.expression = item.expression;
    }

    /**
     * Process category layout item
     * 
     * @private
     * @param item - Layout item
     * @param row - Row object to populate
     * @param context - Context object
     */
    private _processCategoryItem(item: any, row: RowData, context: RenderingContext): void {
        // Apply filter to movements data
        const filteredData = this.filterEngine.applyFilter(
            context.movementsData,
            item.filter
        );

        // Aggregate by year
        const amounts = this._aggregateByYear(filteredData);

        row.amount_2024 = amounts[2024] || 0;
        row.amount_2025 = amounts[2025] || 0;

        // Store metadata
        row._metadata.filter = item.filter;
    }

    /**
     * Process subtotal layout item
     * 
     * @private
     * @param item - Layout item
     * @param row - Row object to populate
     * @param context - Context object
     */
    private _processSubtotalItem(item: any, row: RowData, context: RenderingContext): void {
        const subtotals = this.calculateSubtotal(item.from, item.to, context.rows);

        row.amount_2024 = subtotals[2024];
        row.amount_2025 = subtotals[2025];

        // Store metadata
        row._metadata.calculatedFrom = [item.from, item.to];
    }

    /**
     * Build evaluation context for expression evaluator
     * 
     * @private
     * @param context - Rendering context
     * @param year - Year to build context for
     * @returns Evaluation context
     */
    private _buildEvaluationContext(context: RenderingContext, year: number): Record<string, number> {
        const evalContext: Record<string, number> = {};

        // Add variables
        for (const [varName, varValue] of context.variables.entries()) {
            evalContext[varName] = varValue[year] || 0;
        }

        // Add order references
        for (const [order, row] of context.rows.entries()) {
            evalContext[`@${order}`] = row[`amount_${year}` as keyof RowData] as number || 0;
        }

        return evalContext;
    }

    /**
     * Aggregate filtered data by year
     * 
     * @private
     * @param filteredData - Arquero table
     * @returns Amounts by year { 2024: number, 2025: number }
     */
    private _aggregateByYear(filteredData: any): SubtotalValues {
        const amounts: SubtotalValues = {};

        // Get unique years
        const years = filteredData.array('year').filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

        for (const year of years) {
            const yearData = filteredData.filter(`d => d.year === ${year}`);
            const amountArray = yearData.array('movement_amount');
            amounts[year] = amountArray.reduce((sum: number, val: number) => sum + (val || 0), 0);
        }

        return amounts;
    }

    /**
     * Calculate variances for all rows
     * 
     * @private
     * @param rows - Array of row objects
     * @param periodOptions - Period options
     * @returns Rows with variance calculations
     */
    private _calculateVariances(rows: RowData[], periodOptions: PeriodOptions): RowData[] {
        return rows.map(row => {
            if (row.type === 'spacer') {
                return row;
            }

            const amount2024 = row.amount_2024 || 0;
            const amount2025 = row.amount_2025 || 0;

            row.variance_amount = amount2025 - amount2024;
            row.variance_percent = amount2024 !== 0 
                ? ((amount2025 - amount2024) / Math.abs(amount2024)) * 100 
                : 0;

            return row;
        });
    }

    /**
     * Apply formatting to all rows
     * 
     * @private
     * @param rows - Array of row objects
     * @param defaultFormatting - Default formatting rules
     * @returns Rows with formatted values
     */
    private _applyFormattingToRows(rows: RowData[], defaultFormatting: FormattingRules): RowData[] {
        return rows.map(row => {
            // Determine format for this row
            const format = row.format || 'decimal';

            // Format all numeric columns
            row.formatted_2024 = this.applyFormatting(row.amount_2024, format, defaultFormatting);
            row.formatted_2025 = this.applyFormatting(row.amount_2025, format, defaultFormatting);
            row.formatted_variance_amount = this.applyFormatting(
                row.variance_amount, 
                format, 
                defaultFormatting
            );
            row.formatted_variance_percent = this.applyFormatting(
                row.variance_percent, 
                'percent', 
                defaultFormatting
            );

            return row;
        });
    }

    /**
     * Format currency value
     * 
     * @private
     * @param value - Value to format
     * @param options - Format options
     * @returns Formatted value
     */
    private _formatCurrency(value: number, options: FormatOptions = {}): string {
        const decimals = options.decimals !== undefined ? options.decimals : 0;
        const thousands = options.thousands !== undefined ? options.thousands : true;
        const symbol = options.symbol || '€';

        const formatted = this._formatNumber(value, decimals, thousands);
        return `${symbol} ${formatted}`;
    }

    /**
     * Format percent value
     * 
     * @private
     * @param value - Value to format (as decimal, e.g., 0.25 for 25%)
     * @param options - Format options
     * @returns Formatted value
     */
    private _formatPercent(value: number, options: FormatOptions = {}): string {
        const decimals = options.decimals !== undefined ? options.decimals : 1;
        const symbol = options.symbol || '%';

        // Note: Value is already a percentage (e.g., 25 for 25%)
        // Don't multiply by 100 again
        const formatted = this._formatNumber(value, decimals, false);
        return `${formatted}${symbol}`;
    }

    /**
     * Format integer value
     * 
     * @private
     * @param value - Value to format
     * @param options - Format options
     * @returns Formatted value
     */
    private _formatInteger(value: number, options: FormatOptions = {}): string {
        const thousands = options.thousands !== undefined ? options.thousands : true;
        return this._formatNumber(value, 0, thousands);
    }

    /**
     * Format decimal value
     * 
     * @private
     * @param value - Value to format
     * @param options - Format options
     * @returns Formatted value
     */
    private _formatDecimal(value: number, options: FormatOptions = {}): string {
        const decimals = options.decimals !== undefined ? options.decimals : 2;
        const thousands = options.thousands !== undefined ? options.thousands : true;
        return this._formatNumber(value, decimals, thousands);
    }

    /**
     * Format number with decimals and thousands separator
     * 
     * @private
     * @param value - Value to format
     * @param decimals - Number of decimal places
     * @param thousands - Whether to include thousands separator
     * @returns Formatted value
     */
    private _formatNumber(value: number, decimals: number, thousands: boolean): string {
        // Handle negative values
        const isNegative = value < 0;
        const absValue = Math.abs(value);

        // Round to specified decimals
        const rounded = absValue.toFixed(decimals);

        // Split into integer and decimal parts
        const [intPart, decPart] = rounded.split('.');

        // Add thousands separator if requested
        let formatted = intPart;
        if (thousands) {
            formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        // Add decimal part if present
        if (decPart) {
            formatted += '.' + decPart;
        }

        // Add negative sign if needed
        if (isNegative) {
            formatted = '-' + formatted;
        }

        return formatted;
    }
}
