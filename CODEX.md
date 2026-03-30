# CODEX.md — BakedBot Codebase Context for OpenAI Codex

> Loaded automatically by Codex on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
.\scripts\npm-safe.cmd run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

---

## 🔄 Auto-Simplify Protocol (MANDATORY)

After completing ANY code modifications, you **MUST** run the `/simplify` review before committing:

1. **Find changes:** Run `git diff HEAD` to capture all modified code. If empty, use `git diff HEAD~1`.
2. **3 parallel reviews against the diff:**
   - **Code Reuse:** Flag newly written code that duplicates existing utilities/helpers already in the codebase.
   - **Code Quality:** Flag redundant state, parameter sprawl, copy-paste blocks, leaky abstractions, stringly-typed code, silent catches, unnecessary `any` types.
   - **Efficiency:** Flag redundant work, sequential calls that could be `Promise.all`, N+1 patterns, overly broad Firestore reads, memory leaks, no-op updates.
3. **Fix every confirmed finding** directly in the code.
4. **Run `.\scripts\npm-safe.cmd run check:types`** to verify fixes don't break the build.
5. **Summarize** what was changed.

> This is NOT optional. Every code session ends with `/simplify`. See `.agent/workflows/simplify.md` for the full protocol.

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
- [ ] **I ran `/simplify` (3-agent parallel review: Code Reuse, Code Quality, Efficiency) and fixed all confirmed findings.**

If any item is false, revise before proposing the change.

---

*For detailed context, load `.agent/prime.md` first, then relevant refs from `.agent/refs/` as needed.*
