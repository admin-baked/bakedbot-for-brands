# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves."

---

## ðŸ›  STARTUP: Confirm jcodemunch

Before anything else, verify the codebase index is active:

```bash
# Check .w/ exists (project index) + read savings
ls .w/ > /dev/null 2>&1 && cat ~/.code-index/_savings.json
```

| Result | Action |
|--------|--------|
| `.w/` exists + savings JSON present | âœ… Report: "jcodemunch active â€” X tokens saved (~$Y)" |
| `.w/` missing | âš ï¸ Prompt user: "jcodemunch not detected. Run: `jcodemunch index` in the project root to activate context compression. Install at https://jcodemunch.com if needed." |
| `_savings.json` missing | `.w/` present but no savings yet â€” first session, report tokens saved as 0 |

**Dollar estimate:** `total_tokens_saved Ã— $0.000003` (Sonnet input rate, $3/M tokens)

---

## ðŸš¨ PRIORITY ZERO: Build Health

Before ANY work, verify the build is healthy:

```powershell
.\scripts\npm-safe.cmd run check:types
```

| If Build Is... | Action |
|----------------|--------|
| ðŸŸ¢ **Passing** | Proceed with task |
| ðŸ”´ **Failing** | STOP. Fix build errors FIRST. No exceptions. |

**Current Status:** 🟢 Production live; deliberative inventory pipeline wired to Elroy + briefings; campaign crash fixed.
**Recent work (2026-04-15):** `43bb637c4` inventory pipeline + campaign-card crash fix; `2ba92515f` budtender-shift auth; `757334b18` BUILD-GUARD
- `26b7d7ac1` Firebase API key moved to env var (resolved secret alert)
- `106f5408d` Security fixes: admin routes auth, XSS sanitization, database tool permissions
**Prior (2026-04-12):** `c05e091da` CHANNEL_MAP + roster training; `1fbc88b22` task board + inbound CTAs
- Marty CEO agent: full super powers, Slack DM routing, manages all executives toward $1M ARR
- Club MVP shipped (`9eb4a6d36`): Customer PWA /club, mood video cache, event pipeline + 5 triggers, tablet PWA
- 7-day retention nudge email (cron job)
- Weekly campaign Playbook enrollment
- Demo data filtering (phone 312-684-0522)
- SMS consent TCPA compliance fix
- Loyalty Tablet build fix (re-exported types, null-safety, 11 files)

## ðŸ§­ CANONICAL ENGINEERING PRINCIPLES (MANDATORY)

`AGENTS.md` is the source of truth for builder behavior. Before writing code:

1. Choose the canonical home for the logic.
2. Reuse existing types, services, schemas, adapters, workflows, and tools before adding new abstractions.
3. Set the risk tier and explicitly handle failure modes: invalid data, retries, duplicates, stale state, permission failure, third-party drift, and partial execution.
4. Preserve observability and auditability, especially for billing, auth, integrations, and automations.
5. Keep code explainable: explicit flow, typed boundaries, no silent catches, no hidden UI business logic.

> The PR template and `/simplify` workflow both reinforce these principles. They are mandatory engineering behavior, not optional style notes.

## ðŸš¨ SECURITY GOTCHA: Never Commit These Files

**Triggered 2026-03-18** â€” GitHub secret scanning found 14 exposed secrets. Required full git history rewrite + force push.

**NEVER commit these files:**
| File | Why |
|------|-----|
| `.env` | Contains real API keys â€” use `.env.local` instead (already gitignored) |
| `service-account.json` | GCP service account private key |
| `PRODUCTION_SETUP.md` | Contained SendGrid + GCP keys in plain text |
| `.codex-firebase-deploy.{out,err}.log` | Firebase deploy output includes API keys |
| `.claude/settings.local.json` | Claude Code local settings can include tokens |

**All 5 are now in `.gitignore`.** If you see a GitHub secret scanning alert:
1. Rotate the exposed credential immediately (GCP Console / SendGrid / etc.)
2. Run `git filter-branch` to scrub history (see session 2026-03-18 in MEMORY.md)
3. `git push origin main --force-with-lease`
4. Dismiss alerts via `gh api --method PATCH repos/admin-baked/bakedbot-for-brands/secret-scanning/alerts/$id -f state=resolved -f resolution=revoked`

## ðŸš¨ ELEVATED MODE GOTCHA: Sandbox Failures Can Look Like App Bugs

**Triggered 2026-03-25** â€” some required verification and live-ops commands time out or fail in the default sandbox even when app code is healthy.

**Common symptoms:**
| Symptom | What it usually means |
|---------|------------------------|
| `EPERM: lstat 'C:\\Users\\admin'` from Jest / Node startup | Default shell needs the repo-safe wrappers (`.\scripts\node-safe.cmd`, `.\scripts\npm-safe.cmd`) |
| `npm run check:types` timing out in sandbox | First retry with `.\scripts\npm-safe.cmd run check:types`; if it still fails, command likely needs elevated execution |
| Firebase / GitHub / gcloud commands failing after code changes | Network or credential boundary, rerun elevated before blaming the app |

**Rule:** for Node/npm/Jest in the default shell, use `.\scripts\node-safe.cmd` / `.\scripts\npm-safe.cmd` first so the process stays inside `.codex-jest-home`. If a critical verification or live Firebase / GitHub command still fails for sandbox reasons after that, rerun it in elevated mode before assuming the product is broken.

→ Sessions before 2026-04-04 archived. See `memory/MEMORY.md` and `memory/sessions/` for full history.

---

## ðŸ” Code Exploration Strategy by Agent/Environment

Use the right exploration tool for your context. Wrong choice = wasted tokens or missed symbols.

### Claude Code (Browser) â€” jcodemunch by Default

When running in **Claude Code on the web**, use jcodemunch MCP tools as the default strategy for code exploration â€” before falling back to Read/Grep on large files.

**Why:** jcodemunch indexes the repo via AST parsing and returns only the symbols you need, rather than loading entire files.

| Approach | Tokens Used | Example |
|----------|------------|---------|
| `Read` entire service file | ~3,800 tokens | Reading all of `linus.ts` to find one function |
| `mcp__jcodemunch__get_symbol` | ~700 tokens | Fetching just `LinusAgent.evaluateCode` |
| **Savings** | **~80% fewer tokens** | 5.5Ã— improvement per lookup |

**Session startup:** Call `index_repo` once at the start of a browser session (index is **not** cached across sessions like it is in local CLI).

```
mcp__jcodemunch__index_repo â†’ then search_symbols / get_symbol / get_file_outline
```

**Fallback to Read/Grep** only for: config files, small files (<100 lines), or when you need full file context.

### Claude Code (IDE / Local CLI) â€” jcodemunch, Skip Re-index

Same MCP tools are available. Key difference: **the index persists across sessions** â€” do not call `index_repo` at session start unless files have changed significantly (e.g., after a large merge or scaffold run).

```
# Only re-index when needed:
mcp__jcodemunch__invalidate_cache â†’ mcp__jcodemunch__index_repo
# Otherwise go straight to:
search_symbols / get_symbol / get_file_outline
```

### Codex / Gemini (Builder Agents â€” Full Protocol)

Codex and Gemini follow the **same mandatory protocol as Claude Code**. No exceptions.

#### Code Exploration (no jcodemunch)

| Task | Tool | Rule |
|------|------|------|
| Find a symbol/function | `Grep` with class/function pattern | e.g., `grep -r "evaluateCode" src/` |
| Understand a file's shape | `Read` with `offset` + `limit` | Read first 60 lines for imports/exports, then jump to the function |
| Explore a directory | `Glob` | Prefer over `ls -R` |
| Avoid | `Read` on files >200 lines without offset | Loads entire file â€” wasteful |

**Rule of thumb:** Never read a file >200 lines in full without a targeted offset. Use Grep first to find the line, then Read Â±30 lines around it.

#### Pre-Push Gate (MANDATORY)

Before every `git push` / deploy, Codex and Gemini **must**:
1. Run the `/simplify` 3-agent review (Reuse + Quality + Efficiency) against `git diff HEAD`
2. Fix all confirmed findings
3. Run `.\scripts\npm-safe.cmd run check:types` â€” build must be green
4. Only then push

#### Session End (MANDATORY)

After every coding session, Codex and Gemini **must** update:
1. **`CLAUDE.md` line 15** â€” build status + date + 1-line summary
2. **`.agent/prime.md` lines ~41â€“44** â€” max 2-line recent work block + commit hashes
3. **`memory/MEMORY.md`** â€” prepend session entry; if > 150 lines, auto-archive oldest sessions to `memory/archive/YYYY-MM.md`

#### Coding Standards (same as Claude Code)

| Rule | Detail |
|------|--------|
| TypeScript | All code typed â€” `unknown` over `any` |
| Logging | `@/lib/logger` â€” never `console.log` |
| Error handling | Always wrap async in `try/catch` |
| Server mutations | `'use server'` directive required |
| Firestore | `@google-cloud/firestore` (not client SDK) |

---

## 🚨 PR GOVERNANCE GOTCHA: CI Will Fail Without Full PR Body + Risk Label

**Triggered 2026-04-02** — PRs created via API/MCP/CLI do NOT auto-apply the PR template. The governance check and risk label check both fail instantly.

**Every PR body MUST include all 8 sections** (CI scans for these exact heading strings):

```
# Summary
# Risk Tier
# Canonical Reuse
# New Abstractions
# Failure Modes
# Verification
# Observability
# Explainability
```

**Every PR body MUST contain the literal string `risk:tier0`, `risk:tier1`, `risk:tier2`, or `risk:tier3`** (exactly one). The `apply-risk-label` workflow regex-scans the body text for `risk:tier[0-3]` — writing “Tier 0” or “**Tier 0**” does NOT match. The workflow auto-applies the label from the body match, so you don't need to add the label separately.

**How to fix after creating a PR:**
1. Update body: `mcp__github__update_pull_request` with all 8 sections + literal `risk:tierN` in the Risk Tier section
2. The `apply-risk-label` workflow will auto-add the label from the body text

**Suppression rule:** If your diff contains `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `: any`, justify it in the PR body or governance will block.

**Rule:** Always write the full governance body at PR creation time. Never push a PR and assume CI will handle it.

---

## 🦸 SUPER POWERS — ALWAYS AVAILABLE, USE THESE FIRST

> **Before spending 5+ tool calls investigating an issue, check if a super power solves it in ONE step.**

| # | Script | Command | When To Use |
|---|--------|---------|-------------|
| SP1 | Index Auditor | `npm run audit:indexes` | Check Firestore composite index status |
| SP2 | Secrets Provisioner | `npm run setup:secrets --deploy` | Provision GCP secrets for Firebase App Hosting |
| SP3 | Schema Validator | `npm run audit:schema --orgId=org_thrive_syracuse` | Validate Firestore data types across collections |
| SP4 | Test Data Seeder | `npm run seed:test` | Seed test org with 10 customers, 5 playbooks, 3 campaigns |
| SP5 | Code Scaffolder | `npm run generate:component MyWidget` | Generate boilerplate for components/routes/actions |
| SP6 | Build Error Fixer | `npm run fix:build --apply` | Auto-fix common TypeScript errors (import paths, consoleâ†’logger) |
| SP7 | Security Tester | `npm run test:security` | Run 12 role-based access control scenarios |
| SP8 | Compliance Gater | `npm run check:compliance --text "..."` | Check content for medical claims, minors protection |
| SP9 | Consistency Checker | `npm run audit:consistency --orgId=...` | Validate org relationships and data integrity |
| SP10 | Monitoring Setup | `npm run setup:monitoring --deploy` | Configure Cloud Monitoring alerts for production |
| SP11 | Cost Analyzer | `npm run audit:costs` | Identify expensive Firestore queries |
| SP12 | Content Freshness | `npm run audit:content-freshness` | Score all 84 customer-facing pages for staleness |
| SP13 | Opencode Agent | `npm run opencode:task -- --prompt “...”` | Delegate coding task to Cloud Run Opencode (free Zen models) |

**Quick-fire guide — when you’re stuck:**
- Build broken? → **SP6** `npm run fix:build --apply` then `npm run check:types`
- Data looks wrong? → **SP3** `npm run audit:schema` + **SP9** `npm run audit:consistency`
- Need test data? → **SP4** `npm run seed:test`
- Security concern? → **SP7** `npm run test:security`
- Content compliance? → **SP8** `npm run check:compliance --text “...”`
- Slow queries? → **SP11** `npm run audit:costs`
- New scaffold needed? → **SP5** `npm run generate:component|action|route|cron <name>`
- Content going stale? → **SP12** `npm run audit:content-freshness` (also `--stale-only` or `--json`)
- Delegate coding task (free)? → **SP13** `npm run opencode:task -- --prompt “fix X in src/...”` (Zen models, $0)

**Notes:** All scripts use `.env.local` for auth. SP8 requires `CLAUDE_API_KEY`. SP4 creates `org_test_bakedbot` (use `--clean` to reset). SP13 requires `OPENCODE_AGENT_URL` + `OPENCODE_SERVER_PASSWORD` — deploy Cloud Run container first (`docker/opencode/`).

---

## ðŸš€ Post-Deploy Protocol (MANDATORY after every `git push`)

After every `git push origin main`, **do not stop at the push**. Complete the full deploy loop:

### Step 1 â€” Poll until deploy completes

```bash
# Poll every 60s until the GH Actions run finishes
RUN_ID=$(gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 1 --json databaseId -q '.[0].databaseId')
while true; do
  STATUS=$(gh run view $RUN_ID --json status,conclusion -q '.status + "|" + (.conclusion // "")')
  echo "$(date '+%H:%M:%S') $STATUS"
  [[ "$STATUS" == *"completed"* ]] && break
  sleep 60
done
echo "Deploy result: $STATUS"
```

Typical build time: **18â€“22 minutes**. Run in background (`run_in_background: true`) so you can keep working.

### Step 2 â€” If deploy failed: diagnose

```bash
# Check which step failed
gh run view $RUN_ID --json jobs -q '.jobs[].steps[] | select(.conclusion == "failure") | .name'

# Common failure: stuck previous build blocking the queue
node scripts/firebase-apphosting.mjs status   # find RUNNING build
node scripts/firebase-apphosting.mjs cancel <cloud-build-id>  # cancel it
git commit --allow-empty -m "chore: trigger redeploy after cancelling stuck build" && git push origin main
```

### Step 3 â€” After successful deploy: run post-deploy triggers

For **Thrive Syracuse** (or any org with POS sync), always trigger an immediate sync after deploy so product changes take effect without waiting 30 min:

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"

# POS sync (populates menu products â†’ recommendations)
curl -s -X POST "$BASE/api/cron/pos-sync?orgId=org_thrive_syracuse" \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Length: 0"

# Verify menuProductsCount > 0 in the response
```

**Expected response:** `{"success":true,"results":{"menuProductsCount":N}}` where N > 0.  
If `menuProductsCount: 0` â†’ check `posConfig.status === 'active'` on the location doc + Alleaves API returning inventory.

### Post-deploy trigger map

| Change type | Post-deploy action |
|-------------|-------------------|
| POS adapter / product sync | `POST /api/cron/pos-sync?orgId=org_thrive_syracuse` |
| Playbook logic | Verify Welcome Playbook is ACTIVE (`launch-thrive-full.mjs`) |
| Cron auth / scheduler | Re-run `node scripts/launch-thrive-full.mjs` to update jobs |
| Customer sync | `POST /api/cron/pos-sync` (customers sync is part of same call) |
| Any Thrive-facing change | `POST /api/cron/pos-sync` + spot-check loyalty tablet recs |

### Step 4 â€” Update recent work (session end)

After a successful deploy + post-deploy triggers, always close the session:

```
"Update recent work"
```

This runs the full session-end protocol (CLAUDE.md â†’ "Session End" section):
1. Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md`
2. Prepend session block to `memory/MEMORY.md`
3. Auto-archive MEMORY.md if > 150 lines
4. Update `CLAUDE.md` line 15 + `.agent/prime.md` recent work block (date-gated)
5. Commit: `docs: Update session notes YYYY-MM-DD - [summary]`

**Rule:** A coding session isn't complete until the memory is updated. Deploy â‰  done.

### Stuck build gotcha

Firebase App Hosting queues builds. If a build hangs (> 25 min, `Duration: unknown`), it blocks all subsequent pushes. Pattern:
1. `node scripts/firebase-apphosting.mjs status` â†’ find RUNNING build > 25 min
2. `node scripts/firebase-apphosting.mjs cancel <id>` â†’ cancel it
3. Push empty commit to re-trigger: `git commit --allow-empty -m "chore: retrigger deploy" && git push`

---

## Workflow Protocol

**Every task follows this pipeline. No shortcuts. No exceptions.**

> **The AI Engineer Flow:**
> `Prompt â†’ PRD (human strategy doc) â†’ AI-Executable Spec (implementation contract) â†’ Build â†’ Review â†’ QA`
> The PRD captures the *why*. The Spec captures the *exactly what and how* â€” every decision pre-made.

---

### Stage 0: PRD (Product Requirements Document)

On receiving any non-trivial task prompt, FIRST produce a **PRD** â€” a human-readable strategy document:

**PRD must include:**
- **Problem statement** â€” what user pain or business goal is being addressed
- **User stories** â€” who does what, and why
- **Acceptance criteria** â€” observable outcomes that define "done" (no implementation details)
- **Out of scope** â€” explicitly what this does NOT include
- **Open questions** â€” anything requiring a human decision before spec can be written

**PRD rules:**
- Written in plain English. No code, no file paths, no implementation decisions.
- Present to human. **Wait for explicit sign-off before proceeding.**
- If the task is trivial (< 20 lines, single file, no boundary triggers) â†’ skip PRD, jump to mini-spec in Stage 1.
- If ANY boundary trigger fires (auth, payments, schema, cost, prompts, compliance, new integrations) â†’ PRD required, no skip allowed.

**PRD sign-off unlocks Stage 1.** The PRD becomes the permanent record of intent and lives in `dev/prds/YYYY-MM-DD-feature-name.md`.

---

### Stage 1: AI-Executable Spec (Implementation Contract)

Convert the approved PRD into an **AI-Executable Spec** using `.agent/spec-template.md`.

**This spec is NOT for humans â€” it is an execution contract for an AI engineer.** Every decision must be pre-made. No ambiguity. No "use your judgment." Linus reads this and builds it exactly as written.

**AI-Executable Spec must specify (exactly):**
- **Exact file paths** for every file created or modified (e.g., `src/server/actions/qa.ts`, `src/types/qa.ts`)
- **Exact Firestore field names and types** for every doc written or read (e.g., `regressionOf?: string`, `isRegression?: boolean`, `updatedAt: Timestamp`)
- **Exact component names** and their props interface (e.g., `<RegressionBadge bugId={string} area={QABugArea} />`)
- **Exact function signatures** with parameter types and return types (e.g., `getRegressionHistory(area: QABugArea): Promise<QABug[]>`)
- **Exact test cases** with literal inputs and expected outputs (e.g., `getRegressionHistory('brand_guide') â†’ QABug[] where every item has status in ['verified','closed','fixed']`)
- **Exact prompt templates** for any agent injection (full text, not summaries)
- **Exact API contracts** â€” HTTP method, path, request body shape, response shape, error codes
- **Exact Firestore index definitions** â€” collectionGroup, fields, order, queryScope

**Spec rules:**
- Present spec to human. **Wait for explicit approval before writing any code.**
- If trivial task (< 20 lines, single file, no boundary triggers) â†’ mini-spec inline:
  ```
  Mini-spec: [what] â†’ [why] â†’ [exact files] â†’ [exact test inputs+outputs] â†’ [rollback: revert commit]
  ```
- Boundary trigger â†’ full AI-Executable Spec, no mini-spec.

---

### Stage 2: Build
Implement strictly within the approved spec scope.
- Write code + tests + logging in one pass.
- Follow Constitution Â§II (clean code, error handling, types, structured logs).
- Do not modify files outside the spec. Do not add unplanned dependencies.

### Stage 3: Self-Review
Run every item in `.agent/review-checklist.md` against your own work.
- Report the checklist results before committing.
- If any critical failure â†’ stop and report. Do not commit.
- If minor issues â†’ fix them, then re-run the checklist.

### Stage 4: Test & Eval
- Run the full test suite. Report results (pass/fail counts).
- If this task touched LLM prompts or agent behavior â†’ run the relevant golden set eval from `.agent/golden-sets/`.
  - Smokey changes â†’ `smokey-qa.json` (target: â‰¥90% overall, 100% compliance)
  - Craig changes â†’ `craig-campaigns.json`
  - Deebo changes â†’ `deebo-compliance.json`
- Report eval scores. If below threshold â†’ do not commit. Iterate.

### Stage 5: Ship + Record
Only after Stages 0-4 are complete:

#### ðŸ” Pre-Push Quality Gate (MANDATORY â€” runs automatically after all code work)

> **âš ï¸ AUTO-SIMPLIFY PROTOCOL: After completing ANY code modifications, ALL agents MUST run `/simplify` before committing. This is not optional. It applies to Antigravity, Claude Code, Linus (Slack), and every engineering agent.**

Run `/simplify` OR execute the three review agents in parallel manually:

After the review is complete and the code to push is final, run `npm run simplify:record`. Repo-owned hooks plus `scripts/safe-push.sh` verify that the recorded review still matches the outgoing code diff.

```
Launch all three agents in a single message (parallel):

Agent 1 â€” Code Reuse Review
  "You are doing a CODE REUSE review of the following git diff.
   Find places where newly written code duplicates existing utilities
   or could use existing helpers. Search for existing utilities that
   could replace newly written code. Flag any new function that
   duplicates existing functionality. Flag inline logic that could
   use an existing utility (hand-rolled string manipulation, manual
   path handling, custom env checks, ad-hoc type guards).
   Diff: [paste git diff]"

Agent 2 â€” Code Quality Review
  "You are doing a CODE QUALITY review of the following git diff.
   Find: redundant state, parameter sprawl, copy-paste with slight
   variation, leaky abstractions, stringly-typed code, unnecessary
   JSX nesting.
   Diff: [paste git diff]"

Agent 3 â€” Efficiency Review
  "You are doing an EFFICIENCY review of the following git diff.
   Find: unnecessary work, missed concurrency (sequential ops that
   could be parallel), hot-path bloat, recurring no-op updates,
   unnecessary existence checks, memory leaks, overly broad reads.
   Diff: [paste git diff]"
```

Wait for all three agents to complete. Fix every confirmed finding before proceeding to commit.

1. **Commit** with structured message (see review-checklist.md for format).
2. **Push to GitHub** â€” `git push origin main` **triggers Firebase App Hosting deployment to production**. Always push after committing finished work.
4. **Open a PR with full governance** â€” required on every branch push (PRs targeting `main` or `develop` trigger the governance bot):
   ```bash
   gh pr create --title "<title>" --body "$(cat <<'EOF'
   # Summary
   <bullet points of what changed>

   # Risk Tier
   - [ ] Tier 0 â€” Low Risk
   - [ ] Tier 1 â€” Moderate Risk
   - [ ] Tier 2 â€” High Risk
   - [ ] Tier 3 â€” Critical Risk

   # Canonical Reuse
   <existing types/services/utilities reused>

   # New Abstractions
   <any new abstraction introduced; why reuse was insufficient>

   # Failure Modes
   <behavior on missing data, timeout, retry, duplicate, stale state>

   # Verification
   - [ ] Type-check passing (npm run check:types)
   - [ ] Manual verification

   # Observability
   <how this will be debugged in production>

   # Explainability
   - [ ] I can explain the full flow without AI comments or generated annotations.
   EOF
   )"
   # Then add the risk label (required â€” governance bot fails without it):
   gh pr edit <number> --add-label "risk:tier0"  # or tier1/tier2/tier3
   ```
   **Risk label must always be set** â€” the governance check fails with 0 labels.
5. Update `CLAUDE.md` line 15 â€” build status one-liner.
6. Update `prime.md` recent work block â€” prepend new entry (commit hash + one-liner).
7. Update `memory/MEMORY.md` â€” full session details, gotchas, decisions.
8. Route to topic files if applicable (`memory/platform.md`, `memory/agents.md`, etc.).
9. If feature-flagged â†’ note flag name and canary status.

### Escape Hatches
- **Hotfix (production down):** Skip Stages 0-1. Implement fix, run Stages 3-4, commit with `hotfix()` prefix. File retroactive PRD + spec within same session.
- **Docs-only change:** Skip Stages 1-4. Commit directly with `docs()` prefix.
- **Exploration/spike:** Produce PRD marked `status: ðŸ”¬ Spike`. Code is throwaway. Do not merge to main without promoting to full PRD â†’ Spec â†’ Build flow.

### ðŸ› Bug Workflow (Auto-triggered on ANY mention of a bug, broken feature, or unexpected behavior)

When the user says anything like "X is broken", "X isn't working", "X still broken", "bug in X", "fix X" â€” execute this automatically, no extra prompting needed:

**Step 1 â€” Triage (30 seconds)**
Determine priority based on impact:
- **P0** â€” Production down, data loss, security breach, payment failure
- **P1** â€” Core feature broken for a paying customer (e.g., Thrive can't onboard)
- **P2** â€” Feature degraded but workaround exists
- **P3** â€” Minor UI issue, cosmetic, non-blocking

**Step 2 â€” File the bug (immediate)**
Write directly to Firestore `qa_bugs` collection via Admin SDK script:
```typescript
{ id, title, steps[], expected, actual, rootCause, priority, area,
  status: 'open', environment: 'production', affectedOrgId, reportedBy: 'claude-code',
  createdAt, updatedAt }
```
P0/P1 bugs trigger Slack notification automatically via `qa-notifications.ts`.

**Step 3 â€” Fix immediately**
- Read the broken component/action/service
- Identify root cause
- Apply fix
- Commit + push to production

Do NOT wait for the user to say "P1" or "file a bug first" â€” triage, file, and fix in one pass.

---

## Agent File Map

| File | Purpose | When to read |
|---|---|---|
| `.agent/prime.md` | Startup context + workflow protocol | Every session (auto-loaded) |
| `.agent/refs/agents/README.md` | Detailed agent roster + per-agent entrypoints | Before touching any agent-owned area |
| `.agent/spec-template.md` | Structured spec format (task-level) | Before any implementation |
| `.agent/specs/` | **Production specs** - acceptance criteria, known gaps per feature | Before touching a major feature |
| `.agent/review-checklist.md` | Self-review gates | After implementation, before commit |
| `.agent/golden-sets/*.json` | Eval datasets for LLM changes | When code touches agent prompts/behavior |
| `.agent/constitution.md` | Full engineering principles | Reference for edge cases and disputes |
| `MEMORY.md` | Detailed session memory | On demand (not auto-loaded) |
| `memory/*.md` topic files | Domain-specific deep context | On demand by topic |

---

**Recent work (2026-03-14):** See `MEMORY.md` for full log.
Key completed: [Restored missing `job-stream.ts` module -> Type Check + E2E + deploy green on `main`] (`7ed6cb126`)

---

## ðŸ”’ SECURITY RULE: NEVER HARDCODE SECRETS

**Secrets in code = blocked push + rotated credentials.** It happened (Slack webhook, 2026-02-17).

### The Complete 3-Step Pattern (ALL steps required):
```bash
# STEP 1: Create secret AND populate it (one command does both)
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# If secret already exists but has 0 versions (will also cause build failure!):
echo -n "secret-value" | gcloud secrets versions add SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# STEP 2: Grant Firebase access (Firebase CLI ONLY â€” not raw gcloud)
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=bakedbot-prod

# STEP 3: Reference in apphosting.yaml â€” then push to deploy
```
```yaml
- variable: MY_SECRET
  secret: MY_SECRET          # âœ… Correct
  availability: [RUNTIME]

- variable: MY_SECRET
  value: "actual-secret"     # âŒ NEVER DO THIS
```
```typescript
// In code: always from env
const webhookUrl = process.env.SLACK_WEBHOOK_URL;
// In scripts: env var with fallback
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
```

### ðŸš¨ Preparer-Step Failures (Build-Blocking)
When a secret is referenced in `apphosting.yaml` but is misconfigured, Firebase fails at the **preparer step** â€” before any compilation â€” blocking ALL deployments with `fah/misconfigured-secret`.

**Three causes, same error:**
1. Secret doesn't exist in Secret Manager
2. Secret exists but has **0 versions** (empty container â€” `gcloud secrets versions list` shows "Listed 0 items.")
3. Secret exists with data but no Firebase IAM binding

**Quick diagnostic:**
```bash
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8
# "Listed 0 items." â†’ add a version (step 1 above)
# Shows version(s) â†’ run firebase apphosting:secrets:grantaccess (step 2)
```

See `.agent/refs/firebase-secrets.md` for full pattern, debugging checklist, and version management.

---

## ðŸ†• Super User Onboarding

### Promoting New Super Users to Admin Access
**Status:** âœ… Two-Script Solution â€” UID-based (recommended) + Email-based (backup)

**Method 1: UID-Based (Recommended)** âœ…
```bash
node scripts/promote-super-user-by-uid.mjs <UID>
```
- **When to use:** Most reliable for new users who just signed up
- **Why:** Bypasses Firestore email indexing delay (can take 1-24h)
- Sets custom claims `{ role: "super_user" }` + creates/updates Firestore user doc

**Method 2: Email-Based (Backup)**
```bash
node scripts/promote-super-user-by-email.mjs <EMAIL>
```

**Finding the UID:**
1. Firebase Console â†’ Authentication â†’ Users â†’ Click user â†’ Copy UID
2. Browser DevTools â†’ Application â†’ Local Storage â†’ `firebase:authUser:...`

**After Promotion:** User must re-login â†’ auto-routed to `/dashboard/ceo` â†’ full access to 28 agent tools.

---

## ðŸ—‚ï¸ Completed Systems (Quick Reference)

> Architecture docs: `.agent/refs/` | Production specs (acceptance criteria + gaps): `.agent/specs/`

| System | Status | Key Ref | Production Spec |
|--------|--------|---------|----------------|
| Campaign System (Craig) | âœ… SMS+Email+Deebo gate | `refs/agents/behavioral-agents.md` | `specs/tier1-campaign-system.md` |
| Compliance (Deebo) | âœ… NY/CA/IL rules + monitor | `refs/agents/behavioral-agents.md` | `specs/tier1-compliance-deebo.md` |
| Public Menu Pages | âœ… Brand + Dispensary + ISR | `refs/pages-brand.md` | `specs/tier1-public-menu-pages.md` |
| Pilot Customers | âœ… Thrive (US) + Herbalist Samui (ðŸ‡¹ðŸ‡­ INT'L) | `memory/customers.md` + `HERBALIST_SAMUI_SETUP.md` | â€” |
| International ISR Pages | âœ… Thailand/Koh Samui live | `src/app/destination/` | â€” |

---

## ðŸ§­ Core Principles

1. **Build Health First** - A failing build blocks everything. Fix it immediately.
2. **Read Before Write** - Never modify code you haven't read. Use `Read` tool first.
3. **Small Changes** - One logical change at a time. Test after each.
4. **Plan Complex Work** - For multi-file changes, write a plan and get approval.
5. **Archive Decisions** - Record why, not just what. Future you will thank you.

---

## Code Exploration Protocol (jcodemunch)

When Codex/Antigravity has `jcodemunch` available, prefer symbol-first exploration over broad file reads:

1. `get_repo_outline` if the area is unfamiliar.
2. `search_symbols` for named code (functions, classes, actions, routes, helpers).
3. `get_file_outline` before opening a large file.
4. `get_symbol` for the exact implementation you need.
5. `search_text` for strings, collection names, env vars, routes, and non-symbol clues.
6. `get_file_content` only when symbol-level context is not enough.

**Start with docs, then code:**
- Read `.agent/refs/agents/README.md` to find the right agent/domain owner.
- Load that agent's linked `IDENTITY.md`, `memory/architecture.md`, and `memory/patterns.md`.
- Use `jcodemunch` against the agent's primary path before reading whole files.

**Playbook actions example:**
- `search_symbols(query="createPlaybook")` -> `src/server/actions/playbooks.ts::createPlaybook#function`
- `search_symbols(query="updatePlaybookAssignmentConfig")` -> `src/server/actions/dispensary-playbooks.ts::updatePlaybookAssignmentConfig#function`
- `search_symbols(query="executePlaybook")` -> `src/app/api/cron/playbook-runner/route.ts::executePlaybook#function`
- Then load each implementation with `get_symbol(...)` instead of reading entire files.

If the repo is not indexed yet, run `index_folder` once, then follow the flow above.

---

## ðŸŽ¯ Decision Framework: When to Read Refs

| Situation | Action |
|-----------|--------|
| Simple bug fix in one file | Read the file, fix it, test |
| Touching agent code | Read `refs/agents/README.md` first, then load the relevant agent section |
| Touching auth/session | Read `refs/authentication.md` + `refs/roles.md` |
| Adding new integration | Read `refs/integrations.md` |
| Multi-file feature | Read relevant refs + `query_work_history` |
| Unsure where code lives | Use `jcodemunch` (`get_repo_outline` -> `search_symbols` -> `get_symbol`) |

**Rule of Thumb:** If you're about to touch a subsystem for the first time in a session, read its ref file.

---

## âš¡ Essential Commands

| Command | When to Use |
|---------|-------------|
| `npm run check:types` | Before starting work, after changes |
| `npm test` | After code changes |
| `npm test -- path/to/file.test.ts` | Test specific file |
| `npm run lint` | Before committing |
| `git push origin main` | Deploy (triggers Firebase App Hosting) |

**Shell Note:** Windows PowerShell â€” use `;` not `&&` for chaining.

---

## ðŸ“ Key Directories

```
src/server/agents/     # Agent implementations (linus.ts, smokey.ts, etc.)
src/server/grounding/  # Ground truth QA for pilot customers â­
src/server/services/   # Business logic (letta/, rtrvr/, ezal/)
src/server/tools/      # Agent tools (Genkit tool definitions)
src/server/actions/    # Server Actions ('use server')
src/app/api/           # API routes
src/components/        # React components
.agent/refs/           # Reference documentation (READ THESE)
dev/work_archive/      # Historical decisions and artifacts
```

---

## ðŸ“š Reference Files (Progressive Disclosure)

Only load these when needed to conserve context:

| When Working On... | Read This First |
|--------------------|-----------------|
| Agent logic | `refs/agents/README.md` |
| Slack Operations | `refs/slack-operations.md` |
| Infra & Gotchas | `refs/infrastructure-gotchas.md` |
| Memory/Letta | `refs/bakedbot-intelligence.md` |
| Browser automation | `refs/autonomous-browsing.md` |
| Auth/sessions | `refs/authentication.md` |
| RBAC/permissions | `refs/roles.md` |
| API routes | `refs/api.md` |
| Frontend/UI | `refs/frontend.md` |
| Testing | `refs/testing.md` |
| External APIs | `refs/integrations.md` |
| Playbooks | `refs/workflows.md` |
| Past decisions | `refs/work-archive.md` |
| Alleaves POS | `refs/alleaves-pos.md` |
| Pilot customer grounding | `src/server/grounding/` (inline docs) |
| QA Simulation (Dispensary) | `dev/testing/dispensary_owner_week_simulation.md` |
| QA Simulation (Brand) | `dev/testing/brand_owner_week_simulation.md` |
| QA Simulation (Grower) | `dev/testing/grower_owner_week_simulation.md` |
| QA Simulation (Super User) | `dev/testing/superuser_owner_week_simulation.md` |

Full index in `refs/README.md`.

---

## ðŸ”„ Standard Workflow

> See **Workflow Protocol** section above for the full 5-stage pipeline (Spec â†’ Build â†’ Self-Review â†’ Test/Eval â†’ Ship+Record).

---

## ðŸ›¡ï¸ Code Quality Rules

| Rule | Enforcement |
|------|-------------|
| TypeScript only | No `.js` files |
| Use `logger` from `@/lib/logger` | Never `console.log` |
| Prefer `unknown` over `any` | Explicit typing |
| Server mutations use `'use server'` | Server Actions pattern |
| Firestore: `@google-cloud/firestore` | Not client SDK |
| Wrap async in try/catch | Always handle errors |

---

## ðŸ§  Intelligence & Model Stack (Q1 2026 Update)

BakedBot AI utilizes the **Gemini 2.5** family for all core reasoning and creative tasks.

| Tier | Model ID | Purpose |
|------|----------|---------|
| **Standard** | `gemini-2.5-flash` | "Nano Banana" - Fast extraction, scraping (Ezal Team), and basic image generation. |
| **Advanced** | `gemini-2.5-flash` | High-throughput coordination and complex tool use. |
| **Expert** | `gemini-2.5-pro` | Strategic analysis and executive reasoning. |
| **Genius** | `gemini-2.5-pro` | Deep research, long-context evaluation, and "Max Thinking" mode. |

**Model Rules:**
1. **Scraping/Extraction**: Always use `gemini-2.5-flash` for high-volume data transformation.
2. **Creative/Image**: `fal.ai FLUX.1` for cannabis-friendly image generation (`FAL_API_KEY`).
3. **Reasoning**: Use `gemini-2.5-pro` for tasks requiring multi-step logical chain-of-thought.

---

## ðŸ•µï¸ Agent Squad (Quick Reference)

**Executive Boardroom (Super Users Only):**
- Leo (COO) â€” Operations, delegation
- Jack (CRO) â€” Revenue, CRM
- Linus (CTO) â€” Code eval, deployment
- Glenda (CMO) â€” Marketing, brand
- Mike (CFO) â€” Finance, billing

**Support Staff:**
- Smokey (Budtender) â€” Product recommendations, upsells
- Craig (Marketer) â€” Campaigns, SMS/Email, CRM segments, content generation
- Pops (Analyst) â€” Revenue analysis, segment trends
- Ezal (Lookout) â€” Competitive intel, pricing
- Deebo (Enforcer) â€” Compliance, campaign review
- Mrs. Parker (Retention) â€” CRM, win-back campaigns, loyalty, churn prevention
- Money Mike (CFO) â€” Profitability, campaign ROI, pricing strategy

> Full details: `refs/agents/README.md`

---

## ðŸ› ï¸ Engineering Agent Squad

> Specialized agents that build and maintain the codebase. All report to Linus. All governed by this prime.md â€” same workflow protocol, same golden set gates, same super powers.

**IDE Integration:** Engineering agents auto-load via directory-level `CLAUDE.md` files. Open any file in their domain and their full context is available automatically. No manual switching.

**Invocation:** Open a file in their domain, or explicitly: `Working as [Agent Name]. [task description]`

| Agent | Domain | Auto-loads from | Memory |
|-------|--------|-----------------|--------|
| **Inbox Mike** | `agent-runner.ts`, inbox artifacts, thread types, message pipeline | `src/app/dashboard/inbox/` | `.agent/engineering-agents/inbox-mike/` |
| **Onboarding Jen** | Brand guide wizard, settings pages, OrgProfile, brand extraction, slug mgmt | `src/app/dashboard/settings/` | `.agent/engineering-agents/onboarding-jen/` |
| **Sync Sam** | Alleaves POS sync, customer segmentation, spending index, cron data pipeline | `src/server/services/alleaves/` | `.agent/engineering-agents/sync-sam/` |
| **Creative Larry** | Creative Studio, fal.ai/FLUX.1 pipeline, brand image pre-gen, campaign templates | `src/app/dashboard/creative/` | `.agent/engineering-agents/creative-larry/` |
| **Brand Pages Willie** | Public brand/dispensary menus, ISR, proxy middleware, age gate, AI crawlers | `src/app/[brand]/` | `.agent/engineering-agents/brand-pages-willie/` |
| **Menu Maya** | Menu Command Center, products table, COGS, drag-reorder, staff guide | `src/app/dashboard/menu/` | `.agent/engineering-agents/menu-maya/` |
| **Campaign Carlos** | Campaign wizard, Craig tools, SMS/Email dispatch, Deebo gate, TCPA dedup | `src/app/dashboard/campaigns/` | `.agent/engineering-agents/campaign-carlos/` |
| **Loyalty Luis** | Loyalty dashboard, points engine, tier advancement, spending index | `src/app/dashboard/loyalty/` | `.agent/engineering-agents/loyalty-luis/` |
| **Intel Ivan** | Competitive intelligence, Ezal, CannMenus, Jina tools, weekly CI reports | `src/app/dashboard/intelligence/` | `.agent/engineering-agents/intel-ivan/` |
| **Platform Pat** | All 47+ cron endpoints, heartbeat, auto-escalation, Firebase App Hosting, secrets | `src/app/api/cron/` | `.agent/engineering-agents/platform-pat/` |
| **Security Soren** | Security hardening, auth/RBAC, prompt guards, secret hygiene, vulnerability response | `src/server/security/` | `.agent/engineering-agents/security-soren/` |
| **Playbook Pablo** | Playbook templates (23), Zapier trigger editor, execution cron, cron utilities | `src/app/dashboard/playbooks/` | `.agent/engineering-agents/playbook-pablo/` |
| **Drive Dana** | BakedBot Drive UI, file viewer/editor, AI Magic Button, Drive-inbox bridge | `src/app/dashboard/drive/` | `.agent/engineering-agents/drive-dana/` |
| **Delivery Dante** | Delivery dashboard, driver app, QR check-in, ETA calc, NY OCM compliance | `src/app/dashboard/delivery/` | `.agent/engineering-agents/delivery-dante/` |
| **Boardroom Bob** | CEO boardroom, executive agents (Leo/Linus/Jack), CRM, QA, morning briefing | `src/app/dashboard/ceo/` | `.agent/engineering-agents/boardroom-bob/` |

**Full roster + details:** `.agent/refs/agents/engineering-agents.md`

**Critical cross-domain rule:** Any change touching 2+ engineering agent domains requires Linus arbitration before implementation. File it as a cross-domain spec and tag both agents.

---

## ðŸ”Œ Key Integrations

| Service | Used By | Purpose |
|---------|---------|---------|
| Blackleaf | Craig, Campaign Sender | SMS campaigns + notifications |
| Mailjet/SendGrid | Craig, Campaign Sender | Email campaigns + notifications |
| CannMenus | Ezal | Live pricing |
| Alpine IQ | Mrs. Parker | Loyalty |
| Authorize.net | Money Mike | Payments |
| CannPay | Smokey Pay | Debit payments |
| FCM | Agent Notifier | Push notifications |
| fal.ai FLUX.1 | Creative Studio | Cannabis-friendly image generation |
| Alleaves | Thrive POS | Menu sync, order data |

> Full details: `refs/integrations.md`

---

## âš ï¸ Common Pitfalls

| Pitfall | Prevention | Super Power |
|---------|------------|-------------|
| Editing code without reading it | Always use Read tool first | â€” |
| Skipping build check | Run `npm run check:types` before and after | â€” |
| Build errors piling up | Auto-fix first, then manual review | **SP6** `fix:build --apply` |
| Large changes without plan | Break into smaller increments | â€” |
| Forgetting to archive | Use `archive_work` after significant changes | â€” |
| Assuming file structure | Use Glob/Grep to verify | â€” |
| Data integrity issues | Validate schemas and cross-org consistency | **SP3** + **SP9** |
| Security gaps in new routes | Run role-based access control tests | **SP7** `test:security` |
| Expensive queries shipping | Check query cost before/after changes | **SP11** `audit:costs` |
| Using `&&` in PowerShell | Use `;` instead | â€” |
| Runtime-only env vars at module level | Use lazy initialization (see Next.js Build Gotcha below) | â€” |
| Using `latest` for secrets in apphosting.yaml | **Always use explicit version numbers** (e.g. `@6`) | **SP2** `setup:secrets` |

### Firebase Secret Manager Gotcha: Explicit Version Numbers Required

**Problem:** Firebase App Hosting's preparer step resolves secrets during build time. The preparer requires `secretmanager.versions.get` permission to resolve the `latest` alias â€” which is different from the runtime accessor permission.

**Solution: Always Use Explicit Version Numbers**

âŒ **BAD** (implicit `latest`):
```yaml
- variable: CANPAY_APP_KEY
  secret: CANPAY_APP_KEY
```

âœ… **GOOD** (explicit version):
```yaml
- variable: CANPAY_APP_KEY
  secret: CANPAY_APP_KEY@1
```

**When Creating New Secrets:**
```powershell
# Create + populate
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=- --project=studio-567050101-bc6e8
# Grant access
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=bakedbot-prod
# Reference in apphosting.yaml as SECRET_NAME@1
```

**Diagnosing existing secrets (before adding to apphosting.yaml):**
```bash
# 1. Check which secrets exist
gcloud secrets list --project=studio-567050101-bc6e8

# 2. Check if a specific secret has versions
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8
# "Listed 0 items." â†’ add a version. Shows "1 enabled" â†’ just need IAM grant.

# 3. Grant IAM (even if secret already exists)
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=bakedbot-prod
```

**Reading a secret value when you only have the service account (not user creds):**
The firebase-adminsdk service account does NOT have `secretmanager.versions.access`. Two workarounds:
- For `NEXT_PUBLIC_*` secrets (already public): read from `.env.local` via Node.js:
  ```bash
  node -e "const fs=require('fs'); const lines=fs.readFileSync('.env.local','utf8').split(/\r?\n/); console.log(lines.find(l=>l.startsWith('MY_VAR')).split('=').slice(1).join('='));"
  ```
- For other secrets: use `gcloud auth login` (user account) or grant the service account `roles/secretmanager.secretAccessor`

**Placeholder strategy for optional features:**
When a feature is optional (code already handles missing key gracefully), create a placeholder secret to prevent `fah/misconfigured-secret` build failure:
```bash
echo -n "PLACEHOLDER_ADD_REAL_KEY" | gcloud secrets create OPTIONAL_API_KEY --data-file=- --project=studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess OPTIONAL_API_KEY --backend=bakedbot-prod
# Feature silently no-ops at runtime; replace with real key when ready
```

### Firebase App Hosting URL Gotcha: NOT `.web.app`

**Problem:** Firebase App Hosting uses a different URL format than traditional Firebase Hosting.

**Wrong URL:** `https://bakedbot-prod.web.app` (404 - Site Not Found)
**Correct URL:** `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app`

**Format:** `https://{backend}--{project}.{region}.hosted.app`

**Impact:**
- All test scripts must use the correct App Hosting URL
- Cloud Scheduler cron jobs must target the App Hosting URL
- API calls from external services must use the App Hosting URL

**Example Fix:**
```typescript
// âŒ BAD
const BASE_URL = 'https://bakedbot-prod.web.app';

// âœ… GOOD
const BASE_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
```

### Next.js Build Gotcha: Runtime-Only Environment Variables

**Problem:** Next.js evaluates modules at build time. SDKs initialized with runtime secrets at module scope will fail the build even with `export const dynamic = 'force-dynamic'`.

**Solution: Lazy Initialization**
```typescript
// âœ… GOOD: Lazy initialization that's build-safe
let _ai: Genkit | null = null;

function getAiInstance(): Genkit {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[Genkit] API key required');
  _ai = genkit({ plugins: [googleAI({ apiKey })] });
  return _ai;
}
```

**Real-World Example:** `src/ai/genkit.ts`

### Security Gotchas (Q1 2026 Audit)

| Gotcha | Correct Pattern |
|--------|-----------------|
| **Missing API auth** | Always use `requireUser()` or `requireSuperUser()` for API routes |
| **Trusting request body userId** | Get userId from `session.uid`, never from request body |
| **IDOR on org access** | Always verify org membership before operating on org data |
| **Dev routes in production** | Gate with `if (process.env.NODE_ENV === 'production') return 403` |
| **Optional CRON_SECRET** | Always check `if (!cronSecret) return 500` before auth check |
| **Prompt injection** | Sanitize user data + wrap in `<user_data>` tags |
| **Using `console.log`** | Use `logger` from `@/lib/logger` instead |
| **Hardcoded credentials** | **NEVER** hardcode credentials. Use `process.env` or external secrets. |

**Authentication Patterns:**
```typescript
// For Super User operations (admin, cron jobs, sensitive data)
import { requireSuperUser } from '@/server/auth/auth';
await requireSuperUser();

// For authenticated user operations
import { requireUser } from '@/server/auth/auth';
const session = await requireUser();
const userId = session.uid; // Always use this, not request body

// For org-scoped operations
const hasAccess = await verifyOrgMembership(session.uid, orgId);
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

**Cron Route Pattern:**
```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  logger.error('CRON_SECRET environment variable is not configured');
  return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
}
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## ðŸš€ Auto-Approved Operations & Agent Autonomy (2026-02-20)

### Claude Code
**Explicit permission:** Execute these autonomously:
- Cloud Scheduler job creation/modification/execution
- Backfill commands (`POST /api/cron/backfill-*`)
- Cron job triggers (`POST /api/cron/*`)
- Deployments (`git push origin main` â€” after build pass)
- Service account setup (IAM operations)

### Linus (CTO Agent) â€” FULL AUTONOMY GRANTED
**See `.agent/LINUS_CTO_AUTONOMY.md` for comprehensive charter**

**CTO Powers:**
- âœ… Push code to production (`git push`)
- âœ… Auto-revert failed deployments (< 2 min SLA)
- âœ… Create/manage Cloud Scheduler cron jobs
- âœ… Fix production incidents autonomously
- âœ… Real-time Slack + dashboard reporting
- âœ… Infrastructure automation (service accounts)

**Safety Mechanisms:**
- Build validation gate (must pass before push)
- Destructive ops require human approval (critical jobs, secrets)
- Full audit trail (Firestore `linus-audit` collection)
- Hive Mind learning (Letta memory prevents recurrence)
- Incident auto-recovery (2-minute response SLA)

---

## ðŸ› ï¸ DevOps & Operational Awareness

> Every agent should understand the production infrastructure they operate within.

### Deployment Architecture
```
git push origin main â†’ GitHub Actions CI â†’ Firebase App Hosting â†’ Cloud Run (0-10 auto-scaling instances)
Build: npm test â†’ tsup (embed widget) â†’ next build --webpack â†’ Firebase deploy --force
URL: https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app
```

### Monitoring Stack
| Layer | Tool | Frequency | What It Checks |
|-------|------|-----------|----------------|
| Synthetic | k6 (GitHub Actions) | Every 15 min | /api/health, /thrivesyracuse, /llm.txt â€” SLA: p95 < 600ms |
| Heartbeat | Pulse system | Every 10 min | 60+ domain-specific checks (POS, inventory, loyalty, compliance) |
| System Health | Cron job | Every 30 min | Memory, CPU, latency, error rates, DB connectivity |
| Agent Telemetry | Firestore | Per invocation | Token usage, tool calls, latency, cost, capability utilization |
| Error Tracking | Sentry | Real-time | Client + server errors, session replays |

### Active Cron Jobs (47 endpoints)
Key schedules: POS sync (30 min), loyalty sync (daily 2 AM), playbook execution (daily + weekly), system health (30 min), pricing alerts, usage alerts, QA smoke tests.

### Alert Escalation Path
```
Cloud Monitoring alert â†’ Slack #infrastructure
  â†“ (if P0/P1)
Auto-escalator â†’ QA bug filed â†’ Linus auto-dispatched â†’ Slack #linus-incidents
  â†“ (if unresolved > 2 min)
Human escalation
```

### Agent Incident Runbooks
**Location:** `.agent/runbooks/agent-incidents.md`

Covers: hallucinated tools, infinite loops, cost spikes, forgetting super powers, quality degradation, cross-agent failures.

### Agent SLOs
**Location:** `.agent/specs/agent-slos.md`

Key targets: Linus P95 < 30s, error rate < 2%, super power utilization > 15%. Craig compliance > 99%. Smokey recommendation P95 < 5s.

### Cost Awareness
- Sonnet 4.5: $3/M input, $15/M output (default for all agents)
- Opus 4.5: $15/M input, $75/M output (auto-routed for strategic tasks only)
- Daily budget: $200 total across all agents
- Track via: `agent_telemetry` collection (costEstimateUsd field)
- Alert at: $50/day per agent, $200/day total

---

*This context loads automatically. For domain-specific details, consult `.agent/refs/`. For Linus full details, load `.agent/LINUS_CTO_AUTONOMY.md`. For session history, see `memory/MEMORY.md` and `dev/work_archive/`.*



