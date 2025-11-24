#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: VarianceCalculator
 * Tests for variance calculation logic
 */

import { assertEquals, assertAlmostEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import VarianceCalculator from "../../../src/utils/VarianceCalculator.ts";

Deno.test("VarianceCalculator.calculate - basic positive variance", () => {
    const result = VarianceCalculator.calculate(120, 100);
    assertEquals(result.amount, 20);
    assertEquals(result.percent, 20);
});

Deno.test("VarianceCalculator.calculate - basic negative variance", () => {
    const result = VarianceCalculator.calculate(80, 100);
    assertEquals(result.amount, -20);
    assertEquals(result.percent, -20);
});

Deno.test("VarianceCalculator.calculate - zero to positive", () => {
    const result = VarianceCalculator.calculate(100, 0);
    assertEquals(result.amount, 100);
    assertEquals(result.percent, 0); // Cannot calculate percentage from zero
});

Deno.test("VarianceCalculator.calculate - zero to zero", () => {
    const result = VarianceCalculator.calculate(0, 0);
    assertEquals(result.amount, 0);
    assertEquals(result.percent, 0);
});

Deno.test("VarianceCalculator.calculate - negative to positive", () => {
    const result = VarianceCalculator.calculate(50, -100);
    assertEquals(result.amount, 150);
    assertEquals(result.percent, 150);
});

Deno.test("VarianceCalculator.calculate - negative to negative (improvement)", () => {
    const result = VarianceCalculator.calculate(-50, -100);
    assertEquals(result.amount, 50);
    assertEquals(result.percent, 50); // Uses absolute value for percent calculation
});

Deno.test("VarianceCalculator.calculate - negative to negative (deterioration)", () => {
    const result = VarianceCalculator.calculate(-150, -100);
    assertEquals(result.amount, -50);
    assertEquals(result.percent, -50);
});

Deno.test("VarianceCalculator.calculate - decimal precision", () => {
    const result = VarianceCalculator.calculate(100.5, 99.3);
    assertAlmostEquals(result.amount, 1.2, 0.001);
    assertAlmostEquals(result.percent, 1.208, 0.001);
});

Deno.test("VarianceCalculator.calculate - large numbers", () => {
    const result = VarianceCalculator.calculate(1000000, 900000);
    assertEquals(result.amount, 100000);
    assertAlmostEquals(result.percent, 11.111, 0.001);
});

Deno.test("VarianceCalculator.calculateForMetric - with year keys", () => {
    const metric = {
        '2024': 100,
        '2025': 150
    };
    const result = VarianceCalculator.calculateForMetric(metric, '2025', '2024');
    assertEquals(result.amount, 50);
    assertEquals(result.percent, 50);
});

Deno.test("VarianceCalculator.calculateForMetric - missing year defaults to zero", () => {
    const metric = {
        '2024': 100
    };
    const result = VarianceCalculator.calculateForMetric(metric, '2025', '2024');
    assertEquals(result.amount, -100);
    assertEquals(result.percent, -100);
});

Deno.test("VarianceCalculator.calculateForMetric - both years missing", () => {
    const metric = {};
    const result = VarianceCalculator.calculateForMetric(metric, '2025', '2024');
    assertEquals(result.amount, 0);
    assertEquals(result.percent, 0);
});

Deno.test("VarianceCalculator.calculateForRow - standard row object", () => {
    const row = {
        amount_2024: 100,
        amount_2025: 120
    };
    const result = VarianceCalculator.calculateForRow(row);
    assertEquals(result.amount, 20);
    assertEquals(result.percent, 20);
});

Deno.test("VarianceCalculator.calculateForRow - missing 2025", () => {
    const row = {
        amount_2024: 100
    };
    const result = VarianceCalculator.calculateForRow(row);
    assertEquals(result.amount, -100);
    assertEquals(result.percent, -100);
});

Deno.test("VarianceCalculator.calculateForRow - missing 2024", () => {
    const row = {
        amount_2025: 150
    };
    const result = VarianceCalculator.calculateForRow(row);
    assertEquals(result.amount, 150);
    assertEquals(result.percent, 0);
});

Deno.test("VarianceCalculator.calculateForRow - both amounts zero", () => {
    const row = {
        amount_2024: 0,
        amount_2025: 0
    };
    const result = VarianceCalculator.calculateForRow(row);
    assertEquals(result.amount, 0);
    assertEquals(result.percent, 0);
});

Deno.test("VarianceCalculator.calculate - percentage uses absolute value", () => {
    // When prior is negative, percentage should use Math.abs(prior)
    const result1 = VarianceCalculator.calculate(50, -100);
    assertEquals(result1.percent, 150); // (50 - (-100)) / 100 = 150%

    const result2 = VarianceCalculator.calculate(-50, -100);
    assertEquals(result2.percent, 50); // (-50 - (-100)) / 100 = 50%
});
