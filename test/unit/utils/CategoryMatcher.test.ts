#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: CategoryMatcher
 * Tests for financial category pattern matching
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import CategoryMatcher from "../../../src/utils/CategoryMatcher.js";

Deno.test("CategoryMatcher.matches - basic pattern matching", () => {
    assertEquals(CategoryMatcher.matches("Vaste Activa", ["vaste"]), true);
    assertEquals(CategoryMatcher.matches("Omzet", ["omzet"]), true);
    assertEquals(CategoryMatcher.matches("Kosten", ["kosten"]), true);
    assertEquals(CategoryMatcher.matches("Random Text", ["vaste"]), false);
});

Deno.test("CategoryMatcher.matches - case insensitive", () => {
    assertEquals(CategoryMatcher.matches("VASTE ACTIVA", ["vaste"]), true);
    assertEquals(CategoryMatcher.matches("vaste activa", ["VASTE"]), true);
    assertEquals(CategoryMatcher.matches("VaStE AcTiVa", ["vAsTe"]), true);
});

Deno.test("CategoryMatcher.matches - exclude patterns", () => {
    assertEquals(CategoryMatcher.matches("Omzet", ["omzet"], ["kostprijs"]), true);
    assertEquals(CategoryMatcher.matches("Kostprijs van omzet", ["omzet"], ["kostprijs"]), false);
});

Deno.test("CategoryMatcher.matches - null/undefined handling", () => {
    assertEquals(CategoryMatcher.matches(null as any, ["test"]), false);
    assertEquals(CategoryMatcher.matches(undefined as any, ["test"]), false);
    assertEquals(CategoryMatcher.matches("", ["test"]), false);
});

Deno.test("CategoryMatcher.isAsset - identifies assets", () => {
    assertEquals(CategoryMatcher.isAsset("Immateriële vaste activa"), true);
    assertEquals(CategoryMatcher.isAsset("Materiële vaste activa"), true);
    assertEquals(CategoryMatcher.isAsset("Voorraden"), true);
    assertEquals(CategoryMatcher.isAsset("Vorderingen"), true);
    assertEquals(CategoryMatcher.isAsset("Liquide middelen"), true);
    assertEquals(CategoryMatcher.isAsset("Omzet"), false);
    assertEquals(CategoryMatcher.isAsset("Schuld"), false);
});

Deno.test("CategoryMatcher.isLiability - identifies liabilities", () => {
    assertEquals(CategoryMatcher.isLiability("Schuld"), true);
    assertEquals(CategoryMatcher.isLiability("Voorziening"), true);
    assertEquals(CategoryMatcher.isLiability("Passiva"), true);
    assertEquals(CategoryMatcher.isLiability("Vaste Activa"), false);
});

Deno.test("CategoryMatcher.isEquity - identifies equity", () => {
    assertEquals(CategoryMatcher.isEquity("Eigen vermogen"), true);
    assertEquals(CategoryMatcher.isEquity("Equity"), true);
    assertEquals(CategoryMatcher.isEquity("Schuld"), false);
});

Deno.test("CategoryMatcher.isRevenue - identifies revenue", () => {
    assertEquals(CategoryMatcher.isRevenue("Omzet"), true);
    assertEquals(CategoryMatcher.isRevenue("Omzet verkoop"), true);
    assertEquals(CategoryMatcher.isRevenue("Kostprijs van omzet"), false); // Excluded
    assertEquals(CategoryMatcher.isRevenue("Kosten"), false);
});

Deno.test("CategoryMatcher.isCOGS - identifies cost of goods sold", () => {
    assertEquals(CategoryMatcher.isCOGS("Kostprijs"), true);
    assertEquals(CategoryMatcher.isCOGS("Kostprijs van omzet"), true);
    assertEquals(CategoryMatcher.isCOGS("Omzet"), false);
});

Deno.test("CategoryMatcher.isOperatingExpense - identifies operating expenses", () => {
    assertEquals(CategoryMatcher.isOperatingExpense("Bedrijfskosten"), true);
    assertEquals(CategoryMatcher.isOperatingExpense("Kosten"), true);
    assertEquals(CategoryMatcher.isOperatingExpense("Omzet"), false);
});

Deno.test("CategoryMatcher.isOtherIncome - identifies other income", () => {
    assertEquals(CategoryMatcher.isOtherIncome("Overige opbrengsten"), true);
    assertEquals(CategoryMatcher.isOtherIncome("Omzet"), false);
});

Deno.test("CategoryMatcher.isTax - identifies tax", () => {
    assertEquals(CategoryMatcher.isTax("Belasting"), true);
    assertEquals(CategoryMatcher.isTax("Tax"), true);
    assertEquals(CategoryMatcher.isTax("Income tax"), true);
    assertEquals(CategoryMatcher.isTax("Omzet"), false);
});

Deno.test("CategoryMatcher.isDepreciation - identifies depreciation", () => {
    assertEquals(CategoryMatcher.isDepreciation("Afschrijving"), true);
    assertEquals(CategoryMatcher.isDepreciation("Depreciation"), true);
    assertEquals(CategoryMatcher.isDepreciation("Amortization"), true);
    assertEquals(CategoryMatcher.isDepreciation("Omzet"), false);
});

Deno.test("CategoryMatcher.isCurrentAsset - identifies current assets", () => {
    assertEquals(CategoryMatcher.isCurrentAsset("Vlottende activa"), true);
    assertEquals(CategoryMatcher.isCurrentAsset("Current assets"), true);
    assertEquals(CategoryMatcher.isCurrentAsset("Vaste activa"), false);
});

Deno.test("CategoryMatcher.isFixedAsset - identifies fixed assets", () => {
    assertEquals(CategoryMatcher.isFixedAsset("Vaste activa"), true);
    assertEquals(CategoryMatcher.isFixedAsset("Fixed assets"), true);
    assertEquals(CategoryMatcher.isFixedAsset("Vlottende activa"), false);
});

Deno.test("CategoryMatcher.isLongTermLiability - identifies long-term liabilities", () => {
    assertEquals(CategoryMatcher.isLongTermLiability("Eigen vermogen"), true);
    assertEquals(CategoryMatcher.isLongTermLiability("Equity"), true);
    assertEquals(CategoryMatcher.isLongTermLiability("Langlopende schuld"), true);
    assertEquals(CategoryMatcher.isLongTermLiability("Long-term debt"), true);
    assertEquals(CategoryMatcher.isLongTermLiability("Omzet"), false);
});

Deno.test("CategoryMatcher.isLiabilityOrEquity - UI helper", () => {
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Passiva"), true);
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Eigen vermogen"), true);
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Liabilities"), true);
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Equity"), true);
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Schuld"), true);
    assertEquals(CategoryMatcher.isLiabilityOrEquity("Activa"), false);
});
