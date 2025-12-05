/**
 * PeriodParser - Utility for parsing period strings
 *
 * Handles various period formats:
 * - "All" -> 12
 * - "LTM" -> "LTM"
 * - "Q1", "Q2", "Q3", "Q4" -> 3, 6, 9, 12
 * - "P1", "P2", ..., "P12" -> 1, 2, ..., 12
 * - Direct numbers -> parsed number
 */

export type PeriodValue = string | null | undefined;
export type ParsedPeriod = number | 'LTM';

export class PeriodParser {
    /**
     * Parse period string to get numeric value or special string
     * @param periodStr - Period string (e.g., "P3", "Q1", "LTM", "All")
     * @returns Period number or "LTM"
     */
    static parse(periodStr: PeriodValue): ParsedPeriod {
        if (!periodStr || periodStr === 'All') {
            return 12; // Default to period 12 for "All"
        }

        if (periodStr === 'LTM') {
            return 'LTM';
        }

        // Handle quarter format (Q1, Q2, Q3, Q4)
        if (periodStr.startsWith('Q')) {
            const quarter = parseInt(periodStr.substring(1));
            return quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
        }

        // Handle period format (P1, P2, ..., P12)
        if (periodStr.startsWith('P')) {
            return parseInt(periodStr.substring(1));
        }

        // Try to parse as direct number
        const parsed = parseInt(periodStr);
        return isNaN(parsed) ? 12 : parsed;
    }

    /**
     * Check if period string represents LTM (Last Twelve Months)
     * @param periodStr - Period string
     * @returns True if LTM
     */
    static isLTM(periodStr: PeriodValue): boolean {
        return periodStr === 'LTM';
    }

    /**
     * Check if period string represents a quarter
     * @param periodStr - Period string
     * @returns True if quarter format (Q1-Q4)
     */
    static isQuarter(periodStr: PeriodValue): boolean {
        return periodStr != null && periodStr.startsWith('Q') && /^Q[1-4]$/.test(periodStr);
    }

    /**
     * Check if period string represents a specific period
     * @param periodStr - Period string
     * @returns True if period format (P1-P12)
     */
    static isPeriod(periodStr: PeriodValue): boolean {
        return periodStr != null && periodStr.startsWith('P') && /^P(1[0-2]|[1-9])$/.test(periodStr);
    }

    /**
     * Get the maximum period number for a given period string
     * @param periodStr - Period string
     * @returns Maximum period number
     */
    static getMaxPeriod(periodStr: PeriodValue): number {
        const parsed = this.parse(periodStr);
        return typeof parsed === 'number' ? parsed : 12;
    }

    /**
     * Convert period number to period string
     * @param periodNum - Period number (1-12)
     * @returns Period string (P1-P12)
     */
    static toPeriodString(periodNum: number): string {
        if (typeof periodNum !== 'number' || periodNum < 1 || periodNum > 12) {
            return 'P12';
        }
        return `P${periodNum}`;
    }

    /**
     * Convert quarter number to quarter string
     * @param quarterNum - Quarter number (1-4)
     * @returns Quarter string (Q1-Q4)
     */
    static toQuarterString(quarterNum: number): string {
        if (typeof quarterNum !== 'number' || quarterNum < 1 || quarterNum > 4) {
            return 'Q4';
        }
        return `Q${quarterNum}`;
    }
}

export default PeriodParser;
