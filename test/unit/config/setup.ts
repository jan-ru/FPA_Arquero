/**
 * Test setup for config tests
 * Mocks Logger to avoid loglevel dependency
 */

// Mock loglevel for tests
(globalThis as any).log = {
    setDefaultLevel: () => {},
    getLevel: () => 3,
    setLevel: () => {},
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

// Mock localStorage if not available
if (typeof localStorage === 'undefined') {
    (globalThis as any).localStorage = {
        data: {} as Record<string, string>,
        getItem(key: string) {
            return this.data[key] || null;
        },
        setItem(key: string, value: string) {
            this.data[key] = value;
        },
        removeItem(key: string) {
            delete this.data[key];
        },
        clear() {
            this.data = {};
        },
        get length() {
            return Object.keys(this.data).length;
        },
        key(index: number) {
            const keys = Object.keys(this.data);
            return keys[index] || null;
        },
    };
}

// Mock window for browser-specific code
if (typeof window === 'undefined') {
    (globalThis as any).window = {
        location: {
            hostname: 'localhost',
        },
        log: (globalThis as any).log,
    };
}
