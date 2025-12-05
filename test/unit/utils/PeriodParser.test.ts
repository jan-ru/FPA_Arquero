import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import PeriodParser from "../../../src/utils/PeriodParser.ts";

describe('PeriodParser', () => {
  describe('parse', () => {
    it('should parse "All" to 12', () => {
      assertEquals(PeriodParser.parse('All'), 12);
    });

    it('should parse null/undefined to 12', () => {
      assertEquals(PeriodParser.parse(null), 12);
      assertEquals(PeriodParser.parse(undefined), 12);
      assertEquals(PeriodParser.parse(''), 12);
    });

    it('should parse "LTM" to "LTM"', () => {
      assertEquals(PeriodParser.parse('LTM'), 'LTM');
    });

    it('should parse quarter formats', () => {
      assertEquals(PeriodParser.parse('Q1'), 3);
      assertEquals(PeriodParser.parse('Q2'), 6);
      assertEquals(PeriodParser.parse('Q3'), 9);
      assertEquals(PeriodParser.parse('Q4'), 12);
    });

    it('should parse period formats', () => {
      assertEquals(PeriodParser.parse('P1'), 1);
      assertEquals(PeriodParser.parse('P6'), 6);
      assertEquals(PeriodParser.parse('P12'), 12);
    });

    it('should parse direct numbers', () => {
      assertEquals(PeriodParser.parse('1'), 1);
      assertEquals(PeriodParser.parse('6'), 6);
      assertEquals(PeriodParser.parse('12'), 12);
    });

    it('should default to 12 for invalid input', () => {
      assertEquals(PeriodParser.parse('invalid'), 12);
    });
  });

  describe('isLTM', () => {
    it('should identify LTM periods', () => {
      assertEquals(PeriodParser.isLTM('LTM'), true);
      assertEquals(PeriodParser.isLTM('ltm'), false); // Case sensitive
      assertEquals(PeriodParser.isLTM('P12'), false);
      assertEquals(PeriodParser.isLTM('Q4'), false);
    });
  });

  describe('isQuarter', () => {
    it('should identify quarter formats', () => {
      assertEquals(PeriodParser.isQuarter('Q1'), true);
      assertEquals(PeriodParser.isQuarter('Q2'), true);
      assertEquals(PeriodParser.isQuarter('Q3'), true);
      assertEquals(PeriodParser.isQuarter('Q4'), true);
      assertEquals(PeriodParser.isQuarter('Q5'), false); // Invalid
      assertEquals(PeriodParser.isQuarter('P1'), false);
      assertEquals(PeriodParser.isQuarter('LTM'), false);
    });
  });

  describe('isPeriod', () => {
    it('should identify period formats', () => {
      assertEquals(PeriodParser.isPeriod('P1'), true);
      assertEquals(PeriodParser.isPeriod('P6'), true);
      assertEquals(PeriodParser.isPeriod('P12'), true);
      assertEquals(PeriodParser.isPeriod('P13'), false); // Invalid
      assertEquals(PeriodParser.isPeriod('P0'), false); // Invalid
      assertEquals(PeriodParser.isPeriod('Q1'), false);
      assertEquals(PeriodParser.isPeriod('LTM'), false);
    });
  });

  describe('getMaxPeriod', () => {
    it('should return numeric value for valid periods', () => {
      assertEquals(PeriodParser.getMaxPeriod('P6'), 6);
      assertEquals(PeriodParser.getMaxPeriod('Q2'), 6);
      assertEquals(PeriodParser.getMaxPeriod('All'), 12);
    });

    it('should return 12 for LTM', () => {
      assertEquals(PeriodParser.getMaxPeriod('LTM'), 12);
    });
  });

  describe('toPeriodString', () => {
    it('should convert numbers to period strings', () => {
      assertEquals(PeriodParser.toPeriodString(1), 'P1');
      assertEquals(PeriodParser.toPeriodString(6), 'P6');
      assertEquals(PeriodParser.toPeriodString(12), 'P12');
    });

    it('should handle invalid input', () => {
      assertEquals(PeriodParser.toPeriodString(0), 'P12');
      assertEquals(PeriodParser.toPeriodString(13), 'P12');
      assertEquals(PeriodParser.toPeriodString(-1), 'P12');
      assertEquals(PeriodParser.toPeriodString('invalid' as any), 'P12');
    });
  });

  describe('toQuarterString', () => {
    it('should convert numbers to quarter strings', () => {
      assertEquals(PeriodParser.toQuarterString(1), 'Q1');
      assertEquals(PeriodParser.toQuarterString(2), 'Q2');
      assertEquals(PeriodParser.toQuarterString(3), 'Q3');
      assertEquals(PeriodParser.toQuarterString(4), 'Q4');
    });

    it('should handle invalid input', () => {
      assertEquals(PeriodParser.toQuarterString(0), 'Q4');
      assertEquals(PeriodParser.toQuarterString(5), 'Q4');
      assertEquals(PeriodParser.toQuarterString(-1), 'Q4');
      assertEquals(PeriodParser.toQuarterString('invalid' as any), 'Q4');
    });
  });
});
