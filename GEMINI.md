# GEMINI.md — BakedBot Codebase Context for Gemini

> Loaded automatically by Gemini Code Assist / Gemini CLI on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
.\scripts\npm-safe.cmd run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

---

## 🔄 Auto-Simplify Protocol (MANDATORY)

After completing ANY code modifications AND **before every `git push` / Firebase deploy**, run the `/simplify` review:

1. **Find changes:** Run `git diff HEAD`. If empty, use `git diff HEAD~1`.
2. **3 parallel reviews against the diff:**
   - **Code Reuse:** Flag newly written code that duplicates existing utilities/helpers.
   - **Code Quality:** Flag redundant state, parameter sprawl, copy-paste, silent catches, unnecessary `any`.
   - **Efficiency:** Flag redundant work, sequential calls that could be `Promise.all`, N+1 patterns, memory leaks.
3. **Fix every confirmed finding** directly in the code.
4. **Run `.\scripts\npm-safe.cmd run check:types`** — build must stay green.
5. **Summarize** what was changed.

> Every `git push` is gated on `/simplify`. See `.agent/workflows/simplify.md` for the full protocol.

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
| `.\scripts\npm-safe.cmd run check:types` | TypeScript check |
| `.\scripts\npm-safe.cmd test` | Run Jest tests |
| `.\scripts\npm-safe.cmd run lint` | ESLint check |
| `git push origin main` | **Deploy to production** — triggers Firebase App Hosting |

**Note:** Windows PowerShell — use `;` not `&&` for command chaining.

---

## Key Context Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Primary codebase context — full protocol, standards, workflow |
| `.agent/prime.md` | Agent startup context (workflow, super powers, agent roster) |
| `AGENTS.md` | Builder swarm rules (reuse, conventions, completion check) |
| `.agent/refs/` | Detailed reference docs (load on-demand) |

**Read `CLAUDE.md` and `.agent/prime.md` at session start.**

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
```

---

## 🔚 Session End: "Update recent work"

> **Multi-tab:** Multiple sessions run in parallel. Write your session file first — it's conflict-safe. Only update CLAUDE.md/prime.md if your session is more recent.

### Every session, in order:

1. **Write session file** → `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md` (always first)
2. **Append to `memory/MEMORY.md`** → prepend your session block
3. **Update `CLAUDE.md` line 15 + `.agent/prime.md` lines ~41–44** — **only if your session date ≥ current "Last update" date**. If older, skip.
4. **Auto-archive** if MEMORY.md > 150 lines → `memory/archive/YYYY-MM.md`
5. **Commit:** `git add CLAUDE.md .agent/prime.md && git commit -m "docs: Update session notes YYYY-MM-DD"`

> Full protocol in `CLAUDE.md` → *Session End* section. Run **"Consolidate sessions"** to merge all pending tabs at once.

---

## Completion Check

Before finalizing code, verify:

- [ ] I reused canonical patterns where possible.
- [ ] I did not create a duplicate abstraction for an existing concept.
- [ ] I followed naming, boundary, error-handling, permission, tenancy, logging, and retry conventions.
- [ ] I did not suppress warnings instead of fixing root causes.
- [ ] I handled likely failure modes intentionally.
- [ ] A human reviewer will be able to explain this code.
- [ ] **I ran `/simplify` before pushing and fixed all confirmed findings.**

---

*For detailed context, load `.agent/prime.md` first, then relevant refs from `.agent/refs/` as needed.*
