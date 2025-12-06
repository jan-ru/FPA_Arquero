# Documentation

Complete documentation for the Financial Statement Generator.

## Quick Navigation

### For Users

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user guide
  - Getting started
  - Data import
  - Report generation
  - Customization
  - Export options
  - Troubleshooting

- **[REPORT_DEFINITIONS.md](REPORT_DEFINITIONS.md)** - Report definition reference
  - JSON schema structure
  - Layout item types
  - Expression syntax
  - Filter specifications
  - Formatting rules
  - Examples and templates

### For Developers

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
  - System overview
  - Technology stack
  - Module structure
  - Data flow
  - Core components
  - Testing architecture

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide
  - Development setup
  - Code standards
  - Testing guidelines
  - Contributing process
  - Release process

### For Migration

- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migration from hardcoded reports
  - Migration process
  - Backward compatibility
  - Feature comparison
  - Testing approach
  - Rollback procedure

## Documentation Structure

```
docs/
├── README.md                   # This file - documentation index
├── USER_GUIDE.md              # User guide (for end users)
├── REPORT_DEFINITIONS.md      # Report definition reference
├── MIGRATION_GUIDE.md         # Migration guide
├── ARCHITECTURE.md            # Technical architecture (for developers)
├── DEVELOPMENT.md             # Development guide (for contributors)
└── archive/                   # Historical documentation
    ├── README.md              # Archive index
    ├── PHASE_1_QUICK_WINS_COMPLETE.md
    ├── PHASE_2_PROGRESS.md
    ├── DENO_MIGRATION.md
    ├── TYPESCRIPT_SETUP_FIX.md
    ├── SERVER_SETUP.md
    ├── v0.11.0-changes.md
    ├── RELEASE-v2.4.0.md
    └── ...
```

**Note**: Historical progress tracking, implementation details, and completed migration docs are in the `archive/` directory for reference.

## Getting Started

### I want to...

**...use the application**
→ Start with [USER_GUIDE.md](USER_GUIDE.md)

**...create custom reports**
→ Read [REPORT_DEFINITIONS.md](REPORT_DEFINITIONS.md)

**...understand the architecture**
→ Check [ARCHITECTURE.md](ARCHITECTURE.md)

**...contribute code**
→ Follow [DEVELOPMENT.md](DEVELOPMENT.md)

**...migrate from hardcoded reports**
→ See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

## Additional Resources

### In Repository Root

- **[README.md](../README.md)** - Project overview and quick start
- **[QUICK_START.md](../QUICK_START.md)** - Quick start guide
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes

### In Tools Directory

- **[tools/README.md](../tools/README.md)** - Development tools documentation
- **tools/validate-report.js** - Report definition validator

### Example Reports

- **reports/examples/** - Example report definitions
  - income_simple.json
  - income_detailed_nl.json
  - balance_sheet_nl.json
  - And more...

## Documentation Standards

### For Contributors

When updating documentation:

1. **Keep it Current**: Update docs when code changes
2. **Be Clear**: Write for your audience (users vs developers)
3. **Use Examples**: Show, don't just tell
4. **Link Related Docs**: Help readers find more information
5. **Test Examples**: Ensure code examples actually work

### Documentation Types

**User Documentation**:
- Focus on "how to use"
- Include screenshots/examples
- Troubleshooting sections
- Minimal technical jargon

**Developer Documentation**:
- Focus on "how it works"
- Include code examples
- Architecture diagrams
- Technical details

**API Documentation**:
- JSDoc comments in code
- Parameter descriptions
- Return value descriptions
- Usage examples

## Getting Help

### Can't Find What You Need?

1. **Search**: Use Ctrl+F in documentation files
2. **Check Examples**: Look at example reports and test files
3. **Review Code**: Source code has JSDoc comments
4. **Check Issues**: Search existing GitHub issues
5. **Ask**: Create a new issue with your question

### Reporting Documentation Issues

Found an error or unclear section?

1. Note the file name and section
2. Describe the issue
3. Suggest improvement (if possible)
4. Create an issue or pull request

## Version Information

**Current Version**: 0.11.0

This documentation is maintained for the current version. For historical documentation, see the [archive/](archive/) directory.

## License

This documentation is part of the Financial Statement Generator project and is provided as-is for educational and business use.
