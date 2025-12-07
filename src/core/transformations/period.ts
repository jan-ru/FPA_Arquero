/**
 * Period Parsing Functions
 *
 * Pure functions for parsing and manipulating period strings.
 * Handles various period formats:
 * - "All" -> 12
 * - "LTM" -> "LTM"
 * - "Q1", "Q2", "Q3", "Q4" -> 3, 6, 9, 12
 * - "P1", "P2", ..., "P12" -> 1, 2, ..., 12
 * - Direct numbers -> parsed number
 *
 * @module core/transformations/period
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Period value can be a string, null, or undefined
 */
export type PeriodValue = string | null | undefined;

/**
 * Parsed period is either a number (1-12) or the special "LTM" string
 */
export type ParsedPeriod = number | "LTM";

/**
 * Period format discriminated union
 */
export type PeriodFormat =
  | { type: "empty"; value: null | undefined | "" }
  | { type: "all"; value: "All" }
  | { type: "ltm"; value: "LTM" }
  | { type: "quarter"; quarter: number }
  | { type: "period"; period: number }
  | { type: "number"; value: number }
  | { type: "invalid"; value: string };

// ============================================================================
// Core Parsing Functions
// ============================================================================

/**
 * Parse a period string into a structured format
 *
 * @param periodStr - Period string to parse
 * @returns Structured period format
 *
 * @example
 * parsePeriodFormat("Q2") // { type: "quarter", quarter: 2 }
 * parsePeriodFormat("P6") // { type: "period", period: 6 }
 * parsePeriodFormat("LTM") // { type: "ltm", value: "LTM" }
 */
export const parsePeriodFormat = (periodStr: PeriodValue): PeriodFormat => {
  // Handle empty/null/undefined
  if (!periodStr || periodStr === "") {
    return { type: "empty", value: periodStr };
  }

  // Handle "All"
  if (periodStr === "All") {
    return { type: "all", value: "All" };
  }

  // Handle "LTM"
  if (periodStr === "LTM") {
    return { type: "ltm", value: "LTM" };
  }

  // Handle quarter format (Q1-Q4)
  if (periodStr.startsWith("Q")) {
    const quarter = parseInt(periodStr.substring(1), 10);
    if (!isNaN(quarter) && quarter >= 1 && quarter <= 4) {
      return { type: "quarter", quarter };
    }
  }

  // Handle period format (P1-P12)
  if (periodStr.startsWith("P")) {
    const period = parseInt(periodStr.substring(1), 10);
    if (!isNaN(period) && period >= 1 && period <= 12) {
      return { type: "period", period };
    }
  }

  // Try to parse as direct number
  const parsed = parseInt(periodStr, 10);
  if (!isNaN(parsed)) {
    return { type: "number", value: parsed };
  }

  // Invalid format
  return { type: "invalid", value: periodStr };
};

/**
 * Convert period format to numeric value or "LTM"
 *
 * @param format - Structured period format
 * @returns Period number (1-12) or "LTM"
 *
 * @example
 * formatToValue({ type: "quarter", quarter: 2 }) // 6
 * formatToValue({ type: "ltm", value: "LTM" }) // "LTM"
 */
export const formatToValue = (format: PeriodFormat): ParsedPeriod => {
  switch (format.type) {
    case "empty":
    case "all":
      return 12;
    case "ltm":
      return "LTM";
    case "quarter":
      return format.quarter * 3;
    case "period":
      return format.period;
    case "number":
      return format.value;
    case "invalid":
      return 12; // Default to 12 for invalid input
  }
};

/**
 * Parse period string to get numeric value or "LTM"
 *
 * This is the main parsing function that combines format parsing and value extraction.
 *
 * @param periodStr - Period string (e.g., "P3", "Q1", "LTM", "All")
 * @returns Period number (1-12) or "LTM"
 *
 * @example
 * parsePeriod("Q2") // 6
 * parsePeriod("P6") // 6
 * parsePeriod("LTM") // "LTM"
 * parsePeriod("All") // 12
 * parsePeriod(null) // 12
 */
export const parsePeriod = (periodStr: PeriodValue): ParsedPeriod =>
  formatToValue(parsePeriodFormat(periodStr));

// ============================================================================
// Type Checking Functions
// ============================================================================

/**
 * Check if period string represents LTM (Last Twelve Months)
 *
 * @param periodStr - Period string
 * @returns True if LTM (case-sensitive)
 *
 * @example
 * isLTM("LTM") // true
 * isLTM("ltm") // false
 * isLTM("P12") // false
 */
export const isLTM = (periodStr: PeriodValue): boolean =>
  periodStr === "LTM";

/**
 * Check if period string represents a quarter (Q1-Q4)
 *
 * @param periodStr - Period string
 * @returns True if valid quarter format
 *
 * @example
 * isQuarter("Q2") // true
 * isQuarter("Q5") // false
 * isQuarter("P2") // false
 */
export const isQuarter = (periodStr: PeriodValue): boolean => {
  if (!periodStr) return false;
  const format = parsePeriodFormat(periodStr);
  return format.type === "quarter";
};

/**
 * Check if period string represents a specific period (P1-P12)
 *
 * @param periodStr - Period string
 * @returns True if valid period format
 *
 * @example
 * isPeriod("P6") // true
 * isPeriod("P13") // false
 * isPeriod("Q2") // false
 */
export const isPeriod = (periodStr: PeriodValue): boolean => {
  if (!periodStr) return false;
  const format = parsePeriodFormat(periodStr);
  return format.type === "period";
};

/**
 * Check if period string represents "All"
 *
 * @param periodStr - Period string
 * @returns True if "All"
 *
 * @example
 * isAll("All") // true
 * isAll("P12") // false
 */
export const isAll = (periodStr: PeriodValue): boolean =>
  periodStr === "All";

/**
 * Check if period string is empty/null/undefined
 *
 * @param periodStr - Period string
 * @returns True if empty
 *
 * @example
 * isEmpty(null) // true
 * isEmpty("") // true
 * isEmpty("P6") // false
 */
export const isEmpty = (periodStr: PeriodValue): boolean =>
  !periodStr || periodStr === "";

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Get the maximum period number for a given period string
 *
 * For LTM, returns 12. For other formats, returns the numeric value.
 *
 * @param periodStr - Period string
 * @returns Maximum period number (1-12)
 *
 * @example
 * getMaxPeriod("P6") // 6
 * getMaxPeriod("Q2") // 6
 * getMaxPeriod("LTM") // 12
 * getMaxPeriod("All") // 12
 */
export const getMaxPeriod = (periodStr: PeriodValue): number => {
  const parsed = parsePeriod(periodStr);
  return typeof parsed === "number" ? parsed : 12;
};

/**
 * Convert period number to period string (P1-P12)
 *
 * @param periodNum - Period number (1-12)
 * @returns Period string (P1-P12), defaults to P12 for invalid input
 *
 * @example
 * toPeriodString(6) // "P6"
 * toPeriodString(0) // "P12"
 * toPeriodString(13) // "P12"
 */
export const toPeriodString = (periodNum: number): string => {
  if (typeof periodNum !== "number" || periodNum < 1 || periodNum > 12) {
    return "P12";
  }
  return `P${periodNum}`;
};

/**
 * Convert quarter number to quarter string (Q1-Q4)
 *
 * @param quarterNum - Quarter number (1-4)
 * @returns Quarter string (Q1-Q4), defaults to Q4 for invalid input
 *
 * @example
 * toQuarterString(2) // "Q2"
 * toQuarterString(0) // "Q4"
 * toQuarterString(5) // "Q4"
 */
export const toQuarterString = (quarterNum: number): string => {
  if (typeof quarterNum !== "number" || quarterNum < 1 || quarterNum > 4) {
    return "Q4";
  }
  return `Q${quarterNum}`;
};

/**
 * Convert period number to quarter number
 *
 * @param periodNum - Period number (1-12)
 * @returns Quarter number (1-4)
 *
 * @example
 * periodToQuarter(1) // 1
 * periodToQuarter(6) // 2
 * periodToQuarter(12) // 4
 */
export const periodToQuarter = (periodNum: number): number =>
  Math.ceil(periodNum / 3);

/**
 * Convert quarter number to period number (end of quarter)
 *
 * @param quarterNum - Quarter number (1-4)
 * @returns Period number (3, 6, 9, or 12)
 *
 * @example
 * quarterToPeriod(1) // 3
 * quarterToPeriod(2) // 6
 * quarterToPeriod(4) // 12
 */
export const quarterToPeriod = (quarterNum: number): number =>
  quarterNum * 3;

// ============================================================================
// Curried Functions for Composition
// ============================================================================

/**
 * Create a period filter function
 *
 * Returns a function that checks if a period string matches the target period.
 *
 * @param targetPeriod - Target period to match
 * @returns Filter function
 *
 * @example
 * const isQ2 = matchesPeriod("Q2")
 * isQ2("Q2") // true
 * isQ2("Q1") // false
 */
export const matchesPeriod = (targetPeriod: PeriodValue) =>
  (periodStr: PeriodValue): boolean =>
    parsePeriod(periodStr) === parsePeriod(targetPeriod);

/**
 * Create a period range filter function
 *
 * Returns a function that checks if a period number is within the range.
 *
 * @param minPeriod - Minimum period (inclusive)
 * @param maxPeriod - Maximum period (inclusive)
 * @returns Filter function
 *
 * @example
 * const isFirstHalf = inPeriodRange(1, 6)
 * isFirstHalf("P3") // true
 * isFirstHalf("P9") // false
 */
export const inPeriodRange = (minPeriod: number, maxPeriod: number) =>
  (periodStr: PeriodValue): boolean => {
    const period = getMaxPeriod(periodStr);
    return period >= minPeriod && period <= maxPeriod;
  };

/**
 * Create a quarter filter function
 *
 * Returns a function that checks if a period belongs to a specific quarter.
 *
 * @param quarterNum - Quarter number (1-4)
 * @returns Filter function
 *
 * @example
 * const isQ2Period = inQuarter(2)
 * isQ2Period("P4") // true (April is in Q2)
 * isQ2Period("P1") // false
 */
export const inQuarter = (quarterNum: number) =>
  (periodStr: PeriodValue): boolean => {
    const period = getMaxPeriod(periodStr);
    return periodToQuarter(period) === quarterNum;
  };

// ============================================================================
// Batch Processing Functions
// ============================================================================

/**
 * Parse multiple period strings
 *
 * @param periods - Array of period strings
 * @returns Array of parsed periods
 *
 * @example
 * parsePeriods(["Q1", "P6", "LTM"]) // [3, 6, "LTM"]
 */
export const parsePeriods = (periods: readonly PeriodValue[]): ParsedPeriod[] =>
  periods.map(parsePeriod);

/**
 * Filter periods by type
 *
 * @param predicate - Type checking function
 * @returns Filter function for arrays
 *
 * @example
 * const quarters = filterPeriodsByType(isQuarter)
 * quarters(["Q1", "P6", "Q2"]) // ["Q1", "Q2"]
 */
export const filterPeriodsByType = (
  predicate: (p: PeriodValue) => boolean,
) =>
  (periods: readonly PeriodValue[]): PeriodValue[] =>
    periods.filter(predicate);

/**
 * Get maximum period from array
 *
 * @param periods - Array of period strings
 * @returns Maximum period number
 *
 * @example
 * getMaxPeriodFromArray(["P3", "Q2", "P9"]) // 9
 */
export const getMaxPeriodFromArray = (
  periods: readonly PeriodValue[],
): number =>
  Math.max(...periods.map(getMaxPeriod));

/**
 * Get minimum period from array
 *
 * @param periods - Array of period strings
 * @returns Minimum period number
 *
 * @example
 * getMinPeriodFromArray(["P3", "Q2", "P9"]) // 3
 */
export const getMinPeriodFromArray = (
  periods: readonly PeriodValue[],
): number =>
  Math.min(...periods.map(getMaxPeriod));
