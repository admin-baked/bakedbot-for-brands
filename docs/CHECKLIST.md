# Pre-Push Checklist

Use this checklist before pushing your tests to GitHub.

## Local Testing ✓

- [ ] All E2E tests pass: `npm run test:e2e`
  ```
  Expected: 52 passed (or close)
  ```

- [ ] Type checking passes: `npm run check:types`
  ```
  Expected: No errors
  ```

- [ ] Linting passes: `npm run check:lint`
  ```
  Expected: No errors
  ```

- [ ] Build succeeds: `npm run build`
  ```
  Expected: Successfully compiled
  ```

- [ ] App structure is valid: `npm run check:structure`
  ```
  Expected: No errors
  ```

## Files to Push ✓

- [ ] New test files (6):
  - `e2e/api-health.spec.ts`
  - `e2e/navigation.spec.ts`
  - `e2e/error-handling.spec.ts`
  - `e2e/accessibility.spec.ts`
  - `e2e/security.spec.ts`
  - `e2e/smoke.spec.ts`

- [ ] GitHub Actions workflows (3):
  - `.github/workflows/e2e-tests.yml`
  - `.github/workflows/type-check.yml`
  - `.github/workflows/build.yml`

- [ ] Configuration updates:
  - `playwright.config.ts` ✓ (updated)
  - `.gitignore` ✓ (updated)

- [ ] Documentation (3):
  - `CI_CD_SETUP.md` ✓ (new)
  - `TEST_EXPANSION_SUMMARY.md` ✓ (new)
  - `PUSH_GUIDE.md` ✓ (new)

## GitHub Setup ✓

- [ ] GitHub repository accessible: 
  ```
  https://github.com/admin-baked/bakedbot-for-brands
  ```

- [ ] Firebase secret created:
  - Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
  - Location: Settings → Secrets and variables → Actions
  - Value: Base64-encoded service account key

- [ ] (Optional) Branch protection configured:
  - Location: Settings → Branches → Add rule
  - Pattern: `main`
  - Require status checks: ✅
  - Require code reviews: ✅

## Git Verification ✓

```powershell
# Check current branch
git branch

# Check status
git status

# Should show:
# - 6 new e2e test files
# - 3 new workflow files
# - 3 updated/new documentation files
# - 2 modified config files
```

- [ ] No untracked files to worry about
- [ ] No uncommitted changes to keep
- [ ] Correct branch selected (feature branch or main)

## Pre-Commit Verification ✓

```powershell
# See what will be committed
git diff --staged

# Verify all new files
git add --dry-run e2e/ .github/ *.md playwright.config.ts .gitignore
```

- [ ] All intended files staged
- [ ] No unwanted files staged
- [ ] No sensitive data in commits

## Commit Ready ✓

- [ ] Commit message is clear and descriptive
- [ ] Message includes test count (49 new tests)
- [ ] Message mentions CI/CD setup
- [ ] References issue if applicable

Example message:
```
feat: add comprehensive E2E test suite with CI/CD integration

- Added 49 new E2E tests across 6 new test spec files
- Created GitHub Actions workflows for automated testing
- Updated Playwright configuration for CI environments

All 49 tests passing ✅
Type check: ✅
Linting: ✅
Build: ✅
```

## Push Ready ✓

- [ ] All checklists above completed
- [ ] Ready to run: `git push origin feat/add-comprehensive-e2e-tests`
- [ ] Ready to monitor GitHub Actions

## Post-Push Monitoring ✓

After pushing, go to: `https://github.com/admin-baked/bakedbot-for-brands/actions`

- [ ] Workflows appear in Actions tab
- [ ] Build workflow: ✅ Passing
- [ ] Type Check workflow: ✅ Passing
- [ ] E2E Tests (Node 18.x): ✅ Passing
- [ ] E2E Tests (Node 20.x): ✅ Passing

## PR Creation (if using feature branch) ✓

- [ ] Pull request created
- [ ] PR title: "feat: add comprehensive E2E test suite with CI/CD"
- [ ] PR description filled in
- [ ] All status checks passed
- [ ] Ready to merge: `Squash and merge`

## After Merge ✓

- [ ] Tests continue running on main
- [ ] Delete feature branch
- [ ] Pull main locally: `git checkout main && git pull origin main`
- [ ] Verify new tests in project

---

## Quick Command Reference

```powershell
# All-in-one local verification
npm run test:e2e; npm run check:types; npm run check:lint; npm run build

# Stage all changes
git add e2e/ .github/ CI_CD_SETUP.md TEST_EXPANSION_SUMMARY.md PUSH_GUIDE.md playwright.config.ts .gitignore

# Create feature branch and push
git checkout -b feat/add-comprehensive-e2e-tests
git commit -m "feat: add comprehensive E2E test suite with CI/CD integration"
git push origin feat/add-comprehensive-e2e-tests

# After merge, cleanup
git checkout main
git pull origin main
git branch -d feat/add-comprehensive-e2e-tests
```

---

## Still Have Questions?

- **CI/CD Setup Details:** Read `CI_CD_SETUP.md`
- **Detailed Push Steps:** Read `PUSH_GUIDE.md`
- **Test Coverage Info:** Read `TEST_EXPANSION_SUMMARY.md`
- **GitHub Docs:** https://docs.github.com/en/actions
- **Playwright Docs:** https://playwright.dev/docs/ci/github-actions

✅ **Ready? Proceed with Phase 1 of PUSH_GUIDE.md**
