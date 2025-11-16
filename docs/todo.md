# Financial Statement Generator - TODO

## Medium Priority Improvements

### 3. Code Duplication in Export Handler ⭐⭐
**Issue**: Repetitive code for formatting cells and rows in ExportHandler
**Motivation**: DRY principle - easier maintenance and consistency
**Implementation**:
- Create helper methods for common formatting operations:
  - `formatHeaderRow(row, headers)` - Format header rows with center alignment and styling
  - `formatMetricRow(row, label, values, isHighlighted)` - Format metric rows (Gross Profit, Operating Income, etc.)
  - `formatTotalRow(row, label, values)` - Format total rows with bold styling
  - `formatDetailRow(row, label, values)` - Format regular detail rows
- Consolidate number formatting logic into a single method
- Create a configuration object for cell styles

### 4. Magic Numbers & Constants ⭐⭐
**Issue**: Hard-coded values scattered throughout the code (column indices, colors, tolerance levels)
**Motivation**: Easier configuration and maintenance
**Implementation**:
```javascript
const EXPORT_CONFIG = {
    COLORS: {
        HEADER: 'FF007bff',
        METRIC_HIGHLIGHT: 'FFFFE599',
        WHITE: 'FFFFFFFF',
        CATEGORY_HEADER: 'FFE9ECEF'
    },
    NUMBER_FORMAT: '#,##0',
    BALANCE_TOLERANCE: 0.01,
    COLUMN_WIDTHS: {
        LINE_ITEM: 35,
        AMOUNT: 15
    },
    FONT_SIZES: {
        HEADER: 12,
        TITLE: 14,
        NORMAL: 11
    }
};
```
- Move all magic numbers to configuration constants
- Create separate config sections for UI, export, and validation
- Document each constant with comments

### 5. Statement Generation Performance ⭐⭐
**Issue**: Regenerating entire statement on every period dropdown change
**Motivation**: Better performance for large datasets
**Implementation**:
- Cache statement data and only refilter when period changes
- Implement debouncing for dropdown changes (300ms delay)
- Consider virtual scrolling for very large statements (>1000 rows)
- Add performance monitoring to identify bottlenecks
- Optimize Arquero operations by reducing intermediate table creation

### 6. Data Validation ⭐⭐
**Issue**: Limited validation of loaded data structure
**Motivation**: Prevent runtime errors from malformed data
**Implementation**:
```javascript
validateTrialBalanceStructure(data) {
    const requiredColumns = [
        'account_code', 
        'account_description',
        'statement_type', 
        'level1_code', 
        'level1_label',
        'level2_code',
        'level2_label',
        'level3_code',
        'level3_label'
    ];
    
    const missingColumns = requiredColumns.filter(col => 
        !data.columnNames().includes(col)
    );
    
    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Validate data types
    // Validate value ranges
    // Check for null/empty critical fields
}
```
- Add comprehensive data structure validation
- Validate column data types (numeric vs string)
- Check for required fields and null values
- Validate hierarchy consistency (level codes match labels)
- Add validation for period columns and date formats

### 9. Testing & Debugging ⭐⭐
**Issue**: No built-in debugging or testing utilities
**Motivation**: Easier troubleshooting and validation
**Implementation**:
- Add a debug mode toggle in UI (Ctrl+Shift+D)
- Create detailed logging for all operations:
  - File loading progress
  - Data transformation steps
  - Statement generation timing
  - Export operations
- Add sample data generators for testing:
  - Generate mock trial balance data
  - Create test scenarios (balanced/unbalanced, missing data, etc.)
- Add data export for debugging (JSON format)
- Create a diagnostics panel showing:
  - Loaded data statistics
  - Memory usage
  - Operation timing
  - Validation results

## Low Priority Improvements

### 7. Memory Management ⭐
**Issue**: No cleanup of large Arquero tables when switching views
**Motivation**: Prevent memory leaks in long-running sessions
**Implementation**:
- Add cleanup methods to DataStore:
  - `clearUnusedTables()` - Remove tables not needed for current view
  - `compactMemory()` - Trigger garbage collection hints
- Clear unused tables when loading new data
- Implement a cache size limit (e.g., max 100MB)
- Add memory usage monitoring
- Provide user feedback when memory usage is high
- Consider using IndexedDB for large datasets

### 8. Accessibility ⭐
**Issue**: Limited keyboard navigation and screen reader support
**Motivation**: Make the application accessible to all users
**Implementation**:
- Add ARIA labels to all interactive elements:
  - Dropdowns: `aria-label="Select period for 2024"`
  - Buttons: `aria-label="Export all statements to Excel"`
  - Tables: `role="table"`, `role="row"`, `role="cell"`
- Implement keyboard shortcuts:
  - Tab navigation through all controls
  - Enter to activate buttons
  - Arrow keys for dropdown navigation
  - Ctrl+E for export
  - Ctrl+1/2/3 for statement tabs
- Add focus indicators for all interactive elements
- Ensure sufficient color contrast (WCAG AA compliance)
- Add skip navigation links
- Test with screen readers (NVDA, JAWS)

### 10. Configuration Management ⭐
**Issue**: Config file loading happens once at startup
**Motivation**: Allow runtime configuration changes
**Implementation**:
- Add UI for changing file names without editing config.json:
  - Settings panel with input fields
  - Save/Load configuration buttons
  - Reset to defaults option
- Allow users to save/load different configurations:
  - Export config as JSON
  - Import config from file
  - Store multiple named configurations
- Add validation for config file structure:
  - Check required fields
  - Validate file paths
  - Verify directory structure
- Add configuration presets:
  - Default configuration
  - Custom configurations for different scenarios
- Persist user preferences in localStorage

## Future Enhancements

### Additional Features to Consider
- Multi-language support (Dutch, English)
- Custom report templates
- Scheduled exports
- Email integration for automated reports
- PDF export option
- Chart/graph visualizations
- Comparison across multiple years (2023, 2024, 2025)
- Budget vs Actual analysis
- Drill-down to transaction details
- Custom calculations and formulas
- Data import from other formats (CSV, JSON)
- Cloud storage integration
- Collaborative features (comments, annotations)

## Notes
- Prioritize improvements based on user feedback
- Consider performance impact of each enhancement
- Maintain backward compatibility with existing data files
- Document all changes in changelog
- Update user documentation as features are added
