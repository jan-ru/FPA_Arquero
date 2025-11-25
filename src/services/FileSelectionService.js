/**
 * FileSelectionService - Handles directory and file selection operations
 *
 * Responsibilities:
 * - Directory selection via File System Access API
 * - Directory name validation
 * - Required file existence checks
 * - Path display formatting
 *
 * Extracted from UIController to improve separation of concerns
 */

import APP_CONFIG from '../config/appConfig.js';

/**
 * @typedef {Object} DirectorySelection
 * @property {FileSystemDirectoryHandle} dirHandle
 * @property {string} dirName
 * @property {string} pathDisplay
 */

/**
 * @typedef {Object} DirectoryValidation
 * @property {boolean} valid
 * @property {string | null} error
 */

/**
 * @typedef {Object} RequiredFilesCheck
 * @property {boolean} exists
 * @property {string[]} missingFiles
 */

/**
 * @typedef {Object} SelectionResult
 * @property {boolean} success
 * @property {FileSystemDirectoryHandle} [dirHandle]
 * @property {string} [dirName]
 * @property {string} [pathDisplay]
 * @property {string} [error]
 * @property {boolean} [canceled]
 */

export class FileSelectionService {
    /**
     * Create a new FileSelectionService
     * @param {Object} dataLoader - DataLoader instance for directory operations
     */
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
    }

    /**
     * Select input directory using File System Access API
     * @returns {Promise<DirectorySelection>} Promise resolving to directory selection details
     * @throws {Error} If user cancels or directory selection fails
     */
    async selectDirectory() {
        await this.dataLoader.selectInputDirectory();

        const dirHandle = this.dataLoader.inputDirHandle;
        const dirName = dirHandle.name;
        const pathDisplay = await this.getPathDisplay(dirHandle, dirName);

        return { dirHandle, dirName, pathDisplay };
    }

    /**
     * Get formatted path display for directory
     * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
     * @param {string} dirName - Directory name fallback
     * @returns {Promise<string>} Promise resolving to formatted path or directory name
     * @private
     */
    async getPathDisplay(dirHandle, dirName) {
        try {
            if (dirHandle.resolve) {
                const path = await dirHandle.resolve(dirHandle);
                if (path && path.length > 0) {
                    return path.join('/');
                }
            }
        } catch (e) {
            // Path resolution not available in this browser
        }
        return dirName;
    }

    /**
     * Validate that directory is named "input"
     * @param {string} dirName - Directory name to validate
     * @returns {DirectoryValidation} Validation result with valid flag and optional error message
     */
    validateDirectoryName(dirName) {
        const expectedName = 'input';
        const isValid = dirName.toLowerCase() === expectedName;

        if (!isValid) {
            return {
                valid: false,
                error: `Directory must be named "${expectedName}" (current: "${dirName}")`
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Check if all required files exist in the selected directory
     * @returns {Promise<RequiredFilesCheck>} Promise resolving to check results with missing files list
     */
    async checkRequiredFiles() {
        const requiredFiles = [
            APP_CONFIG.excel.trialBalance2024,
            APP_CONFIG.excel.trialBalance2025
        ];

        const missingFiles = [];

        for (const filename of requiredFiles) {
            try {
                await this.dataLoader.inputDirHandle.getFileHandle(filename);
                console.log(`✓ Found: ${filename}`);
            } catch (error) {
                console.log(`✗ Missing: ${filename}`);
                missingFiles.push(filename);
            }
        }

        return {
            exists: missingFiles.length === 0,
            missingFiles
        };
    }

    /**
     * Get list of required file names
     * @returns {string[]} Array of required file names
     */
    getRequiredFileNames() {
        return [
            APP_CONFIG.excel.trialBalance2024,
            APP_CONFIG.excel.trialBalance2025
        ];
    }

    /**
     * Complete directory selection and validation workflow
     * @returns {Promise<SelectionResult>} Promise resolving to selection result with success flag and details
     */
    async selectAndValidateDirectory() {
        try {
            // Step 1: Select directory
            const { dirHandle, dirName, pathDisplay } = await this.selectDirectory();

            // Step 2: Validate directory name
            const nameValidation = this.validateDirectoryName(dirName);
            if (!nameValidation.valid) {
                return {
                    success: false,
                    error: nameValidation.error || undefined
                };
            }

            // Step 3: Check for required files
            const { exists, missingFiles } = await this.checkRequiredFiles();
            if (!exists) {
                return {
                    success: false,
                    error: `Required files not found: ${missingFiles.join(', ')}`
                };
            }

            // Success
            return {
                success: true,
                dirHandle,
                dirName,
                pathDisplay
            };

        } catch (error) {
            // User canceled the dialog
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Directory selection canceled',
                    canceled: true
                };
            }

            // Other errors
            return {
                success: false,
                error: error.message || 'Failed to select directory'
            };
        }
    }
}

export default FileSelectionService;
