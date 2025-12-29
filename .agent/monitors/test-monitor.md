# Test Failure Monitor

**Purpose**: Detect and respond to test failures in the codebase.

---

## Detection Methods

### 1. Backlog Scan
```bash
# Find failing tests
grep -l '"status": "failing"' dev/backlog.json
```

### 2. Direct Test Run
```bash
npm test -- --passWithNoTests 2>&1
```
Parse output for failures.

### 3. Test Matrix Check
```
For each entry in dev/test_matrix.json:
  - Run: {{command}}
  - Check: exit code
  - If fail: create heal task
```

---

## Response Actions

### On Detection
1. Log failure to `.agent/state/session.json`
2. Create heal task with priority based on test type:
   - Backend tests: HIGH
   - Frontend tests: MEDIUM
   - E2E tests: HIGH

### Auto-Heal Trigger
```yaml
trigger: test_failure_detected
workflow: .agent/workflows/fix-test.yaml
variables:
  task_id: {{detected_task_id}}
  test_file: {{failing_test}}
  max_retries: 3
```

---

## Failure Patterns

Track common failure patterns for learning:

| Pattern | Signature | Success Rate |
|---------|-----------|--------------|
| Mock not found | `Cannot find module` | 95% |
| Async timeout | `Timeout - Async callback` | 80% |
| Assertion fail | `expect(...).toBe` | 85% |
| Type mismatch | `not assignable to type` | 90% |
| Firebase init | `Firebase app does not exist` | 95% |

---

## Metrics Update

After each detection/heal cycle:
```json
{
  "test_monitor": {
    "detections_today": 0,
    "heals_successful": 0,
    "heals_failed": 0,
    "avg_heal_time_seconds": 0
  }
}
```
