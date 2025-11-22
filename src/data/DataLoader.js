/**
 * DataLoader - Handles Excel file loading and transformation
 * Loads trial balance data and transforms from wide to long format
 *
 * Dependencies: ExcelJS (global from CDN), aq/Arquero (global from CDN)
 */

import { MONTH_MAP, EXCEL_COLUMNS, STATEMENT_TYPES, VALIDATION_CONFIG } from '../constants.js';

export default class DataLoader {
    constructor() {
        this.inputDirHandle = null;
        this.outputDirHandle = null;
        this.config = null; // Will be set via setConfig()
    }

    // Set configuration
    setConfig(config) {
        this.config = config;
    }

    // Request access to input directory
    async selectInputDirectory() {
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
            console.error('Error selecting input directory:', error);
            throw new Error('Failed to select input directory');
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
    validateColumns(data, requiredColumns) {
        if (!data || data.length === 0) {
            throw new Error('File is empty or invalid');
        }

        const firstRow = data[0];
        const actualColumns = Object.keys(firstRow);
        const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`File missing required columns: ${missingColumns.join(', ')}`);
        }

        return true;
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
        for (const [monthName, periodNum] of Object.entries(MONTH_MAP)) {
            if (lowerCol.includes(monthName) && lowerCol.includes(year)) {
                return {
                    period: periodNum,
                    year: parseInt(year),
                    type: 'movement'
                };
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
            const statementType = row.getCell(EXCEL_COLUMNS.STATEMENT_TYPE).value;
            const level1Code = row.getCell(EXCEL_COLUMNS.CODE1).value;
            const level1Label = row.getCell(EXCEL_COLUMNS.NAME1).value;
            const level2Code = row.getCell(EXCEL_COLUMNS.CODE2).value;
            const level2Label = row.getCell(EXCEL_COLUMNS.NAME2).value;
            const level3Code = row.getCell(EXCEL_COLUMNS.CODE3).value;
            const level3Label = row.getCell(EXCEL_COLUMNS.NAME3).value;

            // Determine statement type
            let stmtType = STATEMENT_TYPES.INCOME_STATEMENT; // Default
            if (statementType === 'Balans') {
                stmtType = STATEMENT_TYPES.BALANCE_SHEET;
            } else if (statementType === 'Winst & verlies') {
                stmtType = STATEMENT_TYPES.INCOME_STATEMENT;
            }

            // Determine Code0 and Name0 based on code1
            let code0 = '';
            let name0 = '';
            const level1CodeNum = parseInt(level1Code);

            if ([0, 10, 20].includes(level1CodeNum)) {
                code0 = 'A';
                name0 = 'vaste activa';
            } else if ([30, 40, 50].includes(level1CodeNum)) {
                code0 = 'A';
                name0 = 'vlottende activa';
            } else if (level1CodeNum === 60) {
                code0 = 'L';
                name0 = 'eigen vermogen';
            } else if ([65, 70].includes(level1CodeNum)) {
                code0 = 'L';
                name0 = 'lange termijn schulden';
            } else if ([80, 90].includes(level1CodeNum)) {
                code0 = 'L';
                name0 = 'korte termijn schulden';
            }

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
        if (!this.config) {
            throw new Error('Configuration not loaded. Call setConfig() first.');
        }

        const filename = period === '2024'
            ? this.config.inputFiles.trialBalance2024
            : this.config.inputFiles.trialBalance2025;

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
            const balancesTable = aq.from(balances);

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
                balances: balancesTable
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
