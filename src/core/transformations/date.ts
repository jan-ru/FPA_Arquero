/**
 * Date and Period Utilities - Pure Functions
 * 
 * Functional implementation for date and period handling.
 * Uses Day.js for date operations with Dutch locale support.
 */

import { Option, some, none, fromNullable } from '../utils/option.ts';
import { Result, ok, err, tryCatch } from '../utils/result.ts';

/**
 * Parsed period information
 */
export interface ParsedPeriod {
    readonly year: number;
    readonly period: number | 'all';
    readonly type: 'year' | 'quarter' | 'month';
    readonly maxPeriod: number;
}

/**
 * Quarter month range
 */
export interface QuarterMonths {
    readonly start: number;
    readonly end: number;
}

/**
 * Day.js instance type
 */
type DayJS = any;

/**
 * Initialize Day.js with required plugins and locale
 * This is a side effect that must be called once at app startup
 * 
 * @returns Result indicating success or failure
 */
export const initializeDayJS = (): Result<void, Error> =>
    tryCatch(
        () => {
            if (typeof (globalThis as any).dayjs === 'undefined') {
                throw new Error('Day.js is not loaded. Please include Day.js via CDN.');
            }

            // Extend Day.js with quarterOfYear plugin
            if (typeof (globalThis as any).dayjs_plugin_quarterOfYear !== 'undefined') {
                (globalThis as any).dayjs.extend((globalThis as any).dayjs_plugin_quarterOfYear);
            }

            // Set Dutch locale
            (globalThis as any).dayjs.locale('nl');
        },
        (error) => error as Error
    );

/**
 * Get Day.js instance (assumes initialization has been done)
 */
const getDayJS = (): DayJS => (globalThis as any).dayjs;

/**
 * Normalize a month name for comparison
 */
const normalizeMonthName = (monthName: string): string =>
    monthName.toLowerCase().trim();

/**
 * Get month number (1-12) from Dutch month name
 * 
 * @param monthName - Dutch month name (e.g., 'januari', 'februari')
 * @returns Option with month number (1-12) or none if invalid
 * 
 * @example
 * getMonthNumber('januari'); // { some: true, value: 1 }
 * getMonthNumber('invalid'); // { some: false }
 */
export const getMonthNumber = (monthName: string | null | undefined): Option<number> => {
    if (!monthName) return none();
    
    const normalized = normalizeMonthName(monthName);
    const dayjs = getDayJS();
    
    // Check each month
    for (let i = 0; i < 12; i++) {
        const monthStr = dayjs().month(i).format('MMMM').toLowerCase();
        if (monthStr === normalized) {
            return some(i + 1); // Return 1-based month
        }
    }
    
    return none();
};

/**
 * Get Dutch month name from month number
 * 
 * @param monthNumber - Month number (1-12)
 * @returns Option with Dutch month name or none if invalid
 * 
 * @example
 * getMonthName(1); // { some: true, value: 'januari' }
 * getMonthName(13); // { some: false }
 */
export const getMonthName = (monthNumber: number): Option<string> => {
    if (monthNumber < 1 || monthNumber > 12) return none();
    
    const dayjs = getDayJS();
    const name = dayjs().month(monthNumber - 1).format('MMMM');
    return some(name);
};

/**
 * Get quarter number (1-4) from month number
 * 
 * @param monthNumber - Month number (1-12)
 * @returns Option with quarter number (1-4) or none if invalid
 * 
 * @example
 * getQuarterFromMonth(3); // { some: true, value: 1 }
 * getQuarterFromMonth(7); // { some: true, value: 3 }
 */
export const getQuarterFromMonth = (monthNumber: number): Option<number> => {
    if (monthNumber < 1 || monthNumber > 12) return none();
    return some(Math.ceil(monthNumber / 3));
};

/**
 * Get quarter number for a specific date
 * 
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Option with quarter number (1-4) or none if invalid
 * 
 * @example
 * getQuarter(2024, 3); // { some: true, value: 1 }
 */
export const getQuarter = (year: number, month: number): Option<number> => {
    if (month < 1 || month > 12) return none();
    
    const dayjs = getDayJS();
    const date = dayjs(new Date(year, month - 1, 1));
    return some(date.quarter());
};

/**
 * Get the month range for a quarter
 * 
 * @param quarter - Quarter number (1-4)
 * @returns Option with start and end months or none if invalid
 * 
 * @example
 * getQuarterMonths(1); // { some: true, value: { start: 1, end: 3 } }
 * getQuarterMonths(4); // { some: true, value: { start: 10, end: 12 } }
 */
export const getQuarterMonths = (quarter: number): Option<QuarterMonths> => {
    if (quarter < 1 || quarter > 4) return none();
    
    const start = (quarter - 1) * 3 + 1;
    const end = start + 2;
    
    return some({ start, end });
};

/**
 * Parse a period string to extract year and period information
 * 
 * @param periodStr - Period string (e.g., '2024-all', '2024-Q1', '2024-3')
 * @returns Option with parsed period or none if invalid
 * 
 * @example
 * parsePeriodString('2024-all'); // { some: true, value: { year: 2024, period: 'all', ... } }
 * parsePeriodString('2024-Q1');  // { some: true, value: { year: 2024, period: 1, type: 'quarter', ... } }
 * parsePeriodString('2024-3');   // { some: true, value: { year: 2024, period: 3, type: 'month', ... } }
 */
export const parsePeriodString = (periodStr: string | null | undefined): Option<ParsedPeriod> => {
    if (!periodStr || typeof periodStr !== 'string') return none();
    
    const parts = periodStr.split('-');
    if (parts.length !== 2) return none();
    
    const year = parseInt(parts[0]);
    if (isNaN(year)) return none();
    
    const periodPart = parts[1];
    
    // Handle 'all' periods
    if (periodPart === 'all') {
        return some({
            year,
            period: 'all',
            type: 'year',
            maxPeriod: 12
        });
    }
    
    // Handle quarter periods (Q1-Q4)
    if (periodPart.startsWith('Q')) {
        const quarter = parseInt(periodPart.substring(1));
        if (isNaN(quarter) || quarter < 1 || quarter > 4) return none();
        
        return some({
            year,
            period: quarter,
            type: 'quarter',
            maxPeriod: quarter * 3 // Q1=3, Q2=6, Q3=9, Q4=12
        });
    }
    
    // Handle month periods (1-12)
    const month = parseInt(periodPart);
    if (isNaN(month) || month < 1 || month > 12) return none();
    
    return some({
        year,
        period: month,
        type: 'month',
        maxPeriod: month
    });
};

/**
 * Format a period as a string
 * 
 * @param year - Year
 * @param period - Period (number or 'all')
 * @returns Formatted period string
 * 
 * @example
 * formatPeriodString(2024, 'all'); // '2024-all'
 * formatPeriodString(2024, 3);     // '2024-3'
 */
export const formatPeriodString = (year: number, period: string | number): string =>
    `${year}-${period}`;

/**
 * Get a display label for a period
 * 
 * @param periodStr - Period string
 * @returns Option with display label or none if invalid
 * 
 * @example
 * getPeriodLabel('2024-all'); // { some: true, value: '2024 (All)' }
 * getPeriodLabel('2024-Q1');  // { some: true, value: '2024 (Q1)' }
 * getPeriodLabel('2024-3');   // { some: true, value: '2024 (P3)' }
 */
export const getPeriodLabel = (periodStr: string): Option<string> => {
    const parsed = parsePeriodString(periodStr);
    if (!parsed.some) return none();
    
    const { year, period, type } = parsed.value;
    
    if (type === 'year') {
        return some(`${year} (All)`);
    } else if (type === 'quarter') {
        return some(`${year} (Q${period})`);
    } else if (type === 'month') {
        return some(`${year} (P${period})`);
    }
    
    return none();
};

/**
 * Check if a data period falls within a filter period
 * 
 * @param dataPeriod - Data period number
 * @param dataYear - Data year
 * @param filterMaxPeriod - Filter max period (999 for 'all')
 * @param filterYear - Filter year
 * @returns True if data period is within filter period
 * 
 * @example
 * isWithinPeriod(3, 2024, 6, 2024);   // true (period 3 is within Q2)
 * isWithinPeriod(7, 2024, 6, 2024);   // false (period 7 is after Q2)
 * isWithinPeriod(3, 2024, 999, 2024); // true (999 means 'all')
 */
export const isWithinPeriod = (
    dataPeriod: number,
    dataYear: number,
    filterMaxPeriod: number,
    filterYear: number
): boolean => {
    if (dataYear !== filterYear) return false;
    if (filterMaxPeriod === 999) return true; // 'all' periods
    return dataPeriod <= filterMaxPeriod;
};

/**
 * Format a date as a human-readable string
 * 
 * @param date - Date to format
 * @param format - Day.js format string (default: 'MMMM D, YYYY')
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(2024, 0, 15)); // 'januari 15, 2024'
 * formatDate(new Date(2024, 0, 15), 'YYYY-MM-DD'); // '2024-01-15'
 */
export const formatDate = (
    date: Date | string | number,
    format = 'MMMM D, YYYY'
): string => {
    const dayjs = getDayJS();
    return dayjs(date).format(format);
};

/**
 * Get current date formatted
 * 
 * @param format - Day.js format string (default: 'YYYY-MM-DD')
 * @returns Formatted current date
 * 
 * @example
 * now(); // '2024-12-07'
 * now('MMMM D, YYYY'); // 'december 7, 2024'
 */
export const now = (format = 'YYYY-MM-DD'): string => {
    const dayjs = getDayJS();
    return dayjs().format(format);
};

/**
 * Validate a Dutch month name
 * 
 * @param monthName - Month name to validate
 * @returns True if valid Dutch month name
 * 
 * @example
 * isValidMonthName('januari'); // true
 * isValidMonthName('invalid'); // false
 */
export const isValidMonthName = (monthName: string): boolean =>
    getMonthNumber(monthName).some;

/**
 * Get all Dutch month names
 * 
 * @returns Array of all 12 Dutch month names
 * 
 * @example
 * getAllMonthNames(); // ['januari', 'februari', ..., 'december']
 */
export const getAllMonthNames = (): readonly string[] => {
    const dayjs = getDayJS();
    const months: string[] = [];
    
    for (let i = 0; i < 12; i++) {
        months.push(dayjs().month(i).format('MMMM'));
    }
    
    return months;
};

/**
 * Create a period filter predicate
 * 
 * @param filterYear - Filter year
 * @param filterMaxPeriod - Filter max period
 * @returns Function that checks if a data point is within the period
 * 
 * @example
 * const inQ2_2024 = createPeriodFilter(2024, 6);
 * inQ2_2024(3, 2024); // true
 * inQ2_2024(7, 2024); // false
 */
export const createPeriodFilter = (filterYear: number, filterMaxPeriod: number) =>
    (dataPeriod: number, dataYear: number): boolean =>
        isWithinPeriod(dataPeriod, dataYear, filterMaxPeriod, filterYear);

/**
 * Get the maximum period for a period type
 * 
 * @param type - Period type
 * @param period - Period value
 * @returns Maximum period number
 * 
 * @example
 * getMaxPeriod('year', 'all'); // 12
 * getMaxPeriod('quarter', 2);  // 6
 * getMaxPeriod('month', 5);    // 5
 */
export const getMaxPeriod = (type: 'year' | 'quarter' | 'month', period: number | 'all'): number => {
    if (type === 'year') return 12;
    if (type === 'quarter' && typeof period === 'number') return period * 3;
    if (type === 'month' && typeof period === 'number') return period;
    return 12;
};
