#!/usr/bin/env -S deno test --allow-read
/**
 * Unit Tests: DataLoader
 * Tests for Excel file loading and transformation logic
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import DataLoader from "../../../src/data/DataLoader.js";
import { MONTH_MAP } from "../../../src/constants.js";

Deno.test("DataLoader - constructor initializes correctly", () => {
    const loader = new DataLoader();

    assertEquals(loader.inputDirHandle, null);
    assertEquals(loader.outputDirHandle, null);
    assertEquals(loader.config, null);
});

Deno.test("DataLoader.setConfig - sets configuration", () => {
    const loader = new DataLoader();
    const config = {
        inputFiles: {
            trialBalance2024: '2024_test.xlsx',
            trialBalance2025: '2025_test.xlsx'
        }
    };

    loader.setConfig(config as any);
    assertEquals(loader.config, config);
});

Deno.test("DataLoader.validateColumns - validates required columns present", () => {
    const loader = new DataLoader();
    const data = [
        {
            account_code: '1000',
            account_description: 'Cash',
            statement_type: 'BS',
            code1: '10',
            name1: 'Assets'
        }
    ];
    const requiredColumns = ['account_code', 'statement_type', 'code1', 'name1'];

    const result = loader.validateColumns(data, requiredColumns);
    assertEquals(result, true);
});

Deno.test("DataLoader.validateColumns - throws when columns missing", () => {
    const loader = new DataLoader();
    const data = [
        {
            account_code: '1000',
            account_description: 'Cash'
            // Missing statement_type, code1, name1
        }
    ];
    const requiredColumns = ['account_code', 'statement_type', 'code1', 'name1'];

    let errorThrown = false;
    try {
        loader.validateColumns(data, requiredColumns);
    } catch (error: any) {
        errorThrown = true;
        assertEquals(error.message.includes('missing required columns'), true);
        assertEquals(error.message.includes('statement_type'), true);
    }
    assertEquals(errorThrown, true);
});

Deno.test("DataLoader.validateColumns - throws when data is empty", () => {
    const loader = new DataLoader();
    const data: any[] = [];
    const requiredColumns = ['account_code'];

    let errorThrown = false;
    try {
        loader.validateColumns(data, requiredColumns);
    } catch (error: any) {
        errorThrown = true;
        assertEquals(error.message, 'File is empty or invalid');
    }
    assertEquals(errorThrown, true);
});

Deno.test("DataLoader.mapMonthToPeriod - maps Dutch months to periods", () => {
    const loader = new DataLoader();

    // Test all months
    assertEquals(loader.mapMonthToPeriod('januari2024', '2024'), {
        period: 1,
        year: 2024,
        type: 'movement'
    });

    assertEquals(loader.mapMonthToPeriod('december2025', '2025'), {
        period: 12,
        year: 2025,
        type: 'movement'
    });

    assertEquals(loader.mapMonthToPeriod('mei2024', '2024'), {
        period: 5,
        year: 2024,
        type: 'movement'
    });
});

Deno.test("DataLoader.mapMonthToPeriod - maps voorafgaande to period 12", () => {
    const loader = new DataLoader();

    const result = loader.mapMonthToPeriod('voorafgaandejournaalposten2024', '2024');
    assertEquals(result, {
        period: 12,
        year: 2024,
        type: 'movement'
    });

    const result2 = loader.mapMonthToPeriod('voorafgaande2025', '2025');
    assertEquals(result2, {
        period: 12,
        year: 2025,
        type: 'movement'
    });
});

Deno.test("DataLoader.mapMonthToPeriod - maps saldo to balance type", () => {
    const loader = new DataLoader();

    const result = loader.mapMonthToPeriod('Saldo2024', '2024');
    assertEquals(result, {
        period: 12,
        year: 2024,
        type: 'balance'
    });

    const result2 = loader.mapMonthToPeriod('balance2025', '2025');
    assertEquals(result2, {
        period: 12,
        year: 2025,
        type: 'balance'
    });
});

Deno.test("DataLoader.mapMonthToPeriod - returns null for non-matching columns", () => {
    const loader = new DataLoader();

    assertEquals(loader.mapMonthToPeriod('random_column', '2024'), null);
    assertEquals(loader.mapMonthToPeriod('account_code', '2024'), null);
    assertEquals(loader.mapMonthToPeriod('', '2024'), null);
});

Deno.test("DataLoader.mapMonthToPeriod - case insensitive matching", () => {
    const loader = new DataLoader();

    assertEquals(loader.mapMonthToPeriod('JANUARI2024', '2024')?.period, 1);
    assertEquals(loader.mapMonthToPeriod('JaNuArI2024', '2024')?.period, 1);
    assertEquals(loader.mapMonthToPeriod('SALDO2024', '2024')?.type, 'balance');
});

Deno.test("DataLoader.identifyPeriodColumns - identifies movement and balance columns", () => {
    const loader = new DataLoader();
    const headers = [
        'account_code',
        'account_description',
        'januari2024',
        'februari2024',
        'maart2024',
        'Saldo2024'
    ];

    const result = loader.identifyPeriodColumns(headers, '2024');

    assertEquals(result.movements.length, 3);
    assertEquals(result.movements[0].period, 1);
    assertEquals(result.movements[0].columnName, 'januari2024');
    assertExists(result.movements[0].columnIndex); // Just verify it has an index
    assertEquals(result.movements[1].period, 2);
    assertEquals(result.movements[2].period, 3);

    assertEquals(result.balances.length, 1);
    assertEquals(result.balances[0].period, 12);
    assertEquals(result.balances[0].columnName, 'Saldo2024');
    assertExists(result.balances[0].columnIndex); // Just verify it has an index
});

Deno.test("DataLoader.identifyPeriodColumns - filters by year", () => {
    const loader = new DataLoader();
    const headers = [
        'januari2024',
        'februari2024',
        'januari2025',
        'februari2025'
    ];

    const result2024 = loader.identifyPeriodColumns(headers, '2024');
    assertEquals(result2024.movements.length, 2);
    assertEquals(result2024.movements[0].columnName, 'januari2024');
    assertEquals(result2024.movements[1].columnName, 'februari2024');

    const result2025 = loader.identifyPeriodColumns(headers, '2025');
    assertEquals(result2025.movements.length, 2);
    assertEquals(result2025.movements[0].columnName, 'januari2025');
    assertEquals(result2025.movements[1].columnName, 'februari2025');
});

Deno.test("DataLoader.identifyPeriodColumns - handles empty headers", () => {
    const loader = new DataLoader();
    const headers: string[] = [];

    const result = loader.identifyPeriodColumns(headers, '2024');
    assertEquals(result.movements.length, 0);
    assertEquals(result.balances.length, 0);
});

Deno.test("DataLoader.identifyPeriodColumns - skips null/undefined headers", () => {
    const loader = new DataLoader();
    const headers = [
        'januari2024',
        null,
        'februari2024',
        undefined,
        'maart2024'
    ];

    const result = loader.identifyPeriodColumns(headers as any, '2024');
    assertEquals(result.movements.length, 3); // Only non-null headers counted
});

Deno.test("DataLoader - MONTH_MAP is used correctly", () => {
    const loader = new DataLoader();

    // Verify all months in MONTH_MAP can be mapped
    Object.entries(MONTH_MAP).forEach(([monthName, periodNum]) => {
        const result = loader.mapMonthToPeriod(`${monthName}2024`, '2024');
        assertExists(result);
        assertEquals(result?.period, periodNum);
        assertEquals(result?.type, 'movement');
    });
});

Deno.test("DataLoader - all Dutch months are supported", () => {
    const loader = new DataLoader();
    const dutchMonths = [
        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];

    dutchMonths.forEach((month, index) => {
        const result = loader.mapMonthToPeriod(`${month}2024`, '2024');
        assertExists(result);
        assertEquals(result?.period, index + 1);
    });
});
