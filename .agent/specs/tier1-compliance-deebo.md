# Production Spec: Compliance System (Deebo + Regulation Monitor)

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agents:** Deebo (Enforcer)
**Tier:** 1 — Compliance

---

## 1. Feature Overview

The Compliance System is BakedBot's legal protection layer. Deebo (the Enforcer agent) reviews all outbound content — campaigns, social posts, chatbot responses — and blocks anything that violates cannabis advertising regulations. The system operates on two tracks: a regex fast-path for known hard violations (medical claims, age-related language) and an LLM semantic track for nuanced compliance judgment. Jurisdiction-specific rule packs apply different standards for NY, CA, and IL. A separate Regulation Monitor runs weekly to detect changes in cannabis law and draft proposed rule pack updates for human review.

This system has **zero tolerance for false negatives** — a compliant-but-actually-illegal campaign being sent is a legal liability. False positives (over-blocking) are acceptable.

---

## 2. Current State

### Shipped ✅
- Deebo agent (`src/server/agents/deebo.ts` + `deebo-agent-impl.ts`)
- Regex rule packs for NY, CA, IL (5-6 rules each) — medical claims, unsubstantiated claims, age targeting
- Jurisdiction fallback: SMS/email → retail channel rules; channel → retail fallback for unknowns
- `deeboCheckAge()` + `deeboCheckStateAllowed()` — deterministic fast-path functions
- `getRulePack(state, channel)` — returns correct rule set per jurisdiction + channel
- Compliance gate wired into campaign send flow (Craig must call Deebo before send)
- Regulation Monitor (`src/server/actions/compliance-discovery.ts`):
  - Weekly cron scrape of regulatory sources
  - SHA-256 diff — detects content changes
  - Claude Haiku drafts proposal of new rules
  - Saves draft to BakedBot Drive (documents category) + Slack alert
  - NEVER auto-modifies rule packs — human review required
  - Snapshots stored in `regulation_snapshots` Firestore collection
- Golden set eval: `.agent/golden-sets/deebo-compliance.json` (23 cases, 100% threshold)
  - `regex` type: fast-path tests (must pass without LLM call)
  - `llm` type: semantic compliance tests
  - `function` type: `deeboCheckAge` + `deeboCheckStateAllowed` tests
- Compliance badge UI in Creative Studio

### Partially Working ⚠️
- Regulation Monitor proposal quality — Claude Haiku drafts are reasonable but require human judgment to validate before rule pack updates
- Semantic LLM track — relies on Gemini 2.5 Flash; accuracy not formally benchmarked beyond 23 golden set cases
- Compliance check in chatbot (Smokey) — present but coverage uncertain for all response types

### Not Implemented ❌
- Regex rule packs for states beyond NY/CA/IL — all other states rely entirely on LLM (legal risk)
- Integration test that Deebo gate cannot be skipped at API layer
- Regulation Monitor → automatic scheduling in Cloud Scheduler (gcloud commands documented but not confirmed deployed)
- Structured audit trail of every compliance decision (approved/rejected + reason + timestamp)
- Human review workflow for Regulation Monitor proposals (Drive doc exists, but no in-app review flow)

---

## 3. Acceptance Criteria

### Functional
- [ ] Every outbound campaign (SMS + Email) is evaluated by Deebo before send
- [ ] Deebo gate rejection includes: specific violated rule(s), rule jurisdiction, suggested fix
- [ ] Regex fast-path runs in < 100ms for known violation patterns
- [ ] LLM semantic check runs in < 15s and does NOT auto-approve on timeout (defaults to reject)
- [ ] `deeboCheckAge()` correctly rejects campaigns targeting under-21 audiences in 21+ states
- [ ] `deeboCheckStateAllowed()` correctly rejects cannabis advertising in prohibited states
- [ ] Jurisdiction fallback applies retail rules when channel-specific rules are unavailable
- [ ] Regulation Monitor runs weekly, detects changes, and creates Drive draft + Slack alert
- [ ] Regulation Monitor NEVER auto-modifies rule packs without human approval

### Compliance / Security
- [ ] False negative rate for medical claims = 0% (regex + LLM must both flag "cure", "treat", "diagnose", "medicine")
- [ ] TCPA language ("Stop to opt out" or equivalent) present in ALL outbound SMS — enforced at Deebo level, not just Craig copy generation
- [ ] Compliance decisions are logged with: orgId, campaignId, rule violated, decision (approved/rejected), timestamp
- [ ] No PII (customer names, phone numbers) logged in compliance decision records
- [ ] `requireUser()` + org check on all Deebo API endpoints

### Performance
- [ ] Regex fast-path completes for any input in < 200ms
- [ ] LLM track timeout is set at 15s with default-block behavior
- [ ] Regulation Monitor cron completes in < 5 minutes (scrape + diff + Haiku proposal + Drive write)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| Only NY/CA/IL have regex rule packs — all other states LLM-only | 🔴 Critical | LLM can hallucinate; remaining 47 states have no hard guardrail |
| No integration test for Deebo gate at API layer (not UI-only) | 🔴 Critical | Compliance gate could theoretically be bypassed — untested |
| No structured audit trail (approved/rejected per campaign) | 🟡 High | Needed for regulatory audit/legal discovery |
| Regulation Monitor Cloud Scheduler cron not confirmed deployed | 🟡 High | Weekly scrape may not be running in production |
| Human review workflow for regulation proposals is manual (Drive doc only) | 🟡 High | No in-app approve/reject; depends on human finding the Slack alert + Drive doc |
| Only 23 golden set cases — edge cases (multilingual, euphemisms) not covered | 🟡 High | "Fire", "lit", "420-friendly" — legal in some states, not others |
| Smokey chatbot compliance coverage unclear | 🟢 Low | Chatbot recommends products; unclear if all response types pass through Deebo |
| TCPA opt-out enforcement layer — is it at Deebo or at Craig send layer? | 🟢 Low | Should be at send layer (cannot be disabled), not just in copy review |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Deebo compliance golden set | `.agent/golden-sets/deebo-compliance.json` | 23 cases: regex (fast-path), llm (semantic), function (age/state) |
| Golden set eval runner | `scripts/run-golden-eval.mjs` | FAST (deterministic, free) + FULL (LLM, ~$0.05-0.15) |

### Missing Tests (Required for Production-Ready)
- [ ] `deebo-gate.integration.test.ts` — verifies `POST /api/agents/craig/dispatch` with unapproved campaign returns 403
- [ ] `regex-pack.unit.test.ts:medical-claims` — verifies "cure", "treat", "diagnose", "medicine", "medication" all flagged across all rule packs
- [ ] `regex-pack.unit.test.ts:tcpa-opt-out` — verifies TCPA opt-out language enforced even if Craig omits it
- [ ] `jurisdiction-fallback.unit.test.ts` — verifies SMS → retail fallback when SMS rule pack is missing for a state
- [ ] `deebo-timeout.unit.test.ts` — verifies LLM timeout defaults to reject (not approve)
- [ ] Add 20+ cases to `deebo-compliance.json` covering: euphemisms, multilingual content, out-of-state rules

### Golden Set Eval
| Golden Set | Location | Threshold | Last Run |
|------------|----------|-----------|---------|
| Deebo compliance | `.agent/golden-sets/deebo-compliance.json` | 100% all categories | 2026-02-19 |

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Campaign System (Craig) | Calls Deebo before every send | Campaign blocked (correct behavior) |
| BakedBot Drive | Saves regulation monitor proposals | Monitor runs but proposal not persisted — risk of lost draft |
| Slack Integration | Alerts team to regulation changes | Alert not sent — team misses regulatory update |
| Firestore `regulation_snapshots` | Stores SHA-256 hashes for diff detection | Cannot detect changes without prior snapshot |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| CLAUDE_API_KEY (Claude Haiku) | Regulation monitor proposal drafting | Monitor detects change but cannot draft proposal — sends raw diff to Slack |
| CLAUDE_API_KEY (Haiku) | Deebo LLM semantic compliance check | Regex-only mode — blocks on any uncertain case |
| Regulation source URLs | Weekly compliance scrape targets | If URL changes, monitor silently misses updates |

---

## 7. Degraded Mode

- **If CLAUDE_API_KEY unavailable:** Deebo falls back to regex-only mode. Any content that would normally go to LLM check is auto-rejected (conservative). Compliance is maintained but false positive rate increases.
- **If regex rule pack missing for a state:** Fall back to LLM with explicit instruction to be conservative for unknown jurisdiction. Log missing rule pack as warning.
- **If Regulation Monitor scrape fails:** Log error, retain last snapshot hash, skip diff, send Slack alert that monitor failed.
- **Data loss risk:** None for compliance gate itself (stateless check). Regulation snapshots in Firestore — standard Firestore reliability.

---

## 8. Open Questions

1. **State expansion priority**: Which states beyond NY/CA/IL should get regex rule packs next? TX, FL, CO, WA are likely high-volume.
2. **Regulation Monitor coverage**: Which specific URLs are being scraped? Is the source list comprehensive? Who owns the "human review" step for regulation proposals?
3. **Deebo in chatbot**: Should every Smokey recommendation response pass through Deebo? Currently unclear — if yes, adds 100-200ms latency to every chatbot message.
4. **Audit trail retention**: How long should compliance decision logs be retained? Cannabis regulations may require years for legal discovery.

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
