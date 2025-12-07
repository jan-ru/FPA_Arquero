/**
 * Global Test Setup
 * 
 * This file is imported at the beginning of test runs to set up
 * the test environment with necessary mocks and configurations.
 */

import { setupBrowserEnvironment } from './browser-mocks.ts';

// Setup browser environment globally for all tests
setupBrowserEnvironment();

// Log that setup is complete
console.log('✓ Test environment initialized with browser mocks');
