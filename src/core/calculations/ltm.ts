/**
 * Last Twelve Months (LTM) Calculation Functions
 *
 * Pure functions for calculating LTM (Last Twelve Months) values from monthly data.
 * Handles both movements (P&L) and balances (Balance Sheet) data.
 *
 * @module core/calculations/ltm
 */

import { Option, some, none } from "../utils/option.ts";

// ============================================================================
// Types
// ============================================================================

/**
 * Arquero table type (using any to avoid import issues)
 */
type Table = any;

/**
 * LTM range representing a continuous period within a year
 */
export interface LTMRange {
  readonly year: number;
  readonly startPeriod: number;
  readonly endPeriod: number;
}

/**
 * Latest available period in the data
 */
export interface LatestPeriod {
  readonly year: number;
  readonly period: number;
}

/**
 * Data availability information
 */
export interface DataAvailability {
  readonly complete: boolean;
  readonly actualMonths: number;
  readonly expectedMonths: number;
  readonly message: string;
}

/**
 * Complete LTM information
 */
export interface LTMInfo {
  readonly ranges: readonly LTMRange[];
  readonly label: string;
  readonly filteredData: Table;
  readonly hasCompleteData: boolean;
  readonly latestYear: number;
  readonly latestPeriod: number;
  readonly latest: LatestPeriod;
  readonly availability: DataAvailability;
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Get the latest available period from movements data
 *
 * @param movements - Arquero table with movements data
 * @returns Option containing latest year and period
 *
 * @example
 * const latest = getLatestAvailablePeriod(movements)
 * if (latest.some) {
 *   console.log(`Latest: ${latest.value.year} P${latest.value.period}`)
 * }
 */
export const getLatestAvailablePeriod = (
  movements: Table | null,
): Option<LatestPeriod> => {
  if (!movements || movements.numRows() === 0) {
    return none();
  }

  const maxYear = movements
    .rollup({
      maxYear: (d: any) => (globalThis as any).aq.op.max(d.year),
    })
    .get("maxYear", 0);

  if (maxYear === 0) {
    return none();
  }

  const yearData = movements
    .params({ maxYear })
    .filter(`(d, $) => d.year === $.maxYear`);

  const maxPeriod = yearData
    .rollup({
      maxPeriod: (d: any) => (globalThis as any).aq.op.max(d.period),
    })
    .get("maxPeriod", 0);

  return some({ year: maxYear, period: maxPeriod });
};

/**
 * Calculate LTM range(s) for a given end period
 *
 * Returns an array of ranges that span the requested number of months back.
 * Handles year boundaries automatically.
 *
 * @param year - End year
 * @param period - End period (1-12)
 * @param monthsBack - Number of months to go back (default: 12)
 * @returns Array of year/period ranges
 *
 * @example
 * calculateLTMRange(2024, 6, 12)
 * // Returns ranges covering July 2023 - June 2024
 */
export const calculateLTMRange = (
  year: number,
  period: number,
  monthsBack: number = 12,
): readonly LTMRange[] => {
  // Validate inputs
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
      endPeriod,
    });

    remainingMonths -= monthsInRange;
    currentYear--;
    currentPeriod = 12;
  }

  return ranges;
};

/**
 * Calculate total months covered by LTM ranges
 *
 * @param ranges - Array of LTM ranges
 * @returns Total number of months
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * getTotalMonths(ranges) // 12
 */
export const getTotalMonths = (ranges: readonly LTMRange[]): number =>
  ranges.reduce(
    (sum, range) => sum + (range.endPeriod - range.startPeriod + 1),
    0,
  );

/**
 * Get all unique years from LTM ranges
 *
 * @param ranges - Array of LTM ranges
 * @returns Array of unique years
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * getRequiredYears(ranges) // [2023, 2024]
 */
export const getRequiredYears = (ranges: readonly LTMRange[]): number[] =>
  [...new Set(ranges.map((r) => r.year))].sort();

/**
 * Filter movements data for LTM periods
 *
 * @param movements - Arquero table with movements data
 * @param ranges - Array of LTM ranges
 * @returns Filtered Arquero table
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * const ltmData = filterMovementsForLTM(movements, ranges)
 */
export const filterMovementsForLTM = (
  movements: Table | null,
  ranges: readonly LTMRange[],
): Table => {
  if (!movements || ranges.length === 0) {
    return (globalThis as any).aq.from([]);
  }

  let filtered = (globalThis as any).aq.from([]);

  for (const range of ranges) {
    const rangeData = movements
      .params({
        year: range.year,
        startPeriod: range.startPeriod,
        endPeriod: range.endPeriod,
      })
      .filter(
        "(d, $) => d.year === $.year && d.period >= $.startPeriod && d.period <= $.endPeriod",
      );

    filtered = filtered.concat(rangeData);
  }

  return filtered;
};

// ============================================================================
// Label Generation Functions
// ============================================================================

/**
 * Generate a human-readable label for LTM ranges
 *
 * @param ranges - Array of LTM ranges
 * @returns Label string
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * generateLTMLabel(ranges) // "LTM (2023 P7 - 2024 P6)"
 */
export const generateLTMLabel = (ranges: readonly LTMRange[]): string => {
  if (ranges.length === 0) {
    return "LTM (No Data)";
  }

  const firstRange = ranges[0];
  const lastRange = ranges[ranges.length - 1];

  return `LTM (${firstRange.year} P${firstRange.startPeriod} - ${lastRange.year} P${lastRange.endPeriod})`;
};

/**
 * Generate a short label for LTM
 *
 * @param ranges - Array of LTM ranges
 * @returns Short label string
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * generateShortLabel(ranges) // "LTM 2024 P6"
 */
export const generateShortLabel = (ranges: readonly LTMRange[]): string => {
  if (ranges.length === 0) {
    return "LTM";
  }

  const lastRange = ranges[ranges.length - 1];
  return `LTM ${lastRange.year} P${lastRange.endPeriod}`;
};

// ============================================================================
// Data Availability Functions
// ============================================================================

/**
 * Check if LTM data is complete (has all required months)
 *
 * @param ranges - Array of LTM ranges
 * @param availableYears - Array of available years in the data
 * @param expectedMonths - Expected number of months (default: 12)
 * @returns Data availability information
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * const availability = checkDataAvailability(ranges, [2023, 2024])
 * if (availability.complete) {
 *   console.log("Complete LTM data available")
 * }
 */
export const checkDataAvailability = (
  ranges: readonly LTMRange[],
  availableYears: readonly number[],
  expectedMonths: number = 12,
): DataAvailability => {
  if (!ranges || ranges.length === 0) {
    return {
      complete: false,
      actualMonths: 0,
      expectedMonths,
      message: "No LTM data available",
    };
  }

  // Calculate total months in ranges
  const totalMonths = getTotalMonths(ranges);

  // Check if all required years are available
  const requiredYears = getRequiredYears(ranges);
  const missingYears = requiredYears.filter(
    (year) => !availableYears.includes(year),
  );

  if (missingYears.length > 0) {
    return {
      complete: false,
      actualMonths: totalMonths,
      expectedMonths,
      message: `Missing data for year(s): ${missingYears.join(", ")}`,
    };
  }

  const complete = totalMonths >= expectedMonths;

  return {
    complete,
    actualMonths: totalMonths,
    expectedMonths,
    message: complete
      ? "Complete LTM data available"
      : `Only ${totalMonths} month${totalMonths === 1 ? "" : "s"} available (need ${expectedMonths})`,
  };
};

/**
 * Check if specific year is available
 *
 * @param year - Year to check
 * @param availableYears - Array of available years
 * @returns True if year is available
 *
 * @example
 * isYearAvailable(2024, [2023, 2024, 2025]) // true
 */
export const isYearAvailable = (
  year: number,
  availableYears: readonly number[],
): boolean => availableYears.includes(year);

/**
 * Get missing years from required years
 *
 * @param requiredYears - Years required for LTM
 * @param availableYears - Years available in data
 * @returns Array of missing years
 *
 * @example
 * getMissingYears([2023, 2024], [2024, 2025]) // [2023]
 */
export const getMissingYears = (
  requiredYears: readonly number[],
  availableYears: readonly number[],
): number[] =>
  requiredYears.filter((year) => !availableYears.includes(year));

// ============================================================================
// Complete LTM Calculation
// ============================================================================

/**
 * Calculate complete LTM information
 *
 * This is the main function that combines all LTM calculations into a single result.
 *
 * @param movements - Arquero table with movements data
 * @param availableYears - Array of available years
 * @param monthsBack - Number of months to go back (default: 12)
 * @returns Complete LTM information
 *
 * @example
 * const ltmInfo = calculateLTMInfo(movements, [2023, 2024])
 * console.log(ltmInfo.label)
 * console.log(ltmInfo.availability.message)
 */
export const calculateLTMInfo = (
  movements: Table,
  availableYears: readonly number[],
  monthsBack: number = 12,
): LTMInfo => {
  const latestOption = getLatestAvailablePeriod(movements);

  // Handle case where no data is available
  if (!latestOption.some) {
    const emptyAvailability: DataAvailability = {
      complete: false,
      actualMonths: 0,
      expectedMonths: monthsBack,
      message: "No data available",
    };

    return {
      ranges: [],
      label: "LTM (No Data)",
      filteredData: (globalThis as any).aq.from([]),
      hasCompleteData: false,
      latestYear: 0,
      latestPeriod: 0,
      latest: { year: 0, period: 0 },
      availability: emptyAvailability,
    };
  }

  const latest = latestOption.value;
  const ranges = calculateLTMRange(latest.year, latest.period, monthsBack);
  const filteredData = filterMovementsForLTM(movements, ranges);
  const label = generateLTMLabel(ranges);
  const availability = checkDataAvailability(ranges, availableYears, monthsBack);

  return {
    ranges,
    label,
    filteredData,
    hasCompleteData: availability.complete,
    latestYear: latest.year,
    latestPeriod: latest.period,
    latest,
    availability,
  };
};

// ============================================================================
// Curried Functions for Composition
// ============================================================================

/**
 * Create an LTM calculator with fixed months back
 *
 * @param monthsBack - Number of months to go back
 * @returns Function that calculates LTM info
 *
 * @example
 * const calculate12MonthLTM = createLTMCalculator(12)
 * const ltmInfo = calculate12MonthLTM(movements, [2023, 2024])
 */
export const createLTMCalculator = (monthsBack: number) =>
  (movements: Table, availableYears: readonly number[]): LTMInfo =>
    calculateLTMInfo(movements, availableYears, monthsBack);

/**
 * Create a range calculator with fixed months back
 *
 * @param monthsBack - Number of months to go back
 * @returns Function that calculates ranges
 *
 * @example
 * const calculate12MonthRange = createRangeCalculator(12)
 * const ranges = calculate12MonthRange(2024, 6)
 */
export const createRangeCalculator = (monthsBack: number) =>
  (year: number, period: number): readonly LTMRange[] =>
    calculateLTMRange(year, period, monthsBack);

/**
 * Create a data filter with fixed ranges
 *
 * @param ranges - LTM ranges to filter by
 * @returns Function that filters movements
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * const filterLTM = createDataFilter(ranges)
 * const ltmData = filterLTM(movements)
 */
export const createDataFilter = (ranges: readonly LTMRange[]) =>
  (movements: Table): Table =>
    filterMovementsForLTM(movements, ranges);

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate LTM range parameters
 *
 * @param year - Year to validate
 * @param period - Period to validate
 * @param monthsBack - Months back to validate
 * @returns True if parameters are valid
 *
 * @example
 * isValidLTMParams(2024, 6, 12) // true
 * isValidLTMParams(2024, 13, 12) // false
 */
export const isValidLTMParams = (
  year: number,
  period: number,
  monthsBack: number,
): boolean =>
  year > 0 && period >= 1 && period <= 12 && monthsBack > 0;

/**
 * Validate LTM range
 *
 * @param range - Range to validate
 * @returns True if range is valid
 *
 * @example
 * isValidRange({ year: 2024, startPeriod: 1, endPeriod: 6 }) // true
 * isValidRange({ year: 2024, startPeriod: 13, endPeriod: 6 }) // false
 */
export const isValidRange = (range: LTMRange): boolean =>
  range.year > 0 &&
  range.startPeriod >= 1 &&
  range.startPeriod <= 12 &&
  range.endPeriod >= 1 &&
  range.endPeriod <= 12 &&
  range.startPeriod <= range.endPeriod;

/**
 * Validate all ranges in array
 *
 * @param ranges - Ranges to validate
 * @returns True if all ranges are valid
 *
 * @example
 * const ranges = calculateLTMRange(2024, 6, 12)
 * areValidRanges(ranges) // true
 */
export const areValidRanges = (ranges: readonly LTMRange[]): boolean =>
  ranges.length > 0 && ranges.every(isValidRange);
