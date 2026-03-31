---
description: Run smoke tests and golden set evaluation against production — use to quickly verify production is healthy, catch regressions after deploys, or auto-file P0/P1 bugs for failures. Trigger phrases: "run smoke tests", "qa check", "is production healthy", "quick qa", "check for regressions", "golden eval".
---

# QA Smoke: Quick Production Verification

Run smoke tests and golden set evaluation against production. Auto-file bugs for failures.

## Steps

### Step 1: Run smoke tests
```
node scripts/run-smoke-tests.mjs --env=production --verbose
```
This runs ~20 API-level fetch checks against production (https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app). No browser required.

Capture the full output. Parse the results for passed/failed/skipped counts.

### Step 2: Run golden set eval (FAST tier)
```
node scripts/run-golden-eval.mjs --all
```
Deterministic compliance tests for Smokey, Craig, and Deebo agents. No API calls, completes in <2s.
- Exit code 0 = all pass
- Exit code 1 = compliance-critical failure (BLOCKS deployment)
- Exit code 2 = below accuracy threshold (warning)

### Step 3: Auto-file bugs for failures
If ANY smoke tests failed with P0 or P1 severity, file bugs via Pinky:
```
node scripts/pinky.mjs file-bug "[SMOKE] <test name> failed" --area=<area> --priority=<P0|P1> --steps="Automated smoke test detected failure" --expected="HTTP <expected status>" --actual="HTTP <actual status>"
```
Only file for P0/P1 failures. P2/P3 are logged but not auto-filed.

### Step 4: Report
```
QA SMOKE REPORT
================
Date: <today>
Environment: production

SMOKE TESTS:    X/Y passed, Z skipped
GOLDEN EVAL:    PASS / COMPLIANCE FAIL / BELOW THRESHOLD

FAILURES:
  [P0] <test name> - <description>
  [P1] <test name> - <description>

BUGS FILED: N via Pinky

STATUS: ALL CLEAR / ISSUES DETECTED
```

## Flags
- If $ARGUMENTS contains "--full": also run `node scripts/run-golden-eval.mjs --all --full` (LLM eval, requires CLAUDE_API_KEY, ~$0.05-0.15)
- If $ARGUMENTS contains "--staging": run against staging instead of production
- If $ARGUMENTS contains "--local": run against http://localhost:3000
- If $ARGUMENTS contains "--no-file": skip auto-filing bugs (report only)
