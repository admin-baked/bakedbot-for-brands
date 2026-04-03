---
description: Run type checks on changed files, commit, push to GitHub, and update project docs (CLAUDE.md, prime.md, MEMORY.md). Use at end of session or when ready to ship. Trigger phrases: "ship it", "shipit", "commit and push", "end of session", "wrap up".
---

# Ship It

Standard end-of-session workflow: type-check → commit → push → update docs.

## Steps

### Step 1: Type check changed files
Run a targeted type check on files changed since last commit:
```
node --max-old-space-size=8192 node_modules/.bin/tsc --noEmit
```
Or use the safe script:
```
.\scripts\npm-safe.cmd run check:types
```
If type check fails, report errors and **STOP**. Fix before proceeding.

### Step 2: Commit uncommitted changes
1. Run `git status` to see changed files
2. Run `git diff` to understand the changes
3. Run `git log --oneline -5` to match commit message style
4. Stage relevant files by name (never `git add -A`)
5. Commit with a descriptive message following repo conventions

If $ARGUMENTS is provided, use it as context for the commit message.

Skip this step if there are no uncommitted changes.

### Step 3: Push to GitHub
```
git push origin main
```
This triggers Firebase App Hosting CI/CD — production deployment.

After pushing, poll deploy status:
```
gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 3
```

### Step 4: Update project documentation
Run the "Update recent work" session-end protocol:
- Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md`
- Append session block to `memory/MEMORY.md`
- Update `CLAUDE.md` line 15 (status + last update date) if this session is newest
- Update `.agent/prime.md` recent work block (2 lines max)
- Auto-archive MEMORY.md if > 150 lines

### Step 5: Report final status
```
SHIP IT REPORT
==============
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
