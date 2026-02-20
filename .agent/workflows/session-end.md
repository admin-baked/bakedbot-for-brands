# Session End Workflow: "Update Recent Work"

> **Purpose:** Standardized end-of-session documentation update protocol
> **Trigger:** User command "Update recent work" (or similar)
> **Applies to:** All agents working on BakedBot codebase

---

## Overview

When the user gives the command **"Update recent work"** (or variants like "update the docs", "document this session"), execute this 5-step checklist **automatically** — no questions, no confirmation needed.

This workflow maintains 3 critical documentation files that provide context to future sessions:
1. `CLAUDE.md` — Build health status
2. `.agent/prime.md` — Recent work summary (2 lines max)
3. `memory/MEMORY.md` — Detailed session notes + topic routing

---

## 5-Step Workflow

### Step 1: Update `CLAUDE.md` Build Status

**File:** `CLAUDE.md`
**Line:** 15 (in the "🚨 FIRST: Check Build Health" section)

**Update this line:**
```markdown
**Current Status:** 🟢 Passing | **Last update:** YYYY-MM-DD (Feature A, Feature B)
```

**Format rules:**
- Status emoji: 🟢 Passing | 🟡 Warning | 🔴 Failing
- Date: Today's date (YYYY-MM-DD format)
- Features: Brief 2-3 word summary in parentheses (e.g., "Pagination, Redis caching")

**Example:**
```markdown
**Current Status:** 🟢 Passing | **Last update:** 2026-02-19 (Pagination, Redis caching, CDN guide)
```

---

### Step 2: Update `.agent/prime.md` Recent Work Block

**File:** `.agent/prime.md`
**Lines:** ~21–24 (look for the "Recent work" block near the top)

**Update this block:**
```markdown
**Recent work (YYYY-MM-DD):** See `memory/MEMORY.md` for full log.
Key completed: [Feature A] (`commitHash`), [Feature B] (`commitHash`)
```

**Critical rules:**
- **Maximum 2 lines** (excluding the header line)
- **Feature names only** — no implementation details
- **Commit hashes** in backticks (e.g., \`3a2ce203\`)
- Keep it scannable — a human should understand "what shipped" in 5 seconds

**Example:**
```markdown
**Recent work (2026-02-19):** See `memory/MEMORY.md` for full log.
Key completed: [Week 2 pagination] (`3a2ce203`), [Redis caching] (`0ef1e851`), [CDN setup guide] (`0ef1e851`)
```

---

### Step 3: Update `memory/MEMORY.md` Session Entry

**File:** `memory/MEMORY.md`
**Location:** Prepend at the top (or append to today's session if it already exists)

**Add a new session block:**
```markdown
## Session YYYY-MM-DD (Brief Title) ✅
- **Feature A** (`commitHash`) — 2-3 sentence summary
  - Sub-detail if needed
  - Another sub-detail
- **Feature B** (`commitHash`) — summary
- **Feature C** (`commitHash`) — summary

### Gotchas (session title):
- Gotcha 1 — brief explanation
- Gotcha 2 — brief explanation
```

**Content guidelines:**
- **Title:** Describe the theme (e.g., "Pagination + Caching", "Compliance Infra")
- **Features:** 3-5 bullet points max, each with commit hash
- **Gotchas:** New patterns/pitfalls discovered during this session
- **Keep it lean:** If a topic gets >10 lines, split to a topic file (Step 4)

**CRITICAL:** If `MEMORY.md` exceeds 200 lines, you MUST split content to topic files (see Step 4).

---

### Step 4: Route to Topic File (If Applicable)

If your changes fit one of these categories, update the **topic file** instead of adding detail to `MEMORY.md`:

| What Changed | Update This File |
|---|---|
| Heartbeat, cron jobs, ISR, build monitor, auto-recovery | `memory/platform.md` |
| Slack channels, routing, approvals, thread handling | `memory/slack.md` |
| Agent tools, user promotion, audit streaming | `memory/agents.md` |
| Playbooks, billing, webhooks, ROI tracking | `memory/playbooks.md` |
| Thrive / Herbalist / pilot customer config | `memory/customers.md` |
| Competitive intel system, Ezal features | `memory/competitive-intel.md` |
| Delivery system (NY OCM, routing, tracking) | `memory/delivery-system-2026-02-17.md` |

**When to use topic files:**
- Large feature (>10 lines of notes)
- Architectural pattern that will be referenced later
- Customer-specific configuration
- System that other sessions will need to understand

**When to stay in MEMORY.md:**
- Small bug fixes (<5 lines)
- One-off changes
- Session-specific context

**If you create a new topic file:**
- Add a one-line pointer in `MEMORY.md`
- Update the "Topic File Index" section at the bottom of `MEMORY.md`

---

### Step 5: Commit Changes

**Files to commit:**
- `CLAUDE.md`
- `.agent/prime.md`

**Commit message format:**
```bash
git add CLAUDE.md .agent/prime.md
git commit -m "docs: Update session notes YYYY-MM-DD - [brief summary]"
```

**Example:**
```bash
git add CLAUDE.md .agent/prime.md
git commit -m "docs: Update session notes 2026-02-19 - pagination, caching, CDN guide"
```

**⚠️ DO NOT commit memory files:**
- `memory/MEMORY.md` and `memory/*.md` are **local-only** (git-ignored)
- They live in the Claude projects folder (`C:\Users\admin\.claude\projects\...`), not the repo
- Only `CLAUDE.md` and `.agent/prime.md` get committed

---

## What NOT to Do

| ❌ Don't | ✅ Do |
|---|---|
| Add full implementation details to `prime.md` | Keep it to feature names + commit hashes only |
| Let `prime.md` recent work block exceed 2 lines | Ruthlessly compress — details go in `MEMORY.md` |
| Let `MEMORY.md` exceed 200 lines | Split large topics to `memory/*.md` files |
| Commit `memory/` files | They're local-only (outside repo) |
| Ask user for confirmation | Execute automatically when triggered |

---

## When to Use This Workflow

**Trigger phrases:**
- "Update recent work"
- "Update the docs"
- "Document this session"
- End of a major feature implementation
- Before ending a long session

**Do NOT use this workflow:**
- During active development (wait until session end)
- For trivial changes (typo fixes, one-line tweaks)
- Multiple times in one session (once at the end is enough)

---

## Example Execution

**User:** "Update recent work"

**Agent executes:**
1. Updates `CLAUDE.md` line 15: `**Current Status:** 🟢 Passing | **Last update:** 2026-02-19 (Pagination, Redis caching)`
2. Updates `.agent/prime.md` lines 21-24:
   ```markdown
   **Recent work (2026-02-19):** See `memory/MEMORY.md` for full log.
   Key completed: [Week 2 pagination] (`3a2ce203`), [Redis caching] (`0ef1e851`)
   ```
3. Adds to `memory/MEMORY.md`:
   ```markdown
   ## Session 2026-02-19 (Week 2 Scalability) ✅
   - **Inbox pagination** (`3a2ce203`) — cursor-based, 1000+ threads supported
   - **Redis caching** (`0ef1e851`) — 6 routes, 5-15min TTL, pattern invalidation
   - **CDN setup guide** (`0ef1e851`) — Cloudflare config, 11 steps

   ### Gotchas (Week 2):
   - TypeScript `Query` type annotation required after `.limit()` or `.startAfter()`
   - `invalidateCachePattern()` for wildcards, not `invalidateCache()`
   ```
4. (No topic file routing needed — changes are small)
5. Commits:
   ```bash
   git add CLAUDE.md .agent/prime.md
   git commit -m "docs: Update session notes 2026-02-19 - pagination, caching, CDN"
   ```

**Agent replies to user:**
"✅ Documentation updated. Session notes committed to `CLAUDE.md` and `.agent/prime.md`, detailed log in `memory/MEMORY.md`."

---

## Quick Reference Card

```
User: "Update recent work"

→ Step 1: CLAUDE.md line 15 (build status + date)
→ Step 2: prime.md lines 21-24 (2-line summary)
→ Step 3: MEMORY.md (session block + gotchas)
→ Step 4: Route to topic file if >10 lines
→ Step 5: Commit (CLAUDE.md + prime.md only)

✅ Done. No questions needed.
```

---

*This workflow ensures consistent, scannable documentation across all sessions and agents.*
