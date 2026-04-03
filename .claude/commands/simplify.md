---
description: Review changed code for reuse, quality, and efficiency, then fix any issues found. Run before every git push or Firebase deploy. Trigger phrases: "simplify", "run simplify", "simplify pass", "code review", "clean up code".
---

# Simplify Pass

Review all changed code for reuse, quality, and efficiency. Fix every confirmed finding. Gate on type check before recording.

## Steps

### Step 1: Find changes
```
git diff HEAD
```
If empty (nothing staged/unstaged), use:
```
git diff HEAD~1
```
This is the diff you will review.

### Step 2: Three parallel reviews against the diff

Run all three reviews simultaneously:

**Code Reuse:**
- Flag newly written code that duplicates existing utilities, helpers, or services
- Check for copy-pasted logic that belongs in a shared module
- Look for reimplemented patterns already in `src/lib/`, `src/server/utils/`, or `src/server/services/`

**Code Quality:**
- Flag redundant state variables
- Flag parameter sprawl (functions with 4+ args that should be an options object)
- Flag silent catches (`catch {}` or `catch (e) {}` with no logging)
- Flag leaky abstractions (business logic in UI components, HTTP logic in domain services)
- Flag `console.log` (use `logger` from `@/lib/logger`)
- Flag `any` types (use `unknown` or proper types)

**Efficiency:**
- Flag redundant work (same data fetched multiple times in one flow)
- Flag sequential async calls that could be `Promise.all`
- Flag N+1 Firestore read patterns
- Flag unbounded queries (no `.limit()`)
- Flag memory leaks (listeners not cleaned up, growing caches with no expiry)

### Step 3: Re-check engineering principles
Verify the diff still satisfies (from `AGENTS.md`):
- Canonical home: logic lives in the right layer (service, tool, action, component)
- Reuse before inventing: no new abstractions for one-time use
- Risk tier + failure modes: retries, invalid data, partial execution accounted for
- Observability: billing/auth/automation paths are loggable and auditable
- Explainability: no silent catches, no UI-owned business logic

### Step 4: Fix every confirmed finding
Apply fixes directly in the code. Do not skip findings. Do not defer to "future cleanup."

### Step 5: Type check
```
node --max-old-space-size=8192 node_modules/.bin/tsc --noEmit
```
Or:
```
.\scripts\npm-safe.cmd run check:types
```
Fix any new errors introduced by simplify changes.

### Step 6: Record the review
```
npm run simplify:record
```
Run only once the reviewed code is exactly what you intend to push. This is required by the pre-push hook.

### Step 7: Summarize
Report:
```
SIMPLIFY REPORT
===============
REUSE:      <findings fixed / none>
QUALITY:    <findings fixed / none>
EFFICIENCY: <findings fixed / none>
PRINCIPLES: <any violations fixed / all clear>
TYPE CHECK: PASS / FAIL
RECORDED:   yes
```

## Important
- This is MANDATORY before every `git push` and Firebase deploy
- `scripts/safe-push.sh` and repo hooks verify the recorded review
- If hooks are missing locally: `npm run setup:git-hooks`
- Full protocol: `.agent/workflows/simplify.md`
