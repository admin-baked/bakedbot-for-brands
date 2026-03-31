---
description: Auto-fix TypeScript errors then run the full build-test-deploy pipeline to production — use when ready to ship, after making code changes, or when you want to fix build errors and deploy in one step. Trigger phrases: "fix and ship", "deploy this", "build and deploy", "fix errors and push", "ship it", "push to production".
---

# Fix and Ship: One-Command Deploy Pipeline

Execute the full build-test-deploy pipeline. Report results at each stage and stop on failure.

## Steps

### Step 1: Auto-fix TypeScript errors
Run the build fixer in apply mode:
```
npm run fix:build:apply
```
This auto-fixes common TS errors (wrong import paths, console.log to logger, missing async).
Report what was fixed (if anything). If the script exits non-zero, note the errors but continue to Step 2.

### Step 2: Verify type check passes
```
npm run check:types
```
If this fails, report the specific errors and **STOP**. Do NOT proceed to testing or deployment. Suggest fixes for each error.

### Step 3: Run test suite
```
npm test
```
If tests fail, report which tests failed and **STOP**. Do NOT proceed to deployment.

### Step 4: Stage, commit, and push
Only if ALL previous steps passed:

1. Run `git status` to see changed files
2. Run `git diff --staged` and `git diff` to understand the changes
3. Run `git log --oneline -5` to see recent commit message style
4. Stage relevant changed files by name (never use `git add -A`)
5. Create a commit with a structured message following the repo's conventions
6. Push to main: `git push origin main`

If $ARGUMENTS is provided, use it as context for the commit message.

### Step 5: Report
Provide a structured summary:
```
FIX AND SHIP REPORT
====================
FIX PHASE:    N auto-fixes applied
TYPE CHECK:   PASS / FAIL
TESTS:        X/Y passing
DEPLOY:       Commit <hash> pushed to main / SKIPPED
STATUS:       SUCCESS / BLOCKED (reason)
```

## Flags
- If $ARGUMENTS contains "dry-run" or "no-push": skip Step 4 (do not commit or push)
- If $ARGUMENTS contains "no-fix": skip Step 1 (no auto-fix, start at type check)

## Important
- This triggers **production deployment** (git push origin main = Firebase App Hosting CI/CD)
- Windows PowerShell: use `;` not `&&` for command chaining
- Never skip the type check step
