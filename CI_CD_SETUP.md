# CI/CD Setup Guide

## GitHub Actions Workflows

This project includes automated CI/CD workflows that run on every push and pull request.

### Workflows Included

#### 1. **E2E Tests** (`.github/workflows/e2e-tests.yml`)
- **Trigger:** Every push to `main`/`develop` and PRs
- **Environment:** Ubuntu Latest
- **Node Versions:** 18.x, 20.x (runs in parallel)
- **What it does:**
  - Installs dependencies
  - Installs Playwright browsers
  - Builds the application
  - Runs E2E test suite
  - Uploads test reports and artifacts
  - Comments PR with test results

#### 2. **Type Check & Lint** (`.github/workflows/type-check.yml`)
- **Trigger:** Every push to `main`/`develop` and PRs
- **Environment:** Ubuntu Latest
- **Node Version:** 20.x
- **What it does:**
  - Runs TypeScript type checking
  - Runs ESLint
  - Verifies app structure
  - Validates routes

#### 3. **Build** (`.github/workflows/build.yml`)
- **Trigger:** Every push to `main`/`develop` and PRs
- **Environment:** Ubuntu Latest
- **Node Version:** 20.x
- **What it does:**
  - Builds Next.js application
  - Uploads build artifacts for 5 days

## Setup Instructions

### 1. Create GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

```
FIREBASE_SERVICE_ACCOUNT_KEY
```

**How to get this:**
1. Go to Firebase Console → Project Settings
2. Service Accounts tab
3. Click "Generate New Private Key"
4. Copy the JSON and base64 encode it:
   ```bash
   cat service-account.json | base64 > sa.b64
   ```
5. Paste the base64 content into the GitHub secret

### 2. Update Playwright Config (if needed)

The `playwright.config.ts` already includes `CI` environment detection:
```typescript
reuseExistingServer: !process.env.CI
```

This ensures fresh server starts in CI but reuses existing server locally.

### 3. Update `package.json` (already done)

Verify these scripts exist:
```json
{
  "test:e2e": "playwright test",
  "check:types": "tsc --noEmit",
  "check:lint": "next lint",
  "build": "npm run check:all && next build"
}
```

## Pushing Tests to GitHub

### Step 1: Create a Feature Branch

```bash
git checkout -b feat/add-comprehensive-e2e-tests
```

### Step 2: Stage All Changes

```bash
# Add all new test files
git add e2e/*.spec.ts

# Add workflow files
git add .github/workflows/

# Add updated configuration files (if any)
git add playwright.config.ts package.json

# Add summary documentation
git add TEST_EXPANSION_SUMMARY.md
```

### Step 3: Verify Changes Before Commit

```bash
# See what will be committed
git status

# Review diffs
git diff --staged
```

### Step 4: Commit with Clear Message

```bash
git commit -m "feat: add comprehensive E2E test suite (49 new tests)

- Add API health check tests
- Add navigation and routing tests
- Add error handling and resilience tests
- Add accessibility (a11y) tests
- Add security validation tests
- Add smoke tests for core functionality
- Setup GitHub Actions CI/CD workflows
- All 49 new tests passing

Test coverage now includes:
- API endpoints and health checks
- Navigation and responsive layouts
- Error resilience and slow networks
- Accessibility compliance (WCAG)
- Security headers and input validation
- Session state management

Fixes: #<issue_number> (if applicable)
"
```

### Step 5: Push to GitHub

```bash
# Push to your feature branch
git push origin feat/add-comprehensive-e2e-tests

# Then create a Pull Request on GitHub
```

### Step 6: Monitor CI/CD Pipeline

Once pushed:
1. GitHub will automatically run all workflows
2. Check the "Actions" tab in your repository
3. Watch for:
   - ✅ All tests pass
   - ✅ Type checking passes
   - ✅ Build succeeds
4. PR will show status checks

### Step 7: Merge When Ready

Once all CI checks pass:
```bash
# Merge via GitHub UI, then pull main locally
git checkout main
git pull origin main
```

## Best Practices

### Local Testing Before Push

Always run tests locally first:
```bash
# Run all E2E tests
npm run test:e2e

# Run type checks
npm run check:types

# Run linting
npm run check:lint

# Run build
npm run build
```

### Branch Protection Rules (Recommended)

Set up in GitHub repository settings:
1. Go to **Settings → Branches → Add rule**
2. **Branch name pattern:** `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass:
     - `build`
     - `type-check`
     - `test (18.x)`
     - `test (20.x)`
   - ✅ Require code review from at least 1 person
   - ✅ Require branches to be up to date

### Monitoring & Notifications

- GitHub Actions will notify you of failures
- Failed checks block PRs from merging
- Test artifacts are available for 30 days

## Troubleshooting

### Build Fails with Firebase Error

**Problem:** `FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set`

**Solution:** 
1. Add the secret to GitHub Settings
2. Ensure the workflow file references it:
   ```yaml
   env:
     FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
   ```

### Tests Timeout in CI

**Problem:** Tests take too long and timeout

**Solution:**
1. Increase timeout in `e2e-tests.yml`: `timeout-minutes: 60`
2. Parallelize test runs (already configured)
3. Skip slow tests: Add `test.skip()` for integration tests

### Different Results Locally vs CI

**Problem:** Tests pass locally but fail in CI

**Solution:**
1. Check `CI` environment variable handling
2. Ensure same Node version: `node --version`
3. Clear npm cache: `npm ci` (not `npm install`)
4. Use `npx playwright install` for fresh browser installation

## Additional Resources

- [Playwright GitHub Actions](https://playwright.dev/docs/ci/github-actions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js CI/CD Guide](https://nextjs.org/docs/going-to-production/ci-cd)

---

For questions or issues, check the workflow logs in the GitHub Actions tab.
