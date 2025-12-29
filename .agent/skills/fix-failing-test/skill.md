# Skill: Fix Failing Test

**Purpose**: Automatically diagnose and fix failing tests from `dev/backlog.json`

**Trigger**: User says "fix test <id>" or "fix failing tests"

---

## Input Variables

| Variable | Source | Required |
|----------|--------|----------|
| `task_id` | User prompt or backlog scan | Yes |
| `max_retries` | Default: 3 | No |

---

## Workflow (9 Steps)

### 1. Load Context
```
Read: dev/backlog.json → Find task with status="failing"
Read: dev/test_matrix.json → Get test command for task
```

### 2. Run Initial Test
```bash
npm test -- <test_file>.test.ts
```
Capture full error output.

### 3. Analyze Failure
Parse error to identify:
- File and line number
- Error type (assertion, type, import, mock)
- Related files to investigate

### 4. Investigate Root Cause
Use Exploration Sequence:
- `view_file` on failing test
- `view_file` on implementation file
- `grep_search` for related patterns

### 5. Implement Fix
Apply minimal change to fix the issue.
Follow existing code patterns.

### 6. Validate Fix
```bash
npm test -- <test_file>.test.ts
```

### 7. Retry Logic
```
IF test passes:
  → Continue to Step 8
ELSE IF retries < 3:
  → Analyze new error
  → Return to Step 5
ELSE:
  → Mark as "needs_human" in backlog
  → Log detailed findings
```

### 8. Update Tracking
```
Update dev/backlog.json:
  - status: "passing"
  - last_touched_by: "agent:antigravity"
  - last_touched_at: <now>

Update dev/progress_log.md:
  - Task ID completed
  - Test result
  - Fix summary
```

### 9. Report
Provide summary:
- What was broken
- What was fixed
- Test result

---

## Cookbook Reference

For specific error patterns, see:
- `cookbook/unit-test.md` - Common unit test fixes
- `cookbook/mock-patterns.md` - Firebase/API mocking
- `cookbook/typescript-errors.md` - Type errors
