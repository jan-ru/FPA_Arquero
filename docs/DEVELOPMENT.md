# Development Guide

Guide for developers working on the Financial Statement Generator.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Code Standards](#code-standards)
3. [Testing](#testing)
4. [Contributing](#contributing)
5. [Release Process](#release-process)

## Development Setup

### Prerequisites

- **Node.js**: 16+ (for package management)
- **Deno**: 1.37+ (for testing)
- **Git**: For version control
- **Modern Browser**: Chrome, Edge, or Opera
- **Code Editor**: VS Code recommended

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd financial-statement-generator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Or Node.js
   npx http-server -p 8000
   ```

4. **Open Application**
   ```
   http://localhost:8000
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

### Development Environment

**Recommended VS Code Extensions:**
- ES6 String HTML
- JavaScript (ES6) code snippets
- Live Server
- Prettier - Code formatter
- ESLint
- Deno (for test files)

**VS Code Settings:**
```json
{
  "deno.enable": true,
  "deno.enablePaths": ["test/"],
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**Browser Developer Tools:**
- Enable source maps
- Use console for debugging
- Network tab for file loading
- Performance tab for optimization

## Code Standards

### JavaScript Style Guide

**ES6+ Features:**
- Use `const` and `let` instead of `var`
- Arrow functions for callbacks
- Template literals for strings
- Destructuring for object/array access
- Modules for code organization
- Async/await for asynchronous code

**Example:**
```javascript
// Good
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

// Avoid
var calculateTotal = function(items) {
  var sum = 0;
  for (var i = 0; i < items.length; i++) {
    sum += items[i].amount;
  }
  return sum;
};
```

### File Organization

**Naming Conventions:**
- Files: PascalCase for classes (`DataProcessor.js`)
- Functions: camelCase (`calculateBalance`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- CSS classes: kebab-case (`report-header`)

**Module Structure:**
```javascript
// Module template
class ModuleName {
  constructor(options = {}) {
    this.validateOptions(options);
    this.initialize(options);
  }

  // Public methods
  publicMethod() {
    // Implementation
  }

  // Private methods (prefix with _)
  _privateMethod() {
    // Implementation
  }

  // Static methods
  static utilityMethod() {
    // Implementation
  }
}

export default ModuleName;
```

### Documentation Standards

**JSDoc Comments:**
```javascript
/**
 * Calculate financial statement totals
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} accountType - Type of account to filter
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {number} Total amount for the account type
 * @throws {Error} When invalid date range provided
 */
function calculateAccountTotal(transactions, accountType, startDate, endDate) {
  // Implementation
}
```

**README Updates:**
- Update README.md for new features
- Include code examples
- Document breaking changes

### Error Handling

**Error Types:**
```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class DataProcessingError extends Error {
  constructor(message, data) {
    super(message);
    this.name = 'DataProcessingError';
    this.data = data;
  }
}
```

**Error Handling Pattern:**
```javascript
try {
  const result = await processData(data);
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    showValidationError(error.message, error.field);
  } else if (error instanceof DataProcessingError) {
    // Handle processing errors
    showProcessingError(error.message);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    showGenericError();
  }
  throw error; // Re-throw if needed
}
```

## Testing

### Test Structure

**Test File Naming:**
- Unit tests: `ModuleName.test.ts`
- Property tests: `ModuleName.property.test.ts`
- Integration tests: `ModuleName.integration.test.ts`
- Performance tests: `ModuleName.performance.test.ts`

**Test Organization:**
```typescript
describe('ModuleName', () => {
  describe('constructor', () => {
    it('should initialize with default options', () => {
      // Test implementation
    });
    
    it('should throw error for invalid options', () => {
      // Test implementation
    });
  });

  describe('publicMethod', () => {
    beforeEach(() => {
      // Setup for each test
    });

    it('should return expected result for valid input', () => {
      // Test implementation
    });

    it('should handle edge cases', () => {
      // Test implementation
    });
  });
});
```

### Running Tests

**All Tests:**
```bash
npm test
```

**Specific Test Types:**
```bash
# Unit tests only
npm test test/unit/

# Specific test file
deno test --allow-read --allow-write test/unit/reports/ReportLoader.test.ts

# Watch mode for development
npm run test:watch

# With coverage
npm run test:coverage
```

**Test Coverage:**
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/html/index.html
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import DataProcessor from "../../../src/data/DataProcessor.js";

describe('DataProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new DataProcessor();
  });

  describe('parseCSV', () => {
    it('should parse valid CSV data', () => {
      const csvData = 'Date,Account,Amount\n2024-01-01,Cash,1000';
      const result = processor.parseCSV(csvData);

      assertEquals(result.length, 1);
      assertEquals(result[0].account, 'Cash');
      assertEquals(result[0].amount, 1000);
    });

    it('should throw error for invalid CSV', () => {
      const invalidCSV = 'Invalid,CSV,Data';
      
      try {
        processor.parseCSV(invalidCSV);
        throw new Error("Should have thrown");
      } catch (error) {
        assertEquals(error.message.includes('Invalid CSV format'), true);
      }
    });
  });
});
```

**Property-Based Test Example:**
```typescript
import { fc } from "https://cdn.skypack.dev/fast-check";

describe('ExpressionEvaluator Property Tests', () => {
  it('should evaluate deterministically', () => {
    fc.assert(
      fc.property(
        fc.record({
          revenue: fc.integer(),
          cogs: fc.integer()
        }),
        (context) => {
          const evaluator = new ExpressionEvaluator();
          const expression = "revenue + cogs";
          
          const result1 = evaluator.evaluate(expression, context);
          const result2 = evaluator.evaluate(expression, context);
          
          return result1 === result2;
        }
      )
    );
  });
});
```

### Performance Testing

**Performance Test Example:**
```typescript
describe('Performance Tests', () => {
  it('should process large dataset within time limit', async () => {
    const largeDataset = generateTestData(10000); // 10k transactions
    
    const startTime = performance.now();
    const result = await processor.processData(largeDataset);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    assertEquals(executionTime < 2000, true); // 2 second limit
    assertExists(result);
  });
});
```

## Contributing

### Git Workflow

**Branch Naming:**
- Features: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Refactoring: `refactor/description`

**Commit Messages:**
```
type(scope): description

Types:
- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: formatting changes
- refactor: code refactoring
- test: adding tests
- chore: maintenance tasks

Examples:
feat(reports): add cash flow statement generation
fix(ui): resolve export button not working
docs(api): update report definition documentation
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-report-type
   ```

2. **Make Changes**
   - Write code following style guide
   - Add tests for new functionality
   - Update documentation

3. **Test Changes**
   ```bash
   npm test
   npm run type-check
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(reports): add new report type"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/new-report-type
   ```

**PR Checklist:**
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance impact considered

### Code Review Guidelines

**For Authors:**
- Keep PRs focused and small
- Provide clear description
- Include test cases
- Update documentation

**For Reviewers:**
- Check functionality
- Verify test coverage
- Review code style
- Consider performance impact
- Test manually if needed

## Release Process

### Version Management

**Semantic Versioning:**
- Major: Breaking changes (2.0.0)
- Minor: New features (2.1.0)
- Patch: Bug fixes (2.1.1)

**Release Branches:**
```bash
# Create release branch
git checkout -b release/v0.12.0

# Update version numbers
# Update CHANGELOG.md
# Final testing

# Merge to main
git checkout main
git merge release/v0.12.0

# Tag release
git tag v0.12.0
git push origin v0.12.0
```

### Pre-Release Checklist

- [ ] All tests pass
- [ ] Performance tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers updated
- [ ] Browser compatibility tested
- [ ] Sample data works correctly

### Release Notes

**Format:**
```markdown
## [0.12.0] - 2024-12-05

### Added
- New cash flow statement report type
- Export to PDF functionality
- Custom date range picker

### Changed
- Improved performance for large datasets
- Updated UI styling

### Fixed
- Fixed export button not working in Safari
- Resolved date parsing issues

### Deprecated
- Old report format (will be removed in v1.0.0)
```

### Deployment

**GitHub Pages Deployment:**
```bash
# Build for production (if needed)
npm run build

# Deploy to gh-pages branch
npm run deploy
```

**Manual Deployment:**
1. Download latest release
2. Extract files to web server
3. Ensure all files are accessible
4. Test functionality

## Tools and Utilities

### Validation Tools

**Report Definition Validator:**
```bash
# Validate single file
node tools/validate-report.js reports/balance-sheet.json

# Validate all reports
node tools/validate-report.js reports/

# Validate with verbose output
node tools/validate-report.js reports/ --verbose
```

### Development Scripts

**Package.json Scripts:**
```json
{
  "scripts": {
    "test": "deno test --allow-read --allow-write test/unit/",
    "test:watch": "deno test --allow-read --allow-write --watch test/unit/",
    "test:coverage": "deno test --allow-read --allow-write --coverage=coverage test/unit/ && deno coverage coverage",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

### Debugging Tips

**Common Issues:**
1. **Module loading errors**: Check file paths and exports
2. **Test failures**: Check test data and assertions
3. **Performance problems**: Use browser profiler
4. **Memory leaks**: Monitor memory usage in dev tools

**Debugging Tools:**
- Browser DevTools
- Console logging
- Performance profiler
- Memory profiler
- Network tab for file loading

**Debug Mode:**
```javascript
// Enable debug mode
window.DEBUG = true;

// Debug logging
if (window.DEBUG) {
  console.log('Debug info:', data);
}
```

## Best Practices

### Code Quality

1. **Write Tests First**: TDD approach when possible
2. **Keep Functions Small**: Single responsibility principle
3. **Avoid Global State**: Use dependency injection
4. **Document Complex Logic**: Add comments for clarity
5. **Handle Errors Gracefully**: Never fail silently

### Performance

1. **Profile Before Optimizing**: Measure first
2. **Cache Expensive Operations**: Avoid redundant work
3. **Use Efficient Data Structures**: Choose wisely
4. **Minimize DOM Operations**: Batch updates
5. **Lazy Load When Possible**: Defer non-critical work

### Security

1. **Validate All Inputs**: Never trust user data
2. **Sanitize Output**: Prevent XSS attacks
3. **Use HTTPS**: Secure connections only
4. **Keep Dependencies Updated**: Security patches
5. **Review Third-Party Code**: Audit libraries

### Maintainability

1. **Follow Conventions**: Consistent style
2. **Write Clear Documentation**: Help future developers
3. **Refactor Regularly**: Keep code clean
4. **Remove Dead Code**: Don't leave commented code
5. **Update Dependencies**: Stay current

## Getting Help

### Resources

- **Documentation**: Check `docs/` directory
- **Tests**: Look at test files for examples
- **Issues**: Search existing issues
- **Code**: Read the source code

### Support Channels

1. Check documentation
2. Review test files
3. Search codebase
4. Ask team members
5. Create issue with details

### Reporting Issues

**Issue Template:**
```markdown
## Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 120
- OS: macOS 14
- Version: 0.11.0

## Additional Context
Any other relevant information
```
