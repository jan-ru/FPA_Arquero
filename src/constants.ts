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
    VERSION: '0.9.0',
    ALL_PERIODS_VALUE: 12,        // Represents "all" periods (1-12)
    ALL_PERIODS_CODE: 999         // Sentinel value for "all" periods in filters
} as const;

// Statement Types
export const STATEMENT_TYPES = {
    BALANCE_SHEET: 'BS',
    INCOME_STATEMENT: 'IS',
    CASH_FLOW: 'CF'
} as const;

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
} as const;

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
} as const;

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
} as const;

// UI Configuration
export const UI_CONFIG = {
    // Status Message Colors
    STATUS_COLORS: {
        INFO: '#007bff',              // Blue for info messages
        ERROR: '#dc3545',             // Red for errors
        SUCCESS: '#28a745',           // Green for success
        WARNING: '#ffc107',           // Yellow for warnings
        LOADING: '#ffc107'            // Yellow for loading state
    },

    // Status Message Icons
    STATUS_ICONS: {
        INFO: '',                     // No icon for info
        ERROR: '❌ ',                 // Red X for errors
        SUCCESS: '✅ ',               // Green check for success
        WARNING: '⚠️ ',               // Warning symbol
        LOADING: '⏳ '                // Hourglass for loading
    },

    // File Status Icons
    FILE_STATUS_ICONS: {
        SUCCESS: '✅',
        ERROR: '❌',
        LOADING: '⏳'
    },

    // Timing
    MESSAGE_TIMEOUT: 3000,            // Auto-clear messages after 3 seconds
    STATEMENT_REGEN_TIMEOUT: 1000,    // Max time for statement regeneration

    // Preview
    PREVIEW_ROW_LIMIT: 20             // Number of rows to show in preview
} as const;

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
} as const;

// UI Statement Type Constants (for rendering and display logic)
export const UI_STATEMENT_TYPES = {
    BALANCE_SHEET: 'balance-sheet',
    INCOME_STATEMENT: 'income-statement',
    CASH_FLOW: 'cash-flow'
} as const;

interface YearPair {
    prior: string;
    current: string;
    priorColumn: string;
    currentColumn: string;
    varianceColumn: string;
}

// Year Configuration Helper (supports 2, 3, or more years dynamically)
export const YEAR_CONFIG = {
    // Get all years from APP_CONFIG
    get years(): readonly string[] {
        return APP_CONFIG.YEARS;
    },

    // Get number of years
    get yearCount(): number {
        return APP_CONFIG.YEARS.length;
    },

    // Get specific year by index (0-based)
    getYear(index: number): string {
        return APP_CONFIG.YEARS[index];
    },

    // Get column name for a year
    getAmountColumn(year: string): string {
        return `amount_${year}`;
    },

    // Get all amount column names
    get amountColumns(): string[] {
        return APP_CONFIG.YEARS.map(year => `amount_${year}`);
    },

    // Get year pairs for variance calculations (adjacent years)
    get yearPairs(): YearPair[] {
        const pairs: YearPair[] = [];
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
    getDefaultPeriod(year: string): string {
        return `${year}-all`;
    },

    // LTM (Latest Twelve Months) Configuration
    LTM: {
        ENABLED: true,
        MONTHS_COUNT: 12,
        DEFAULT_LABEL: 'LTM',
        OPTION_VALUE: 'ltm',
        DISPLAY_NAME: 'LTM (Latest 12 Months)'
    } as const
};

/**
 * Helper function to check if LTM (Latest Twelve Months) is selected
 * @param periodValue - The period value from dropdown (e.g., 'ltm', '2024-all', '2024-P9')
 * @returns True if LTM is selected
 */
export function isLTMSelected(periodValue: string): boolean {
    return periodValue === YEAR_CONFIG.LTM.OPTION_VALUE;
}

// Dutch to English month mapping (DEPRECATED - use DateUtils.getMonthNumber() instead)
// Kept for backward compatibility but will be removed in future version
export const MONTH_MAP: Record<string, number> = {
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
 * import DateUtils from './utils/DateUtils.ts';
 * DateUtils.initialize();
 * const monthNum = DateUtils.getMonthNumber('januari'); // 1
 */

// Hierarchy Code Ranges and Mappings
export const HIERARCHY_CODES = {
    // Account code ranges for Activa and Passiva
    ACTIVA_RANGE: { min: 0, max: 50 },
    PASSIVA_RANGE: { min: 60, max: 90 },

    // Level 1 code ranges by category
    ACTIVA_VASTE: [0, 10, 20] as number[],
    ACTIVA_VLOTTENDE: [30, 40, 50] as number[],
    PASSIVA_EIGEN_VERMOGEN: [60] as number[],
    PASSIVA_LANGE_TERMIJN: [65, 70] as number[],
    PASSIVA_KORTE_TERMIJN: [80, 90] as number[],

    // Special account codes for mapping
    IS_BUITENGEWONE: { code1: '540', code2: '54010', name: 'Buitengewone baten en lasten' },
    BS_KORTLOPENDE_SCHULDEN: { code1: '80', code2: '08080', name: 'Overige kortlopende schulden' }
};
