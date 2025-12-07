import { describe, it, beforeAll } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    initializeDayJS,
    getMonthNumber,
    getMonthName,
    getQuarterFromMonth,
    getQuarter,
    getQuarterMonths,
    parsePeriodString,
    formatPeriodString,
    getPeriodLabel,
    isWithinPeriod,
    formatDate,
    now,
    isValidMonthName,
    getAllMonthNames,
    createPeriodFilter,
    getMaxPeriod
} from "../../../../src/core/transformations/date.ts";

// Mock Day.js for testing
beforeAll(() => {
    // Simple Day.js mock
    (globalThis as any).dayjs = function(date?: any) {
        const d = date ? new Date(date) : new Date();
        return {
            month: (m?: number) => {
                if (m !== undefined) {
                    return (globalThis as any).dayjs(new Date(2024, m, 1));
                }
                return d.getMonth();
            },
            quarter: () => Math.ceil((d.getMonth() + 1) / 3),
            format: (fmt: string) => {
                const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
                               'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
                if (fmt === 'MMMM') return months[d.getMonth()];
                if (fmt === 'YYYY-MM-DD') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (fmt === 'MMMM D, YYYY') return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                return d.toISOString();
            }
        };
    };
    
    (globalThis as any).dayjs.locale = () => {};
    (globalThis as any).dayjs.extend = () => {};
    (globalThis as any).dayjs_plugin_quarterOfYear = {};
    
    // Initialize
    initializeDayJS();
});

describe('Date and Period Utilities', () => {
    describe('getMonthNumber', () => {
        it('returns month number for valid Dutch month names', () => {
            const jan = getMonthNumber('januari');
            assertEquals(jan.some, true);
            if (jan.some) assertEquals(jan.value, 1);
            
            const dec = getMonthNumber('december');
            assertEquals(dec.some, true);
            if (dec.some) assertEquals(dec.value, 12);
        });

        it('is case-insensitive', () => {
            const result = getMonthNumber('JANUARI');
            assertEquals(result.some, true);
            if (result.some) assertEquals(result.value, 1);
        });

        it('handles whitespace', () => {
            const result = getMonthNumber('  januari  ');
            assertEquals(result.some, true);
            if (result.some) assertEquals(result.value, 1);
        });

        it('returns none for invalid month names', () => {
            assertEquals(getMonthNumber('invalid').some, false);
            assertEquals(getMonthNumber(null).some, false);
            assertEquals(getMonthNumber(undefined).some, false);
        });
    });

    describe('getMonthName', () => {
        it('returns Dutch month name for valid month numbers', () => {
            const jan = getMonthName(1);
            assertEquals(jan.some, true);
            if (jan.some) assertEquals(jan.value, 'januari');
            
            const dec = getMonthName(12);
            assertEquals(dec.some, true);
            if (dec.some) assertEquals(dec.value, 'december');
        });

        it('returns none for invalid month numbers', () => {
            assertEquals(getMonthName(0).some, false);
            assertEquals(getMonthName(13).some, false);
            assertEquals(getMonthName(-1).some, false);
        });
    });

    describe('getQuarterFromMonth', () => {
        it('returns correct quarter for each month', () => {
            // Q1: Jan, Feb, Mar
            const q1_1 = getQuarterFromMonth(1);
            assertEquals(q1_1.some, true);
            if (q1_1.some) assertEquals(q1_1.value, 1);
            
            const q1_3 = getQuarterFromMonth(3);
            assertEquals(q1_3.some, true);
            if (q1_3.some) assertEquals(q1_3.value, 1);
            
            // Q2: Apr, May, Jun
            const q2 = getQuarterFromMonth(6);
            assertEquals(q2.some, true);
            if (q2.some) assertEquals(q2.value, 2);
            
            // Q3: Jul, Aug, Sep
            const q3 = getQuarterFromMonth(9);
            assertEquals(q3.some, true);
            if (q3.some) assertEquals(q3.value, 3);
            
            // Q4: Oct, Nov, Dec
            const q4 = getQuarterFromMonth(12);
            assertEquals(q4.some, true);
            if (q4.some) assertEquals(q4.value, 4);
        });

        it('returns none for invalid months', () => {
            assertEquals(getQuarterFromMonth(0).some, false);
            assertEquals(getQuarterFromMonth(13).some, false);
        });
    });

    describe('getQuarter', () => {
        it('returns correct quarter for date', () => {
            const q1 = getQuarter(2024, 3);
            assertEquals(q1.some, true);
            if (q1.some) assertEquals(q1.value, 1);
            
            const q4 = getQuarter(2024, 12);
            assertEquals(q4.some, true);
            if (q4.some) assertEquals(q4.value, 4);
        });

        it('returns none for invalid months', () => {
            assertEquals(getQuarter(2024, 0).some, false);
            assertEquals(getQuarter(2024, 13).some, false);
        });
    });

    describe('getQuarterMonths', () => {
        it('returns correct month range for each quarter', () => {
            const q1 = getQuarterMonths(1);
            assertEquals(q1.some, true);
            if (q1.some) {
                assertEquals(q1.value.start, 1);
                assertEquals(q1.value.end, 3);
            }
            
            const q4 = getQuarterMonths(4);
            assertEquals(q4.some, true);
            if (q4.some) {
                assertEquals(q4.value.start, 10);
                assertEquals(q4.value.end, 12);
            }
        });

        it('returns none for invalid quarters', () => {
            assertEquals(getQuarterMonths(0).some, false);
            assertEquals(getQuarterMonths(5).some, false);
        });
    });

    describe('parsePeriodString', () => {
        it('parses year periods', () => {
            const result = parsePeriodString('2024-all');
            assertEquals(result.some, true);
            if (result.some) {
                assertEquals(result.value.year, 2024);
                assertEquals(result.value.period, 'all');
                assertEquals(result.value.type, 'year');
                assertEquals(result.value.maxPeriod, 12);
            }
        });

        it('parses quarter periods', () => {
            const result = parsePeriodString('2024-Q2');
            assertEquals(result.some, true);
            if (result.some) {
                assertEquals(result.value.year, 2024);
                assertEquals(result.value.period, 2);
                assertEquals(result.value.type, 'quarter');
                assertEquals(result.value.maxPeriod, 6);
            }
        });

        it('parses month periods', () => {
            const result = parsePeriodString('2024-5');
            assertEquals(result.some, true);
            if (result.some) {
                assertEquals(result.value.year, 2024);
                assertEquals(result.value.period, 5);
                assertEquals(result.value.type, 'month');
                assertEquals(result.value.maxPeriod, 5);
            }
        });

        it('returns none for invalid period strings', () => {
            assertEquals(parsePeriodString('invalid').some, false);
            assertEquals(parsePeriodString('2024').some, false);
            assertEquals(parsePeriodString('2024-Q5').some, false);
            assertEquals(parsePeriodString('2024-13').some, false);
            assertEquals(parsePeriodString(null).some, false);
        });
    });

    describe('formatPeriodString', () => {
        it('formats period strings correctly', () => {
            assertEquals(formatPeriodString(2024, 'all'), '2024-all');
            assertEquals(formatPeriodString(2024, 3), '2024-3');
            assertEquals(formatPeriodString(2024, 'Q1'), '2024-Q1');
        });
    });

    describe('getPeriodLabel', () => {
        it('creates labels for year periods', () => {
            const result = getPeriodLabel('2024-all');
            assertEquals(result.some, true);
            if (result.some) assertEquals(result.value, '2024 (All)');
        });

        it('creates labels for quarter periods', () => {
            const result = getPeriodLabel('2024-Q2');
            assertEquals(result.some, true);
            if (result.some) assertEquals(result.value, '2024 (Q2)');
        });

        it('creates labels for month periods', () => {
            const result = getPeriodLabel('2024-5');
            assertEquals(result.some, true);
            if (result.some) assertEquals(result.value, '2024 (P5)');
        });

        it('returns none for invalid periods', () => {
            assertEquals(getPeriodLabel('invalid').some, false);
        });
    });

    describe('isWithinPeriod', () => {
        it('checks if period is within filter', () => {
            // Period 3 is within Q2 (maxPeriod 6)
            assertEquals(isWithinPeriod(3, 2024, 6, 2024), true);
            
            // Period 7 is after Q2
            assertEquals(isWithinPeriod(7, 2024, 6, 2024), false);
            
            // Different year
            assertEquals(isWithinPeriod(3, 2023, 6, 2024), false);
        });

        it('handles "all" periods (999)', () => {
            assertEquals(isWithinPeriod(3, 2024, 999, 2024), true);
            assertEquals(isWithinPeriod(12, 2024, 999, 2024), true);
        });
    });

    describe('formatDate', () => {
        it('formats dates with default format', () => {
            const date = new Date(2024, 0, 15);
            const result = formatDate(date);
            assertEquals(result, 'januari 15, 2024');
        });

        it('formats dates with custom format', () => {
            const date = new Date(2024, 0, 15);
            const result = formatDate(date, 'YYYY-MM-DD');
            assertEquals(result, '2024-01-15');
        });
    });

    describe('now', () => {
        it('returns current date formatted', () => {
            const result = now();
            // Just check it's a valid date string format
            assertEquals(result.match(/^\d{4}-\d{2}-\d{2}$/) !== null, true);
        });
    });

    describe('isValidMonthName', () => {
        it('validates Dutch month names', () => {
            assertEquals(isValidMonthName('januari'), true);
            assertEquals(isValidMonthName('december'), true);
            assertEquals(isValidMonthName('invalid'), false);
        });
    });

    describe('getAllMonthNames', () => {
        it('returns all 12 Dutch month names', () => {
            const months = getAllMonthNames();
            assertEquals(months.length, 12);
            assertEquals(months[0], 'januari');
            assertEquals(months[11], 'december');
        });
    });

    describe('createPeriodFilter', () => {
        it('creates a period filter function', () => {
            const inQ2_2024 = createPeriodFilter(2024, 6);
            
            assertEquals(inQ2_2024(3, 2024), true);
            assertEquals(inQ2_2024(7, 2024), false);
            assertEquals(inQ2_2024(3, 2023), false);
        });
    });

    describe('getMaxPeriod', () => {
        it('returns correct max period for year', () => {
            assertEquals(getMaxPeriod('year', 'all'), 12);
        });

        it('returns correct max period for quarter', () => {
            assertEquals(getMaxPeriod('quarter', 1), 3);
            assertEquals(getMaxPeriod('quarter', 2), 6);
            assertEquals(getMaxPeriod('quarter', 4), 12);
        });

        it('returns correct max period for month', () => {
            assertEquals(getMaxPeriod('month', 5), 5);
            assertEquals(getMaxPeriod('month', 12), 12);
        });
    });
});
