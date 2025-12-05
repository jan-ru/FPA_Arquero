# RollupSpecBuilder Refactoring

**Date**: 2025-11-26
**Status**: ✅ COMPLETED
**Test Results**: 266 tests passing (added 25 new tests)

## Overview

Extracted a reusable `RollupSpecBuilder` class to consolidate duplicated rollup specification logic throughout the codebase. This reduces code duplication by approximately 50 lines and makes the rollup specification pattern more consistent and maintainable.

## Problem Statement

Before the refactoring, rollup specification creation was duplicated in multiple places:

1. **Normal Mode Aggregation** (lines 425-434 in StatementGenerator.js):
   - Hardcoded rollup spec for 2-year comparison
   - Uses `params()` with inline rollup object

2. **LTM Mode Aggregation** (lines 388-403 in StatementGenerator.js):
   - 28 lines of code building rollup spec with loop
   - String-based expressions for each month
   - Conditional LTM total column for Income Statement

3. **Normal Mode Category Totals** (lines 84-98 in StatementGenerator.js):
   - Rollup spec for aggregating by category (name1)
   - Variance calculations inline

4. **LTM Mode Category Totals** (lines 100-123 in StatementGenerator.js):
   - 24 lines building dynamic rollup spec
   - Similar loop pattern as #2

**Total Duplication**: ~80 lines of similar rollup spec creation logic

## Solution

Created `src/utils/RollupSpecBuilder.js` with:

### Class API

```javascript
class RollupSpecBuilder {
    // Fluent builder methods
    addSum(columnName, sourceColumn)
    addConditionalSum(columnName, year, period, sourceColumn, multiplier)
    addSumWithMultiplier(columnName, sourceColumn, multiplier)
    addCustom(columnName, expression)
    reset()
    build()

    // Static factory methods
    static buildNormalMode(year1, year2, signMultiplier)
    static buildLTMMode(ranges, signMultiplier, statementType)
    static buildLTMCategoryTotals(ranges, statementType)
    static buildCategoryTotals()
}
```

### Convenience Functions

```javascript
buildNormalModeSpec(year1, year2, signMultiplier)
buildLTMModeSpec(ranges, signMultiplier, statementType)
buildLTMCategoryTotalsSpec(ranges, statementType)
buildCategoryTotalsSpec()
```

## Implementation Changes

### File Created

**`src/utils/RollupSpecBuilder.js`** (233 lines)
- Complete builder class with fluent API
- Static factory methods for common patterns
- Convenience functions for one-liner usage
- JSDoc documentation throughout

### Files Modified

#### 1. `src/statements/StatementGenerator.js`

**Import Addition** (lines 29-34):
```javascript
import {
    buildNormalModeSpec,
    buildLTMModeSpec,
    buildLTMCategoryTotalsSpec,
    buildCategoryTotalsSpec
} from '../utils/RollupSpecBuilder.js';
```

**Before** (lines 84-98, 15 lines):
```javascript
calculateCategoryTotals(combined) {
    return combined
        .groupby('name1')
        .rollup({
            amount_2024: d => aq.op.sum(d.amount_2024),
            amount_2025: d => aq.op.sum(d.amount_2025),
            variance_amount: d => aq.op.sum(d.variance_amount),
            variance_percent: d => {
                const total1 = aq.op.sum(d.amount_2024);
                const total2 = aq.op.sum(d.amount_2025);
                return VarianceCalculator.calculatePercent(total2, total1);
            }
        });
}
```

**After** (lines 89-96, 8 lines):
```javascript
calculateCategoryTotals(combined) {
    const rollupSpec = buildCategoryTotalsSpec();
    return combined
        .groupby('name1')
        .rollup(rollupSpec);
}
```

**Savings**: 7 lines, better readability

---

**Before** (lines 100-123, 24 lines):
```javascript
calculateLTMCategoryTotals(combined, ltmInfo, statementType) {
    const rollupSpec = {};
    let monthIndex = 1;

    for (const range of ltmInfo.ranges) {
        for (let period = range.startPeriod; period <= range.endPeriod; period++) {
            const columnName = `month_${monthIndex}`;
            rollupSpec[columnName] = `d => op.sum(d.${columnName})`;
            monthIndex++;
        }
    }

    if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
        rollupSpec['ltm_total'] = 'd => op.sum(d.ltm_total)';
    }

    return combined
        .groupby('name1')
        .rollup(rollupSpec);
}
```

**After** (lines 99-105, 7 lines):
```javascript
calculateLTMCategoryTotals(combined, ltmInfo, statementType) {
    const rollupSpec = buildLTMCategoryTotalsSpec(ltmInfo.ranges, statementType);
    return combined
        .groupby('name1')
        .rollup(rollupSpec);
}
```

**Savings**: 17 lines, clearer intent

---

**Before** (lines 370-417, 48 lines):
```javascript
if (isLTMMode && ltmInfo && ltmInfo.ranges) {
    // LTM Mode: Create 12 dynamic period columns
    Logger.debug('LTM Mode: Creating 12 period columns', { ranges: ltmInfo.ranges });

    const rollupSpec = {};
    let monthIndex = 1;

    for (const range of ltmInfo.ranges) {
        for (let period = range.startPeriod; period <= range.endPeriod; period++) {
            const columnName = `month_${monthIndex}`;
            const year = range.year;
            const periodNum = period;

            rollupSpec[columnName] = `(d) => op.sum(d.year === ${year} && d.period === ${periodNum} ? d.movement_amount * ${signMultiplier} : 0)`;

            monthIndex++;
        }
    }

    if (statementType === STATEMENT_TYPES.INCOME_STATEMENT) {
        rollupSpec['ltm_total'] = `(d) => op.sum(d.movement_amount * ${signMultiplier})`;
    }

    Logger.debug('LTM Rollup spec:', Object.keys(rollupSpec));

    aggregated = filtered
        .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
        .rollup(rollupSpec);

} else {
    // Normal Mode: Create 2 year columns
    aggregated = filtered
        .params({
            col1Year: yearInt1,
            col2Year: yearInt2,
            signMult: signMultiplier
        })
        .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
        .rollup({
            amount_2024: d => aq.op.sum(d.year === col1Year ? d.movement_amount * signMult : 0),
            amount_2025: d => aq.op.sum(d.year === col2Year ? d.movement_amount * signMult : 0)
        });
}
```

**After** (lines 370-387, 18 lines):
```javascript
if (isLTMMode && ltmInfo && ltmInfo.ranges) {
    // LTM Mode: Create 12 dynamic period columns using RollupSpecBuilder
    Logger.debug('LTM Mode: Creating 12 period columns', { ranges: ltmInfo.ranges });

    const rollupSpec = buildLTMModeSpec(ltmInfo.ranges, signMultiplier, statementType);
    Logger.debug('LTM Rollup spec:', Object.keys(rollupSpec));

    aggregated = filtered
        .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
        .rollup(rollupSpec);

} else {
    // Normal Mode: Create 2 year columns using RollupSpecBuilder
    const rollupSpec = buildNormalModeSpec(yearInt1, yearInt2, signMultiplier);

    aggregated = filtered
        .groupby('name1', 'name2', 'name3', 'code0', 'name0', 'code1', 'code2', 'code3', 'account_code', 'account_description')
        .rollup(rollupSpec);
}
```

**Savings**: 30 lines, symmetrical code structure

### Test File Created

**`test/unit/utils/RollupSpecBuilder.test.ts`** (293 lines, 25 tests)

Test coverage includes:
- ✅ Constructor and builder methods
- ✅ Fluent API chaining
- ✅ Static factory methods
- ✅ Convenience functions
- ✅ Normal mode specs (2 columns)
- ✅ LTM mode specs (12 columns)
- ✅ LTM Income Statement (13th column)
- ✅ Category totals specs
- ✅ Sign multiplier handling
- ✅ Complex real-world scenarios
- ✅ Column naming consistency

**All 25 tests passing** ✅

## Benefits

### 1. Code Reduction
- **Before**: ~80 lines of duplicated rollup spec logic
- **After**: ~30 lines using RollupSpecBuilder
- **Net Savings**: ~50 lines in StatementGenerator.js

### 2. Maintainability
- ✅ Single source of truth for rollup spec patterns
- ✅ Changes to rollup logic only need to be made once
- ✅ Easier to add new rollup patterns in the future
- ✅ Clear separation of concerns

### 3. Readability
- ✅ Intent is clearer with named factory methods
- ✅ Symmetrical code structure (LTM vs Normal)
- ✅ Less cognitive load when reading statement generation code
- ✅ Self-documenting code

### 4. Testability
- ✅ Rollup spec creation can be tested independently
- ✅ 25 comprehensive unit tests
- ✅ Coverage for edge cases (sign flips, year boundaries, etc.)
- ✅ All 266 existing tests still pass

### 5. Flexibility
- ✅ Fluent builder API for custom specs
- ✅ Factory methods for common patterns
- ✅ Easy to extend with new patterns
- ✅ Supports both string-based and function-based rollup specs

## Code Quality Improvements

### DRY (Don't Repeat Yourself)
- **Before**: Rollup spec logic duplicated 4 times
- **After**: Single reusable class

### Single Responsibility Principle
- RollupSpecBuilder has one job: create rollup specifications
- StatementGenerator focuses on statement generation logic

### Open/Closed Principle
- Easy to extend with new rollup patterns
- Existing code doesn't need modification

### Consistency
- All rollup specs now follow same pattern
- Column naming consistent across modes
- Sign multiplier handling consistent

## Performance Impact

**None** - The refactoring is purely structural:
- Same number of operations
- Same Arquero rollup calls
- No additional overhead
- Just reorganized into helper functions

## Migration Notes

### Breaking Changes
**None** - This is a pure refactoring:
- All existing tests pass (266/266)
- No API changes to public interfaces
- No changes to data structures
- Backward compatible

### Usage Examples

**Before**:
```javascript
const rollupSpec = {};
let monthIndex = 1;
for (const range of ltmInfo.ranges) {
    for (let period = range.startPeriod; period <= range.endPeriod; period++) {
        const columnName = `month_${monthIndex}`;
        rollupSpec[columnName] = `(d) => op.sum(d.year === ${range.year} && d.period === ${period} ? d.movement_amount * ${signMultiplier} : 0)`;
        monthIndex++;
    }
}
```

**After**:
```javascript
const rollupSpec = buildLTMModeSpec(ltmInfo.ranges, signMultiplier, statementType);
```

## Future Enhancements

### Potential Extensions
1. **Cash Flow Rollup Specs**: Add factory methods for cash flow statement patterns
2. **Custom Aggregation Functions**: Support max, min, avg, etc.
3. **Conditional Formatting Specs**: Build color/style rules alongside data specs
4. **Export Format Specs**: Use same pattern for Excel export column definitions
5. **Builder Validation**: Add validation for invalid rollup specs

### Pattern Reuse
The RollupSpecBuilder pattern could be applied to:
- Column definition builders
- Filter specification builders
- Sort specification builders
- Export configuration builders

## Test Results

```
✅ All 266 tests passing (100% pass rate)

Test Suite Breakdown:
- LTM Integration: 8/8 ✅
- Constants: 9/9 ✅
- DataLoader: 16/16 ✅
- DataStore: 17/17 ✅
- SpecialRowsFactory: 18/18 ✅
- StatementGenerator: 20/20 ✅
- ColumnDefBuilder: 15/15 ✅
- RollupSpecBuilder: 25/25 ✅ NEW
- Other Utilities: 138/138 ✅

Total: 266 tests, 0 failures
```

## Conclusion

The RollupSpecBuilder refactoring successfully:
- ✅ Reduces code duplication by ~50 lines
- ✅ Improves code maintainability and readability
- ✅ Adds 25 comprehensive unit tests
- ✅ Maintains 100% backward compatibility
- ✅ Follows SOLID principles
- ✅ Zero performance impact
- ✅ All 266 tests passing

This refactoring makes the codebase more maintainable and sets a good pattern for future similar extractions (UIState class, column strategy pattern, etc.).

---

**Status**: ✅ COMPLETE
**Next Steps**: Consider applying similar patterns to other areas identified in `code-improvement-recommendations.md`
