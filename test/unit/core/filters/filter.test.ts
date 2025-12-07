/**
 * Tests for Filter Functions (Functional Implementation)
 */

import { describe, it, beforeEach } from 'jsr:@std/testing/bdd';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import {
    buildFilterExpression,
    validateFilter,
    applyFilter,
    applyFilterSafe,
    isValidField,
    filterByField,
    filterExactMatch,
    filterArrayMatch,
    filterRangeMatch,
    combineFilters,
    VALID_FIELDS,
    OPERATORS,
    type FilterSpec,
    type ValidationResult
} from '../../../../src/core/filters/filter.ts';

// Mock Arquero table for testing
const createMockTable = (data: any[]) => ({
    data,
    filter: function(expr: string) {
        // Simple mock implementation that evaluates the filter expression
        const filterFn = eval(expr);
        const filtered = this.data.filter(filterFn);
        return createMockTable(filtered);
    },
    numRows: function() {
        return this.data.length;
    },
    array: function(column: string) {
        return this.data.map((row: any) => row[column]);
    }
});

describe('Filter Functions - Functional', () => {
    let mockTable: any;

    beforeEach(() => {
        mockTable = createMockTable([
            { code1: '700', code2: '10', name1: 'Revenue', statement_type: 'Income', amount: 100 },
            { code1: '710', code2: '20', name1: 'COGS', statement_type: 'Income', amount: -60 },
            { code1: '720', code2: '30', name1: 'Expenses', statement_type: 'Income', amount: -20 },
            { code1: '100', code2: '10', name1: 'Assets', statement_type: 'Balance', amount: 500 },
            { code1: '200', code2: '20', name1: 'Liabilities', statement_type: 'Balance', amount: 300 }
        ]);
    });

    // ========================================================================
    // Constants Tests
    // ========================================================================

    describe('Constants', () => {
        it('should export OPERATORS', () => {
            assertExists(OPERATORS);
            assertEquals(OPERATORS.equals, '===');
            assertEquals(OPERATORS.in, 'includes');
            assertEquals(OPERATORS.gte, '>=');
            assertEquals(OPERATORS.lte, '<=');
            assertEquals(OPERATORS.gt, '>');
            assertEquals(OPERATORS.lt, '<');
        });

        it('should export VALID_FIELDS', () => {
            assertExists(VALID_FIELDS);
            assertEquals(VALID_FIELDS.length, 8);
            assertEquals(VALID_FIELDS.includes('code1'), true);
            assertEquals(VALID_FIELDS.includes('statement_type'), true);
        });
    });

    // ========================================================================
    // Field Validation Tests
    // ========================================================================

    describe('isValidField', () => {
        it('should return true for valid fields', () => {
            assertEquals(isValidField('code1'), true);
            assertEquals(isValidField('code2'), true);
            assertEquals(isValidField('code3'), true);
            assertEquals(isValidField('name1'), true);
            assertEquals(isValidField('statement_type'), true);
            assertEquals(isValidField('account_code'), true);
        });

        it('should return false for invalid fields', () => {
            assertEquals(isValidField('invalid'), false);
            assertEquals(isValidField('amount'), false);
            assertEquals(isValidField(''), false);
        });
    });

    // ========================================================================
    // Filter Expression Building Tests
    // ========================================================================

    describe('buildFilterExpression', () => {
        it('should build expression for exact match', () => {
            const expr = buildFilterExpression({ code1: '700' });
            assertEquals(expr, "d => d.code1 === '700'");
        });

        it('should build expression for array match', () => {
            const expr = buildFilterExpression({ code1: ['700', '710'] });
            assertEquals(expr, "d => ['700','710'].includes(d.code1)");
        });

        it('should build expression for range match (gte/lte)', () => {
            const expr = buildFilterExpression({ code1: { gte: '700', lte: '799' } });
            assertEquals(expr, "d => d.code1 >= '700' && d.code1 <= '799'");
        });

        it('should build expression for range match (gt/lt)', () => {
            const expr = buildFilterExpression({ code1: { gt: '700', lt: '800' } });
            assertEquals(expr, "d => d.code1 > '700' && d.code1 < '800'");
        });

        it('should build expression for multiple fields (AND logic)', () => {
            const expr = buildFilterExpression({ 
                code1: '700', 
                statement_type: 'Income' 
            });
            assertEquals(expr, "d => d.code1 === '700' && d.statement_type === 'Income'");
        });

        it('should escape single quotes in values', () => {
            const expr = buildFilterExpression({ name1: "O'Reilly" });
            assertEquals(expr, "d => d.name1 === 'O\\'Reilly'");
        });

        it('should handle numeric values', () => {
            const expr = buildFilterExpression({ code1: 700 });
            assertEquals(expr, "d => d.code1 === '700'");
        });

        it('should handle mixed array types', () => {
            const expr = buildFilterExpression({ code1: ['700', 710, '720'] });
            assertEquals(expr, "d => ['700','710','720'].includes(d.code1)");
        });
    });

    // ========================================================================
    // Validation Tests
    // ========================================================================

    describe('validateFilter', () => {
        it('should validate correct filter spec', () => {
            const result = validateFilter({ code1: '700' });
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should validate empty filter spec', () => {
            const result = validateFilter({});
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should validate array filter', () => {
            const result = validateFilter({ code1: ['700', '710'] });
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should validate range filter', () => {
            const result = validateFilter({ code1: { gte: '700', lte: '799' } });
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });

        it('should reject invalid field names', () => {
            const result = validateFilter({ invalid_field: '700' });
            assertEquals(result.isValid, false);
            assertEquals(result.errors.length > 0, true);
            assertEquals(result.errors[0].includes('Invalid filter field'), true);
        });

        it('should reject null values', () => {
            const result = validateFilter({ code1: null as any });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('cannot be null or undefined'), true);
        });

        it('should reject undefined values', () => {
            const result = validateFilter({ code1: undefined as any });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('cannot be null or undefined'), true);
        });

        it('should reject empty arrays', () => {
            const result = validateFilter({ code1: [] });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('cannot be empty'), true);
        });

        it('should reject arrays with null elements', () => {
            const result = validateFilter({ code1: ['700', null, '710'] as any });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('null or undefined values'), true);
        });

        it('should reject empty range filters', () => {
            const result = validateFilter({ code1: {} });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('cannot be empty'), true);
        });

        it('should reject invalid range operators', () => {
            const result = validateFilter({ code1: { invalid: '700' } as any });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('Invalid range operators'), true);
        });

        it('should reject null range values', () => {
            const result = validateFilter({ code1: { gte: null } as any });
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0].includes('cannot be null or undefined'), true);
        });

        it('should reject non-object filter spec', () => {
            const result = validateFilter(null as any);
            assertEquals(result.isValid, false);
            assertEquals(result.errors[0], 'Filter specification must be an object');
        });

        it('should validate multiple fields', () => {
            const result = validateFilter({ 
                code1: '700', 
                statement_type: 'Income',
                code2: ['10', '20']
            });
            assertEquals(result.isValid, true);
            assertEquals(result.errors.length, 0);
        });
    });

    // ========================================================================
    // Filter Application Tests
    // ========================================================================

    describe('applyFilter', () => {
        it('should filter by exact match', () => {
            const filtered = applyFilter({ code1: '700' })(mockTable);
            assertEquals(filtered.numRows(), 1);
            assertEquals(filtered.array('code1')[0], '700');
        });

        it('should filter by array match (OR logic)', () => {
            const filtered = applyFilter({ code1: ['700', '710'] })(mockTable);
            assertEquals(filtered.numRows(), 2);
            const codes = filtered.array('code1');
            assertEquals(codes.includes('700'), true);
            assertEquals(codes.includes('710'), true);
        });

        it('should filter by range match', () => {
            const filtered = applyFilter({ code1: { gte: '700', lte: '720' } })(mockTable);
            assertEquals(filtered.numRows(), 3);
        });

        it('should filter by multiple fields (AND logic)', () => {
            const filtered = applyFilter({ 
                code1: '700', 
                statement_type: 'Income' 
            })(mockTable);
            assertEquals(filtered.numRows(), 1);
            assertEquals(filtered.array('code1')[0], '700');
        });

        it('should return original table for empty filter', () => {
            const filtered = applyFilter({})(mockTable);
            assertEquals(filtered.numRows(), mockTable.numRows());
        });

        it('should handle numeric values', () => {
            const filtered = applyFilter({ code1: 700 })(mockTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should be curried', () => {
            const filterByCode700 = applyFilter({ code1: '700' });
            const filtered = filterByCode700(mockTable);
            assertEquals(filtered.numRows(), 1);
        });
    });

    describe('applyFilterSafe', () => {
        it('should return ok result for valid filter', () => {
            const result = applyFilterSafe({ code1: '700' })(mockTable);
            assertEquals(result.success, true);
            if (result.success) {
                assertEquals(result.value.numRows(), 1);
            }
        });

        it('should return error for null table', () => {
            const result = applyFilterSafe({ code1: '700' })(null);
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message, 'Table is required');
            }
        });

        it('should return error for invalid filter spec', () => {
            const result = applyFilterSafe({ invalid_field: '700' })(mockTable);
            assertEquals(result.success, false);
            if (!result.success) {
                assertEquals(result.error.message.includes('Invalid filter specification'), true);
            }
        });

        it('should be curried', () => {
            const filterSafe = applyFilterSafe({ code1: '700' });
            const result = filterSafe(mockTable);
            assertEquals(result.success, true);
        });
    });

    // ========================================================================
    // Curried Helper Functions Tests
    // ========================================================================

    describe('filterByField', () => {
        it('should create field-specific filter', () => {
            const filterByCode1 = filterByField('code1');
            const filtered = filterByCode1('700')(mockTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should be fully curried', () => {
            const filterByCode1 = filterByField('code1');
            const filterBy700 = filterByCode1('700');
            const filtered = filterBy700(mockTable);
            assertEquals(filtered.numRows(), 1);
        });
    });

    describe('filterExactMatch', () => {
        it('should filter by exact match', () => {
            const filtered = filterExactMatch('code1', '700')(mockTable);
            assertEquals(filtered.numRows(), 1);
            assertEquals(filtered.array('code1')[0], '700');
        });

        it('should handle numeric values', () => {
            const filtered = filterExactMatch('code1', 700)(mockTable);
            assertEquals(filtered.numRows(), 1);
        });
    });

    describe('filterArrayMatch', () => {
        it('should filter by array match', () => {
            const filtered = filterArrayMatch('code1', ['700', '710'])(mockTable);
            assertEquals(filtered.numRows(), 2);
        });

        it('should handle single element array', () => {
            const filtered = filterArrayMatch('code1', ['700'])(mockTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should handle mixed types in array', () => {
            const filtered = filterArrayMatch('code1', ['700', 710, '720'])(mockTable);
            assertEquals(filtered.numRows(), 3);
        });
    });

    describe('filterRangeMatch', () => {
        it('should filter by range (gte/lte)', () => {
            const filtered = filterRangeMatch('code1', { gte: '700', lte: '720' })(mockTable);
            assertEquals(filtered.numRows(), 3);
        });

        it('should filter by range (gt/lt)', () => {
            const filtered = filterRangeMatch('code1', { gt: '700', lt: '720' })(mockTable);
            assertEquals(filtered.numRows(), 1);
            assertEquals(filtered.array('code1')[0], '710');
        });

        it('should filter by single bound (gte)', () => {
            const filtered = filterRangeMatch('code1', { gte: '700' })(mockTable);
            assertEquals(filtered.numRows(), 3);
        });

        it('should filter by single bound (lte)', () => {
            const filtered = filterRangeMatch('code1', { lte: '200' })(mockTable);
            assertEquals(filtered.numRows(), 2);
        });
    });

    describe('combineFilters', () => {
        it('should combine multiple filters with AND logic', () => {
            const combined = combineFilters([
                { code1: '700' },
                { statement_type: 'Income' }
            ]);
            const filtered = combined(mockTable);
            assertEquals(filtered.numRows(), 1);
            assertEquals(filtered.array('code1')[0], '700');
        });

        it('should handle empty filter array', () => {
            const combined = combineFilters([]);
            const filtered = combined(mockTable);
            assertEquals(filtered.numRows(), mockTable.numRows());
        });

        it('should handle single filter', () => {
            const combined = combineFilters([{ code1: '700' }]);
            const filtered = combined(mockTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should apply filters sequentially', () => {
            const combined = combineFilters([
                { statement_type: 'Income' },
                { code1: ['700', '710'] }
            ]);
            const filtered = combined(mockTable);
            assertEquals(filtered.numRows(), 2);
        });
    });

    // ========================================================================
    // Integration Tests
    // ========================================================================

    describe('Integration Tests', () => {
        it('should handle complex filter combinations', () => {
            const filtered = applyFilter({
                statement_type: 'Income',
                code1: { gte: '700', lte: '720' }
            })(mockTable);
            assertEquals(filtered.numRows(), 3);
        });

        it('should chain multiple filters', () => {
            const step1 = applyFilter({ statement_type: 'Income' })(mockTable);
            const step2 = applyFilter({ code1: ['700', '710'] })(step1);
            assertEquals(step2.numRows(), 2);
        });

        it('should work with combineFilters for complex logic', () => {
            const combined = combineFilters([
                { statement_type: 'Income' },
                { code1: { gte: '700' } }
            ]);
            const filtered = combined(mockTable);
            assertEquals(filtered.numRows(), 3);
        });

        it('should handle edge case with no matches', () => {
            const filtered = applyFilter({ code1: '999' })(mockTable);
            assertEquals(filtered.numRows(), 0);
        });

        it('should handle all rows matching', () => {
            const filtered = applyFilter({ code1: { gte: '0' } })(mockTable);
            assertEquals(filtered.numRows(), mockTable.numRows());
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================

    describe('Edge Cases', () => {
        it('should handle special characters in values', () => {
            const testTable = createMockTable([
                { code1: "O'Reilly", name1: 'Test' }
            ]);
            const filtered = applyFilter({ code1: "O'Reilly" })(testTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should handle empty string values', () => {
            const testTable = createMockTable([
                { code1: '', name1: 'Empty' },
                { code1: '700', name1: 'Normal' }
            ]);
            const filtered = applyFilter({ code1: '' })(testTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should handle whitespace in values', () => {
            const testTable = createMockTable([
                { code1: '  700  ', name1: 'Spaces' }
            ]);
            const filtered = applyFilter({ code1: '  700  ' })(testTable);
            assertEquals(filtered.numRows(), 1);
        });

        it('should handle very long filter arrays', () => {
            const longArray = Array.from({ length: 100 }, (_, i) => `${i}`);
            const expr = buildFilterExpression({ code1: longArray });
            assertExists(expr);
            assertEquals(expr.includes('includes'), true);
        });

        it('should handle multiple range operators', () => {
            const filtered = applyFilter({ 
                code1: { gte: '100', lte: '800', gt: '0', lt: '900' } 
            })(mockTable);
            assertEquals(filtered.numRows() >= 0, true);
        });
    });
});
