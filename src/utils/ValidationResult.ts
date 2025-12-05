/**
 * ValidationResult - Structured validation result container
 *
 * Provides a consistent way to handle validation across the application,
 * supporting errors, warnings, and informational messages.
 */

export interface ValidationMessage {
    field: string;
    message: string;
    type: 'error' | 'warning' | 'info';
}

export interface MessageCounts {
    errors: number;
    warnings: number;
    info: number;
    total: number;
}

export interface ValidationJSON {
    isValid: boolean;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
    info: ValidationMessage[];
    counts: MessageCounts;
}

export default class ValidationResult {
    isValid: boolean;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
    info: ValidationMessage[];

    constructor(isValid = true) {
        this.isValid = isValid;
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    addError(field: string, message: string): ValidationResult {
        this.errors.push({ field, message, type: 'error' });
        this.isValid = false;
        return this;
    }

    addWarning(field: string, message: string): ValidationResult {
        this.warnings.push({ field, message, type: 'warning' });
        return this;
    }

    addInfo(field: string, message: string): ValidationResult {
        this.info.push({ field, message, type: 'info' });
        return this;
    }

    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    hasWarnings(): boolean {
        return this.warnings.length > 0;
    }

    hasInfo(): boolean {
        return this.info.length > 0;
    }

    getAllMessages(): ValidationMessage[] {
        return [...this.errors, ...this.warnings, ...this.info];
    }

    getMessageCounts(): MessageCounts {
        return {
            errors: this.errors.length,
            warnings: this.warnings.length,
            info: this.info.length,
            total: this.errors.length + this.warnings.length + this.info.length
        };
    }

    formatMessages(includeInfo = true): string {
        const messages: string[] = [];

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

    getErrorsForField(field: string): ValidationMessage[] {
        return this.errors.filter(e => e.field === field);
    }

    getWarningsForField(field: string): ValidationMessage[] {
        return this.warnings.filter(w => w.field === field);
    }

    getMessagesForField(field: string): ValidationMessage[] {
        return this.getAllMessages().filter(m => m.field === field);
    }

    merge(other: ValidationResult): ValidationResult {
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

    toJSON(): ValidationJSON {
        return {
            isValid: this.isValid,
            errors: this.errors,
            warnings: this.warnings,
            info: this.info,
            counts: this.getMessageCounts()
        };
    }

    static fromJSON(obj: any): ValidationResult {
        const result = new ValidationResult(obj.isValid ?? true);
        result.errors = obj.errors || [];
        result.warnings = obj.warnings || [];
        result.info = obj.info || [];
        return result;
    }

    static valid(): ValidationResult {
        return new ValidationResult(true);
    }

    static invalid(errors: Array<{field?: string; message: string}> | string, field = 'general'): ValidationResult {
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

    static withWarnings(warnings: Array<{field?: string; message: string}> | string, field = 'general'): ValidationResult {
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

    static combine(results: ValidationResult[]): ValidationResult {
        const combined = ValidationResult.valid();

        results.forEach(result => {
            if (result instanceof ValidationResult) {
                combined.merge(result);
            }
        });

        return combined;
    }
}
