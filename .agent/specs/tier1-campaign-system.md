# Production Spec: Campaign System

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agents:** Craig (Marketer), Deebo (Enforcer)
**Tier:** 1 — Revenue + Compliance

---

## 1. Feature Overview

The Campaign System enables dispensary brands to create, review, and send marketing campaigns via SMS (Blackleaf) and Email (Mailjet). Craig (the Marketer agent) orchestrates campaign creation — generating copy, selecting audiences, and scheduling sends. Every campaign MUST pass Deebo's compliance gate before being sent. The system tracks sends in `customer_communications` for deduplication, enforces TCPA opt-out in every SMS, and gates sends by subscription tier.

---

## 2. Current State

### Shipped ✅
- Craig agent dispatches via `src/app/api/agents/craig/dispatch/route.ts`
- Campaign creation wizard at `src/app/dashboard/agents/craig/campaigns/new/page.tsx`
- Campaign list at `src/app/dashboard/campaigns/page.tsx`
- SMS send via Blackleaf (`BLACKLEAF_API_KEY`)
- Email send via Mailjet (`MAILJET_API_KEY` / `MAILJET_SECRET_KEY`)
- Deebo compliance gate — campaigns blocked until Deebo approves
- Campaign dedup via `customer_communications` collection (type + sentAt >= lookbackDate)
- TCPA opt-out enforcement in every SMS
- Campaign performance tracking (open rate, click rate, conversions)
- Golden set eval suite: `.agent/golden-sets/craig-campaigns.json` (15 cases)
- Compliance badge UI in Creative Studio (`deebo-badge.tsx`)
- Role-gating: scout role limited to 1 variation

### Partially Working ⚠️
- Email warmup integration exists (`src/server/services/email-warmup.ts`) — integration depth unknown
- Campaign scheduling (time-zone-aware delivery) — present but untested across timezones
- Campaign analytics (ROI, cost per conversion) — data exists, UI completeness uncertain

### Not Implemented ❌
- Deebo gate integration test that verifies gate is NOT bypassable
- Send failure + retry logic for Blackleaf/Mailjet transient errors
- Rate limiting per org (e.g. max N campaigns/day)
- Unsubscribe list sync from Blackleaf → internal CRM (manual only today)

---

## 3. Acceptance Criteria

### Functional
- [ ] Craig can create an SMS campaign with audience segment, copy, and schedule
- [ ] Craig can create an Email campaign with subject line, body, and schedule
- [ ] Deebo MUST review and approve every campaign before the send button is enabled
- [ ] Deebo rejection with reason must be shown to the brand owner
- [ ] TCPA opt-out text is present in every outbound SMS — verified by regex, not LLM
- [ ] Dedup check prevents sending same campaign type to the same customer within lookback window
- [ ] Campaign sends are recorded in `customer_communications` with timestamp, type, orgId
- [ ] Scout role can only create 1 variation per campaign (role-gate enforced server-side)
- [ ] Campaign list shows status: draft / pending-review / approved / sent / failed

### Compliance / Security
- [ ] Deebo gate cannot be skipped via direct API call (server-side enforcement, not UI-only)
- [ ] TCPA opt-out enforced at send layer, not just in copy generation
- [ ] `requireUser()` + org membership check on all campaign endpoints
- [ ] `BLACKLEAF_API_KEY` and `MAILJET_API_KEY` never logged or exposed in client
- [ ] NY/CA/IL jurisdiction rules applied to campaigns targeting those states

### Performance
- [ ] Campaign creation (copy generation) completes in < 30s
- [ ] Deebo compliance check completes in < 15s (regex fast path for known violations)
- [ ] Campaign send (batch) handles 500+ recipients without timeout

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No server-side test that Deebo gate is un-bypassable via direct API | 🔴 Critical | UI blocks it but untested at API layer — compliance risk |
| Blackleaf send failure has no retry logic | 🟡 High | Transient failures silently drop sends |
| Unsubscribe sync from Blackleaf → BakedBot CRM is manual | 🟡 High | TCPA compliance depends on keeping opt-out list fresh |
| Only 15 golden set cases for Craig | 🟡 High | Doesn't cover bulk send, schedule edge cases, multi-org scenarios |
| Email warmup depth unknown | 🟡 High | Warming domain before bulk send — unclear if actually wired end-to-end |
| No rate limiting per org | 🟢 Low | Could be abused on Empire tier with unlimited sends |
| Campaign analytics ROI calculation not validated | 🟢 Low | Revenue attribution logic needs review |
| No timezone-aware send validation test | 🟢 Low | Scheduled sends may fire at wrong local time |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Craig campaign golden set | `.agent/golden-sets/craig-campaigns.json` | 15 cases: compliance behavior, copy quality, role-gating, TCPA |

### Missing Tests (Required for Production-Ready)
- [ ] `campaign-gate.integration.test.ts` — verifies Deebo gate blocks direct API send without approval
- [ ] `tcpa-opt-out.unit.test.ts` — verifies TCPA opt-out regex matches all outbound SMS at send layer
- [ ] `campaign-dedup.unit.test.ts` — verifies dedup check prevents re-send within lookback window
- [ ] `blackleaf-retry.unit.test.ts` — verifies Blackleaf 5xx triggers retry with backoff
- [ ] `campaign-role-gate.unit.test.ts` — verifies scout role limited to 1 variation at API layer

### Golden Set Eval
| Golden Set | Location | Threshold | Last Run |
|------------|----------|-----------|---------|
| Craig campaigns | `.agent/golden-sets/craig-campaigns.json` | 90% overall / 100% compliance | 2026-02-19 |

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Deebo | Compliance gate for every campaign | Campaign cannot be sent — correct, not a failure |
| CRM / customer_communications | Dedup + opt-out tracking | Dedup skipped if collection unavailable — risk of double-send |
| Craig agent harness | Orchestrates campaign creation flow | Campaign creation fails with user-visible error |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Blackleaf | SMS delivery | None — hard dependency; queue locally if down |
| Mailjet | Email delivery | None — hard dependency |
| CLAUDE_API_KEY | Deebo LLM compliance check | Regex fast-path still works for known violations |

---

## 7. Degraded Mode

- **If Blackleaf is down:** Queue campaign send, show pending status, retry when service restores. Do NOT silently drop.
- **If Deebo LLM check times out:** Fall back to regex-only check (conservative — blocks on any uncertain case). Never auto-approve.
- **If Mailjet rejects API key:** Campaign enters failed state. Alert org owner via Slack (if connected).
- **Data loss risk:** `customer_communications` record must be written atomically with send. If write fails, record missed send in error log.

---

## 8. Open Questions

1. **Unsubscribe sync cadence**: How often does Blackleaf's opt-out list sync back to BakedBot? Is this real-time (webhook), daily batch, or manual? Owner needs to define SLA.
2. **Deebo timeout policy**: If Deebo's LLM check takes > 15s, should we block, auto-approve, or default-block? Current behavior untested.
3. **Empire tier bulk send limits**: No rate limiting today. Should there be a daily send cap to prevent abuse / carrier flagging?
4. **Multi-org campaign**: If a super user creates a campaign for multiple orgs at once, does Deebo run per-org jurisdiction rules? Behavior undefined.

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
