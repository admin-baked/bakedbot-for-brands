# Builder Workflow Protocol

**Applies to:** Claude Code, Codex, Gemini, Linus. No exceptions.

> The AI Engineer Flow: `Prompt → PRD → AI-Executable Spec → Build → Review → QA`

---

## Stage 0: PRD (Product Requirements Document)

On receiving any non-trivial task prompt, FIRST produce a **PRD**:

**PRD must include:**
- **Problem statement** — what user pain or business goal is being addressed
- **User stories** — who does what, and why
- **Acceptance criteria** — observable outcomes that define "done" (no implementation details)
- **Out of scope** — explicitly what this does NOT include
- **Open questions** — anything requiring a human decision before spec can be written

**PRD rules:**
- Written in plain English. No code, no file paths, no implementation decisions.
- Present to human. **Wait for explicit sign-off before proceeding.**
- If the task is trivial (< 20 lines, single file, no boundary triggers) → skip PRD, jump to mini-spec in Stage 1.
- If ANY boundary trigger fires (auth, payments, schema, cost, prompts, compliance, new integrations) → PRD required.

PRD sign-off unlocks Stage 1. Lives in `dev/prds/YYYY-MM-DD-feature-name.md`.

---

## Stage 1: AI-Executable Spec

Convert approved PRD into a spec using `.agent/spec-template.md`.

**Must specify exactly:**
- File paths for every file created or modified
- Firestore field names and types for every doc written or read
- Component names and props interfaces
- Function signatures with parameter and return types
- Test cases with literal inputs and expected outputs
- Prompt templates (full text)
- API contracts — HTTP method, path, request/response shape, error codes
- Firestore index definitions — collectionGroup, fields, order, queryScope

**Spec rules:**
- Present spec to human. **Wait for explicit approval before writing any code.**
- Trivial task (< 20 lines, single file, no boundary triggers) → mini-spec inline:
  ```
  Mini-spec: [what] → [why] → [exact files] → [exact test inputs+outputs] → [rollback: revert commit]
  ```
- Boundary trigger → full spec, no mini-spec.

---

## Stage 2: Build

Implement strictly within the approved spec scope.
- Write code + tests + logging in one pass.
- Do not modify files outside the spec. Do not add unplanned dependencies.

---

## Stage 3: Self-Review

Run every item in `.agent/review-checklist.md` against your own work.
- Report the checklist results before committing.
- If any critical failure → stop and report. Do not commit.

---

## Stage 4: Test & Eval

- Run the full test suite. Report results (pass/fail counts).
- If this task touched LLM prompts or agent behavior → run the relevant golden set eval:
  - Smokey changes → `smokey-qa.json` (target: ≥90% overall, 100% compliance)
  - Craig changes → `craig-campaigns.json`
  - Deebo changes → `deebo-compliance.json`
- Report eval scores. If below threshold → do not commit. Iterate.

---

## Stage 5: Ship + Record

#### Pre-Push Quality Gate (MANDATORY — runs automatically after all code work)

> **AUTO-SIMPLIFY PROTOCOL: After completing ANY code modifications, ALL agents MUST run `/simplify` before committing.**

Run `/simplify` OR execute the three review agents in parallel:

```
Agent 1 — Code Reuse Review
  "You are doing a CODE REUSE review of the following git diff.
   Find places where newly written code duplicates existing utilities
   or could use existing helpers. Flag any new function that
   duplicates existing functionality."

Agent 2 — Code Quality Review
  "You are doing a CODE QUALITY review of the following git diff.
   Find: redundant state, parameter sprawl, copy-paste with slight
   variation, leaky abstractions, stringly-typed code."

Agent 3 — Efficiency Review
  "You are doing an EFFICIENCY review of the following git diff.
   Find: unnecessary work, missed concurrency, hot-path bloat,
   N+1 patterns, memory leaks, overly broad reads."
```

Fix every confirmed finding. Then `npm run simplify:record`.

1. **Commit** with structured message.
2. **Push to GitHub** — `git push origin main` triggers Firebase App Hosting deployment.
3. **Open a PR with full governance** (see `.agent/refs/pr-governance.md` for exact format).
4. **Update session memory** — `CLAUDE.md` line 15 + `prime.md` recent work block + `MEMORY.md`.

---

## Escape Hatches

- **Hotfix (production down):** Skip Stages 0-1. Fix, run Stages 3-4, commit with `hotfix()`. File retroactive PRD + spec within same session.
- **Docs-only change:** Skip Stages 1-4. Commit directly with `docs()` prefix.
- **Spike:** PRD marked `status: 🔬 Spike`. Code is throwaway. Do not merge without promoting to full flow.

---

## Bug Workflow (Auto-triggered on ANY mention of a bug)

**Step 1 — Triage (30 seconds):**
- **P0** — Production down, data loss, security breach, payment failure
- **P1** — Core feature broken for a paying customer
- **P2** — Feature degraded but workaround exists
- **P3** — Minor UI issue, cosmetic, non-blocking

**Step 2 — File the bug:**
```typescript
{ id, title, steps[], expected, actual, rootCause, priority, area,
  status: 'open', environment: 'production', affectedOrgId, reportedBy: 'claude-code',
  createdAt, updatedAt }
```
Write to Firestore `qa_bugs` collection. P0/P1 bugs trigger Slack via `qa-notifications.ts`.

**Step 3 — Fix immediately.** Triage, file, fix in one pass.

---

## Code Exploration Strategy

### With jcodemunch (Claude Code IDE / Web)
1. `get_repo_outline` if the area is unfamiliar.
2. `search_symbols` for named code (functions, classes, routes, helpers).
3. `get_file_outline` before opening a large file.
4. `get_symbol` for exact implementation.
5. `search_text` for strings, collection names, env vars, non-symbol clues.
6. `get_file_content` only when symbol-level context is not enough.

**Session startup (web only):** Call `index_repo` once — index is NOT cached across web sessions.

### Without jcodemunch (Codex / Gemini)

| Task | Tool |
|------|------|
| Find a symbol/function | `Grep` with class/function pattern |
| Understand a file's shape | `Read` with `offset` + `limit` |
| Explore a directory | `Glob` |
| Never | `Read` on files >200 lines without offset |

---

## Decision Framework: When to Read Refs

| Situation | Action |
|-----------|--------|
| Simple bug fix in one file | Read the file, fix it, test |
| Touching agent code | Read `refs/agents.md` first |
| Touching auth/session | Read `refs/authentication.md` + `refs/roles.md` |
| Adding new integration | Read `refs/integrations.md` |
| Multi-file feature | Read relevant refs + `query_work_history` |
| Unsure where code lives | Use jcodemunch (`get_repo_outline` → `search_symbols`) |
