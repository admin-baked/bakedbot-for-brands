# Dispensary UX Condense Plan (Thrive-Style Operator Paths)

## Goal
Make BakedBot feel like one tight operating system for dispensaries by reducing surface sprawl and centering daily workflows around a few high-frequency paths.

Primary promise:
- launch and run a headless menu + budtender quickly

Secondary promise:
- deploy agents/playbooks that actually execute and improve outcomes

---

## Ideal User Paths

## Path A — Daily Operator (Most Frequent)
**Who:** GM / Marketing manager / Inventory lead
**Frequency:** Daily
**Desired time-to-value:** < 5 minutes

### Entry
1. Open dashboard to **Menu OS Home**.
2. See one health strip:
   - POS sync status
   - product reconciliation delta
   - analytics freshness
   - active playbook health

### Core actions
1. Click **Sync now** (if needed)
2. Review **exceptions only**:
   - product count mismatch
   - stale analytics source
   - failed playbook runs
3. Publish/approve merchandising updates (carousels/heroes/bundles) from one composer.

### Exit criteria
- Menu is current
- Budtender uses latest catalog
- No unresolved critical exceptions

---

## Path B — Weekly Growth Review
**Who:** Owner / Operator / Revenue lead
**Frequency:** Weekly

### Entry
1. Open **Revenue Intelligence** view.
2. See goals + analytics merged into one narrative:
   - what changed
   - why it changed
   - what to run next

### Core actions
1. Accept/adjust cached AI goal suggestions (weekly refresh max)
2. Trigger recommended playbooks
3. Track post-run impact tied to selected goals

### Exit criteria
- 1–3 active weekly priorities
- playbooks mapped to priorities
- attribution visible in next review

---

## Path C — Setup / Admin
**Who:** Admin / Implementer
**Frequency:** Infrequent

### Entry
1. Open **Setup & Integrations**.

### Core actions
1. Connect POS
2. Complete Brand Guide
3. Configure role + delivery defaults

### Exit criteria
- Setup completeness score at 100%
- no broken save paths
- no missing auth/tenant context

---

## IA Condense Proposal

## 1) Collapse primary nav to four workspaces
1. **Menu OS** (menu + products + merchandising + publish + budtender)
2. **Automation** (playbooks + agents + run health)
3. **Revenue Intelligence** (analytics + goals + recommendations)
4. **Setup** (brand guide + integrations + team + permissions)

## 2) Move long-tail pages behind contextual drawers
- Keep routes for compatibility.
- Remove top-level clutter by linking advanced pages from workspace sub-panels.

## 3) Replace page-first navigation with task-first cards
Examples:
- “Sync and reconcile menu”
- “Review failed playbooks”
- “Adopt this week’s goals”
- “Publish merchandising changes”

---

## Thrive-Specific Operating Flow Example

### Morning (5–10 min)
- Sync Alleaves
- Resolve product delta exceptions
- Confirm budtender readiness

### Midday (5 min)
- Check playbook run health (competitive intel, lifecycle)
- Retry failed runs from one queue

### Weekly (20–30 min)
- Review goals/analytics story
- Adopt 1–2 recommended actions
- Schedule next-week playbooks

---

## Immediate Product Tightening Backlog

## P0
1. Create a single **Menu OS Home** surface from existing modules.
2. Add global **Health Strip** component with four statuses (sync, count delta, analytics freshness, playbook health).
3. Unify “sync warning” and “exception” language across menu/products/analytics.

## P1
1. Merge Carousels/Heroes/Bundles under Menu composer tabs.
2. Add “Run health” chips to playbook cards (last run, next run, last error).
3. Show weekly goal suggestion cache metadata in UI.

## P2
1. Introduce role-based workspace defaults:
   - staff → Menu OS
   - marketing → Automation
   - owner → Revenue Intelligence

---

## Success Metrics
1. Time to first successful menu sync after login.
2. % sessions resolved via top 3 workflows without deep navigation.
3. Reduction in support tickets for:
   - product mismatch
   - analytics empty state
   - playbook “enabled but not running” confusion
4. Weekly active usage of goals + playbooks in the same session.
