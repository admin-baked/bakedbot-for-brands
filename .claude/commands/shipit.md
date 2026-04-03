---
description: Simplify → type-check → commit → push → update docs. Full end-of-session workflow in one command. Trigger phrases: "ship it", "shipit", "commit and push", "end of session", "wrap up", "update recent work".
---

# Ship It

Full end-of-session workflow: simplify → type-check → commit → push → update docs.

## Steps

### Step 1: Simplify pass
Run the full simplify review on all changed files (same as /simplify):

1. `git diff HEAD` to get the diff (if empty, use `git diff HEAD~1`)
2. Run three parallel reviews against the diff:
   - **Reuse:** newly written code duplicating existing utilities
   - **Quality:** silent catches, parameter sprawl, leaky abstractions, `console.log`, untyped `any`
   - **Efficiency:** sequential calls that could be parallel, N+1 patterns, unbounded queries
3. Fix every confirmed finding directly in the code
4. Run `npm run simplify:record` to satisfy the pre-push hook

If $ARGUMENTS contains "no-simplify" — skip this step.

### Step 2: Type check
```
npm run check:types
```
If type check fails, report errors and **STOP**. Fix before proceeding.

### Step 3: Commit uncommitted changes
1. `git status` — see changed files
2. `git diff` — understand the changes
3. `git log --oneline -5` — match commit message style
4. Stage relevant files by name (never `git add -A`)
5. Commit with a descriptive message following repo conventions

If $ARGUMENTS is provided, use it as context for the commit message.
Skip if working tree is clean.

### Step 4: Push to GitHub
```
git push origin main
```
This triggers Firebase App Hosting CI/CD — production deployment.

Poll deploy status:
```
gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 3
```

### Step 5: Update project documentation
Run the "Update recent work" session-end protocol:
- Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md`
- Append session block to `memory/MEMORY.md`
- Update `CLAUDE.md` line 15 (status + last update date) if this session is newest
- Update `.agent/prime.md` recent work block (2 lines max)
- Auto-archive MEMORY.md if > 150 lines

### Step 6: Report final status
```
SHIP IT REPORT
==============
SIMPLIFY:    N findings fixed / clean
TYPE CHECK:  PASS / FAIL
COMMIT:      <hash> — <message> / none needed
PUSH:        Pushed to main / SKIPPED
DEPLOY:      <status from gh run list>
DOCS:        Updated / Skipped (older session)
STATUS:      SUCCESS / BLOCKED (reason)
```

## Important
- Windows PowerShell: use `;` not `&&`
- Never `git add -A` — stage files by name
- If deploy is stuck > 25 min with `Duration: unknown`, cancel and re-trigger with an empty commit
- Simplify is never optional unless `no-simplify` flag is passed
