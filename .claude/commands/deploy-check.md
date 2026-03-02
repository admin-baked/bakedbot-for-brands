# Deploy Check: Post-Deploy Verification

Verify that a deployment to production succeeded. Polls for new build, runs smoke tests, checks regressions.

## Steps

### Step 1: Current deployment info
```
git log --oneline -5
```
Note the latest commit hash that should be deploying.

### Step 2: Verify deploy with Pinky
```
node scripts/pinky.mjs verify-deploy --wait=180
```
This polls the production `/api/health` endpoint for up to 180 seconds, waiting for `K_REVISION` to change (indicating a new Firebase App Hosting build went live). It then auto-runs smoke tests.

If $ARGUMENTS contains a number (e.g., "300"), use it as the wait time: `--wait=<number>`.

If Pinky's verify-deploy hangs or fails, proceed to Step 3 anyway.

### Step 3: Run smoke tests
```
node scripts/run-smoke-tests.mjs --env=production --verbose
```
Full smoke test suite against production. Parse results for passed/failed counts.

### Step 4: Check regressions
```
node scripts/pinky.mjs regressions
```
Scan for areas where previously-fixed bugs may have regressed. Report any chronic failure areas.

### Step 5: Report
```
DEPLOY CHECK REPORT
====================
Date: <today>
Commit: <hash> - <message>
Build: <K_REVISION if available>

DEPLOYMENT:     CONFIRMED / PENDING / UNKNOWN
SMOKE TESTS:    X/Y passed, Z failed
REGRESSIONS:    N areas flagged

STATUS: DEPLOY HEALTHY / ISSUES DETECTED

DETAILS:
- <any failures or regressions listed here>
```

## Flags
- If $ARGUMENTS contains "quick": skip Step 2 (no polling, go straight to smoke tests)
- If $ARGUMENTS contains a number: use as wait timeout for verify-deploy
