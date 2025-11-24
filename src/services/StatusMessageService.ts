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

// Type definitions
export type MessageType = 'info' | 'error' | 'success' | 'warning';
export type FileStatus = 'success' | 'error' | 'loading';

export interface MessageConfig {
    readonly icon: string;
    readonly color: string;
}

export interface ValidationMessages {
    readonly errors?: string[];
    readonly warnings?: string[];
}

export interface FileStatusUpdate {
    readonly status: FileStatus;
    readonly message?: string;
}

export interface FileStatusMap {
    [fileId: string]: FileStatusUpdate;
}

export class StatusMessageService {
    private loadingStatusElement: HTMLElement | null = null;
    private inputDirStatusElement: HTMLElement | null = null;

    /**
     * Create a new StatusMessageService
     */
    constructor() {
        // Initialize to null, will be set in initialize()
    }

    /**
     * Initialize DOM element references
     * Should be called after DOM is ready
     */
    initialize(): void {
        this.loadingStatusElement = document.getElementById('loading-status');
        this.inputDirStatusElement = document.getElementById('input-dir-status');
    }

    /**
     * Show a status message in the loading status area
     * @param message - Message to display
     * @param type - Message type
     */
    showMessage(message: string, type: MessageType = 'info'): void {
        if (!this.loadingStatusElement) {
            console.warn('Loading status element not initialized');
            return;
        }

        const config: Record<MessageType, MessageConfig> = {
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
     * @param message - Loading message
     */
    showLoading(message: string): void {
        this.showMessage(message, 'info');
    }

    /**
     * Show error message
     * @param message - Error message
     */
    showError(message: string): void {
        this.showMessage(message, 'error');
    }

    /**
     * Show success message
     * @param message - Success message
     */
    showSuccess(message: string): void {
        this.showMessage(message, 'success');
    }

    /**
     * Show warning message
     * @param message - Warning message
     */
    showWarning(message: string): void {
        this.showMessage(message, 'warning');
    }

    /**
     * Clear the status message
     */
    clearMessage(): void {
        if (this.loadingStatusElement) {
            this.loadingStatusElement.textContent = '';
        }
    }

    /**
     * Update directory status display
     * @param pathDisplay - Path to display
     * @param success - Whether selection was successful
     */
    updateDirectoryStatus(pathDisplay: string, success: boolean = true): void {
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
     * @param fileId - File ID (e.g., 'tb2024', 'tb2025')
     * @param status - Status type
     * @param message - Optional message to display
     */
    updateFileStatus(fileId: string, status: FileStatus, message: string = ''): void {
        const statusElement = document.getElementById(`status-${fileId}`);
        if (!statusElement) {
            console.warn(`File status element not found: status-${fileId}`);
            return;
        }

        const statusConfig: Record<FileStatus, MessageConfig> = {
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
     * @param statuses - Object with fileId as keys and {status, message} as values
     * @example
     * showFileStatuses({
     *   'tb2024': { status: 'success', message: 'Loaded' },
     *   'tb2025': { status: 'loading' }
     * })
     */
    updateFileStatuses(statuses: FileStatusMap): void {
        for (const [fileId, { status, message }] of Object.entries(statuses)) {
            this.updateFileStatus(fileId, status, message);
        }
    }

    /**
     * Update validation messages display
     * @param validation - Validation result object
     */
    updateValidationMessages(validation: ValidationMessages): void {
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
            validation.errors.forEach((error: string) => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.textContent = '❌ ' + error;
                errorsContainer.appendChild(errorDiv);
            });
        }

        // Display warnings
        if (validation.warnings && validation.warnings.length > 0) {
            validation.warnings.forEach((warning: string) => {
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
