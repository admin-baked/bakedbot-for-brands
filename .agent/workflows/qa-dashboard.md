---
description: Run autonomous dashboard QA — browser agents test every route as real personas, file bugs, post Slack summary
---

# /qa-dashboard — Autonomous Dashboard QA Agent

Launches browser agents that authenticate as real personas (super_user, dispensary_admin, brand_admin), visit every dashboard route, test interactive flows, and file bugs automatically.

**Cost: $0** (Playwright + local Node — no paid APIs)

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--persona=NAME` | all 3 | Single persona: `super_user`, `dispensary_admin`, or `brand_admin` |
| `--route=PATH` | all | Single route to test (e.g., `/dashboard/products`) |
| `--dry-run` | off | Discover routes and print test plan without running |
| `--interactive` | off | Show browser (non-headless) for debugging |
| `--skip-slack` | off | Skip posting summary to #linus-cto |

## Steps

### Step 1: Verify environment

```bash
cd "c:/Users/admin/BakedBot for Brands/bakedbot-for-brands"
```

Confirm required env vars:
```bash
grep -E "FIREBASE_SERVICE_ACCOUNT|CRON_SECRET" .env.local | wc -l
```

Need at least `FIREBASE_SERVICE_ACCOUNT` (or `GOOGLE_APPLICATION_CREDENTIALS`) for auth token generation.

### Step 2: Run the QA agent

Parse user flags from `<args>`. Build the command:

```bash
source .env.local && node scripts/nightly-dashboard-qa.mjs <flags> 2>&1 | tee tmp/qa-dashboard-run.log
```

For background execution:
```bash
source .env.local && node scripts/nightly-dashboard-qa.mjs <flags> > tmp/qa-dashboard-run.log 2>&1 &
echo "PID: $!"
```

### Step 3: Monitor (if background)

```bash
tail -f tmp/qa-dashboard-run.log | grep --line-buffered -E "(PASS|FAIL|BUG|P0|P1|route|persona|Summary|Error)"
```

### Step 4: Report results

Read the run output and report:

```
DASHBOARD QA REPORT
====================
ROUTES:     N tested / M total discovered
PERSONAS:   super_user, dispensary_admin, brand_admin
PASS:       N routes clean
FAIL:       N routes with issues
BUGS FILED: N (P0: X, P1: Y, P2: Z)
INTERACTIVE: N flows tested (tablet check-in, chat, etc.)
SLACK:      Posted to #linus-cto / SKIPPED
RUN TIME:   Xm Ys
```

### Step 5: Auto-fix integration (optional)

If bugs were filed to Firestore `qa_bugs` collection, prompt:

> "N bugs filed. Want me to wire these into Linus auto-fix? He'll pick them up from the qa_bugs queue."

## What it tests

### Route health (all routes)
- No crash / 500 errors
- No blank pages (checks for meaningful content)
- No React error boundaries triggered
- Correct auth redirects (unauthorized users get redirected, not error pages)

### Interactive flows
- **Tablet check-in**: `/loyalty/tablet/{orgId}` — full kiosk flow
- **Dashboard chat**: Send message, verify agent response
- **Products page**: Load product grid, check data renders
- **Settings**: Verify role-gated sections

### Role-based access
- `super_user` (org_test_bakedbot): sees all routes, admin panels
- `dispensary_admin` (org_thrive_syracuse): dispensary-only routes
- `brand_admin` (org_test_brand): brand-only routes
- Verifies unauthorized routes return redirect, not error

## Important
- Requires Playwright (`npx playwright install chromium` if missing)
- Runs against PRODUCTION — read-only tests, no mutations
- Auth uses Firebase custom tokens → session cookies (same as real login)
- Bugs filed to Firestore `qa_dashboard_runs` + `qa_bugs` collections
- Slack summary posts to #linus-cto channel
