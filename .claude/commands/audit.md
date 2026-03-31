---
description: Run a full BakedBot system health audit across schema validation, RBAC security, data integrity, and query costs — use when checking overall system health, before major releases, after incidents, or when something seems off. Trigger phrases: "system health", "run audit", "check everything", "health check", "is everything working", "full audit".
---

# Full System Health Audit

Run all four diagnostic Super Power scripts and synthesize into a single health report.

## Steps

Run these four scripts sequentially. Capture and analyze the output of each.

### 1. Schema Validation (SP3)
```
npm run audit:schema
```
Validates 8 Firestore collections against TypeScript type definitions.
If $ARGUMENTS contains an org ID (like "org_thrive_syracuse"), run `node scripts/audit-schema.mjs --orgId=$ARGUMENTS` for org-specific validation.

### 2. RBAC Security (SP7)
```
npm run test:security
```
Runs 12 role-based access control security scenarios. Report any authorization bypasses.

### 3. Data Integrity (SP9)
```
npm run audit:consistency
```
Checks 8 consistency rules: orphaned references, duplicate emails, tier/points mismatches, playbook status conflicts. Report any violations.

### 4. Query Cost Analysis (SP11)
```
npm run audit:costs
```
Analyzes Firestore query patterns. Flag queries costing $5-15/mo (optimal is $0.10-0.50/mo).

## Synthesis

After all four complete, produce this structured report:

```
BAKEDBOT SYSTEM HEALTH AUDIT
=============================
Date: <today>

SCHEMA VALIDATION:     PASS/FAIL - N violations
RBAC SECURITY:         PASS/FAIL - N/12 scenarios passed
DATA INTEGRITY:        PASS/FAIL - N rules checked, M violations
QUERY COSTS:           PASS/WARN/FAIL - estimated $X.XX/mo

OVERALL: HEALTHY / NEEDS ATTENTION / CRITICAL

ACTIONS NEEDED:
- <specific items requiring attention>
```

Categorize overall status:
- **HEALTHY**: All 4 pass, no violations
- **NEEDS ATTENTION**: Minor violations (cost warnings, non-critical schema issues)
- **CRITICAL**: Security bypasses, orphaned data, or schema violations on critical collections
