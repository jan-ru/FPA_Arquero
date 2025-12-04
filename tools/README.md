# Tools

This directory contains command-line tools for working with the Financial Statement Generator.

## validate-report.js

Validates report definition files against the JSON schema and business rules.

### Usage

```bash
# Validate a single report
node tools/validate-report.js reports/income_statement_default.json

# Validate multiple reports
node tools/validate-report.js reports/*.json

# Validate with verbose output
node tools/validate-report.js --verbose reports/income_statement_default.json

# Show help
node tools/validate-report.js --help
```

### Exit Codes

- `0` - All reports valid
- `1` - Validation errors found
- `2` - File not found or invalid JSON

### Examples

**Validate all default reports:**
```bash
node tools/validate-report.js reports/*_default.json
```

**Validate all example reports:**
```bash
node tools/validate-report.js reports/examples/*.json
```

**Validate all reports recursively:**
```bash
node tools/validate-report.js "reports/**/*.json"
```

### Output

The tool provides colored output showing:
- ✓ Valid reports in green
- ✗ Invalid reports in red
- Detailed error messages with field names and values
- Warnings in yellow
- Summary statistics

### Integration with CI/CD

You can use this tool in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate Report Definitions
  run: node tools/validate-report.js reports/**/*.json
```

The tool will exit with a non-zero code if validation fails, causing the CI build to fail.
