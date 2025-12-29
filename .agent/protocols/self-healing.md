# Self-Healing Protocol

**Purpose**: Automatically detect and fix issues before they become failures.

---

## Detection Matrix

| Issue Type | Detection Method | Severity | Auto-Fix? |
|------------|------------------|----------|-----------|
| Test failure | `npm test` exits non-zero | High | Yes (3 attempts) |
| Type error | `npm run check:types` fails | Medium | Yes (2 attempts) |
| Build failure | `npm run build` fails | Critical | Yes (1 attempt) |
| Security vuln | Dependency scan | Critical | No (escalate) |
| Dead code | Unused export detection | Low | Log only |
| Performance | Response time > 500ms | Medium | Investigate |

---

## Response Workflow

### Step 1: Detect
Monitors continuously check codebase health:
```
Every agent session:
  1. Run npm run check:types
  2. Check for failing tests in backlog
  3. Scan recent commits for issues
```

### Step 2: Classify
Determine severity and response:
```
IF severity == "critical":
  immediate_response = true
  max_retries = 1
  escalate_after_failure = true

IF severity == "high":
  immediate_response = true
  max_retries = 3
  escalate_after_failure = true

IF severity == "medium":
  queue_for_next_cycle = true
  max_retries = 2

IF severity == "low":
  log_for_batch = true
  max_retries = 0
```

### Step 3: Heal
Execute appropriate workflow:
```
IF issue.type == "test_failure":
  execute: .agent/workflows/fix-test.yaml
  
IF issue.type == "type_error":
  execute: .agent/workflows/review.yaml (type_check step)
  
IF issue.type == "build_failure":
  analyze: build_errors
  fix: identified issues
  validate: npm run build
```

### Step 4: Validate
Confirm fix was successful:
```
1. Re-run detection check
2. IF pass:
   - Update backlog status
   - Log to progress_log.md
   - Update metrics.json (success)
3. IF fail AND retries_remaining:
   - Goto Step 3
4. IF fail AND no_retries:
   - Escalate to human
   - Mark as "needs_human"
```

---

## Escalation Rules

**Immediate Human Escalation:**
- Security vulnerabilities
- Data integrity issues
- Authentication/authorization failures
- Changes affecting >10 files
- 3 consecutive heal failures

**Delayed Human Review:**
- Performance degradation trends
- Increasing test flakiness
- Unusual error patterns

---

## Auto-Heal Task Creation

When issue detected, create task:
```json
{
  "id": "heal_{{timestamp}}",
  "title": "Self-heal: {{issue_type}}",
  "type": "auto_fix",
  "priority": "{{severity}}",
  "status": "pending",
  "created_by": "agent:monitor",
  "details": {
    "issue": "{{description}}",
    "detection_time": "{{now}}",
    "suggested_fix": "{{analysis}}"
  }
}
```

---

## Metrics Tracking

After every heal attempt, update `.agent/learning/metrics.json`:
```json
{
  "self_healing": {
    "total_detections": 0,
    "successful_heals": 0,
    "escalations": 0,
    "patterns": [
      {"type": "null_check", "count": 0, "success_rate": 0}
    ]
  }
}
```
