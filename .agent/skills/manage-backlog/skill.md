# Skill: Manage Backlog

**Purpose**: Autonomously create, prioritize, and manage tasks without human input.

---

## Trigger

- Session start: Review and prioritize backlog
- Issue detected: Create task automatically
- Workflow complete: Update task status
- Manual: `/backlog` command

---

## Responsibilities

### 1. Task Creation
Automatically create tasks from:
- Test failures (via test-monitor)
- Type errors (via type-monitor)
- Build failures
- Code quality issues
- Security vulnerabilities

### 2. Prioritization
Calculate priority score (0-100):
```
priority_score = (
  impact * 0.4 +           # Severity/user impact
  urgency * 0.3 +          # Time sensitivity  
  effort_inverse * 0.2 +   # Quick wins score higher
  dependency_count * 0.1   # Unblock other tasks
)
```

**Priority levels**:
- 80-100: critical (immediate)
- 60-79: high (same day)
- 40-59: medium (this week)
- 0-39: low (backlog)

### 3. Assignment
Match task to thinking level:
```
IF complexity == "high" AND requires_reasoning:
  level = "genius"
ELIF complexity == "medium":
  level = "expert" or "advanced"
ELIF complexity == "low":
  level = "standard" or "lite"
```

### 4. Status Management
Track and update statuses:
- `pending` → Initial state
- `in_progress` → Being worked on
- `passing` → Completed successfully
- `failing` → Needs work
- `needs_human` → Escalated

---

## Task Schema

```json
{
  "id": "task_{{timestamp}}",
  "title": "{{description}}",
  "type": "test_fix|feature|bug|refactor|security",
  "status": "pending",
  "priority": "critical|high|medium|low",
  "priority_score": 75,
  "created_by": "agent:monitor|human:{{name}}",
  "created_at": "{{ISO8601}}",
  "assigned_level": "advanced",
  "dependencies": [],
  "last_touched_by": null,
  "last_touched_at": null
}
```

---

## Daily Backlog Review

At session start:
```
1. Read dev/backlog.json
2. Recalculate priority scores
3. Identify blocked tasks (unmet dependencies)
4. Recommend top 3 tasks to work on
5. Log review to session state
```

---

## Metrics

Track autonomy metrics:
```json
{
  "backlog_management": {
    "tasks_created_by_agent": 0,
    "tasks_completed_by_agent": 0,
    "avg_time_to_complete": 0,
    "human_interventions": 0,
    "autonomy_rate": 0
  }
}
```

---

## Autonomy Rate Calculation

```
autonomy_rate = tasks_completed_by_agent / total_tasks_completed * 100
```

**Target**: 90%+ for Class 3 Grade 4
