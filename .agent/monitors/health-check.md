# Codebase Health Check

**Purpose**: Monitor overall codebase health and detect issues proactively.

---

## Check Sequence

Run these checks at the start of every agent session:

### 1. Git Status
```bash
git status
```
**Expected**: Clean working tree or known staged changes
**Alert if**: Uncommitted changes in tracked files

### 2. Type Check
```bash
npm run check:types
```
**Expected**: Exit code 0
**Alert if**: Any type errors

### 3. Test Status
```bash
# Check backlog for failing tests
grep '"status": "failing"' dev/backlog.json
```
**Expected**: No results
**Alert if**: Any failing tests in backlog

### 4. Build Verification
```bash
npm run build
```
**Expected**: Exit code 0
**Alert if**: Build failures (run on-demand, not every session)

---

## Health Score

Calculate health score (0-100):

| Check | Weight | Pass | Fail |
|-------|--------|------|------|
| Types pass | 30 | +30 | 0 |
| No failing tests | 30 | +30 | -10 per fail |
| Build succeeds | 25 | +25 | 0 |
| Clean git state | 15 | +15 | 0 |

**Thresholds**:
- 90-100: Healthy ✅
- 70-89: Warning ⚠️ (investigate)
- Below 70: Critical 🔴 (immediate action)

---

## Quick Health Check

For rapid assessment:
```
1. npm run check:types (30 seconds)
2. Count failing tasks in backlog (instant)
3. Report health score
```

---

## Integration with Orchestrator

Report health at session start:
```json
{
  "health_check": {
    "timestamp": "{{now}}",
    "score": 95,
    "types_pass": true,
    "failing_tests": 0,
    "git_clean": true
  }
}
```

Write to `.agent/state/session.json`
