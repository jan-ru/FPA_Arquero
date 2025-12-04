/**
 * ReportRegistry - Manages collection of available report definitions
 * 
 * Provides functionality to:
 * - Register and manage report definitions
 * - Retrieve reports by ID or statement type
 * - Maintain report uniqueness
 * - Persist selected report in localStorage
 * - Provide default reports for each statement type
 * 
 * Implements singleton pattern for global access.
 * 
 * @example
 * const registry = ReportRegistry.getInstance();
 * registry.register(reportDef);
 * const report = registry.getReport('income_statement_nl');
 */
export default class ReportRegistry {
    /**
     * Private constructor for singleton pattern
     * Use getInstance() to get the registry instance
     */
    constructor() {
        if (ReportRegistry.instance) {
            return ReportRegistry.instance;
        }

        // Store reports in Map keyed by reportId
        this.reports = new Map();
        
        // Track default reports for each statement type
        this.defaults = new Map();
        
        // localStorage key for persisting selected report
        this.STORAGE_KEY = 'selectedReportId';
        
        ReportRegistry.instance = this;
    }

    /**
     * Get the singleton instance of ReportRegistry
     * 
     * @returns {ReportRegistry} The singleton registry instance
     * 
     * @example
     * const registry = ReportRegistry.getInstance();
     */
    static getInstance() {
        if (!ReportRegistry.instance) {
            ReportRegistry.instance = new ReportRegistry();
        }
        return ReportRegistry.instance;
    }

    /**
     * Register a report definition in the registry
     * Validates that reportId is unique before registering
     * 
     * @param {Object} reportDef - Report definition to register
     * @param {string} reportDef.reportId - Unique identifier for the report
     * @param {string} reportDef.statementType - Type of statement (balance, income, cashflow)
     * @param {string} reportDef.name - Display name of the report
     * @param {boolean} [isDefault=false] - Whether this is the default report for its type
     * @throws {Error} If reportId already exists in registry
     * 
     * @example
     * registry.register({
     *   reportId: 'income_statement_nl',
     *   name: 'Income Statement (NL)',
     *   statementType: 'income',
     *   // ... other fields
     * });
     */
    register(reportDef, isDefault = false) {
        if (!reportDef || typeof reportDef !== 'object') {
            throw new Error('Report definition must be an object');
        }

        if (!reportDef.reportId) {
            throw new Error('Report definition must have a reportId');
        }

        if (!reportDef.statementType) {
            throw new Error('Report definition must have a statementType');
        }

        // Validate reportId uniqueness
        if (this.reports.has(reportDef.reportId)) {
            const existing = this.reports.get(reportDef.reportId);
            throw new Error(
                `Report ID '${reportDef.reportId}' already exists. ` +
                `Existing report: '${existing.name}', New report: '${reportDef.name}'`
            );
        }

        // Register the report
        this.reports.set(reportDef.reportId, reportDef);

        // Set as default if specified or if no default exists for this type
        if (isDefault || !this.defaults.has(reportDef.statementType)) {
            this.defaults.set(reportDef.statementType, reportDef.reportId);
        }
    }

    /**
     * Get a report definition by its ID
     * 
     * @param {string} reportId - Unique identifier of the report
     * @returns {Object|null} Report definition or null if not found
     * 
     * @example
     * const report = registry.getReport('income_statement_nl');
     * if (report) {
     *   console.log('Found report:', report.name);
     * }
     */
    getReport(reportId) {
        return this.reports.get(reportId) || null;
    }

    /**
     * Get all reports for a specific statement type
     * 
     * @param {string} statementType - Type of statement (balance, income, cashflow)
     * @returns {Object[]} Array of report definitions for the specified type
     * 
     * @example
     * const incomeReports = registry.getReportsByType('income');
     * console.log(`Found ${incomeReports.length} income statement reports`);
     */
    getReportsByType(statementType) {
        const reports = [];
        
        for (const report of this.reports.values()) {
            if (report.statementType === statementType) {
                reports.push(report);
            }
        }
        
        return reports;
    }

    /**
     * Get all available reports in the registry
     * 
     * @returns {Object[]} Array of all report definitions
     * 
     * @example
     * const allReports = registry.getAllReports();
     * console.log(`Total reports: ${allReports.length}`);
     */
    getAllReports() {
        return Array.from(this.reports.values());
    }

    /**
     * Check if a report exists in the registry
     * 
     * @param {string} reportId - Unique identifier of the report
     * @returns {boolean} True if the report exists
     * 
     * @example
     * if (registry.hasReport('income_statement_nl')) {
     *   console.log('Report is available');
     * }
     */
    hasReport(reportId) {
        return this.reports.has(reportId);
    }

    /**
     * Remove a report from the registry
     * 
     * @param {string} reportId - Unique identifier of the report to remove
     * @returns {boolean} True if the report was removed, false if it didn't exist
     * 
     * @example
     * if (registry.unregister('old_report')) {
     *   console.log('Report removed successfully');
     * }
     */
    unregister(reportId) {
        const report = this.reports.get(reportId);
        
        if (!report) {
            return false;
        }

        // If this was the default for its type, clear the default
        if (this.defaults.get(report.statementType) === reportId) {
            this.defaults.delete(report.statementType);
            
            // Try to set another report of the same type as default
            const sameTypeReports = this.getReportsByType(report.statementType);
            if (sameTypeReports.length > 0) {
                this.defaults.set(report.statementType, sameTypeReports[0].reportId);
            }
        }

        // Remove from registry
        return this.reports.delete(reportId);
    }

    /**
     * Get the default report for a statement type
     * 
     * @param {string} statementType - Type of statement (balance, income, cashflow)
     * @returns {Object|null} Default report definition or null if none exists
     * 
     * @example
     * const defaultIncome = registry.getDefaultReport('income');
     * if (defaultIncome) {
     *   console.log('Default income report:', defaultIncome.name);
     * }
     */
    getDefaultReport(statementType) {
        const defaultId = this.defaults.get(statementType);
        
        if (!defaultId) {
            return null;
        }

        return this.getReport(defaultId);
    }

    /**
     * Set a report as the default for its statement type
     * 
     * @param {string} reportId - Unique identifier of the report
     * @throws {Error} If the report doesn't exist
     * 
     * @example
     * registry.setDefaultReport('income_statement_ifrs');
     */
    setDefaultReport(reportId) {
        const report = this.getReport(reportId);
        
        if (!report) {
            throw new Error(`Cannot set default: Report '${reportId}' not found`);
        }

        this.defaults.set(report.statementType, reportId);
    }

    /**
     * Get the currently selected report ID from localStorage
     * 
     * @returns {string|null} Selected report ID or null if none selected
     * 
     * @example
     * const selectedId = registry.getSelectedReportId();
     * if (selectedId) {
     *   const report = registry.getReport(selectedId);
     * }
     */
    getSelectedReportId() {
        try {
            return localStorage.getItem(this.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to read selected report from localStorage:', error);
            return null;
        }
    }

    /**
     * Set the currently selected report ID in localStorage
     * 
     * @param {string} reportId - Unique identifier of the report to select
     * @throws {Error} If the report doesn't exist in the registry
     * 
     * @example
     * registry.setSelectedReportId('income_statement_nl');
     */
    setSelectedReportId(reportId) {
        if (!this.hasReport(reportId)) {
            throw new Error(`Cannot select report: Report '${reportId}' not found in registry`);
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, reportId);
        } catch (error) {
            console.warn('Failed to save selected report to localStorage:', error);
        }
    }

    /**
     * Get the currently selected report definition
     * Falls back to default report if selected report not found
     * 
     * @param {string} statementType - Type of statement (balance, income, cashflow)
     * @returns {Object|null} Selected or default report definition
     * 
     * @example
     * const report = registry.getSelectedReport('income');
     * if (report) {
     *   console.log('Using report:', report.name);
     * }
     */
    getSelectedReport(statementType) {
        // Try to get the selected report
        const selectedId = this.getSelectedReportId();
        
        if (selectedId) {
            const report = this.getReport(selectedId);
            
            // Verify it matches the requested statement type
            if (report && report.statementType === statementType) {
                return report;
            }
        }

        // Fall back to default report for this type
        return this.getDefaultReport(statementType);
    }

    /**
     * Clear the selected report from localStorage
     * 
     * @example
     * registry.clearSelectedReport();
     */
    clearSelectedReport() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear selected report from localStorage:', error);
        }
    }

    /**
     * Clear all reports from the registry
     * Useful for testing or reloading all reports
     * 
     * @example
     * registry.clear();
     */
    clear() {
        this.reports.clear();
        this.defaults.clear();
    }

    /**
     * Get the count of registered reports
     * 
     * @returns {number} Number of reports in the registry
     * 
     * @example
     * console.log(`Registry contains ${registry.count()} reports`);
     */
    count() {
        return this.reports.size;
    }

    /**
     * Get all statement types that have registered reports
     * 
     * @returns {string[]} Array of statement types
     * 
     * @example
     * const types = registry.getStatementTypes();
     * // ['balance', 'income', 'cashflow']
     */
    getStatementTypes() {
        const types = new Set();
        
        for (const report of this.reports.values()) {
            types.add(report.statementType);
        }
        
        return Array.from(types);
    }

    /**
     * Export registry state for debugging or persistence
     * 
     * @returns {Object} Registry state including all reports and defaults
     * 
     * @example
     * const state = registry.exportState();
     * console.log('Registry state:', JSON.stringify(state, null, 2));
     */
    exportState() {
        return {
            reports: Array.from(this.reports.entries()),
            defaults: Array.from(this.defaults.entries()),
            selectedReportId: this.getSelectedReportId(),
            count: this.count()
        };
    }

    /**
     * Import registry state from exported data
     * Clears existing registry before importing
     * 
     * @param {Object} state - Exported registry state
     * 
     * @example
     * registry.importState(previousState);
     */
    importState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }

        this.clear();

        // Import reports
        if (Array.isArray(state.reports)) {
            for (const [reportId, reportDef] of state.reports) {
                this.reports.set(reportId, reportDef);
            }
        }

        // Import defaults
        if (Array.isArray(state.defaults)) {
            for (const [statementType, reportId] of state.defaults) {
                this.defaults.set(statementType, reportId);
            }
        }

        // Import selected report
        if (state.selectedReportId) {
            try {
                this.setSelectedReportId(state.selectedReportId);
            } catch (error) {
                console.warn('Could not restore selected report:', error);
            }
        }
    }
}

// Initialize singleton instance
ReportRegistry.instance = null;
