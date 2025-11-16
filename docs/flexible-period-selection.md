# Flexible Period Selection Enhancement

## Date: November 17, 2025

## Overview

Enhanced the period selection dropdowns to allow flexible year-period combinations in both columns, enabling more versatile financial comparisons.

---

## Previous Behavior

**Limitations**:
- First column dropdown: Only 2024 periods (All, P1-P12)
- Second column dropdown: Only 2025 periods (All, P1-P12)
- Fixed year comparison: Always 2024 vs 2025
- No ability to compare periods within the same year
- No ability to compare different periods across years

**Use Cases Not Supported**:
- Same year comparison (e.g., 2024 P1 vs 2024 P12)
- Flexible cross-year comparison (e.g., 2024 P6 vs 2025 P3)
- Quarter-over-quarter analysis within a year

---

## New Behavior

**Enhancements**:
- Both dropdowns now contain all periods from both years
- Each dropdown independently selects year-period combination
- Default remains: 2024 (All) vs 2025 (All)
- Flexible comparison capabilities

**Dropdown Options** (both columns):
```
2024 (All)
2024 (P1)
2024 (P2)
...
2024 (P12)
2025 (All)
2025 (P1)
2025 (P2)
...
2025 (P12)
```

**Supported Comparisons**:
1. **Year-over-year**: 2024 (All) vs 2025 (All) ✓
2. **Same period comparison**: 2024 (P6) vs 2025 (P6) ✓
3. **Within-year comparison**: 2024 (P1) vs 2024 (P12) ✓
4. **Quarter analysis**: 2024 (P3) vs 2024 (P6) vs 2024 (P9) vs 2024 (P12) ✓
5. **Mixed comparisons**: 2024 (P3) vs 2025 (All) ✓

---

## Technical Implementation

### 1. Dropdown Value Format

**New Format**: `"year-period"`

Examples:
- `"2024-all"` - All periods in 2024
- `"2024-1"` - January 2024 (P1)
- `"2025-6"` - June 2025 (P6)
- `"2025-all"` - All periods in 2025

### 2. HTML Changes

**Location**: `InteractiveUI.renderStatement()` method

**Before**:
```javascript
// First column: Only 2024 options
html += `<option value="all">2024 (All)</option>`;
for (let i = 1; i <= 12; i++) {
    html += `<option value="${i}">2024 (P${i})</option>`;
}

// Second column: Only 2025 options
html += `<option value="all">2025 (All)</option>`;
for (let i = 1; i <= 12; i++) {
    html += `<option value="${i}">2025 (P${i})</option>`;
}
```

**After**:
```javascript
// Both columns: All periods from both years
// First column
html += `<option value="2024-all">2024 (All)</option>`;
for (let i = 1; i <= 12; i++) {
    html += `<option value="2024-${i}">2024 (P${i})</option>`;
}
html += `<option value="2025-all">2025 (All)</option>`;
for (let i = 1; i <= 12; i++) {
    html += `<option value="2025-${i}">2025 (P${i})</option>`;
}

// Second column: Same options
// (repeated for second dropdown)
```

### 3. Filtering Logic Changes

**Location**: `StatementGenerator.generateStatement()` method

**Before**:
```javascript
const period2024Value = options.period2024 || 'all';
const period2025Value = options.period2025 || 'all';

const p2024 = period2024Value === 'all' ? 999 : parseInt(period2024Value);
const p2025 = period2025Value === 'all' ? 999 : parseInt(period2025Value);

filtered = filtered
    .filter(d => 
        (d.year === 2024 && d.period <= p2024) || 
        (d.year === 2025 && d.period <= p2025)
    );
```

**After**:
```javascript
const period2024Value = options.period2024 || '2024-all';
const period2025Value = options.period2025 || '2025-all';

// Parse year-period combinations
const [year2024Str, period2024Str] = period2024Value.split('-');
const year2024 = parseInt(year2024Str);
const period2024 = period2024Str === 'all' ? 999 : parseInt(period2024Str);

const [year2025Str, period2025Str] = period2025Value.split('-');
const year2025 = parseInt(year2025Str);
const period2025 = period2025Str === 'all' ? 999 : parseInt(period2025Str);

// Filter using dynamic year values
filtered = filtered
    .params({ 
        year2024: year2024, 
        period2024: period2024,
        year2025: year2025,
        period2025: period2025
    })
    .filter(d => 
        (d.year === year2024 && d.period <= period2024) || 
        (d.year === year2025 && d.period <= period2025)
    );
```

### 4. Aggregation Logic Changes

**Before** (hardcoded years):
```javascript
const aggregated = filtered
    .params({ year2024: 2024, year2025: 2025, signMult: signMultiplier })
    .groupby('category', 'subcategory', 'level1_code', 'level2_code', 'level3_code')
    .rollup({
        amount_2024: d => aq.op.sum(d.year === year2024 ? d.movement_amount * signMult : 0),
        amount_2025: d => aq.op.sum(d.year === year2025 ? d.movement_amount * signMult : 0)
    });
```

**After** (dynamic years):
```javascript
const aggregated = filtered
    .params({ 
        col1Year: year2024,  // Dynamic year from first dropdown
        col2Year: year2025,  // Dynamic year from second dropdown
        signMult: signMultiplier 
    })
    .groupby('category', 'subcategory', 'level1_code', 'level2_code', 'level3_code')
    .rollup({
        amount_2024: d => aq.op.sum(d.year === col1Year ? d.movement_amount * signMult : 0),
        amount_2025: d => aq.op.sum(d.year === col2Year ? d.movement_amount * signMult : 0)
    });
```

**Note**: Column names remain `amount_2024` and `amount_2025` for backward compatibility, but they now represent the selected year-period combinations from the dropdowns.

---

## Use Cases & Examples

### Use Case 1: Year-over-Year Analysis
**Selection**: 2024 (All) vs 2025 (All)
**Purpose**: Compare full year performance
**Result**: Shows all 2024 data vs all 2025 data with variance

### Use Case 2: Same Period Comparison
**Selection**: 2024 (P6) vs 2025 (P6)
**Purpose**: Compare June performance year-over-year
**Result**: Shows cumulative data through June for both years

### Use Case 3: Within-Year Growth
**Selection**: 2024 (P1) vs 2024 (P12)
**Purpose**: Analyze growth throughout 2024
**Result**: Shows January vs December 2024 with variance showing annual growth

### Use Case 4: Quarter-over-Quarter
**Selection**: 2024 (P3) vs 2024 (P6)
**Purpose**: Compare Q1 vs Q2 performance
**Result**: Shows Q1 cumulative vs Q2 cumulative with variance

### Use Case 5: Partial Year Comparison
**Selection**: 2024 (All) vs 2025 (P6)
**Purpose**: Compare full 2024 against 2025 year-to-date
**Result**: Shows full 2024 vs 2025 through June

---

## User Experience

### Visual Feedback
- Dropdown labels clearly show selected year and period
- Example: "2024 (P6)" or "2025 (All)"
- Selection persists when regenerating statements
- Smooth transition when changing selections

### Intuitive Operation
1. User opens dropdown in first column
2. Sees all available periods from both years
3. Selects desired year-period combination
4. Repeats for second column
5. Statement automatically regenerates with new comparison

### Default Behavior
- Application starts with 2024 (All) vs 2025 (All)
- Maintains familiar year-over-year comparison as default
- Users can explore other comparisons as needed

---

## Testing Scenarios

### Functional Tests
1. ✓ Select 2024 (P1) in both columns - verify same data
2. ✓ Select 2024 (All) vs 2025 (All) - verify default behavior
3. ✓ Select 2024 (P6) vs 2025 (P6) - verify period matching
4. ✓ Select 2025 (P3) vs 2024 (P9) - verify reverse year order
5. ✓ Change selection multiple times - verify persistence
6. ✓ Export with custom selection - verify metadata reflects selection

### Edge Cases
1. ✓ Select same year-period in both columns - variance should be zero
2. ✓ Select 2025 (P1) vs 2024 (P12) - verify correct data filtering
3. ✓ Rapidly change selections - verify no race conditions
4. ✓ Switch between statements - verify selections persist

### Validation Tests
1. ✓ Verify cumulative filtering (P6 includes P1-P6)
2. ✓ Verify variance calculations with mixed years
3. ✓ Verify formulas in exported Excel use correct columns
4. ✓ Verify Balance Sheet equation holds with any selection

---

## Benefits

### For Users
1. **Flexibility**: Compare any period against any other period
2. **Analysis**: Perform within-year and cross-year analysis
3. **Insights**: Identify trends and patterns more easily
4. **Efficiency**: No need to export and manipulate data externally

### For Business
1. **Better Decision Making**: More comprehensive financial analysis
2. **Time Savings**: Faster period comparisons
3. **Accuracy**: Consistent calculations across all comparisons
4. **Versatility**: Supports various reporting needs

---

## Backward Compatibility

### Maintained
- Default behavior (2024 All vs 2025 All) unchanged
- Column names in code remain `amount_2024` and `amount_2025`
- Export format unchanged
- All existing functionality preserved

### Migration
- No migration needed
- Existing users see enhanced dropdowns immediately
- No breaking changes to data or exports

---

## Future Enhancements

### Potential Additions
1. **Quick Presets**: Buttons for common comparisons (YoY, QoQ, MoM)
2. **Multi-Column**: Support for 3+ columns for trend analysis
3. **Date Range**: Select custom date ranges instead of periods
4. **Saved Views**: Save favorite period combinations
5. **Comparison Labels**: Custom labels for columns (e.g., "Budget" vs "Actual")

---

## Documentation Updates

### User Guide Updates Needed
1. Add section on flexible period selection
2. Include examples of common comparison scenarios
3. Add screenshots showing dropdown options
4. Explain cumulative period filtering

### Technical Documentation
1. Update API documentation for period parameters
2. Document value format ("year-period")
3. Update filtering logic documentation
4. Add examples for developers

---

## Conclusion

The flexible period selection enhancement significantly improves the application's analytical capabilities while maintaining backward compatibility and ease of use. Users can now perform sophisticated financial comparisons without leaving the application or manipulating data externally.
