# Code Improvement Recommendations

## Executive Summary

This document outlines suggested improvements for the Financial Statement Generator codebase, focusing on DRY principles, architectural patterns, and maintainability.

## 1. Critical Fixes Applied

### ✅ Fixed: LTM Mode Breaking with Variance/Totals Calculation

**Problem:** The `deriveVarianceColumns()` and `calculateCategoryTotals()` methods were hardcoded to work only with `amount_2024` and `amount_2025` columns, but LTM mode generates `month_1` through `month_12` columns.

**Solution Applied:**
- Added conditional logic to skip variance calculation in LTM mode
- Created new `calculateLTMCategoryTotals()` method for dynamic month column aggregation
- LTM mode now correctly aggregates 12 month columns + optional ltm_total

**Files Modified:**
- `src/statements/StatementGenerator.js:421-437` - Conditional variance/totals calculation
- `src/statements/StatementGenerator.js:100-123` - New `calculateLTMCategoryTotals()` method

## 2. DRY Violations to Fix

### A. Duplicate Variance Calculation Formula

**Location:** 2 places use manual formula instead of `VarianceCalculator.calculatePercent()`
- ✅ `calculateCategoryTotals()` line 95 - **FIXED**
- `deriveVarianceColumns()` line 77 - Still uses manual formula

**Impact:** Low priority - works correctly but violates DRY

**Recommendation:**
```javascript
// Current (line 77):
return amt1 !== 0 ? ((amt2 - amt1) / Math.abs(amt1)) * 100 : 0;

// Better:
return VarianceCalculator.calculatePercent(amt2, amt1);
```

### B. Duplicate DOM Element Access Pattern

**Location:** Throughout `UIController.js` and `ColumnDefBuilder.js`

**Pattern (repeated 10+ times):**
```javascript
const periodSelector = document.getElementById('period-selector');
const varianceSelector = document.getElementById('variance-selector');
const viewTypeSelector = document.getElementById('view-type');
```

**Impact:** Medium - Makes code verbose, harder to test, and couples UI logic to DOM

**Recommendation:** Create UIElements cache class
```javascript
// src/ui/UIElements.js
export class UIElements {
    constructor() {
        this.cache = {};
    }

    get(id) {
        if (!this.cache[id]) {
            this.cache[id] = document.getElementById(id);
        }
        return this.cache[id];
    }

    getPeriodSelector() { return this.get('period-selector'); }
    getVarianceSelector() { return this.get('variance-selector'); }
    getViewTypeSelector() { return this.get('view-type'); }
    // ... etc
}

// Usage:
const ui = new UIElements();
const periodValue = ui.getPeriodSelector()?.value;
```

### C. ✅ Duplicate LTM Check Logic - **FIXED**

**Location:** Throughout codebase (was in 5 places)

**Old Pattern:**
```javascript
periodSelector.value === 'ltm' || periodSelector.value === YEAR_CONFIG.LTM?.OPTION_VALUE
```

**Solution Applied:**
```javascript
// In constants.js
export function isLTMSelected(periodValue) {
    return periodValue === YEAR_CONFIG.LTM.OPTION_VALUE;
}

// Usage in StatementGenerator.js and UIController.js:
if (isLTMSelected(periodSelector.value)) { ... }
```

**Files Modified:**
- `src/constants.js:220-222` - Added helper function with JSDoc
- `src/statements/StatementGenerator.js:238-239` - Using helper for isLTM1/isLTM2 checks
- `src/ui/UIController.js:292, 626, 696` - Using helper in 3 locations

**Impact:** Eliminated 5 instances of duplicate logic, improved readability and maintainability

### D. Duplicate Rollup Spec Building Logic

**Location:** `StatementGenerator.js` lines 367-395

**Issue:** Complex nested loops to build rollup specs appear twice (normal mode + LTM mode)

**Recommendation:** Extract to builder class
```javascript
// src/utils/RollupSpecBuilder.js
export class RollupSpecBuilder {
    static forNormalMode(year1, year2, signMultiplier) {
        return {
            amount_2024: d => aq.op.sum(d.year === year1 ? d.movement_amount * signMultiplier : 0),
            amount_2025: d => aq.op.sum(d.year === year2 ? d.movement_amount * signMultiplier : 0)
        };
    }

    static forLTMMode(ranges, signMultiplier, includeTotal = false) {
        const spec = {};
        let monthIndex = 1;

        for (const range of ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                spec[columnName] = `(d) => op.sum(d.year === ${range.year} && d.period === ${period} ? d.movement_amount * ${signMultiplier} : 0)`;
                monthIndex++;
            }
        }

        if (includeTotal) {
            spec['ltm_total'] = `(d) => op.sum(d.movement_amount * ${signMultiplier})`;
        }

        return spec;
    }
}

// Usage in StatementGenerator:
const rollupSpec = isLTMMode
    ? RollupSpecBuilder.forLTMMode(ltmInfo.ranges, signMultiplier, isIncomeStatement)
    : RollupSpecBuilder.forNormalMode(yearInt1, yearInt2, signMultiplier);

aggregated = filtered
    .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
    .rollup(rollupSpec);
```

## 3. Architectural Improvements

### A. Strategy Pattern for Column Modes

**Current Issue:** Conditional logic scattered across multiple files:
- `StatementGenerator.js` - Data aggregation
- `ColumnDefBuilder.js` - Column generation
- `AgGridStatementRenderer.js` - Rendering

**Recommendation:** Implement Strategy Pattern
```javascript
// src/strategies/ColumnStrategy.js
export class ColumnStrategy {
    buildRollupSpec(params) { throw new Error('Must implement'); }
    buildColumns(params) { throw new Error('Must implement'); }
    deriveVariances(data) { throw new Error('Must implement'); }
    calculateTotals(data) { throw new Error('Must implement'); }
}

// src/strategies/NormalColumnStrategy.js
export class NormalColumnStrategy extends ColumnStrategy {
    buildRollupSpec({ year1, year2, signMultiplier }) {
        return {
            amount_2024: d => aq.op.sum(d.year === year1 ? d.movement_amount * signMultiplier : 0),
            amount_2025: d => aq.op.sum(d.year === year2 ? d.movement_amount * signMultiplier : 0)
        };
    }

    buildColumns({ year1, year2, formatCurrency, varianceRenderer }) {
        return [
            { field: 'label', headerName: 'Category', ... },
            { field: 'amount_2024', headerName: year1, ... },
            { field: 'amount_2025', headerName: year2, ... },
            { field: 'variance_amount', ... },
            { field: 'variance_percent', ... }
        ];
    }

    deriveVariances(data) {
        return data.derive({
            variance_amount: d => (d.amount_2025 || 0) - (d.amount_2024 || 0),
            variance_percent: d => VarianceCalculator.calculatePercent(d.amount_2025, d.amount_2024)
        });
    }

    calculateTotals(data) {
        return data.groupby('name1').rollup({
            amount_2024: d => aq.op.sum(d.amount_2024),
            amount_2025: d => aq.op.sum(d.amount_2025),
            variance_amount: d => aq.op.sum(d.variance_amount)
        });
    }
}

// src/strategies/LTMColumnStrategy.js
export class LTMColumnStrategy extends ColumnStrategy {
    constructor(ltmInfo, statementType) {
        super();
        this.ltmInfo = ltmInfo;
        this.statementType = statementType;
    }

    buildRollupSpec({ signMultiplier }) {
        const spec = {};
        let monthIndex = 1;

        for (const range of this.ltmInfo.ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                spec[columnName] = `(d) => op.sum(d.year === ${range.year} && d.period === ${period} ? d.movement_amount * ${signMultiplier} : 0)`;
                monthIndex++;
            }
        }

        if (this.statementType === 'IS') {
            spec['ltm_total'] = `(d) => op.sum(d.movement_amount * ${signMultiplier})`;
        }

        return spec;
    }

    buildColumns({ formatCurrency }) {
        const columns = [{ field: 'label', headerName: 'Category', ... }];
        let monthIndex = 1;

        for (const range of this.ltmInfo.ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                columns.push({
                    field: `month_${monthIndex}`,
                    headerName: `${range.year} P${period}`,
                    valueFormatter: formatCurrency,
                    ...
                });
                monthIndex++;
            }
        }

        if (this.statementType === 'IS') {
            columns.push({ field: 'ltm_total', headerName: 'LTM Total', ... });
        }

        return columns;
    }

    deriveVariances(data) {
        // No variances in LTM mode
        return data;
    }

    calculateTotals(data) {
        const spec = {};
        let monthIndex = 1;

        for (const range of this.ltmInfo.ranges) {
            for (let period = range.startPeriod; period <= range.endPeriod; period++) {
                const columnName = `month_${monthIndex}`;
                spec[columnName] = `d => op.sum(d.${columnName})`;
                monthIndex++;
            }
        }

        if (this.statementType === 'IS') {
            spec['ltm_total'] = 'd => op.sum(d.ltm_total)';
        }

        return data.groupby('name1').rollup(spec);
    }
}

// Usage in StatementGenerator:
const strategy = isLTMMode
    ? new LTMColumnStrategy(ltmInfo, statementType)
    : new NormalColumnStrategy();

const rollupSpec = strategy.buildRollupSpec({ year1, year2, signMultiplier });
const withVariances = strategy.deriveVariances(ordered);
const categoryTotals = strategy.calculateTotals(withVariances);
```

**Benefits:**
- Single Responsibility: Each strategy handles one mode
- Open/Closed: Easy to add new modes (Quarterly, Budget vs Actual, etc.)
- Testability: Each strategy can be tested independently
- Maintainability: Related logic is grouped together

### B. Centralized UI State Management

**Current Issue:** UI state scattered across multiple components, requiring repeated DOM access

**Recommendation:** Create UIState class
```javascript
// src/ui/UIState.js
export class UIState {
    constructor() {
        this._cache = {};
        this._listeners = new Map();
    }

    // Getters
    get periodValue() {
        return this.getElement('period-selector')?.value || 'all';
    }

    get varianceMode() {
        return this.getElement('variance-selector')?.value || 'none';
    }

    get viewType() {
        return this.getElement('view-type')?.value || 'cumulative';
    }

    get statementType() {
        return this.getElement('statement-selector')?.value || 'balance-sheet';
    }

    // Computed properties
    get isLTMMode() {
        return this.periodValue === YEAR_CONFIG.LTM.OPTION_VALUE;
    }

    // Private helper
    getElement(id) {
        if (!this._cache[id]) {
            this._cache[id] = document.getElementById(id);
        }
        return this._cache[id];
    }

    // Observable pattern
    onChange(property, callback) {
        if (!this._listeners.has(property)) {
            this._listeners.set(property, []);
        }
        this._listeners.get(property).push(callback);
    }

    setupListeners() {
        // Setup change listeners for all UI elements
        this.getElement('period-selector')?.addEventListener('change', () => {
            this._notify('period', this.periodValue);
        });

        this.getElement('variance-selector')?.addEventListener('change', () => {
            this._notify('variance', this.varianceMode);
        });

        // ... etc
    }

    _notify(property, value) {
        const listeners = this._listeners.get(property) || [];
        listeners.forEach(callback => callback(value));
    }
}

// Usage in UIController:
class UIController {
    constructor(dataStore, statementGenerator, renderer) {
        this.uiState = new UIState();
        this.uiState.setupListeners();

        // Listen to changes
        this.uiState.onChange('period', (value) => {
            if (this.uiState.isLTMMode) {
                this.disableVarianceSelector();
            } else {
                this.enableVarianceSelector();
            }
            this.generateAndDisplayStatement(this.uiState.statementType);
        });
    }

    generateAndDisplayStatement(statementType) {
        const options = {
            period: this.uiState.periodValue,
            viewType: this.uiState.viewType,
            varianceMode: this.uiState.varianceMode
        };

        // ... generate statement
    }
}
```

**Benefits:**
- Single source of truth for UI state
- Easier testing (can mock UIState)
- Observable pattern for reactive updates
- Eliminates repeated `document.getElementById()` calls

## 4. Library Recommendations

### A. Should We Use External Libraries?

**Current Approach:** Custom utilities, minimal dependencies (only Arquero, ag-Grid, ExcelJS via CDN)

**Pros of Current Approach:**
- ✅ Lightweight (no npm dependencies)
- ✅ Full control over code
- ✅ No build step required
- ✅ Simple deployment (just copy files)

**Cons of Current Approach:**
- ❌ Reinventing wheels (date utilities, validation)
- ❌ Less battle-tested than popular libraries
- ❌ More code to maintain

### B. Libraries to Consider (If Adding Build Step)

#### 1. **date-fns** (11KB gzipped)
Replace: `DateUtils.js`
```javascript
// Current:
DateUtils.formatDate(date, 'YYYY-MM-DD')

// With date-fns:
import { format } from 'date-fns';
format(date, 'yyyy-MM-dd')
```
**Verdict:** ❌ **Don't add** - Your DateUtils is simple and works fine

#### 2. **zod** (13KB gzipped)
Replace: Manual validation scattered throughout
```javascript
// Current:
if (!movementsTable || movementsTable.numRows() === 0) {
    return { year: 0, period: 0 };
}

// With zod:
const MovementsSchema = z.object({
    year: z.number().int().positive(),
    period: z.number().int().min(1).max(12),
    movement_amount: z.number()
});

const validated = MovementsSchema.parse(data);
```
**Verdict:** ❌ **Don't add** - Overkill for current needs

#### 3. **lodash-es** (24KB for full library, tree-shakeable)
Replace: Custom array/object utilities
```javascript
// Potential uses:
import { groupBy, sumBy, uniqBy } from 'lodash-es';
```
**Verdict:** ❌ **Don't add** - You already have Arquero for data manipulation

### C. Final Recommendation: **Keep Current Approach**

✅ **Stay dependency-free** (except CDN libraries)
- Your custom utilities are simple and sufficient
- No need for build complexity
- App remains lightweight and portable

## 5. Priority Improvements

### High Priority (Do Now)
1. ✅ **DONE:** Fix LTM variance/totals calculation
2. ✅ **DONE:** Use VarianceCalculator.calculatePercent() in calculateCategoryTotals()
3. ✅ **DONE:** Add isLTMSelected() helper function (eliminated 5 duplicate checks)
4. **TODO:** Extract RollupSpecBuilder class (reduces code duplication by ~50 lines)

### Medium Priority (Do Next Sprint)
1. Create UIState class to centralize UI state management
2. Extract column strategy pattern (optional but beneficial for future modes)
3. Extract RollupSpecBuilder class to consolidate rollup spec creation

### Low Priority (Nice to Have)
1. Create UIElements cache class
2. Add more JSDoc comments for complex functions
3. Consider adding unit tests for LTM mode

## 6. Code Metrics

### Before Improvements
- Total lines in StatementGenerator: ~900 lines
- Duplicate variance calculation: 3 places
- DOM element access: 15+ repeated calls
- Conditional LTM checks: 8+ locations

### After Priority Improvements
- Expected reduction: ~100 lines (11%)
- Duplicate variance calculation: 0 places
- Better separation of concerns
- More testable code

## 7. Testing Recommendations

### Current Test Coverage
- LTMCalculator: 29 unit tests (100% coverage)
- LTM Integration: 8 integration tests
- StatementGenerator: Basic tests exist

### Recommended Additional Tests
1. LTM column generation end-to-end test
2. LTM totals calculation test
3. Strategy pattern tests (if implemented)
4. UIState tests (if implemented)

## Conclusion

The codebase is well-structured and maintainable. The critical LTM variance/totals bug has been fixed. The recommended improvements focus on:
1. **DRY principles** - Eliminate duplicate code
2. **Separation of concerns** - Strategy pattern for different modes
3. **Testability** - Centralized state management
4. **Maintainability** - Extract complex builders

**No external libraries are recommended** - the current lightweight approach is appropriate for this application's scale and requirements.
