/**
 * StatusMessageService - Handles all status message and UI feedback operations
 *
 * Responsibilities:
 * - Display status messages (info, error, success)
 * - Update file status indicators
 * - Clear status messages
 * - Format status messages with icons
 *
 * Extracted from UIController to improve separation of concerns
 */

import { UI_CONFIG } from '../constants.js';

/**
 * @typedef {'info' | 'error' | 'success' | 'warning'} MessageType
 */

/**
 * @typedef {'success' | 'error' | 'loading'} FileStatus
 */

/**
 * @typedef {Object} MessageConfig
 * @property {string} icon
 * @property {string} color
 */

/**
 * @typedef {Object} ValidationMessages
 * @property {string[]} [errors]
 * @property {string[]} [warnings]
 */

/**
 * @typedef {Object} FileStatusUpdate
 * @property {FileStatus} status
 * @property {string} [message]
 */

/**
 * @typedef {Object.<string, FileStatusUpdate>} FileStatusMap
 */

export class StatusMessageService {
    /**
     * Create a new StatusMessageService
     */
    constructor() {
        this.loadingStatusElement = null;
        this.inputDirStatusElement = null;
    }

    /**
     * Initialize DOM element references
     * Should be called after DOM is ready
     * @returns {void}
     */
    initialize() {
        this.loadingStatusElement = document.getElementById('loading-status');
        this.inputDirStatusElement = document.getElementById('input-dir-status');
    }

    /**
     * Show a status message in the loading status area
     * @param {string} message - Message to display
     * @param {MessageType} [type='info'] - Message type
     * @returns {void}
     */
    showMessage(message, type = 'info') {
        if (!this.loadingStatusElement) {
            console.warn('Loading status element not initialized');
            return;
        }

        const config = {
            info: {
                icon: UI_CONFIG.STATUS_ICONS.INFO,
                color: UI_CONFIG.STATUS_COLORS.INFO
            },
            error: {
                icon: UI_CONFIG.STATUS_ICONS.ERROR,
                color: UI_CONFIG.STATUS_COLORS.ERROR
            },
            success: {
                icon: UI_CONFIG.STATUS_ICONS.SUCCESS,
                color: UI_CONFIG.STATUS_COLORS.SUCCESS
            },
            warning: {
                icon: UI_CONFIG.STATUS_ICONS.WARNING,
                color: UI_CONFIG.STATUS_COLORS.WARNING
            }
        };

        const { icon, color } = config[type] || config.info;
        this.loadingStatusElement.textContent = icon + message;
        this.loadingStatusElement.style.color = color;
    }

    /**
     * Show loading message
     * @param {string} message - Loading message
     * @returns {void}
     */
    showLoading(message) {
        this.showMessage(message, 'info');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @returns {void}
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     * @returns {void}
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     * @returns {void}
     */
    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    /**
     * Clear the status message
     * @returns {void}
     */
    clearMessage() {
        if (this.loadingStatusElement) {
            this.loadingStatusElement.textContent = '';
        }
    }

    /**
     * Update directory status display
     * @param {string} pathDisplay - Path to display
     * @param {boolean} [success=true] - Whether selection was successful
     * @returns {void}
     */
    updateDirectoryStatus(pathDisplay, success = true) {
        if (!this.inputDirStatusElement) {
            console.warn('Input directory status element not initialized');
            return;
        }

        this.inputDirStatusElement.textContent = `📁 ${pathDisplay}`;
        this.inputDirStatusElement.style.color = success
            ? UI_CONFIG.STATUS_COLORS.SUCCESS
            : UI_CONFIG.STATUS_COLORS.ERROR;
    }

    /**
     * Update file status indicator
     * @param {string} fileId - File ID (e.g., 'tb2024', 'tb2025')
     * @param {FileStatus} status - Status type
     * @param {string} [message=''] - Optional message to display
     * @returns {void}
     */
    updateFileStatus(fileId, status, message = '') {
        const statusElement = document.getElementById(`status-${fileId}`);
        if (!statusElement) {
            console.warn(`File status element not found: status-${fileId}`);
            return;
        }

        const statusConfig = {
            success: {
                icon: UI_CONFIG.FILE_STATUS_ICONS.SUCCESS,
                color: UI_CONFIG.STATUS_COLORS.SUCCESS
            },
            error: {
                icon: UI_CONFIG.FILE_STATUS_ICONS.ERROR,
                color: UI_CONFIG.STATUS_COLORS.ERROR
            },
            loading: {
                icon: UI_CONFIG.FILE_STATUS_ICONS.LOADING,
                color: UI_CONFIG.STATUS_COLORS.LOADING
            }
        };

        const config = statusConfig[status];
        if (config) {
            statusElement.textContent = message ? `${config.icon} ${message}` : config.icon;
            statusElement.style.color = config.color;
        }
    }

    /**
     * Show multiple file statuses
     * @param {FileStatusMap} statuses - Object with fileId as keys and {status, message} as values
     * @returns {void}
     * @example
     * updateFileStatuses({
     *   'tb2024': { status: 'success', message: 'Loaded' },
     *   'tb2025': { status: 'loading' }
     * })
     */
    updateFileStatuses(statuses) {
        for (const [fileId, { status, message }] of Object.entries(statuses)) {
            this.updateFileStatus(fileId, status, message);
        }
    }

    /**
     * Update validation messages display
     * @param {ValidationMessages} validation - Validation result object
     * @returns {void}
     */
    updateValidationMessages(validation) {
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        if (!validationContainer || !errorsContainer || !warningsContainer) {
            return;
        }

        // Clear previous messages
        errorsContainer.innerHTML = '';
        warningsContainer.innerHTML = '';

        // Display errors
        if (validation.errors && validation.errors.length > 0) {
            validation.errors.forEach((error) => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.textContent = '❌ ' + error;
                errorsContainer.appendChild(errorDiv);
            });
        }

        // Display warnings
        if (validation.warnings && validation.warnings.length > 0) {
            validation.warnings.forEach((warning) => {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'validation-warning-item';
                warningDiv.textContent = '⚠️ ' + warning;
                warningsContainer.appendChild(warningDiv);
            });
        }

        // Show/hide container based on content
        const hasMessages = (validation.errors && validation.errors.length > 0) ||
                           (validation.warnings && validation.warnings.length > 0);
        validationContainer.style.display = hasMessages ? 'block' : 'none';
    }
}

export default StatusMessageService;
