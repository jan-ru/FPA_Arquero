/**
 * DataLoader - Handles Excel file loading and transformation
 * Loads trial balance data and transforms from wide to long format
 *
 * Dependencies: ExcelJS (global from CDN), aq/Arquero (global from CDN), Day.js (global from CDN)
 */

import { MONTH_MAP, EXCEL_COLUMNS, STATEMENT_TYPES, VALIDATION_CONFIG } from '../constants.js';
import DateUtils from '../utils/DateUtils.js';
import ValidationResult from '../utils/ValidationResult.js';
import HierarchyCodeMapper from '../utils/HierarchyCodeMapper.js';
import { AccountMapper } from '../config/accountMappings.js';

export default class DataLoader {
    constructor() {
        this.inputDirHandle = null;
        this.outputDirHandle = null;
        this.config = null; // Will be set via setConfig()

        // Initialize DateUtils for date/period handling
        DateUtils.initialize();
    }

    // Set configuration
    setConfig(config) {
        this.config = config;
    }

    // Request access to input directory
    async selectInputDirectory() {
        console.log('Opening directory picker...');
        try {
            // Note: The File System Access API doesn't support relative paths or specific subdirectories
            // as starting points. We can only use well-known directories like 'documents', 'desktop', etc.
            // The user will need to navigate to the 'input' directory manually.
            this.inputDirHandle = await window.showDirectoryPicker({
                mode: 'read',
                startIn: 'documents',
                id: 'financial-statement-input' // Helps browser remember the last location
            });
            console.log('Input directory selected:', this.inputDirHandle.name);

            // Provide helpful feedback if user didn't select 'input' directory
            if (this.inputDirHandle.name.toLowerCase() !== 'input') {
                console.warn('Note: Expected directory name is "input". Selected:', this.inputDirHandle.name);
            }

            return this.inputDirHandle;
        } catch (error) {
            // If user canceled the dialog, don't treat it as an error
            if (error.name === 'AbortError') {
                console.log('Directory selection canceled by user');
                throw error; // Re-throw the AbortError so the caller can handle it
            }

            console.error('Error selecting input directory:', error);
            throw new Error('Failed to select input directory: ' + error.message);
        }
    }

    // Request access to output directory
    async selectOutputDirectory() {
        try {
            this.outputDirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            console.log('Output directory selected:', this.outputDirHandle.name);
            return this.outputDirHandle;
        } catch (error) {
            console.error('Error selecting output directory:', error);
            throw new Error('Failed to select output directory');
        }
    }

    // Read file from input directory
    async readFileFromDirectory(filename) {
        if (!this.inputDirHandle) {
            throw new Error('Input directory not selected. Please select input directory first.');
        }

        try {
            const fileHandle = await this.inputDirHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return file;
        } catch (error) {
            console.error(`Error reading file ${filename}:`, error);
            throw new Error(`File not found: ${filename}`);
        }
    }

    // Validate required columns in Excel data
    // Returns ValidationResult instead of throwing for better error handling
    validateColumns(data, requiredColumns) {
        const result = new ValidationResult();

        if (!data || data.length === 0) {
            result.addError('data', 'File is empty or invalid');
            return result;
        }

        const firstRow = data[0];
        const actualColumns = Object.keys(firstRow);
        const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));

        if (missingColumns.length > 0) {
            missingColumns.forEach(col => {
                result.addError('columns', `Missing required column: ${col}`);
            });
        }

        // Add info about found columns
        if (result.isValid) {
            result.addInfo('columns', `Found all ${requiredColumns.length} required columns`);
        }

        return result;
    }

    // Map month name and year to period number
    mapMonthToPeriod(columnName, year) {
        const lowerCol = String(columnName).toLowerCase();

        // Check for "Voorafgaandejournaalposten" - map to period 12 (December)
        if (lowerCol.includes('voorafgaandejournaalposten') || lowerCol.includes('voorafgaande')) {
            if (lowerCol.includes(year)) {
                return {
                    period: 12,
                    year: parseInt(year),
                    type: 'movement'
                };
            }
        }

        // Check for month patterns (e.g., "januari2024", "februari2024")
        // Try all Dutch month names using DateUtils
        const monthNames = DateUtils.getAllMonthNames();
        for (const monthName of monthNames) {
            const lowerMonth = monthName.toLowerCase();
            if (lowerCol.includes(lowerMonth) && lowerCol.includes(year)) {
                const periodNum = DateUtils.getMonthNumber(monthName);
                if (periodNum) {
                    return {
                        period: periodNum,
                        year: parseInt(year),
                        type: 'movement'
                    };
                }
            }
        }

        // Check for balance indicators
        if (lowerCol.includes('saldo') || lowerCol.includes('balance')) {
            return {
                period: 12, // End of year
                year: parseInt(year),
                type: 'balance'
            };
        }

        return null;
    }

    // Identify period columns from headers
    identifyPeriodColumns(headers, year) {
        const movements = [];
        const balances = [];

        headers.forEach((header, index) => {
            if (!header) return;

            const mapping = this.mapMonthToPeriod(header, year);
            if (mapping) {
                if (mapping.type === 'movement') {
                    movements.push({
                        columnIndex: index,
                        period: mapping.period,
                        columnName: header
                    });
                } else if (mapping.type === 'balance') {
                    balances.push({
                        columnIndex: index,
                        period: mapping.period,
                        columnName: header
                    });
                }
            }
        });

        return { movements, balances };
    }

    // Calculate cumulative profit from balances table
    calculateCumulativeProfit(balancesTable) {
        try {
            // Filter for Income Statement accounts at period 12 (end of year)
            const isAccounts = balancesTable
                .filter(d => d.statement_type === 'IS' && d.period === 12)
                .rollup({ total: d => aq.op.sum(d.balance_amount) });

            const profit = isAccounts.numRows() > 0 ? isAccounts.get('total', 0) : 0;
            return profit || 0;
        } catch (error) {
            console.warn('Error calculating cumulative profit:', error);
            return 0;
        }
    }

    // Transform wide format data to long format
    transformWideToLong(worksheet, year) {
        const movements = [];
        const balances = [];

        // Get headers from first row
        const headers = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value;
        });

        // Identify period columns
        const periodColumns = this.identifyPeriodColumns(headers, year);

        console.log(`Found ${periodColumns.movements.length} movement columns and ${periodColumns.balances.length} balance columns for ${year}`);

        // Process each data row
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const accountCode = row.getCell(EXCEL_COLUMNS.ACCOUNT_CODE).value;
            const accountDescription = row.getCell(EXCEL_COLUMNS.ACCOUNT_DESCRIPTION).value;

            if (!accountCode) return;

            // Extract hierarchy columns
            let statementType = row.getCell(EXCEL_COLUMNS.STATEMENT_TYPE).value;
            let level1Code = row.getCell(EXCEL_COLUMNS.CODE1).value;
            let level1Label = row.getCell(EXCEL_COLUMNS.NAME1).value;
            let level2Code = row.getCell(EXCEL_COLUMNS.CODE2).value;
            let level2Label = row.getCell(EXCEL_COLUMNS.NAME2).value;
            let level3Code = row.getCell(EXCEL_COLUMNS.CODE3).value;
            let level3Label = row.getCell(EXCEL_COLUMNS.NAME3).value;

            // Apply special account mappings (e.g., Afrondingsverschil)
            const rowData = {
                accountCode,
                accountDescription,
                statementType,
                level1Code,
                level1Label,
                level2Code,
                level2Label,
                level3Code,
                level3Label
            };

            const remappedRow = AccountMapper.applySpecialMappings(rowData);

            // Use remapped values if changed
            statementType = remappedRow.statementType;
            level1Code = remappedRow.level1Code;
            level1Label = remappedRow.level1Label;
            level2Code = remappedRow.level2Code;
            level2Label = remappedRow.level2Label;
            level3Code = remappedRow.level3Code;
            level3Label = remappedRow.level3Label;

            // Determine statement type
            let stmtType = STATEMENT_TYPES.INCOME_STATEMENT; // Default
            if (statementType === 'Balans') {
                stmtType = STATEMENT_TYPES.BALANCE_SHEET;
            } else if (statementType === 'Winst & verlies') {
                stmtType = STATEMENT_TYPES.INCOME_STATEMENT;
            }

            // Determine Code0 and Name0 based on code1 using HierarchyCodeMapper
            const { code0, name0 } = HierarchyCodeMapper.getCode0AndName0(level1Code);

            // Create base row with hierarchy
            const baseRow = {
                statement_type: stmtType,
                code0: code0,
                name0: name0,
                code1: level1Code !== null && level1Code !== undefined ? String(level1Code) : '',
                name1: (level1Label ?? '').toString(),
                code2: level2Code !== null && level2Code !== undefined ? String(level2Code) : '',
                name2: (level2Label ?? level1Label ?? '').toString(),
                code3: level3Code !== null && level3Code !== undefined ? String(level3Code) : '',
                name3: level3Label ?? '',
                account_code: String(accountCode),
                account_description: String(accountDescription ?? '')
            };

            // Process movement columns
            periodColumns.movements.forEach(col => {
                const value = row.getCell(col.columnIndex).value;

                // Only include non-zero and non-null values (sparse representation)
                if (value !== null && value !== undefined && value !== 0) {
                    movements.push({
                        ...baseRow,
                        period: col.period,
                        year: parseInt(year),
                        movement_amount: Number(value)
                    });
                }
            });

            // Process balance columns
            periodColumns.balances.forEach(col => {
                const value = row.getCell(col.columnIndex).value;

                // Only include non-zero and non-null values (sparse representation)
                if (value !== null && value !== undefined && value !== 0) {
                    balances.push({
                        ...baseRow,
                        period: col.period,
                        year: parseInt(year),
                        balance_amount: Number(value)
                    });
                }
            });
        });

        console.log(`Transformed to ${movements.length} movement rows and ${balances.length} balance rows`);

        return { movements, balances };
    }

    // Load trial balance amounts for a specific period
    async loadTrialBalance(period) {
        // Use instance config or fall back to global window.config
        const config = this.config || window.config;

        if (!config) {
            throw new Error('Configuration not loaded. Call setConfig() first or ensure window.config is available.');
        }

        const filename = period === '2024'
            ? config.inputFiles.trialBalance2024
            : config.inputFiles.trialBalance2025;

        try {
            // Validate period parameter
            if (!period || (period !== '2024' && period !== '2025')) {
                throw new Error(`Invalid period: ${period}. Must be '2024' or '2025'.`);
            }

            // Read file
            const file = await this.readFileFromDirectory(filename);

            // Validate file size (warn if > threshold)
            if (file.size > VALIDATION_CONFIG.LARGE_FILE_THRESHOLD) {
                console.warn(`Large file detected: ${filename} (${(file.size / 1024 / 1024).toFixed(2)} MB). Loading may take longer.`);
            }

            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            // Validate workbook has worksheets
            if (!workbook.worksheets || workbook.worksheets.length === 0) {
                throw new Error(`File ${filename} contains no worksheets`);
            }

            const worksheet = workbook.worksheets[0];

            // Validate worksheet has data
            if (!worksheet || worksheet.rowCount < 2) {
                throw new Error(`File ${filename} is empty or has insufficient data (needs at least header + 1 data row)`);
            }

            console.log(`Transforming ${filename} from wide to long format...`);
            console.log(`  - Worksheet: ${worksheet.name}`);
            console.log(`  - Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

            // Transform wide format to long format
            const { movements, balances } = this.transformWideToLong(worksheet, period);

            // Validate transformation results
            if (!movements || movements.length === 0) {
                console.warn(`No movements found in ${filename}. This may indicate a data issue.`);
            }

            // Convert arrays to Arquero tables
            const movementsTable = aq.from(movements);
            let balancesTable = aq.from(balances);

            // Calculate cumulative profit BEFORE renaming the column
            const cumulativeProfit = this.calculateCumulativeProfit(balancesTable);

            // Normalize balances table to use 'movement_amount' column name for consistency
            // This allows the same statement generation logic to work with both movements and balances
            if (balancesTable.numRows() > 0 && balancesTable.columnNames().includes('balance_amount')) {
                balancesTable = balancesTable.rename({ balance_amount: 'movement_amount' });
            }

            console.log(`Trial Balance ${period} loaded successfully:`);
            console.log(`  - Movements: ${movementsTable.numRows()} rows`);
            console.log(`  - Balances: ${balancesTable.numRows()} rows`);

            // Validate required columns exist
            const requiredColumns = ['account_code', 'statement_type', 'code1', 'name1'];
            const movementColumns = movementsTable.columnNames();
            const missingColumns = requiredColumns.filter(col => !movementColumns.includes(col));

            if (missingColumns.length > 0) {
                throw new Error(`Transformed data missing required columns: ${missingColumns.join(', ')}`);
            }

            return {
                movements: movementsTable,
                balances: balancesTable,
                metadata: {
                    rows: worksheet.rowCount,
                    columns: worksheet.columnCount,
                    cumulativeProfit: cumulativeProfit
                }
            };

        } catch (error) {
            console.error(`Error loading trial balance for ${period}:`, error);

            // Enhance error message for common issues
            if (error.message.includes('getFileHandle')) {
                throw new Error(`File not found: ${filename}. Please ensure the file exists in the selected directory.`);
            } else if (error.message.includes('xlsx.load')) {
                throw new Error(`Failed to parse ${filename}. Please ensure it is a valid Excel file (.xlsx).`);
            } else {
                throw error;
            }
        }
    }
}
