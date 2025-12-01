# Pre-Deployment Checklist

**Purpose**: Prevent deployment failures by catching errors before pushing to `main`

---

## The Problem

Recent deployments have failed due to:
- ❌ TypeScript compilation errors
- ❌ Missing imports
- ❌ Type mismatches

**Example**: The 6:33 PM deployment failed because `CannMenusService` wasn't imported in `src/app/api/chat/route.ts`.

---

## The Solution: Check Before You Push

**Every developer must run these checks BEFORE pushing to `main`**:

### Quick Check (2 minutes)

```bash
# Run all checks at once
npm run check:all
```

This runs:
1. ✅ Structure validation
2. ✅ TypeScript type checking
3. ✅ ESLint validation

### Individual Checks

If you want to run checks separately:

```bash
# 1. TypeScript type checking (CRITICAL)
npm run check:types

# 2. Linting
npm run lint

# 3. Full build test (optional but recommended)
npm run build
```

---

## Automated Pre-Commit Hook (Recommended)

### Option 1: Manual Script

Before every commit, run:

```bash
bash scripts/pre-commit-check.sh
```

### Option 2: Automatic Git Hook

Install the pre-commit hook to run checks automatically:

```bash
# Copy the pre-commit hook
cp scripts/pre-commit-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Now checks run automatically on every `git commit`.

### Option 3: Husky (Team-wide)

For the whole team to use automatic checks:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run check:all"
```

---

## Deployment Workflow

### ✅ Correct Workflow

```bash
# 1. Make your changes
# ... edit files ...

# 2. Run checks BEFORE committing
npm run check:all

# 3. If checks pass, commit
git add .
git commit -m "Your commit message"

# 4. Push to trigger deployment
git push origin main

# 5. Monitor deployment
# Watch at: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
```

### ❌ What NOT to Do

```bash
# DON'T skip checks!
git add .
git commit -m "Quick fix" --no-verify  # ❌ Skips hooks
git push origin main
# Result: Deployment fails 💥
```

---

## Common TypeScript Errors & Fixes

### Error: "Cannot find name 'ClassName'"

**Cause**: Missing import

**Fix**:
```typescript
// ❌ Before
const service = new MyService();

// ✅ After
import { MyService } from '@/path/to/service';
const service = new MyService();
```

### Error: "Property 'x' does not exist on type 'Y'"

**Cause**: Wrong type or missing property

**Fix**:
```typescript
// Check the type definition
// Add missing property or fix the type
```

### Error: "Type 'X' is not assignable to type 'Y'"

**Cause**: Type mismatch

**Fix**:
```typescript
// Ensure types match or add proper type casting
const value: CorrectType = someValue;
```

---

## Deployment Status Monitoring

### Check Current Deployment

**Firebase Console**:
https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

**Look for**:
- ✅ Green checkmark = Deployment successful
- ⏳ Yellow spinner = Building
- ❌ Red X = Failed (check logs)

### View Build Logs

1. Go to Firebase Console (link above)
2. Click on the failed build
3. View error logs
4. Fix the errors
5. Push again

---

## Emergency Rollback

If a bad deployment goes live:

### Quick Rollback (Console)

1. Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
2. Click "Rollouts" tab
3. Select previous working version
4. Click "Rollback"

### Rollback via Git

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <good-commit-hash>
git push -f origin main
```

---

## Team Guidelines

### For All Developers

**Before Every Push**:
1. ✅ Run `npm run check:all`
2. ✅ Ensure all checks pass
3. ✅ Test locally if possible
4. ✅ Commit and push

**After Pushing**:
1. ✅ Monitor deployment in Firebase Console
2. ✅ Verify the build succeeds (green checkmark)
3. ✅ If build fails, fix immediately
4. ✅ Notify team if deployment is broken

### For Code Reviewers

**Before Approving PRs**:
1. ✅ Verify checks passed in GitHub
2. ✅ Review TypeScript changes carefully
3. ✅ Ensure imports are correct
4. ✅ Check for any `@ts-ignore` or type cheats

---

## NPM Scripts Reference

All available check commands:

```bash
# Full check suite (runs all checks)
npm run check:all

# Individual checks
npm run check:structure     # Validate app structure
npm run check:types        # TypeScript compilation
npm run check:lint         # ESLint validation

# Build
npm run build             # Production build test

# Development
npm run dev              # Start dev server
npm test                # Run tests
```

---

## What Gets Checked

### TypeScript Check (`npm run check:types`)

Validates:
- ✅ All imports are correct
- ✅ Types match
- ✅ No undefined variables
- ✅ Function signatures are correct
- ✅ No type errors anywhere in codebase

**Time**: ~30 seconds

### Lint Check (`npm run lint`)

Validates:
- ✅ Code style consistency
- ✅ Best practices
- ✅ Unused variables
- ✅ Missing dependencies in useEffect
- ✅ ESLint rules

**Time**: ~10 seconds

### Build Check (`npm run build`)

Validates:
- ✅ TypeScript compiles
- ✅ Next.js builds successfully
- ✅ All pages build without errors
- ✅ No runtime errors during build

**Time**: ~2-3 minutes

---

## Troubleshooting

### "npm run check:types" fails

1. Read the error message carefully
2. Find the file and line number
3. Fix the TypeScript error
4. Run `npm run check:types` again
5. Repeat until 0 errors

### "npm run build" succeeds locally but fails in deployment

**Possible causes**:
- Environment variable missing in deployment
- Secret not configured in Secret Manager
- Dependency version mismatch

**Fix**:
1. Check deployment logs for exact error
2. Verify all secrets exist in Secret Manager
3. Ensure package-lock.json is committed

### Check scripts are too slow

**Use quick check for commits**:
```bash
# Only check types (fastest)
npm run check:types
```

**Save full build check for pre-deployment**:
```bash
# Run full build before major changes
npm run build
```

---

## Current Deployment URL

**Live Site**: https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/

**Firebase Console**: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

---

## Quick Reference Card

Print this and keep at your desk:

```
┌─────────────────────────────────────────┐
│   PRE-PUSH CHECKLIST                    │
├─────────────────────────────────────────┤
│  1. npm run check:all          ✅       │
│  2. All checks pass            ✅       │
│  3. git add .                  ✅       │
│  4. git commit -m "message"    ✅       │
│  5. git push origin main       ✅       │
│  6. Monitor deployment         👀       │
└─────────────────────────────────────────┘

If deployment fails:
1. Check logs in Firebase Console
2. Fix the error
3. Run checks again
4. Push fix
```

---

**Last Updated**: November 30, 2025
**Status**: Active - Use this checklist before every push!
