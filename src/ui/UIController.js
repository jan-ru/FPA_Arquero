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
import { UI_CONFIG, UI_STATEMENT_TYPES } from '../constants.js';
import { YEAR_CONFIG } from '../constants.js';
import APP_CONFIG from '../config/appConfig.js';
import FileSelectionService from '../services/FileSelectionService.ts';
import StatusMessageService from '../services/StatusMessageService.ts';
import FileMetricsService from '../services/FileMetricsService.ts';
import ValidationService from '../services/ValidationService.ts';

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

        // Initialize UI with filenames from config
        this.initializeFilenames();

        // Initialize status message service DOM references
        this.statusMessageService.initialize();
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

    // Unified status message display - delegate to service
    showStatusMessage(message, type = 'info') {
        this.statusMessageService.showMessage(message, type);
    }

    // Convenience methods - delegate to service
    showLoadingMessage(message) {
        this.statusMessageService.showLoading(message);
    }

    showErrorMessage(message) {
        this.statusMessageService.showError(message);
    }

    showSuccessMessage(message) {
        this.statusMessageService.showSuccess(message);
    }

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
        this.showLoadingMessage('Loading trial balance files...');

        try {
            // Step 1: Load trial balance for 2024 (movements and balances with hierarchy included)
            this.showLoadingMessage('Loading 2024 trial balance...');
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
            this.showLoadingMessage('Loading 2025 trial balance...');
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
            this.showLoadingMessage('Combining data...');
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

            this.showErrorMessage(userMessage);

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

    // Generate and display statement
    generateAndDisplayStatement(statementType) {
        try {
            // Validate that data is loaded
            if (!this.dataStore.getCombinedMovements()) {
                throw new Error('No data loaded. Please load trial balance files first.');
            }

            // Get years from config
            const year1 = YEAR_CONFIG.getYear(0);
            const year2 = YEAR_CONFIG.getYear(1);

            // Get period selection (applies to 2025)
            const periodValue = document.getElementById('period-selector')?.value || 'all';

            // Get comparison type (YoY, LTM, MoM)
            const comparisonType = document.getElementById('comparison-selector')?.value || 'yoy';

            // Build period options based on comparison type
            let periodOptions;

            if (comparisonType === 'yoy') {
                // Year-over-Year: Same period for both years
                periodOptions = {
                    [`period${year1}`]: `${year1}-${periodValue}`,
                    [`period${year2}`]: `${year2}-${periodValue}`
                };
            } else if (comparisonType === 'ltm') {
                // Last Twelve Months:
                // 2025 column shows last 12 months ending at selected period
                // 2024 column shows prior 12 months ending at same period
                periodOptions = {
                    [`period${year1}`]: `${year1}-all`, // TODO: Implement rolling 12-month calculation
                    [`period${year2}`]: `${year2}-all`, // TODO: Implement rolling 12-month calculation
                    isLTM: true,
                    ltmEndPeriod: periodValue
                };
            } else {
                // Default to YoY
                periodOptions = {
                    [`period${year1}`]: `${year1}-${periodValue}`,
                    [`period${year2}`]: `${year2}-${periodValue}`
                };
            }

            let statementData;
            let statementName;

            switch(statementType) {
                case UI_STATEMENT_TYPES.BALANCE_SHEET:
                    statementName = 'Balance Sheet';
                    statementData = this.statementGenerator.generateBalanceSheet(periodOptions);
                    break;
                case UI_STATEMENT_TYPES.INCOME_STATEMENT:
                    statementName = 'Income Statement';
                    statementData = this.statementGenerator.generateIncomeStatement(periodOptions);
                    break;
                case UI_STATEMENT_TYPES.CASH_FLOW:
                    statementName = 'Cash Flow Statement';
                    statementData = this.statementGenerator.generateCashFlowStatement(periodOptions);
                    break;
                default:
                    throw new Error('Unknown statement type: ' + statementType);
            }

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
    handleExportCurrent() {
        try {
            if (!this.currentStatementType) {
                this.showExportStatus('No statement to export', 'error');
                return;
            }

            this.showExportStatus('Exporting statement...', 'loading');

            // Get statement name from selector
            const statementSelector = document.getElementById('statement-selector');
            const statementName = statementSelector ?
                statementSelector.options[statementSelector.selectedIndex].text :
                this.currentStatementType;

            // Export using ag-Grid
            this.agGridRenderer.exportToExcel(statementName);

            this.showExportStatus('Statement exported successfully!', 'success');

        } catch (error) {
            this.showExportStatus('Export failed: ' + error.message, 'error');
            console.error('Export error:', error);
        }
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

        // Create the grid
        new agGrid.Grid(gridDiv, gridOptions);

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

            // Update 2024 metrics
            if (this.fileMetadata['2024']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2024', year1, periodValue,
                    this.fileMetadata['2024'],
                    this.formatNumber.bind(this)
                );
                this.statusMessageService.updateFileStatus('tb2024', 'success', '');
            }

            // Update 2025 metrics
            if (this.fileMetadata['2025']) {
                this.fileMetricsService.updateFileMetrics(
                    'tb2025', year2, periodValue,
                    this.fileMetadata['2025'],
                    this.formatNumber.bind(this)
                );
                this.statusMessageService.updateFileStatus('tb2025', 'success', '');
            }
        } catch (error) {
            console.warn('Error updating file status profit:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('select-input-dir').addEventListener('click', () => {
            console.log('Select Directory button clicked');
            this.handleSelectInputDirectory();
        });

        // Statement selector dropdown
        const statementSelector = document.getElementById('statement-selector');
        if (statementSelector) {
            statementSelector.addEventListener('change', () => {
                this.handleTabSwitch(statementSelector.value);
            });
        }

        // Period selector - re-render on change
        const periodSelector = document.getElementById('period-selector');
        if (periodSelector) {
            periodSelector.addEventListener('change', () => {
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
