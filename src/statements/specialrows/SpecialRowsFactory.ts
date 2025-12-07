import Logger from '../../utils/Logger.ts';

/**
 * SpecialRowsFactory - Creates statement-specific special rows handlers
 *
 * @deprecated This system is deprecated. Use report definitions with calculated
 * and subtotal layout items instead. Will be removed in next major version.
 *
 * Factory pattern for creating different special row handlers for
 * Balance Sheet, Income Statement, and Cash Flow statements
 */

import BalanceSheetSpecialRows from './BalanceSheetSpecialRows.ts';
import IncomeStatementSpecialRows from './IncomeStatementSpecialRows.ts';
import CashFlowStatementSpecialRows from './CashFlowStatementSpecialRows.ts';

interface SpecialRowsHandler {
    insert(data: any[], statementData: any): any[];
}

export class SpecialRowsFactory {
    /**
     * Create appropriate special rows handler for statement type
     * @param statementType - Statement type (BS, IS, CF or balance-sheet, income-statement, cash-flow)
     * @returns Special rows handler
     * @deprecated Use report definitions with calculated and subtotal layout items instead
     */
    static create(statementType: string): SpecialRowsHandler {
        Logger.warn('SpecialRowsFactory is deprecated. Use report definitions with calculated and subtotal layout items instead.');
        // Normalize statement type (handle both 'BS' and 'balance-sheet' formats)
        const normalized = this.normalizeStatementType(statementType);

        switch(normalized) {
            case 'BS':
                return new BalanceSheetSpecialRows();
            case 'IS':
                return new IncomeStatementSpecialRows();
            case 'CF':
                return new CashFlowStatementSpecialRows();
            default:
                return new NoSpecialRows();
        }
    }

    /**
     * Normalize statement type from UI format to data format
     * @param statementType - Statement type in either format
     * @returns Normalized type (BS, IS, CF)
     */
    static normalizeStatementType(statementType: string): string {
        const typeMap: Record<string, string> = {
            'balance-sheet': 'BS',
            'income-statement': 'IS',
            'cash-flow': 'CF',
            'BS': 'BS',
            'IS': 'IS',
            'CF': 'CF'
        };
        return typeMap[statementType] || statementType;
    }
}

/**
 * Default handler for statements without special rows
 */
class NoSpecialRows implements SpecialRowsHandler {
    insert(data: any[], _statementData: any): any[] {
        return data;
    }
}

export default SpecialRowsFactory;
