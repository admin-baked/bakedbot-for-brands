# Agent Cheat Sheet 🚀

Quick reference for prompting the BakedBot AI agentic layer.

---

## Start Every Session With
```
Load .agent/prime.md and give me the codebase health status.
```

---

## Slash Commands

| Command | Action |
|---------|--------|
| `/fix <task_id>` | Fix failing test |
| `/review` | Pre-commit validation |
| `/types` | Type check |
| `/deploy` | Deploy workflow |
| `/optimize` | Improve workflows |
| `/backlog` | Manage tasks |

---

## Common Prompts

### Fix Tests
```
Fix the failing test FEATURE_009_T01
```

### Run Health Check
```
Read .agent/monitors/health-check.md and report codebase health.
```

### Auto-Heal Issues
```
Read .agent/protocols/self-healing.md and fix any detected issues.
```

### Commit Workflow
```
Run the review workflow from .agent/workflows/review.yaml
```

### Full Coordination
```
Using .agent/orchestrator.md, coordinate fixing all issues then deploy.
```

---

## Key Files

| Context | File |
|---------|------|
| Prime Context | `.agent/prime.md` |
| Orchestrator | `.agent/orchestrator.md` |
| Self-Healing | `.agent/protocols/self-healing.md` |
| Autonomy | `.agent/protocols/autonomous-mode.md` |
| Metrics | `.agent/learning/metrics.json` |

---

## Pro Tips

1. **Load context first** - Always reference `prime.md` for complex tasks
2. **Be explicit** - "Using the fix-failing-test skill..."
3. **Chain workflows** - Reference orchestrator for multi-step tasks
4. **Check metrics** - Review `metrics.json` to see agent performance

---

## Autonomy Levels

| Level | Description |
|-------|-------------|
| 1 | Assisted - Agent suggests, human acts |
| 2 | Supervised - Agent acts, human approves |
| 3 | Monitored - Agent acts, human reviews |
| 4 | Autonomous - Agent runs independently |

Check current level: `metrics.json → autonomy.level`
