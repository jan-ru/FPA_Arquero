/**
 * Application Configuration
 *
 * Centralized configuration for the Financial Statement Generator application.
 * All user-configurable settings should be defined here.
 */

/**
 * Main application configuration object
 */
export const APP_CONFIG = {
    /**
     * Excel file configuration
     */
    excel: {
        // Expected column structure
        requiredColumns: [
            'account_code',
            'account_description',
            'statement_type',
            'code1',
            'name1'
        ],

        // Column name mappings (not currently used, but available for future flexibility)
        columnMapping: {
            accountCode: 'Rekeningnummer',
            accountDescription: 'Omschrijving',
            statementType: 'Type'
        },

        // File size warning threshold (bytes)
        largeFileThreshold: 5 * 1024 * 1024, // 5 MB

        // Expected file names
        trialBalance2024: '2024_BalansenWinstverliesperperiode.xlsx',
        trialBalance2025: '2025_BalansenWinstverliesperperiode.xlsx'
    },

    /**
     * Statement display defaults
     */
    statements: {
        // Default statement to show on load
        defaultType: 'income-statement', // 'income-statement', 'balance-sheet', 'cash-flow'

        // Default detail level (0-5)
        defaultDetailLevel: 'level3', // 'level0' through 'level5'

        // Default view type
        defaultViewType: 'cumulative', // 'cumulative' or 'period'

        // Default period selections
        defaultPeriod1: '2024-all', // Format: 'YYYY-all', 'YYYY-QN', 'YYYY-N'
        defaultPeriod2: '2025-all',

        // Default variance display
        showVarianceByDefault: false,
        defaultVarianceMode: 'absolute' // 'absolute' or 'percent'
    },

    /**
     * Hierarchy configuration
     */
    hierarchy: {
        // Maximum number of hierarchy levels
        maxLevels: 4, // code0, code1, code2, code3

        // Level labels for UI
        levelLabels: {
            level0: 'Activa/Passiva',
            level1: 'Vaste/Vlottende activa',
            level2: 'Main categories',
            level3: 'Sub-categories',
            level4: 'Detail categories',
            level5: 'All accounts'
        }
    },

    /**
     * Display formatting configuration
     */
    display: {
        // Locale for number and date formatting
        locale: 'nl-NL',

        // Currency settings
        currency: {
            symbol: '€',
            position: 'prefix' // 'prefix' or 'suffix'
        },

        // Number formatting
        numbers: {
            decimalPlaces: 0, // Default to whole numbers
            showThousandsSeparator: true,
            negativeFormat: 'parentheses' // 'parentheses', 'minus', 'red'
        },

        // Date formatting
        dates: {
            shortFormat: 'DD-MM-YYYY',
            longFormat: 'D MMMM YYYY'
        }
    },

    /**
     * Validation configuration
     */
    validation: {
        // Balance Sheet balance tolerance
        balanceTolerance: 0.01, // €0.01

        // Required period range
        minPeriod: 1,
        maxPeriod: 12,

        // Year validation
        minYear: 2000,
        maxYear: 2100
    },

    /**
     * Performance configuration
     */
    performance: {
        // Enable debug logging
        debugMode: false,

        // Maximum rows to display in preview
        previewRowLimit: 20,

        // Enable performance profiling
        enableProfiling: false
    },

    /**
     * Feature flags
     */
    features: {
        // Enable experimental features
        enableCashFlowStatement: true,
        enableDataExport: true,
        enableDataPreview: true,

        // Development features
        showDevControls: true
    }
};

/**
 * Get a configuration value by path
 * @param {string} path - Dot-notation path (e.g., 'statements.defaultType')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 *
 * @example
 * getConfig('statements.defaultType') // Returns 'income-statement'
 * getConfig('invalid.path', 'fallback') // Returns 'fallback'
 */
export function getConfig(path, defaultValue = null) {
    const parts = path.split('.');
    let value = APP_CONFIG;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return defaultValue;
        }
    }

    return value;
}

/**
 * Set a configuration value by path (for runtime changes)
 * Note: This modifies the APP_CONFIG object directly
 *
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 *
 * @example
 * setConfig('statements.defaultType', 'balance-sheet')
 */
export function setConfig(path, value) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = APP_CONFIG;

    for (const part of parts) {
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }

    current[lastPart] = value;
}

export default APP_CONFIG;
