/**
 * Tests for Period Parsing Functions
 */

import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  filterPeriodsByType,
  formatToValue,
  getMaxPeriod,
  getMaxPeriodFromArray,
  getMinPeriodFromArray,
  inPeriodRange,
  inQuarter,
  isAll,
  isEmpty,
  isLTM,
  isPeriod,
  isQuarter,
  matchesPeriod,
  parsePeriod,
  parsePeriodFormat,
  parsePeriods,
  periodToQuarter,
  quarterToPeriod,
  toPeriodString,
  toQuarterString,
} from "../../../../src/core/transformations/period.ts";

describe("Period Parsing Functions", () => {
  describe("parsePeriodFormat", () => {
    it("should parse empty/null/undefined values", () => {
      assertEquals(parsePeriodFormat(null), { type: "empty", value: null });
      assertEquals(parsePeriodFormat(undefined), {
        type: "empty",
        value: undefined,
      });
      assertEquals(parsePeriodFormat(""), { type: "empty", value: "" });
    });

    it('should parse "All"', () => {
      assertEquals(parsePeriodFormat("All"), { type: "all", value: "All" });
    });

    it('should parse "LTM"', () => {
      assertEquals(parsePeriodFormat("LTM"), { type: "ltm", value: "LTM" });
    });

    it("should parse quarter formats", () => {
      assertEquals(parsePeriodFormat("Q1"), { type: "quarter", quarter: 1 });
      assertEquals(parsePeriodFormat("Q2"), { type: "quarter", quarter: 2 });
      assertEquals(parsePeriodFormat("Q3"), { type: "quarter", quarter: 3 });
      assertEquals(parsePeriodFormat("Q4"), { type: "quarter", quarter: 4 });
    });

    it("should reject invalid quarter formats", () => {
      assertEquals(parsePeriodFormat("Q0"), { type: "invalid", value: "Q0" });
      assertEquals(parsePeriodFormat("Q5"), { type: "invalid", value: "Q5" });
      assertEquals(parsePeriodFormat("QX"), { type: "invalid", value: "QX" });
    });

    it("should parse period formats", () => {
      assertEquals(parsePeriodFormat("P1"), { type: "period", period: 1 });
      assertEquals(parsePeriodFormat("P6"), { type: "period", period: 6 });
      assertEquals(parsePeriodFormat("P12"), { type: "period", period: 12 });
    });

    it("should reject invalid period formats", () => {
      assertEquals(parsePeriodFormat("P0"), { type: "invalid", value: "P0" });
      assertEquals(parsePeriodFormat("P13"), {
        type: "invalid",
        value: "P13",
      });
      assertEquals(parsePeriodFormat("PX"), { type: "invalid", value: "PX" });
    });

    it("should parse direct numbers", () => {
      assertEquals(parsePeriodFormat("1"), { type: "number", value: 1 });
      assertEquals(parsePeriodFormat("6"), { type: "number", value: 6 });
      assertEquals(parsePeriodFormat("12"), { type: "number", value: 12 });
    });

    it("should handle invalid formats", () => {
      assertEquals(parsePeriodFormat("invalid"), {
        type: "invalid",
        value: "invalid",
      });
      assertEquals(parsePeriodFormat("xyz"), {
        type: "invalid",
        value: "xyz",
      });
    });
  });

  describe("formatToValue", () => {
    it("should convert empty to 12", () => {
      assertEquals(formatToValue({ type: "empty", value: null }), 12);
      assertEquals(formatToValue({ type: "empty", value: undefined }), 12);
      assertEquals(formatToValue({ type: "empty", value: "" }), 12);
    });

    it('should convert "All" to 12', () => {
      assertEquals(formatToValue({ type: "all", value: "All" }), 12);
    });

    it('should convert "LTM" to "LTM"', () => {
      assertEquals(formatToValue({ type: "ltm", value: "LTM" }), "LTM");
    });

    it("should convert quarters to period numbers", () => {
      assertEquals(formatToValue({ type: "quarter", quarter: 1 }), 3);
      assertEquals(formatToValue({ type: "quarter", quarter: 2 }), 6);
      assertEquals(formatToValue({ type: "quarter", quarter: 3 }), 9);
      assertEquals(formatToValue({ type: "quarter", quarter: 4 }), 12);
    });

    it("should convert period formats to numbers", () => {
      assertEquals(formatToValue({ type: "period", period: 1 }), 1);
      assertEquals(formatToValue({ type: "period", period: 6 }), 6);
      assertEquals(formatToValue({ type: "period", period: 12 }), 12);
    });

    it("should convert number formats", () => {
      assertEquals(formatToValue({ type: "number", value: 5 }), 5);
      assertEquals(formatToValue({ type: "number", value: 10 }), 10);
    });

    it("should convert invalid to 12", () => {
      assertEquals(formatToValue({ type: "invalid", value: "xyz" }), 12);
    });
  });

  describe("parsePeriod", () => {
    it('should parse "All" to 12', () => {
      assertEquals(parsePeriod("All"), 12);
    });

    it("should parse null/undefined to 12", () => {
      assertEquals(parsePeriod(null), 12);
      assertEquals(parsePeriod(undefined), 12);
      assertEquals(parsePeriod(""), 12);
    });

    it('should parse "LTM" to "LTM"', () => {
      assertEquals(parsePeriod("LTM"), "LTM");
    });

    it("should parse quarter formats", () => {
      assertEquals(parsePeriod("Q1"), 3);
      assertEquals(parsePeriod("Q2"), 6);
      assertEquals(parsePeriod("Q3"), 9);
      assertEquals(parsePeriod("Q4"), 12);
    });

    it("should parse period formats", () => {
      assertEquals(parsePeriod("P1"), 1);
      assertEquals(parsePeriod("P6"), 6);
      assertEquals(parsePeriod("P12"), 12);
    });

    it("should parse direct numbers", () => {
      assertEquals(parsePeriod("1"), 1);
      assertEquals(parsePeriod("6"), 6);
      assertEquals(parsePeriod("12"), 12);
    });

    it("should default to 12 for invalid input", () => {
      assertEquals(parsePeriod("invalid"), 12);
      assertEquals(parsePeriod("Q5"), 12);
      assertEquals(parsePeriod("P13"), 12);
    });
  });

  describe("Type Checking Functions", () => {
    describe("isLTM", () => {
      it("should identify LTM periods", () => {
        assertEquals(isLTM("LTM"), true);
      });

      it("should be case-sensitive", () => {
        assertEquals(isLTM("ltm"), false);
        assertEquals(isLTM("Ltm"), false);
      });

      it("should reject non-LTM values", () => {
        assertEquals(isLTM("P12"), false);
        assertEquals(isLTM("Q4"), false);
        assertEquals(isLTM("All"), false);
        assertEquals(isLTM(null), false);
        assertEquals(isLTM(undefined), false);
      });
    });

    describe("isQuarter", () => {
      it("should identify valid quarter formats", () => {
        assertEquals(isQuarter("Q1"), true);
        assertEquals(isQuarter("Q2"), true);
        assertEquals(isQuarter("Q3"), true);
        assertEquals(isQuarter("Q4"), true);
      });

      it("should reject invalid quarter formats", () => {
        assertEquals(isQuarter("Q0"), false);
        assertEquals(isQuarter("Q5"), false);
        assertEquals(isQuarter("QX"), false);
      });

      it("should reject non-quarter values", () => {
        assertEquals(isQuarter("P1"), false);
        assertEquals(isQuarter("LTM"), false);
        assertEquals(isQuarter("All"), false);
        assertEquals(isQuarter(null), false);
        assertEquals(isQuarter(undefined), false);
      });
    });

    describe("isPeriod", () => {
      it("should identify valid period formats", () => {
        assertEquals(isPeriod("P1"), true);
        assertEquals(isPeriod("P6"), true);
        assertEquals(isPeriod("P12"), true);
      });

      it("should reject invalid period formats", () => {
        assertEquals(isPeriod("P0"), false);
        assertEquals(isPeriod("P13"), false);
        assertEquals(isPeriod("PX"), false);
      });

      it("should reject non-period values", () => {
        assertEquals(isPeriod("Q1"), false);
        assertEquals(isPeriod("LTM"), false);
        assertEquals(isPeriod("All"), false);
        assertEquals(isPeriod(null), false);
        assertEquals(isPeriod(undefined), false);
      });
    });

    describe("isAll", () => {
      it('should identify "All"', () => {
        assertEquals(isAll("All"), true);
      });

      it("should reject non-All values", () => {
        assertEquals(isAll("all"), false);
        assertEquals(isAll("P12"), false);
        assertEquals(isAll("LTM"), false);
        assertEquals(isAll(null), false);
      });
    });

    describe("isEmpty", () => {
      it("should identify empty values", () => {
        assertEquals(isEmpty(null), true);
        assertEquals(isEmpty(undefined), true);
        assertEquals(isEmpty(""), true);
      });

      it("should reject non-empty values", () => {
        assertEquals(isEmpty("P6"), false);
        assertEquals(isEmpty("All"), false);
        assertEquals(isEmpty("LTM"), false);
      });
    });
  });

  describe("Conversion Functions", () => {
    describe("getMaxPeriod", () => {
      it("should return numeric value for valid periods", () => {
        assertEquals(getMaxPeriod("P6"), 6);
        assertEquals(getMaxPeriod("Q2"), 6);
        assertEquals(getMaxPeriod("All"), 12);
        assertEquals(getMaxPeriod("12"), 12);
      });

      it("should return 12 for LTM", () => {
        assertEquals(getMaxPeriod("LTM"), 12);
      });

      it("should return 12 for invalid input", () => {
        assertEquals(getMaxPeriod("invalid"), 12);
        assertEquals(getMaxPeriod(null), 12);
      });
    });

    describe("toPeriodString", () => {
      it("should convert numbers to period strings", () => {
        assertEquals(toPeriodString(1), "P1");
        assertEquals(toPeriodString(6), "P6");
        assertEquals(toPeriodString(12), "P12");
      });

      it("should handle invalid input", () => {
        assertEquals(toPeriodString(0), "P12");
        assertEquals(toPeriodString(13), "P12");
        assertEquals(toPeriodString(-1), "P12");
        assertEquals(toPeriodString("invalid" as any), "P12");
      });
    });

    describe("toQuarterString", () => {
      it("should convert numbers to quarter strings", () => {
        assertEquals(toQuarterString(1), "Q1");
        assertEquals(toQuarterString(2), "Q2");
        assertEquals(toQuarterString(3), "Q3");
        assertEquals(toQuarterString(4), "Q4");
      });

      it("should handle invalid input", () => {
        assertEquals(toQuarterString(0), "Q4");
        assertEquals(toQuarterString(5), "Q4");
        assertEquals(toQuarterString(-1), "Q4");
        assertEquals(toQuarterString("invalid" as any), "Q4");
      });
    });

    describe("periodToQuarter", () => {
      it("should convert period numbers to quarters", () => {
        assertEquals(periodToQuarter(1), 1);
        assertEquals(periodToQuarter(2), 1);
        assertEquals(periodToQuarter(3), 1);
        assertEquals(periodToQuarter(4), 2);
        assertEquals(periodToQuarter(5), 2);
        assertEquals(periodToQuarter(6), 2);
        assertEquals(periodToQuarter(7), 3);
        assertEquals(periodToQuarter(8), 3);
        assertEquals(periodToQuarter(9), 3);
        assertEquals(periodToQuarter(10), 4);
        assertEquals(periodToQuarter(11), 4);
        assertEquals(periodToQuarter(12), 4);
      });
    });

    describe("quarterToPeriod", () => {
      it("should convert quarter numbers to period numbers", () => {
        assertEquals(quarterToPeriod(1), 3);
        assertEquals(quarterToPeriod(2), 6);
        assertEquals(quarterToPeriod(3), 9);
        assertEquals(quarterToPeriod(4), 12);
      });
    });
  });

  describe("Curried Functions", () => {
    describe("matchesPeriod", () => {
      it("should create period matching function", () => {
        const isQ2 = matchesPeriod("Q2");
        assertEquals(isQ2("Q2"), true);
        assertEquals(isQ2("P6"), true); // Q2 = P6
        assertEquals(isQ2("6"), true);
        assertEquals(isQ2("Q1"), false);
        assertEquals(isQ2("P3"), false);
      });

      it("should handle LTM matching", () => {
        const isLTMPeriod = matchesPeriod("LTM");
        assertEquals(isLTMPeriod("LTM"), true);
        assertEquals(isLTMPeriod("P12"), false);
      });
    });

    describe("inPeriodRange", () => {
      it("should create range filter function", () => {
        const isFirstHalf = inPeriodRange(1, 6);
        assertEquals(isFirstHalf("P3"), true);
        assertEquals(isFirstHalf("P6"), true);
        assertEquals(isFirstHalf("Q1"), true);
        assertEquals(isFirstHalf("Q2"), true);
        assertEquals(isFirstHalf("P9"), false);
        assertEquals(isFirstHalf("Q3"), false);
      });

      it("should handle edge cases", () => {
        const isExactly6 = inPeriodRange(6, 6);
        assertEquals(isExactly6("P6"), true);
        assertEquals(isExactly6("Q2"), true);
        assertEquals(isExactly6("P5"), false);
        assertEquals(isExactly6("P7"), false);
      });
    });

    describe("inQuarter", () => {
      it("should create quarter filter function", () => {
        const isQ2Period = inQuarter(2);
        assertEquals(isQ2Period("P4"), true);
        assertEquals(isQ2Period("P5"), true);
        assertEquals(isQ2Period("P6"), true);
        assertEquals(isQ2Period("Q2"), true);
        assertEquals(isQ2Period("P3"), false);
        assertEquals(isQ2Period("P7"), false);
        assertEquals(isQ2Period("Q1"), false);
      });

      it("should handle all quarters", () => {
        const isQ1 = inQuarter(1);
        const isQ3 = inQuarter(3);
        const isQ4 = inQuarter(4);

        assertEquals(isQ1("P1"), true);
        assertEquals(isQ1("P2"), true);
        assertEquals(isQ1("P3"), true);

        assertEquals(isQ3("P7"), true);
        assertEquals(isQ3("P8"), true);
        assertEquals(isQ3("P9"), true);

        assertEquals(isQ4("P10"), true);
        assertEquals(isQ4("P11"), true);
        assertEquals(isQ4("P12"), true);
      });
    });
  });

  describe("Batch Processing Functions", () => {
    describe("parsePeriods", () => {
      it("should parse multiple period strings", () => {
        const result = parsePeriods(["Q1", "P6", "LTM", "All"]);
        assertEquals(result, [3, 6, "LTM", 12]);
      });

      it("should handle empty array", () => {
        assertEquals(parsePeriods([]), []);
      });

      it("should handle mixed valid and invalid", () => {
        const result = parsePeriods(["P3", "invalid", "Q2"]);
        assertEquals(result, [3, 12, 6]);
      });
    });

    describe("filterPeriodsByType", () => {
      it("should filter quarters", () => {
        const quarters = filterPeriodsByType(isQuarter);
        const result = quarters(["Q1", "P6", "Q2", "LTM", "Q3"]);
        assertEquals(result, ["Q1", "Q2", "Q3"]);
      });

      it("should filter periods", () => {
        const periods = filterPeriodsByType(isPeriod);
        const result = periods(["Q1", "P6", "Q2", "P12", "LTM"]);
        assertEquals(result, ["P6", "P12"]);
      });

      it("should filter LTM", () => {
        const ltmOnly = filterPeriodsByType(isLTM);
        const result = ltmOnly(["Q1", "LTM", "P6", "LTM"]);
        assertEquals(result, ["LTM", "LTM"]);
      });
    });

    describe("getMaxPeriodFromArray", () => {
      it("should find maximum period", () => {
        assertEquals(getMaxPeriodFromArray(["P3", "Q2", "P9"]), 9);
        assertEquals(getMaxPeriodFromArray(["Q1", "Q4", "P6"]), 12);
      });

      it("should handle LTM", () => {
        assertEquals(getMaxPeriodFromArray(["P3", "LTM", "P6"]), 12);
      });

      it("should handle single element", () => {
        assertEquals(getMaxPeriodFromArray(["P5"]), 5);
      });
    });

    describe("getMinPeriodFromArray", () => {
      it("should find minimum period", () => {
        assertEquals(getMinPeriodFromArray(["P3", "Q2", "P9"]), 3);
        assertEquals(getMinPeriodFromArray(["Q1", "Q4", "P6"]), 3);
      });

      it("should handle LTM", () => {
        assertEquals(getMinPeriodFromArray(["P3", "LTM", "P6"]), 3);
      });

      it("should handle single element", () => {
        assertEquals(getMinPeriodFromArray(["P5"]), 5);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should handle complex period parsing pipeline", () => {
      const periods = ["Q1", "Q2", "P6", "P9", "LTM", "invalid"];

      // Parse all periods
      const parsed = parsePeriods(periods);
      assertEquals(parsed, [3, 6, 6, 9, "LTM", 12]);

      // Filter only quarters
      const quarters = filterPeriodsByType(isQuarter)(periods);
      assertEquals(quarters, ["Q1", "Q2"]);

      // Get max period
      const max = getMaxPeriodFromArray(periods);
      assertEquals(max, 12);
    });

    it("should compose period filters", () => {
      const periods = ["P1", "P3", "P6", "P9", "P12"];

      // First half of year
      const firstHalf = periods.filter(inPeriodRange(1, 6));
      assertEquals(firstHalf, ["P1", "P3", "P6"]);

      // Q2 periods
      const q2Periods = periods.filter(inQuarter(2));
      assertEquals(q2Periods, ["P6"]);
    });
  });
});
