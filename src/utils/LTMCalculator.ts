/**
 * LTMCalculator - Last Twelve Months calculation utility
 *
 * Calculates LTM (Last Twelve Months) values from monthly data.
 * Handles both movements (P&L) and balances (Balance Sheet) data.
 */

// Type for Arquero table - using any to avoid import issues
type Table = any;

export interface LTMRange {
    year: number;
    startPeriod: number;
    endPeriod: number;
}

export interface LatestPeriod {
    year: number;
    period: number;
}

export interface DataAvailability {
    complete: boolean;
    actualMonths: number;
    expectedMonths: number;
    message: string;
}

export interface LTMInfo {
    ranges: LTMRange[];
    label: string;
    filteredData: Table;
    hasCompleteData: boolean;
    latestYear: number;
    latestPeriod: number;
    latest: LatestPeriod;
    availability: DataAvailability;
}

export class LTMCalculator {
    /**
     * Get the latest available period from movements data
     * @param movements - Arquero table with movements data
     * @returns Latest year and period
     */
    static getLatestAvailablePeriod(movements: Table | null): LatestPeriod {
        if (!movements || movements.numRows() === 0) {
            return { year: 0, period: 0 };
        }

        const maxYear = movements.rollup({ maxYear: (d: any) => (globalThis as any).aq.op.max(d.year) }).get('maxYear', 0);
        
        if (maxYear === 0) {
            return { year: 0, period: 0 };
        }

        const yearData = movements.params({ maxYear }).filter(`(d, $) => d.year === $.maxYear`);
        const maxPeriod = yearData.rollup({ maxPeriod: (d: any) => (globalThis as any).aq.op.max(d.period) }).get('maxPeriod', 0);

        return { year: maxYear, period: maxPeriod };
    }

    /**
     * Calculate LTM range(s) for a given end period
     * @param year - End year
     * @param period - End period (1-12)
     * @param monthsBack - Number of months to go back (default: 12)
     * @returns Array of year/period ranges
     */
    static calculateLTMRange(year: number, period: number, monthsBack: number = 12): LTMRange[] {
        if (year <= 0 || period <= 0 || period > 12 || monthsBack <= 0) {
            return [];
        }

        const ranges: LTMRange[] = [];
        let currentYear = year;
        let currentPeriod = period;
        let remainingMonths = monthsBack;

        while (remainingMonths > 0) {
            const startPeriod = Math.max(1, currentPeriod - remainingMonths + 1);
            const endPeriod = currentPeriod;
            const monthsInRange = endPeriod - startPeriod + 1;

            ranges.unshift({
                year: currentYear,
                startPeriod,
                endPeriod
            });

            remainingMonths -= monthsInRange;
            currentYear--;
            currentPeriod = 12;
        }

        return ranges;
    }

    /**
     * Filter movements data for LTM periods
     * @param movements - Arquero table with movements data
     * @param ranges - Array of LTM ranges
     * @returns Filtered Arquero table
     */
    static filterMovementsForLTM(movements: Table | null, ranges: LTMRange[] | null): Table | null {
        if (!movements || !ranges || ranges.length === 0) {
            if (!movements) return null;
            return (globalThis as any).aq.from([]);
        }

        let filtered = (globalThis as any).aq.from([]);

        for (const range of ranges) {
            const rangeData = movements
                .params({ year: range.year, startPeriod: range.startPeriod, endPeriod: range.endPeriod })
                .filter('(d, $) => d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod');
            
            filtered = filtered.concat(rangeData);
        }

        return filtered;
    }

    /**
     * Generate a human-readable label for LTM ranges
     * @param ranges - Array of LTM ranges
     * @returns Label string
     */
    static generateLTMLabel(ranges: LTMRange[]): string {
        if (ranges.length === 0) {
            return 'LTM (No Data)';
        }

        const firstRange = ranges[0];
        const lastRange = ranges[ranges.length - 1];
        return `LTM (${firstRange.year} P${firstRange.startPeriod} - ${lastRange.year} P${lastRange.endPeriod})`;
    }

    /**
     * Check if LTM data is complete (has all required months)
     * @param ranges - Array of LTM ranges
     * @param availableYears - Array of available years in the data
     * @param expectedMonths - Expected number of months (default: 12)
     * @returns Object with completion status and details
     */
    static hasCompleteData(ranges: LTMRange[], availableYears: number[], expectedMonths: number = 12): DataAvailability {
        if (!ranges || ranges.length === 0) {
            return {
                complete: false,
                actualMonths: 0,
                expectedMonths,
                message: 'No LTM data available'
            };
        }

        // Calculate total months in ranges
        const totalMonths = ranges.reduce((sum, range) => {
            return sum + (range.endPeriod - range.startPeriod + 1);
        }, 0);

        // Check if all required years are available
        const requiredYears = [...new Set(ranges.map(r => r.year))];
        const missingYears = requiredYears.filter(year => !availableYears.includes(year));

        if (missingYears.length > 0) {
            return {
                complete: false,
                actualMonths: totalMonths,
                expectedMonths,
                message: `Missing data for year(s): ${missingYears.join(', ')}`
            };
        }

        const complete = totalMonths >= expectedMonths;

        return {
            complete,
            actualMonths: totalMonths,
            expectedMonths,
            message: complete 
                ? 'Complete LTM data available'
                : `Only ${totalMonths} month${totalMonths === 1 ? '' : 's'} available (need ${expectedMonths})`
        };
    }

    /**
     * Calculate LTM information including ranges, filtered data, and metadata
     * @param movements - Arquero table with movements data
     * @param availableYears - Array of available years
     * @param monthsBack - Number of months to go back (default: 12)
     * @returns LTM information object
     */
    static calculateLTMInfo(movements: Table, availableYears: number[], monthsBack: number = 12): LTMInfo {
        const latest = this.getLatestAvailablePeriod(movements);
        
        if (latest.year === 0) {
            const emptyAvailability: DataAvailability = {
                complete: false,
                actualMonths: 0,
                expectedMonths: monthsBack,
                message: 'No data available'
            };
            
            return {
                ranges: [],
                label: 'LTM (No Data)',
                filteredData: (globalThis as any).aq.from([]),
                hasCompleteData: false,
                latestYear: 0,
                latestPeriod: 0,
                latest: { year: 0, period: 0 },
                availability: emptyAvailability
            };
        }

        const ranges = this.calculateLTMRange(latest.year, latest.period, monthsBack);
        const filteredData = this.filterMovementsForLTM(movements, ranges) || (globalThis as any).aq.from([]);
        const label = this.generateLTMLabel(ranges);
        const availability = this.hasCompleteData(ranges, availableYears, monthsBack);

        return {
            ranges,
            label,
            filteredData,
            hasCompleteData: availability.complete,
            latestYear: latest.year,
            latestPeriod: latest.period,
            latest,
            availability
        };
    }
}

export default LTMCalculator;
