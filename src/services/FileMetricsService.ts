import Logger from '../utils/Logger.ts';

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

import PeriodParser from '../utils/PeriodParser.ts';

// Access arquero from global window object (loaded via CDN in index.html)
declare global {
    interface Window {
        aq: any;
    }
}

const aq = (typeof window !== 'undefined' && window.aq) || (globalThis as any).aq;

// Type definitions
export interface DebitCreditTotals {
    readonly debit: number;
    readonly credit: number;
}

export interface StatementTotals {
    readonly bal: DebitCreditTotals;
    readonly pnl: DebitCreditTotals;
}

export interface FileMetadata {
    readonly originalRows: number;
    readonly originalColumns: number;
    readonly longRows: number;
    readonly longColumns: number;
}

export interface FileMetadataMap {
    [year: string]: FileMetadata;
}

export type PeriodValue = 'all' | string; // 'all', 'q1', 'p9', '9', etc.
export type Year = '2024' | '2025';
export type FileId = 'tb2024' | 'tb2025';

// DataStore interface (minimal typing for what we need)
interface MovementsTable {
    params(params: Record<string, number>): MovementsTable;
    filter(predicate: string | ((row: MovementRow) => boolean)): MovementsTable;
    derive(ops: Record<string, (d: any) => any>): MovementsTable;
    rollup(ops: Record<string, unknown>): {
        objects(): DebitCreditTotals[];
        numRows(): number;
        get(column: string, index: number): number;
    };
}

interface MovementRow {
    readonly statement_type: 'BS' | 'IS';
    readonly period: number;
    readonly debit: number;
    readonly credit: number;
    readonly movement_amount: number;
}

interface DataStore {
    getMovementsTable(year: Year): MovementsTable | null;
}

export class FileMetricsService {
    private readonly dataStore: DataStore;

    /**
     * Create a new FileMetricsService
     * @param dataStore - DataStore instance for accessing data
     */
    constructor(dataStore: DataStore) {
        this.dataStore = dataStore;
    }

    /**
     * Calculate debit and credit totals for BAL and PNL
     * @param year - Year ('2024' or '2025')
     * @param periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @returns Totals object with bal and pnl properties
     */
    calculateDebitCreditTotals(year: Year, periodValue: PeriodValue): StatementTotals {
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

            // Derive debit/credit columns from movement_amount
            // Positive movement_amount = debit, negative = credit
            const withDebitCredit = filtered.derive({
                debit: (d: any) => d.movement_amount > 0 ? d.movement_amount : 0,
                credit: (d: any) => d.movement_amount < 0 ? -d.movement_amount : 0
            });

            // Calculate totals for BAL (Balance Sheet) and PNL (Income Statement)
            const balData = withDebitCredit.filter((d: MovementRow) => d.statement_type === 'BS');
            const pnlData = withDebitCredit.filter((d: MovementRow) => d.statement_type === 'IS');

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
            Logger.warn('Error calculating debit/credit totals:', error);
            return {
                bal: { debit: 0, credit: 0 },
                pnl: { debit: 0, credit: 0 }
            };
        }
    }

    /**
     * Parse period value to get maximum period number
     * @param periodValue - Period value ('all', 'q1', 'p9', '9', etc.)
     * @returns Maximum period number
     */
    parsePeriodValue(periodValue: PeriodValue): number {
        // Delegate to PeriodParser utility
        const result = PeriodParser.parse(periodValue);
        return typeof result === 'number' ? result : 12;
    }

    /**
     * Build metrics HTML for display
     * @param metadata - File metadata (originalRows, originalColumns, longRows, longColumns)
     * @param totals - Debit/credit totals {bal: {debit, credit}, pnl: {debit, credit}}
     * @param formatNumber - Number formatting function
     * @returns HTML string for metrics display
     */
    buildMetricsHTML(
        metadata: FileMetadata,
        totals: StatementTotals,
        formatNumber: (value: number) => string
    ): string {
        const metrics: string[] = [];

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
     * @param fileId - File ID ('tb2024' or 'tb2025')
     * @param year - Year ('2024' or '2025')
     * @param periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @param metadata - File metadata
     * @param formatNumber - Number formatting function
     */
    updateFileMetrics(
        fileId: FileId,
        year: Year,
        periodValue: PeriodValue,
        metadata: FileMetadata,
        formatNumber: (value: number) => string
    ): void {
        const metricsElement = document.getElementById(`metrics-${fileId}`);
        if (!metricsElement) return;

        if (!metadata) {
            Logger.warn(`No metadata found for year ${year}`);
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
     * @param fileId - File ID ('tb2024' or 'tb2025')
     */
    hideFileMetrics(fileId: FileId): void {
        const metricsElement = document.getElementById(`metrics-${fileId}`);
        if (metricsElement) {
            metricsElement.style.display = 'none';
        }
    }

    /**
     * Update all file metrics for given period
     * @param fileMetadataMap - Map of year to metadata
     * @param periodValue - Period value
     * @param years - Array of years to update
     * @param formatNumber - Number formatting function
     */
    updateAllFileMetrics(
        fileMetadataMap: FileMetadataMap,
        periodValue: PeriodValue,
        years: Year[],
        formatNumber: (value: number) => string
    ): void {
        const fileIdMap: Record<Year, FileId> = {
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
     * @param year - Year ('2024' or '2025')
     * @param periodValue - Period value ('all', 'q1', 'p9', etc.)
     * @returns Calculated profit
     */
    calculateProfitForPeriod(year: Year, periodValue: PeriodValue): number {
        try {
            const movementsTable = this.dataStore.getMovementsTable(year);
            if (!movementsTable) return 0;

            // Determine which periods to include based on periodValue
            let filtered: MovementsTable;
            if (periodValue === 'all') {
                // All periods (1-12)
                filtered = movementsTable
                    .filter((d: MovementRow) => d.statement_type === 'IS')
                    .filter((d: MovementRow) => d.period >= 1 && d.period <= 12);
            } else if (periodValue.startsWith('Q')) {
                // Quarter: Q1 = periods 1-3, Q2 = 4-6, Q3 = 7-9, Q4 = 10-12
                const quarter = parseInt(periodValue.substring(1));
                const startPeriod = (quarter - 1) * 3 + 1;
                const endPeriod = quarter * 3;
                filtered = movementsTable
                    .filter((d: MovementRow) => d.statement_type === 'IS')
                    .params({ start: startPeriod, end: endPeriod })
                    .filter('(d, $) => d.period >= $.start && d.period <= $.end');
            } else {
                // Individual period (e.g., "9" for P9)
                const period = parseInt(periodValue);
                filtered = movementsTable
                    .filter((d: MovementRow) => d.statement_type === 'IS')
                    .params({ maxPeriod: period })
                    .filter('(d, $) => d.period >= 1 && d.period <= $.maxPeriod');
            }

            // Calculate total
            const isAccounts = filtered.rollup({ total: (d: any) => (aq as any).op.sum(d.movement_amount) });

            // Movement amounts are already sign-flipped during data load, so we can use directly
            const profit = isAccounts.numRows() > 0 ? isAccounts.get('total', 0) : 0;
            return profit || 0;
        } catch (error) {
            Logger.warn(`Error calculating profit for ${year} ${periodValue}:`, error);
            return 0;
        }
    }
}

export default FileMetricsService;
