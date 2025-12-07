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

import DataLoader from '../data/DataLoader.ts';
import DataStore from '../data/DataStore.ts';
import StatementGenerator from '../statements/StatementGenerator.ts';
import AgGridStatementRenderer from './AgGridStatementRenderer.ts';
import { UI_CONFIG, UI_STATEMENT_TYPES, isLTMSelected } from '../constants.ts';
import { YEAR_CONFIG } from '../constants.ts';
import APP_CONFIG from '../config/appConfig.ts';
import FileSelectionService from '../services/FileSelectionService.ts';
import StatusMessageService from '../services/StatusMessageService.ts';
import FileMetricsService from '../services/FileMetricsService.ts';
import ValidationService from '../services/ValidationService.ts';
import ReportRegistry from '../reports/ReportRegistry.ts';
import ReportLoader from '../reports/ReportLoader.ts';
import ReportValidator from '../reports/ReportValidator.ts';
import Logger from '../utils/Logger.ts';

interface FileMetadata {
    originalRows: number;
    originalColumns: number;
    longRows: number;
    longColumns: number;
}

interface ReportDefinition {
    reportId: string;
    name: string;
    version: string;
    statementType: string;
    [key: string]: any;
}

interface PeriodOptions {
    [key: string]: string | boolean;
}

interface ExportStatement {
    gridApi: any;
    columnDefs: any[];
    name: string;
}

class UIController {
    private dataStore: DataStore;
    private dataLoader: DataLoader;
    private statementGenerator: StatementGenerator;
    private agGridRenderer: AgGridStatementRenderer;
    private currentStatementType: string;
    private currentStatementData: any;
    private fileMetadata: Record<string, FileMetadata | null>;
    private fileSelectionService: FileSelectionService;
    private statusMessageService: StatusMessageService;
    private fileMetricsService: FileMetricsService;
    private validationService: ValidationService;
    private reportRegistry: ReportRegistry;
    private reportValidator: ReportValidator;
    private reportLoader: ReportLoader;

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

        // Load report definitions (async, will complete in background)
        this.loadReportDefinitions().then(count => {
            // Show the count in the dedicated report status area
            this.updateReportStatus(`✓ Loaded ${count} report definition${count !== 1 ? 's' : ''}`, 'success');
        }).catch(error => {
            Logger.error('Failed to load report definitions during initialization:', error);
            this.updateReportStatus('⚠️ Failed to load report definitions', 'error');
        });
    }

    /**
     * Update the report status display
     * @param message - Status message to display
     * @param type - Message type ('success', 'error', 'loading')
     */
    updateReportStatus(message: string, type: string = 'info'): void {
        const reportStatusText = document.getElementById('report-status-text');
        const reportStatusDiv = document.getElementById('report-status');
        
        if (reportStatusText) {
            reportStatusText.textContent = message;
        }
        
        if (reportStatusDiv) {
            // Update styling based on type
            if (type === 'success') {
                reportStatusDiv.style.background = '#d4edda';
                reportStatusDiv.style.borderLeftColor = '#28a745';
                reportStatusDiv.style.color = '#155724';
            } else if (type === 'error') {
                reportStatusDiv.style.background = '#f8d7da';
                reportStatusDiv.style.borderLeftColor = '#dc3545';
                reportStatusDiv.style.color = '#721c24';
            } else if (type === 'loading') {
                reportStatusDiv.style.background = '#d1ecf1';
                reportStatusDiv.style.borderLeftColor = '#17a2b8';
                reportStatusDiv.style.color = '#0c5460';
            } else {
                reportStatusDiv.style.background = '#f0f4f8';
                reportStatusDiv.style.borderLeftColor = '#667eea';
                reportStatusDiv.style.color = '#4a5568';
            }
        }
    }

    /**
     * Initialize filenames from config
     */
    initializeFilenames(): void {
        const filename2024 = APP_CONFIG.excel.trialBalance2024;
        const filename2025 = APP_CONFIG.excel.trialBalance2025;

        const filenameElement2024 = document.getElementById('filename-tb2024');
        const filenameElement2025 = document.getElementById('filename-tb2025');

        if (filenameElement2024) filenameElement2024.textContent = filename2024;
        if (filenameElement2025) filenameElement2025.textContent = filename2025;
    }

    /**
     * Map statement type from config format to UI constant
     * @param configType - Type from APP_CONFIG ('income-statement', etc.)
     * @returns UI_STATEMENT_TYPES constant
     */
    mapStatementType(configType: string): string {
        const mapping: Record<string, string> = {
            'income-statement': UI_STATEMENT_TYPES.INCOME_STATEMENT,
            'balance-sheet': UI_STATEMENT_TYPES.BALANCE_SHEET,
            'cash-flow': UI_STATEMENT_TYPES.CASH_FLOW
        };
        return mapping[configType] || UI_STATEMENT_TYPES.INCOME_STATEMENT;
    }

    // Update file status indicator - delegate to service
    updateFileStatus(fileId: string, status: string, message?: string): void {
        this.statusMessageService.updateFileStatus(fileId, status, message);
    }

    // Status message methods removed - use this.statusMessageService directly

    // Handle input directory selection - delegate to service
    async handleSelectInputDirectory(): Promise<void> {
        const result = await this.fileSelectionService.selectAndValidateDirectory();

        if (result.canceled) {
            Logger.debug('Directory selection was canceled');
            return;
        }

        if (!result.success) {
            this.statusMessageService.showError(result.error!);
            return;
        }

        this.statusMessageService.updateDirectoryStatus(result.pathDisplay!, true);
        Logger.debug('Required files found, loading...');
        await this.handleLoadAllFiles();
    }

    // Load all files
    async handleLoadAllFiles(): Promise<void> {
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
            Logger.debug(`Combined movements table created: ${combinedMovements.numRows()} rows`);
            Logger.debug(`Combined balances table created: ${combinedBalances.numRows()} rows`);

            // Get loaded years from DataStore
            const loadedYears = this.dataStore.getAllPeriods();
            Logger.debug(`Loaded trial balance years: ${loadedYears.join(', ')}`);

            // Validate data and show results
            this.validateAndDisplayResults();

            // Clear loading message and log success to console
            const loadingStatus = document.getElementById('loading-status');
            if (loadingStatus) {
                loadingStatus.textContent = '';
            }
            Logger.info('✅ All files loaded successfully!');

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
            const statementSection = document.getElementById('statement-section');
            if (statementSection) {
                statementSection.style.display = 'block';
            }

            // Enable export button
            const exportButton = document.getElementById('export-all') as HTMLButtonElement | null;
            if (exportButton) {
                exportButton.disabled = false;
            }

            // Generate and display default statement from config
            this.generateAndDisplayStatement(this.currentStatementType);

        } catch (error: any) {
            Logger.error('File loading error:', error);
            Logger.error('Error stack:', error.stack);

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
    validateAndDisplayResults(): void {
        this.validationService.validateAndDisplay();
    }

    /**
     * Generate and display statement from a report definition
     * This method uses the configurable report system
     * 
     * @param reportDef - Report definition from ReportRegistry
     * @param statementType - UI statement type constant
     */
    generateStatementFromDefinition(reportDef: ReportDefinition, statementType: string): any {
        try {
            Logger.debug(`Generating statement from report definition: ${reportDef.name}`);

            // Build period options (same as hardcoded method)
            const periodOptions = this.buildPeriodOptions();

            // Call StatementGenerator.generateStatementFromDefinition
            const statementData = this.statementGenerator.generateStatementFromDefinition(
                reportDef,
                periodOptions
            );

            // Debug: Log what we received
            Logger.debug('Received statement data:', {
                hasData: !!statementData,
                hasDetails: !!statementData?.details,
                keys: statementData ? Object.keys(statementData) : []
            });

            // Validate statement data
            if (!statementData || !statementData.details) {
                Logger.error('Invalid statement data structure:', statementData);
                throw new Error('Statement generation returned invalid data');
            }

            Logger.debug(`${reportDef.name} generated successfully with ${statementData.details.numRows()} detail rows`);
            
            return statementData;

        } catch (error: any) {
            Logger.error('Error generating statement from definition:', error);
            Logger.error('Error stack:', error.stack);

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

            // Don't fall back - just show the error
            // No hardcoded reports exist anymore
            throw error; // Re-throw to be caught by outer handler
        }
    }

    // Generate and display statement
    generateAndDisplayStatement(statementType: string): void {
        try {
            // Validate that data is loaded
            if (!this.dataStore.getCombinedMovements()) {
                throw new Error('No data loaded. Please load trial balance files first.');
            }

            // Get report definition - either selected or default
            const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
            const selectedReportId = reportSelector?.value;
            
            let report: ReportDefinition | null;
            
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
                
                Logger.debug(`Using default report: ${report.name} (${report.reportId})`);
            }

            // Generate statement using report definition
            const statementData = this.generateStatementFromDefinition(report, statementType);
            const statementName = report.name;

            // Render with ag-Grid
            this.agGridRenderer.render(statementData, statementType);

            // Update current statement tracking
            this.currentStatementType = statementType;
            this.currentStatementData = statementData;

            Logger.debug(`${statementName} displayed successfully`);

        } catch (error: any) {
            Logger.error('Error generating statement:', error);
            Logger.error('Error stack:', error.stack);

            const display = document.getElementById('statement-display');
            if (display) {
                let errorMessage = 'Failed to generate statement: ';

                if (error.message.includes('No data loaded')) {
                    errorMessage += 'Please load trial balance files first using the "Select Directory" button.';
                } else if (error.message.includes('Required data not loaded')) {
                    errorMessage += 'Trial balance data is incomplete. Please reload the files.';
                } else if (error.message.includes('Unknown statement type')) {
                    errorMessage += 'Invalid statement type selected.';
                } else if (error.message.includes('invalid data')) {
                    errorMessage += 'Statement generation produced invalid results. Please check the source data.';
                } else if (error.message.includes('Invalid movements data')) {
                    errorMessage += 'Data may not be loaded yet. Please select a directory and load the trial balance files first.';
                } else if (error.message.includes('Failed to resolve variable')) {
                    errorMessage += error.message + ' This may indicate that the account codes in your data do not match the report definition, or the data structure is incorrect.';
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
    async handleExportCurrent(): Promise<void> {
        try {
            this.showExportStatus('Exporting all statements...', 'loading');

            // Import the multi-statement export function
            const { exportMultipleStatementsToExcel } = await import('../export/excel-export.ts');

            // Get current period options (same logic as generateAndDisplayStatement)
            const periodOptions = this.buildPeriodOptions();

            // Generate all three statements
            const statements = await this.generateAllStatementsForExport(periodOptions);

            // Export all statements to a single Excel file with multiple tabs
            await exportMultipleStatementsToExcel(statements, 'Financial_Statements');

            this.showExportStatus('All statements exported successfully!', 'success');

        } catch (error: any) {
            this.showExportStatus('Export failed: ' + error.message, 'error');
            Logger.error('Export error:', error);
        }
    }

    // Build period options from current UI selections
    buildPeriodOptions(): PeriodOptions {
        const year1 = YEAR_CONFIG.getYear(0);
        const year2 = YEAR_CONFIG.getYear(1);
        const periodSelector = document.getElementById('period-selector') as HTMLSelectElement | null;
        const comparisonSelector = document.getElementById('comparison-selector') as HTMLSelectElement | null;
        const periodValue = periodSelector?.value || 'all';
        const comparisonType = comparisonSelector?.value || 'yoy';

        let periodOptions: PeriodOptions;

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
    async generateAllStatementsForExport(periodOptions: PeriodOptions): Promise<ExportStatement[]> {
        const statements: ExportStatement[] = [];
        const statementTypes = [
            { type: UI_STATEMENT_TYPES.BALANCE_SHEET, name: 'Balance Sheet', reportId: 'balance_sheet_default' },
            { type: UI_STATEMENT_TYPES.INCOME_STATEMENT, name: 'Income Statement', reportId: 'income_statement_default' },
            { type: UI_STATEMENT_TYPES.CASH_FLOW, name: 'Cash Flow Statement', reportId: 'cash_flow_default' }
        ];

        for (const { type, name, reportId } of statementTypes) {
            try {
                Logger.debug(`Generating ${name} for export...`);

                // Get report definition
                const reportDef = await this.reportRegistry.getReport(reportId);
                if (!reportDef) {
                    Logger.warn(`Report definition not found: ${reportId}`);
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
                const AgGridStatementRenderer = (await import('./AgGridStatementRenderer.ts')).default;
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
                Logger.error(`Failed to generate ${name}:`, error);
                // Continue with other statements even if one fails
            }
        }

        return statements;
    }

    // Show export status message
    showExportStatus(message: string, type: string): void {
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
    handleTabSwitch(statementType: string): void {
        // Update dropdown selection
        const statementSelector = document.getElementById('statement-selector') as HTMLSelectElement | null;
        if (statementSelector) {
            statementSelector.value = statementType;
        }

        // Generate and display the selected statement
        this.generateAndDisplayStatement(statementType);
    }

    // Show data preview
    showDataPreview(fileId: string): void {
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

        if (titleDiv) titleDiv.textContent = title;

        // Get all rows (ag-Grid handles filtering and virtual scrolling)
        const rows = table.objects();
        const columns = table.columnNames();

        // Clear previous content and create ag-Grid container
        if (contentDiv) {
            contentDiv.innerHTML = '<div id="preview-grid" class="ag-theme-alpine" style="height: 500px; width: 100%;"></div>';
        }
        const gridDiv = document.getElementById('preview-grid');

        // Create column definitions
        const columnDefs = columns.map((col: string) => ({
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
            onGridReady: (params: any) => {
                params.api.sizeColumnsToFit();
            }
        };

        // Create the grid
        if (gridDiv) {
            (globalThis as any).agGrid.createGrid(gridDiv, gridOptions);
        }

        if (previewDiv) {
            previewDiv.style.display = 'block';
        }
    }

    // Calculate profit for a specific period - delegate to service
    calculateProfitForPeriod(year: string, periodValue: string): number {
        return this.fileMetricsService.calculateProfitForPeriod(year, periodValue);
    }

    /**
     * Parse period value to get maximum period number - delegate to service
     * @param periodValue - Period value ('all', 'q1', 'p9', '9', etc.)
     * @returns Maximum period number
     */
    parsePeriodValue(periodValue: string): number {
        return this.fileMetricsService.parsePeriodValue(periodValue);
    }

    // Update file status with period-specific profit
    updateFileStatusProfit(): void {
        try {
            // Get current period selection
            const periodSelector = document.getElementById('period-selector') as HTMLSelectElement | null;
            const periodValue = periodSelector?.value || 'all';

            // Get years from config
            const year1 = YEAR_CONFIG.getYear(0);
            const year2 = YEAR_CONFIG.getYear(1);

            // Check if dev mode is enabled
            const devToggle = document.getElementById('dev-toggle') as HTMLInputElement | null;
            const showDetails = devToggle ? devToggle.checked : true;

            // Update 2024 metrics
            if (this.fileMetadata['2024']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2024', year1, periodValue,
                    this.fileMetadata['2024']!,
                    this.formatNumber.bind(this),
                    showDetails
                );
                this.statusMessageService.updateFileStatus('tb2024', 'success', '');
            }

            // Update 2025 metrics
            if (this.fileMetadata['2025']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2025', year2, periodValue,
                    this.fileMetadata['2025']!,
                    this.formatNumber.bind(this),
                    showDetails
                );
                this.statusMessageService.updateFileStatus('tb2025', 'success', '');
            }
        } catch (error) {
            Logger.warn('Error updating file status profit:', error);
        }
    }

    /**
     * Load report definitions from the /reports/ directory
     * Registers them in the ReportRegistry
     */
    async loadReportDefinitions(): Promise<number> {
        try {
            Logger.debug('Loading report definitions...');
            this.updateReportStatus('Loading report definitions...', 'loading');
            
            // Load all report definitions from the /reports/ directory
            const reports = await this.reportLoader.loadReportsFromDirectory('/reports/');
            
            Logger.info(`Loaded ${reports.length} report definitions`);
            
            // Register each report in the registry
            for (const report of reports) {
                try {
                    // Check if this is a default report (ends with _default.json)
                    const isDefault = report.reportId && report.reportId.includes('_default');
                    this.reportRegistry.register(report, isDefault);
                    Logger.debug(`Registered report: ${report.name} (${report.reportId})`);
                } catch (error) {
                    Logger.error(`Failed to register report ${report.reportId}:`, error);
                }
            }
            
            // Populate the report selector dropdown
            this.populateReportSelector();
            
            // Auto-select appropriate report for current statement type
            this.autoSelectReport(this.currentStatementType);
            
            // Return the count for the caller to display
            return reports.length;
            
        } catch (error) {
            Logger.error('Error loading report definitions:', error);
            // Don't throw - allow app to continue with error message
            this.updateReportStatus('⚠️ Failed to load report definitions', 'error');
            return 0;
        }
    }

    /**
     * Populate the report selector dropdown with available reports
     * Groups reports by statement type
     */
    populateReportSelector(): void {
        const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
        if (!reportSelector) {
            Logger.warn('Report selector element not found');
            return;
        }

        // Clear all existing options (no hardcoded default)
        reportSelector.innerHTML = '';

        // Get current statement type to filter reports
        const currentType = this.getStatementTypeForRegistry(this.currentStatementType);
        
        // Get reports for current statement type
        const reports = this.reportRegistry.getReportsByType(currentType);
        
        if (reports.length === 0) {
            Logger.warn(`No reports available for ${currentType}`);
            // Add a placeholder option
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No reports available';
            option.disabled = true;
            reportSelector.appendChild(option);
            reportSelector.disabled = true;
            return;
        }

        // Enable selector if it was disabled
        reportSelector.disabled = false;

        // Add reports to dropdown
        reports.forEach(report => {
            const option = document.createElement('option');
            option.value = report.reportId;
            option.textContent = `${report.name} (v${report.version})`;
            reportSelector.appendChild(option);
        });

        Logger.debug(`Populated report selector with ${reports.length} reports for ${currentType}`);
    }

    /**
     * Map UI statement type to registry statement type
     * @param uiType - UI_STATEMENT_TYPES constant
     * @returns Registry statement type (balance, income, cashflow)
     */
    getStatementTypeForRegistry(uiType: string): string {
        const mapping: Record<string, string> = {
            [UI_STATEMENT_TYPES.INCOME_STATEMENT]: 'income',
            [UI_STATEMENT_TYPES.BALANCE_SHEET]: 'balance',
            [UI_STATEMENT_TYPES.CASH_FLOW]: 'cashflow'
        };
        return mapping[uiType] || 'income';
    }

    /**
     * Restore the last selected report from localStorage
     */
    restoreSelectedReport(): void {
        const selectedReportId = this.reportRegistry.getSelectedReportId();
        
        if (selectedReportId) {
            const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
            if (reportSelector) {
                // Check if the report still exists
                if (this.reportRegistry.hasReport(selectedReportId)) {
                    reportSelector.value = selectedReportId;
                    this.updateReportInfo(selectedReportId);
                    Logger.debug(`Restored selected report: ${selectedReportId}`);
                } else {
                    // Report no longer exists, clear selection
                    this.reportRegistry.clearSelectedReport();
                    Logger.warn(`Previously selected report ${selectedReportId} not found`);
                }
            }
        }
    }

    /**
     * Handle report selection change
     * Persists selection to localStorage and regenerates statement
     */
    handleReportSelectionChange(): void {
        const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
        if (!reportSelector) return;

        const selectedReportId = reportSelector.value;

        if (selectedReportId) {
            // Save selection to localStorage
            try {
                this.reportRegistry.setSelectedReportId(selectedReportId);
                Logger.debug(`Selected report: ${selectedReportId}`);
            } catch (error) {
                Logger.error('Error saving report selection:', error);
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
     * Auto-select appropriate report after loading definitions or switching statement types
     * Selects default report if available, otherwise first available report
     * 
     * @param statementType - UI statement type constant
     */
    autoSelectReport(statementType: string): void {
        const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
        if (!reportSelector) {
            Logger.warn('Report selector element not found');
            return;
        }

        // Get registry statement type
        const registryType = this.getStatementTypeForRegistry(statementType);
        
        // Try to get default report first
        let report = this.reportRegistry.getDefaultReport(registryType);
        
        if (!report) {
            // No default, get first available report
            const reports = this.reportRegistry.getReportsByType(registryType);
            if (reports.length > 0) {
                report = reports[0];
                Logger.debug(`No default report for ${registryType}, using first available: ${report.name}`);
            } else {
                Logger.warn(`No reports available for ${registryType}`);
                this.hideReportInfo();
                return;
            }
        } else {
            Logger.debug(`Auto-selected default report: ${report.name} (${report.reportId})`);
        }

        // Update dropdown selection
        reportSelector.value = report.reportId;
        
        // Save selection to localStorage
        try {
            this.reportRegistry.setSelectedReportId(report.reportId);
        } catch (error) {
            Logger.error('Error saving auto-selected report:', error);
        }
        
        // Show report info
        this.showReportInfo(report.reportId);
        
        // Regenerate statement if data is loaded
        if (this.dataStore.getCombinedMovements()) {
            this.generateAndDisplayStatement(statementType);
        }
    }

    /**
     * Show report info banner with current report details
     * @param reportId - Report ID to display
     */
    showReportInfo(reportId: string): void {
        const report = this.reportRegistry.getReport(reportId);
        
        if (!report) {
            this.hideReportInfo();
            return;
        }

        const reportInfoDiv = document.getElementById('report-info');
        const reportNameSpan = document.getElementById('report-name');
        const reportVersionSpan = document.getElementById('report-version');
        const reportDefaultBadge = document.getElementById('report-default-badge');

        if (reportInfoDiv && reportNameSpan && reportVersionSpan) {
            reportNameSpan.textContent = report.name;
            reportVersionSpan.textContent = `(v${report.version})`;
            
            // Show default badge if this is the default report
            const registryType = report.statementType;
            const defaultReport = this.reportRegistry.getDefaultReport(registryType);
            const isDefault = defaultReport && defaultReport.reportId === report.reportId;
            
            if (reportDefaultBadge) {
                reportDefaultBadge.style.display = isDefault ? 'inline' : 'none';
            }
            
            reportInfoDiv.style.display = 'block';
        }
    }

    /**
     * Update the report info display with report name and version
     * @param reportId - Report ID to display
     * @deprecated Use showReportInfo() instead
     */
    updateReportInfo(reportId: string): void {
        this.showReportInfo(reportId);
    }

    /**
     * Hide the report info display
     */
    hideReportInfo(): void {
        const reportInfoDiv = document.getElementById('report-info');
        if (reportInfoDiv) {
            reportInfoDiv.style.display = 'none';
        }
    }

    /**
     * Handle reload report definitions button click
     * Reloads all report definitions from files
     */
    async handleReloadReports(): Promise<void> {
        try {
            this.updateReportStatus('🔄 Reloading report definitions...', 'loading');
            
            // Clear existing reports
            this.reportRegistry.clear();
            
            // Reload reports
            const count = await this.loadReportDefinitions();
            
            this.updateReportStatus(`✓ Reloaded ${count} report definition${count !== 1 ? 's' : ''} successfully`, 'success');
            
            // Regenerate current statement
            if (this.currentStatementType) {
                this.generateAndDisplayStatement(this.currentStatementType);
            }
        } catch (error) {
            Logger.error('Error reloading reports:', error);
            this.updateReportStatus('⚠️ Failed to reload report definitions', 'error');
        }
    }

    // Setup event listeners
    setupEventListeners(): void {
        const selectDirBtn = document.getElementById('select-input-dir');
        if (selectDirBtn) {
            selectDirBtn.addEventListener('click', () => {
                Logger.debug('Select Directory button clicked');
                this.handleSelectInputDirectory();
            });
        }

        // Dev toggle - show/hide metrics and dev info
        const devToggle = document.getElementById('dev-toggle') as HTMLInputElement | null;
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
        const statementSelector = document.getElementById('statement-selector') as HTMLSelectElement | null;
        if (statementSelector) {
            statementSelector.addEventListener('change', () => {
                const newStatementType = statementSelector.value;
                // Update current statement type
                this.currentStatementType = newStatementType;
                // Update report selector options for new statement type
                this.populateReportSelector();
                // Auto-select appropriate report
                this.autoSelectReport(newStatementType);
            });
        }

        // Report selector dropdown
        const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
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

        // View report definition button
        const viewReportBtn = document.getElementById('view-report-btn');
        if (viewReportBtn) {
            viewReportBtn.addEventListener('click', () => {
                this.handleViewReportDefinition();
            });
        }

        // Close report modal buttons
        const closeModalBtn = document.getElementById('close-report-modal');
        const closeModalBtn2 = document.getElementById('close-report-modal-btn');
        const reportModal = document.getElementById('report-definition-modal');
        
        if (closeModalBtn && reportModal) {
            closeModalBtn.addEventListener('click', () => {
                reportModal.style.display = 'none';
            });
        }
        
        if (closeModalBtn2 && reportModal) {
            closeModalBtn2.addEventListener('click', () => {
                reportModal.style.display = 'none';
            });
        }

        // Copy report JSON button
        const copyJsonBtn = document.getElementById('copy-report-json');
        if (copyJsonBtn) {
            copyJsonBtn.addEventListener('click', () => {
                this.handleCopyReportJson();
            });
        }

        // Close modal when clicking outside
        if (reportModal) {
            reportModal.addEventListener('click', (e) => {
                if (e.target === reportModal) {
                    reportModal.style.display = 'none';
                }
            });
        }

        // Debug columns button (only visible in dev mode)
        const debugColumnsBtn = document.getElementById('debug-columns-btn');
        if (debugColumnsBtn && devToggle) {
            // Show/hide based on dev toggle
            devToggle.addEventListener('change', () => {
                debugColumnsBtn.style.display = devToggle.checked ? 'inline-block' : 'none';
            });
            
            // Set initial state
            debugColumnsBtn.style.display = devToggle.checked ? 'inline-block' : 'none';
            
            debugColumnsBtn.addEventListener('click', () => {
                this.handleDebugColumns();
            });
        }

        // Period selector - re-render on change
        const periodSelector = document.getElementById('period-selector') as HTMLSelectElement | null;
        if (periodSelector) {
            periodSelector.addEventListener('change', () => {
                // If LTM is selected, automatically turn off variance columns and disable selector
                const varianceSelector = document.getElementById('variance-selector') as HTMLSelectElement | null;
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
        const comparisonSelector = document.getElementById('comparison-selector') as HTMLSelectElement | null;
        if (comparisonSelector) {
            comparisonSelector.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Variance selector - re-render on change
        const varianceSelector = document.getElementById('variance-selector') as HTMLSelectElement | null;
        if (varianceSelector) {
            varianceSelector.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Tree control buttons - expand/collapse all
        const expandAllBtn = document.getElementById('expand-all-btn');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                Logger.debug('Expand All button clicked');
                this.agGridRenderer.expandAll();
            });
        }

        const collapseAllBtn = document.getElementById('collapse-all-btn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                Logger.debug('Collapse All button clicked');
                this.agGridRenderer.collapseAll();
            });
        }

        // View type dropdown (cumulative vs period) - re-render on change
        const viewTypeDropdown = document.getElementById('view-type') as HTMLSelectElement | null;
        if (viewTypeDropdown) {
            viewTypeDropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Export button
        const exportAllBtn = document.getElementById('export-all');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.handleExportCurrent();
            });
        }

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
                const fileId = (item as HTMLElement).dataset.file;
                if (fileId) {
                    this.showDataPreview(fileId);
                }
            });
        });

        // Close preview button
        const closePreviewBtn = document.getElementById('close-preview');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
                const previewDiv = document.getElementById('data-preview');
                if (previewDiv) {
                    previewDiv.style.display = 'none';
                }
            });
        }

        // Variance toggle
        const showVarianceToggle = document.getElementById('show-variance') as HTMLInputElement | null;
        if (showVarianceToggle) {
            showVarianceToggle.addEventListener('change', () => {
                // Re-render the current statement
                if (this.currentStatementType) {
                    this.handleTabSwitch(this.currentStatementType);
                }
            });
        }

        // Detail level dropdown is now in the table header and handled by the table's event listeners
    }

    // Helper: Format number with thousand separators
    formatNumber(value: number | null | undefined): string {
        if (value === null || value === undefined) return '0';
        return Math.round(value).toLocaleString(APP_CONFIG.display.locale);
    }

    /**
     * Handle view report definition button click
     * Shows a modal with the current report definition in JSON format
     */
    handleViewReportDefinition(): void {
        const reportSelector = document.getElementById('report-selector') as HTMLSelectElement | null;
        if (!reportSelector || !reportSelector.value) {
            this.statusMessageService.showError('No report selected');
            return;
        }

        const reportId = reportSelector.value;
        const report = this.reportRegistry.getReport(reportId);

        if (!report) {
            this.statusMessageService.showError(`Report '${reportId}' not found`);
            return;
        }

        // Populate modal with report info
        const modalReportName = document.getElementById('modal-report-name');
        const modalReportVersion = document.getElementById('modal-report-version');
        const modalReportType = document.getElementById('modal-report-type');
        
        if (modalReportName) modalReportName.textContent = report.name || 'Unknown';
        if (modalReportVersion) modalReportVersion.textContent = report.version || '1.0';
        if (modalReportType) modalReportType.textContent = report.statementType || 'Unknown';

        // Format and display JSON
        const jsonContent = JSON.stringify(report, null, 2);
        const reportDefContent = document.getElementById('report-definition-content');
        if (reportDefContent) {
            reportDefContent.textContent = jsonContent;
        }

        // Show modal
        const reportModal = document.getElementById('report-definition-modal');
        if (reportModal) {
            reportModal.style.display = 'block';
        }

        Logger.debug(`Viewing report definition: ${report.name} (${reportId})`);
    }

    /**
     * Handle copy report JSON button click
     * Copies the report definition JSON to clipboard
     */
    async handleCopyReportJson(): Promise<void> {
        const reportDefContent = document.getElementById('report-definition-content');
        const jsonContent = reportDefContent?.textContent || '';

        try {
            await navigator.clipboard.writeText(jsonContent);
            
            // Show success feedback
            const copyBtn = document.getElementById('copy-report-json') as HTMLButtonElement | null;
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                copyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
            }

            Logger.debug('Report JSON copied to clipboard');
        } catch (error) {
            Logger.error('Failed to copy to clipboard:', error);
            this.statusMessageService.showError('Failed to copy to clipboard');
        }
    }

    /**
     * Handle debug columns button click
     * Shows available columns in the loaded data to help diagnose filter issues
     */
    handleDebugColumns(): void {
        const movements = this.dataStore.getCombinedMovements();
        
        if (!movements) {
            alert('No data loaded. Please load trial balance files first.');
            return;
        }

        const columns = movements.columnNames();
        const sampleRow = movements.numRows() > 0 ? movements.object(0) : null;

        let message = '📊 Available Data Columns:\n\n';
        message += columns.join(', ');
        message += '\n\n';
        
        if (sampleRow) {
            message += '📝 Sample Row (first row):\n\n';
            message += JSON.stringify(sampleRow, null, 2);
        }

        message += '\n\n💡 Tip: Report filters use these column names.\n';
        message += 'Expected columns: code1, code2, code3, name1, name2, name3, statement_type, account_code';

        console.log(message);
        alert(message);

        Logger.info('Available columns:', columns);
        if (sampleRow) {
            Logger.info('Sample row:', sampleRow);
        }
    }
}

export default UIController;
