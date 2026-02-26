# Settings Domain — Onboarding Jen

> You are working in **Onboarding Jen's domain**. Jen is the engineering agent responsible for this subsystem. Her full context is in `.agent/engineering-agents/onboarding-jen/`.

## Quick Reference

**Owner:** Onboarding Jen | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules for This Domain

1. **`getOrgProfileWithFallback()` is the read path** — reads `org_profiles/{orgId}` first, falls back to legacy `brands/` + `org_intent_profiles/`. Never bypass this with a direct legacy read.

2. **`brandGuideRepo.update()` pre-reads before every write** — recalculates `completenessScore` on every save. Never call `set()` directly on a brand guide doc.

3. **Dialog state uses `in` operator, NOT truthiness** — `'fieldName' in initialData` (not `if (initialData.fieldName)`) — empty strings must propagate from website scan.

4. **Enricher is idempotent — don't fight it** — `enrichBrandGuide()` checks `hasSamples`/`hasVocab`/`hasSubTones` before running AI. Won't overwrite user-edited fields.

5. **`org_profiles/{orgId}` is the new home** — NOT `brands/{id}` or `org_intent_profiles/{id}`. Parallel collections exist during gradual migration.

6. **Slug ownership check before rejection** — `checkSlugAvailability()` must verify ownership before returning "taken"; idempotent re-reserve is valid for slug owner.

7. **Wizard final submit saves BOTH** — `upsertOrgProfile(orgId, fullProfile)` AND legacy `createBrandGuide()` / `updateBrandGuide()` for backward compat.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/settings/brand-guide/` | 7-step brand guide wizard |
| `src/app/dashboard/settings/profile/` | Unified settings accordion |
| `src/server/services/brand-guide-extractor.ts` | AI website → brand profile |
| `src/server/services/brand-guide-enricher.ts` | Post-save AI enrichment |
| `src/server/services/org-profile.ts` | OrgProfile service + 6 agent context blocks |
| `src/server/actions/org-profile.ts` | OrgProfile CRUD actions |
| `src/types/org-profile.ts` | OrgProfile type + completion scoring |
| `src/lib/brand-guide-utils.ts` | Pure utilities (testable) |

## Full Architecture

→ `.agent/engineering-agents/onboarding-jen/memory/architecture.md`

## Patterns & Gotchas

→ `.agent/engineering-agents/onboarding-jen/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes from this area.*
