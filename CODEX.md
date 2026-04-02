# CODEX.md — BakedBot Codebase Context for OpenAI Codex

> Loaded automatically by Codex on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
.\scripts\npm-safe.cmd run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

---

## Canonical Engineering Principles (MANDATORY)

`AGENTS.md` is the source of truth for builder behavior in this repo. Before writing code:

1. **Pick the canonical home** for the logic: domain model, service, adapter, workflow, tool contract, schema, UI component, or background job.
2. **Reuse before inventing**: prefer existing types, services, schemas, adapters, utilities, and workflows over parallel helpers or duplicate abstractions.
3. **Set the risk tier + failure modes**: think through invalid data, retries, duplicate events, stale state, permission failures, third-party drift, and partial execution.
4. **Preserve observability**: important paths, especially billing, integrations, auth, and automations, must stay debuggable and auditable.
5. **Keep the code explainable**: explicit control flow, typed boundaries, no silent catches, no hidden business logic in the UI.

> The PR template already mirrors these principles via `Risk Tier`, `Canonical Reuse`, `Failure Modes`, `Observability`, and `Explainability`. Treat them as build-time requirements, not documentation afterthoughts.

---

## 🔄 Auto-Simplify Protocol (MANDATORY)

After completing ANY code modifications AND **before every `git push` / Firebase deploy**, run the `/simplify` review:

1. **Find changes:** Run `git diff HEAD` to capture all modified code. If empty, use `git diff HEAD~1`.
2. **3 parallel reviews against the diff:**
   - **Code Reuse:** Flag newly written code that duplicates existing utilities/helpers already in the codebase.
   - **Code Quality:** Flag redundant state, parameter sprawl, copy-paste blocks, leaky abstractions, stringly-typed code, silent catches, unnecessary `any` types.
   - **Efficiency:** Flag redundant work, sequential calls that could be `Promise.all`, N+1 patterns, overly broad Firestore reads, memory leaks, no-op updates.
3. **Re-check the engineering principles** from `AGENTS.md`: canonical home, reuse, risk tier, failure modes, and observability should still be explicit in the final diff.
4. **Fix every confirmed finding** directly in the code.
5. **Run `.\scripts\npm-safe.cmd run check:types`** to verify fixes don't break the build.
6. **Run `npm run simplify:record`** once the reviewed code is the exact code you intend to push.
7. **Summarize** what was changed.

> This is NOT optional. Every code session ends with `/simplify`, and every `git push` is gated on it. Repo-owned hooks plus `scripts/safe-push.sh` verify the recorded review. If hooks are missing locally, run `npm run setup:git-hooks`. See `.agent/workflows/simplify.md` for the full protocol.

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

## Quick Commands

| Command | Purpose |
|---------|---------|
| `.\scripts\npm-safe.cmd run check:types` | TypeScript check in the default Windows shell |
| `.\scripts\npm-safe.cmd test` | Run Jest tests |
| `.\scripts\npm-safe.cmd test -- path/to/file.test.ts` | Test specific file |
| `.\scripts\npm-safe.cmd run lint` | ESLint check |
| `git push origin main` | **Deploy to production** — triggers Firebase App Hosting |

**Note:** Windows PowerShell — use `;` not `&&` for command chaining.

---

## Key Context Files

| File | Purpose |
|------|---------|
| `.agent/prime.md` | Full startup context (workflow protocol, super powers, agent roster) |
| `.agent/workflows/simplify.md` | The 3-agent code review workflow |
| `AGENTS.md` | Builder swarm rules (reuse, conventions, completion check) |
| `.agent/refs/` | Detailed reference docs (load on-demand) |

---

## Directory Structure

```
src/server/agents/     # Agent implementations (linus.ts, smokey.ts, etc.)
src/server/services/   # Business logic
src/server/tools/      # Agent tools (Genkit tool definitions)
src/server/actions/    # Server Actions ('use server')
src/app/api/           # API routes
src/components/        # React components
.agent/refs/           # Reference documentation
dev/work_archive/      # Historical decisions
```

---

## Completion Check

Before finalizing code, verify:

- [ ] I reused canonical patterns where possible.
- [ ] I did not create a duplicate abstraction for an existing concept.
- [ ] I followed naming, boundary, error-handling, permission, tenancy, logging, and retry conventions.
- [ ] I did not suppress warnings instead of fixing root causes.
- [ ] I handled likely failure modes intentionally.
- [ ] A human reviewer will be able to explain this code.
- [ ] **I ran `/simplify` (3-agent parallel review: Code Reuse, Code Quality, Efficiency), fixed all confirmed findings, and recorded the reviewed outgoing diff with `npm run simplify:record`.**

If any item is false, revise before proposing the change.

---

## 🔚 Session End: "Update recent work"

> **Multi-tab:** Multiple sessions run in parallel. Always write your session file first — it's conflict-safe. Only update CLAUDE.md/prime.md if your session is more recent.

### Every session, in order:

1. **Write session file** → `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md` (do this first, always)
2. **Append to `memory/MEMORY.md`** → prepend your session block (safe for concurrent tabs)
3. **Update `CLAUDE.md` line 15 + `.agent/prime.md` lines ~41–44** — but **only if your session date ≥ current "Last update" date** in CLAUDE.md. If older, skip these files.
4. **Auto-archive** if MEMORY.md > 150 lines → move oldest sessions to `memory/archive/YYYY-MM.md`
5. **Commit:** `git add CLAUDE.md .agent/prime.md && git commit -m "docs: Update session notes YYYY-MM-DD"`

> Full protocol: `CLAUDE.md` → *Session End* section. Run **"Consolidate sessions"** to merge all pending tabs at once.

---

*For detailed context, load `.agent/prime.md` first, then relevant refs from `.agent/refs/` as needed.*
