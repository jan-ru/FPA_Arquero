# Browser Environment Testing Guide

## Overview

Some tests require browser globals (like `window`, `document`, `log`) that aren't available in Deno by default. This guide explains how to run these tests successfully.

## Solutions

### Solution 1: Use Browser Mocks (Recommended)

We've created mock implementations of browser globals that allow tests to run in Deno.

#### Setup

Import the browser mocks at the beginning of your test file:

```typescript
import { setupBrowserEnvironment, cleanupBrowserEnvironment } from '../setup/browser-mocks.ts';

// Setup before tests
setupBrowserEnvironment();

// Your tests here
Deno.test("my test", () => {
    // Test code that uses browser globals
});

// Cleanup after tests (optional)
cleanupBrowserEnvironment();
```

#### Global Setup

For automatic setup across all tests, use the test setup file:

```bash
# Run tests with global setup
deno test --allow-read --allow-env --import-map=test/import-map.json test/unit/
```

Or add to deno.json:

```json
{
  "test": {
    "include": ["test/"],
    "exclude": ["test/setup/"],
    "files": {
      "include": ["test/setup/test-setup.ts"]
    }
  }
}
```

### Solution 2: Skip Type Checking

If you just want to verify functional behavior without fixing type issues:

```bash
deno test --allow-read --allow-env --no-check test/unit/
```

This skips TypeScript type checking but still runs the tests functionally.

### Solution 3: Use Puppeteer/Playwright

For true browser testing with real browser APIs - runs your code in an actual Chrome/Chromium browser.

**Best for:** E2E tests, integration tests, visual testing

**Quick example:**

```typescript
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

Deno.test("browser test", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    
    // Run tests in real browser
    const result = await page.evaluate(() => {
        // Your test code here - runs IN THE BROWSER
        return document.title;
    });
    
    await browser.close();
    assertEquals(result, 'Financial Statement Generator');
});
```

**See [PUPPETEER_GUIDE.md](./PUPPETEER_GUIDE.md) for complete documentation.**

## Available Mocks

### mockLog
Mock implementation of loglevel library:
- `trace()`, `debug()`, `info()`, `warn()`, `error()`
- `setLevel()`, `setDefaultLevel()`, `getLevel()`

### mockLogger
Mock Logger class:
- All logging methods
- `setLevel()`, `getLevel()`

### mockDocument
Mock DOM document:
- `querySelector()`, `getElementById()`
- `createElement()`

### mockWindow
Mock window object:
- `location` (hostname, href)
- `localStorage` (getItem, setItem, etc.)
- `log` (loglevel instance)

### mockAgGrid
Mock ag-Grid library:
- `createGrid()` returns mock grid API
- Grid methods: `destroy()`, `setGridOption()`, etc.

## Custom Mocks

Create custom mocks for specific test needs:

```typescript
import { createMockDocument, createMockWindow } from '../setup/browser-mocks.ts';

// Custom document with specific behavior
const customDoc = createMockDocument({
    getElementById: (id: string) => {
        if (id === 'my-element') {
            return { textContent: 'test value' };
        }
        return null;
    }
});

globalThis.document = customDoc;
```

## Fixing Logger Issues

The Logger.ts has been updated to gracefully handle missing browser globals:

```typescript
// Before (would crash in Deno)
log.setDefaultLevel(defaultLevel);

// After (safe in Deno)
if (log && log.setDefaultLevel) {
    log.setDefaultLevel(defaultLevel);
}
```

All Logger methods now check if `log` exists before calling it.

## Test Patterns

### Pattern 1: Per-Test Setup

```typescript
Deno.test("my test", () => {
    // Setup
    globalThis.document = {
        getElementById: (id) => null
    };
    
    // Test
    const result = myFunction();
    assertEquals(result, expected);
    
    // Cleanup
    delete globalThis.document;
});
```

### Pattern 2: Suite Setup

```typescript
import { setupBrowserEnvironment, cleanupBrowserEnvironment } from '../setup/browser-mocks.ts';

// Setup once for all tests
setupBrowserEnvironment();

Deno.test("test 1", () => {
    // Uses global mocks
});

Deno.test("test 2", () => {
    // Uses global mocks
});

// Optional cleanup
cleanupBrowserEnvironment();
```

### Pattern 3: Conditional Testing

```typescript
const hasBrowserEnv = typeof window !== 'undefined';

Deno.test({
    name: "browser-only test",
    ignore: !hasBrowserEnv,
    fn: () => {
        // Only runs in browser environment
    }
});
```

## Running Tests

### All Tests (with mocks)
```bash
deno test --allow-read --allow-env test/unit/
```

### Skip Type Checking
```bash
deno test --allow-read --allow-env --no-check test/unit/
```

### Specific Test File
```bash
deno test --allow-read --allow-env test/unit/utils/Logger.test.ts
```

### With Coverage
```bash
deno test --allow-read --allow-env --coverage=coverage test/unit/
deno coverage coverage
```

### Watch Mode
```bash
deno test --allow-read --allow-env --watch test/unit/
```

## Troubleshooting

### "Cannot read properties of undefined"

**Problem:** Code tries to access browser global that doesn't exist

**Solution:** 
1. Import and call `setupBrowserEnvironment()` before tests
2. Or add safety checks in source code (like Logger.ts)

### "log is not defined"

**Problem:** loglevel library not available

**Solution:**
```typescript
import { setupBrowserEnvironment } from '../setup/browser-mocks.ts';
setupBrowserEnvironment();
```

### "window is not defined"

**Problem:** Code expects browser window object

**Solution:**
```typescript
globalThis.window = {
    location: { hostname: 'localhost' },
    // ... other properties
};
```

### Tests pass with --no-check but fail with type checking

**Problem:** TypeScript type errors (not runtime errors)

**Solution:**
1. Fix type definitions in source code
2. Add type assertions in tests
3. Use `--no-check` for functional testing
4. Add `// @ts-ignore` comments for known issues

## Best Practices

1. **Use Mocks for Unit Tests**: Fast and reliable
2. **Use Real Browser for E2E Tests**: Puppeteer/Playwright
3. **Setup Once**: Use global setup for test suites
4. **Cleanup After**: Remove global mocks after tests
5. **Document Dependencies**: Note which tests need browser env
6. **Graceful Degradation**: Source code should handle missing globals

## Example: Complete Test File

```typescript
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { setupBrowserEnvironment, cleanupBrowserEnvironment } from '../setup/browser-mocks.ts';
import MyComponent from '../../src/ui/MyComponent.ts';

// Setup browser environment
setupBrowserEnvironment();

Deno.test("MyComponent - renders correctly", () => {
    const component = new MyComponent();
    const result = component.render();
    assertEquals(result, expected);
});

Deno.test("MyComponent - handles events", () => {
    const component = new MyComponent();
    component.handleClick();
    assertEquals(component.state, 'clicked');
});

// Cleanup (optional, but good practice)
cleanupBrowserEnvironment();
```

## Summary

To run browser-dependent tests in Deno:

1. ✅ **Use browser mocks** (test/setup/browser-mocks.ts)
2. ✅ **Import setup function** at test start
3. ✅ **Run with standard flags** (--allow-read --allow-env)
4. ✅ **Source code has safety checks** (Logger.ts updated)

All tests should now pass without requiring a real browser!
