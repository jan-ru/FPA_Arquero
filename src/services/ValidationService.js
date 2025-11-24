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

export class ValidationService {
    /**
     * Create a new ValidationService
     * @param {StatementGenerator} statementGenerator - Statement generator instance
     */
    constructor(statementGenerator) {
        this.statementGenerator = statementGenerator;
    }

    /**
     * Validate data and return results
     * @returns {Object} Validation result with errors and warnings
     */
    validateData() {
        return this.statementGenerator.validateData();
    }

    /**
     * Prepare validation display data
     * @param {Object} validation - Validation result
     * @returns {Object} Prepared display data with errors, warnings, and info messages
     */
    prepareValidationDisplay(validation) {
        const displayData = {
            errors: [],
            warnings: [],
            info: []
        };

        // Add validation errors
        if (validation.errors && validation.errors.length > 0) {
            displayData.errors = validation.errors.map(error => ({
                message: error,
                icon: '❌'
            }));
        }

        // Add validation warnings
        if (validation.warnings && validation.warnings.length > 0) {
            displayData.warnings = validation.warnings.map(warning => ({
                message: warning,
                icon: '⚠️'
            }));
        }

        // Add Afrondingsverschil replacement messages
        if (window.afrondingsReplacements && window.afrondingsReplacements.length > 0) {
            window.afrondingsReplacements.forEach(replacement => {
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
     * @param {Object} validation - Validation result
     */
    displayValidationResults(validation) {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        if (!validationContainer || !errorsContainer || !warningsContainer) {
            console.warn('Validation containers not found in DOM');
            return;
        }

        // Clear previous messages
        errorsContainer.innerHTML = '';
        warningsContainer.innerHTML = '';

        const displayData = this.prepareValidationDisplay(validation);

        // Display info messages (Afrondingsverschil replacements)
        if (displayData.info.length > 0) {
            displayData.info.forEach(item => {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'validation-warning-item';
                infoDiv.innerHTML = `${item.icon} <strong>${item.message}</strong>`;
                warningsContainer.appendChild(infoDiv);
            });
        }

        // Display errors
        if (displayData.errors.length > 0) {
            displayData.errors.forEach(item => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.textContent = `${item.icon} ${item.message}`;
                errorsContainer.appendChild(errorDiv);
            });
        }

        // Display warnings
        if (displayData.warnings.length > 0) {
            displayData.warnings.forEach(item => {
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
     * @returns {boolean} True if there are validation messages
     */
    validateAndDisplay() {
        const validation = this.validateData();
        return this.displayValidationResults(validation);
    }

    /**
     * Clear validation messages from UI
     */
    clearValidationMessages() {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        if (errorsContainer) errorsContainer.innerHTML = '';
        if (warningsContainer) warningsContainer.innerHTML = '';
        if (validationContainer) validationContainer.style.display = 'none';
    }

    /**
     * Display error in validation container
     * @param {string} errorMessage - Error message to display
     */
    displayError(errorMessage) {
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
     * @param {Object} validation - Validation result
     * @returns {boolean} True if there are errors
     */
    hasErrors(validation) {
        return validation && validation.errors && validation.errors.length > 0;
    }

    /**
     * Check if validation has warnings
     * @param {Object} validation - Validation result
     * @returns {boolean} True if there are warnings
     */
    hasWarnings(validation) {
        return validation && validation.warnings && validation.warnings.length > 0;
    }

    /**
     * Get summary of validation results
     * @param {Object} validation - Validation result
     * @returns {Object} Summary with counts
     */
    getValidationSummary(validation) {
        return {
            errorCount: validation?.errors?.length || 0,
            warningCount: validation?.warnings?.length || 0,
            infoCount: window.afrondingsReplacements?.length || 0,
            isValid: !this.hasErrors(validation)
        };
    }
}

export default ValidationService;
