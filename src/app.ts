/**
 * app.ts - Main application entry point
 *
 * This module exports:
 * - init() - Initializes the application
 * - loadConfig() - Loads configuration from config.json
 * - All classes for testing purposes
 */

import UIController from './ui/UIController.ts';
import DataLoader from './data/DataLoader.ts';
import DataStore from './data/DataStore.ts';
import StatementGenerator from './statements/StatementGenerator.ts';
import AgGridStatementRenderer from './ui/AgGridStatementRenderer.ts';
import Logger from './utils/Logger.ts';
import ExportHandler from './export/ExportHandler.ts';
import InteractiveUI from './ui/InteractiveUI.ts';

// FP modules (for re-export compatibility)
import * as varianceModule from './core/calculations/variance.ts';
import * as categoryModule from './core/transformations/category.ts';

interface Config {
    inputFiles: {
        trialBalance2024: string;
        trialBalance2025: string;
        dates: string;
        format: string;
    };
    outputFiles: {
        balanceSheet: string;
        incomeStatement: string;
        cashFlowStatement: string;
        allStatements: string;
    };
    directories: {
        input: string;
        output: string;
    };
}

// Extend global interface for global properties
declare global {
    var config: Config;
    var uiController: UIController;
}

// Global config object (will be set by loadConfig)
let config: Config | null = null;

/**
 * Load configuration from config.json
 * Falls back to default configuration if file not found
 */
async function loadConfig(): Promise<Config> {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        Logger.info('Configuration loaded:', config);

        // Make config globally accessible
        (globalThis as any).config = config!;

        return config!;
    } catch (error) {
        Logger.error('Error loading config:', error);
        // Use default configuration
        config = {
            inputFiles: {
                trialBalance2024: "2024_BalansenWinstverliesperperiode.xlsx",
                trialBalance2025: "2025_BalansenWinstverliesperperiode.xlsx",
                dates: "DimDates.xlsx",
                format: "format.xlsx"
            },
            outputFiles: {
                balanceSheet: "balance_sheet.xlsx",
                incomeStatement: "income_statement.xlsx",
                cashFlowStatement: "cash_flow_statement.xlsx",
                allStatements: "financial_statements_all.xlsx"
            },
            directories: {
                input: "input",
                output: "output"
            }
        };

        // Make config globally accessible
        (globalThis as any).config = config;

        return config;
    }
}

/**
 * Load and display version from package.json
 */
async function loadVersion(): Promise<string> {
    try {
        const response = await fetch('package.json');
        const packageData = await response.json();
        const versionElement = document.getElementById('app-version');
        if (versionElement && packageData.version) {
            versionElement.textContent = `v${packageData.version}`;
        }
        return packageData.version;
    } catch (error) {
        Logger.warn('Could not load version from package.json:', error);
        return '3.0.0'; // Fallback version
    }
}

/**
 * Display library versions in dev info section
 */
function showLibraryVersions(): void {
    const devInfo = document.getElementById('dev-info');
    if (!devInfo) return;

    const versions: string[] = [];

    // ag-Grid version
    if (typeof (globalThis as any).agGrid !== 'undefined' && (globalThis as any).agGrid.VERSION) {
        versions.push(`ag-Grid Community: ${(globalThis as any).agGrid.VERSION}`);
    }

    // Arquero version
    if (typeof (globalThis as any).aq !== 'undefined' && (globalThis as any).aq.version) {
        versions.push(`Arquero: ${(globalThis as any).aq.version}`);
    }

    // ExcelJS doesn't expose version easily, so we'll note it's loaded
    if (typeof (globalThis as any).ExcelJS !== 'undefined') {
        versions.push(`ExcelJS: loaded`);
    }

    // Application version
    const appVersion = document.getElementById('app-version')?.textContent || 'unknown';
    versions.push(`App: ${appVersion}`);

    devInfo.innerHTML = '<strong>Libraries:</strong> ' + versions.join(' | ');
}

/**
 * Initialize the application
 * - Checks browser compatibility
 * - Loads configuration
 * - Creates UIController instance
 * - Sets up event listeners
 */
async function init(): Promise<void> {
    Logger.info('Financial Statement Generator initialized');
    Logger.debug('Arquero loaded:', typeof (globalThis as any).aq !== 'undefined');
    Logger.debug('ExcelJS loaded:', typeof (globalThis as any).ExcelJS !== 'undefined');

    // Load and display version
    await loadVersion();

    // Show library versions in dev mode
    showLibraryVersions();

    // Check browser compatibility
    if (!(globalThis as any).showDirectoryPicker) {
        alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or another compatible browser.');
        Logger.error('File System Access API not supported');
    }

    // Load configuration
    await loadConfig();

    // Initialize UI Controller
    (globalThis as any).uiController = new UIController();
    (globalThis as any).uiController.setupEventListeners();

    // Initial state: disable export button until data is loaded
    const exportButton = document.getElementById('export-all') as HTMLButtonElement | null;
    if (exportButton) {
        exportButton.disabled = true;
    }

    Logger.info('Application ready');
    Logger.debug('Configuration:', config);
}

// Export all classes for testing
export {
    init,
    loadConfig,
    UIController,
    DataLoader,
    DataStore,
    StatementGenerator,
    AgGridStatementRenderer,
    ExportHandler,
    InteractiveUI,
    // FP modules
    varianceModule,
    categoryModule
};

// Default export
export default { init, loadConfig };
