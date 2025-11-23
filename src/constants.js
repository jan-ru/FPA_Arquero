/**
 * Constants and Configuration
 * Central location for all application constants
 */

// Application Configuration
export const APP_CONFIG = {
    YEARS: ['2024', '2025'],
    PERIODS_PER_YEAR: 12,
    DEFAULT_YEAR: '2024',
    DEFAULT_PERIOD: 'all',
    VERSION: '2.8.0'
};

// Statement Types
export const STATEMENT_TYPES = {
    BALANCE_SHEET: 'BS',
    INCOME_STATEMENT: 'IS',
    CASH_FLOW: 'CF'
};

// Excel Column Indices (1-based)
export const EXCEL_COLUMNS = {
    STATEMENT_TYPE: 4,
    CODE1: 5,
    NAME1: 6,
    CODE2: 7,
    NAME2: 8,
    CODE3: 9,
    NAME3: 10,
    ACCOUNT_CODE: 11,
    ACCOUNT_DESCRIPTION: 12
};

// Export Configuration
export const EXPORT_CONFIG = {
    // Excel Colors (ARGB format)
    COLORS: {
        HEADER: 'FF007bff',           // Blue header background
        METRIC_HIGHLIGHT: 'FFFFE599', // Yellow highlight for metrics
        WHITE: 'FFFFFFFF',            // White text
        CATEGORY_HEADER: 'FFE9ECEF'   // Light gray for categories
    },

    // Number Formats
    NUMBER_FORMAT: '#,##0',           // Whole numbers with thousand separator

    // Column Widths (in Excel units)
    COLUMN_WIDTHS: {
        LINE_ITEM: 35,                // Width for line item descriptions
        AMOUNT: 15,                   // Width for amount columns
        METADATA_LABEL: 25,           // Width for metadata labels
        METADATA_VALUE: 50            // Width for metadata values
    },

    // Font Sizes (in points)
    FONT_SIZES: {
        TITLE: 14,                    // Metadata sheet title
        HEADER: 12,                   // Table headers
        NORMAL: 11                    // Regular content
    }
};

// Validation Configuration
export const VALIDATION_CONFIG = {
    // Balance Sheet tolerance for accounting equation
    BALANCE_TOLERANCE: 0.01,          // Maximum acceptable imbalance

    // File size warning threshold (in bytes)
    LARGE_FILE_THRESHOLD: 10 * 1024 * 1024, // 10 MB

    // Required columns for trial balance files
    REQUIRED_COLUMNS: [
        'account_code',
        'account_description',
        'statement_type',
        'code1',
        'name1'
    ]
};

// UI Configuration
export const UI_CONFIG = {
    // Status Message Colors
    STATUS_COLORS: {
        INFO: '#007bff',              // Blue for info messages
        ERROR: '#dc3545',             // Red for errors
        SUCCESS: '#28a745'            // Green for success
    },

    // Status Message Icons
    STATUS_ICONS: {
        INFO: '',                     // No icon for info
        ERROR: '❌ ',                 // Red X for errors
        SUCCESS: '✅ '                // Green check for success
    },

    // Timing
    MESSAGE_TIMEOUT: 3000,            // Auto-clear messages after 3 seconds
    STATEMENT_REGEN_TIMEOUT: 1000,    // Max time for statement regeneration

    // Preview
    PREVIEW_ROW_LIMIT: 20             // Number of rows to show in preview
};

// Category Definitions for Financial Statements
export const CATEGORY_DEFINITIONS = {
    // Asset Categories (for Total Assets calculation)
    ASSETS: [
        'immateriële vaste activa',   // Intangible fixed assets
        'materiële vaste activa',     // Tangible fixed assets
        'voorraden',                  // Inventory
        'vorderingen',                // Receivables
        'liquide middelen'            // Cash and equivalents
    ],

    // Liability Categories
    LIABILITIES: [
        'schuld',                     // Debts
        'voorziening',                // Provisions
        'passiva'                     // Liabilities
    ],

    // Equity Categories
    EQUITY: [
        'eigen vermogen',             // Equity
        'equity'                      // Equity (English)
    ],

    // Cash Categories (for Cash Flow Statement)
    CASH: [
        'liquide middelen',           // Cash and equivalents
        'cash',                       // Cash (English)
        'bank'                        // Bank accounts
    ]
};

// UI Statement Type Constants (for rendering and display logic)
export const UI_STATEMENT_TYPES = {
    BALANCE_SHEET: 'balance-sheet',
    INCOME_STATEMENT: 'income-statement',
    CASH_FLOW: 'cash-flow'
};

// Year Configuration Helper (supports 2, 3, or more years dynamically)
export const YEAR_CONFIG = {
    // Get all years from APP_CONFIG
    get years() {
        return APP_CONFIG.YEARS;
    },

    // Get number of years
    get yearCount() {
        return APP_CONFIG.YEARS.length;
    },

    // Get specific year by index (0-based)
    getYear(index) {
        return APP_CONFIG.YEARS[index];
    },

    // Get column name for a year
    getAmountColumn(year) {
        return `amount_${year}`;
    },

    // Get all amount column names
    get amountColumns() {
        return APP_CONFIG.YEARS.map(year => `amount_${year}`);
    },

    // Get year pairs for variance calculations (adjacent years)
    get yearPairs() {
        const pairs = [];
        for (let i = 0; i < APP_CONFIG.YEARS.length - 1; i++) {
            pairs.push({
                prior: APP_CONFIG.YEARS[i],
                current: APP_CONFIG.YEARS[i + 1],
                priorColumn: `amount_${APP_CONFIG.YEARS[i]}`,
                currentColumn: `amount_${APP_CONFIG.YEARS[i + 1]}`,
                varianceColumn: `variance_${APP_CONFIG.YEARS[i]}_${APP_CONFIG.YEARS[i + 1]}`
            });
        }
        return pairs;
    },

    // Get default period value for a year
    getDefaultPeriod(year) {
        return `${year}-all`;
    }
};

// Dutch to English month mapping (DEPRECATED - use DateUtils.getMonthNumber() instead)
// Kept for backward compatibility but will be removed in future version
export const MONTH_MAP = {
    'januari': 1,
    'februari': 2,
    'maart': 3,
    'april': 4,
    'mei': 5,
    'juni': 6,
    'juli': 7,
    'augustus': 8,
    'september': 9,
    'oktober': 10,
    'november': 11,
    'december': 12
};

/**
 * @deprecated Use DateUtils.getMonthNumber() for month name to number conversion
 * @example
 * import DateUtils from './utils/DateUtils.js';
 * DateUtils.initialize();
 * const monthNum = DateUtils.getMonthNumber('januari'); // 1
 */

// Hierarchy Code Ranges and Mappings
export const HIERARCHY_CODES = {
    // Account code ranges for Activa and Passiva
    ACTIVA_RANGE: { min: 0, max: 50 },
    PASSIVA_RANGE: { min: 60, max: 90 },

    // Level 1 code ranges by category
    ACTIVA_VASTE: [0, 10, 20],
    ACTIVA_VLOTTENDE: [30, 40, 50],
    PASSIVA_EIGEN_VERMOGEN: [60],
    PASSIVA_LANGE_TERMIJN: [65, 70],
    PASSIVA_KORTE_TERMIJN: [80, 90],

    // Special account codes for mapping
    IS_BUITENGEWONE: { code1: '54', code2: '54010', name: 'Buitengewone baten en lasten' },
    BS_KORTLOPENDE_SCHULDEN: { code1: '80', code2: '08080', name: 'Overige kortlopende schulden' }
};
