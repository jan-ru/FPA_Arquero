/**
 * Tests for HierarchySorter utility
 */

// @ts-nocheck - Test file with dynamic test cases
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import HierarchySorter from "../../../src/utils/HierarchySorter.js";

Deno.test("HierarchySorter.toNum - converts numeric strings", () => {
    assertEquals(HierarchySorter.toNum("10"), 10);
    assertEquals(HierarchySorter.toNum("0"), 0);
    assertEquals(HierarchySorter.toNum("100"), 100);
});

Deno.test("HierarchySorter.toNum - handles non-numeric strings", () => {
    assertEquals(HierarchySorter.toNum("Activa"), 999999);
    assertEquals(HierarchySorter.toNum("Passiva"), 999999);
    assertEquals(HierarchySorter.toNum("abc"), 999999);
});

Deno.test("HierarchySorter.toNum - handles empty/null values", () => {
    assertEquals(HierarchySorter.toNum(""), 999999);
    assertEquals(HierarchySorter.toNum(null), 999999);
    assertEquals(HierarchySorter.toNum(undefined), 999999);
});

Deno.test("HierarchySorter.toNum - handles numeric values", () => {
    assertEquals(HierarchySorter.toNum(10), 10);
    assertEquals(HierarchySorter.toNum(0), 0);
});

Deno.test("HierarchySorter.compareCodeField - numeric codes", () => {
    assertEquals(HierarchySorter.compareCodeField("10", "20") < 0, true);
    assertEquals(HierarchySorter.compareCodeField("20", "10") > 0, true);
    assertEquals(HierarchySorter.compareCodeField("10", "10"), 0);
});

Deno.test("HierarchySorter.compareCodeField - text codes alphabetically", () => {
    assertEquals(HierarchySorter.compareCodeField("Activa", "Passiva") < 0, true);
    assertEquals(HierarchySorter.compareCodeField("Passiva", "Activa") > 0, true);
    assertEquals(HierarchySorter.compareCodeField("Activa", "Activa"), 0);
});

Deno.test("HierarchySorter.compareCodeField - mixed numeric and text", () => {
    // Text codes should sort after numeric (both get 999999)
    const numericResult = HierarchySorter.compareCodeField("10", "20");
    const textResult = HierarchySorter.compareCodeField("Activa", "Passiva");

    assertEquals(numericResult < 0, true); // 10 < 20
    assertEquals(textResult < 0, true); // Activa < Passiva alphabetically
});

Deno.test("HierarchySorter.compareHierarchyPath - basic comparison", () => {
    const pathA = ["Activa", "vaste activa"];
    const pathB = ["Activa", "vlottende activa"];

    assertEquals(HierarchySorter.compareHierarchyPath(pathA, pathB) < 0, true);
});

Deno.test("HierarchySorter.compareHierarchyPath - different lengths", () => {
    const pathA = ["Activa", "vaste activa", "Immateriele vaste activa"];
    const pathB = ["Activa", "vaste activa"];

    assertEquals(HierarchySorter.compareHierarchyPath(pathA, pathB) > 0, true);
});

Deno.test("HierarchySorter.compareHierarchyPath - empty paths", () => {
    assertEquals(HierarchySorter.compareHierarchyPath([], []), 0);
    assertEquals(HierarchySorter.compareHierarchyPath(["A"], []) > 0, true);
    assertEquals(HierarchySorter.compareHierarchyPath([], ["A"]) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by code0", () => {
    const nodeA = { code0: "10", code1: "0", hierarchy: [] };
    const nodeB = { code0: "20", code1: "0", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by code1 when code0 equal", () => {
    const nodeA = { code0: "10", code1: "5", hierarchy: [] };
    const nodeB = { code0: "10", code1: "10", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by code2 when code0,code1 equal", () => {
    const nodeA = { code0: "10", code1: "5", code2: "1", hierarchy: [] };
    const nodeB = { code0: "10", code1: "5", code2: "2", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by code3 when code0-2 equal", () => {
    const nodeA = { code0: "10", code1: "5", code2: "1", code3: "1", hierarchy: [] };
    const nodeB = { code0: "10", code1: "5", code2: "1", code3: "2", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by account_code when all codes equal", () => {
    const nodeA = { code0: "10", code1: "5", code2: "1", code3: "1", account_code: "1000", hierarchy: [] };
    const nodeB = { code0: "10", code1: "5", code2: "1", code3: "1", account_code: "2000", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - sorts by hierarchy when all codes equal", () => {
    const nodeA = {
        code0: "10", code1: "5", code2: "1", code3: "1",
        account_code: "1000",
        hierarchy: ["Activa", "vaste activa"]
    };
    const nodeB = {
        code0: "10", code1: "5", code2: "1", code3: "1",
        account_code: "1000",
        hierarchy: ["Activa", "vlottende activa"]
    };

    assertEquals(HierarchySorter.compareNodes(nodeA, nodeB) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - Activa before Passiva", () => {
    const nodeActiva = { code0: "Activa", hierarchy: [] };
    const nodePassiva = { code0: "Passiva", hierarchy: [] };

    assertEquals(HierarchySorter.compareNodes(nodeActiva, nodePassiva) < 0, true);
});

Deno.test("HierarchySorter.compareNodes - handles missing fields", () => {
    const nodeA = { code0: "10" };
    const nodeB = { code0: "10", code1: "5" };

    // Should not throw
    const result = HierarchySorter.compareNodes(nodeA, nodeB);
    assertEquals(typeof result, "number");
});
