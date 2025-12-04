/**
 * Unit Tests for ReportRenderer
 * 
 * Tests the ReportRenderer component which generates statement data from report definitions.
 * Validates: Requirements 3.1-3.15, 5.1-5.14, 6.1-6.10
 */

import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ReportRenderer from '../../../src/reports/ReportRenderer.js';
import VariableResolver from '../../../src/reports/VariableResolver.js';
import ExpressionEvaluator from '../../../src/reports/ExpressionEvaluator.js';
import FilterEngine from '../../../src/reports/FilterEngine.js';

// Mock Arquero for testing
const mockAq = {
    table: (data: any) => {
        const keys = Object.keys(data);
        const length = keys.length > 0 ? data[keys[0]].length : 0;
        const rows: any[] = [];
        
        for (let i = 0; i < length; i++) {
            const row: any = {};
            for (const key of keys) {
                row[key] = data[key][i];
            }
            rows.push(row);
        }
        
        return {
            _data: rows,
            filter: function(expr: string | Function) {
                const filterFn = typeof expr === 'string' 
                    ? new Function('d', `return ${expr.replace('d => ', '')}`)
                    : expr;
                const filtered = this._data.filter(filterFn);
                return mockAq.from(filtered);
            },
            numRows: function() {
                return this._data.length;
            },
            array: function(column: string) {
                return this._data.map((row: any) => row[column]);
            }
        };
    },
    from: (data: any[]) => {
        return {
            _data: data,
            filter: function(expr: string | Function) {
                const filterFn = typeof expr === 'string' 
                    ? new Function('d', `return ${expr.replace('d => ', '')}`)
                    : expr;
                const filtered = this._data.filter(filterFn);
                return mockAq.from(filtered);
            },
            numRows: function() {
                return this._data.length;
            },
            array: function(column: string) {
                return this._data.map((row: any) => row[column]);
            }
        };
    }
};

describe('ReportRenderer', () => {
    let renderer: any;
    let variableResolver: any;
    let expressionEvaluator: any;
    let filterEngine: any;

    beforeEach(() => {
        filterEngine = new FilterEngine();
        variableResolver = new VariableResolver(filterEngine);
        expressionEvaluator = new ExpressionEvaluator();
        renderer = new ReportRenderer(variableResolver, expressionEvaluator);
    });

    describe('constructor', () => {
        it('should create a ReportRenderer instance', () => {
            assertEquals(typeof renderer, 'object');
            assertEquals(renderer.variableResolver, variableResolver);
            assertEquals(renderer.expressionEvaluator, expressionEvaluator);
        });

        it('should throw error if VariableResolver is missing', () => {
            assertThrows(
                () => new ReportRenderer(null as any, expressionEvaluator),
                Error,
                'VariableResolver is required'
            );
        });

        it('should throw error if ExpressionEvaluator is missing', () => {
            assertThrows(
                () => new ReportRenderer(variableResolver, null as any),
                Error,
                'ExpressionEvaluator is required'
            );
        });
    });

    describe('renderStatement', () => {
        it('should render a simple statement with variable items', () => {
            const reportDef = {
                reportId: 'test_report',
                name: 'Test Report',
                version: '1.0.0',
                statementType: 'income',
                variables: {
                    revenue: {
                        filter: { code1: '700' },
                        aggregate: 'sum'
                    }
                },
                layout: [
                    {
                        order: 10,
                        label: 'Revenue',
                        type: 'variable',
                        variable: 'revenue',
                        format: 'currency'
                    }
                ]
            };

            const movementsData = mockAq.table({
                code1: ['700', '700'],
                year: [2024, 2025],
                amount: [100000, 120000]
            });

            const periodOptions = {
                years: [2024, 2025]
            };

            const result = renderer.renderStatement(reportDef, movementsData, periodOptions);

            assertEquals(typeof result, 'object');
            assertEquals(result.reportId, 'test_report');
            assertEquals(result.rows.length, 1);
            assertEquals(result.rows[0].label, 'Revenue');
            assertEquals(result.rows[0].amount_2024, 100000);
            assertEquals(result.rows[0].amount_2025, 120000);
        });

        it('should throw error if report definition is missing', () => {
            assertThrows(
                () => renderer.renderStatement(null, {}, {}),
                Error,
                'Report definition is required'
            );
        });

        it('should throw error if movements data is missing', () => {
            const reportDef = { reportId: 'test', name: 'Test', version: '1.0.0', statementType: 'income', layout: [] };
            assertThrows(
                () => renderer.renderStatement(reportDef, null, {}),
                Error,
                'Movements data is required'
            );
        });

        it('should throw error if period options are missing', () => {
            const reportDef = { reportId: 'test', name: 'Test', version: '1.0.0', statementType: 'income', layout: [] };
            const movementsData = mockAq.table({ code1: [], year: [], amount: [] });
            assertThrows(
                () => renderer.renderStatement(reportDef, movementsData, null),
                Error,
                'Period options are required'
            );
        });
    });

    describe('processLayoutItems', () => {
        it('should sort layout items by order number', () => {
            const layout = [
                { order: 30, type: 'spacer' },
                { order: 10, type: 'spacer' },
                { order: 20, type: 'spacer' }
            ];

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const rows = renderer.processLayoutItems(layout, context);

            assertEquals(rows.length, 3);
            assertEquals(rows[0].order, 10);
            assertEquals(rows[1].order, 20);
            assertEquals(rows[2].order, 30);
        });

        it('should throw error if layout is not an array', () => {
            assertThrows(
                () => renderer.processLayoutItems(null as any, {}),
                Error,
                'Layout must be an array'
            );
        });
    });

    describe('processLayoutItem', () => {
        it('should process spacer items', () => {
            const item = {
                order: 10,
                type: 'spacer'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(typeof row, 'object');
            assertEquals(row.type, 'spacer');
            assertEquals(row.amount_2024, null);
            assertEquals(row.amount_2025, null);
        });

        it('should throw error if item is missing order field', () => {
            const item = { type: 'spacer' };
            const context = { variables: new Map(), rows: new Map(), reportDef: {}, periodOptions: {}, movementsData: {} };
            assertThrows(
                () => renderer.processLayoutItem(item as any, context as any),
                Error,
                'Layout item must have an order number'
            );
        });

        it('should throw error if item is missing type field', () => {
            const item = { order: 10 };
            const context = { variables: new Map(), rows: new Map(), reportDef: {}, periodOptions: {}, movementsData: {} };
            assertThrows(
                () => renderer.processLayoutItem(item as any, context as any),
                Error,
                'Layout item must have a type'
            );
        });
    });

    describe('calculateSubtotal', () => {
        it('should sum values in range for both years', () => {
            const rows = new Map([
                [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                [20, { order: 20, type: 'variable', amount_2024: 200, amount_2025: 250 }],
                [30, { order: 30, type: 'variable', amount_2024: 300, amount_2025: 350 }]
            ]);

            const subtotal = renderer.calculateSubtotal(10, 30, rows);
            assertEquals(subtotal[2024], 600);
            assertEquals(subtotal[2025], 750);
        });

        it('should exclude spacer items from subtotal', () => {
            const rows = new Map([
                [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                [20, { order: 20, type: 'spacer', amount_2024: 999, amount_2025: 999 }],
                [30, { order: 30, type: 'variable', amount_2024: 300, amount_2025: 350 }]
            ]);

            const subtotal = renderer.calculateSubtotal(10, 30, rows);
            assertEquals(subtotal[2024], 400);
            assertEquals(subtotal[2025], 500);
        });

        it('should exclude subtotal items from subtotal', () => {
            const rows = new Map([
                [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                [20, { order: 20, type: 'subtotal', amount_2024: 999, amount_2025: 999 }],
                [30, { order: 30, type: 'variable', amount_2024: 300, amount_2025: 350 }]
            ]);

            const subtotal = renderer.calculateSubtotal(10, 30, rows);
            assertEquals(subtotal[2024], 400);
            assertEquals(subtotal[2025], 500);
        });

        it('should handle missing orders gracefully', () => {
            const rows = new Map([
                [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                [30, { order: 30, type: 'variable', amount_2024: 300, amount_2025: 350 }]
            ]);

            const subtotal = renderer.calculateSubtotal(10, 30, rows);
            assertEquals(subtotal[2024], 400);
            assertEquals(subtotal[2025], 500);
        });

        it('should handle null amounts as zero', () => {
            const rows = new Map([
                [10, { order: 10, type: 'variable', amount_2024: null, amount_2025: null }],
                [20, { order: 20, type: 'variable', amount_2024: 200, amount_2025: 250 }]
            ]);

            const subtotal = renderer.calculateSubtotal(10, 20, rows);
            assertEquals(subtotal[2024], 200);
            assertEquals(subtotal[2025], 250);
        });

        it('should throw error if from > to', () => {
            const rows = new Map();
            assertThrows(
                () => renderer.calculateSubtotal(30, 10, rows),
                Error,
                'Invalid subtotal range'
            );
        });
    });

    describe('applyFormatting', () => {
        it('should format currency values', () => {
            const formatted = renderer.applyFormatting(1234.56, 'currency', {
                currency: { decimals: 0, thousands: true, symbol: '€' }
            });
            assertEquals(formatted, '€ 1,235');
        });

        it('should format percentage values', () => {
            const formatted = renderer.applyFormatting(12.34, 'percent', {
                percent: { decimals: 1, symbol: '%' }
            });
            assertEquals(formatted, '12.3%');
        });

        it('should format integer values', () => {
            const formatted = renderer.applyFormatting(1234.56, 'integer', {
                integer: { thousands: true }
            });
            assertEquals(formatted, '1,235');
        });

        it('should format decimal values', () => {
            const formatted = renderer.applyFormatting(1234.567, 'decimal', {
                decimal: { decimals: 2, thousands: true }
            });
            assertEquals(formatted, '1,234.57');
        });

        it('should return empty string for null values', () => {
            const formatted = renderer.applyFormatting(null, 'currency', {});
            assertEquals(formatted, '');
        });

        it('should return empty string for undefined values', () => {
            const formatted = renderer.applyFormatting(undefined, 'currency', {});
            assertEquals(formatted, '');
        });

        it('should handle negative currency values', () => {
            const formatted = renderer.applyFormatting(-1234.56, 'currency', {
                currency: { decimals: 2, thousands: true, symbol: '€' }
            });
            assertEquals(formatted, '€ -1,234.56');
        });

        it('should handle currency without thousands separator', () => {
            const formatted = renderer.applyFormatting(1234.56, 'currency', {
                currency: { decimals: 2, thousands: false, symbol: '$' }
            });
            assertEquals(formatted, '$ 1234.56');
        });
    });

    describe('rendering variable layout items', () => {
        it('should render variable layout item with resolved values', () => {
            const item = {
                order: 10,
                label: 'Revenue',
                type: 'variable',
                variable: 'revenue',
                format: 'currency'
            };

            const context = {
                variables: new Map([
                    ['revenue', { 2024: 100000, 2025: 120000 }]
                ]),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.type, 'variable');
            assertEquals(row.label, 'Revenue');
            assertEquals(row.amount_2024, 100000);
            assertEquals(row.amount_2025, 120000);
            assertEquals(row._metadata.variable, 'revenue');
        });

        it('should throw error if variable not found', () => {
            const item = {
                order: 10,
                type: 'variable',
                variable: 'nonexistent'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Variable not found: nonexistent'
            );
        });
    });

    describe('rendering calculated layout items', () => {
        it('should render calculated layout item with expression', () => {
            const item = {
                order: 10,
                label: 'Gross Profit',
                type: 'calculated',
                expression: 'revenue + cogs',
                format: 'currency'
            };

            const context = {
                variables: new Map([
                    ['revenue', { 2024: 100000, 2025: 120000 }],
                    ['cogs', { 2024: -60000, 2025: -70000 }]
                ]),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.type, 'calculated');
            assertEquals(row.label, 'Gross Profit');
            assertEquals(row.amount_2024, 40000);
            assertEquals(row.amount_2025, 50000);
            assertEquals(row._metadata.expression, 'revenue + cogs');
        });

        it('should support order references in expressions', () => {
            const item = {
                order: 30,
                label: 'Total',
                type: 'calculated',
                expression: '@10 + @20',
                format: 'currency'
            };

            const context = {
                variables: new Map(),
                rows: new Map([
                    [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                    [20, { order: 20, type: 'variable', amount_2024: 200, amount_2025: 250 }]
                ]),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.amount_2024, 300);
            assertEquals(row.amount_2025, 400);
        });

        it('should throw error for invalid expression', () => {
            const item = {
                order: 10,
                type: 'calculated',
                expression: 'invalid syntax +'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Failed to evaluate expression'
            );
        });
    });

    describe('rendering category layout items', () => {
        it('should render category layout item with filter', () => {
            const item = {
                order: 10,
                label: 'Operating Expenses',
                type: 'category',
                filter: { code1: '520' },
                format: 'currency'
            };

            const movementsData = mockAq.table({
                code1: ['520', '520', '710'],
                year: [2024, 2025, 2024],
                amount: [50000, 60000, 10000]
            });

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.type, 'category');
            assertEquals(row.label, 'Operating Expenses');
            assertEquals(row.amount_2024, 50000);
            assertEquals(row.amount_2025, 60000);
            assertEquals(row._metadata.filter, item.filter);
        });

        it('should handle empty filter results', () => {
            const item = {
                order: 10,
                type: 'category',
                filter: { code1: '999' }
            };

            const movementsData = mockAq.table({
                code1: ['520', '710'],
                year: [2024, 2025],
                amount: [50000, 60000]
            });

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.amount_2024, 0);
            assertEquals(row.amount_2025, 0);
        });
    });

    describe('rendering subtotal layout items', () => {
        it('should render subtotal layout item', () => {
            const item = {
                order: 40,
                label: 'Total Operating Expenses',
                type: 'subtotal',
                from: 10,
                to: 30,
                format: 'currency',
                style: 'subtotal'
            };

            const context = {
                variables: new Map(),
                rows: new Map([
                    [10, { order: 10, type: 'variable', amount_2024: 100, amount_2025: 150 }],
                    [20, { order: 20, type: 'variable', amount_2024: 200, amount_2025: 250 }],
                    [30, { order: 30, type: 'variable', amount_2024: 300, amount_2025: 350 }]
                ]),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.type, 'subtotal');
            assertEquals(row.label, 'Total Operating Expenses');
            assertEquals(row.amount_2024, 600);
            assertEquals(row.amount_2025, 750);
            assertEquals(row.style, 'subtotal');
            assertEquals(row._metadata.calculatedFrom, [10, 30]);
        });
    });

    describe('rendering spacer layout items', () => {
        it('should render spacer with null values', () => {
            const item = {
                order: 15,
                type: 'spacer'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.type, 'spacer');
            assertEquals(row.amount_2024, null);
            assertEquals(row.amount_2025, null);
            assertEquals(row.label, '');
        });
    });

    describe('variance calculations', () => {
        it('should calculate variance amount and percent', () => {
            const rows = [
                {
                    order: 10,
                    type: 'variable',
                    amount_2024: 100,
                    amount_2025: 120
                }
            ];

            const result = renderer._calculateVariances(rows, { years: [2024, 2025] });

            assertEquals(result[0].variance_amount, 20);
            assertEquals(result[0].variance_percent, 20);
        });

        it('should handle negative base values correctly', () => {
            const rows = [
                {
                    order: 10,
                    type: 'variable',
                    amount_2024: -100,
                    amount_2025: -80
                }
            ];

            const result = renderer._calculateVariances(rows, { years: [2024, 2025] });

            assertEquals(result[0].variance_amount, 20);
            assertEquals(result[0].variance_percent, 20);
        });

        it('should handle zero base values', () => {
            const rows = [
                {
                    order: 10,
                    type: 'variable',
                    amount_2024: 0,
                    amount_2025: 100
                }
            ];

            const result = renderer._calculateVariances(rows, { years: [2024, 2025] });

            assertEquals(result[0].variance_amount, 100);
            assertEquals(result[0].variance_percent, 0);
        });

        it('should skip variance calculation for spacer rows', () => {
            const rows = [
                {
                    order: 10,
                    type: 'spacer',
                    amount_2024: null,
                    amount_2025: null
                }
            ];

            const result = renderer._calculateVariances(rows, { years: [2024, 2025] });

            // Spacer rows are returned as-is, so variance fields remain undefined
            assertEquals(result[0].variance_amount, undefined);
            assertEquals(result[0].variance_percent, undefined);
        });
    });

    describe('indent levels', () => {
        it('should apply indent level to row', () => {
            const item = {
                order: 10,
                type: 'spacer',
                indent: 2
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.indent, 2);
        });

        it('should default indent to 0 if not specified', () => {
            const item = {
                order: 10,
                type: 'spacer'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.indent, 0);
        });
    });

    describe('style attributes', () => {
        it('should apply style attribute to row', () => {
            const item = {
                order: 10,
                type: 'spacer',
                style: 'total'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.style, 'total');
        });

        it('should default style to normal if not specified', () => {
            const item = {
                order: 10,
                type: 'spacer'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            const row = renderer.processLayoutItem(item, context);

            assertEquals(row.style, 'normal');
        });

        it('should support all style types', () => {
            const styles = ['normal', 'metric', 'subtotal', 'total', 'spacer'];

            for (const style of styles) {
                const item = {
                    order: 10,
                    type: 'spacer',
                    style
                };

                const context = {
                    variables: new Map(),
                    rows: new Map(),
                    reportDef: { formatting: {} },
                    periodOptions: { years: [2024, 2025] },
                    movementsData: mockAq.table({ code1: [], year: [], amount: [] })
                };

                const row = renderer.processLayoutItem(item, context);

                assertEquals(row.style, style);
            }
        });
    });

    describe('validation', () => {
        it('should validate required fields in report definition', () => {
            const invalidReportDef = {
                name: 'Test',
                layout: []
            };

            const movementsData = mockAq.table({ code1: [], year: [], amount: [] });
            const periodOptions = { years: [2024, 2025] };

            assertThrows(
                () => renderer.renderStatement(invalidReportDef, movementsData, periodOptions),
                Error,
                'Missing required field'
            );
        });

        it('should validate layout is an array', () => {
            const invalidReportDef = {
                reportId: 'test',
                name: 'Test',
                version: '1.0.0',
                statementType: 'income',
                layout: 'not an array'
            };

            const movementsData = mockAq.table({ code1: [], year: [], amount: [] });
            const periodOptions = { years: [2024, 2025] };

            assertThrows(
                () => renderer.renderStatement(invalidReportDef, movementsData, periodOptions),
                Error,
                'layout array'
            );
        });

        it('should validate layout item type', () => {
            const item = {
                order: 10,
                type: 'invalid_type'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Invalid layout item type'
            );
        });

        it('should validate variable layout item has variable reference', () => {
            const item = {
                order: 10,
                type: 'variable'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Variable layout item must have a variable reference'
            );
        });

        it('should validate calculated layout item has expression', () => {
            const item = {
                order: 10,
                type: 'calculated'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Calculated layout item must have an expression'
            );
        });

        it('should validate category layout item has filter', () => {
            const item = {
                order: 10,
                type: 'category'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Category layout item must have a filter'
            );
        });

        it('should validate subtotal layout item has from and to', () => {
            const item = {
                order: 10,
                type: 'subtotal'
            };

            const context = {
                variables: new Map(),
                rows: new Map(),
                reportDef: { formatting: {} },
                periodOptions: { years: [2024, 2025] },
                movementsData: mockAq.table({ code1: [], year: [], amount: [] })
            };

            assertThrows(
                () => renderer.processLayoutItem(item, context),
                Error,
                'Subtotal layout item must have from and to order numbers'
            );
        });
    });
});
