/**
 * DateUtils - Date and period handling utilities using Day.js
 *
 * Provides consistent date/period operations across the application,
 * including Dutch month name handling, quarter calculations, and
 * period parsing.
 *
 * @example
 * DateUtils.initialize();
 * const monthNum = DateUtils.getMonthNumber('januari'); // 1
 * const quarter = DateUtils.getQuarter(2024, 3); // 1
 */
export default class DateUtils {
    static _initialized = false;

    /**
     * Initialize Day.js with required plugins and locale
     * Must be called before using other methods
     */
    static initialize() {
        if (this._initialized) return;

        if (typeof dayjs === 'undefined') {
            throw new Error('Day.js is not loaded. Please include Day.js via CDN.');
        }

        // Extend Day.js with quarterOfYear plugin
        if (typeof dayjs_plugin_quarterOfYear !== 'undefined') {
            dayjs.extend(dayjs_plugin_quarterOfYear);
        }

        // Set Dutch locale
        dayjs.locale('nl');

        this._initialized = true;
    }

    /**
     * Get month number (1-12) from Dutch month name
     *
     * @param {string} monthName - Dutch month name (e.g., 'januari', 'februari')
     * @returns {number|null} Month number (1-12) or null if invalid
     *
     * @example
     * DateUtils.getMonthNumber('januari') // 1
     * DateUtils.getMonthNumber('december') // 12
     * DateUtils.getMonthNumber('invalid') // null
     */
    static getMonthNumber(monthName) {
        if (!this._initialized) this.initialize();

        const normalized = monthName?.toLowerCase().trim();
        if (!normalized) return null;

        // Create a date for each month and check if the name matches
        for (let i = 0; i < 12; i++) {
            const monthStr = dayjs().month(i).format('MMMM').toLowerCase();
            if (monthStr === normalized) {
                return i + 1; // Return 1-based month
            }
        }

        return null;
    }

    /**
     * Get Dutch month name from month number
     *
     * @param {number} monthNumber - Month number (1-12)
     * @returns {string|null} Dutch month name or null if invalid
     *
     * @example
     * DateUtils.getMonthName(1) // 'januari'
     * DateUtils.getMonthName(12) // 'december'
     */
    static getMonthName(monthNumber) {
        if (!this._initialized) this.initialize();

        if (monthNumber < 1 || monthNumber > 12) return null;

        return dayjs().month(monthNumber - 1).format('MMMM');
    }

    /**
     * Get quarter number (1-4) from month number
     *
     * @param {number} monthNumber - Month number (1-12)
     * @returns {number|null} Quarter number (1-4) or null if invalid
     *
     * @example
     * DateUtils.getQuarterFromMonth(1) // 1
     * DateUtils.getQuarterFromMonth(6) // 2
     * DateUtils.getQuarterFromMonth(12) // 4
     */
    static getQuarterFromMonth(monthNumber) {
        if (monthNumber < 1 || monthNumber > 12) return null;
        return Math.ceil(monthNumber / 3);
    }

    /**
     * Get quarter number for a specific date
     *
     * @param {number} year - Year
     * @param {number} month - Month number (1-12)
     * @returns {number|null} Quarter number (1-4) or null if invalid
     *
     * @example
     * DateUtils.getQuarter(2024, 3) // 1
     * DateUtils.getQuarter(2024, 7) // 3
     */
    static getQuarter(year, month) {
        if (!this._initialized) this.initialize();

        if (month < 1 || month > 12) return null;

        const date = dayjs(new Date(year, month - 1, 1));
        return date.quarter();
    }

    /**
     * Get the month range for a quarter
     *
     * @param {number} quarter - Quarter number (1-4)
     * @returns {{start: number, end: number}|null} Month range or null if invalid
     *
     * @example
     * DateUtils.getQuarterMonths(1) // { start: 1, end: 3 }
     * DateUtils.getQuarterMonths(4) // { start: 10, end: 12 }
     */
    static getQuarterMonths(quarter) {
        if (quarter < 1 || quarter > 4) return null;

        const start = (quarter - 1) * 3 + 1;
        const end = start + 2;

        return { start, end };
    }

    /**
     * Parse a period string to extract year and period information
     *
     * @param {string} periodStr - Period string (e.g., '2024-all', '2024-Q1', '2024-6')
     * @returns {{year: number, period: number|string, type: string, maxPeriod: number}|null}
     *
     * Supported formats:
     * - 'YYYY-all' -> type: 'year', period: 'all', maxPeriod: 12
     * - 'YYYY-QN' -> type: 'quarter', period: N (1-4), maxPeriod: 3, 6, 9, or 12
     * - 'YYYY-N' -> type: 'month', period: N (1-12), maxPeriod: N
     *
     * @example
     * DateUtils.parsePeriodString('2024-all') // { year: 2024, period: 'all', type: 'year', maxPeriod: 12 }
     * DateUtils.parsePeriodString('2024-Q2') // { year: 2024, period: 2, type: 'quarter', maxPeriod: 6 }
     * DateUtils.parsePeriodString('2024-6') // { year: 2024, period: 6, type: 'month', maxPeriod: 6 }
     */
    static parsePeriodString(periodStr) {
        if (!periodStr || typeof periodStr !== 'string') return null;

        const parts = periodStr.split('-');
        if (parts.length !== 2) return null;

        const year = parseInt(parts[0]);
        if (isNaN(year)) return null;

        const periodPart = parts[1];

        // Handle 'all' periods
        if (periodPart === 'all') {
            return {
                year,
                period: 'all',
                type: 'year',
                maxPeriod: 12
            };
        }

        // Handle quarter periods (Q1-Q4)
        if (periodPart.startsWith('Q')) {
            const quarter = parseInt(periodPart.substring(1));
            if (isNaN(quarter) || quarter < 1 || quarter > 4) return null;

            return {
                year,
                period: quarter,
                type: 'quarter',
                maxPeriod: quarter * 3 // Q1=3, Q2=6, Q3=9, Q4=12
            };
        }

        // Handle month periods (1-12)
        const month = parseInt(periodPart);
        if (isNaN(month) || month < 1 || month > 12) return null;

        return {
            year,
            period: month,
            type: 'month',
            maxPeriod: month
        };
    }

    /**
     * Format a period object as a string
     *
     * @param {number} year - Year
     * @param {string|number} period - Period ('all', 1-12, or 'Q1'-'Q4')
     * @returns {string} Formatted period string
     *
     * @example
     * DateUtils.formatPeriodString(2024, 'all') // '2024-all'
     * DateUtils.formatPeriodString(2024, 6) // '2024-6'
     * DateUtils.formatPeriodString(2024, 'Q2') // '2024-Q2'
     */
    static formatPeriodString(year, period) {
        return `${year}-${period}`;
    }

    /**
     * Get a display label for a period
     *
     * @param {string} periodStr - Period string (e.g., '2024-all', '2024-Q1', '2024-6')
     * @returns {string|null} Display label or null if invalid
     *
     * @example
     * DateUtils.getPeriodLabel('2024-all') // '2024 (All)'
     * DateUtils.getPeriodLabel('2024-Q2') // '2024 (Q2)'
     * DateUtils.getPeriodLabel('2024-6') // '2024 (P6)'
     */
    static getPeriodLabel(periodStr) {
        const parsed = this.parsePeriodString(periodStr);
        if (!parsed) return null;

        if (parsed.type === 'year') {
            return `${parsed.year} (All)`;
        } else if (parsed.type === 'quarter') {
            return `${parsed.year} (Q${parsed.period})`;
        } else if (parsed.type === 'month') {
            return `${parsed.year} (P${parsed.period})`;
        }

        return null;
    }

    /**
     * Check if a data period falls within a filter period
     *
     * @param {number} dataPeriod - The period number of the data (1-12)
     * @param {number} dataYear - The year of the data
     * @param {number} filterMaxPeriod - The maximum period from filter (1-12 or 999 for all)
     * @param {number} filterYear - The year from filter
     * @returns {boolean} True if data should be included
     *
     * @example
     * DateUtils.isWithinPeriod(3, 2024, 6, 2024) // true (P3 is within P6)
     * DateUtils.isWithinPeriod(9, 2024, 6, 2024) // false (P9 is after P6)
     * DateUtils.isWithinPeriod(3, 2023, 6, 2024) // false (wrong year)
     */
    static isWithinPeriod(dataPeriod, dataYear, filterMaxPeriod, filterYear) {
        if (dataYear !== filterYear) return false;
        if (filterMaxPeriod === 999) return true; // 'all' periods
        return dataPeriod <= filterMaxPeriod;
    }

    /**
     * Format a date as a human-readable string
     *
     * @param {Date|string|number} date - Date to format
     * @param {string} format - Day.js format string (default: 'MMMM D, YYYY')
     * @returns {string} Formatted date string
     *
     * @example
     * DateUtils.formatDate(new Date(2024, 0, 15)) // 'januari 15, 2024'
     * DateUtils.formatDate(new Date(), 'DD-MM-YYYY') // '15-01-2024'
     */
    static formatDate(date, format = 'MMMM D, YYYY') {
        if (!this._initialized) this.initialize();
        return dayjs(date).format(format);
    }

    /**
     * Get current date formatted
     *
     * @param {string} format - Day.js format string (default: 'YYYY-MM-DD')
     * @returns {string} Formatted current date
     *
     * @example
     * DateUtils.now() // '2024-01-15'
     * DateUtils.now('MMMM D, YYYY') // 'januari 15, 2024'
     */
    static now(format = 'YYYY-MM-DD') {
        if (!this._initialized) this.initialize();
        return dayjs().format(format);
    }

    /**
     * Validate a Dutch month name
     *
     * @param {string} monthName - Month name to validate
     * @returns {boolean} True if valid Dutch month name
     *
     * @example
     * DateUtils.isValidMonthName('januari') // true
     * DateUtils.isValidMonthName('january') // false
     */
    static isValidMonthName(monthName) {
        return this.getMonthNumber(monthName) !== null;
    }

    /**
     * Get all Dutch month names
     *
     * @returns {Array<string>} Array of Dutch month names
     *
     * @example
     * DateUtils.getAllMonthNames() // ['januari', 'februari', ..., 'december']
     */
    static getAllMonthNames() {
        if (!this._initialized) this.initialize();

        const months = [];
        for (let i = 0; i < 12; i++) {
            months.push(dayjs().month(i).format('MMMM'));
        }
        return months;
    }
}
