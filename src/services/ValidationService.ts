/**
 * ValidationService - Handles data validation operations
 *
 * Responsibilities:
 * - Validate trial balance data
 * - Detect unmapped accounts
 * - Display validation results
 * - Handle Afrondingsverschil replacements
 *
 * Extracted from UIController to improve separation of concerns
 */

// Type definitions
export interface ValidationResult {
    readonly errors?: string[];
    readonly warnings?: string[];
}

export interface ValidationDisplayItem {
    readonly message: string;
    readonly icon: string;
}

export interface ValidationDisplayData {
    readonly errors: ValidationDisplayItem[];
    readonly warnings: ValidationDisplayItem[];
    readonly info: ValidationDisplayItem[];
}

export interface ValidationSummary {
    readonly errorCount: number;
    readonly warningCount: number;
    readonly infoCount: number;
    readonly isValid: boolean;
}

// Window interface extension for global afrondingsReplacements
declare global {
    interface Window {
        afrondingsReplacements?: string[];
    }
}

// StatementGenerator interface (minimal typing for what we need)
interface StatementGenerator {
    validateData(): ValidationResult;
}

export class ValidationService {
    private readonly statementGenerator: StatementGenerator;

    /**
     * Create a new ValidationService
     * @param statementGenerator - Statement generator instance
     */
    constructor(statementGenerator: StatementGenerator) {
        this.statementGenerator = statementGenerator;
    }

    /**
     * Validate data and return results
     * @returns Validation result with errors and warnings
     */
    validateData(): ValidationResult {
        return this.statementGenerator.validateData();
    }

    /**
     * Prepare validation display data
     * @param validation - Validation result
     * @returns Prepared display data with errors, warnings, and info messages
     */
    prepareValidationDisplay(validation: ValidationResult): ValidationDisplayData {
        const displayData: ValidationDisplayData = {
            errors: [],
            warnings: [],
            info: []
        };

        // Add validation errors
        if (validation.errors && validation.errors.length > 0) {
            displayData.errors = validation.errors.map((error: string): ValidationDisplayItem => ({
                message: error,
                icon: '❌'
            }));
        }

        // Add validation warnings
        if (validation.warnings && validation.warnings.length > 0) {
            displayData.warnings = validation.warnings.map((warning: string): ValidationDisplayItem => ({
                message: warning,
                icon: '⚠️'
            }));
        }

        // Add Afrondingsverschil replacement messages
        if (window.afrondingsReplacements && window.afrondingsReplacements.length > 0) {
            window.afrondingsReplacements.forEach((replacement: string) => {
                displayData.info.push({
                    message: `Account replaced: ${replacement}`,
                    icon: 'ℹ️'
                });
            });
        }

        return displayData;
    }

    /**
     * Display validation results in the UI
     * @param validation - Validation result
     * @returns True if there are validation messages
     */
    displayValidationResults(validation: ValidationResult): boolean {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        if (!validationContainer || !errorsContainer || !warningsContainer) {
            console.warn('Validation containers not found in DOM');
            return false;
        }

        // Clear previous messages
        errorsContainer.innerHTML = '';
        warningsContainer.innerHTML = '';

        const displayData = this.prepareValidationDisplay(validation);

        // Display info messages (Afrondingsverschil replacements)
        if (displayData.info.length > 0) {
            displayData.info.forEach((item: ValidationDisplayItem) => {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'validation-warning-item';
                infoDiv.innerHTML = `${item.icon} <strong>${item.message}</strong>`;
                warningsContainer.appendChild(infoDiv);
            });
        }

        // Display errors
        if (displayData.errors.length > 0) {
            displayData.errors.forEach((item: ValidationDisplayItem) => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.textContent = `${item.icon} ${item.message}`;
                errorsContainer.appendChild(errorDiv);
            });
        }

        // Display warnings
        if (displayData.warnings.length > 0) {
            displayData.warnings.forEach((item: ValidationDisplayItem) => {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'validation-warning-item';
                warningDiv.textContent = `${item.icon} ${item.message}`;
                warningsContainer.appendChild(warningDiv);
            });
        }

        // Show/hide container based on content
        const hasMessages = displayData.errors.length > 0 ||
                           displayData.warnings.length > 0 ||
                           displayData.info.length > 0;
        validationContainer.style.display = hasMessages ? 'block' : 'none';

        return hasMessages;
    }

    /**
     * Validate and display results (convenience method)
     * @returns True if there are validation messages
     */
    validateAndDisplay(): boolean {
        const validation = this.validateData();
        return this.displayValidationResults(validation);
    }

    /**
     * Clear validation messages from UI
     */
    clearValidationMessages(): void {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        if (errorsContainer) errorsContainer.innerHTML = '';
        if (warningsContainer) warningsContainer.innerHTML = '';
        if (validationContainer) validationContainer.style.display = 'none';
    }

    /**
     * Display error in validation container
     * @param errorMessage - Error message to display
     */
    displayError(errorMessage: string): void {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');

        if (validationContainer && errorsContainer) {
            errorsContainer.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error-item';
            errorDiv.innerHTML = `<strong>Loading Error:</strong> ${errorMessage}`;
            errorsContainer.appendChild(errorDiv);
            validationContainer.style.display = 'block';
        }
    }

    /**
     * Check if validation has errors
     * @param validation - Validation result
     * @returns True if there are errors
     */
    hasErrors(validation: ValidationResult): boolean {
        return Boolean(validation && validation.errors && validation.errors.length > 0);
    }

    /**
     * Check if validation has warnings
     * @param validation - Validation result
     * @returns True if there are warnings
     */
    hasWarnings(validation: ValidationResult): boolean {
        return Boolean(validation && validation.warnings && validation.warnings.length > 0);
    }

    /**
     * Get summary of validation results
     * @param validation - Validation result
     * @returns Summary with counts
     */
    getValidationSummary(validation: ValidationResult): ValidationSummary {
        return {
            errorCount: validation?.errors?.length || 0,
            warningCount: validation?.warnings?.length || 0,
            infoCount: window.afrondingsReplacements?.length || 0,
            isValid: !this.hasErrors(validation)
        };
    }
}

export default ValidationService;
