# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves."

---

## 🧭 Core Principles

1. **Thoroughness Over Speed** — Complete tasks in phases; quality context = quality output
2. **Simplicity First** — Direct code > clever abstractions; fix first, refactor later
3. **Explore Before Acting** — Never assume file contents; always read first

---

## 🏥 Codebase Health

| Metric | Status | Command |
|--------|--------|---------|
| **Build** | 🟢 Passing | `npm run check:types` |
| **Tests** | 🟢 45+ Passing | `npm test` |
| **Deploy** | 🟢 Stable | `git push origin main` |

**Critical Rules:**
- Use `logger` from `@/lib/logger` (never `console.log`)
- Prefer `unknown` over `any`
- Fix build errors FIRST before new work

---

## 📚 Reference Index

**All detailed documentation lives in `.agent/refs/`:**

| Category | Reference File |
|----------|----------------|
| **Agents** | `refs/agents.md` — Squad, tools, architecture |
| **Integrations** | `refs/integrations.md` — External services |
| **API** | `refs/api.md` — Routes, endpoints |
| **Auth** | `refs/authentication.md` — Session, roles |
| **Backend** | `refs/backend.md` — Services, actions |
| **Frontend** | `refs/frontend.md` — Components, UI |
| **Testing** | `refs/testing.md` — Jest, Playwright |
| **Roles** | `refs/roles.md` — RBAC hierarchy |
| **Onboarding** | `refs/onboarding.md` — Claim flow |
| **Tools** | `refs/tools.md` — Agent tools |
| **Workflows** | `refs/workflows.md` — Playbooks |
| **Demo Page** | `refs/demo-page.md` — Homepage chat |
| **Pilot Setup** | `refs/pilot-setup.md` — Quick provisioning |
| **Intelligence** | `refs/bakedbot-intelligence.md` — Letta memory |
| **Discovery** | `refs/bakedbot-discovery.md` — Web scraping |
| **Browsing** | `refs/autonomous-browsing.md` — RTRVR |
| **Context OS** | `refs/context-os.md` — Decision lineage |
| **Intuition OS** | `refs/intuition-os.md` — Proactive intel |
| **Intention OS** | `refs/intention-os.md` — Intent parsing |
| **Super Users** | `refs/super-users.md` — Owner protocol |
| **Work Archive** | `refs/work-archive.md` — Historical context |

---

## ⚡ Quick Reference

### Development Environment
- **Shell**: PowerShell (use `;` not `&&`)
- **Deploy**: `git push origin main` (never `firebase deploy`)

### Key Directories
```
src/server/agents/     # Agent implementations
src/server/services/   # Business logic
src/server/tools/      # Agent tools
src/app/api/           # API routes
src/components/        # React components
.agent/refs/           # Reference documentation
dev/work_archive/      # Historical artifacts
```

### Critical Commands
| Command | Purpose |
|---------|---------|
| `npm run check:types` | Verify build health |
| `npm test` | Run tests |
| `git push origin main` | Deploy |

### Workflow: Fix → Test → Archive → Ship
1. Query `dev/work_archive/` before changing files
2. Make change with context from past work
3. Run `npm test -- <file>.test.ts`
4. If pass → commit; if fail → analyze + retry (max 3x)
5. Archive decisions to `dev/work_archive/`

---

## 🕵️ Agent Squad (Quick Reference)

**Executive Boardroom:** Leo (COO), Jack (CRO), Linus (CTO), Glenda (CMO), Mike (CFO)

**Support Staff:** Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, Deebo, Day Day, Felisha, Big Worm

> See `refs/agents.md` for full details, tools, and architecture.

---

## 🔌 Integration Quick Reference

| Service | Agent | Purpose |
|---------|-------|---------|
| **Blackleaf** | Craig | Default SMS |
| **Mailjet** | Craig | Default Email |
| **Alpine IQ** | Mrs. Parker | Loyalty |
| **CannMenus** | Ezal | Live Pricing |
| **Authorize.net** | Money Mike | Payments |

> See `refs/integrations.md` for full details.

---

*For detailed documentation on any topic, navigate to the appropriate reference file in `.agent/refs/`.*
