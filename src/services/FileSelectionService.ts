import Logger from '../utils/Logger.ts';

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

import APP_CONFIG from '../config/appConfig.ts';

// Interface definitions
export interface DirectorySelection {
    readonly dirHandle: FileSystemDirectoryHandle;
    readonly dirName: string;
    readonly pathDisplay: string;
}

export interface DirectoryValidation {
    readonly valid: boolean;
    readonly error: string | null;
}

export interface RequiredFilesCheck {
    readonly exists: boolean;
    readonly missingFiles: string[];
}

export interface SelectionResult {
    readonly success: boolean;
    readonly dirHandle?: FileSystemDirectoryHandle;
    readonly dirName?: string;
    readonly pathDisplay?: string;
    readonly error?: string;
    readonly canceled?: boolean;
}

// DataLoader interface (minimal typing for what we need)
interface DataLoader {
    selectInputDirectory(): Promise<void>;
    inputDirHandle: FileSystemDirectoryHandle;
}

export class FileSelectionService {
    private readonly dataLoader: DataLoader;

    /**
     * Create a new FileSelectionService
     * @param dataLoader - DataLoader instance for directory operations
     */
    constructor(dataLoader: DataLoader) {
        this.dataLoader = dataLoader;
    }

    /**
     * Select input directory using File System Access API
     * @returns Promise resolving to directory selection details
     * @throws {Error} If user cancels or directory selection fails
     */
    async selectDirectory(): Promise<DirectorySelection> {
        await this.dataLoader.selectInputDirectory();

        const dirHandle = this.dataLoader.inputDirHandle;
        const dirName = dirHandle.name;
        const pathDisplay = await this.getPathDisplay(dirHandle, dirName);

        return { dirHandle, dirName, pathDisplay };
    }

    /**
     * Get formatted path display for directory
     * @param dirHandle - Directory handle
     * @param dirName - Directory name fallback
     * @returns Promise resolving to formatted path or directory name
     * @private
     */
    private async getPathDisplay(dirHandle: FileSystemDirectoryHandle, dirName: string): Promise<string> {
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
     * @param dirName - Directory name to validate
     * @returns Validation result with valid flag and optional error message
     */
    validateDirectoryName(dirName: string): DirectoryValidation {
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
     * @returns Promise resolving to check results with missing files list
     */
    async checkRequiredFiles(): Promise<RequiredFilesCheck> {
        const requiredFiles = [
            APP_CONFIG.excel.trialBalance2024,
            APP_CONFIG.excel.trialBalance2025
        ];

        const missingFiles: string[] = [];

        for (const filename of requiredFiles) {
            try {
                await this.dataLoader.inputDirHandle.getFileHandle(filename);
                Logger.debug(`✓ Found: ${filename}`);
            } catch (error) {
                Logger.debug(`✗ Missing: ${filename}`);
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
     * @returns Array of required file names
     */
    getRequiredFileNames(): string[] {
        return [
            APP_CONFIG.excel.trialBalance2024,
            APP_CONFIG.excel.trialBalance2025
        ];
    }

    /**
     * Complete directory selection and validation workflow
     * @returns Promise resolving to selection result with success flag and details
     */
    async selectAndValidateDirectory(): Promise<SelectionResult> {
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
            if ((error as Error).name === 'AbortError') {
                return {
                    success: false,
                    error: 'Directory selection canceled',
                    canceled: true
                };
            }

            // Other errors
            return {
                success: false,
                error: (error as Error).message || 'Failed to select directory'
            };
        }
    }
}

export default FileSelectionService;
