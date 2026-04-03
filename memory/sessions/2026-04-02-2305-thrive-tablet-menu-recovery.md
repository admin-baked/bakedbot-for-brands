---
date: 2026-04-02
time: 23:05
slug: thrive-tablet-menu-recovery
commits: [uncommitted]
features: [Thrive tablet menu recovery, Consumer adapter alias resolution, Remotion typecheck fix]
---

## Session 2026-04-02 - Thrive Tablet Menu Recovery

- Fixed the public Thrive Syracuse tablet recommendation path by extending the canonical `fetchMenuProducts()` Firestore lookup to reuse `buildOrgIdCandidates()`, resolve matching `locations` docs, and retry both location and brand candidates before giving up.
- Added focused adapter coverage for both location-resolution and alias-brand fallback so `org_thrive_syracuse` style public flows stay protected even when menu data is stored under a different location or brand prefix.
- Cleared the remaining video build blockers by passing the required shared `duration` field into the chain-video Remotion render call and by adding a typed metadata bridge for the long-form Remotion compositions.
- Validation: elevated `node scripts/run-jest.cjs --runTestsByPath src/server/agents/adapters/__tests__/consumer-adapter.test.ts src/server/actions/__tests__/loyalty-tablet.test.ts --runInBand` passed (7/7), and elevated `npm run -s check:types` passed after the Remotion metadata bridge fix.
