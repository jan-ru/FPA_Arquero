/**
 * FileMetricsService - Calculates and displays file metrics
 *
 * Responsibilities:
 * - Calculate debit/credit totals for BAL and PNL
 * - Format and display file metrics (rows, columns, totals)
 * - Parse period values
 * - Format numbers for display
 *
 * Extracted from UIController to improve separation of concerns
 */

/**
 * @typedef {Object} DebitCreditTotals
 * @property {number} debit
 * @property {number} credit
 */

/**
 * @typedef {Object} StatementTotals
 * @property {DebitCreditTotals} bal
 * @property {DebitCreditTotals} pnl
 */

/**
 * @typedef {Object} FileMetadata
 * @property {number} originalRows
 * @property {number} originalColumns
 * @property {number} longRows
 * @property {number} longColumns
 */

/**
 * @typedef {Object.<string, FileMetadata>} FileMetadataMap
 */

/**
 * @typedef {'all' | string} PeriodValue - 'all', 'q1', 'p9', '9', etc.
 */

/**
 * @typedef {'2024' | '2025'} Year
 */

/**
 * @typedef {'tb2024' | 'tb2025'} FileId
 */

export class FileMetricsService {
    /**
     * Create a new FileMetricsService
     * @param {Object} dataStore - DataStore instance for accessing data
     */
    constructor(dataStore) {
        this.dataStore = dataStore;
    }

    /**
     * Calculate debit and credit totals for BAL and PNL
     * @param {Year} year - Year ('2024' or '2025')
     * @param {PeriodValue} periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @returns {StatementTotals} Totals object with bal and pnl properties
     */
    calculateDebitCreditTotals(year, periodValue) {
        try {
            // Get movements table for the year
            const movements = this.dataStore.getMovementsTable(year);
            if (!movements) {
                return {
                    bal: { debit: 0, credit: 0 },
                    pnl: { debit: 0, credit: 0 }
                };
            }

            // Filter by period if needed
            let filtered = movements;
            if (periodValue !== 'all') {
                const periodNum = this.parsePeriodValue(periodValue);
                filtered = movements
                    .params({ maxPeriod: periodNum })
                    .filter('(d, $) => d.period <= $.maxPeriod');
            }

            // Calculate totals for BAL (Balance Sheet) and PNL (Income Statement)
            const balData = filtered.filter((d) => d.statement_type === 'BS');
            const pnlData = filtered.filter((d) => d.statement_type === 'IS');

            const balTotals = balData.rollup({
                debit: aq.op.sum('debit'),
                credit: aq.op.sum('credit')
            }).objects()[0] || { debit: 0, credit: 0 };

            const pnlTotals = pnlData.rollup({
                debit: aq.op.sum('debit'),
                credit: aq.op.sum('credit')
            }).objects()[0] || { debit: 0, credit: 0 };

            return {
                bal: balTotals,
                pnl: pnlTotals
            };
        } catch (error) {
            console.warn('Error calculating debit/credit totals:', error);
            return {
                bal: { debit: 0, credit: 0 },
                pnl: { debit: 0, credit: 0 }
            };
        }
    }

    /**
     * Parse period value to get maximum period number
     * @param {PeriodValue} periodValue - Period value ('all', 'q1', 'p9', '9', etc.)
     * @returns {number} Maximum period number
     */
    parsePeriodValue(periodValue) {
        if (periodValue === 'all') {
            return 12;
        } else if (periodValue.toUpperCase().startsWith('Q')) {
            // Quarter: Q1 = period 3, Q2 = 6, Q3 = 9, Q4 = 12
            const quarter = parseInt(periodValue.substring(1));
            return quarter * 3;
        } else {
            // Individual period (e.g., "9" or "p9")
            const match = periodValue.match(/\d+/);
            return match ? parseInt(match[0]) : 12;
        }
    }

    /**
     * Build metrics HTML for display
     * @param {FileMetadata} metadata - File metadata (originalRows, originalColumns, longRows, longColumns)
     * @param {StatementTotals} totals - Debit/credit totals {bal: {debit, credit}, pnl: {debit, credit}}
     * @param {function(number): string} formatNumber - Number formatting function
     * @returns {string} HTML string for metrics display
     */
    buildMetricsHTML(metadata, totals, formatNumber) {
        const metrics = [];

        // Row/column counts
        metrics.push(
            `${metadata.originalRows}R × ${metadata.originalColumns}C (wide) → ` +
            `${metadata.longRows}R × ${metadata.longColumns}C (long)`
        );

        // Debit/Credit totals
        metrics.push(
            `BAL: DR €${formatNumber(totals.bal.debit)} | CR €${formatNumber(totals.bal.credit)}`
        );
        metrics.push(
            `PNL: DR €${formatNumber(totals.pnl.debit)} | CR €${formatNumber(totals.pnl.credit)}`
        );

        return metrics.join('<br>');
    }

    /**
     * Update file metrics display in DOM
     * @param {FileId} fileId - File ID ('tb2024' or 'tb2025')
     * @param {Year} year - Year ('2024' or '2025')
     * @param {PeriodValue} periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @param {FileMetadata} metadata - File metadata
     * @param {function(number): string} formatNumber - Number formatting function
     * @returns {void}
     */
    updateFileMetrics(fileId, year, periodValue, metadata, formatNumber) {
        const metricsElement = document.getElementById(`metrics-${fileId}`);
        if (!metricsElement) return;

        if (!metadata) {
            console.warn(`No metadata found for year ${year}`);
            return;
        }

        // Calculate debits and credits for BAL and PNL
        const totals = this.calculateDebitCreditTotals(year, periodValue);

        // Build and display metrics HTML
        const metricsHTML = this.buildMetricsHTML(metadata, totals, formatNumber);
        metricsElement.innerHTML = metricsHTML;
        metricsElement.style.display = 'block';
    }

    /**
     * Hide file metrics display
     * @param {FileId} fileId - File ID ('tb2024' or 'tb2025')
     * @returns {void}
     */
    hideFileMetrics(fileId) {
        const metricsElement = document.getElementById(`metrics-${fileId}`);
        if (metricsElement) {
            metricsElement.style.display = 'none';
        }
    }

    /**
     * Update all file metrics for given period
     * @param {FileMetadataMap} fileMetadataMap - Map of year to metadata
     * @param {PeriodValue} periodValue - Period value
     * @param {Year[]} years - Array of years to update
     * @param {function(number): string} formatNumber - Number formatting function
     * @returns {void}
     */
    updateAllFileMetrics(fileMetadataMap, periodValue, years, formatNumber) {
        const fileIdMap = {
            '2024': 'tb2024',
            '2025': 'tb2025'
        };

        for (const year of years) {
            const fileId = fileIdMap[year];
            const metadata = fileMetadataMap[year];

            if (metadata && fileId) {
                this.updateFileMetrics(fileId, year, periodValue, metadata, formatNumber);
            }
        }
    }

    /**
     * Calculate profit for a specific period
     * @param {Year} year - Year ('2024' or '2025')
     * @param {PeriodValue} periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @returns {number} Calculated profit
     */
    calculateProfitForPeriod(year, periodValue) {
        try {
            const movementsTable = this.dataStore.getMovementsTable(year);
            if (!movementsTable) return 0;

            // Determine which periods to include based on periodValue
            let filtered;
            if (periodValue === 'all') {
                // All periods (1-12)
                filtered = movementsTable
                    .filter((d) => d.statement_type === 'IS')
                    .filter((d) => d.period >= 1 && d.period <= 12);
            } else if (periodValue.startsWith('Q')) {
                // Quarter: Q1 = periods 1-3, Q2 = 4-6, Q3 = 7-9, Q4 = 10-12
                const quarter = parseInt(periodValue.substring(1));
                const startPeriod = (quarter - 1) * 3 + 1;
                const endPeriod = quarter * 3;
                filtered = movementsTable
                    .filter((d) => d.statement_type === 'IS')
                    .params({ start: startPeriod, end: endPeriod })
                    .filter('(d, $) => d.period >= $.start && d.period <= $.end');
            } else {
                // Individual period (e.g., "9" for P9)
                const period = parseInt(periodValue);
                filtered = movementsTable
                    .filter((d) => d.statement_type === 'IS')
                    .params({ maxPeriod: period })
                    .filter('(d, $) => d.period >= 1 && d.period <= $.maxPeriod');
            }

            // Calculate total
            const isAccounts = filtered.rollup({ total: (d) => aq.op.sum(d.movement_amount) });

            // Movement amounts are already sign-flipped during data load, so we can use directly
            const profit = isAccounts.numRows() > 0 ? isAccounts.get('total', 0) : 0;
            return profit || 0;
        } catch (error) {
            console.warn(`Error calculating profit for ${year} ${periodValue}:`, error);
            return 0;
        }
    }
}

export default FileMetricsService;
