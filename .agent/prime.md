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

**Current Status:** 🟢 Passing (verified 2026-02-19)

**Recent work (2026-02-19):** See `memory/MEMORY.md` for full log.
Key completed:
- [Menu Command Center] (`d2803d65`) — Dashboard /dashboard/menu now has Live Preview tab (full BrandMenuClient embed = exact public menu), drag-to-reorder with Firestore persistence, per-card overlays (Price Sheet, Bundle Sheet, Discuss→Inbox), Full Screen toggle.
- [Brand Guide smart onboarding] (`b9a24074`) — Fixed scan pre-fill bugs; added dispensary type, city/state, logo preview, social handles, smart voice defaults.
- [Leafly Brand Logo Seeder + Brand Carousel] (`810eeac7`, `959a40ef`) — Leafly scraper for brand logos + product image sync scripts. Featured Brands carousel now shows logos in Thrive menu.
- [Mid-Tier Brand Logos Seed] (`7fe7f898`) — Seed script for mid-tier brand logos + upload utilities. See `scripts/seed-brand-logos.ts`.
- [Linus Slack Timeout Fix] (`1d9f7aaf`) — Linus timeout raised 55s → 240s; harness iteration cap set to 8. Prevents Slack reply timeouts on complex CTO queries.
- [Heartbeat Gray Pulse Fix] (`92d8345f`) — Permanent fix for gray pulse on orgs without tenant doc. Heartbeat now resolves correctly for all org types.
- [The Herbalist Samui — International Pilot] (`abf56b8e`) — First international dispensary on BakedBot. Koh Samui, Thailand. Org `dispensary_herbalistsamui`, 22 demo products (THB ฿ pricing), 4 local competitors, Cloud Scheduler daily CI at 9 AM Bangkok, invites to jack@bakedbot.ai + bryan@thebeachsamui.com. See `scripts/seed-herbalist-samui.ts` + `HERBALIST_SAMUI_SETUP.md`.
- [Multi-Region ISR: Thailand/Koh Samui] (`f9b85263`) — New `/destination/[country]/[city]` route structure with 4-hour ISR cache. RTRVR-powered Google Maps scraping, multi-currency (THB/VND/KHR/USD), GitHub Actions daily automation (3 AM UTC). Seeded 4 Koh Samui dispensaries. See `src/app/destination/` + `src/server/services/growth/international-discovery.ts`.

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

> All detailed docs in `.agent/refs/` — load on demand, not upfront.

| System | Status | Key Ref |
|--------|--------|---------|
| Alleaves POS (Thrive) | ✅ 95% data capture | `refs/alleaves-pos.md` |
| BakedBot Drive (viewer/editor/AI) | ✅ Live | `src/components/drive/` |
| NY OCM Delivery System | ✅ 6 phases | `refs/delivery-system.md` |
| Slack Agent Integration | ✅ 14 channels | `memory/slack.md` |
| Heartbeat + Auto-recovery | ✅ 99.9% uptime | `memory/platform.md` |
| Playbook Engine (23 playbooks) | ✅ Empire tier live | `memory/playbooks.md` |
| Super User Agent Tools (28) | ✅ All wired | `refs/super-user-agent-tools.md` |
| Vibe Builder | ✅ + 150 tests | `refs/vibe-builder-spec.md` |
| Billing (Phases 1-10) | ✅ Tests passing | `refs/` (various) |
| Creative Studio (Canva-style) | ✅ 3-panel layout | `src/app/dashboard/creative/` |
| Help Center (50 articles) | ✅ Feb 2026 | `src/app/help/` |
| Pilot Customers | ✅ Thrive (US) + Herbalist Samui (🇹🇭 INT'L) | `memory/customers.md` + `HERBALIST_SAMUI_SETUP.md` |
| International ISR Pages | ✅ Thailand/Koh Samui live | `src/app/destination/` |

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
| Alleaves POS | `refs/alleaves-pos.md` |
| Pilot customer grounding | `src/server/grounding/` (inline docs) |

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

> Full details: `refs/agents.md`

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

| Pitfall | Prevention |
|---------|------------|
| Editing code without reading it | Always use Read tool first |
| Skipping build check | Run `npm run check:types` before and after |
| Large changes without plan | Break into smaller increments |
| Forgetting to archive | Use `archive_work` after significant changes |
| Assuming file structure | Use Glob/Grep to verify |
| Using `&&` in PowerShell | Use `;` instead |
| Runtime-only env vars at module level | Use lazy initialization (see Next.js Build Gotcha below) |
| Using `latest` for secrets in apphosting.yaml | **Always use explicit version numbers** (e.g. `@6`) |

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

*This context loads automatically. For domain-specific details, consult `.agent/refs/`. For session history, see `memory/MEMORY.md` and `dev/work_archive/`.*
