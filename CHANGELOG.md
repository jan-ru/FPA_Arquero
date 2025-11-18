# Changelog

All notable changes to the Financial Statement Generator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
