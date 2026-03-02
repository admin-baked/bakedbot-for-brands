# BakedBot Justfile — Quick-Access Agent Recipes
# Install: winget install Casey.Just  (or: scoop install just / cargo install just)
# Usage:   just <recipe> [args...]
# List:    just --list

# Show all available recipes
default:
    @just --list

# ==========================================================================
# ENGINEERING
# ==========================================================================

# Auto-fix TypeScript errors (dry run — shows what would change)
fix:
    node scripts/fix-build.mjs

# Auto-fix TypeScript errors and apply changes
fix-apply:
    node scripts/fix-build.mjs --apply

# Run TypeScript type checker
types:
    npm run check:types

# Run Jest test suite (pass extra args: just test -- --watch)
test *ARGS:
    npm test -- {{ARGS}}

# Full build pipeline: fix + types + test
build: fix-apply types test

# Deploy to production (push to main triggers Firebase App Hosting)
deploy:
    git push origin main

# Full pipeline: auto-fix, type check, test, deploy
ship: fix-apply types test deploy

# ==========================================================================
# QA & TESTING
# ==========================================================================

# Run smoke tests against production
smoke *ARGS:
    node scripts/run-smoke-tests.mjs --env=production {{ARGS}}

# Run golden set eval — FAST tier (free, <2s, deterministic only)
golden:
    node scripts/run-golden-eval.mjs --all

# Run golden set eval — FULL tier (requires CLAUDE_API_KEY, ~$0.05-0.15)
golden-full:
    node scripts/run-golden-eval.mjs --all --full

# Pinky QA health report
qa:
    node scripts/pinky.mjs report

# File a bug via Pinky (just bug "Title" area [priority])
bug TITLE AREA PRIORITY="P2":
    node scripts/pinky.mjs file-bug "{{TITLE}}" --area={{AREA}} --priority={{PRIORITY}}

# List open bugs (just bugs / just bugs --area=menu --priority=P1)
bugs *ARGS:
    node scripts/pinky.mjs list {{ARGS}}

# Check for regression areas
regressions *ARGS:
    node scripts/pinky.mjs regressions {{ARGS}}

# Verify deploy: poll for new revision + auto-smoke
verify-deploy WAIT="180":
    node scripts/pinky.mjs verify-deploy --wait={{WAIT}}

# Run Playwright E2E tests (just e2e / just e2e --headed)
e2e *ARGS:
    npx playwright test {{ARGS}}

# ==========================================================================
# AUDITS (Super Powers)
# ==========================================================================

# Full system health audit — runs all 4 diagnostic scripts
audit: audit-schema audit-security audit-consistency audit-costs

# SP1: Firestore composite index report (81 indexes)
audit-indexes:
    npm run audit:indexes

# SP3: Schema validation across 8 collections
audit-schema *ARGS:
    node scripts/audit-schema.mjs {{ARGS}}

# SP7: RBAC security — 12 role-based access scenarios
audit-security:
    npm run test:security

# SP9: Data integrity — orphans, duplicates, status conflicts
audit-consistency:
    npm run audit:consistency

# SP11: Query cost analysis (optimal: $0.10-0.50/mo)
audit-costs:
    npm run audit:costs

# ==========================================================================
# COMPLIANCE & SAFETY
# ==========================================================================

# Check content for compliance violations (just compliance "Buy cannabis today")
compliance TEXT:
    node scripts/check-compliance.mjs --text="{{TEXT}}"

# Run security test suite
security:
    npm run test:security

# ==========================================================================
# CUSTOMER OPERATIONS
# ==========================================================================

# Onboard a customer — dry run (just onboard "Green Leaf" greenleaf owner@gl.com Albany)
onboard NAME SLUG EMAIL CITY STATE="NY" POS="" PLAN="scout":
    node scripts/batch-onboard-ny10.mjs --single --name="{{NAME}}" --slug={{SLUG}} --email={{EMAIL}} --city={{CITY}} --state={{STATE}} --pos={{POS}} --plan={{PLAN}}

# Onboard a customer — apply (writes to Firestore)
onboard-apply NAME SLUG EMAIL CITY STATE="NY" POS="" PLAN="scout":
    node scripts/batch-onboard-ny10.mjs --single --name="{{NAME}}" --slug={{SLUG}} --email={{EMAIL}} --city={{CITY}} --state={{STATE}} --pos={{POS}} --plan={{PLAN}} --apply

# Batch onboard from JSON config file
onboard-batch CONFIG:
    node scripts/batch-onboard-ny10.mjs --config={{CONFIG}} --apply

# ==========================================================================
# CODE GENERATORS (Super Power SP5)
# ==========================================================================

# Scaffold a React component + test
gen-component NAME:
    npm run generate:component -- {{NAME}}

# Scaffold a server action
gen-action NAME:
    npm run generate:action -- {{NAME}}

# Scaffold an API route (GET/POST)
gen-route NAME:
    npm run generate:route -- {{NAME}}

# Scaffold a cron job endpoint
gen-cron NAME:
    npm run generate:cron -- {{NAME}}

# ==========================================================================
# INFRASTRUCTURE
# ==========================================================================

# Seed test data (org_test_bakedbot: 10 customers, 5 playbooks, 3 campaigns)
seed:
    npm run seed:test

# Clean and re-seed test data
seed-clean:
    npm run seed:test:clean

# Set up Cloud Monitoring alerts
monitor:
    npm run setup:monitoring

# Audit GCP Secret Manager provisioning
secrets:
    npm run setup:secrets

# ==========================================================================
# DEVELOPMENT
# ==========================================================================

# Start Next.js dev server
dev:
    npm run dev

# Run ESLint
lint:
    npm run lint
