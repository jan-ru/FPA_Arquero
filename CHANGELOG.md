# Changelog

All notable changes to the Financial Statement Generator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-11-16

### Added
- Support for DimAccounts.xlsx format (no transformation needed)
- Support for DimDates.xlsx format (no transformation needed)
- Trial balance transformation script (wide → long format)
- Automatic Dutch to English translation for categories (Activa→Assets, Passiva→Liabilities)
- Enhanced DataLoader to handle Excel formula cells
- Comprehensive transformation documentation (TRANSFORMATION_SUMMARY.md)
- Quick start guide (QUICK_START.md)
- Functional test suite for data validation
  - Account mapping validation test
  - Period mapping validation test
  - Test suite runner
- Testing documentation (TESTING_GUIDE.md, TEST_SUITE_SUMMARY.md)
- Organized test directory structure

### Changed
- DataLoader now reads DimAccounts.xlsx directly with column mapping
- DataLoader now reads DimDates.xlsx directly with year extraction
- Account code normalization to handle leading zeros
- Config.json updated to reference transformed trial balance files

### Fixed
- Excel formula cell handling in hierarchy loading
- Account code comparison between trial balance and DimAccounts

## [1.0.0] - 2024-11-16

### Added
- Initial release of Financial Statement Generator
- Browser-based single-page HTML application
- Balance Sheet generation with accounting equation verification
- Income Statement generation with key metrics (Gross Profit, Operating Income, Net Income)
- Cash Flow Statement generation with activity categorization
- Excel import functionality using ExcelJS
- Excel export functionality (single statement and all statements)
- Interactive table features:
  - Column sorting
  - Hover tooltips
  - Tab navigation between statements
- Data validation and error handling:
  - Unmapped account detection
  - Balance Sheet imbalance warnings
  - Missing period data handling
- Professional gradient UI with modern styling
- Arquero integration for data transformation
- File System Access API for directory selection
- Variance analysis (2024 vs 2025 comparison)
- Comprehensive documentation:
  - README.md
  - SAMPLE_DATA_FORMAT.md
  - TESTING_CHECKLIST.md
  - DATA_TRANSFORMATION_PROPOSAL.md

### Technical Details
- Single HTML file application (no build process)
- Vanilla JavaScript (no framework dependencies)
- ExcelJS for Excel I/O
- Arquero for data manipulation
- Browser compatibility: Chrome 86+, Edge 86+, Opera 72+

## [Unreleased]

### Planned
- Deno CLI version for command-line usage
- Drill-down capability to view underlying accounts
- Advanced filtering options
- Custom report templates
- Multi-year comparison (3+ periods)
- PDF export option
- Chart and graph visualizations
- Budget vs. actual analysis

---

## Version Numbering

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

## Links

- [Repository](https://github.com/yourusername/financial-statement-generator)
- [Documentation](./README.md)
- [Testing Guide](./test/docs/TESTING_GUIDE.md)
