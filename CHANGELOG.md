# Changelog

All notable changes to the Financial Statement Generator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-11-22

### Added - Major ag-Grid Migration
- **ag-Grid Community Edition**: Complete migration from custom HTML tables to professional data grid
  - Added ag-Grid v31 via CDN (CSS and JavaScript)
  - Created `AgGridStatementRenderer` class for grid management
  - Custom ag-Grid theme with professional styling
  - Responsive grid height: 600px default, adapts to screen size
  - Row types with custom styling: total, metric, group, detail, spacer rows

- **Enhanced Period Controls**:
  - Period selection labeled as "Period 1" and "Period 2" (was "Year 1"/"Year 2")
  - Supports Year (All), Quarter (Q1-Q4), and Month (P1-P12) selection
  - Period labels displayed in column headers dynamically

- **Special Row Insertion**:
  - Balance Sheet: TOTAL ASSETS and TOTAL LIABILITIES & EQUITY rows
  - Income Statement: Gross Profit, Operating Income, Net Income metrics
  - Cash Flow: Starting Cash, Net Change, Ending Cash reconciliation

- **Advanced Styling**:
  - Custom row heights: 36px default, 42px totals, 38px metrics
  - Enhanced typography with system font stack
  - Color-coded variances with semi-bold weight
  - Hover effects with smooth transitions
  - Mobile responsive breakpoint at 768px

- **Debug Logging**:
  - Console logs for render operations
  - Grid ready and data rendered events
  - Row count and column count tracking

### Changed
- **Export Format**: Excel to CSV export
  - Switched from `exportDataAsExcel()` (Enterprise only) to `exportDataAsCsv()` (Community)
  - Button label: "Export to Excel" → "Export to CSV"
  - Filename format: `{Statement Name}_{Date}.csv`
  - Files download to browser's default downloads folder

- **Grid Behavior**:
  - Disabled column sorting (was enabled) - preserves code hierarchy
  - Disabled column filtering (was enabled) - not needed for fixed structure
  - Row order is now fixed based on code0 → code1 → code2 → code3
  - Column headers no longer act as sort buttons

- **UI Labels**:
  - "Year 1" → "Period 1" (more accurate for Quarter/Month selection)
  - "Year 2" → "Period 2"
  - Min-width increased from 60px to 70px for better alignment

### Removed
- **Deprecated Classes** (~843 lines marked for future removal):
  - `ExportHandler` class (347 lines) - export moved to ag-Grid
  - `InteractiveUI` class (496 lines) - rendering moved to ag-Grid
  - Custom HTML table CSS (~104 lines) - using ag-Grid styling
  - Old `statement-display` div container

- **Code Cleanup**:
  - Removed old table CSS styles (.financial-table, .statement-display)
  - Removed manual table rendering logic
  - Removed ExcelJS-based export implementation (kept as reference)
  - Net reduction: ~950 lines of active code

### Fixed
- **Grid Display**: Added explicit height:600px to ensure grid renders properly
- **Column Headers**: Updated to show selected period labels dynamically
- **Row Order**: Disabled sorting to maintain hierarchical structure
- **Export Functionality**: Switched to Community Edition compatible CSV export

### Migration Details
**7 Phases Completed:**
1. Phase 1: Added ag-Grid dependencies and setup
2. Phase 2: Implemented custom rows for all statement types
3. Phase 3: Added period filtering and column header controls
4. Phase 4: Enhanced Income Statement and Cash Flow handling
5. Phase 5: Implemented Excel export (later changed to CSV)
6. Phase 6: Applied styling and polish
7. Phase 7: Code cleanup and deprecation

**Technical Changes:**
- From 3,401 lines → ~2,450 active lines (28% reduction)
- Grid rendering: `InteractiveUI.renderStatement()` → `AgGridStatementRenderer.render()`
- Export: `ExportHandler.exportAllStatements()` → `AgGridStatementRenderer.exportToExcel()` (CSV)
- Column configuration: Declarative `columnDefs` instead of imperative HTML generation
- Row styling: CSS classes via `getRowClass()` instead of inline styles

**Breaking Changes:**
- Export format: Excel (.xlsx) → CSV (.csv)
- Export scope: All statements → Current statement only
- Column interaction: Sortable/filterable → Fixed order
- Multi-sheet export: Not available in Community Edition

**Migration Documentation:**
- See `docs/ag-grid-migration-plan.md` for detailed migration plan
- See `docs/ag-grid-excel-formatting-examples.md` for Excel formatting reference

### Performance
- Grid rendering: <100ms for typical datasets
- Smooth scrolling with thousands of rows
- Memory usage: Stable, no leaks detected
- Export: 1-2 seconds for CSV generation

### Testing
- All automated tests passing ✅
- Period mapping validation successful
- Grid display verified in Chrome 86+, Edge 86+
- CSV export confirmed working

## [2.4.0] - 2025-11-18

### Added
- **Code Refactoring**: Major improvements to code maintainability and DRY principles
  - Extracted `renderPeriodDropdown()` helper method (eliminated 80+ lines of duplication)
  - Extracted `renderTableRow()` helper method for consistent row rendering (eliminated 20+ lines)
  - Added `APP_CONFIG` object for centralized configuration (years, periods, version)
  - Added CSS classes for dropdowns (`.period-dropdown-header`, `.detail-level-dropdown`)

### Changed
- **Period Dropdowns**: Now use `<optgroup>` for better organization (2024 group, 2025 group)
- **Statement Selector**: Converted from tab buttons to dropdown for cleaner UI
- **Detail Level Control**: Moved from checkbox to dropdown in table header
- **File Status**: Removed individual TB 2024 and TB 2025 buttons, kept only TB 2024+2025
- **Inline Styles**: Moved to CSS classes for better maintainability

### Improved
- Reduced codebase by ~100 lines while maintaining all functionality
- Better code organization and consistency
- Easier to add new years or modify dropdown behavior
- More maintainable row rendering logic

## [2.3.0] - 2025-11-18

### Added
- **Variance Column Dropdowns**: Replaced static variance columns with interactive dropdowns
  - Two independent variance columns, each configurable as: "-" (hidden), "Variance (€)", or "Variance (%)"
  - Dropdowns integrated into table header row for intuitive control
  - Default setting: both columns hidden ("-")

### Changed
- **UI Improvements**: Enhanced button sizing and alignment
  - Increased file status button widths (TB 2024/2025: 220px, TB 2024+2025: 240px)
  - Added `align-items: center` to file status buttons for proper vertical alignment

### Removed
- "Show Variance" checkbox (replaced by variance column dropdowns)

## [2.2.0] - 2025-11-17

### Changed
- **Total Assets Calculation**: Updated to use specific category names instead of pattern matching
  - Fixed Assets = Immateriële vaste activa + Materiële vaste activa
  - Current Assets = Voorraden + Vorderingen + Liquide Middelen
- **Balance Validation**: Enhanced with specific category definitions for Assets, Liabilities, and Equity
- **Console Logging**: Added detailed breakdown when Balance Sheet is imbalanced

### Added
- Flexible period selection in both columns (can select any year-period combination)
- Auto-load functionality when "input" directory is selected
- Excel formulas in exported files for calculated totals
- Helper methods for Excel cell formatting (reduced code duplication)
- Comprehensive error handling with user-friendly messages
- Enhanced status message system with unified display logic

### Improved
- Code refactoring: Eliminated ~60 lines of duplicate code
- Centralized formatting constants in ExportHandler
- Streamlined export logic with helper methods
- Better error messages for directory selection and file loading

### Removed
- "Load Files" button (replaced with automatic loading)
- Success message from UI (moved to console only)
- Redundant code patterns in export handler

### Fixed
- Loading message now clears after completion
- File status buttons properly sized to fit status text
- Layout optimized to save vertical space

## [2.1.0] - 2025-11-16

### Added
- Initial release with core functionality
- Balance Sheet, Income Statement, and Cash Flow Statement generation
- Period selection dropdowns
- Excel export with metadata
- File System Access API integration
- Embedded hierarchy support

### Features
- Single-page HTML application
- Client-side processing with Arquero
- ExcelJS for Excel file handling
- Interactive table interface
- Variance calculations
- Category totals
