import ValidationResult from '../utils/ValidationResult.ts';
import Logger from '../utils/Logger.ts';
import { ErrorFactory } from '../errors/index.ts';
import type ReportValidator from './ReportValidator.ts';
import type { ReportDefinition } from './ReportValidator.ts';

/**
 * ReportLoader - Loads and validates report definitions from JSON files
 * 
 * Provides functionality to:
 * - Load report definitions from files, URLs, or directories
 * - Parse JSON with detailed error messages
 * - Validate report definitions before use
 * - Cache loaded definitions in memory
 * - Support hot-reloading during development
 * 
 * @example
 * const loader = new ReportLoader(validator);
 * const reportDef = await loader.loadReport('/reports/income_statement.json');
 * 
 * if (reportDef) {
 *   console.log('Loaded report:', reportDef.name);
 * }
 */

/**
 * Loading options
 */
export interface LoadOptions {
    forceReload?: boolean;
}

/**
 * Manifest file structure
 */
export interface ReportManifest {
    reports: string[];
}

export default class ReportLoader {
    private validator: ReportValidator | null;
    private cache: Map<string, ReportDefinition>;
    private lastModified: Map<string, Date>;

    /**
     * Create a new ReportLoader
     * @param validator - ReportValidator instance for validating definitions
     */
    constructor(validator: ReportValidator | null = null) {
        this.validator = validator;
        
        // Cache for loaded report definitions
        // Key: file path or URL, Value: report definition object
        this.cache = new Map();
        
        // Track last modified times for hot-reloading
        this.lastModified = new Map();
    }

    /**
     * Load a single report definition from a file path
     * 
     * @param filePath - Path to the report definition JSON file
     * @param options - Loading options
     * @returns Report definition object or null if loading fails
     * @throws Error if file cannot be loaded or parsed
     * 
     * @example
     * const report = await loader.loadReport('/reports/income_statement.json');
     * const report = await loader.loadReport('/reports/income_statement.json', { forceReload: true });
     */
    async loadReport(filePath: string, options: LoadOptions = {}): Promise<ReportDefinition | null> {
        try {
            // Check cache first (unless force reload)
            if (!options.forceReload && this.cache.has(filePath)) {
                return this.cache.get(filePath)!;
            }

            // Convert file path to URL if needed
            // For browser environments, use relative URLs (served by HTTP server)
            // For absolute paths starting with /, use them as-is (relative to server root)
            const url = filePath.startsWith('http://') || filePath.startsWith('https://')
                ? filePath
                : filePath; // Use path as-is for HTTP server

            // Fetch the file
            const response = await fetch(url);
            
            if (!response.ok) {
                throw ErrorFactory.fetchFailed(url, response.status, response.statusText);
            }

            // Get the JSON text
            const jsonText = await response.text();
            
            // Parse JSON with error handling
            const reportDef = this.parseJSON(jsonText, filePath);
            
            // Validate the report definition
            const validationResult = this.validateReport(reportDef);
            
            if (!validationResult.isValid) {
                const errors = validationResult.errors.map(e => e.message);
                Logger.error(`Report definition validation failed for ${filePath}`);
                throw ErrorFactory.schemaValidation('ReportDefinition', errors);
            }

            // Cache the loaded definition
            this.cache.set(filePath, reportDef);
            
            // Track last modified time if available
            const lastModified = response.headers.get('Last-Modified');
            if (lastModified) {
                this.lastModified.set(filePath, new Date(lastModified));
            }

            return reportDef;
        } catch (error) {
            Logger.error(`Error loading report from ${filePath}:`, error);
            
            // Re-throw custom errors as-is
            if ((error as any).code) {
                throw error;
            }
            
            // Wrap other errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('NetworkError')) {
                throw ErrorFactory.reportNotFound(filePath);
            }
            
            throw ErrorFactory.wrap(error as Error, { 
                operation: 'loadReport',
                filePath 
            });
        }
    }

    /**
     * Load all report definitions from a directory
     * 
     * Note: This method requires the File System Access API or a server-side endpoint
     * that returns a list of files in the directory. In a browser environment without
     * server support, this will need to be adapted to work with a manifest file.
     * 
     * @param dirPath - Path to directory containing report definition files
     * @returns Array of report definition objects
     * 
     * @example
     * const reports = await loader.loadReportsFromDirectory('/reports/');
     */
    async loadReportsFromDirectory(dirPath: string): Promise<ReportDefinition[]> {
        try {
            // Ensure dirPath ends with /
            const normalizedPath = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
            
            // Check if we're running in Deno and can use file system API
            if (typeof Deno !== 'undefined' && (Deno as any).readDir) {
                try {
                    const files: string[] = [];
                    for await (const entry of (Deno as any).readDir(dirPath)) {
                        if (entry.isFile && entry.name.endsWith('.json')) {
                            files.push(entry.name);
                        }
                    }
                    
                    if (files.length === 0) {
                        return [];
                    }
                    
                    const loadPromises = files.map(filename => 
                        this.loadReport(`${normalizedPath}${filename}`)
                    );
                    
                    const results = await Promise.allSettled(loadPromises);
                    
                    // Filter out failed loads and return successful ones
                    return results
                        .filter((result): result is PromiseFulfilledResult<ReportDefinition | null> => 
                            result.status === 'fulfilled' && result.value !== null)
                        .map(result => result.value!);
                } catch (denoError: any) {
                    if (denoError.name === 'NotFound') {
                        throw ErrorFactory.directoryNotFound(dirPath, denoError);
                    }
                    throw ErrorFactory.wrap(denoError, { 
                        operation: 'loadReportsFromDirectory',
                        dirPath 
                    });
                }
            }
            
            // Browser environment: Try to fetch a manifest file that lists available reports
            const manifestPath = `${normalizedPath}manifest.json`;
            
            try {
                const manifestResponse = await fetch(manifestPath);
                
                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json() as ReportManifest;
                    
                    if (Array.isArray(manifest.reports)) {
                        // Load each report from the manifest
                        const loadPromises = manifest.reports.map(filename => 
                            this.loadReport(`${normalizedPath}${filename}`)
                        );
                        
                        const results = await Promise.allSettled(loadPromises);
                        
                        // Filter out failed loads and return successful ones
                        return results
                            .filter((result): result is PromiseFulfilledResult<ReportDefinition | null> => 
                                result.status === 'fulfilled' && result.value !== null)
                            .map(result => result.value!);
                    }
                }
            } catch (manifestError) {
                Logger.warn(`No manifest found at ${manifestPath}, trying alternative approach`);
            }

            // Alternative: Try common report filenames
            const commonFilenames = [
                'income_statement_default.json',
                'balance_sheet_default.json',
                'cash_flow_default.json',
                'income_statement_nl.json',
                'income_statement_ifrs.json',
                'balance_sheet_nl.json',
                'balance_sheet_ifrs.json'
            ];

            const loadPromises = commonFilenames.map(filename => 
                this.loadReport(`${normalizedPath}${filename}`).catch(() => null)
            );

            const results = await Promise.all(loadPromises);
            
            // Filter out null results (failed loads)
            return results.filter((report): report is ReportDefinition => report !== null);
        } catch (error) {
            Logger.error(`Error loading reports from directory ${dirPath}:`, error);
            
            // Re-throw custom errors
            if ((error as any).code) {
                throw error;
            }
            
            return [];
        }
    }

    /**
     * Load a report definition from a URL
     * 
     * @param url - URL to the report definition JSON file
     * @returns Report definition object or null if loading fails
     * 
     * @example
     * const report = await loader.loadReportFromURL('https://example.com/reports/income.json');
     */
    async loadReportFromURL(url: string): Promise<ReportDefinition | null> {
        // This is essentially the same as loadReport, but we make it explicit
        // that it can handle full URLs
        return this.loadReport(url);
    }

    /**
     * Validate a report definition
     * 
     * @param reportDef - Report definition to validate
     * @returns Validation result with any errors
     * 
     * @example
     * const result = loader.validateReport(reportDef);
     * if (!result.isValid) {
     *   console.error('Validation errors:', result.formatMessages());
     * }
     */
    validateReport(reportDef: any): ValidationResult {
        if (!this.validator) {
            // If no validator provided, create a basic validation result
            const result = new ValidationResult();
            
            if (!reportDef || typeof reportDef !== 'object') {
                result.addError('reportDef', 'Report definition must be an object');
            }
            
            return result;
        }

        return this.validator.validate(reportDef);
    }

    /**
     * Parse JSON string with enhanced error handling
     * Provides line numbers and helpful error messages for JSON parse errors
     * 
     * @param jsonString - JSON string to parse
     * @param source - Optional source identifier for error messages
     * @returns Parsed JSON object
     * @throws Error if JSON parsing fails, with line number information
     * 
     * @example
     * try {
     *   const obj = loader.parseJSON(jsonText, 'income_statement.json');
     * } catch (error) {
     *   console.error('Parse error:', error.message);
     * }
     */
    parseJSON(jsonString: string, source: string = 'unknown'): ReportDefinition {
        try {
            return JSON.parse(jsonString) as ReportDefinition;
        } catch (error) {
            // Try to extract line number from error message
            let lineNumber: number | null = null;
            let columnNumber: number | null = null;

            const errorMessage = error instanceof Error ? error.message : String(error);

            // Different browsers format JSON errors differently
            // Try to extract position information
            const positionMatch = errorMessage.match(/position (\d+)/i);
            if (positionMatch) {
                const position = parseInt(positionMatch[1], 10);
                const lines = jsonString.substring(0, position).split('\n');
                lineNumber = lines.length;
                columnNumber = lines[lines.length - 1].length + 1;
            }

            // Build helpful error message
            let errorMsg = `JSON parse error`;
            
            if (lineNumber !== null) {
                errorMsg += ` at line ${lineNumber}`;
                if (columnNumber !== null) {
                    errorMsg += `, column ${columnNumber}`;
                }
            }
            
            errorMsg += `: ${errorMessage}`;

            // If we have line number, include context
            if (lineNumber !== null) {
                const lines = jsonString.split('\n');
                const contextStart = Math.max(0, lineNumber - 3);
                const contextEnd = Math.min(lines.length, lineNumber + 2);
                
                errorMsg += '\n\nContext:\n';
                for (let i = contextStart; i < contextEnd; i++) {
                    const marker = (i === lineNumber - 1) ? '>>> ' : '    ';
                    errorMsg += `${marker}${i + 1}: ${lines[i]}\n`;
                }
            }

            throw ErrorFactory.fileParse(source, new Error(errorMsg));
        }
    }

    /**
     * Clear the cache for a specific file or all files
     * Useful for hot-reloading during development
     * 
     * @param filePath - Optional file path to clear from cache. If not provided, clears entire cache
     * 
     * @example
     * // Clear specific file
     * loader.clearCache('/reports/income_statement.json');
     * 
     * // Clear all cached reports
     * loader.clearCache();
     */
    clearCache(filePath?: string): void {
        if (filePath) {
            this.cache.delete(filePath);
            this.lastModified.delete(filePath);
        } else {
            this.cache.clear();
            this.lastModified.clear();
        }
    }

    /**
     * Reload a report definition, bypassing the cache
     * Useful for hot-reloading during development
     * 
     * @param filePath - Path to the report definition file
     * @returns Reloaded report definition
     * 
     * @example
     * const updatedReport = await loader.reloadReport('/reports/income_statement.json');
     */
    async reloadReport(filePath: string): Promise<ReportDefinition | null> {
        this.clearCache(filePath);
        return this.loadReport(filePath);
    }

    /**
     * Check if a report has been modified since it was loaded
     * Useful for implementing hot-reload functionality
     * 
     * @param filePath - Path to the report definition file
     * @returns True if the report has been modified
     * 
     * @example
     * if (await loader.hasReportChanged('/reports/income_statement.json')) {
     *   await loader.reloadReport('/reports/income_statement.json');
     * }
     */
    async hasReportChanged(filePath: string): Promise<boolean> {
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            
            if (!response.ok) {
                return false;
            }

            const lastModified = response.headers.get('Last-Modified');
            if (!lastModified) {
                // Can't determine if changed
                return false;
            }

            const currentModified = new Date(lastModified);
            const cachedModified = this.lastModified.get(filePath);

            if (!cachedModified) {
                // Not in cache, so consider it changed
                return true;
            }

            return currentModified > cachedModified;
        } catch (error) {
            Logger.error(`Error checking if report changed: ${filePath}`, error);
            return false;
        }
    }

    /**
     * Get all cached report definitions
     * 
     * @returns Array of all cached report definitions
     * 
     * @example
     * const cachedReports = loader.getCachedReports();
     * console.log(`${cachedReports.length} reports in cache`);
     */
    getCachedReports(): ReportDefinition[] {
        return Array.from(this.cache.values());
    }

    /**
     * Check if a report is cached
     * 
     * @param filePath - Path to the report definition file
     * @returns True if the report is in cache
     * 
     * @example
     * if (loader.isCached('/reports/income_statement.json')) {
     *   console.log('Report is already loaded');
     * }
     */
    isCached(filePath: string): boolean {
        return this.cache.has(filePath);
    }
}
