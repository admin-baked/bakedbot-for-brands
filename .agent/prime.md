# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves."

---

## 🚨 PRIORITY ZERO: Build Health

Before ANY work, verify the build is healthy:

```powershell
npm run check:types
```

| If Build Is... | Action |
|----------------|--------|
| 🟢 **Passing** | Proceed with task |
| 🔴 **Failing** | STOP. Fix build errors FIRST. No exceptions. |

**Current Status:** 🟢 Passing — Brand Guide magic buttons + video providers live; settings 500 fixed.
**Recent work (2026-03-24):** Brand Guide fixes + magic buttons + tier-aware model (`6a3f9c75f`), fal.ai Kling/Wan + Remotion wired (`6b76554e8`), settings 500 fix (`abda7d8e2`).

## 🚨 SECURITY GOTCHA: Never Commit These Files

**Triggered 2026-03-18** — GitHub secret scanning found 14 exposed secrets. Required full git history rewrite + force push.

**NEVER commit these files:**
| File | Why |
|------|-----|
| `.env` | Contains real API keys — use `.env.local` instead (already gitignored) |
| `service-account.json` | GCP service account private key |
| `PRODUCTION_SETUP.md` | Contained SendGrid + GCP keys in plain text |
| `.codex-firebase-deploy.{out,err}.log` | Firebase deploy output includes API keys |
| `.claude/settings.local.json` | Claude Code local settings can include tokens |

**All 5 are now in `.gitignore`.** If you see a GitHub secret scanning alert:
1. Rotate the exposed credential immediately (GCP Console / SendGrid / etc.)
2. Run `git filter-branch` to scrub history (see session 2026-03-18 in MEMORY.md)
3. `git push origin main --force-with-lease`
4. Dismiss alerts via `gh api --method PATCH repos/admin-baked/bakedbot-for-brands/secret-scanning/alerts/$id -f state=resolved -f resolution=revoked`

## Session 2026-03-20 (Smokey Budtender Production Fix)
**Recent work (2026-03-20):** See `memory/MEMORY.md` for full log.
Key completed: [Smokey "yes"→checkout + menu search fix] (`2d52f6e16`)

## Session 2026-03-12 (Playbook artifact repo + runtime memory layer)
- **Artifact repo path made real**: Playbook V2 now persists spec snapshots, run manifests, failure artifacts, approval records, delivery manifests, and `summary_for_ai_engineers.md` through the shared artifact runtime. Runtime writes go to blob storage + Firestore metadata + the dedicated Git repo `admin-baked/bakedbot-artifacts-prod` when App Hosting is running with the new repo env/secret config.

## Session 2026-03-12 (Gmail tool send restored)
- **Connected Gmail dispatch restored** (`30505c5a3`, `3222c9933`): confirmed SendGrid fallback was still failing live sends, enabled `gmail.googleapis.com` on `studio-567050101-bc6e8`, replaced the brittle Gmail send path with direct Gmail REST bearer auth, normalized refresh-token persistence, and verified `sendGenericEmail()` succeeds with Mailjet/SendGrid disabled

## Session 2026-03-11 (CRM outreach gap fixed + MI/IL expansion)
- **Multi-state outreach deployed** (`8cf0a4b53`): synced `crm_dispensaries` into the outreach queue, hardened dashboard partial-load behavior + Gmail token status, added missing outreach indexes, and expanded proactive outreach from NY-only to CRM-first NY/MI/IL with queue enrichment + updated CEO copy/templates

## Session 2026-03-09 (Slack routing fully live)
- **Slack routing deployed** (`d6bb69f94`, `38f20deca`, `3c687cf25`): `channels:read` scope + reinstall; `SLACK_BOT_TOKEN@4`; GCP billing linked — service accounts can now write to Secret Manager

## Session 2026-03-08 (Smokey Budtender Audit + Golden Eval 100%)
- **Smokey audit** (`917f6deb`): P0 conv history, P0 carousel tool, P1 preset gating, P1 maxIterations, P2 YouTube tools, P2 golden set 27→41 cases
- **Golden eval** (`cf822b224`): 41/41 pass (100%) — eval system prompt, retry logic, compliance rule templates (`4e7ae5e83`)

Status: Build passing, pushed to production

## Session 2026-03-06 (GLM controls, security docs, and proxy hardening)
- **Claude allowlists** - Normalized local Claude settings allowlists to remove bloated startup state and keep tool permissions deterministic (`6f04200ee`)
- **Security Soren registration** - Added security agent guidance, golden set references, and server security docs (`2ae78a0b4`)
- **CEO GLM controls** - Added GLM usage controls and tracking in the CEO dashboard (`17186202a`, `360cabc76`)
- **WordPress proxy hardening** - Locked the public proxy to the configured Andrews origin and removed debug leakage from public errors (`1aa587cb2`)

Status: Shippable subset committed locally

## Session 2026-03-05 (Firestore undefined handling fixes)
- **Exec proactive check** — Fixed Firestore undefined value errors (`emailDigest ?? undefined` → `null`, `startTime` as string not Date)
- **Morning briefing** — Added Error message handling for rejected promises (`result.reason instanceof Error` extraction)
- **Firestore settings** — Enabled `ignoreUndefinedProperties: true` to skip undefined fields globally

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Status: 🟢 Both crons deployed and working

---

## 🔍 Code Exploration Strategy by Agent/Environment

Use the right exploration tool for your context. Wrong choice = wasted tokens or missed symbols.

### Claude Code (Browser) — jcodemunch by Default

When running in **Claude Code on the web**, use jcodemunch MCP tools as the default strategy for code exploration — before falling back to Read/Grep on large files.

**Why:** jcodemunch indexes the repo via AST parsing and returns only the symbols you need, rather than loading entire files.

| Approach | Tokens Used | Example |
|----------|------------|---------|
| `Read` entire service file | ~3,800 tokens | Reading all of `linus.ts` to find one function |
| `mcp__jcodemunch__get_symbol` | ~700 tokens | Fetching just `LinusAgent.evaluateCode` |
| **Savings** | **~80% fewer tokens** | 5.5× improvement per lookup |

**Session startup:** Call `index_repo` once at the start of a browser session (index is **not** cached across sessions like it is in local CLI).

```
mcp__jcodemunch__index_repo → then search_symbols / get_symbol / get_file_outline
```

**Fallback to Read/Grep** only for: config files, small files (<100 lines), or when you need full file context.

### Claude Code (IDE / Local CLI) — jcodemunch, Skip Re-index

Same MCP tools are available. Key difference: **the index persists across sessions** — do not call `index_repo` at session start unless files have changed significantly (e.g., after a large merge or scaffold run).

```
# Only re-index when needed:
mcp__jcodemunch__invalidate_cache → mcp__jcodemunch__index_repo
# Otherwise go straight to:
search_symbols / get_symbol / get_file_outline
```

### Codex / Gemini / Other Agents (No jcodemunch)

These agents do not have jcodemunch MCP access. Use native search tools with discipline:

| Task | Tool | Rule |
|------|------|------|
| Find a symbol/function | `Grep` with class/function pattern | e.g., `grep -r "evaluateCode" src/` |
| Understand a file's shape | `Read` with `offset` + `limit` | Read first 60 lines for imports/exports, then jump to the function |
| Explore a directory | `Glob` | Prefer over `ls -R` |
| Avoid | `Read` on files >200 lines without offset | Loads entire file — wasteful |

**Rule of thumb:** Never read a file >200 lines in full without a targeted offset. Use Grep first to find the line, then Read ±30 lines around it.

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
| SP6 | Build Error Fixer | `npm run fix:build --apply` | Auto-fix common TypeScript errors (import paths, console→logger) |
| SP7 | Security Tester | `npm run test:security` | Run 12 role-based access control scenarios |
| SP8 | Compliance Gater | `npm run check:compliance --text "..."` | Check content for medical claims, minors protection |
| SP9 | Consistency Checker | `npm run audit:consistency --orgId=...` | Validate org relationships and data integrity |
| SP10 | Monitoring Setup | `npm run setup:monitoring --deploy` | Configure Cloud Monitoring alerts for production |
| SP11 | Cost Analyzer | `npm run audit:costs` | Identify expensive Firestore queries |

**Quick-fire guide — when you're stuck:**
- Build broken? → **SP6** `npm run fix:build --apply` then `npm run check:types`
- Data looks wrong? → **SP3** `npm run audit:schema` + **SP9** `npm run audit:consistency`
- Need test data? → **SP4** `npm run seed:test`
- Security concern? → **SP7** `npm run test:security`
- Content compliance? → **SP8** `npm run check:compliance --text "..."`
- Slow queries? → **SP11** `npm run audit:costs`
- New scaffold needed? → **SP5** `npm run generate:component|action|route|cron <name>`

**Notes:** All scripts use `.env.local` for auth. SP8 requires `CLAUDE_API_KEY`. SP4 creates `org_test_bakedbot` (use `--clean` to reset).

---

## Workflow Protocol

**Every task follows this pipeline. No shortcuts. No exceptions.**

> **The AI Engineer Flow:**
> `Prompt → PRD (human strategy doc) → AI-Executable Spec (implementation contract) → Build → Review → QA`
> The PRD captures the *why*. The Spec captures the *exactly what and how* — every decision pre-made.

---

### Stage 0: PRD (Product Requirements Document)

On receiving any non-trivial task prompt, FIRST produce a **PRD** — a human-readable strategy document:

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
- If ANY boundary trigger fires (auth, payments, schema, cost, prompts, compliance, new integrations) → PRD required, no skip allowed.

**PRD sign-off unlocks Stage 1.** The PRD becomes the permanent record of intent and lives in `dev/prds/YYYY-MM-DD-feature-name.md`.

---

### Stage 1: AI-Executable Spec (Implementation Contract)

Convert the approved PRD into an **AI-Executable Spec** using `.agent/spec-template.md`.

**This spec is NOT for humans — it is an execution contract for an AI engineer.** Every decision must be pre-made. No ambiguity. No "use your judgment." Linus reads this and builds it exactly as written.

**AI-Executable Spec must specify (exactly):**
- **Exact file paths** for every file created or modified (e.g., `src/server/actions/qa.ts`, `src/types/qa.ts`)
- **Exact Firestore field names and types** for every doc written or read (e.g., `regressionOf?: string`, `isRegression?: boolean`, `updatedAt: Timestamp`)
- **Exact component names** and their props interface (e.g., `<RegressionBadge bugId={string} area={QABugArea} />`)
- **Exact function signatures** with parameter types and return types (e.g., `getRegressionHistory(area: QABugArea): Promise<QABug[]>`)
- **Exact test cases** with literal inputs and expected outputs (e.g., `getRegressionHistory('brand_guide') → QABug[] where every item has status in ['verified','closed','fixed']`)
- **Exact prompt templates** for any agent injection (full text, not summaries)
- **Exact API contracts** — HTTP method, path, request body shape, response shape, error codes
- **Exact Firestore index definitions** — collectionGroup, fields, order, queryScope

**Spec rules:**
- Present spec to human. **Wait for explicit approval before writing any code.**
- If trivial task (< 20 lines, single file, no boundary triggers) → mini-spec inline:
  ```
  Mini-spec: [what] → [why] → [exact files] → [exact test inputs+outputs] → [rollback: revert commit]
  ```
- Boundary trigger → full AI-Executable Spec, no mini-spec.

---

### Stage 2: Build
Implement strictly within the approved spec scope.
- Write code + tests + logging in one pass.
- Follow Constitution §II (clean code, error handling, types, structured logs).
- Do not modify files outside the spec. Do not add unplanned dependencies.

### Stage 3: Self-Review
Run every item in `.agent/review-checklist.md` against your own work.
- Report the checklist results before committing.
- If any critical failure → stop and report. Do not commit.
- If minor issues → fix them, then re-run the checklist.

### Stage 4: Test & Eval
- Run the full test suite. Report results (pass/fail counts).
- If this task touched LLM prompts or agent behavior → run the relevant golden set eval from `.agent/golden-sets/`.
  - Smokey changes → `smokey-qa.json` (target: ≥90% overall, 100% compliance)
  - Craig changes → `craig-campaigns.json`
  - Deebo changes → `deebo-compliance.json`
- Report eval scores. If below threshold → do not commit. Iterate.

### Stage 5: Ship + Record
Only after Stages 0-4 are complete:

#### 🔍 Pre-Push Quality Gate (MANDATORY — runs automatically after all code work)

> **⚠️ AUTO-SIMPLIFY PROTOCOL: After completing ANY code modifications, ALL agents MUST run `/simplify` before committing. This is not optional. It applies to Antigravity, Claude Code, Linus (Slack), and every engineering agent.**

Run `/simplify` OR execute the three review agents in parallel manually:

```
Launch all three agents in a single message (parallel):

Agent 1 — Code Reuse Review
  "You are doing a CODE REUSE review of the following git diff.
   Find places where newly written code duplicates existing utilities
   or could use existing helpers. Search for existing utilities that
   could replace newly written code. Flag any new function that
   duplicates existing functionality. Flag inline logic that could
   use an existing utility (hand-rolled string manipulation, manual
   path handling, custom env checks, ad-hoc type guards).
   Diff: [paste git diff]"

Agent 2 — Code Quality Review
  "You are doing a CODE QUALITY review of the following git diff.
   Find: redundant state, parameter sprawl, copy-paste with slight
   variation, leaky abstractions, stringly-typed code, unnecessary
   JSX nesting.
   Diff: [paste git diff]"

Agent 3 — Efficiency Review
  "You are doing an EFFICIENCY review of the following git diff.
   Find: unnecessary work, missed concurrency (sequential ops that
   could be parallel), hot-path bloat, recurring no-op updates,
   unnecessary existence checks, memory leaks, overly broad reads.
   Diff: [paste git diff]"
```

Wait for all three agents to complete. Fix every confirmed finding before proceeding to commit.

1. **Commit** with structured message (see review-checklist.md for format).
2. **Push to GitHub** — `git push origin main` **triggers Firebase App Hosting deployment to production**. Always push after committing finished work.
4. **Open a PR with full governance** — required on every branch push (PRs targeting `main` or `develop` trigger the governance bot):
   ```bash
   gh pr create --title "<title>" --body "$(cat <<'EOF'
   # Summary
   <bullet points of what changed>

   # Risk Tier
   - [ ] Tier 0 — Low Risk
   - [ ] Tier 1 — Moderate Risk
   - [ ] Tier 2 — High Risk
   - [ ] Tier 3 — Critical Risk

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
   # Then add the risk label (required — governance bot fails without it):
   gh pr edit <number> --add-label "risk:tier0"  # or tier1/tier2/tier3
   ```
   **Risk label must always be set** — the governance check fails with 0 labels.
5. Update `CLAUDE.md` line 15 — build status one-liner.
6. Update `prime.md` recent work block — prepend new entry (commit hash + one-liner).
7. Update `memory/MEMORY.md` — full session details, gotchas, decisions.
8. Route to topic files if applicable (`memory/platform.md`, `memory/agents.md`, etc.).
9. If feature-flagged → note flag name and canary status.

### Escape Hatches
- **Hotfix (production down):** Skip Stages 0-1. Implement fix, run Stages 3-4, commit with `hotfix()` prefix. File retroactive PRD + spec within same session.
- **Docs-only change:** Skip Stages 1-4. Commit directly with `docs()` prefix.
- **Exploration/spike:** Produce PRD marked `status: 🔬 Spike`. Code is throwaway. Do not merge to main without promoting to full PRD → Spec → Build flow.

### 🐛 Bug Workflow (Auto-triggered on ANY mention of a bug, broken feature, or unexpected behavior)

When the user says anything like "X is broken", "X isn't working", "X still broken", "bug in X", "fix X" — execute this automatically, no extra prompting needed:

**Step 1 — Triage (30 seconds)**
Determine priority based on impact:
- **P0** — Production down, data loss, security breach, payment failure
- **P1** — Core feature broken for a paying customer (e.g., Thrive can't onboard)
- **P2** — Feature degraded but workaround exists
- **P3** — Minor UI issue, cosmetic, non-blocking

**Step 2 — File the bug (immediate)**
Write directly to Firestore `qa_bugs` collection via Admin SDK script:
```typescript
{ id, title, steps[], expected, actual, rootCause, priority, area,
  status: 'open', environment: 'production', affectedOrgId, reportedBy: 'claude-code',
  createdAt, updatedAt }
```
P0/P1 bugs trigger Slack notification automatically via `qa-notifications.ts`.

**Step 3 — Fix immediately**
- Read the broken component/action/service
- Identify root cause
- Apply fix
- Commit + push to production

Do NOT wait for the user to say "P1" or "file a bug first" — triage, file, and fix in one pass.

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
Key completed: [Wallet passes + Slack loyalty alerts] (`d1acc0eef`), [Sandbox code artifact + VM run] (`9e924f109`)

---

## 🔒 SECURITY RULE: NEVER HARDCODE SECRETS

**Secrets in code = blocked push + rotated credentials.** It happened (Slack webhook, 2026-02-17).

### The Complete 3-Step Pattern (ALL steps required):
```bash
# STEP 1: Create secret AND populate it (one command does both)
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# If secret already exists but has 0 versions (will also cause build failure!):
echo -n "secret-value" | gcloud secrets versions add SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# STEP 2: Grant Firebase access (Firebase CLI ONLY — not raw gcloud)
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=bakedbot-prod

# STEP 3: Reference in apphosting.yaml — then push to deploy
```
```yaml
- variable: MY_SECRET
  secret: MY_SECRET          # ✅ Correct
  availability: [RUNTIME]

- variable: MY_SECRET
  value: "actual-secret"     # ❌ NEVER DO THIS
```
```typescript
// In code: always from env
const webhookUrl = process.env.SLACK_WEBHOOK_URL;
// In scripts: env var with fallback
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
```

### 🚨 Preparer-Step Failures (Build-Blocking)
When a secret is referenced in `apphosting.yaml` but is misconfigured, Firebase fails at the **preparer step** — before any compilation — blocking ALL deployments with `fah/misconfigured-secret`.

**Three causes, same error:**
1. Secret doesn't exist in Secret Manager
2. Secret exists but has **0 versions** (empty container — `gcloud secrets versions list` shows "Listed 0 items.")
3. Secret exists with data but no Firebase IAM binding

**Quick diagnostic:**
```bash
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8
# "Listed 0 items." → add a version (step 1 above)
# Shows version(s) → run firebase apphosting:secrets:grantaccess (step 2)
```

See `.agent/refs/firebase-secrets.md` for full pattern, debugging checklist, and version management.

---

## 🆕 Super User Onboarding

### Promoting New Super Users to Admin Access
**Status:** ✅ Two-Script Solution — UID-based (recommended) + Email-based (backup)

**Method 1: UID-Based (Recommended)** ✅
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
1. Firebase Console → Authentication → Users → Click user → Copy UID
2. Browser DevTools → Application → Local Storage → `firebase:authUser:...`

**After Promotion:** User must re-login → auto-routed to `/dashboard/ceo` → full access to 28 agent tools.

---

## 🗂️ Completed Systems (Quick Reference)

> Architecture docs: `.agent/refs/` | Production specs (acceptance criteria + gaps): `.agent/specs/`

| System | Status | Key Ref | Production Spec |
|--------|--------|---------|----------------|
| Campaign System (Craig) | ✅ SMS+Email+Deebo gate | `refs/agents/behavioral-agents.md` | `specs/tier1-campaign-system.md` |
| Compliance (Deebo) | ✅ NY/CA/IL rules + monitor | `refs/agents/behavioral-agents.md` | `specs/tier1-compliance-deebo.md` |
| Public Menu Pages | ✅ Brand + Dispensary + ISR | `refs/pages-brand.md` | `specs/tier1-public-menu-pages.md` |
| Pilot Customers | ✅ Thrive (US) + Herbalist Samui (🇹🇭 INT'L) | `memory/customers.md` + `HERBALIST_SAMUI_SETUP.md` | — |
| International ISR Pages | ✅ Thailand/Koh Samui live | `src/app/destination/` | — |

---

## 🧭 Core Principles

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

## 🎯 Decision Framework: When to Read Refs

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

## ⚡ Essential Commands

| Command | When to Use |
|---------|-------------|
| `npm run check:types` | Before starting work, after changes |
| `npm test` | After code changes |
| `npm test -- path/to/file.test.ts` | Test specific file |
| `npm run lint` | Before committing |
| `git push origin main` | Deploy (triggers Firebase App Hosting) |

**Shell Note:** Windows PowerShell — use `;` not `&&` for chaining.

---

## 📁 Key Directories

```
src/server/agents/     # Agent implementations (linus.ts, smokey.ts, etc.)
src/server/grounding/  # Ground truth QA for pilot customers ⭐
src/server/services/   # Business logic (letta/, rtrvr/, ezal/)
src/server/tools/      # Agent tools (Genkit tool definitions)
src/server/actions/    # Server Actions ('use server')
src/app/api/           # API routes
src/components/        # React components
.agent/refs/           # Reference documentation (READ THESE)
dev/work_archive/      # Historical decisions and artifacts
```

---

## 📚 Reference Files (Progressive Disclosure)

Only load these when needed to conserve context:

| When Working On... | Read This First |
|--------------------|-----------------|
| Agent logic | `refs/agents/README.md` |
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

Full index in `refs/README.md`.

---

## 🔄 Standard Workflow

> See **Workflow Protocol** section above for the full 5-stage pipeline (Spec → Build → Self-Review → Test/Eval → Ship+Record).

---

## 🛡️ Code Quality Rules

| Rule | Enforcement |
|------|-------------|
| TypeScript only | No `.js` files |
| Use `logger` from `@/lib/logger` | Never `console.log` |
| Prefer `unknown` over `any` | Explicit typing |
| Server mutations use `'use server'` | Server Actions pattern |
| Firestore: `@google-cloud/firestore` | Not client SDK |
| Wrap async in try/catch | Always handle errors |

---

## 🧠 Intelligence & Model Stack (Q1 2026 Update)

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

## 🕵️ Agent Squad (Quick Reference)

**Executive Boardroom (Super Users Only):**
- Leo (COO) — Operations, delegation
- Jack (CRO) — Revenue, CRM
- Linus (CTO) — Code eval, deployment
- Glenda (CMO) — Marketing, brand
- Mike (CFO) — Finance, billing

**Support Staff:**
- Smokey (Budtender) — Product recommendations, upsells
- Craig (Marketer) — Campaigns, SMS/Email, CRM segments, content generation
- Pops (Analyst) — Revenue analysis, segment trends
- Ezal (Lookout) — Competitive intel, pricing
- Deebo (Enforcer) — Compliance, campaign review
- Mrs. Parker (Retention) — CRM, win-back campaigns, loyalty, churn prevention
- Money Mike (CFO) — Profitability, campaign ROI, pricing strategy

> Full details: `refs/agents/README.md`

---

## 🛠️ Engineering Agent Squad

> Specialized agents that build and maintain the codebase. All report to Linus. All governed by this prime.md — same workflow protocol, same golden set gates, same super powers.

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

## 🔌 Key Integrations

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

## ⚠️ Common Pitfalls

| Pitfall | Prevention | Super Power |
|---------|------------|-------------|
| Editing code without reading it | Always use Read tool first | — |
| Skipping build check | Run `npm run check:types` before and after | — |
| Build errors piling up | Auto-fix first, then manual review | **SP6** `fix:build --apply` |
| Large changes without plan | Break into smaller increments | — |
| Forgetting to archive | Use `archive_work` after significant changes | — |
| Assuming file structure | Use Glob/Grep to verify | — |
| Data integrity issues | Validate schemas and cross-org consistency | **SP3** + **SP9** |
| Security gaps in new routes | Run role-based access control tests | **SP7** `test:security` |
| Expensive queries shipping | Check query cost before/after changes | **SP11** `audit:costs` |
| Using `&&` in PowerShell | Use `;` instead | — |
| Runtime-only env vars at module level | Use lazy initialization (see Next.js Build Gotcha below) | — |
| Using `latest` for secrets in apphosting.yaml | **Always use explicit version numbers** (e.g. `@6`) | **SP2** `setup:secrets` |

### Firebase Secret Manager Gotcha: Explicit Version Numbers Required

**Problem:** Firebase App Hosting's preparer step resolves secrets during build time. The preparer requires `secretmanager.versions.get` permission to resolve the `latest` alias — which is different from the runtime accessor permission.

**Solution: Always Use Explicit Version Numbers**

❌ **BAD** (implicit `latest`):
```yaml
- variable: CANPAY_APP_KEY
  secret: CANPAY_APP_KEY
```

✅ **GOOD** (explicit version):
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
# "Listed 0 items." → add a version. Shows "1 enabled" → just need IAM grant.

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
// ❌ BAD
const BASE_URL = 'https://bakedbot-prod.web.app';

// ✅ GOOD
const BASE_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
```

### Next.js Build Gotcha: Runtime-Only Environment Variables

**Problem:** Next.js evaluates modules at build time. SDKs initialized with runtime secrets at module scope will fail the build even with `export const dynamic = 'force-dynamic'`.

**Solution: Lazy Initialization**
```typescript
// ✅ GOOD: Lazy initialization that's build-safe
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

## 🚀 Auto-Approved Operations & Agent Autonomy (2026-02-20)

### Claude Code
**Explicit permission:** Execute these autonomously:
- Cloud Scheduler job creation/modification/execution
- Backfill commands (`POST /api/cron/backfill-*`)
- Cron job triggers (`POST /api/cron/*`)
- Deployments (`git push origin main` — after build pass)
- Service account setup (IAM operations)

### Linus (CTO Agent) — FULL AUTONOMY GRANTED
**See `.agent/LINUS_CTO_AUTONOMY.md` for comprehensive charter**

**CTO Powers:**
- ✅ Push code to production (`git push`)
- ✅ Auto-revert failed deployments (< 2 min SLA)
- ✅ Create/manage Cloud Scheduler cron jobs
- ✅ Fix production incidents autonomously
- ✅ Real-time Slack + dashboard reporting
- ✅ Infrastructure automation (service accounts)

**Safety Mechanisms:**
- Build validation gate (must pass before push)
- Destructive ops require human approval (critical jobs, secrets)
- Full audit trail (Firestore `linus-audit` collection)
- Hive Mind learning (Letta memory prevents recurrence)
- Incident auto-recovery (2-minute response SLA)

---

## 🛠️ DevOps & Operational Awareness

> Every agent should understand the production infrastructure they operate within.

### Deployment Architecture
```
git push origin main → GitHub Actions CI → Firebase App Hosting → Cloud Run (0-10 auto-scaling instances)
Build: npm test → tsup (embed widget) → next build --webpack → Firebase deploy --force
URL: https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app
```

### Monitoring Stack
| Layer | Tool | Frequency | What It Checks |
|-------|------|-----------|----------------|
| Synthetic | k6 (GitHub Actions) | Every 15 min | /api/health, /thrivesyracuse, /llm.txt — SLA: p95 < 600ms |
| Heartbeat | Pulse system | Every 10 min | 60+ domain-specific checks (POS, inventory, loyalty, compliance) |
| System Health | Cron job | Every 30 min | Memory, CPU, latency, error rates, DB connectivity |
| Agent Telemetry | Firestore | Per invocation | Token usage, tool calls, latency, cost, capability utilization |
| Error Tracking | Sentry | Real-time | Client + server errors, session replays |

### Active Cron Jobs (47 endpoints)
Key schedules: POS sync (30 min), loyalty sync (daily 2 AM), playbook execution (daily + weekly), system health (30 min), pricing alerts, usage alerts, QA smoke tests.

### Alert Escalation Path
```
Cloud Monitoring alert → Slack #infrastructure
  ↓ (if P0/P1)
Auto-escalator → QA bug filed → Linus auto-dispatched → Slack #linus-incidents
  ↓ (if unresolved > 2 min)
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
