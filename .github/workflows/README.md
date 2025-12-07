# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing and releases.

## Workflows

### 1. `test.yml` - Continuous Integration
**Triggers:** Every push and pull request to `main` or `develop` branches

**What it does:**
- ✅ Type checks the codebase
- ✅ Runs unit tests (fast, no type checking)
- ✅ Runs integration tests
- ✅ Runs performance tests
- ✅ Generates code coverage
- ✅ Uploads coverage to Codecov

**Duration:** ~2-3 minutes

**Status Badge:**
```markdown
![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Tests/badge.svg)
```

### 2. `e2e.yml` - End-to-End Tests
**Triggers:** 
- Pushes to `main` branch
- Version tags (`v*`)
- Manual trigger (workflow_dispatch)

**What it does:**
- ✅ Installs Chrome browser
- ✅ Downloads Puppeteer
- ✅ Starts development server
- ✅ Runs E2E tests in real browser
- ✅ Uploads screenshots on failure

**Duration:** ~5-10 minutes

**Manual Trigger:**
Go to Actions → E2E Tests → Run workflow

### 3. `release.yml` - Release Pipeline
**Triggers:** Version tags (`v*.*.*`)

**What it does:**
- ✅ Runs full test suite (unit, integration, performance)
- ✅ Runs E2E tests
- ✅ Generates coverage report
- ✅ Creates GitHub release with notes

**Duration:** ~10-15 minutes

**Usage:**
```bash
git tag v0.14.0
git push origin v0.14.0
```

## Workflow Diagram

```
Push/PR to main/develop
         ↓
    test.yml (CI)
    ├─ Type Check
    ├─ Unit Tests
    ├─ Integration Tests
    ├─ Performance Tests
    └─ Coverage
         ↓
    ✅ Pass → Merge allowed
    ❌ Fail → Fix required

Push to main
         ↓
    e2e.yml
    ├─ Install Chrome
    ├─ Start Dev Server
    └─ Run E2E Tests
         ↓
    ✅ Pass → Deployment ready
    ❌ Fail → Screenshots uploaded

Tag v*.*.*
         ↓
    release.yml
    ├─ Full Test Suite
    ├─ E2E Tests
    └─ Create Release
         ↓
    ✅ Pass → Release created
    ❌ Fail → Release blocked
```

## Setup Instructions

### 1. Enable GitHub Actions
GitHub Actions is enabled by default for public repositories. For private repos:
1. Go to Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"

### 2. Add Branch Protection (Optional)
Require tests to pass before merging:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select "Run Tests" check

### 3. Setup Codecov (Optional)
For coverage reports:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. No token needed for public repos
4. For private repos, add `CODECOV_TOKEN` secret

### 4. Customize Workflows

Edit workflow files to match your needs:

```yaml
# Change branches
on:
  push:
    branches: [ main, develop, feature/* ]

# Change Deno version
- uses: denoland/setup-deno@v1
  with:
    deno-version: v1.40.0

# Add more test types
- name: Run Custom Tests
  run: deno test --allow-all test/custom/
```

## Local Testing

Test workflows locally before pushing:

```bash
# Simulate CI tests
deno task check
deno test --allow-read --allow-env --no-check test/unit/
deno test --allow-read --allow-env --no-check test/integration/

# Simulate E2E tests
deno task dev &
deno test --allow-all test/e2e/
```

## Troubleshooting

### Tests fail in CI but pass locally

**Possible causes:**
- Different Deno version
- Missing environment variables
- File permissions
- Network issues

**Solution:**
```yaml
# Pin Deno version
- uses: denoland/setup-deno@v1
  with:
    deno-version: v1.40.0  # Match your local version
```

### E2E tests timeout

**Possible causes:**
- Server takes too long to start
- Chrome installation failed
- Network latency

**Solution:**
```yaml
# Increase timeout
- name: Wait for Server
  run: timeout 120 bash -c 'until curl -s http://localhost:8000; do sleep 2; done'
```

### Coverage upload fails

**Possible causes:**
- Codecov token missing (private repos)
- Network issues

**Solution:**
```yaml
# Make coverage upload non-blocking
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    fail_ci_if_error: false
```

## Status Badges

Add to your README.md:

```markdown
![Tests](https://github.com/USERNAME/REPO/workflows/Tests/badge.svg)
![E2E](https://github.com/USERNAME/REPO/workflows/E2E%20Tests/badge.svg)
![Coverage](https://codecov.io/gh/USERNAME/REPO/branch/main/graph/badge.svg)
```

## Best Practices

1. **Keep CI fast** - Use `--no-check` for tests, type check separately
2. **Cache dependencies** - Cache Deno and Puppeteer downloads
3. **Fail fast** - Run quick tests first, slow tests later
4. **Upload artifacts** - Save screenshots and logs on failure
5. **Use matrix builds** - Test on multiple OS/versions if needed

## Matrix Builds (Optional)

Test on multiple platforms:

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        deno-version: [v1.x, v1.40.0]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: denoland/setup-deno@v1
        with:
          deno-version: ${{ matrix.deno-version }}
```

## Notifications

Get notified of failures:

1. **Email**: Automatic for repository watchers
2. **Slack**: Use [slack-notify action](https://github.com/marketplace/actions/slack-notify)
3. **Discord**: Use [discord-webhook action](https://github.com/marketplace/actions/discord-webhook)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Deno GitHub Actions](https://github.com/denoland/setup-deno)
- [Codecov Documentation](https://docs.codecov.com/)
- [Puppeteer CI Guide](https://pptr.dev/guides/docker)
