/**
 * ValidationResult - Structured validation result container
 *
 * Provides a consistent way to handle validation across the application,
 * supporting errors, warnings, and informational messages.
 *
 * @example
 * const result = new ValidationResult();
 * result.addError('account_code', 'Account code is required');
 * result.addWarning('amount', 'Amount is zero');
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */
export default class ValidationResult {
    /**
     * Create a new ValidationResult
     * @param {boolean} isValid - Initial validation state (default: true)
     */
    constructor(isValid = true) {
        this.isValid = isValid;
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    /**
     * Add an error to the validation result
     * Sets isValid to false
     *
     * @param {string} field - The field that failed validation
     * @param {string} message - The error message
     * @returns {ValidationResult} This instance for chaining
     */
    addError(field, message) {
        this.errors.push({ field, message, type: 'error' });
        this.isValid = false;
        return this;
    }

    /**
     * Add a warning to the validation result
     * Does not affect isValid status
     *
     * @param {string} field - The field with a warning
     * @param {string} message - The warning message
     * @returns {ValidationResult} This instance for chaining
     */
    addWarning(field, message) {
        this.warnings.push({ field, message, type: 'warning' });
        return this;
    }

    /**
     * Add an informational message to the validation result
     * Does not affect isValid status
     *
     * @param {string} field - The field with information
     * @param {string} message - The info message
     * @returns {ValidationResult} This instance for chaining
     */
    addInfo(field, message) {
        this.info.push({ field, message, type: 'info' });
        return this;
    }

    /**
     * Check if there are any errors
     * @returns {boolean} True if errors exist
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Check if there are any warnings
     * @returns {boolean} True if warnings exist
     */
    hasWarnings() {
        return this.warnings.length > 0;
    }

    /**
     * Check if there are any informational messages
     * @returns {boolean} True if info messages exist
     */
    hasInfo() {
        return this.info.length > 0;
    }

    /**
     * Get all messages (errors, warnings, info) combined
     * @returns {Array<{field: string, message: string, type: string}>}
     */
    getAllMessages() {
        return [...this.errors, ...this.warnings, ...this.info];
    }

    /**
     * Get count of all messages by type
     * @returns {{errors: number, warnings: number, info: number, total: number}}
     */
    getMessageCounts() {
        return {
            errors: this.errors.length,
            warnings: this.warnings.length,
            info: this.info.length,
            total: this.errors.length + this.warnings.length + this.info.length
        };
    }

    /**
     * Format all messages as a human-readable string
     * @param {boolean} includeInfo - Include info messages (default: true)
     * @returns {string} Formatted message string
     */
    formatMessages(includeInfo = true) {
        const messages = [];

        if (this.errors.length > 0) {
            messages.push(`Errors (${this.errors.length}):`);
            this.errors.forEach(e => {
                messages.push(`  - ${e.field}: ${e.message}`);
            });
        }

        if (this.warnings.length > 0) {
            messages.push(`Warnings (${this.warnings.length}):`);
            this.warnings.forEach(w => {
                messages.push(`  - ${w.field}: ${w.message}`);
            });
        }

        if (includeInfo && this.info.length > 0) {
            messages.push(`Info (${this.info.length}):`);
            this.info.forEach(i => {
                messages.push(`  - ${i.field}: ${i.message}`);
            });
        }

        return messages.join('\n');
    }

    /**
     * Get errors for a specific field
     * @param {string} field - The field name
     * @returns {Array<{field: string, message: string, type: string}>}
     */
    getErrorsForField(field) {
        return this.errors.filter(e => e.field === field);
    }

    /**
     * Get warnings for a specific field
     * @param {string} field - The field name
     * @returns {Array<{field: string, message: string, type: string}>}
     */
    getWarningsForField(field) {
        return this.warnings.filter(w => w.field === field);
    }

    /**
     * Get all messages for a specific field
     * @param {string} field - The field name
     * @returns {Array<{field: string, message: string, type: string}>}
     */
    getMessagesForField(field) {
        return this.getAllMessages().filter(m => m.field === field);
    }

    /**
     * Merge another ValidationResult into this one
     * @param {ValidationResult} other - Another ValidationResult to merge
     * @returns {ValidationResult} This instance for chaining
     */
    merge(other) {
        if (!(other instanceof ValidationResult)) {
            throw new TypeError('Can only merge with another ValidationResult');
        }

        this.errors.push(...other.errors);
        this.warnings.push(...other.warnings);
        this.info.push(...other.info);

        if (other.hasErrors()) {
            this.isValid = false;
        }

        return this;
    }

    /**
     * Convert to a plain object for serialization
     * @returns {Object}
     */
    toJSON() {
        return {
            isValid: this.isValid,
            errors: this.errors,
            warnings: this.warnings,
            info: this.info,
            counts: this.getMessageCounts()
        };
    }

    /**
     * Create a ValidationResult from a plain object
     * @param {Object} obj - Plain object with validation data
     * @returns {ValidationResult}
     */
    static fromJSON(obj) {
        const result = new ValidationResult(obj.isValid);
        result.errors = obj.errors || [];
        result.warnings = obj.warnings || [];
        result.info = obj.info || [];
        return result;
    }

    /**
     * Create a valid ValidationResult (no errors)
     * @returns {ValidationResult}
     */
    static valid() {
        return new ValidationResult(true);
    }

    /**
     * Create an invalid ValidationResult with errors
     * @param {Array<{field: string, message: string}>|string} errors - Errors array or single error message
     * @param {string} field - Field name if errors is a string
     * @returns {ValidationResult}
     */
    static invalid(errors, field = 'general') {
        const result = new ValidationResult(false);

        if (typeof errors === 'string') {
            result.addError(field, errors);
        } else if (Array.isArray(errors)) {
            errors.forEach(err => {
                result.addError(err.field || 'general', err.message);
            });
        }

        return result;
    }

    /**
     * Create a ValidationResult with warnings only
     * @param {Array<{field: string, message: string}>|string} warnings - Warnings array or single warning message
     * @param {string} field - Field name if warnings is a string
     * @returns {ValidationResult}
     */
    static withWarnings(warnings, field = 'general') {
        const result = new ValidationResult(true);

        if (typeof warnings === 'string') {
            result.addWarning(field, warnings);
        } else if (Array.isArray(warnings)) {
            warnings.forEach(warn => {
                result.addWarning(warn.field || 'general', warn.message);
            });
        }

        return result;
    }

    /**
     * Combine multiple ValidationResults into one
     * @param {Array<ValidationResult>} results - Array of ValidationResults to combine
     * @returns {ValidationResult}
     */
    static combine(results) {
        const combined = ValidationResult.valid();

        results.forEach(result => {
            if (result instanceof ValidationResult) {
                combined.merge(result);
            }
        });

        return combined;
    }
}
