---
description: Multi-agent deploy pipeline — Build Guard → Deploy Runner → Production Verifier → Rollback Agent. Coordinates 4 agents via TodoWrite. Use when you want a safe, verified production deployment. Trigger phrases: "deploy", "deploy to production", "safe deploy", "run deploy".
---

# Deploy Orchestrator

Safe production deployment via 4 coordinated agents. Uses TodoWrite to track state across agents.

## Overview

```
Agent 1: Build Guard     → type-check + auto-fix (up to 3 rounds)
Agent 2: Deploy Runner   → push to GitHub, monitor Firebase CI
Agent 3: Prod Verifier   → hit critical endpoints, check for known bugs
Agent 4: Rollback Agent  → revert + Slack notify if verification fails
```

Each agent gates the next. Stop immediately if any agent fails and cannot recover.

---

## Agent 1 — Build Guard

**Goal:** Ensure the build is green before touching production.

### 1a. Initialize todo tracking
Create todos for all 4 agents so progress is visible:
```
TodoWrite([
  { id: "build", content: "Build Guard: type-check + auto-fix", status: "in_progress" },
  { id: "deploy", content: "Deploy Runner: push + monitor CI", status: "todo" },
  { id: "verify", content: "Prod Verifier: endpoint checks", status: "todo" },
  { id: "rollback", content: "Rollback Agent: standby", status: "todo" },
])
```

### 1b. Run type check
```
node --max-old-space-size=8192 node_modules/.bin/tsc --noEmit 2>&1 | head -80
```

### 1c. Auto-fix loop (up to 3 rounds)
If type check fails:
- Round 1: `.\scripts\npm-safe.cmd run fix:build`
- Re-run type check
- Round 2: Read the specific failing files, fix manually
- Re-run type check
- Round 3: Final attempt at targeted fixes
- If still failing after round 3: **STOP**. Mark `build` todo as `error`. Report errors and do not proceed.

### 1d. Mark build green
```
TodoWrite([{ id: "build", content: "Build Guard: PASS", status: "completed" }])
```

---

## Agent 2 — Deploy Runner

**Goal:** Ship the code and confirm GitHub CI passes.

### 2a. Stage and commit (if uncommitted changes)
1. `git status`
2. `git diff --staged && git diff` — understand what's changing
3. `git log --oneline -5` — match commit message style
4. Stage files by name (never `git add -A`)
5. Commit with descriptive message

If $ARGUMENTS provided, use it as commit message context.
Skip if working tree is clean.

### 2b. Push
```
git push origin main
```
This triggers Firebase App Hosting CI/CD.

### 2c. Monitor CI (poll until complete)
Poll every 30 seconds, up to 30 minutes:
```
gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 1
```

- `completed` + `success` → proceed to Agent 3
- `completed` + `failure` → **retry once**: push an empty commit, wait another 30 min
- Still failing after retry → **STOP**. Mark `deploy` todo as `error`. Notify with run URL.
- `in_progress` + elapsed > 25 min + `Duration: unknown` → stuck build: cancel and re-trigger
  ```
  node scripts/firebase-apphosting.mjs cancel <build-id>
  git commit --allow-empty -m "ci: re-trigger deploy"
  git push origin main
  ```

### 2d. Mark deploy complete
```
TodoWrite([
  { id: "deploy", content: "Deploy Runner: PASS — <commit hash>", status: "completed" },
  { id: "verify", content: "Prod Verifier: endpoint checks", status: "in_progress" },
])
```

---

## Agent 3 — Production Verifier

**Goal:** Confirm the deployed build is healthy. Catch known bug patterns.

### 3a. Wait 30 seconds for CDN propagation
(Brief pause after deploy completes before hitting endpoints)

### 3b. Check critical endpoints
Hit each URL and verify:

| Endpoint | Expected | Known bug to check |
|----------|----------|-------------------|
| `https://bakedbot.ai/api/system/health` | 200 + `{"status":"healthy"}` | — |
| `https://bakedbot.ai/dashboard/dispensary` | 200 or 302 to signin | — |
| `https://bakedbot.ai/api/ai/outreach` (POST) | not 500 | 500 errors on outreach — check response body |
| `https://bakedbot.ai/dashboard/dispensary/checkin` | 200 | Hanging dashboard (Firestore index) |
| `https://bakedbot.ai/loyalty-tablet` | 200 or redirect to age-gate | Tablet redirect loop |
| `https://bakedbot.ai/inbox` | 200 | Inbox chat issues |

For each endpoint: `curl -s -o /dev/null -w "%{http_code}" <url>`

Or use the existing script:
```
node scripts/post-deploy-test.mjs
```

### 3c. Evaluate results
- All P0 checks pass → proceed to 3d
- Any P0 check fails → call Agent 4 (Rollback)
- P1 warnings → log but do not rollback, report to Slack

### 3d. Mark verification complete
```
TodoWrite([
  { id: "verify", content: "Prod Verifier: PASS — all endpoints healthy", status: "completed" },
  { id: "rollback", content: "Rollback Agent: not needed", status: "completed" },
])
```

Post success to Slack:
```
gh run view --json url -q '.url'
```
Message: `✅ Deploy verified — all P0 checks pass. Commit: <hash>`

---

## Agent 4 — Rollback Agent

**Only runs if Agent 3 reports a P0 failure.**

### 4a. Identify last known-good commit
```
git log --oneline -10
```
Find the commit before the failing one.

### 4b. Revert
```
git revert HEAD --no-edit
git push origin main
```
(Creates a new revert commit — does not force-push.)

### 4c. Wait for revert deploy
Poll CI as in Agent 2c until revert deploy completes.

### 4d. Notify Slack
Post to #linus-deployments:
```
🚨 *Production rollback executed*
Commit reverted: <hash> — <message>
Reason: <which P0 checks failed and why>
Revert commit: <revert hash>
Action needed: Review the diff before re-deploying.
```

### 4e. Mark rollback complete
```
TodoWrite([
  { id: "rollback", content: "Rollback Agent: REVERTED — <revert hash>", status: "completed" },
])
```

---

## Final Report

Output a structured summary regardless of outcome:
```
DEPLOY ORCHESTRATOR REPORT
===========================
BUILD GUARD:    PASS / FAIL (N auto-fix rounds)
DEPLOY RUNNER:  <commit hash> pushed / FAILED (reason)
PROD VERIFIER:  PASS / FAIL (which checks failed)
ROLLBACK:       Not triggered / Executed (<revert hash>)
OVERALL:        ✅ SUCCESS / ❌ BLOCKED / 🚨 ROLLED BACK
```

## Flags
- `dry-run` in $ARGUMENTS → skip push and rollback, report what would happen
- `no-verify` in $ARGUMENTS → skip Agent 3 (not recommended for P0 releases)
- `force` in $ARGUMENTS → skip auto-fix loop, fail immediately on build errors

## Important
- Windows PowerShell: use `;` not `&&`
- Never `git add -A` — stage by name
- Never `git push --force`
- Rollback is a new commit, not a reset
