import { assertEquals, assert, assertFalse } from "https://deno.land/std@0.208.0/assert/mod.ts";
import ValidationResult from "../../../src/utils/ValidationResult.js";

Deno.test("ValidationResult - constructor creates valid result by default", () => {
    const result = new ValidationResult();
    assert(result.isValid);
    assertEquals(result.errors.length, 0);
    assertEquals(result.warnings.length, 0);
    assertEquals(result.info.length, 0);
});

Deno.test("ValidationResult - constructor can create invalid result", () => {
    const result = new ValidationResult(false);
    assertFalse(result.isValid);
});

Deno.test("ValidationResult - addError adds error and sets isValid to false", () => {
    const result = new ValidationResult();
    result.addError('field1', 'Error message');

    assertFalse(result.isValid);
    assertEquals(result.errors.length, 1);
    assertEquals(result.errors[0].field, 'field1');
    assertEquals(result.errors[0].message, 'Error message');
    assertEquals(result.errors[0].type, 'error');
});

Deno.test("ValidationResult - addWarning adds warning without affecting isValid", () => {
    const result = new ValidationResult();
    result.addWarning('field1', 'Warning message');

    assert(result.isValid);
    assertEquals(result.warnings.length, 1);
    assertEquals(result.warnings[0].field, 'field1');
    assertEquals(result.warnings[0].message, 'Warning message');
    assertEquals(result.warnings[0].type, 'warning');
});

Deno.test("ValidationResult - addInfo adds info without affecting isValid", () => {
    const result = new ValidationResult();
    result.addInfo('field1', 'Info message');

    assert(result.isValid);
    assertEquals(result.info.length, 1);
    assertEquals(result.info[0].field, 'field1');
    assertEquals(result.info[0].message, 'Info message');
    assertEquals(result.info[0].type, 'info');
});

Deno.test("ValidationResult - method chaining works", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error 1')
        .addWarning('field2', 'Warning 1')
        .addInfo('field3', 'Info 1');

    assertFalse(result.isValid);
    assertEquals(result.errors.length, 1);
    assertEquals(result.warnings.length, 1);
    assertEquals(result.info.length, 1);
});

Deno.test("ValidationResult - hasErrors returns correct value", () => {
    const result1 = new ValidationResult();
    assertFalse(result1.hasErrors());

    result1.addError('field1', 'Error');
    assert(result1.hasErrors());
});

Deno.test("ValidationResult - hasWarnings returns correct value", () => {
    const result1 = new ValidationResult();
    assertFalse(result1.hasWarnings());

    result1.addWarning('field1', 'Warning');
    assert(result1.hasWarnings());
});

Deno.test("ValidationResult - hasInfo returns correct value", () => {
    const result1 = new ValidationResult();
    assertFalse(result1.hasInfo());

    result1.addInfo('field1', 'Info');
    assert(result1.hasInfo());
});

Deno.test("ValidationResult - getAllMessages returns all messages", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error')
        .addWarning('field2', 'Warning')
        .addInfo('field3', 'Info');

    const allMessages = result.getAllMessages();
    assertEquals(allMessages.length, 3);
    assertEquals(allMessages[0].type, 'error');
    assertEquals(allMessages[1].type, 'warning');
    assertEquals(allMessages[2].type, 'info');
});

Deno.test("ValidationResult - getMessageCounts returns correct counts", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addError('field2', 'Error2')
        .addWarning('field3', 'Warning1')
        .addInfo('field4', 'Info1');

    const counts = result.getMessageCounts();
    assertEquals(counts.errors, 2);
    assertEquals(counts.warnings, 1);
    assertEquals(counts.info, 1);
    assertEquals(counts.total, 4);
});

Deno.test("ValidationResult - formatMessages returns formatted string", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addWarning('field2', 'Warning1');

    const formatted = result.formatMessages();
    assert(formatted.includes('Errors (1)'));
    assert(formatted.includes('field1: Error1'));
    assert(formatted.includes('Warnings (1)'));
    assert(formatted.includes('field2: Warning1'));
});

Deno.test("ValidationResult - formatMessages can exclude info", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addInfo('field2', 'Info1');

    const formatted = result.formatMessages(false);
    assert(formatted.includes('Errors (1)'));
    assertFalse(formatted.includes('Info'));
});

Deno.test("ValidationResult - getErrorsForField returns field-specific errors", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addError('field1', 'Error2')
        .addError('field2', 'Error3');

    const field1Errors = result.getErrorsForField('field1');
    assertEquals(field1Errors.length, 2);
    assertEquals(field1Errors[0].message, 'Error1');
    assertEquals(field1Errors[1].message, 'Error2');
});

Deno.test("ValidationResult - getWarningsForField returns field-specific warnings", () => {
    const result = new ValidationResult()
        .addWarning('field1', 'Warning1')
        .addWarning('field2', 'Warning2');

    const field1Warnings = result.getWarningsForField('field1');
    assertEquals(field1Warnings.length, 1);
    assertEquals(field1Warnings[0].message, 'Warning1');
});

Deno.test("ValidationResult - getMessagesForField returns all messages for field", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addWarning('field1', 'Warning1')
        .addInfo('field1', 'Info1')
        .addError('field2', 'Error2');

    const field1Messages = result.getMessagesForField('field1');
    assertEquals(field1Messages.length, 3);
});

Deno.test("ValidationResult - merge combines two results", () => {
    const result1 = new ValidationResult()
        .addError('field1', 'Error1');

    const result2 = new ValidationResult()
        .addWarning('field2', 'Warning1');

    result1.merge(result2);

    assertEquals(result1.errors.length, 1);
    assertEquals(result1.warnings.length, 1);
    assertFalse(result1.isValid);
});

Deno.test("ValidationResult - merge sets isValid to false if other has errors", () => {
    const result1 = new ValidationResult();
    const result2 = new ValidationResult().addError('field1', 'Error1');

    assert(result1.isValid);
    result1.merge(result2);
    assertFalse(result1.isValid);
});

Deno.test("ValidationResult - merge throws if not merging with ValidationResult", () => {
    const result = new ValidationResult();
    let errorThrown = false;

    try {
        result.merge({ errors: [] } as any);
    } catch (e) {
        errorThrown = true;
        assert(e instanceof TypeError);
    }

    assert(errorThrown);
});

Deno.test("ValidationResult - toJSON returns plain object", () => {
    const result = new ValidationResult()
        .addError('field1', 'Error1')
        .addWarning('field2', 'Warning1');

    const json = result.toJSON() as any; // Type assertion for test
    assertFalse(json.isValid);
    assertEquals(json.errors.length, 1);
    assertEquals(json.warnings.length, 1);
    assertEquals(json.counts.errors, 1);
    assertEquals(json.counts.warnings, 1);
});

Deno.test("ValidationResult - fromJSON creates ValidationResult from object", () => {
    const obj = {
        isValid: false,
        errors: [{ field: 'field1', message: 'Error1', type: 'error' }],
        warnings: [{ field: 'field2', message: 'Warning1', type: 'warning' }],
        info: []
    };

    const result = ValidationResult.fromJSON(obj);
    assertFalse(result.isValid);
    assertEquals(result.errors.length, 1);
    assertEquals(result.warnings.length, 1);
});

Deno.test("ValidationResult - valid() creates valid result", () => {
    const result = ValidationResult.valid();
    assert(result.isValid);
    assertEquals(result.errors.length, 0);
});

Deno.test("ValidationResult - invalid() with string creates invalid result with one error", () => {
    const result = ValidationResult.invalid('Error message', 'field1');
    assertFalse(result.isValid);
    assertEquals(result.errors.length, 1);
    assertEquals(result.errors[0].field, 'field1');
    assertEquals(result.errors[0].message, 'Error message');
});

Deno.test("ValidationResult - invalid() with array creates invalid result with multiple errors", () => {
    const errors = [
        { field: 'field1', message: 'Error1' },
        { field: 'field2', message: 'Error2' }
    ];

    const result = ValidationResult.invalid(errors);
    assertFalse(result.isValid);
    assertEquals(result.errors.length, 2);
});

Deno.test("ValidationResult - withWarnings() with string creates result with one warning", () => {
    const result = ValidationResult.withWarnings('Warning message', 'field1');
    assert(result.isValid);
    assertEquals(result.warnings.length, 1);
    assertEquals(result.warnings[0].field, 'field1');
});

Deno.test("ValidationResult - withWarnings() with array creates result with multiple warnings", () => {
    const warnings = [
        { field: 'field1', message: 'Warning1' },
        { field: 'field2', message: 'Warning2' }
    ];

    const result = ValidationResult.withWarnings(warnings);
    assert(result.isValid);
    assertEquals(result.warnings.length, 2);
});

Deno.test("ValidationResult - combine merges multiple results", () => {
    const result1 = new ValidationResult().addError('field1', 'Error1');
    const result2 = new ValidationResult().addWarning('field2', 'Warning1');
    const result3 = new ValidationResult().addInfo('field3', 'Info1');

    const combined = ValidationResult.combine([result1, result2, result3]);

    assertEquals(combined.errors.length, 1);
    assertEquals(combined.warnings.length, 1);
    assertEquals(combined.info.length, 1);
    assertFalse(combined.isValid);
});

Deno.test("ValidationResult - combine handles empty array", () => {
    const combined = ValidationResult.combine([]);
    assert(combined.isValid);
    assertEquals(combined.errors.length, 0);
});

Deno.test("ValidationResult - combine ignores non-ValidationResult items", () => {
    const result1 = new ValidationResult().addError('field1', 'Error1');
    const combined = ValidationResult.combine([result1, null as any, undefined as any]);

    assertEquals(combined.errors.length, 1);
});
