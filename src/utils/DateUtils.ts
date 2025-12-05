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

// Type definitions for parsed period
export interface ParsedPeriod {
    year: number;
    period: number | 'all';
    type: 'year' | 'quarter' | 'month';
    maxPeriod: number;
}

export interface QuarterMonths {
    start: number;
    end: number;
}

export default class DateUtils {
    static _initialized = false;

    /**
     * Initialize Day.js with required plugins and locale
     * Must be called before using other methods
     */
    static initialize(): void {
        if (this._initialized) return;

        if (typeof (globalThis as any).dayjs === 'undefined') {
            throw new Error('Day.js is not loaded. Please include Day.js via CDN.');
        }

        // Extend Day.js with quarterOfYear plugin
        if (typeof (globalThis as any).dayjs_plugin_quarterOfYear !== 'undefined') {
            (globalThis as any).dayjs.extend((globalThis as any).dayjs_plugin_quarterOfYear);
        }

        // Set Dutch locale
        (globalThis as any).dayjs.locale('nl');

        this._initialized = true;
    }

    /**
     * Get month number (1-12) from Dutch month name
     */
    static getMonthNumber(monthName: string | null | undefined): number | null {
        if (!this._initialized) this.initialize();

        const normalized = monthName?.toLowerCase().trim();
        if (!normalized) return null;

        // Create a date for each month and check if the name matches
        for (let i = 0; i < 12; i++) {
            const monthStr = (globalThis as any).dayjs().month(i).format('MMMM').toLowerCase();
            if (monthStr === normalized) {
                return i + 1; // Return 1-based month
            }
        }

        return null;
    }

    /**
     * Get Dutch month name from month number
     */
    static getMonthName(monthNumber: number): string | null {
        if (!this._initialized) this.initialize();

        if (monthNumber < 1 || monthNumber > 12) return null;

        return (globalThis as any).dayjs().month(monthNumber - 1).format('MMMM');
    }

    /**
     * Get quarter number (1-4) from month number
     */
    static getQuarterFromMonth(monthNumber: number): number | null {
        if (monthNumber < 1 || monthNumber > 12) return null;
        return Math.ceil(monthNumber / 3);
    }

    /**
     * Get quarter number for a specific date
     */
    static getQuarter(year: number, month: number): number | null {
        if (!this._initialized) this.initialize();

        if (month < 1 || month > 12) return null;

        const date = (globalThis as any).dayjs(new Date(year, month - 1, 1));
        return date.quarter();
    }

    /**
     * Get the month range for a quarter
     */
    static getQuarterMonths(quarter: number): QuarterMonths | null {
        if (quarter < 1 || quarter > 4) return null;

        const start = (quarter - 1) * 3 + 1;
        const end = start + 2;

        return { start, end };
    }

    /**
     * Parse a period string to extract year and period information
     */
    static parsePeriodString(periodStr: string | null | undefined): ParsedPeriod | null {
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
     */
    static formatPeriodString(year: number, period: string | number): string {
        return `${year}-${period}`;
    }

    /**
     * Get a display label for a period
     */
    static getPeriodLabel(periodStr: string): string | null {
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
     */
    static isWithinPeriod(dataPeriod: number, dataYear: number, filterMaxPeriod: number, filterYear: number): boolean {
        if (dataYear !== filterYear) return false;
        if (filterMaxPeriod === 999) return true; // 'all' periods
        return dataPeriod <= filterMaxPeriod;
    }

    /**
     * Format a date as a human-readable string
     */
    static formatDate(date: Date | string | number, format = 'MMMM D, YYYY'): string {
        if (!this._initialized) this.initialize();
        return (globalThis as any).dayjs(date).format(format);
    }

    /**
     * Get current date formatted
     */
    static now(format = 'YYYY-MM-DD'): string {
        if (!this._initialized) this.initialize();
        return (globalThis as any).dayjs().format(format);
    }

    /**
     * Validate a Dutch month name
     */
    static isValidMonthName(monthName: string): boolean {
        return this.getMonthNumber(monthName) !== null;
    }

    /**
     * Get all Dutch month names
     */
    static getAllMonthNames(): string[] {
        if (!this._initialized) this.initialize();

        const months: string[] = [];
        for (let i = 0; i < 12; i++) {
            months.push((globalThis as any).dayjs().month(i).format('MMMM'));
        }
        return months;
    }
}
