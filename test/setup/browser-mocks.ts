/**
 * Browser Environment Mocks for Deno Tests
 * 
 * This file provides mock implementations of browser globals
 * needed for testing browser-dependent code in Deno.
 */

/**
 * Mock loglevel library
 */
export const mockLog = {
    trace: (...args: unknown[]) => {},
    debug: (...args: unknown[]) => {},
    info: (...args: unknown[]) => {},
    warn: (...args: unknown[]) => {},
    error: (...args: unknown[]) => {},
    setLevel: (level: string) => {},
    setDefaultLevel: (level: string) => {},
    getLevel: () => 1,
    enableAll: () => {},
    disableAll: () => {},
};

/**
 * Mock Logger class
 */
export const mockLogger = {
    trace: (...args: unknown[]) => {},
    debug: (...args: unknown[]) => {},
    info: (...args: unknown[]) => {},
    warn: (...args: unknown[]) => {},
    error: (...args: unknown[]) => {},
    setLevel: (level: string) => {},
    getLevel: () => 'warn',
};

/**
 * Mock DOM document
 */
export const mockDocument = {
    querySelector: (selector: string) => ({ style: {} }),
    getElementById: (id: string) => null,
    createElement: (tag: string) => ({
        style: {},
        classList: {
            add: (...classes: string[]) => {},
            remove: (...classes: string[]) => {},
        },
    }),
};

/**
 * Mock window object
 */
export const mockWindow = {
    location: {
        hostname: 'localhost',
        href: 'http://localhost:8000',
    },
    localStorage: {
        getItem: (key: string) => null,
        setItem: (key: string, value: string) => {},
        removeItem: (key: string) => {},
        clear: () => {},
    },
    log: mockLog,
};

/**
 * Mock ag-Grid
 */
export const mockAgGrid = {
    createGrid: (element: any, options: any) => ({
        destroy: () => {},
        setGridOption: (key: string, value: any) => {},
        getDisplayedRowCount: () => 0,
        forEachNode: (callback: (node: any) => void) => {},
        expandAll: () => {},
        collapseAll: () => {},
    }),
};

/**
 * Setup browser environment for tests
 * Call this at the beginning of test files that need browser globals
 */
export function setupBrowserEnvironment() {
    // @ts-ignore - Adding browser globals to globalThis
    globalThis.log = mockLog;
    // @ts-ignore
    globalThis.Logger = mockLogger;
    // @ts-ignore
    globalThis.document = mockDocument;
    // @ts-ignore
    globalThis.window = mockWindow;
    // @ts-ignore
    globalThis.agGrid = mockAgGrid;
}

/**
 * Cleanup browser environment after tests
 * Call this after tests complete
 */
export function cleanupBrowserEnvironment() {
    // @ts-ignore
    delete globalThis.log;
    // @ts-ignore
    delete globalThis.Logger;
    // @ts-ignore
    delete globalThis.document;
    // @ts-ignore
    delete globalThis.window;
    // @ts-ignore
    delete globalThis.agGrid;
}

/**
 * Create a test-specific document mock with custom behavior
 */
export function createMockDocument(overrides: Partial<typeof mockDocument> = {}) {
    return {
        ...mockDocument,
        ...overrides,
    };
}

/**
 * Create a test-specific window mock with custom behavior
 */
export function createMockWindow(overrides: Partial<typeof mockWindow> = {}) {
    return {
        ...mockWindow,
        ...overrides,
    };
}
