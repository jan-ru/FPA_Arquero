/**
 * UIController - Main UI controller for the application
 *
 * This class coordinates all UI interactions and data flow between:
 * - DataLoader (file loading)
 * - DataStore (data storage)
 * - StatementGenerator (statement generation)
 * - AgGridStatementRenderer (statement rendering)
 *
 * It handles:
 * - File selection and loading
 * - Statement generation and display
 * - Export functionality
 * - Validation and error handling
 * - Event listener setup
 */

import DataLoader from '../data/DataLoader.js';
import DataStore from '../data/DataStore.js';
import StatementGenerator from '../statements/StatementGenerator.js';
import AgGridStatementRenderer from './AgGridStatementRenderer.js';
import { UI_CONFIG, UI_STATEMENT_TYPES, isLTMSelected } from '../constants.js';
import { YEAR_CONFIG } from '../constants.js';
import APP_CONFIG from '../config/appConfig.js';
import FileSelectionService from '../services/FileSelectionService.ts';
import StatusMessageService from '../services/StatusMessageService.ts';
import FileMetricsService from '../services/FileMetricsService.ts';
import ValidationService from '../services/ValidationService.ts';
import ReportRegistry from '../reports/ReportRegistry.js';
import ReportLoader from '../reports/ReportLoader.js';
import ReportValidator from '../reports/ReportValidator.js';

class UIController {
    constructor() {
        this.dataStore = new DataStore();
        this.dataLoader = new DataLoader();
        this.statementGenerator = new StatementGenerator(this.dataStore);
        this.agGridRenderer = new AgGridStatementRenderer('ag-grid-container');

        // Use centralized config for defaults
        this.currentStatementType = this.mapStatementType(APP_CONFIG.statements.defaultType);
        this.currentStatementData = null;

        // Store metadata for file status display
        this.fileMetadata = {
            '2024': null,
            '2025': null
        };

        // Initialize services
        this.fileSelectionService = new FileSelectionService(this.dataLoader);
        this.statusMessageService = new StatusMessageService();
        this.fileMetricsService = new FileMetricsService(this.dataStore);
        this.validationService = new ValidationService(this.statementGenerator);

        // Initialize report registry and loader
        this.reportRegistry = ReportRegistry.getInstance();
        this.reportValidator = new ReportValidator();
        this.reportLoader = new ReportLoader(this.reportValidator);

        // Initialize UI with filenames from config
        this.initializeFilenames();

        // Initialize status message service DOM references
        this.statusMessageService.initialize();

        // Load report definitions
        this.loadReportDefinitions();
    }

    /**
     * Initialize filenames from config
     */
    initializeFilenames() {
        const filename2024 = APP_CONFIG.excel.trialBalance2024;
        const filename2025 = APP_CONFIG.excel.trialBalance2025;

        const filenameElement2024 = document.getElementById('filename-tb2024');
        const filenameElement2025 = document.getElementById('filename-tb2025');

        if (filenameElement2024) filenameElement2024.textContent = filename2024;
        if (filenameElement2025) filenameElement2025.textContent = filename2025;
    }

    /**
     * Map statement type from config format to UI constant
     * @param {string} configType - Type from APP_CONFIG ('income-statement', etc.)
     * @returns {string} UI_STATEMENT_TYPES constant
     */
    mapStatementType(configType) {
        const mapping = {
            'income-statement': UI_STATEMENT_TYPES.INCOME_STATEMENT,
            'balance-sheet': UI_STATEMENT_TYPES.BALANCE_SHEET,
            'cash-flow': UI_STATEMENT_TYPES.CASH_FLOW
        };
        return mapping[configType] || UI_STATEMENT_TYPES.INCOME_STATEMENT;
    }

    // Update file status indicator - delegate to service
    updateFileStatus(fileId, status, message) {
        this.statusMessageService.updateFileStatus(fileId, status, message);
    }

    // Status message methods removed - use this.statusMessageService directly

    // Handle input directory selection - delegate to service
    async handleSelectInputDirectory() {
        const result = await this.fileSelectionService.selectAndValidateDirectory();

        if (result.canceled) {
            console.log('Directory selection was canceled');
            return;
        }

        if (!result.success) {
            this.statusMessageService.showError(result.error);
            return;
        }

        this.statusMessageService.updateDirectoryStatus(result.pathDisplay, true);
        console.log('Required files found, loading...');
        await this.handleLoadAllFiles();
    }

    // Load all files
    async handleLoadAllFiles() {
        this.statusMessageService.showLoading('Loading trial balance files...');

        try {
            // Step 1: Load trial balance for 2024 (movements and balances with hierarchy included)
            this.statusMessageService.showLoading('Loading 2024 trial balance...');
            this.updateFileStatus('tb2024', 'loading');
            const { movements: movements2024, balances: balances2024, metadata: metadata2024 } = await this.dataLoader.loadTrialBalance('2024');

            this.dataStore.setFactTable(movements2024, '2024', 'movements');
            this.dataStore.setFactTable(balances2024, '2024', 'balances');

            // Store metadata for later use
            this.fileMetadata['2024'] = {
                originalRows: metadata2024.rows,
                originalColumns: metadata2024.columns,
                longRows: movements2024.numRows() + balances2024.numRows(),
                longColumns: movements2024.columnNames().length
            };

            // Step 2: Load trial balance for 2025 (movements and balances with hierarchy included)
            this.statusMessageService.showLoading('Loading 2025 trial balance...');
            this.updateFileStatus('tb2025', 'loading');
            const { movements: movements2025, balances: balances2025, metadata: metadata2025 } = await this.dataLoader.loadTrialBalance('2025');

            this.dataStore.setFactTable(movements2025, '2025', 'movements');
            this.dataStore.setFactTable(balances2025, '2025', 'balances');

            // Store metadata for later use
            this.fileMetadata['2025'] = {
                originalRows: metadata2025.rows,
                originalColumns: metadata2025.columns,
                longRows: movements2025.numRows() + balances2025.numRows(),
                longColumns: movements2025.columnNames().length
            };

            // Update file status with initial profit (for "all" period)
            this.updateFileStatusProfit();

            // Step 3: Create combined data tables for both years (movements and balances)
            this.statusMessageService.showLoading('Combining data...');
            const combinedMovements = movements2024.concat(movements2025);
            const combinedBalances = balances2024.concat(balances2025);

            // Store both - we'll choose which to use based on view type
            this.dataStore.setCombinedMovements(combinedMovements);
            this.dataStore.setCombinedBalances(combinedBalances);
            console.log(`Combined movements table created: ${combinedMovements.numRows()} rows`);
            console.log(`Combined balances table created: ${combinedBalances.numRows()} rows`);

            // Get loaded years from DataStore
            const loadedYears = this.dataStore.getAllPeriods();
            console.log(`Loaded trial balance years: ${loadedYears.join(', ')}`);

            // Validate data and show results
            this.validateAndDisplayResults();

            // Clear loading message and log success to console
            const loadingStatus = document.getElementById('loading-status');
            if (loadingStatus) {
                loadingStatus.textContent = '';
            }
            console.log('✅ All files loaded successfully!');

            // Update status to show file names
            const statusText = document.getElementById('input-dir-status');
            if (statusText) {
                const dirHandle = this.dataLoader.inputDirHandle;
                const dirName = dirHandle.name;

                // Try to get full path
                let pathDisplay = dirName;
                try {
                    if (dirHandle.resolve) {
                        const path = await dirHandle.resolve(dirHandle);
                        if (path && path.length > 0) {
                            pathDisplay = path.join('/');
                        }
                    }
                } catch (e) {
                    // Path not available
                }

                statusText.innerHTML = `<strong>📁 Directory:</strong> ${pathDisplay}`;
                statusText.style.color = '#28a745';
            }

            // Show statement section
            document.getElementById('statement-section').style.display = 'block';

            // Enable export button
            document.getElementById('export-all').disabled = false;

            // Generate and display default statement from config
            this.generateAndDisplayStatement(this.currentStatementType);

        } catch (error) {
            console.error('File loading error:', error);
            console.error('Error stack:', error.stack);

            // Provide user-friendly error messages based on error type
            let userMessage = 'Failed to load files: ';

            if (error.message.includes('File not found')) {
                userMessage += 'One or more required files are missing from the selected directory. Please ensure the directory contains the trial balance files.';
            } else if (error.message.includes('Input directory not selected')) {
                userMessage += 'Please select an input directory first.';
            } else if (error.message.includes('File is empty')) {
                userMessage += 'One of the files is empty or invalid. Please check the file format.';
            } else if (error.message.includes('missing required columns')) {
                userMessage += 'File structure is invalid. ' + error.message;
            } else if (error.message.includes('permission')) {
                userMessage += 'Permission denied. Please ensure you have access to the selected directory.';
            } else if (error.message.includes('ExcelJS')) {
                userMessage += 'Failed to parse Excel file. Please ensure the files are valid Excel workbooks.';
            } else {
                userMessage += error.message || 'Unknown error occurred.';
            }

            this.statusMessageService.showError(userMessage);

            // Update status indicators to show error
            this.updateFileStatus('tb2024', 'error');
            this.updateFileStatus('tb2025', 'error');

            // Hide metrics on error
            this.fileMetricsService.hideFileMetrics('tb2024');
            this.fileMetricsService.hideFileMetrics('tb2025');

            // Show validation container with error - delegate to service
            this.validationService.displayError(userMessage);
        }
    }

    // Validate data and display results - delegate to service
    validateAndDisplayResults() {
        this.validationService.validateAndDisplay();
    }

    /**
     * Generate and display statement from a report definition
     * This method uses the configurable report system
     * 
     * @param {Object} reportDef - Report definition from ReportRegistry
     * @param {string} statementType - UI statement type constant
     */
    generateStatementFromDefinition(reportDef, statementType) {
        try {
            console.log(`Generating statement from report definition: ${reportDef.name}`);

            // Build period options (same as hardcoded method)
            const periodOptions = this.buildPeriodOptions();

            // Call StatementGenerator.generateStatementFromDefinition
            const statementData = this.statementGenerator.generateStatementFromDefinition(
                reportDef,
                periodOptions
            );

            // Validate statement data
            if (!statementData || !statementData.details) {
                throw new Error('Statement generation returned invalid data');
            }

            // Render with ag-Grid
            this.agGridRenderer.render(statementData, statementType);

            // Update current statement tracking
            this.currentStatementType = statementType;
            this.currentStatementData = statementData;

            console.log(`${reportDef.name} generated successfully with ${statementData.details.numRows()} detail rows`);

        } catch (error) {
            console.error('Error generating statement from definition:', error);
            console.error('Error stack:', error.stack);

            const display = document.getElementById('statement-display');
            if (display) {
                let errorMessage = 'Failed to generate statement from report definition: ';
                errorMessage += error.message || 'Unknown error occurred.';

                display.innerHTML = `
                    <div style="padding: 20px; background: #f8d7da; border: 1px solid #dc3545; border-radius: 4px; color: #721c24;">
                        <strong>❌ Error:</strong> ${errorMessage}
                        <br><br>
                        <small>Check the browser console for more details.</small>
                    </div>
                `;
            }

            // Fall back to hardcoded report
            this.statusMessageService.showError('Falling back to default hardcoded report');
            
            // Clear report selection
            const reportSelector = document.getElementById('report-selector');
            if (reportSelector) {
                reportSelector.value = '';
            }
            this.hideReportInfo();

            // Regenerate with hardcoded method
            this.generateAndDisplayStatement(statementType);
        }
    }

    // Generate and display statement
    generateAndDisplayStatement(statementType) {
        try {
            // Validate that data is loaded
            if (!this.dataStore.getCombinedMovements()) {
                throw new Error('No data loaded. Please load trial balance files first.');
            }

            // Get report definition - either selected or default
            const reportSelector = document.getElementById('report-selector');
            const selectedReportId = reportSelector?.value;
            
            let report;
            
            if (selectedReportId) {
                // User has selected a specific report
                report = this.reportRegistry.getReport(selectedReportId);
                
                if (!report) {
                    throw new Error(`Report '${selectedReportId}' not found in registry`);
                }
                
                // Verify report matches current statement type
                const registryType = this.getStatementTypeForRegistry(statementType);
                
                if (report.statementType !== registryType) {
                    throw new Error(
                        `Selected report is for ${report.statementType} statements, ` +
                        `but ${registryType} statement is selected.`
                    );
                }
            } else {
                // No report selected - use default report for this statement type
                const registryType = this.getStatementTypeForRegistry(statementType);
                report = this.reportRegistry.getDefaultReport(registryType);
                
                if (!report) {
                    throw new Error(
                        `No default report found for ${registryType} statements. ` +
                        `Please ensure default report definitions are loaded.`
                    );
                }
                
                console.log(`Using default report: ${report.name} (${report.reportId})`);
            }

            // Generate statement using report definition
            const statementData = this.generateStatementFromDefinition(report, statementType);
            const statementName = report.name;

            // Validate statement data
            if (!statementData || !statementData.details) {
                throw new Error('Statement generation returned invalid data');
            }

            // Render with ag-Grid (NEW)
            this.agGridRenderer.render(statementData, statementType);

            // OLD: this.interactiveUI.renderStatement(statementData, statementType, 'statement-display');
            this.currentStatementType = statementType;
            this.currentStatementData = statementData;

            console.log(`${statementName} generated successfully with ${statementData.details.numRows()} detail rows`);

        } catch (error) {
            console.error('Error generating statement:', error);
            console.error('Error stack:', error.stack);

            const display = document.getElementById('statement-display');
            if (display) {
                let errorMessage = 'Failed to generate statement: ';

                if (error.message.includes('No data loaded')) {
                    errorMessage += 'Please load trial balance files first using the "Load Files" button.';
                } else if (error.message.includes('Required data not loaded')) {
                    errorMessage += 'Trial balance data is incomplete. Please reload the files.';
                } else if (error.message.includes('Unknown statement type')) {
                    errorMessage += 'Invalid statement type selected.';
                } else if (error.message.includes('invalid data')) {
                    errorMessage += 'Statement generation produced invalid results. Please check the source data.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred.';
                }

                display.innerHTML = `
                    <div style="padding: 20px; background: #f8d7da; border: 1px solid #dc3545; border-radius: 4px; color: #721c24;">
                        <strong>❌ Error:</strong> ${errorMessage}
                        <br><br>
                        <small>Check the browser console for more details.</small>
                    </div>
                `;
            }
        }
    }

    // Handle export all statements
    async handleExportCurrent() {
        try {
            this.showExportStatus('Exporting all statements...', 'loading');

            // Import the multi-statement export function
            const { exportMultipleStatementsToExcel } = await import('../export/excel-export.js');

            // Get current period options (same logic as generateAndDisplayStatement)
            const periodOptions = this.buildPeriodOptions();

            // Generate all three statements
            const statements = await this.generateAllStatementsForExport(periodOptions);

            // Export all statements to a single Excel file with multiple tabs
            await exportMultipleStatementsToExcel(statements, 'Financial_Statements');

            this.showExportStatus('All statements exported successfully!', 'success');

        } catch (error) {
            this.showExportStatus('Export failed: ' + error.message, 'error');
            console.error('Export error:', error);
        }
    }

    // Build period options from current UI selections
    buildPeriodOptions() {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);
        const periodValue = document.getElementById('period-selector')?.value || 'all';
        const comparisonType = document.getElementById('comparison-selector')?.value || 'yoy';

        let periodOptions;

        if (isLTMSelected(periodValue)) {
            // LTM selected from period dropdown
            periodOptions = {
                [`period${year1}`]: `${year1}-ltm`,
                [`period${year2}`]: `${year2}-ltm`
            };
        } else if (comparisonType === 'yoy') {
            // Year-over-Year
            periodOptions = {
                [`period${year1}`]: `${year1}-${periodValue}`,
                [`period${year2}`]: `${year2}-${periodValue}`
            };
        } else if (comparisonType === 'ltm') {
            // LTM from comparison selector
            periodOptions = {
                [`period${year1}`]: `${year1}-all`,
                [`period${year2}`]: `${year2}-all`,
                isLTM: true,
                ltmEndPeriod: periodValue
            };
        } else {
            // Month-over-Month or default
            periodOptions = {
                [`period${year1}`]: `${year1}-${periodValue}`,
                [`period${year2}`]: `${year2}-${periodValue}`
            };
        }

        return periodOptions;
    }

    // Generate all three statements for export (without rendering to UI)
    async generateAllStatementsForExport(periodOptions) {
        const statements = [];
        const statementTypes = [
            { type: UI_STATEMENT_TYPES.BALANCE_SHEET, name: 'Balance Sheet', reportId: 'balance_sheet_default' },
            { type: UI_STATEMENT_TYPES.INCOME_STATEMENT, name: 'Income Statement', reportId: 'income_statement_default' },
            { type: UI_STATEMENT_TYPES.CASH_FLOW, name: 'Cash Flow Statement', reportId: 'cash_flow_default' }
        ];

        for (const { type, name, reportId } of statementTypes) {
            try {
                console.log(`Generating ${name} for export...`);

                // Get report definition
                const reportDef = await this.reportRegistry.getReport(reportId);
                if (!reportDef) {
                    console.warn(`Report definition not found: ${reportId}`);
                    continue;
                }

                // Generate statement data using report definition
                const statementData = this.statementGenerator.generateStatementFromDefinition(reportDef, periodOptions);

                // Validate statement data
                if (!statementData || !statementData.details) {
                    throw new Error(`${name} generation returned invalid data`);
                }

                // Create a temporary container div for the grid
                const tempContainerId = `temp-grid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const tempContainer = document.createElement('div');
                tempContainer.id = tempContainerId;
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.width = '1000px';
                tempContainer.style.height = '600px';
                document.body.appendChild(tempContainer);

                // Create a temporary AgGridStatementRenderer instance
                const AgGridStatementRenderer = (await import('./AgGridStatementRenderer.js')).default;
                const tempRenderer = new AgGridStatementRenderer(tempContainerId);

                // Render the statement to the temporary container
                tempRenderer.render(statementData, type);

                // Get the grid API and column definitions
                const gridApi = tempRenderer.gridApi;
                const columnDefs = gridApi.getColumnDefs();

                statements.push({
                    gridApi: gridApi,
                    columnDefs: columnDefs,
                    name: name
                });

                // Clean up - destroy the grid and remove the temp container
                // Note: We can't destroy yet because we need the gridApi for export
                // The temp container will be cleaned up after export completes

            } catch (error) {
                console.error(`Failed to generate ${name}:`, error);
                // Continue with other statements even if one fails
            }
        }

        return statements;
    }

    // Show export status message
    showExportStatus(message, type) {
        const statusElement = document.getElementById('export-status');
        if (statusElement) {
            statusElement.textContent = message;

            if (type === 'success') {
                statusElement.style.color = '#28a745';
            } else if (type === 'error') {
                statusElement.style.color = '#dc3545';
            } else if (type === 'loading') {
                statusElement.style.color = '#007bff';
            }

            // Clear message after 3 seconds
            if (type !== 'loading') {
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 3000);
            }
        }
    }

    // Handle statement selection
    handleTabSwitch(statementType) {
        // Update dropdown selection
        const statementSelector = document.getElementById('statement-selector');
        if (statementSelector) {
            statementSelector.value = statementType;
        }

        // Generate and display the selected statement
        this.generateAndDisplayStatement(statementType);
    }

    // Show data preview
    showDataPreview(fileId) {
        let table = null;
        let title = '';

        switch(fileId) {
            case 'tb2024':
                table = this.dataStore.getMovementsTable('2024');
                title = 'Trial Balance 2024 Movements - First 20 Rows';
                break;
            case 'tb2025':
                table = this.dataStore.getMovementsTable('2025');
                title = 'Trial Balance 2025 Movements - First 20 Rows';
                break;
            case 'tb2425':
                // Combine both movements tables
                const tb2024m = this.dataStore.getMovementsTable('2024');
                const tb2025m = this.dataStore.getMovementsTable('2025');
                if (tb2024m && tb2025m) {
                    table = tb2024m.concat(tb2025m);
                    const rowCount = table.numRows();
                    title = `Combined Movements 2024+2025 - ${rowCount.toLocaleString()} rows (showing first 20)`;
                }
                break;
        }

        if (!table) {
            return;
        }

        const previewDiv = document.getElementById('data-preview');
        const titleDiv = document.getElementById('preview-title');
        const contentDiv = document.getElementById('preview-content');

        titleDiv.textContent = title;

        // Get all rows (ag-Grid handles filtering and virtual scrolling)
        const rows = table.objects();
        const columns = table.columnNames();

        // Clear previous content and create ag-Grid container
        contentDiv.innerHTML = '<div id="preview-grid" class="ag-theme-alpine" style="height: 500px; width: 100%;"></div>';
        const gridDiv = document.getElementById('preview-grid');

        // Create column definitions
        const columnDefs = columns.map(col => ({
            field: col,
            headerName: col,
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 120
        }));

        // Create grid options
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: rows,
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                flex: 1
            },
            domLayout: 'normal',
            animateRows: true,
            onGridReady: params => {
                params.api.sizeColumnsToFit();
            }
        };

        // Create the grid using v31 API
        agGrid.createGrid(gridDiv, gridOptions);

        previewDiv.style.display = 'block';
    }

    // Calculate profit for a specific period - delegate to service
    calculateProfitForPeriod(year, periodValue) {
        return this.fileMetricsService.calculateProfitForPeriod(year, periodValue);
    }

    /**
     * Parse period value to get maximum period number - delegate to service
     * @param {string} periodValue - Period value ('all', 'q1', 'p9', '9', etc.)
     * @returns {number} Maximum period number
     */
    parsePeriodValue(periodValue) {
        return this.fileMetricsService.parsePeriodValue(periodValue);
    }

    // Update file status with period-specific profit
    updateFileStatusProfit() {
        try {
            // Get current period selection
            const periodSelector = document.getElementById('period-selector');
            const periodValue = periodSelector?.value || 'all';

            // Get years from config
            const year1 = YEAR_CONFIG.getYear(0);
            const year2 = YEAR_CONFIG.getYear(1);

            // Check if dev mode is enabled
            const devToggle = document.getElementById('dev-toggle');
            const showDetails = devToggle ? devToggle.checked : true;

            // Update 2024 metrics
            if (this.fileMetadata['2024']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2024', year1, periodValue,
                    this.fileMetadata['2024'],
                    this.formatNumber.bind(this),
                    showDetails
                );
                this.statusMessageService.updateFileStatus('tb2024', 'success', '');
            }

            // Update 2025 metrics
            if (this.fileMetadata['2025']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2025', year2, periodValue,
                    this.fileMetadata['2025'],
                    this.formatNumber.bind(this),
                    showDetails
                );
                this.statusMessageService.updateFileStatus('tb2025', 'success', '');
            }
        } catch (error) {
            console.warn('Error updating file status profit:', error);
        }
    }

    /**
     * Load report definitions from the /reports/ directory
     * Registers them in the ReportRegistry
     */
    async loadReportDefinitions() {
        try {
            console.log('Loading report definitions...');
            
            // Load all report definitions from the /reports/ directory
            const reports = await this.reportLoader.loadReportsFromDirectory('/reports/');
            
            console.log(`Loaded ${reports.length} report definitions`);
            
            // Register each report in the registry
            for (const report of reports) {
                try {
                    // Check if this is a default report (ends with _default.json)
                    const isDefault = report.reportId && report.reportId.includes('_default');
                    this.reportRegistry.register(report, isDefault);
                    console.log(`Registered report: ${report.name} (${report.reportId})`);
                } catch (error) {
                    console.error(`Failed to register report ${report.reportId}:`, error);
                }
            }
            
            // Populate the report selector dropdown
            this.populateReportSelector();
            
            // Restore last selected report from localStorage
            this.restoreSelectedReport();
            
        } catch (error) {
            console.error('Error loading report definitions:', error);
            // Don't throw - allow app to continue with hardcoded reports
        }
    }

    /**
     * Populate the report selector dropdown with available reports
     * Groups reports by statement type
     */
    populateReportSelector() {
        const reportSelector = document.getElementById('report-selector');
        if (!reportSelector) {
            console.warn('Report selector element not found');
            return;
        }

        // Clear existing options except the default
        reportSelector.innerHTML = '<option value="">Default (Hardcoded)</option>';

        // Get current statement type to filter reports
        const currentType = this.getStatementTypeForRegistry(this.currentStatementType);
        
        // Get reports for current statement type
        const reports = this.reportRegistry.getReportsByType(currentType);
        
        if (reports.length === 0) {
            console.log(`No configurable reports found for ${currentType}`);
            return;
        }

        // Add reports to dropdown
        reports.forEach(report => {
            const option = document.createElement('option');
            option.value = report.reportId;
            option.textContent = `${report.name} (v${report.version})`;
            reportSelector.appendChild(option);
        });

        console.log(`Populated report selector with ${reports.length} reports for ${currentType}`);
    }

    /**
     * Map UI statement type to registry statement type
     * @param {string} uiType - UI_STATEMENT_TYPES constant
     * @returns {string} Registry statement type (balance, income, cashflow)
     */
    getStatementTypeForRegistry(uiType) {
        const mapping = {
            [UI_STATEMENT_TYPES.INCOME_STATEMENT]: 'income',
            [UI_STATEMENT_TYPES.BALANCE_SHEET]: 'balance',
            [UI_STATEMENT_TYPES.CASH_FLOW]: 'cashflow'
        };
        return mapping[uiType] || 'income';
    }

    /**
     * Restore the last selected report from localStorage
     */
    restoreSelectedReport() {
        const selectedReportId = this.reportRegistry.getSelectedReportId();
        
        if (selectedReportId) {
            const reportSelector = document.getElementById('report-selector');
            if (reportSelector) {
                // Check if the report still exists
                if (this.reportRegistry.hasReport(selectedReportId)) {
                    reportSelector.value = selectedReportId;
                    this.updateReportInfo(selectedReportId);
                    console.log(`Restored selected report: ${selectedReportId}`);
                } else {
                    // Report no longer exists, clear selection
                    this.reportRegistry.clearSelectedReport();
                    console.warn(`Previously selected report ${selectedReportId} not found`);
                }
            }
        }
    }

    /**
     * Handle report selection change
     * Persists selection to localStorage and regenerates statement
     */
    handleReportSelectionChange() {
        const reportSelector = document.getElementById('report-selector');
        if (!reportSelector) return;

        const selectedReportId = reportSelector.value;

        if (selectedReportId) {
            // Save selection to localStorage
            try {
                this.reportRegistry.setSelectedReportId(selectedReportId);
                console.log(`Selected report: ${selectedReportId}`);
            } catch (error) {
                console.error('Error saving report selection:', error);
            }

            // Update report info display
            this.updateReportInfo(selectedReportId);
        } else {
            // Clear selection (using default hardcoded report)
            this.reportRegistry.clearSelectedReport();
            this.hideReportInfo();
        }

        // Regenerate statement with new report
        if (this.currentStatementType) {
            this.generateAndDisplayStatement(this.currentStatementType);
        }
    }

    /**
     * Update the report info display with report name and version
     * @param {string} reportId - Report ID to display
     */
    updateReportInfo(reportId) {
        const report = this.reportRegistry.getReport(reportId);
        
        if (!report) {
            this.hideReportInfo();
            return;
        }

        const reportInfoDiv = document.getElementById('report-info');
        const reportNameSpan = document.getElementById('report-name');
        const reportVersionSpan = document.getElementById('report-version');

        if (reportInfoDiv && reportNameSpan && reportVersionSpan) {
            reportNameSpan.textContent = report.name;
            reportVersionSpan.textContent = `(v${report.version})`;
            reportInfoDiv.style.display = 'block';
        }
    }

    /**
     * Hide the report info display
     */
    hideReportInfo() {
        const reportInfoDiv = document.getElementById('report-info');
        if (reportInfoDiv) {
            reportInfoDiv.style.display = 'none';
        }
    }

    /**
     * Handle reload report definitions button click
     * Reloads all report definitions from files
     */
    async handleReloadReports() {
        try {
            this.statusMessageService.showLoading('Reloading report definitions...');
            
            // Clear existing reports
            this.reportRegistry.clear();
            
            // Reload reports
            await this.loadReportDefinitions();
            
            this.statusMessageService.showSuccess('Report definitions reloaded successfully');
            
            // Regenerate current statement
            if (this.currentStatementType) {
                this.generateAndDisplayStatement(this.currentStatementType);
            }
        } catch (error) {
            console.error('Error reloading reports:', error);
            this.statusMessageService.showError('Failed to reload report definitions: ' + error.message);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('select-input-dir').addEventListener('click', () => {
            console.log('Select Directory button clicked');
            this.handleSelectInputDirectory();
        });

        // Dev toggle - show/hide metrics and dev info
        const devToggle = document.getElementById('dev-toggle');
        if (devToggle) {
            devToggle.addEventListener('change', () => {
                const showDetails = devToggle.checked;
                const devInfo = document.getElementById('dev-info');

                // Show/hide dev info section
                if (devInfo) {
                    devInfo.style.display = showDetails ? 'block' : 'none';
                }

                // Update metrics display
                this.updateFileStatusProfit();
            });
        }

        // Statement selector dropdown
        const statementSelector = document.getElementById('statement-selector');
        if (statementSelector) {
            statementSelector.addEventListener('change', () => {
                this.handleTabSwitch(statementSelector.value);
                // Update report selector options for new statement type
                this.populateReportSelector();
            });
        }

        // Report selector dropdown
        const reportSelector = document.getElementById('report-selector');
        if (reportSelector) {
            reportSelector.addEventListener('change', () => {
                this.handleReportSelectionChange();
            });
        }

        // Reload report definitions button
        const reloadReportBtn = document.getElementById('reload-report-btn');
        if (reloadReportBtn) {
            reloadReportBtn.addEventListener('click', () => {
                this.handleReloadReports();
            });
        }

        // Period selector - re-render on change
        const periodSelector = document.getElementById('period-selector');
        if (periodSelector) {
            periodSelector.addEventListener('change', () => {
                // If LTM is selected, automatically turn off variance columns and disable selector
                const varianceSelector = document.getElementById('variance-selector');
                const isLTM = isLTMSelected(periodSelector.value);

                if (varianceSelector) {
                    if (isLTM) {
                        varianceSelector.value = 'none';
                        varianceSelector.disabled = true;
                        varianceSelector.style.backgroundColor = '#e2e8f0';
                        varianceSelector.style.cursor = 'not-allowed';
                    } else {
                        varianceSelector.disabled = false;
                        varianceSelector.style.backgroundColor = 'white';
                        varianceSelector.style.cursor = 'pointer';
                    }
                }

                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
                // Update file status profit for the new period
                this.updateFileStatusProfit();
            });
        }

        // Comparison selector - re-render on change (YoY vs LTM)
        const comparisonSelector = document.getElementById('comparison-selector');
        if (comparisonSelector) {
            comparisonSelector.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Variance selector - re-render on change
        const varianceSelector = document.getElementById('variance-selector');
        if (varianceSelector) {
            varianceSelector.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Detail level dropdown - re-render on change
        const detailLevelDropdown = document.getElementById('detail-level');
        if (detailLevelDropdown) {
            detailLevelDropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // View type dropdown (cumulative vs period) - re-render on change
        const viewTypeDropdown = document.getElementById('view-type');
        if (viewTypeDropdown) {
            viewTypeDropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Export button
        document.getElementById('export-all').addEventListener('click', () => {
            this.handleExportCurrent();
        });

        // Initialize variance selector state based on period selection
        if (periodSelector && varianceSelector) {
            const isLTM = isLTMSelected(periodSelector.value);
            if (isLTM) {
                varianceSelector.value = 'none';
                varianceSelector.disabled = true;
                varianceSelector.style.backgroundColor = '#e2e8f0';
                varianceSelector.style.cursor = 'not-allowed';
            }
        }

        // File preview clicks
        document.querySelectorAll('.file-status-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.file;
                this.showDataPreview(fileId);
            });
        });

        // Close preview button
        document.getElementById('close-preview').addEventListener('click', () => {
            document.getElementById('data-preview').style.display = 'none';
        });

        // Variance toggle
        document.getElementById('show-variance')?.addEventListener('change', () => {
            // Re-render the current statement
            if (this.currentStatementType) {
                this.handleTabSwitch(this.currentStatementType);
            }
        });



        // Detail level dropdown is now in the table header and handled by the table's event listeners
    }

    // Helper: Format number with thousand separators
    formatNumber(value) {
        if (value === null || value === undefined) return '0';
        return Math.round(value).toLocaleString(APP_CONFIG.display.locale);
    }
}

export default UIController;
