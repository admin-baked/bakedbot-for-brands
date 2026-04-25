# CLAUDE.md ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â BakedBot Codebase Context

> Official Claude Code context file. Loaded automatically on every interaction.

---

## FIRST: Check Build Health

**Two checks at session start. No exceptions.**

```powershell
# 1. Is the PREVIOUS push green in CI?
npm run ci:health

# 2. Does the local build compile?
.\scripts\npm-safe.cmd run check:types
```

If `ci:health` shows red: **fix the CI failure before doing any new work.** Don't push on top of a broken build.
If `check:types` fails: **fix type errors before any other work.**

**Current Status:** local verified | 1-click org provisioning complete (7 steps); comp-intel → pricing deep-link; campaign access fixes (`db0052991`) | **Last update:** 2026-04-25

---

**Session Status (2026-04-17):** local actor-context contract, canonical `agent-contract.ts`, internal readiness surfacing, drift-check hardening, and Creative Center role-aware Remotion fixes are in the working tree.

## Canonical Engineering Principles (MANDATORY)

`AGENTS.md` is the source of truth for builder behavior in this repo. Before writing code:

1. **Choose the canonical home** for the logic: domain model, service, adapter, workflow, tool contract, schema, UI component, or background job.
2. **Reuse before inventing**: extend existing types, services, schemas, adapters, utilities, and workflows before adding a new abstraction.
3. **Set the risk tier + failure modes**: account for invalid data, retries, duplicate events, stale state, permission failures, third-party drift, and partial execution.
4. **Preserve observability**: billing, integrations, auth, and automation paths must stay debuggable and auditable.
5. **Keep the code explainable**: explicit flow, typed boundaries, no silent catches, and no UI-owned business logic.

> The PR template already mirrors these principles through `Risk Tier`, `Canonical Reuse`, `Failure Modes`, `Observability`, and `Explainability`. Treat them as required engineering checks, not just PR prose.

---

## ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Auto-Simplify Protocol (MANDATORY)

After completing ANY code modifications AND **before every `git push` / Firebase deploy**, you **MUST** run `/simplify`:

1. **Find changes:** Run `git diff HEAD` to capture all modified code. If empty, use `git diff HEAD~1`.
2. **3 parallel reviews against the diff:**
   - **Code Reuse:** Flag newly written code that duplicates existing utilities/helpers.
   - **Code Quality:** Flag redundant state, parameter sprawl, copy-paste, leaky abstractions, silent catches.
   - **Efficiency:** Flag redundant work, sequential calls that could be parallel, N+1 patterns, memory leaks.
3. **Re-check the engineering principles** from `AGENTS.md`: canonical home, reuse, risk tier, failure modes, and observability should still be explicit in the final diff.
4. **Fix every confirmed finding** directly in the code.
5. **Run `.\scripts\npm-safe.cmd run check:types`** to verify fixes don't break the build.
6. **Run `npm run simplify:record`** once the reviewed code is the exact code you intend to push.
7. **Summarize** what was changed.

> This is NOT optional. Every code session ends with `/simplify`, and every `git push` is gated on it. Repo-owned hooks plus `scripts/safe-push.sh` verify the recorded review. If hooks are missing locally, run `npm run setup:git-hooks`. See `.agent/workflows/simplify.md` for the full protocol.
> **Applies to all builder agents:** Claude Code, Codex, and Gemini ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no exceptions.

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run ci:health` | **Session start** — verify previous push CI is green |
| `.\scripts\npm-safe.cmd run check:types` | TypeScript check (run before/after changes) |
| `.\scripts\npm-safe.cmd test` | Run Jest tests |
| `.\scripts\npm-safe.cmd test -- path/to/file.test.ts` | Test specific file |
| `.\scripts\npm-safe.cmd run lint` | ESLint check |
| `.\scripts\npm-safe.cmd run dev` | Local dev server |
| `bash scripts/safe-push.sh` | **Safe deploy** — CI check + pull + type check + push + verify |
| `git push origin main` | **Deploy to production** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â triggers Firebase App Hosting CI/CD |
| `npm run gh:checks` | Check CI status for HEAD commit (check runs + statuses) |
| `npm run gh:checks:wait` | Poll until all checks pass (30s interval, 15min timeout) |
| `npm run gh:checks -- status <sha>` | Check CI status for specific commit |
| `node scripts/firebase-apphosting.mjs cancel <id>` | Cancel stuck build (> 25 min RUNNING) |

> **ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ Deploy = Push to GitHub.** `git push origin main` automatically starts a Firebase build and deploys to production. Always push after committing finished work.
>
> **ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ After every push: poll + trigger.** Don't stop at the push ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â poll `gh run list` until `completed|success`, then run post-deploy triggers (POS sync, etc.). See `.agent/prime.md` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ **Post-Deploy Protocol** for the full loop and trigger map.
>
> **ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Stuck build pattern:** If `firebase-apphosting.mjs status` shows a build RUNNING > 25 min with `Duration: unknown`, cancel it and push an empty commit to re-trigger.

**Note:** Windows PowerShell ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â use `;` not `&&` for command chaining.

---

## Build & Type Checking

When running TypeScript type checks, always use `--max-old-space-size=8192` flag or run targeted checks on changed files only (`tsc --noEmit path/to/changed/files`). The full codebase causes OOM errors.

```powershell
# Safe full check
node --max-old-space-size=8192 node_modules/.bin/tsc --noEmit

# Targeted check (preferred)
.\scripts\npm-safe.cmd run check:types
```

---

## Deployment

For Firebase deployments: builds frequently fail due to OOM, Turbopack issues, or GCP timing. Always monitor the deploy after triggering it and be prepared to retry once. If a deploy fails on a docs-only commit, re-trigger before investigating.

- After `git push origin main`, poll `gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 3` until `completed|success`
- If a build is RUNNING > 25 min with `Duration: unknown` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ cancel and push an empty commit to re-trigger
- Docs-only commit failures are almost always infra timeouts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â re-trigger first, don't debug the commit

---

## Debugging Guidelines

When debugging production bugs, always check server-side root causes first before applying client-side fixes. Multiple sessions showed initial client-side fixes missing the real server-side issue (e.g., auth/session bugs, wrong bot tokens).

1. Trace the full request path from client ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ server before writing any fix
2. Check server logs / Firestore for the actual error, not just what the UI shows
3. Don't apply a client-side patch until server-side causes are ruled out

**Protocol:** Before implementing any fix, trace the full request path from client to server and identify the root cause. Show the server-side code path first. Don't suggest client-side fixes until server-side issues are ruled out.

## Bulk API Operations

Before running any bulk API operation (Apollo, fal.ai, Jina, Firestore batch writes, etc.):

1. **Validate keys** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â make a single test call to confirm the API key is active and not rate-limited
2. **5-item pilot** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â run a test batch of 5 items end-to-end and verify the full pipeline works
3. **Scale up** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only then process in 20-item batches with exponential backoff and per-item error handling

```typescript
// Pattern: validate ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pilot ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ scale
await validateApiKey();
const pilot = await processBatch(items.slice(0, 5));
if (!pilot.success) throw new Error(`Pilot failed: ${pilot.error}`);
for (const chunk of chunks(items, 20)) {
  await processBatchWithRetry(chunk, { maxRetries: 3, backoffMs: 1000 });
}
```

Never start a bulk run without validating keys first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â depleted/rate-limited keys discovered mid-run waste all prior work.

---

## End of Session Checklist

**At the end of every session, automatically update CLAUDE.md with any new patterns or decisions, prime.md with current project state, and MEMORY.md with session summary. Do not wait to be asked.**

After completing code changes:
1. Run targeted type checks on changed files (`--max-old-space-size=8192` if needed)
2. Push to GitHub (`git push origin main`)
3. Update project documentation (CLAUDE.md, prime.md, MEMORY.md)

Use `/shipit` to run this as a single command.

---

## Known Issues

- **Stale background task notifications:** Dismiss immediately without processing. They are artifacts from previous sessions and not actionable.
- **tsc OOM:** Full type-check crashes node at ~4GB heap. Always use targeted checks or `--max-old-space-size=8192`.
- **Firebase stuck builds:** Build RUNNING > 25 min with `Duration: unknown` = infra timeout. Cancel + empty commit to re-trigger.
- **Secret versioning:** App Hosting requires numeric versions (`SECRET@5`). Using `@latest` will fail as it snapshots the version at deploy time.
- **Slack bridge identity:** Requests are authenticated via HMAC and run as `SLACK_SYSTEM_USER` (super_user). See `.agent/refs/slack-operations.md`.

---


Every PR body **must** include all 8 sections below. GitHub's PR template (`.github/PULL_REQUEST_TEMPLATE.md`) has the full checklist, but when creating PRs via API/MCP/CLI the template is NOT auto-applied ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â you must fill it in manually.

**Required sections** (CI governance check scans for these exact strings):

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

**Also required:** exactly one label matching `risk:tier0`, `risk:tier1`, `risk:tier2`, or `risk:tier3`.

**Suppression rule:** if your diff contains `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `: any`, you must explicitly justify it in the PR body or the governance check will block the PR.

> **Tip:** Use `doc: any` patterns for firebase-admin/firestore callbacks (module resolution is broken in this tsconfig ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â established pattern since commit `6fc39372`). Justify in `# Failure Modes` or `# Explainability`.

---

## ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ Developer Super Powers (11 Ready-to-Use Scripts)

**All 21 npm scripts deployed 2026-02-22** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Use these for automation, testing, compliance, and observability.

**Linus can execute any super power via Slack:** `@linus execute execute_super_power script=<script-name> options=<cli-options>`

### Tier 1: Foundational
| Command | Purpose |
|---------|---------|
| `npm run audit:indexes` | Report all 81 Firestore composite indexes |
| `npm run setup:secrets` | Audit GCP Secret Manager provisioning status |
| `npm run audit:schema` | Validate 8 collections against schema types |

### Tier 2: Acceleration
| Command | Purpose |
|---------|---------|
| `npm run seed:test` | Seed org_test_bakedbot with 10 customers, 5 playbooks, 3 campaigns |
| `npm run generate:component <Name>` | Scaffold React component + test |
| `npm run generate:action <name>` | Scaffold server action |
| `npm run generate:route <endpoint>` | Scaffold API route (GET/POST) |
| `npm run generate:cron <job-name>` | Scaffold cron job endpoint |
| `npm run fix:build` | Auto-fix TypeScript errors (import paths, consoleÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢logger) |

### Tier 3: Safety
| Command | Purpose |
|---------|---------|
| `npm run test:security` | Run 12 role-based security scenarios |
| `npm run check:compliance --text "..."` | Check content for compliance violations (Claude Haiku) |
| `npm run audit:consistency` | Validate 8 consistency rules across all orgs |

### Tier 4: Observability
| Command | Purpose |
|---------|---------|
| `npm run setup:monitoring` | Configure Cloud Monitoring alerts for Slack #ops |
| `npm run audit:costs` | Analyze Firestore query costs (scans $5-15/mo, optimal $0.10-0.50/mo) |

### Tier 5: Infrastructure
| Command | Purpose |
|---------|---------|
| `npm run firebase:apphosting -- status` | List recent App Hosting rollouts (state, duration, commit) |
| `npm run firebase:apphosting -- logs <id>` | Stream build logs for a rollout or Cloud Build ID |
| `npm run firebase:apphosting -- rollout` | Trigger new rollout from main branch HEAD |
| `npm run firebase:apphosting -- cancel <id>` | Cancel an in-progress Cloud Build job |
| `npm run firebase:apphosting -- builds` | List raw Cloud Build jobs (lower level) |

### Tier 6: AI Coding Agent
| Command | Purpose |
|---------|---------|
| `npm run opencode:task -- --prompt "..."` | Delegate coding task to Opencode (free Zen models, $0 cost) |
| `npm run opencode:task -- --prompt "..." --model zen/kimi-k24` | Use long-context Zen model |
| `npm run opencode:task -- --prompt "..." --model anthropic/claude-sonnet-4-6` | Premium model (billed) |

**SP13 Ã¢â‚¬â€ Opencode Agent:** Cloud Run container at `OPENCODE_AGENT_URL`. Free via Zen models, no API key needed.
Deploy: `gcloud run deploy opencode-agent --source ./docker/opencode --region us-central1`
Linus Slack: `@linus execute execute_super_power script=opencode-task options="--prompt \"fix type error in X\""`

**Details:** See `.agent/specs/` for full super powers documentation.

**Linus Slack Usage Examples:**
```
@linus execute execute_super_power script=fix-build options=--apply
@linus execute execute_super_power script=audit-indexes
@linus execute execute_super_power script=audit-schema options=--orgId=org_thrive_syracuse
@linus execute execute_super_power script=setup-secrets options=--deploy
@linus execute execute_super_power script=check-compliance options=--text="Buy weed today"
```

---

## Project Overview

**BakedBot AI** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Agentic Commerce OS for cannabis industry
- Multi-agent platform keeping customers in brand's funnel
- Routes orders to retail partners for fulfillment
- Automates marketing, analytics, compliance, competitive intelligence

**Tech Stack:**
- Next.js 15+ (App Router) | Firebase (Firestore, Auth, App Hosting)
- AI: Genkit (Gemini), Claude (Anthropic SDK)
- UI: Tailwind CSS, ShadCN UI, Framer Motion

---

## Directory Structure

```
src/
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ app/                     # Next.js pages & API routes
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ api/                 # API routes
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ dashboard/           # Role-based dashboards
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ components/              # React components
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ server/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ agents/              # Agent implementations ÃƒÂ¢Ã‚Â­Ã‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ services/            # Business logic
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ letta/           # Memory service
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ rtrvr/           # Browser automation
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ezal/            # Competitive intel
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ actions/             # Server Actions ('use server')
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ tools/               # Agent tools (Genkit)
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ai/                      # AI wrappers (claude.ts)
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ lib/                     # Utilities

.agent/
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ prime.md                 # Agent startup context (READ FIRST)
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ refs/                    # Detailed reference docs ÃƒÂ¢Ã‚Â­Ã‚Â
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ workflows/               # Automation recipes

dev/
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ work_archive/            # Historical decisions
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ backlog.json             # Task tracking
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ progress_log.md          # Session logs
```

---

## Coding Standards

| Standard | Rule |
|----------|------|
| **TypeScript** | All code must be typed. Prefer `unknown` over `any`. |
| **Server Actions** | Use `'use server'` directive for mutations |
| **Firestore** | Use `@google-cloud/firestore` (not client SDK) |
| **Error Handling** | Always wrap async in try/catch |
| **Logging** | Use `@/lib/logger` (never `console.log`) |
| **Changes** | Small, incremental. Test after each change. |

---

## Karpathy Coding Guidelines (via [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills))

> Bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding
- State assumptions explicitly before implementing. If uncertain, ask.
- If multiple interpretations exist, present them Ã¢â‚¬â€ don't pick silently.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it Ã¢â‚¬â€ don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.
- **Test:** Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Transform tasks into verifiable goals before starting:
- "Add validation" Ã¢â€ â€™ "Write tests for invalid inputs, then make them pass"
- "Fix the bug" Ã¢â€ â€™ "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan with a verify step for each:
```
1. [Step] Ã¢â€ â€™ verify: [check]
2. [Step] Ã¢â€ â€™ verify: [check]
```

---

## Workflow

### Simple Task (1-2 files)
1. Read the file(s) you're changing
2. Make the change
3. Run `npm run check:types`
4. Run tests if applicable
5. Commit

### Complex Task (3+ files, new feature)
1. Run `npm run check:types` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ensure build is healthy
2. Query work history: `query_work_history({ query: "area/file" })`
3. Read relevant refs from `.agent/refs/`
4. Create plan, get user approval
5. Implement incrementally (test after each change)
6. Archive decisions: `archive_work({ ... })`
7. Commit and push

---

## Reference Documentation

Load from `.agent/refs/` on-demand (conserve context):

| Topic | File |
|-------|------|
| **Start here** | `.agent/prime.md` |
| Agents & Architecture | `refs/agents.md` |
| Slack Operations | `refs/slack-operations.md` |
| Infrastructure & Gotchas | `refs/infrastructure-gotchas.md` |
| Memory/Letta | `refs/bakedbot-intelligence.md` |
| Browser Automation | `refs/autonomous-browsing.md` |
| Auth & Sessions | `refs/authentication.md` |
| Roles & Permissions | `refs/roles.md` |
| Backend Services | `refs/backend.md` |
| API Routes | `refs/api.md` |
| Frontend/UI | `refs/frontend.md` |
| Testing | `refs/testing.md` |
| Integrations | `refs/integrations.md` |
| Agent Task Queue | `refs/agent-task-queue.md` |
| Work Archive | `refs/work-archive.md` |

**Full index:** `.agent/refs/README.md`

---

## Agent Squad

| Agent | Role | Domain |
|-------|------|--------|
| **Linus** | CTO | Code eval, deployment, bug fixing |
| **Leo** | COO | Operations orchestration |
| **Smokey** | Budtender | Product search, recommendations |
| **Craig** | Marketer | Campaigns (SMS: Blackleaf, Email: Mailjet) |
| **Ezal** | Lookout | Competitive intelligence |
| **Deebo** | Enforcer | Compliance |

> Full details: `.agent/refs/agents.md`

## Builder AI Agents

These agents write and ship code in this repo. All follow the same `/simplify` + session-end protocol.

| Agent | Platform | Protocol |
|-------|----------|----------|
| **Claude Code** | Anthropic CLI / IDE | Primary ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â full CLAUDE.md protocol |
| **Codex** | OpenAI Codex | Same: `/simplify` pre-push, session-end update, no `console.log`, typed TS |
| **Gemini** | Google Gemini CLI / Code Assist | Same: `/simplify` pre-push, session-end update, no `console.log`, typed TS |

> When Codex or Gemini complete a coding session, they must run `/simplify` before pushing and update `CLAUDE.md` line 15 + `prime.md` recent work block. Memory archive auto-runs if MEMORY.md > 150 lines.

### Builder Discipline Agents (Coordinated 3-Agent Pattern)

Spin up when a feature needs parallel FE + BE + UX work. All use `agent-coord.mjs` for file locking.

| Agent ID | Discipline | File Domain | Coordination Role |
|----------|------------|-------------|-------------------|
| `be` | Backend | `src/server/`, `src/app/api/`, `src/config/` | Writes API contract first — unblocks FE + UX |
| `fe` | Frontend | `src/components/`, `src/app/(pages)/` | Starts after BE contract is published |
| `ux` | UX Review | `.agent/refs/ux-specs/` (read-only on src/) | Reviews FE output before merge |

**Contract-first rule:** `be` must publish `.agent/refs/agent-contract.md` and broadcast via `agent-coord.mjs message` before `fe` or `ux` start. Full protocol + startup commands: `.agent/refs/agents.md` → Builder Disciplines.

---

## Key Files

| Purpose | Path |
|---------|------|
| Agent startup context | `.agent/prime.md` |
| Claude wrapper | `src/ai/claude.ts` |
| Agent harness | `src/server/agents/harness.ts` |
| Linus agent | `src/server/agents/linus.ts` |
| Work archive | `dev/work_archive/` |
| App secrets | `apphosting.yaml` |

---

## Memory & History

### Work Archive (Local)
- `query_work_history` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Check before modifying files
- `archive_work` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Record decisions after changes
- Location: `dev/work_archive/`

### Letta Memory (Persistent)
- `letta_save_fact` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Store important insights
- `letta_search_memory` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Query past decisions
- Shared across Executive agents (Hive Mind)

---

## Common Pitfalls

| Mistake | Fix |
|---------|-----|
| Editing without reading | Always Read file first |
| Skipping build check | Run `npm run check:types` before/after |
| Large unplanned changes | Break into increments, get approval |
| Using `&&` in PowerShell | Use `;` instead |
| Using `console.log` | Use `logger` from `@/lib/logger` |
| Forgetting to archive | Call `archive_work` after significant changes |

---

## ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ Auto-Approved Operations (Production Automation)

### Claude Code (This Tool)
Claude can execute autonomously without asking:
- Cloud Scheduler job creation/modification/execution
- Backfill commands (90-day historical data import)
- Manual cron job triggers
- Deployment commands (`git push origin main`)
- Service account setup (IAM operations)

### Linus (CTO Agent)
Linus has **comprehensive CTO autonomy**. See `.agent/LINUS_CTO_AUTONOMY.md` for full charter.

**Core Autonomy:**
| Domain | Linus Can | Examples |
|--------|-----------|----------|
| **Code Management** | Push to main, create branches, revert | `git push`, `git commit`, `git revert` |
| **Build & Test** | Run full suite, analyze failures | `npm run check:types`, `npm test` |
| **Developer Productivity** | Execute super power scripts autonomously | `execute_super_power script=fix-build options=--apply` |
| **Deployment** | GO/NO-GO decisions, deploy to production | Firebase App Hosting push |
| **Incident Response** | Auto-revert failed deployments, fix issues | Deploy failure ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ auto-revert ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
| **Cron Jobs** | Create/modify Cloud Scheduler | `gcloud scheduler jobs create http ...` |
| **Infrastructure** | Service accounts, IAM roles | Create automated deployment accounts |
| **Reporting** | Real-time Slack + dashboard updates | Auto-notify on deploy/incident |

**Safety Mechanisms:**
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Build must pass before push (hard gate)
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Deployment failure ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ auto-revert within 2 minutes
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Destructive ops (delete critical jobs) require human approval
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Full audit trail in Firestore (every action logged)
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Hive Mind memory (learns from incidents)

---

## ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ…Â¡ Session End: "Update recent work"

When the user says **"Update recent work"** (or similar), execute this checklist automatically ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no questions.

> **Multi-tab reality:** Multiple sessions often run in parallel across different tabs and complete at different times. The protocol below handles this safely ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â each tab writes to its own isolated session file first, then a conflict-free merge updates the shared files.

---

### Step 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Write a session file (ALWAYS FIRST, every tab)

Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md` before touching any shared file. This is your isolated record ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â safe to write even if other tabs have already updated CLAUDE.md.

```markdown
---
date: YYYY-MM-DD
time: HH:MM
slug: feature-a-feature-b
commits: [commitHash1, commitHash2]
features: [Feature A, Feature B]
---

## Session YYYY-MM-DD ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Feature A + Feature B

- bullet summary (3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 points max)
- Gotchas discovered
```

**Why first:** if anything fails later, this file ensures the session is never lost.

---

### Step 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Append to `memory/MEMORY.md`

Prepend your session block under a new `## Session YYYY-MM-DD` heading.
- 3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 bullets max, commit hash, ref pointer
- If topic already has a `memory/*.md` file ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ update that instead, add a one-liner to MEMORY.md

**Safe for concurrent tabs:** each session gets its own dated block. Order by date, not write-time.

---

### Step 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Auto-Archive MEMORY.md (if > 150 lines)

**Every time you write to MEMORY.md**, check line count. If > 150:
1. Identify all `## Session` entries **older than the 3 most recent**.
2. Move them to `memory/archive/YYYY-MM.md` (append if file exists). Keep blocks intact.
3. Replace with a single pointer line: `ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Sessions before YYYY-MM-DD archived in memory/archive/YYYY-MM.md`
4. Verify ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 150 lines after.

**Permanent sections** (Startup Ritual, etc.) are never archived.

---

### Step 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Update shared files (date-gated)

**Only update CLAUDE.md and prime.md if this session's date ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ the current "Last update" date.**

1. Read `CLAUDE.md` line 15. Parse the existing `YYYY-MM-DD`.
2. If **your session date is newer or equal** ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ update both files:
   - **`CLAUDE.md` line 15:** `**Current Status:** 🟢 main green | Agent board polling (no App Check); MRR $925 live; Marty board tools in Slack | **Last update:** 2026-04-17 (`dd4905c27`)
   - **`.agent/prime.md` lines ~41ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“44:** max 2-line block ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â feature names + commit hashes only
3. If **your session date is older** than what's already there ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ **skip both files**. Your session is already captured in MEMORY.md and `memory/sessions/`. Don't overwrite newer work.

---

### Step 5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Route to topic file if applicable

| What changed | Update this file |
|---|---|
| Heartbeat, cron, ISR, build monitor | `memory/platform.md` |
| Slack channels, routing, approvals | `memory/slack.md` |
| Agent tools, user promotion, audit | `memory/agents.md` |
| Playbooks, billing, webhooks | `memory/playbooks.md` |
| Thrive / Herbalist config | `memory/customers.md` |
| Competitive intel system | `memory/competitive-intel.md` |
| New pilot customer | `memory/customers.md` |
| Delivery system | `memory/delivery-system-2026-02-17.md` |

---

### Step 6 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Commit

```bash
git add CLAUDE.md .agent/prime.md
git commit -m "docs: Update session notes YYYY-MM-DD - [brief summary]"
```
Memory files are local-only (not committed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `memory/` lives outside repo).

---

### "Consolidate sessions" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â merge all pending tabs at once

When multiple tabs have pending session files in `memory/sessions/`, say **"Consolidate sessions"** to merge them all in one pass:

1. Read all `memory/sessions/*.md` files
2. Sort chronologically by `date` + `time` frontmatter
3. For each session (oldest ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ newest):
   - Append its block to MEMORY.md (skip if already present)
   - Route to topic file if applicable
4. Update CLAUDE.md line 15 + prime.md with the **most recent** session's data
5. Auto-archive MEMORY.md if > 150 lines
6. Delete all processed `memory/sessions/*.md` files
7. Commit: `docs: Consolidate N sessions YYYY-MM-DD`

> Use this after running "Update recent work" across multiple tabs, or when you remember sessions you forgot to update.

---

### ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â What NOT to do
- Do NOT update CLAUDE.md/prime.md if your session is older than what's already there
- Do NOT add full implementation details to `prime.md`
- Do NOT add more than 2ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“3 lines to the prime.md recent work block
- Do NOT commit `memory/` files (they're in the Claude projects folder, not the repo)

---

*For detailed context, load `.agent/prime.md` first, then relevant refs as needed.*


