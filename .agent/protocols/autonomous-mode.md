# Autonomous Mode Protocol

**Purpose**: Define full autonomy behavior for Class 3 Grade 4 operation.

---

## Autonomy Levels

| Level | Description | Human Involvement |
|-------|-------------|-------------------|
| 0 | Manual | 100% - Human does everything |
| 1 | Assisted | 80% - Agent suggests, human acts |
| 2 | Supervised | 50% - Agent acts, human approves |
| 3 | Monitored | 20% - Agent acts, human reviews |
| 4 | **Autonomous** | 5% - Agent acts, human oversees |

**Target**: Level 4 (Codebase Singularity)

---

## Autonomous Behaviors

### Enabled Without Approval
- Fix failing tests (up to 3 attempts)
- Fix type errors
- Update backlog status
- Create monitor-detected tasks
- Run health checks
- Generate metrics updates

### Require Notification (No Block)
- Create new skills
- Optimize existing workflows
- Apply performance improvements
- Commit passing changes

### Require Human Approval
- Deploy to production (initially)
- Delete files
- Modify security rules
- Change architecture (>10 files)
- Commit failing changes

### Always Escalate
- Security vulnerabilities
- Data integrity issues
- Authentication failures
- Repeated failures (>3)
- Cost implications

---

## Trust Score

Calculate trust score based on history:

```
trust_score = (
  success_rate * 0.4 +
  consistency * 0.3 +
  zero_critical_failures * 0.2 +
  time_since_last_issue * 0.1
)
```

**Trust thresholds**:
- 95-100: Full autonomy enabled
- 85-94: Monitored autonomy
- 70-84: Supervised mode
- Below 70: Assisted mode (reduced autonomy)

---

## Autonomy Progression

### Week 1-2: Assisted (Level 1)
- Agent fixes, human commits
- Human reviews all changes
- Build trust history

### Week 3-4: Supervised (Level 2)
- Agent commits passing tests
- Human approves before push
- Monitor success rate

### Week 5-6: Monitored (Level 3)
- Agent commits and pushes
- Human reviews weekly
- Trust score > 85

### Week 7+: Autonomous (Level 4)
- Agent runs independently
- Human oversight only
- Trust score > 95

---

## Human Oversight Triggers

Always notify human when:
```
1. Trust score drops below 85
2. 3+ consecutive failures
3. New error pattern detected
4. Security scan finds issue
5. Deploy to production (until trust > 95)
```

---

## Kill Switch

Human can disable autonomy instantly:
```
Set in session.json:
{
  "autonomy_level": 0,
  "reason": "Manual override",
  "by": "human:martez"
}
```

All autonomous behaviors stop immediately.

---

## Daily Autonomy Report

At end of each day, generate report:
```
Autonomy Report - {{date}}
- Tasks completed: {{count}}
- Success rate: {{rate}}%
- Human interventions: {{count}}
- Trust score: {{score}}
- Current level: {{level}}
```
