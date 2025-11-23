/**
 * Tests for Logger utility
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import Logger from "../../../src/utils/Logger.js";

Deno.test("Logger - debug mode off by default", () => {
    assertEquals(Logger.DEBUG, false);
});

Deno.test("Logger - can enable debug mode", () => {
    Logger.DEBUG = true;
    assertEquals(Logger.DEBUG, true);
    // Reset to default
    Logger.DEBUG = false;
});

Deno.test("Logger.debug - does not log when DEBUG is false", () => {
    Logger.DEBUG = false;
    // No assertion - just verify it doesn't throw
    Logger.debug("This should not be logged");
});

Deno.test("Logger.debug - logs when DEBUG is true", () => {
    Logger.DEBUG = true;
    // No assertion - just verify it doesn't throw
    Logger.debug("This should be logged");
    Logger.DEBUG = false; // Reset
});

Deno.test("Logger.info - always logs", () => {
    // No assertion - just verify it doesn't throw
    Logger.info("This should always be logged");
});

Deno.test("Logger.error - always logs", () => {
    // No assertion - just verify it doesn't throw
    Logger.error("This error should always be logged");
});

Deno.test("Logger.warn - always logs", () => {
    // No assertion - just verify it doesn't throw
    Logger.warn("This warning should always be logged");
});

Deno.test("Logger - handles multiple arguments", () => {
    Logger.DEBUG = true;
    Logger.debug("Multiple", "arguments", { test: true }, 123);
    Logger.info("Multiple", "arguments", { test: true }, 123);
    Logger.error("Multiple", "arguments", { test: true }, 123);
    Logger.warn("Multiple", "arguments", { test: true }, 123);
    Logger.DEBUG = false; // Reset
});

Deno.test("Logger - handles objects and arrays", () => {
    const obj = { key: "value", nested: { deep: true } };
    const arr = [1, 2, 3, { test: true }];

    Logger.info("Object:", obj);
    Logger.info("Array:", arr);
});
