---
date: 2026-04-02
time: 15:14
slug: simplify-push-gate
commits: [uncommitted]
features: [Simplify push gate, Git hook installer, Safe push wrapper]
---

## Session 2026-04-02 - Simplify Push Gate

- Added a repo-owned simplify guard that hashes the outgoing code diff and records reviews locally via `npm run simplify:status|record|verify`.
- Added `.githooks/pre-push` plus `scripts/install-git-hooks.mjs` so the repo can enforce the simplify gate through `core.hooksPath=.githooks`.
- Switched `npm run push` to a cross-platform Node wrapper and kept the shell fallback aligned so both guarded push paths verify the recorded simplify review.
- Synced `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, `.agent/prime.md`, `.agent/workflows/simplify.md`, and the PR template so the canonical engineering principles are surfaced in startup context and review, with `npm run simplify:record` required after `/simplify`.
- Validation: elevated runs of `node scripts/install-git-hooks.mjs`, `node scripts/simplify-guard.mjs status`, `node scripts/simplify-guard.mjs verify`, and `node --check scripts/safe-push.mjs` all passed; repo-wide typecheck was not rerun because unrelated local video/creative work is still dirty.
