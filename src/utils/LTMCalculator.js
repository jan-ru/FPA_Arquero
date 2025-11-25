/**
 * LTMCalculator - Latest Twelve Months calculation utility
 *
 * Responsibilities:
 * - Calculate the most recent 12 consecutive months of available data
 * - Support LTM periods that span across fiscal year boundaries
 * - Generate display labels for LTM periods
 * - Validate data availability for LTM calculations
 * - Filter movements table for LTM date ranges
 *
 * @module LTMCalculator
 */

/**
 * @typedef {Object} LatestPeriod
 * @property {number} year - The latest year with data
 * @property {number} period - The latest period (1-12) in that year
 */

/**
 * @typedef {Object} LTMRange
 * @property {number} year - Year for this range segment
 * @property {number} startPeriod - Starting period (1-12) inclusive
 * @property {number} endPeriod - Ending period (1-12) inclusive
 */

/**
 * @typedef {Object} DataAvailability
 * @property {boolean} complete - Whether full 12 months are available
 * @property {number} actualMonths - Actual number of months available
 * @property {string} message - Description of data availability
 */

export class LTMCalculator {
    /**
     * Get the latest available period from the movements table
     *
     * @param {Object} movementsTable - Arquero table with movements data
     * @returns {LatestPeriod} Latest year and period
     *
     * @example
     * const latest = LTMCalculator.getLatestAvailablePeriod(movements);
     * // Returns: { year: 2025, period: 6 }
     */
    static getLatestAvailablePeriod(movementsTable) {
        if (!movementsTable || movementsTable.numRows() === 0) {
            return { year: 0, period: 0 };
        }

        try {
            // Get max year
            const maxYear = movementsTable
                .rollup({ maxYear: d => aq.op.max(d.year) })
                .get('maxYear', 0);

            if (!maxYear) {
                return { year: 0, period: 0 };
            }

            // Get max period for that year
            const maxPeriod = movementsTable
                .filter(d => d.year === maxYear)
                .rollup({ maxPeriod: d => aq.op.max(d.period) })
                .get('maxPeriod', 0);

            return { year: maxYear, period: maxPeriod };
        } catch (error) {
            console.error('Error getting latest available period:', error);
            return { year: 0, period: 0 };
        }
    }

    /**
     * Calculate which periods to include in LTM (walking backwards from latest)
     *
     * @param {number} latestYear - The latest year with data
     * @param {number} latestPeriod - The latest period (1-12) in that year
     * @param {number} monthsCount - Number of months to include (default: 12)
     * @returns {LTMRange[]} Array of range objects defining the LTM period
     *
     * @example
     * // Latest data: 2025 P6
     * const ranges = LTMCalculator.calculateLTMRange(2025, 6, 12);
     * // Returns: [
     * //   { year: 2024, startPeriod: 7, endPeriod: 12 },
     * //   { year: 2025, startPeriod: 1, endPeriod: 6 }
     * // ]
     *
     * @example
     * // Latest data: 2025 P12
     * const ranges = LTMCalculator.calculateLTMRange(2025, 12, 12);
     * // Returns: [{ year: 2025, startPeriod: 1, endPeriod: 12 }]
     */
    static calculateLTMRange(latestYear, latestPeriod, monthsCount = 12) {
        const ranges = [];

        if (!latestYear || !latestPeriod || monthsCount <= 0) {
            return ranges;
        }

        // Walk backwards from latest period to build ranges
        let remainingMonths = monthsCount;
        let currentYear = latestYear;
        let currentPeriod = latestPeriod;

        while (remainingMonths > 0 && currentYear > 0) {
            if (currentPeriod >= remainingMonths) {
                // All remaining months fit in current year
                ranges.unshift({
                    year: currentYear,
                    startPeriod: currentPeriod - remainingMonths + 1,
                    endPeriod: currentPeriod
                });
                remainingMonths = 0;
            } else {
                // Need to go to previous year
                ranges.unshift({
                    year: currentYear,
                    startPeriod: 1,
                    endPeriod: currentPeriod
                });
                remainingMonths -= currentPeriod;
                currentYear--;
                currentPeriod = 12;
            }
        }

        return ranges;
    }

    /**
     * Filter movements table to include only LTM periods
     *
     * @param {Object} movementsTable - Arquero table with movements data
     * @param {LTMRange[]} ltmRanges - Array of range objects from calculateLTMRange
     * @returns {Object} Filtered Arquero table containing only LTM movements
     *
     * @example
     * const ltmRanges = [
     *   { year: 2024, startPeriod: 7, endPeriod: 12 },
     *   { year: 2025, startPeriod: 1, endPeriod: 6 }
     * ];
     * const ltmData = LTMCalculator.filterMovementsForLTM(movements, ltmRanges);
     */
    static filterMovementsForLTM(movementsTable, ltmRanges) {
        if (!movementsTable || !ltmRanges || ltmRanges.length === 0) {
            // Return empty table with same structure
            return movementsTable ? movementsTable.filter(() => false) : null;
        }

        try {
            // Start with empty table
            let filtered = movementsTable.filter(() => false);

            // Add each range to the result
            for (const range of ltmRanges) {
                const rangeData = movementsTable
                    .params({
                        year: range.year,
                        startPeriod: range.startPeriod,
                        endPeriod: range.endPeriod
                    })
                    .filter('(d, $) => d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod');

                filtered = filtered.concat(rangeData);
            }

            return filtered;
        } catch (error) {
            console.error('Error filtering movements for LTM:', error);
            return movementsTable.filter(() => false);
        }
    }

    /**
     * Generate display label for LTM period
     *
     * @param {LTMRange[]} ltmRanges - Array of range objects from calculateLTMRange
     * @returns {string} Formatted label for display (e.g., "LTM (2024 P7 - 2025 P6)")
     *
     * @example
     * const ranges = [
     *   { year: 2024, startPeriod: 7, endPeriod: 12 },
     *   { year: 2025, startPeriod: 1, endPeriod: 6 }
     * ];
     * const label = LTMCalculator.generateLTMLabel(ranges);
     * // Returns: "LTM (2024 P7 - 2025 P6)"
     *
     * @example
     * const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 12 }];
     * const label = LTMCalculator.generateLTMLabel(ranges);
     * // Returns: "LTM (2025 P1 - 2025 P12)"
     */
    static generateLTMLabel(ltmRanges) {
        if (!ltmRanges || ltmRanges.length === 0) {
            return 'LTM (No Data)';
        }

        const firstRange = ltmRanges[0];
        const lastRange = ltmRanges[ltmRanges.length - 1];

        return `LTM (${firstRange.year} P${firstRange.startPeriod} - ${lastRange.year} P${lastRange.endPeriod})`;
    }

    /**
     * Check if complete 12 months of data are available for LTM
     *
     * @param {LTMRange[]} ltmRanges - Array of range objects from calculateLTMRange
     * @param {number[]} availableYears - Array of years with loaded data
     * @returns {DataAvailability} Object describing data completeness
     *
     * @example
     * const ranges = [
     *   { year: 2024, startPeriod: 7, endPeriod: 12 },
     *   { year: 2025, startPeriod: 1, endPeriod: 6 }
     * ];
     * const availability = LTMCalculator.hasCompleteData(ranges, [2024, 2025]);
     * // Returns: { complete: true, actualMonths: 12, message: "Complete LTM data available" }
     *
     * @example
     * const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 3 }];
     * const availability = LTMCalculator.hasCompleteData(ranges, [2025]);
     * // Returns: { complete: false, actualMonths: 3, message: "Only 3 months available (need 12)" }
     */
    static hasCompleteData(ltmRanges, availableYears) {
        if (!ltmRanges || ltmRanges.length === 0) {
            return {
                complete: false,
                actualMonths: 0,
                message: 'No LTM data available'
            };
        }

        // Calculate total months in ranges
        let totalMonths = 0;
        for (const range of ltmRanges) {
            totalMonths += range.endPeriod - range.startPeriod + 1;
        }

        // Check if all required years are available
        const requiredYears = [...new Set(ltmRanges.map(r => r.year))];
        const missingYears = requiredYears.filter(year => !availableYears.includes(year));

        if (missingYears.length > 0) {
            return {
                complete: false,
                actualMonths: totalMonths,
                message: `Missing data for year(s): ${missingYears.join(', ')}`
            };
        }

        if (totalMonths < 12) {
            return {
                complete: false,
                actualMonths: totalMonths,
                message: `Only ${totalMonths} month${totalMonths !== 1 ? 's' : ''} available (need 12)`
            };
        }

        return {
            complete: true,
            actualMonths: totalMonths,
            message: 'Complete LTM data available'
        };
    }

    /**
     * Get all information needed for LTM calculation in one call
     * Convenience method that combines multiple calculations
     *
     * @param {Object} movementsTable - Arquero table with movements data
     * @param {number[]} availableYears - Array of years with loaded data
     * @param {number} monthsCount - Number of months to include (default: 12)
     * @returns {Object} Complete LTM information
     * @returns {LatestPeriod} return.latest - Latest available period
     * @returns {LTMRange[]} return.ranges - LTM period ranges
     * @returns {Object} return.filteredData - Filtered movements table
     * @returns {string} return.label - Display label
     * @returns {DataAvailability} return.availability - Data availability info
     *
     * @example
     * const ltmInfo = LTMCalculator.calculateLTMInfo(movements, [2024, 2025], 12);
     * // Returns: {
     * //   latest: { year: 2025, period: 6 },
     * //   ranges: [{ year: 2024, startPeriod: 7, endPeriod: 12 }, ...],
     * //   filteredData: <Arquero table>,
     * //   label: "LTM (2024 P7 - 2025 P6)",
     * //   availability: { complete: true, actualMonths: 12, message: "..." }
     * // }
     */
    static calculateLTMInfo(movementsTable, availableYears, monthsCount = 12) {
        const latest = this.getLatestAvailablePeriod(movementsTable);
        const ranges = this.calculateLTMRange(latest.year, latest.period, monthsCount);
        const filteredData = this.filterMovementsForLTM(movementsTable, ranges);
        const label = this.generateLTMLabel(ranges);
        const availability = this.hasCompleteData(ranges, availableYears);

        return {
            latest,
            ranges,
            filteredData,
            label,
            availability
        };
    }
}

export default LTMCalculator;
