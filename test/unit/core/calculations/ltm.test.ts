/**
 * Tests for Last Twelve Months (LTM) Calculation Functions
 */

import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  areValidRanges,
  calculateLTMInfo,
  calculateLTMRange,
  checkDataAvailability,
  createDataFilter,
  createLTMCalculator,
  createRangeCalculator,
  filterMovementsForLTM,
  generateLTMLabel,
  generateShortLabel,
  getLatestAvailablePeriod,
  getMissingYears,
  getRequiredYears,
  getTotalMonths,
  isValidLTMParams,
  isValidRange,
  isYearAvailable,
} from "../../../../src/core/calculations/ltm.ts";

// Mock Arquero for testing
const mockAq = {
  from: (data: any[], storedParams: any = {}) => {
    return {
      data,
      _storedParams: storedParams,
      params: (p: any) => {
        return mockAq.from(data, p);
      },
      filter: function (fn: any) {
        if (typeof fn === "function") {
          return mockAq.from(data.filter(fn));
        } else if (typeof fn === "string") {
          const $ = this._storedParams;
          const filtered = data.filter((d: any) => {
            if (
              $.year !== undefined && $.startPeriod !== undefined &&
              $.endPeriod !== undefined
            ) {
              return d.year === $.year && d.period >= $.startPeriod &&
                d.period <= $.endPeriod;
            }
            if ($.maxYear !== undefined) {
              return d.year === $.maxYear;
            }
            return true;
          });
          return mockAq.from(filtered);
        }
        return mockAq.from(data);
      },
      concat: (other: any) => {
        const combined = [...data, ...other.data];
        return mockAq.from(combined);
      },
      rollup: (spec: any) => {
        const result: any = {};
        Object.keys(spec).forEach((key) => {
          const fn = spec[key];
          const columnsProxy = new Proxy({}, {
            get: (target, prop) => {
              return data.map((row: any) => row[prop]);
            },
          });
          result[key] = fn(columnsProxy);
        });
        return {
          get: (col: string, defaultValue: any) =>
            result[col] !== undefined ? result[col] : defaultValue,
        };
      },
      numRows: () => data.length,
      objects: () => data,
    };
  },
  op: {
    max: (col: any) => Math.max(...(Array.isArray(col) ? col : [col])),
  },
};

// Make Arquero available globally
(globalThis as any).aq = mockAq;

/**
 * Helper function to create test movements data
 */
function createTestMovements(data: any[]) {
  return mockAq.from(data);
}

describe("LTM Calculation Functions", () => {
  describe("getLatestAvailablePeriod", () => {
    it("should return latest period when data exists", () => {
      const movements = createTestMovements([
        { year: 2024, period: 6, movement_amount: 100 },
        { year: 2024, period: 12, movement_amount: 200 },
        { year: 2025, period: 3, movement_amount: 150 },
        { year: 2025, period: 6, movement_amount: 175 },
      ]);

      const result = getLatestAvailablePeriod(movements);

      assertEquals(result.some, true);
      if (result.some) {
        assertEquals(result.value.year, 2025);
        assertEquals(result.value.period, 6);
      }
    });

    it("should return latest period with single year", () => {
      const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
        { year: 2025, period: 3, movement_amount: 150 },
        { year: 2025, period: 2, movement_amount: 125 },
      ]);

      const result = getLatestAvailablePeriod(movements);

      assertEquals(result.some, true);
      if (result.some) {
        assertEquals(result.value.year, 2025);
        assertEquals(result.value.period, 3);
      }
    });

    it("should return none for empty table", () => {
      const movements = createTestMovements([]);
      const result = getLatestAvailablePeriod(movements);
      assertEquals(result.some, false);
    });

    it("should return none for null input", () => {
      const result = getLatestAvailablePeriod(null);
      assertEquals(result.some, false);
    });

    it("should handle period 12 correctly", () => {
      const movements = createTestMovements([
        { year: 2024, period: 12, movement_amount: 100 },
        { year: 2025, period: 1, movement_amount: 200 },
      ]);

      const result = getLatestAvailablePeriod(movements);

      assertEquals(result.some, true);
      if (result.some) {
        assertEquals(result.value.year, 2025);
        assertEquals(result.value.period, 1);
      }
    });

    it("should handle multiple years with same max period", () => {
      const movements = createTestMovements([
        { year: 2024, period: 6, movement_amount: 100 },
        { year: 2025, period: 6, movement_amount: 200 },
        { year: 2023, period: 6, movement_amount: 50 },
      ]);

      const result = getLatestAvailablePeriod(movements);

      assertEquals(result.some, true);
      if (result.some) {
        assertEquals(result.value.year, 2025);
        assertEquals(result.value.period, 6);
      }
    });
  });

  describe("calculateLTMRange", () => {
    it("should calculate range spanning two years", () => {
      const ranges = calculateLTMRange(2025, 6, 12);

      assertEquals(ranges.length, 2);
      assertEquals(ranges[0], { year: 2024, startPeriod: 7, endPeriod: 12 });
      assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 6 });
    });

    it("should calculate range within single year", () => {
      const ranges = calculateLTMRange(2025, 12, 12);

      assertEquals(ranges.length, 1);
      assertEquals(ranges[0], { year: 2025, startPeriod: 1, endPeriod: 12 });
    });

    it("should handle year boundary (P12 to P11)", () => {
      const ranges = calculateLTMRange(2025, 11, 12);

      assertEquals(ranges.length, 2);
      assertEquals(ranges[0], { year: 2024, startPeriod: 12, endPeriod: 12 });
      assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 11 });
    });

    it("should handle partial data (6 months)", () => {
      const ranges = calculateLTMRange(2025, 6, 6);

      assertEquals(ranges.length, 1);
      assertEquals(ranges[0], { year: 2025, startPeriod: 1, endPeriod: 6 });
    });

    it("should handle 1 month only", () => {
      const ranges = calculateLTMRange(2025, 3, 1);

      assertEquals(ranges.length, 1);
      assertEquals(ranges[0], { year: 2025, startPeriod: 3, endPeriod: 3 });
    });

    it("should handle edge case at period 1", () => {
      const ranges = calculateLTMRange(2025, 1, 12);

      assertEquals(ranges.length, 2);
      assertEquals(ranges[0], { year: 2024, startPeriod: 2, endPeriod: 12 });
      assertEquals(ranges[1], { year: 2025, startPeriod: 1, endPeriod: 1 });
    });

    it("should return empty array for invalid input", () => {
      assertEquals(calculateLTMRange(0, 6, 12).length, 0);
      assertEquals(calculateLTMRange(2025, 0, 12).length, 0);
      assertEquals(calculateLTMRange(2025, 6, 0).length, 0);
      assertEquals(calculateLTMRange(2025, 13, 12).length, 0);
    });

    it("should handle spanning three years", () => {
      const ranges = calculateLTMRange(2025, 3, 18);

      assertEquals(ranges.length, 3);
      assertEquals(ranges[0], { year: 2023, startPeriod: 10, endPeriod: 12 });
      assertEquals(ranges[1], { year: 2024, startPeriod: 1, endPeriod: 12 });
      assertEquals(ranges[2], { year: 2025, startPeriod: 1, endPeriod: 3 });
    });
  });

  describe("getTotalMonths", () => {
    it("should calculate total months from ranges", () => {
      const ranges = calculateLTMRange(2025, 6, 12);
      assertEquals(getTotalMonths(ranges), 12);
    });

    it("should handle single range", () => {
      const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 6 }];
      assertEquals(getTotalMonths(ranges), 6);
    });

    it("should handle empty ranges", () => {
      assertEquals(getTotalMonths([]), 0);
    });

    it("should handle multiple ranges", () => {
      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];
      assertEquals(getTotalMonths(ranges), 12);
    });
  });

  describe("getRequiredYears", () => {
    it("should extract unique years from ranges", () => {
      const ranges = calculateLTMRange(2025, 6, 12);
      assertEquals(getRequiredYears(ranges), [2024, 2025]);
    });

    it("should handle single year", () => {
      const ranges = calculateLTMRange(2025, 12, 12);
      assertEquals(getRequiredYears(ranges), [2025]);
    });

    it("should handle empty ranges", () => {
      assertEquals(getRequiredYears([]), []);
    });

    it("should sort years", () => {
      const ranges = [
        { year: 2025, startPeriod: 1, endPeriod: 6 },
        { year: 2023, startPeriod: 7, endPeriod: 12 },
        { year: 2024, startPeriod: 1, endPeriod: 12 },
      ];
      assertEquals(getRequiredYears(ranges), [2023, 2024, 2025]);
    });
  });

  describe("filterMovementsForLTM", () => {
    it("should filter data for single range", () => {
      const movements = createTestMovements([
        { year: 2025, period: 1, account_code: "A", movement_amount: 100 },
        { year: 2025, period: 6, account_code: "B", movement_amount: 200 },
        { year: 2025, period: 12, account_code: "C", movement_amount: 300 },
      ]);

      const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 6 }];
      const filtered = filterMovementsForLTM(movements, ranges);

      assertEquals(filtered.numRows(), 2);
      const data = filtered.objects();
      assertEquals(data[0].account_code, "A");
      assertEquals(data[1].account_code, "B");
    });

    it("should filter data for multiple ranges", () => {
      const movements = createTestMovements([
        { year: 2024, period: 7, account_code: "A", movement_amount: 100 },
        { year: 2024, period: 12, account_code: "B", movement_amount: 200 },
        { year: 2025, period: 1, account_code: "C", movement_amount: 150 },
        { year: 2025, period: 6, account_code: "D", movement_amount: 175 },
        { year: 2025, period: 12, account_code: "E", movement_amount: 300 },
      ]);

      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];
      const filtered = filterMovementsForLTM(movements, ranges);

      assertEquals(filtered.numRows(), 4);
      const data = filtered.objects();
      assertEquals(data[0].account_code, "A");
      assertEquals(data[1].account_code, "B");
      assertEquals(data[2].account_code, "C");
      assertEquals(data[3].account_code, "D");
    });

    it("should return empty table for empty ranges", () => {
      const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
      ]);

      const filtered = filterMovementsForLTM(movements, []);
      assertEquals(filtered.numRows(), 0);
    });

    it("should handle null movements", () => {
      const filtered = filterMovementsForLTM(null, []);
      assertEquals(filtered.numRows(), 0);
    });
  });

  describe("generateLTMLabel", () => {
    it("should generate label for multi-year range", () => {
      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];

      assertEquals(generateLTMLabel(ranges), "LTM (2024 P7 - 2025 P6)");
    });

    it("should generate label for single year range", () => {
      const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 12 }];
      assertEquals(generateLTMLabel(ranges), "LTM (2025 P1 - 2025 P12)");
    });

    it("should generate label for partial data", () => {
      const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 3 }];
      assertEquals(generateLTMLabel(ranges), "LTM (2025 P1 - 2025 P3)");
    });

    it("should handle empty ranges", () => {
      assertEquals(generateLTMLabel([]), "LTM (No Data)");
    });
  });

  describe("generateShortLabel", () => {
    it("should generate short label", () => {
      const ranges = calculateLTMRange(2025, 6, 12);
      assertEquals(generateShortLabel(ranges), "LTM 2025 P6");
    });

    it("should handle empty ranges", () => {
      assertEquals(generateShortLabel([]), "LTM");
    });

    it("should use last range", () => {
      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];
      assertEquals(generateShortLabel(ranges), "LTM 2025 P6");
    });
  });

  describe("checkDataAvailability", () => {
    it("should return complete for 12 months", () => {
      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];
      const availableYears = [2024, 2025];

      const result = checkDataAvailability(ranges, availableYears);

      assertEquals(result.complete, true);
      assertEquals(result.actualMonths, 12);
      assertEquals(result.message, "Complete LTM data available");
    });

    it("should return incomplete for partial data", () => {
      const ranges = [{ year: 2025, startPeriod: 1, endPeriod: 6 }];
      const availableYears = [2025];

      const result = checkDataAvailability(ranges, availableYears);

      assertEquals(result.complete, false);
      assertEquals(result.actualMonths, 6);
      assertEquals(result.message, "Only 6 months available (need 12)");
    });

    it("should detect missing years", () => {
      const ranges = [
        { year: 2024, startPeriod: 7, endPeriod: 12 },
        { year: 2025, startPeriod: 1, endPeriod: 6 },
      ];
      const availableYears = [2025];

      const result = checkDataAvailability(ranges, availableYears);

      assertEquals(result.complete, false);
      assertEquals(result.actualMonths, 12);
      assertEquals(result.message, "Missing data for year(s): 2024");
    });

    it("should handle single month", () => {
      const ranges = [{ year: 2025, startPeriod: 3, endPeriod: 3 }];
      const availableYears = [2025];

      const result = checkDataAvailability(ranges, availableYears);

      assertEquals(result.complete, false);
      assertEquals(result.actualMonths, 1);
      assertEquals(result.message, "Only 1 month available (need 12)");
    });

    it("should handle empty ranges", () => {
      const result = checkDataAvailability([], [2024, 2025]);

      assertEquals(result.complete, false);
      assertEquals(result.actualMonths, 0);
      assertEquals(result.message, "No LTM data available");
    });
  });

  describe("isYearAvailable", () => {
    it("should check if year is available", () => {
      assertEquals(isYearAvailable(2024, [2023, 2024, 2025]), true);
      assertEquals(isYearAvailable(2022, [2023, 2024, 2025]), false);
    });
  });

  describe("getMissingYears", () => {
    it("should find missing years", () => {
      assertEquals(getMissingYears([2023, 2024], [2024, 2025]), [2023]);
      assertEquals(getMissingYears([2023, 2024, 2025], [2024]), [2023, 2025]);
    });

    it("should return empty for no missing years", () => {
      assertEquals(getMissingYears([2024, 2025], [2023, 2024, 2025]), []);
    });
  });

  describe("calculateLTMInfo", () => {
    it("should return complete information", () => {
      const movements = createTestMovements([
        { year: 2024, period: 7, movement_amount: 100 },
        { year: 2024, period: 12, movement_amount: 200 },
        { year: 2025, period: 1, movement_amount: 150 },
        { year: 2025, period: 6, movement_amount: 175 },
      ]);

      const result = calculateLTMInfo(movements, [2024, 2025], 12);

      assertExists(result.latest);
      assertEquals(result.latest.year, 2025);
      assertEquals(result.latest.period, 6);

      assertExists(result.ranges);
      assertEquals(result.ranges.length, 2);

      assertExists(result.filteredData);
      assertEquals(result.filteredData.numRows(), 4);

      assertExists(result.label);
      assertEquals(result.label, "LTM (2024 P7 - 2025 P6)");

      assertExists(result.availability);
      assertEquals(result.availability.complete, true);
      assertEquals(result.availability.actualMonths, 12);
    });

    it("should handle incomplete data", () => {
      const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
        { year: 2025, period: 3, movement_amount: 150 },
      ]);

      const result = calculateLTMInfo(movements, [2025], 12);

      assertEquals(result.latest.year, 2025);
      assertEquals(result.latest.period, 3);
      assertEquals(result.availability.complete, false);
      assertEquals(result.availability.message.includes("Missing data"), true);
    });

    it("should handle empty movements", () => {
      const movements = createTestMovements([]);
      const result = calculateLTMInfo(movements, [2024, 2025], 12);

      assertEquals(result.latest.year, 0);
      assertEquals(result.latest.period, 0);
      assertEquals(result.ranges.length, 0);
      assertEquals(result.label, "LTM (No Data)");
      assertEquals(result.availability.complete, false);
    });
  });

  describe("Curried Functions", () => {
    describe("createLTMCalculator", () => {
      it("should create calculator with fixed months", () => {
        const calculate12Month = createLTMCalculator(12);
        const movements = createTestMovements([
          { year: 2025, period: 6, movement_amount: 100 },
        ]);

        const result = calculate12Month(movements, [2024, 2025]);
        assertEquals(result.availability.expectedMonths, 12);
      });
    });

    describe("createRangeCalculator", () => {
      it("should create range calculator with fixed months", () => {
        const calculate12MonthRange = createRangeCalculator(12);
        const ranges = calculate12MonthRange(2025, 6);

        assertEquals(ranges.length, 2);
        assertEquals(getTotalMonths(ranges), 12);
      });
    });

    describe("createDataFilter", () => {
      it("should create filter with fixed ranges", () => {
        const ranges = calculateLTMRange(2025, 6, 12);
        const filterLTM = createDataFilter(ranges);

        const movements = createTestMovements([
          { year: 2024, period: 7, movement_amount: 100 },
          { year: 2025, period: 6, movement_amount: 200 },
          { year: 2025, period: 12, movement_amount: 300 },
        ]);

        const filtered = filterLTM(movements);
        assertEquals(filtered.numRows(), 2);
      });
    });
  });

  describe("Validation Functions", () => {
    describe("isValidLTMParams", () => {
      it("should validate correct parameters", () => {
        assertEquals(isValidLTMParams(2024, 6, 12), true);
        assertEquals(isValidLTMParams(2025, 1, 1), true);
        assertEquals(isValidLTMParams(2025, 12, 12), true);
      });

      it("should reject invalid parameters", () => {
        assertEquals(isValidLTMParams(0, 6, 12), false);
        assertEquals(isValidLTMParams(2024, 0, 12), false);
        assertEquals(isValidLTMParams(2024, 13, 12), false);
        assertEquals(isValidLTMParams(2024, 6, 0), false);
        assertEquals(isValidLTMParams(-1, 6, 12), false);
      });
    });

    describe("isValidRange", () => {
      it("should validate correct ranges", () => {
        assertEquals(
          isValidRange({ year: 2024, startPeriod: 1, endPeriod: 6 }),
          true,
        );
        assertEquals(
          isValidRange({ year: 2024, startPeriod: 12, endPeriod: 12 }),
          true,
        );
      });

      it("should reject invalid ranges", () => {
        assertEquals(
          isValidRange({ year: 0, startPeriod: 1, endPeriod: 6 }),
          false,
        );
        assertEquals(
          isValidRange({ year: 2024, startPeriod: 0, endPeriod: 6 }),
          false,
        );
        assertEquals(
          isValidRange({ year: 2024, startPeriod: 1, endPeriod: 13 }),
          false,
        );
        assertEquals(
          isValidRange({ year: 2024, startPeriod: 7, endPeriod: 6 }),
          false,
        );
      });
    });

    describe("areValidRanges", () => {
      it("should validate array of ranges", () => {
        const ranges = calculateLTMRange(2025, 6, 12);
        assertEquals(areValidRanges(ranges), true);
      });

      it("should reject empty array", () => {
        assertEquals(areValidRanges([]), false);
      });

      it("should reject invalid ranges", () => {
        const ranges = [
          { year: 2024, startPeriod: 1, endPeriod: 6 },
          { year: 2024, startPeriod: 13, endPeriod: 15 },
        ];
        assertEquals(areValidRanges(ranges), false);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete LTM workflow", () => {
      const movements = createTestMovements([
        { year: 2024, period: 7, account_code: "A", movement_amount: 100 },
        { year: 2024, period: 12, account_code: "B", movement_amount: 200 },
        { year: 2025, period: 1, account_code: "C", movement_amount: 150 },
        { year: 2025, period: 6, account_code: "D", movement_amount: 175 },
      ]);

      // Get latest period
      const latest = getLatestAvailablePeriod(movements);
      assertEquals(latest.some, true);

      if (latest.some) {
        // Calculate ranges
        const ranges = calculateLTMRange(latest.value.year, latest.value.period, 12);
        assertEquals(ranges.length, 2);

        // Filter data
        const filtered = filterMovementsForLTM(movements, ranges);
        assertEquals(filtered.numRows(), 4);

        // Generate label
        const label = generateLTMLabel(ranges);
        assertEquals(label, "LTM (2024 P7 - 2025 P6)");

        // Check availability
        const availability = checkDataAvailability(ranges, [2024, 2025]);
        assertEquals(availability.complete, true);
      }
    });

    it("should compose curried functions", () => {
      const calculate6Month = createLTMCalculator(6);
      const movements = createTestMovements([
        { year: 2025, period: 1, movement_amount: 100 },
        { year: 2025, period: 6, movement_amount: 200 },
      ]);

      const result = calculate6Month(movements, [2025]);
      assertEquals(result.availability.expectedMonths, 6);
      assertEquals(result.availability.complete, true);
    });
  });
});
