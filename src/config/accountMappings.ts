/**
 * Account Mappings Configuration
 *
 * Defines special mappings for accounts that need to be remapped to
 * different hierarchy codes based on their statement type.
 */

import { HIERARCHY_CODES } from '../constants.ts';
import Logger from '../utils/Logger.ts';

interface MappingRule {
    statementType: string;
    code1: string;
    name1: string;
    code2: string;
    name2: string;
    code3: string;
    name3: string;
}

interface AccountMappingConfig {
    patterns: string[];
    mappings: {
        IS?: MappingRule;
        BS?: MappingRule;
    };
    defaultMapping: string;
}

interface RowData {
    accountCode?: string;
    accountDescription?: string;
    level1Label?: string;
    level2Label?: string;
    level3Label?: string;
    level1Code?: string;
    level2Code?: string;
    level3Code?: string;
    statementType?: string;
    [key: string]: any;
}

/**
 * Configuration for special account mappings
 */
export const ACCOUNT_MAPPINGS: Record<string, AccountMappingConfig> = {
    /**
     * Afrondingsverschil (Rounding Differences)
     * Maps to different categories based on statement type
     */
    afrondingsverschil: {
        // Pattern to detect this account
        patterns: ['afronding'],

        // Mapping rules by statement type
        mappings: {
            // Income Statement mapping
            IS: {
                statementType: 'Winst & verlies',
                code1: HIERARCHY_CODES.IS_BUITENGEWONE.code1,
                name1: HIERARCHY_CODES.IS_BUITENGEWONE.name,
                code2: HIERARCHY_CODES.IS_BUITENGEWONE.code2,
                name2: HIERARCHY_CODES.IS_BUITENGEWONE.name,
                code3: '',
                name3: ''
            },

            // Balance Sheet mapping
            BS: {
                statementType: 'Balans',
                code1: HIERARCHY_CODES.BS_KORTLOPENDE_SCHULDEN.code1,
                name1: HIERARCHY_CODES.BS_KORTLOPENDE_SCHULDEN.name,
                code2: HIERARCHY_CODES.BS_KORTLOPENDE_SCHULDEN.code2,
                name2: HIERARCHY_CODES.BS_KORTLOPENDE_SCHULDEN.name,
                code3: '',
                name3: ''
            }
        },

        // Default mapping when statement type column also contains "Afrondingsverschil"
        defaultMapping: 'IS'
    }

    // Additional special mappings can be added here
    // Example:
    // someOtherAccount: {
    //     patterns: ['pattern1', 'pattern2'],
    //     mappings: { ... }
    // }
};

/**
 * AccountMapper - Applies special account mappings
 */
export class AccountMapper {
    /**
     * Check if a row matches any special mapping patterns
     * @param row - Row data with account info
     * @param patterns - Patterns to match against
     * @returns True if row matches any pattern
     */
    static matchesPattern(row: RowData, patterns: string[]): boolean {
        const { accountDescription, level1Label, level2Label, statementType } = row;

        const fields = [
            accountDescription,
            level1Label,
            level2Label,
            statementType
        ];

        return patterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            return fields.some(field =>
                field && field.toString().toLowerCase().includes(patternLower)
            );
        });
    }

    /**
     * Apply special mapping to a row
     * @param row - Original row data
     * @param config - Mapping configuration
     * @param statementType - Current statement type
     * @returns Remapped row data
     */
    static applyMapping(row: RowData, config: AccountMappingConfig, statementType?: string): RowData {
        const { mappings, defaultMapping } = config;

        // Check if statement type column contains the pattern (e.g., "Afrondingsverschil")
        const stmtTypeMatchesPattern = row.statementType &&
            this.matchesPattern({ accountDescription: row.statementType }, config.patterns);

        // Determine which mapping to use
        let mapping: MappingRule | undefined;
        if (stmtTypeMatchesPattern) {
            // Use default mapping (typically IS)
            mapping = mappings[defaultMapping as keyof typeof mappings];
        } else if (statementType === 'Winst & verlies') {
            mapping = mappings.IS;
        } else if (statementType === 'Balans') {
            mapping = mappings.BS;
        }

        if (!mapping) {
            return row; // No mapping found, return original
        }

        // Apply the mapping
        return {
            ...row,
            statementType: mapping.statementType,
            level1Code: mapping.code1,
            level1Label: mapping.name1,
            level2Code: mapping.code2,
            level2Label: mapping.name2,
            level3Code: mapping.code3,
            level3Label: mapping.name3
        };
    }

    /**
     * Check all mappings and apply if any match
     * @param row - Row data to check
     * @returns Original or remapped row data
     */
    static applySpecialMappings(row: RowData): RowData {
        // Check each mapping configuration
        for (const [key, config] of Object.entries(ACCOUNT_MAPPINGS)) {
            if (this.matchesPattern(row, config.patterns)) {
                const remapped = this.applyMapping(row, config, row.statementType);
                Logger.debug(`📝 ${key} remapped: ${row.accountCode} → Statement: ${remapped.statementType}, code2: ${remapped.level2Code}, name2: ${remapped.level2Label}`);
                return remapped;
            }
        }

        return row; // No special mapping needed
    }
}

export default AccountMapper;
