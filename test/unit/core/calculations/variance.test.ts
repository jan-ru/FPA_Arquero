import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    calculateVarianceAmount,
    calculateVariancePercent,
    calculateVariance,
    calculateForMetric,
    calculateForRow,
    calculateForYears,
    calculateForTotals,
    createVarianceCalculator
} from "../../../../src/core/calculations/variance.ts";

describe('Variance Calculations', () => {
    describe('calculateVarianceAmount', () => {
        it('calculates positive variance', () => {
            assertEquals(calculateVarianceAmount(120, 100), 20);
        });

        it('calculates negative variance', () => {
            assertEquals(calculateVarianceAmount(80, 100), -20);
        });

        it('handles zero values', () => {
            assertEquals(calculateVarianceAmount(0, 100), -100);
            assertEquals(calculateVarianceAmount(100, 0), 100);
        });
    });

    describe('calculateVariancePercent', () => {
        it('calculates positive percentage', () => {
            assertEquals(calculateVariancePercent(120, 100), 20);
        });

        it('calculates negative percentage', () => {
            assertEquals(calculateVariancePercent(80, 100), -20);
        });

        it('handles division by zero', () => {
            assertEquals(calculateVariancePercent(100, 0), 0);
        });

        it('handles negative prior values correctly', () => {
            // -120 vs -100 = -20 difference, -20/100 = -20%
            assertEquals(calculateVariancePercent(-120, -100), -20);
        });
    });

    describe('calculateVariance', () => {
        it('returns both amount and percent', () => {
            const result = calculateVariance(120, 100);
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });

        it('handles zero prior value', () => {
            const result = calculateVariance(100, 0);
            assertEquals(result.amount, 100);
            assertEquals(result.percent, 0);
        });
    });

    describe('calculateForMetric', () => {
        it('calculates variance from metric object', () => {
            const metric = { '2024': 100, '2025': 120 };
            const calc = calculateForMetric('2025', '2024');
            const result = calc(metric);
            
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });

        it('handles missing years with zero', () => {
            const metric = { '2024': 100 };
            const calc = calculateForMetric('2025', '2024');
            const result = calc(metric);
            
            assertEquals(result.amount, -100);
            assertEquals(result.percent, -100);
        });
    });

    describe('calculateForRow', () => {
        it('calculates variance from row object', () => {
            const row = { amount_2024: 100, amount_2025: 120 };
            const result = calculateForRow(row);
            
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });

        it('handles missing amounts', () => {
            const row = { amount_2024: 100 };
            const result = calculateForRow(row);
            
            assertEquals(result.amount, -100);
            assertEquals(result.percent, -100);
        });
    });

    describe('calculateForYears', () => {
        it('calculates variance for specified years', () => {
            const amounts = { '2024': 100, '2025': 120 };
            const calc = calculateForYears('2024', '2025');
            const result = calc(amounts);
            
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });
    });

    describe('calculateForTotals', () => {
        it('calculates variance from totals object', () => {
            const totals = { year1: 100, year2: 120 };
            const result = calculateForTotals(totals);
            
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });
    });

    describe('createVarianceCalculator', () => {
        it('creates calculator with pre-configured years', () => {
            const calc = createVarianceCalculator('2024', '2025');
            
            const metric = { '2024': 100, '2025': 120 };
            const result = calc.forMetric(metric);
            
            assertEquals(result.amount, 20);
            assertEquals(result.percent, 20);
        });

        it('provides all calculation methods', () => {
            const calc = createVarianceCalculator('2024', '2025');
            
            assertEquals(calc.amount(120, 100), 20);
            assertEquals(calc.percent(120, 100), 20);
            
            const variance = calc.calculate(120, 100);
            assertEquals(variance.amount, 20);
            assertEquals(variance.percent, 20);
        });
    });
});
