/**
 * app.js - Main application entry point
 *
 * This module exports:
 * - init() - Initializes the application
 * - loadConfig() - Loads configuration from config.json
 * - All classes for testing purposes
 */

import UIController from './ui/UIController.js';
import DataLoader from './data/DataLoader.js';
import DataStore from './data/DataStore.js';
import StatementGenerator from './statements/StatementGenerator.js';
import AgGridStatementRenderer from './ui/AgGridStatementRenderer.js';
import CategoryMatcher from './utils/CategoryMatcher.js';
import VarianceCalculator from './utils/VarianceCalculator.js';
import ExportHandler from './export/ExportHandler.js';
import InteractiveUI from './ui/InteractiveUI.js';

// Global config object (will be set by loadConfig)
let config = null;

/**
 * Load configuration from config.json
 * Falls back to default configuration if file not found
 */
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        console.log('Configuration loaded:', config);

        // Make config globally accessible
        window.config = config;

        return config;
    } catch (error) {
        console.error('Error loading config:', error);
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
        window.config = config;

        return config;
    }
}

/**
 * Load and display version from package.json
 */
async function loadVersion() {
    try {
        const response = await fetch('package.json');
        const packageData = await response.json();
        const versionElement = document.getElementById('app-version');
        if (versionElement && packageData.version) {
            versionElement.textContent = `v${packageData.version}`;
        }
        return packageData.version;
    } catch (error) {
        console.warn('Could not load version from package.json:', error);
        return '3.0.0'; // Fallback version
    }
}

/**
 * Initialize the application
 * - Checks browser compatibility
 * - Loads configuration
 * - Creates UIController instance
 * - Sets up event listeners
 */
async function init() {
    console.log('Financial Statement Generator initialized');
    console.log('Arquero loaded:', typeof aq !== 'undefined');
    console.log('ExcelJS loaded:', typeof ExcelJS !== 'undefined');

    // Load and display version
    await loadVersion();

    // Check browser compatibility
    if (!window.showDirectoryPicker) {
        alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or another compatible browser.');
        console.error('File System Access API not supported');
    }

    // Load configuration
    await loadConfig();

    // Initialize UI Controller
    window.uiController = new UIController();
    window.uiController.setupEventListeners();

    // Initial state: disable export button until data is loaded
    document.getElementById('export-all').disabled = true;

    console.log('Application ready');
    console.log('Configuration:', config);
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
    CategoryMatcher,
    VarianceCalculator,
    ExportHandler,
    InteractiveUI
};

// Default export
export default { init, loadConfig };
