/**
 * Variance Calculations - Pure Functions
 * 
 * Functional implementation of variance calculations between periods.
 * All functions are pure - no side effects, no state, fully testable.
 */

/**
 * Variance calculation result
 */
export interface VarianceResult {
    amount: number;
    percent: number;
}

/**
 * Row object with amount properties for both years
 */
export interface RowWithAmounts {
    amount_2024?: number;
    amount_2025?: number;
    [key: string]: unknown;
}

/**
 * Totals object with year1 and year2 properties
 */
export interface TotalsObject {
    year1?: number;
    year2?: number;
    [key: string]: unknown;
}

/**
 * Object with year keys as string indices
 */
export type YearAmounts = Record<string, number>;

/**
 * Calculate variance amount between two values
 * 
 * @param current - Current period value
 * @param prior - Prior period value
 * @returns Variance amount (current - prior)
 * 
 * @example
 * calculateVarianceAmount(120, 100); // 20
 * calculateVarianceAmount(80, 100);  // -20
 */
export const calculateVarianceAmount = (
    current: number,
    prior: number
): number => current - prior;

/**
 * Calculate variance percentage between two values
 * 
 * @param current - Current period value
 * @param prior - Prior period value
 * @returns Variance percentage ((current - prior) / |prior| * 100)
 * 
 * @example
 * calculateVariancePercent(120, 100); // 20
 * calculateVariancePercent(80, 100);  // -20
 * calculateVariancePercent(100, 0);   // 0 (handles division by zero)
 */
export const calculateVariancePercent = (
    current: number,
    prior: number
): number =>
    prior !== 0 
        ? ((current - prior) / Math.abs(prior)) * 100 
        : 0;

/**
 * Calculate both variance amount and percentage
 * 
 * @param current - Current period value
 * @param prior - Prior period value
 * @returns Object with amount and percent properties
 * 
 * @example
 * calculateVariance(120, 100);
 * // { amount: 20, percent: 20 }
 */
export const calculateVariance = (
    current: number,
    prior: number
): VarianceResult => ({
    amount: calculateVarianceAmount(current, prior),
    percent: calculateVariancePercent(current, prior)
});

/**
 * Calculate variance for a metric object with year keys
 * Curried for partial application
 * 
 * @param yearCurrent - Current year key
 * @param yearPrior - Prior year key
 * @returns Function that takes metric and returns variance
 * 
 * @example
 * const calc2025vs2024 = calculateForMetric('2025', '2024');
 * calc2025vs2024({ '2024': 100, '2025': 120 });
 * // { amount: 20, percent: 20 }
 */
export const calculateForMetric = (
    yearCurrent: string,
    yearPrior: string
) => (metric: YearAmounts): VarianceResult =>
    calculateVariance(
        metric[yearCurrent] || 0,
        metric[yearPrior] || 0
    );

/**
 * Calculate variance for a row with amount_2024 and amount_2025 properties
 * 
 * @param row - Row object with amount properties
 * @returns Variance result (2025 vs 2024)
 * 
 * @example
 * calculateForRow({ amount_2024: 100, amount_2025: 120 });
 * // { amount: 20, percent: 20 }
 */
export const calculateForRow = (row: RowWithAmounts): VarianceResult =>
    calculateVariance(
        row.amount_2025 || 0,
        row.amount_2024 || 0
    );

/**
 * Calculate variance for two amounts with specified year keys
 * Curried for partial application
 * 
 * @param year1 - First year key (prior)
 * @param year2 - Second year key (current)
 * @returns Function that takes amounts and returns variance
 * 
 * @example
 * const calcYears = calculateForYears('2024', '2025');
 * calcYears({ '2024': 100, '2025': 120 });
 * // { amount: 20, percent: 20 }
 */
export const calculateForYears = (
    year1: string,
    year2: string
) => (amounts: YearAmounts): VarianceResult => {
    const prior = amounts[year1] || 0;
    const current = amounts[year2] || 0;
    return calculateVariance(current, prior);
};

/**
 * Calculate variance for totals object with year1/year2 properties
 * 
 * @param totals - Object with year1 and year2 properties
 * @returns Variance result (year2 vs year1)
 * 
 * @example
 * calculateForTotals({ year1: 100, year2: 120 });
 * // { amount: 20, percent: 20 }
 */
export const calculateForTotals = (totals: TotalsObject): VarianceResult =>
    calculateVariance(
        totals.year2 || 0,
        totals.year1 || 0
    );

/**
 * Create a variance calculator for specific years
 * Returns an object with all calculation methods pre-configured
 * 
 * @param year1 - First year (prior)
 * @param year2 - Second year (current)
 * @returns Object with calculation methods
 * 
 * @example
 * const calc = createVarianceCalculator('2024', '2025');
 * calc.forMetric({ '2024': 100, '2025': 120 });
 * // { amount: 20, percent: 20 }
 */
export const createVarianceCalculator = (year1: string, year2: string) => ({
    forMetric: calculateForMetric(year2, year1),
    forYears: calculateForYears(year1, year2),
    calculate: calculateVariance,
    amount: calculateVarianceAmount,
    percent: calculateVariancePercent
});
