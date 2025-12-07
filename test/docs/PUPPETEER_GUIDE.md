# Puppeteer Testing Guide

## Overview

Puppeteer allows you to run tests in a real Chrome/Chromium browser, giving you access to actual browser APIs instead of mocks.

## Installation

Puppeteer for Deno doesn't require npm installation - it downloads Chromium automatically on first use:

```bash
# Cache the Puppeteer module (downloads Chromium ~170MB)
deno cache https://deno.land/x/puppeteer@16.2.0/mod.ts
```

## Basic Example

### Simple Page Test

```typescript
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("Application loads in browser", async () => {
    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,  // Run without UI (faster)
    });
    
    // Create new page
    const page = await browser.newPage();
    
    // Navigate to your app
    await page.goto('http://localhost:8000');
    
    // Wait for page to load
    await page.waitForSelector('#app');
    
    // Get page title
    const title = await page.title();
    assertEquals(title, 'Financial Statement Generator');
    
    // Close browser
    await browser.close();
});
```

## Testing Your Application

### Test 1: Data Loading

```typescript
Deno.test("Can load data files", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    
    // Click "Select Directory" button
    // Note: File System Access API requires user interaction,
    // so we test the UI state instead
    
    const buttonExists = await page.$('#select-directory-btn');
    assertEquals(buttonExists !== null, true);
    
    await browser.close();
});
```

### Test 2: Statement Generation

```typescript
Deno.test("Statement generation works", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    
    // Execute code in browser context
    const result = await page.evaluate(() => {
        // This code runs IN THE BROWSER
        
        // Mock data loading (since we can't use File System API in tests)
        const mockData = [
            { code1: '500', name1: 'Revenue', movement_amount: 10000 }
        ];
        
        // Test statement generation
        const generator = new (window as any).StatementGenerator();
        const statement = generator.generateIncomeStatement({
            year: 2024,
            period: 'All'
        });
        
        return {
            hasRows: statement.rows.length > 0,
            rowCount: statement.rows.length
        };
    });
    
    assertEquals(result.hasRows, true);
    
    await browser.close();
});
```

### Test 3: UI Interactions

```typescript
Deno.test("Dropdown selections work", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    
    // Select statement type
    await page.select('#statement-type', 'income');
    
    // Get selected value
    const selectedValue = await page.$eval(
        '#statement-type',
        (el: any) => el.value
    );
    
    assertEquals(selectedValue, 'income');
    
    await browser.close();
});
```

### Test 4: ag-Grid Rendering

```typescript
Deno.test("ag-Grid displays data", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    
    // Wait for grid to initialize
    await page.waitForSelector('.ag-root-wrapper');
    
    // Check if grid exists
    const gridExists = await page.$('.ag-root-wrapper');
    assertEquals(gridExists !== null, true);
    
    // Get row count
    const rowCount = await page.$$eval(
        '.ag-row',
        (rows) => rows.length
    );
    
    console.log(`Grid has ${rowCount} rows`);
    
    await browser.close();
});
```

## Advanced Features

### Taking Screenshots

```typescript
Deno.test("Visual regression test", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#app');
    
    // Take screenshot
    await page.screenshot({
        path: 'test-results/screenshot.png',
        fullPage: true
    });
    
    await browser.close();
});
```

### Console Logging

```typescript
Deno.test("Capture browser console", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const logs: string[] = [];
    
    // Listen to console messages
    page.on('console', (msg) => {
        logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    await page.goto('http://localhost:8000');
    
    // Check for errors
    const errors = logs.filter(log => log.startsWith('error:'));
    assertEquals(errors.length, 0, 'No console errors');
    
    await browser.close();
});
```

### Network Interception

```typescript
Deno.test("Mock API responses", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Intercept requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        if (request.url().includes('/api/data')) {
            // Mock response
            request.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: 'mocked' })
            });
        } else {
            request.continue();
        }
    });
    
    await page.goto('http://localhost:8000');
    
    await browser.close();
});
```

### Performance Testing

```typescript
Deno.test("Page load performance", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Start timing
    const startTime = Date.now();
    
    await page.goto('http://localhost:8000', {
        waitUntil: 'networkidle2'  // Wait for network to be idle
    });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Page loaded in ${loadTime}ms`);
    
    // Assert performance
    assertEquals(loadTime < 3000, true, 'Page loads in under 3 seconds');
    
    await browser.close();
});
```

## Complete E2E Test Example

```typescript
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("E2E: Complete workflow", async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']  // Required in some environments
    });
    
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // 1. Load application
        console.log('Loading application...');
        await page.goto('http://localhost:8000', {
            waitUntil: 'networkidle2'
        });
        
        // 2. Verify page loaded
        const title = await page.title();
        assertEquals(title, 'Financial Statement Generator');
        
        // 3. Check UI elements exist
        console.log('Checking UI elements...');
        await page.waitForSelector('#statement-type');
        await page.waitForSelector('#report-definition');
        await page.waitForSelector('#grid-container');
        
        // 4. Select statement type
        console.log('Selecting statement type...');
        await page.select('#statement-type', 'income');
        
        // 5. Wait for any updates
        await page.waitForTimeout(500);
        
        // 6. Verify grid is visible
        const gridVisible = await page.$eval(
            '#grid-container',
            (el: any) => el.offsetHeight > 0
        );
        assertEquals(gridVisible, true);
        
        // 7. Take screenshot of final state
        await page.screenshot({
            path: 'test-results/e2e-complete.png'
        });
        
        console.log('✓ E2E test passed');
        
    } finally {
        await browser.close();
    }
});
```

## Running Puppeteer Tests

### Basic Run

```bash
# Make sure your dev server is running first!
deno task dev  # In one terminal

# Then run tests in another terminal
deno test --allow-all test/e2e/puppeteer.test.ts
```

### With Permissions

Puppeteer needs several permissions:

```bash
deno test \
  --allow-net \      # Network access
  --allow-read \     # Read files
  --allow-write \    # Write screenshots
  --allow-env \      # Environment variables
  --allow-run \      # Run browser process
  test/e2e/
```

### Headless vs Headed

```typescript
// Headless (faster, no UI)
const browser = await puppeteer.launch({ headless: true });

// Headed (see what's happening, slower)
const browser = await puppeteer.launch({ headless: false });

// Slow motion (for debugging)
const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100  // Slow down by 100ms per action
});
```

## Best Practices

### 1. Setup/Teardown Pattern

```typescript
let browser: any;
let page: any;

// Before all tests
async function setup() {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
}

// After all tests
async function teardown() {
    if (page) await page.close();
    if (browser) await browser.close();
}

Deno.test("test 1", async () => {
    await setup();
    try {
        // Test code
    } finally {
        await teardown();
    }
});
```

### 2. Wait for Elements

```typescript
// ❌ Bad: Race condition
const element = await page.$('#my-element');

// ✅ Good: Wait for element
await page.waitForSelector('#my-element');
const element = await page.$('#my-element');

// ✅ Better: Wait with timeout
await page.waitForSelector('#my-element', { timeout: 5000 });
```

### 3. Error Handling

```typescript
Deno.test("with error handling", async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:8000');
        
        // Test code that might fail
        await page.waitForSelector('#element', { timeout: 5000 });
        
    } catch (error) {
        // Take screenshot on failure
        await page.screenshot({ path: 'test-results/error.png' });
        throw error;
        
    } finally {
        // Always cleanup
        await browser.close();
    }
});
```

### 4. Reusable Helpers

```typescript
// helpers.ts
export async function createTestBrowser() {
    return await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
}

export async function navigateToApp(page: any) {
    await page.goto('http://localhost:8000', {
        waitUntil: 'networkidle2'
    });
    await page.waitForSelector('#app');
}

export async function selectStatement(page: any, type: string) {
    await page.select('#statement-type', type);
    await page.waitForTimeout(500);
}
```

## Comparison: Mocks vs Puppeteer

| Feature | Mocks (Option 1) | Puppeteer (Option 3) |
|---------|------------------|----------------------|
| Speed | ⚡ Very fast (~1ms) | 🐌 Slower (~1-5s) |
| Setup | Simple | Complex |
| Real Browser | ❌ No | ✅ Yes |
| DOM Testing | ❌ Limited | ✅ Full |
| Visual Testing | ❌ No | ✅ Yes |
| Network Testing | ❌ No | ✅ Yes |
| Resource Usage | 💚 Low | 🔴 High |
| CI/CD Friendly | ✅ Yes | ⚠️ Needs setup |
| Best For | Unit tests | E2E tests |

## When to Use Puppeteer

✅ **Use Puppeteer when:**
- Testing complete user workflows
- Verifying visual rendering
- Testing browser-specific behavior
- Need real DOM interactions
- Testing file uploads/downloads
- Performance testing
- Screenshot/PDF generation

❌ **Don't use Puppeteer when:**
- Writing unit tests (too slow)
- Testing pure logic (no DOM needed)
- Running in CI with limited resources
- Need fast feedback loop

## Troubleshooting

### Browser won't launch

```bash
# Install dependencies (Linux)
sudo apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1

# Or use bundled Chromium
const browser = await puppeteer.launch({
    executablePath: '/path/to/chrome'
});
```

### Timeout errors

```typescript
// Increase timeout
await page.waitForSelector('#element', { timeout: 10000 });

// Or set default timeout
page.setDefaultTimeout(10000);
```

### Server not running

```bash
# Start dev server first
deno task dev

# Then run tests
deno test --allow-all test/e2e/
```

## Summary

**Option 3 (Puppeteer)** gives you:
- Real browser environment
- Full DOM and browser API access
- Visual and interaction testing
- Perfect for E2E tests

But it's slower and more complex than mocks, so use it strategically for integration/E2E tests while keeping unit tests fast with mocks.
