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

**Current Status:** 🟢 Passing (verified 2026-01-22)

---

## 🧭 Core Principles

1. **Build Health First** — A failing build blocks everything. Fix it immediately.
2. **Read Before Write** — Never modify code you haven't read. Use `Read` tool first.
3. **Small Changes** — One logical change at a time. Test after each.
4. **Plan Complex Work** — For multi-file changes, write a plan and get approval.
5. **Archive Decisions** — Record why, not just what. Future you will thank you.

---

## 🎯 Decision Framework: When to Read Refs

| Situation | Action |
|-----------|--------|
| Simple bug fix in one file | Read the file, fix it, test |
| Touching agent code | Read `refs/agents.md` first |
| Touching auth/session | Read `refs/authentication.md` + `refs/roles.md` |
| Adding new integration | Read `refs/integrations.md` |
| Multi-file feature | Read relevant refs + `query_work_history` |
| Unsure where code lives | Use Explore agent or search tools |

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
| Agent logic | `refs/agents.md` |
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

Full index in `refs/README.md`.

---

## 🔄 Standard Workflow

### For Simple Tasks (1-2 files)
1. Read the relevant file(s)
2. Make the change
3. Run `npm run check:types`
4. Run relevant tests
5. Commit

### For Complex Tasks (3+ files or new features)
1. Check build health
2. `query_work_history` for the affected area
3. Read relevant ref files
4. Create a plan, get approval
5. Implement incrementally (test after each change)
6. `archive_work` with decisions and reasoning
7. Commit

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

## 🕵️ Agent Squad (Quick Reference)

**Executive Boardroom (Super Users Only):**
- Leo (COO) — Operations, delegation
- Jack (CRO) — Revenue, CRM
- Linus (CTO) — Code eval, deployment
- Glenda (CMO) — Marketing, brand
- Mike (CFO) — Finance, billing

**Support Staff:**
- Smokey (Budtender) — Product recommendations
- Craig (Marketer) — Campaigns, SMS/Email
- Pops (Analyst) — Revenue analysis
- Ezal (Lookout) — Competitive intel
- Deebo (Enforcer) — Compliance

> Full details: `refs/agents.md`

---

## 🔌 Key Integrations

| Service | Used By | Purpose |
|---------|---------|---------|
| Blackleaf | Craig | SMS |
| Mailjet | Craig | Email |
| CannMenus | Ezal | Live pricing |
| Alpine IQ | Mrs. Parker | Loyalty |
| Authorize.net | Money Mike | Payments |

> Full details: `refs/integrations.md`

---

## ⚠️ Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Editing code without reading it | Always use Read tool first |
| Skipping build check | Run `npm run check:types` before and after |
| Large changes without plan | Break into smaller increments |
| Forgetting to archive | Use `archive_work` after significant changes |
| Assuming file structure | Use Glob/Grep to verify |
| Using `&&` in PowerShell | Use `;` instead |

---

## 🆕 Recent Changes (2026-01-22)

### Custom Domain Management
Brands and dispensaries can now connect custom domains to their BakedBot menu.

| Connection Type | Use Case | Example |
|-----------------|----------|---------|
| CNAME | Subdomains | `shop.mybrand.com` |
| Nameserver | Full domains | `mybrandmenu.com` |

**Key Files:**
- `src/server/actions/domain-management.ts` — Server actions
- `src/lib/dns-verify.ts` — DNS verification
- `src/app/dashboard/settings/components/domain-tab.tsx` — Dashboard UI

> Details: `refs/backend.md` → Custom Domain Management section

### Menu Embed (Headless)
iframe-based embeddable menu widget for external sites.

```html
<iframe src="https://bakedbot.ai/embed/menu/BRAND_ID?layout=grid" />
```

**Note:** Embeds do NOT provide SEO benefits. Use custom domains for SEO.

> Details: `refs/frontend.md` → Menu Embed section

### Unit Tests Added
74 new tests for domain and embed features:
- `tests/lib/dns-verify.test.ts`
- `tests/lib/domain-cache.test.ts`
- `tests/actions/domain-management.test.ts`
- `tests/embed/menu-embed.test.ts`

---

*This context loads automatically. For domain-specific details, consult `.agent/refs/`.*
