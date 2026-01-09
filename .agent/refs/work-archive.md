# Work Archive Reference

## Overview
The **Work Archive** system stores historical work artifacts so agents understand context before making changes.

---

## Storage

```
dev/work_archive/
├── 2026-01-09_agent-context-reorg.json
├── 2026-01-09_linus-eval-enhancement.json
└── index.json              # Quick lookup index
```

---

## Work Artifact Schema

```typescript
interface WorkArtifact {
  id: string;              // Generated: date_slug
  timestamp: string;
  agentId: string;         // Which agent did the work
  type: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test' | 'chore';
  
  // What changed
  filesChanged: string[];
  summary: string;
  commitHash?: string;
  
  // Why it changed
  reasoning: string;
  
  // Dependencies
  dependenciesAffected?: string[];
  
  // Context
  decisions: string[];
  warnings?: string[];
}
```

---

## Linus Tools

### `archive_work`
Archive a work artifact after completing a task.

```typescript
await archive_work({
  type: 'feature',
  summary: 'Implemented work archive system',
  filesChanged: ['src/server/services/work-archive.ts', ...],
  reasoning: 'To provide agents with historical context',
  decisions: ['Store in dev/work_archive/', 'Index to Letta memory'],
  warnings: ['Check Letta connectivity before querying']
});
```

### `query_work_history`
Query past work BEFORE making changes. Essential for context.

```typescript
await query_work_history({
  query: 'linus.ts',        // File path or topic
  lookbackDays: 30          // Default: 30
});
```

### `archive_recent_commits`
Backfill from git commits (for catching up).

```typescript
await archive_recent_commits({
  days: 7    // Archive last 7 days of commits
});
```

---

## Workflow Integration

### Before Making Changes
```
1. Query work history for the file/area
2. Review past decisions and warnings
3. Plan changes with context in mind
```

### After Making Changes
```
1. Archive the work artifact
2. Update progress_log.md with reference to artifact
3. Commit with conventional commit message
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/server/services/work-archive.ts` | Core service |
| `src/server/agents/linus.ts` | Tool definitions + executors |
| `dev/work_archive/` | Artifact storage |

---

## Related Documentation
- `refs/agentic-coding.md` — Best practices
- `refs/bakedbot-intelligence.md` — Letta memory
- `dev/progress_log.md` — Session logs
