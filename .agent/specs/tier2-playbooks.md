# Production Spec: Playbooks System

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Leo (COO), All field agents
**Tier:** 2 — Core Product

---

## 1. Feature Overview

Playbooks are persistent automation workflows created by agents via natural language or cloned from templates. Each playbook has triggers (manual, schedule, event, calendar), steps (actions with params), and validation thresholds. Playbooks are agent-owned (Smokey, Craig, Pops, etc.) and category-tagged (intel, marketing, ops, reporting, compliance). The system supports 23+ playbooks across Empire tier, role-based views (brand/dispensary/super_user), event-driven execution (customer.signup, order.created, inventory.low_stock), revenue attribution (7-day window), and webhook integrations (Shopify, WooCommerce). Playbooks can be edited, duplicated, deleted, and toggled on/off.

---

## 2. Current State

### Shipped ✅
- Playbook CRUD UI at `/dashboard/playbooks` with glassmorphism cards
- AgentChat interface for natural language playbook creation ("Create a playbook for...")
- 23 system playbooks in `src/config/playbooks.ts` (22 for Empire tier, 1 scout-only)
- 4-step playbook wizard: Create from scratch, Clone template, Natural language, or Edit existing
- Playbook toggle switches (enable/disable) with toast notifications
- Edit/Duplicate/Delete handlers (Edit opens AgentChat with context, Duplicate creates copy with `_copy_` suffix, Delete with confirmation prompt)
- Role-based filtering: Brand/Dispensary views redirect to role-specific components (`BrandPlaybooksView`, `DispensaryPlaybooksView`)
- Playbook engine: assignment-service, execution-service, trigger-engine (`src/lib/playbooks/`)
- Event bridge: `playbook-event-dispatcher.ts` dispatches events to matching playbooks
- Revenue attribution: 7-day window linking playbook deliveries to subsequent orders (`playbook-attribution.ts`)
- Webhook integrations: Shopify, WooCommerce with HMAC verification
- Cron routes: `/api/cron/playbooks/daily`, `/api/cron/playbooks/weekly`
- Firestore collections: `playbook_event_listeners`, `playbook_deliveries`, `playbook_executions`, `customer_communications` (dedup table)
- Tier templates: 3 Pro, 4 Enterprise in `src/app/onboarding/templates/pro-tier-playbooks.ts`
- Seed endpoint: `POST /api/admin/seed-playbooks`
- Activity feed + usage meter on playbooks page

### Partially Working ⚠️
- AgentChat playbook builder works but no validation that generated YAML is syntactically correct
- Playbook execution runs but no real-time status updates (user must refresh to see results)
- Revenue attribution calculated but no UI dashboard showing ROI per playbook
- Webhook HMAC verification implemented but unclear if tested against real Shopify/WooCommerce payloads
- Playbook dedup (customer_communications 24h window) works but no UI to show skipped sends
- Playbook approval flow (requiresApproval flag) auto-detected but no approval UI
- Self-validating agent pattern (retryOnFailure, maxRetries, validationThreshold) defined but unclear if enforced during execution

### Not Implemented ❌
- Playbook version control (no rollback to previous version if user breaks it)
- Playbook templates marketplace (no sharing playbooks across orgs)
- Playbook analytics dashboard (execution count, success rate, revenue attributed — data exists but no UI)
- Playbook testing mode (dry-run to preview what would happen without actually sending)
- Playbook collaboration (no multi-user editing or comments)
- Playbook import/export (no JSON/YAML download for backup)
- Playbook dependency graph (no visualization of which playbooks depend on which events)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can create a playbook via AgentChat by typing "Create a playbook for [goal]"
- [ ] User can clone a template playbook (daily_intel, lead_followup, weekly_kpi, low_stock_alert)
- [ ] User can toggle a playbook on/off — status persists to Firestore
- [ ] User can edit a playbook — AgentChat opens with current config pre-filled
- [ ] User can duplicate a playbook — copy appears with `_copy_` suffix and status=disabled
- [ ] User can delete a playbook with confirmation prompt
- [ ] Playbook triggers fire on schedule (cron) or event (customer.signup, order.created)
- [ ] Playbook steps execute in order — delegation to other agents works
- [ ] Playbook deliveries (email/SMS) recorded in `playbook_deliveries` collection
- [ ] Playbook revenue attribution links deliveries to orders within 7-day window
- [ ] Playbook dedup skips sending to same customer within 24h window (customer_communications table)
- [ ] Webhook events (Shopify, WooCommerce) dispatch to matching playbooks with HMAC verification
- [ ] Empire tier users see all 22 playbooks active by default (not 23 — weekly-competitive-snapshot is scout-only)

### Compliance / Security
- [ ] Playbooks with customer-facing emails MUST have requiresApproval=true (auto-detected from steps)
- [ ] Playbook execution MUST check orgId — no cross-tenant execution
- [ ] Webhook HMAC verification MUST succeed before event dispatched (no replay attacks)
- [ ] Playbook YAML sanitization prevents code injection (no eval() or exec() in step params)
- [ ] `SHOPIFY_WEBHOOK_SECRET`, `WOOCOMMERCE_WEBHOOK_SECRET` never exposed to client

### Performance
- [ ] Playbook list page loads in < 1s for users with 50+ playbooks
- [ ] Playbook execution completes in < 30s for simple workflows (1-3 steps)
- [ ] Playbook event dispatch completes in < 5s (fire-and-forget pattern)
- [ ] Revenue attribution calculation runs daily in < 10s per org

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No playbook YAML validation | 🔴 Critical | User can save broken YAML — fails silently at execution time |
| No playbook approval UI | 🔴 Critical | requiresApproval flag exists but no approval workflow |
| No playbook testing/dry-run mode | 🟡 High | Can't preview execution without actually sending emails/SMS |
| Revenue attribution has no UI dashboard | 🟡 High | Data calculated but invisible to users |
| Webhook HMAC verification unclear if production-tested | 🟡 High | Implemented but unclear if validated against real Shopify/WooCommerce |
| No real-time execution status | 🟡 High | User must refresh page to see playbook results |
| Self-validating agent pattern unclear if enforced | 🟡 High | retryOnFailure, maxRetries, validationThreshold defined but execution unclear |
| No playbook version control | 🟢 Low | Can't roll back if user breaks playbook |
| No playbook analytics dashboard | 🟢 Low | Success rate, execution count invisible |
| No playbook templates marketplace | 🟢 Low | Can't share playbooks across orgs |
| No playbook import/export | 🟢 Low | No JSON/YAML backup |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Activity feed | `src/app/dashboard/playbooks/components/__tests__/activity-feed.test.tsx` | Validates activity feed UI |
| Smokey recommends | `src/app/dashboard/playbooks/components/__tests__/smokey-recommends.test.tsx` | Validates playbook recommendations |

### Missing Tests (Required for Production-Ready)
- [ ] `playbook-crud.integration.test.ts` — validates create/edit/duplicate/delete playbook server actions
- [ ] `playbook-event-dispatch.integration.test.ts` — validates event→playbook matching + execution
- [ ] `playbook-revenue-attribution.unit.test.ts` — validates 7-day window links deliveries to orders
- [ ] `playbook-dedup.unit.test.ts` — validates customer_communications 24h dedup logic
- [ ] `playbook-webhook-hmac.unit.test.ts` — validates Shopify/WooCommerce HMAC verification
- [ ] `playbook-yaml-validation.unit.test.ts` — validates YAML parser catches syntax errors
- [ ] `playbook-execution-retry.integration.test.ts` — validates retryOnFailure + maxRetries logic
- [ ] `playbook-tier-activation.integration.test.ts` — validates Empire tier activates 22 playbooks (not 23)

### Golden Set Eval
Not applicable — Playbooks are user-created workflows, not agent-generated content.

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Agent harness | Executes playbook steps that delegate to agents | Playbook execution fails at delegation step |
| Firestore | Stores playbook config, executions, deliveries | Playbook data lost |
| Mailjet | Sends emails from playbook steps | Email steps fail — execution marked as failed |
| Blackleaf | Sends SMS from playbook steps | SMS steps fail — execution marked as failed |
| POS sync | Provides inventory data for inventory.low_stock events | Low stock playbooks never trigger |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Shopify webhooks | Trigger playbooks on order.created, customer.signup | None — hard dependency for Shopify integrations |
| WooCommerce webhooks | Trigger playbooks on order.created, customer.signup | None — hard dependency for WooCommerce integrations |

---

## 7. Degraded Mode

- **If Firestore is down:** Queue playbook executions in-memory, sync when restored. Show "Playbooks offline" banner.
- **If Mailjet is down:** Mark email steps as failed, retry after 1 hour. Alert user via Slack.
- **If agent harness times out:** Retry delegation step up to maxRetries (default 3), then mark playbook as failed.
- **If webhook HMAC verification fails:** Log security alert, do NOT execute playbook (prevents replay attacks).
- **Data loss risk:** If playbook execution writes to Firestore fail mid-run, steps lost. Mitigation: Write execution record at start (status=running), update at completion.

---

## 8. Open Questions

1. **Playbook approval workflow**: Should we build a UI for requiresApproval playbooks, or is auto-detection + manual review sufficient?
2. **Playbook testing mode**: Should dry-run mode show full execution trace (which steps would run, what emails would send), or just a summary?
3. **Revenue attribution UI**: Should playbook analytics dashboard be a separate page or inline on playbooks list?
4. **Webhook validation**: Should we validate Shopify/WooCommerce HMAC in production before launch, or trust implementation?
5. **Self-validating agent pattern**: Should retryOnFailure be enabled by default for all playbook steps, or only customer-facing ones?
6. **Playbook version control**: Should we auto-save every edit as a new version, or require user to manually "Save Version"?
7. **Playbook templates marketplace**: Should brands be able to publish playbooks for other orgs to clone, or keep all playbooks org-private?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
