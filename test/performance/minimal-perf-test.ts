import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ReportValidator from '../../src/reports/ReportValidator.js';

Deno.test("test with ReportValidator import", () => {
    console.log("Test with import running");
    const validator = new ReportValidator();
    assert(validator !== null);
});
