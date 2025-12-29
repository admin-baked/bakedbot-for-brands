# Skill: Optimize Workflow

**Purpose**: Analyze performance metrics and improve agent workflows automatically.

---

## Trigger

- Weekly scheduled optimization pass
- Manual `/optimize` command
- When success_rate drops below 80%

---

## Workflow

### Step 1: Load Metrics
```
Read: .agent/learning/metrics.json
Parse: skill success rates, avg times, patterns
```

### Step 2: Identify Bottlenecks
```
Bottleneck criteria:
- success_rate < 85%
- avg_time > 300 seconds
- escalation_rate > 20%
```

### Step 3: Analyze Failures
```
For each bottleneck:
  - Review recent failure logs (progress_log.md)
  - Identify common patterns
  - Generate improvement hypothesis
```

### Step 4: Propose Optimization
```
Generate proposal:
- What to change
- Expected improvement
- Risk level (low/medium/high)
```

### Step 5: Apply (if safe)
```
IF risk == "low" AND expected_improvement > 10%:
  apply_automatically = true
ELSE:
  request_human_approval = true
```

### Step 6: Monitor
```
After 7 days:
  - Compare new vs old metrics
  - IF improved → keep change
  - IF worse → rollback
```

---

## Example Optimizations

### Pattern: Frequent mock failures
```
Observation: "Cannot find module" errors at 15%
Action: Add pattern to cookbook/unit-test.md
Expected: Reduce to <5%
```

### Pattern: Slow test validation
```
Observation: Validation step takes 180s average
Action: Run tests in parallel (3 workers)
Expected: Reduce to ~60s
```

### Pattern: Agent mismatch
```
Observation: Genius level used for simple formatting
Action: Reassign formatting to lite level
Expected: 3x faster, same quality
```

---

## Output

Update metrics.json with optimization results:
```json
{
  "optimizations": {
    "total_applied": 0,
    "successful": 0,
    "rollbacks": 0,
    "last_run": null
  }
}
```
