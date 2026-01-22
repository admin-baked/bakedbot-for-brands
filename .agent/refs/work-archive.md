# Work Archive Reference

## Purpose
The Work Archive stores decisions and context from past work. Query it BEFORE modifying files to understand history.

---

## Key Rule

**Before changing any significant code:**
```typescript
await query_work_history({ query: "filename-or-topic" });
```

This prevents you from undoing past decisions or repeating solved problems.

---

## Storage Location

```
dev/work_archive/
├── 2026-01-09_agent-context-reorg.json
├── 2026-01-09_linus-eval-enhancement.json
└── index.json              # Quick lookup
```

---

## Tools

### `query_work_history` — Use BEFORE changes
```typescript
// Query by file
await query_work_history({
  query: 'linus.ts',
  lookbackDays: 30    // Default: 30
});

// Query by topic
await query_work_history({
  query: 'authentication',
  lookbackDays: 60
});
```

**Returns:** Past artifacts, decisions, warnings for that area.

### `archive_work` — Use AFTER changes
```typescript
await archive_work({
  type: 'feature',  // feature | bugfix | refactor | docs | test | chore
  summary: 'Added work archive query tool',
  filesChanged: [
    'src/server/services/work-archive.ts',
    'src/server/agents/linus.ts'
  ],
  reasoning: 'To give agents historical context before making changes',
  decisions: [
    'Store artifacts as JSON in dev/work_archive/',
    'Index key facts to Letta memory for semantic search'
  ],
  warnings: [
    'Check Letta connectivity before querying memory'
  ]
});
```

### `archive_recent_commits` — Backfill from git
```typescript
// Catch up on recent work
await archive_recent_commits({ days: 7 });
```

---

## Artifact Schema

```typescript
interface WorkArtifact {
  id: string;                    // date_slug format
  timestamp: string;
  agentId: string;               // Who did the work
  type: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test' | 'chore';

  // What
  summary: string;
  filesChanged: string[];
  commitHash?: string;

  // Why (most important!)
  reasoning: string;
  decisions: string[];
  warnings?: string[];

  // Dependencies
  dependenciesAffected?: string[];
}
```

---

## Workflow

### Before Changing Code
1. `query_work_history({ query: "file-or-area" })`
2. Review past decisions and warnings
3. Plan with that context in mind

### After Changing Code
1. `archive_work({ ... })` with reasoning and decisions
2. Include any warnings for future work
3. Commit

---

## What to Archive

**Do Archive:**
- Feature implementations (why this approach)
- Bug fixes (what caused it, how fixed)
- Refactors (why restructured this way)
- Architectural decisions
- Gotchas and warnings discovered

**Don't Archive:**
- Trivial one-line fixes
- Formatting/style changes
- Work already well-documented elsewhere

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/server/services/work-archive.ts` | Core service |
| `src/server/agents/linus.ts` | Tool executors |
| `dev/work_archive/` | Storage directory |

---

## Related
- `refs/agentic-coding.md` — Coding workflow
- `refs/bakedbot-intelligence.md` — Letta memory (semantic search)
- `dev/progress_log.md` — Session notes
