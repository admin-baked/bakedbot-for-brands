# Playbooks Domain — Playbook Pablo

> You are working in **Playbook Pablo's domain**. Pablo is the engineering agent responsible for the playbook template system (23 Empire templates), the Zapier-like trigger editor, playbook execution cron, and the pure-JS cron utilities. Full context: `.agent/engineering-agents/playbook-pablo/`

## Quick Reference

**Owner:** Playbook Pablo | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Two `PlaybookTrigger` types — NOT interchangeable**:
   - `src/config/playbooks.ts` → uses `frequency` field (config/template type)
   - `src/types/playbook.ts` → uses `cron` field (editable/saved type)
   - Import-alias both when needed: `import type { PlaybookTrigger as ConfigTrigger } from '@/config/playbooks'`

2. **`parseCron('not a cron at all')` doesn't throw** — 5 tokens get parsed as fields, `'all' !== '*'` triggers the weekly branch. Only < 5 parts forces the default fallback. Test with actual cron strings.

3. **Thrive's 44 playbooks are PAUSED, not broken** — Status `'paused'` means awaiting activation (Mailjet not yet connected). `'active'` only when email provider ready. Don't change to active without confirming email is live.

4. **`customConfig` lives on the assignment, not the template** — `playbook_assignments/{id}.customConfig` stores org-specific overrides (trigger schedule, delivery channels). The template at `playbooks/{id}` is never mutated.

5. **Execution log is the top-level `playbook_executions` collection** — `playbook_executions/{autoId}` (confirmed in playbook-runner/route.ts). Filter by `playbookId` field. NOT a subcollection.

6. **Cron helper functions are pure JS** — `buildCron()`, `parseCron()`, `describeSchedule()` have no external dependencies. They can be imported by client components without server-only chain issues.

7. **`configTriggerToPlaybookTrigger()` converts between the two types** — Always use this converter when reading config triggers for display in the editable `TriggerEditorPanel`.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/playbooks/` | Playbook management UI |
| `src/config/playbooks.ts` | 23 Empire playbook templates (config type) |
| `src/types/playbook.ts` | PlaybookTrigger editable type (cron-based) |
| `src/app/dashboard/playbooks/components/trigger-editor-panel.tsx` | Zapier-like trigger editor + buildCron/parseCron/describeSchedule |
| `src/server/actions/playbooks.ts` | Brand playbook CRUD |
| `src/server/actions/dispensary-playbooks.ts` | Dispensary assignment CRUD + `updatePlaybookAssignmentConfig()` |
| `src/app/api/cron/playbook-runner/route.ts` | Execution cron (reads from `playbooks_internal`, writes to `playbook_executions`) |

## Full Architecture → `.agent/engineering-agents/playbook-pablo/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/playbook-pablo/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
