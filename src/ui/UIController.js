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

class UIController {
    constructor() {
        this.dataStore = new DataStore();
        this.dataLoader = new DataLoader();
        this.statementGenerator = new StatementGenerator(this.dataStore);
        this.agGridRenderer = new AgGridStatementRenderer('ag-grid-container');

        // Use centralized config for defaults
        this.currentStatementType = this.mapStatementType(APP_CONFIG.statements.defaultType);
        this.currentStatementData = null;
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

    // Update file status indicator
    updateFileStatus(fileId, status, message) {
        const statusElement = document.getElementById(`status-${fileId}`);
        if (statusElement) {
            if (status === 'success') {
                statusElement.textContent = message ? `✅ ${message}` : '✅';
                statusElement.style.color = '#28a745';
            } else if (status === 'error') {
                statusElement.textContent = '❌';
                statusElement.style.color = '#dc3545';
            } else if (status === 'loading') {
                statusElement.textContent = '⏳';
                statusElement.style.color = '#ffc107';
            }
        }
    }

    // Unified status message display
    showStatusMessage(message, type = 'info') {
        const loadingStatus = document.getElementById('loading-status');
        if (!loadingStatus) return;

        const statusConfig = {
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
            }
        };

        const { icon, color } = statusConfig[type] || statusConfig.info;
        loadingStatus.textContent = icon + message;
        loadingStatus.style.color = color;
    }

    // Convenience methods
    showLoadingMessage(message) {
        this.showStatusMessage(message, 'info');
    }

    showErrorMessage(message) {
        this.showStatusMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.showStatusMessage(message, 'success');
    }

    // Handle input directory selection
    async handleSelectInputDirectory() {
        try {
            await this.dataLoader.selectInputDirectory();
            const statusText = document.getElementById('input-dir-status');
            const dirHandle = this.dataLoader.inputDirHandle;
            const dirName = dirHandle.name;

            // Try to get full path (if available in browser)
            let pathDisplay = dirName;
            try {
                if (dirHandle.resolve) {
                    const path = await dirHandle.resolve(dirHandle);
                    if (path && path.length > 0) {
                        pathDisplay = path.join('/');
                    }
                }
            } catch (e) {
                // Path not available, use directory name only
            }

            statusText.textContent = `📁 ${pathDisplay}`;
            statusText.style.color = '#28a745';

            // Check if directory is named "input"
            if (dirName.toLowerCase() !== 'input') {
                const errorMsg = `Directory must be named "input" (current: "${dirName}")`;
                this.showErrorMessage(errorMsg);
                console.error(errorMsg);
                return;
            }

            console.log('Directory named "input" detected, checking for files...');

            // Check if required files exist
            const filesExist = await this.checkRequiredFilesExist();

            if (!filesExist) {
                const errorMsg = 'Required files not found in directory. Please ensure the directory contains the trial balance files.';
                this.showErrorMessage(errorMsg);
                console.error(errorMsg);
                return;
            }

            console.log('Required files found, loading...');
            // Automatically load files
            await this.handleLoadAllFiles();

        } catch (error) {
            // If user canceled the dialog, don't show an error message
            if (error.name === 'AbortError') {
                console.log('Directory selection was canceled');
                return;
            }

            this.showErrorMessage(error.message);
        }
    }

    // Check if required files exist in the selected directory
    async checkRequiredFilesExist() {
        try {
            const requiredFiles = [
                APP_CONFIG.excel.trialBalance2024,
                APP_CONFIG.excel.trialBalance2025
            ];

            for (const filename of requiredFiles) {
                try {
                    await this.dataLoader.inputDirHandle.getFileHandle(filename);
                } catch (error) {
                    console.log(`File not found: ${filename}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking files:', error);
            return false;
        }
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

            // Format status: Wide dimensions → Long dimensions | Profit
            const totalLongRows2024 = movements2024.numRows() + balances2024.numRows();
            const status2024 = `${metadata2024.rows}R × ${metadata2024.columns}C → ${totalLongRows2024}R × ${movements2024.columnNames().length}C | Profit: €${this.formatNumber(metadata2024.cumulativeProfit)}`;
            this.updateFileStatus('tb2024', 'success', status2024);

            // Step 2: Load trial balance for 2025 (movements and balances with hierarchy included)
            this.showLoadingMessage('Loading 2025 trial balance...');
            this.updateFileStatus('tb2025', 'loading');
            const { movements: movements2025, balances: balances2025, metadata: metadata2025 } = await this.dataLoader.loadTrialBalance('2025');

            this.dataStore.setFactTable(movements2025, '2025', 'movements');
            this.dataStore.setFactTable(balances2025, '2025', 'balances');

            // Format status: Wide dimensions → Long dimensions | Profit
            const totalLongRows2025 = movements2025.numRows() + balances2025.numRows();
            const status2025 = `${metadata2025.rows}R × ${metadata2025.columns}C → ${totalLongRows2025}R × ${movements2025.columnNames().length}C | Profit: €${this.formatNumber(metadata2025.cumulativeProfit)}`;
            this.updateFileStatus('tb2025', 'success', status2025);

            // Step 3: Create combined data tables for both years (movements and balances)
            this.showLoadingMessage('Combining data...');
            const combinedMovements = movements2024.concat(movements2025);
            const combinedBalances = balances2024.concat(balances2025);

            // Store both - we'll choose which to use based on view type
            this.dataStore.setCombinedMovements(combinedMovements);
            this.dataStore.setCombinedBalances(combinedBalances);
            console.log(`Combined movements table created: ${combinedMovements.numRows()} rows`);
            console.log(`Combined balances table created: ${combinedBalances.numRows()} rows`);

            // Update combined TB count
            const combinedCount = movements2024.numRows() + balances2024.numRows() + movements2025.numRows() + balances2025.numRows();
            this.updateFileStatus('tb2425', 'success', `(${combinedCount} total)`);

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

                const file1 = APP_CONFIG.excel.trialBalance2024;
                const file2 = APP_CONFIG.excel.trialBalance2025;
                statusText.innerHTML = `
                    <div style="line-height: 1.5;">
                        <div style="margin-bottom: 4px;"><strong>📁 Directory:</strong> ${pathDisplay}</div>
                        <div style="font-size: 0.9em; color: #666;">
                            <div>• ${file1}</div>
                            <div>• ${file2}</div>
                        </div>
                    </div>
                `;
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

            // Show validation container with error
            const validationContainer = document.getElementById('validation-messages');
            const errorsContainer = document.getElementById('validation-errors');

            if (validationContainer && errorsContainer) {
                errorsContainer.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.innerHTML = `<strong>Loading Error:</strong> ${userMessage}`;
                errorsContainer.appendChild(errorDiv);
                validationContainer.style.display = 'block';
            }
        }
    }

    // Validate data and display results
    validateAndDisplayResults() {
        const validation = this.statementGenerator.validateData();
        const validationContainer = document.getElementById('validation-messages');
        const errorsContainer = document.getElementById('validation-errors');
        const warningsContainer = document.getElementById('validation-warnings');

        // Clear previous messages
        errorsContainer.innerHTML = '';
        warningsContainer.innerHTML = '';

        // Display Afrondingsverschil replacements
        if (window.afrondingsReplacements && window.afrondingsReplacements.length > 0) {
            window.afrondingsReplacements.forEach(replacement => {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'validation-warning-item';
                infoDiv.innerHTML = `ℹ️ <strong>Account replaced:</strong> ${replacement}`;
                warningsContainer.appendChild(infoDiv);
            });
        }

        // Display errors
        if (validation.errors.length > 0) {
            validation.errors.forEach(error => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error-item';
                errorDiv.textContent = '❌ ' + error;
                errorsContainer.appendChild(errorDiv);
            });
        }

        // Display warnings
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'validation-warning-item';
                warningDiv.textContent = '⚠️ ' + warning;
                warningsContainer.appendChild(warningDiv);
            });
        }

        // Display unmapped accounts if any
        if (validation.unmappedAccounts.length > 0) {
            const unmappedDiv = document.createElement('div');
            unmappedDiv.className = 'validation-warning-item';
            unmappedDiv.innerHTML = `
                <strong>Unmapped Accounts (${validation.unmappedAccounts.length}):</strong>
                <div class="unmapped-accounts-list">
                    ${validation.unmappedAccounts.join(', ')}
                </div>
            `;
            warningsContainer.appendChild(unmappedDiv);
        }

        // Show validation container if there are any messages
        if (validation.errors.length > 0 || validation.warnings.length > 0) {
            validationContainer.style.display = 'block';
        } else {
            validationContainer.style.display = 'none';
        }
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

            // Get period selections from header dropdowns (fallback to config defaults if not found)
            const periodYear1 = document.getElementById(`period-${year1}-header`)?.value || APP_CONFIG.statements.defaultPeriod1;
            const periodYear2 = document.getElementById(`period-${year2}-header`)?.value || APP_CONFIG.statements.defaultPeriod2;
            const periodOptions = {
                [`period${year1}`]: periodYear1,
                [`period${year2}`]: periodYear2
            };

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

        // Period dropdowns - re-render on change
        const period2024Dropdown = document.getElementById('period-2024-header');
        if (period2024Dropdown) {
            period2024Dropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        const period2025Dropdown = document.getElementById('period-2025-header');
        if (period2025Dropdown) {
            period2025Dropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Variance mode dropdowns - re-render on change
        const variance1Dropdown = document.getElementById('variance-1-header');
        if (variance1Dropdown) {
            variance1Dropdown.addEventListener('change', () => {
                if (this.currentStatementType) {
                    this.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        const variance2Dropdown = document.getElementById('variance-2-header');
        if (variance2Dropdown) {
            variance2Dropdown.addEventListener('change', () => {
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
