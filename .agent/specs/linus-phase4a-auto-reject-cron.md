# Spec: Linus Phase 4A — Auto-Reject Expired Approval Requests

**Date:** 2026-02-21
**Requested by:** Self-initiated (Phase 3 completion continuation)
**Spec status:** 🟡 Draft (awaiting approval)

---

## 1. Intent (Why)

Automatically reject approval requests that remain pending for longer than 7 days to prevent stale operations from accumulating in the queue and to ensure destructive operations are either approved or explicitly rejected within a reasonable timeframe.

---

## 2. Scope (What)

**Files affected:**
- `src/app/api/cron/auto-reject-expired-approvals/route.ts` — NEW: Cloud Scheduler POST/GET endpoint
- `apphosting.yaml` — MODIFY: Register CRON_SECRET reference + new endpoint documentation
- `scripts/register-auto-reject-cron.mjs` — NEW: Cloud Scheduler job creation script
- `src/server/services/approval-queue.ts` — NO CHANGES (already has `autoRejectExpiredRequests()` function)
- `src/app/actions/approvals.ts` — NO CHANGES
- `src/app/dashboard/linus-approvals/page.tsx` — NO CHANGES (auto-rejected requests appear in History tab)

**Files explicitly NOT touched:**
- `src/server/agents/linus.ts` — Agent logic unchanged
- Test files — No new tests needed (integration already tested in Phase 3)
- Firestore rules — No schema changes

**Estimated diff size:** ~150 lines (endpoint + script)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | Uses `requireCronSecret()` for authentication |
| Touches payment or billing? | No | — |
| Modifies database schema? | No | Uses existing `linus-approvals` collection |
| Changes infra cost profile? | Yes | Adds 1 Cloud Scheduler job (~$0.10/month) |
| Modifies LLM prompts or agent behavior? | No | — |
| Touches compliance logic? | No | Auto-rejection is purely expiration-based |
| Adds new external dependency? | No | Uses existing gcloud SDK + Firestore |

**Escalation needed?** No (cron auth is established pattern; cost impact is negligible; no schema changes)

---

## 4. Implementation Plan

### Step 1: Create Cloud Scheduler Endpoint
- Create `/src/app/api/cron/auto-reject-expired-approvals/route.ts`
- Implement both POST (Cloud Scheduler) and GET (manual testing)
- Extract `requireCronSecret()` auth check
- Call `autoRejectExpiredRequests()` from approval-queue service
- Return JSON response with rejection count + details
- Add Slack notification for rejected requests (non-blocking)
- Add structured logging via `@/lib/logger`

### Step 2: Create Cloud Scheduler Registration Script
- Create `/scripts/register-auto-reject-cron.mjs`
- Script arguments: `--schedule "0 4 * * *"` (daily 4 AM UTC)
- Uses gcloud CLI: `gcloud scheduler jobs create app-engine`
- Sets headers: `Authorization: Bearer {CRON_SECRET}`
- Points to: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/auto-reject-expired-approvals`
- Include error handling + logging
- Idempotent: check if job exists before creating

### Step 3: Update apphosting.yaml
- Verify `CRON_SECRET@6` already referenced (from Phase 3)
- No changes needed (cron auth pattern already established)
- Document new endpoint in README or deploy notes

### Step 4: Manual Testing
- Test endpoint manually: `curl -H "Authorization: Bearer <CRON_SECRET>" https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/auto-reject-expired-approvals`
- Verify Firestore `linus-approvals` collection shows rejected requests with:
  - `status: 'rejected'`
  - `rejectionReason: 'Auto-rejected: request expired after 7 days without approval'`
  - `auditLog` includes 'auto_reject' action
- Verify Slack notification sent to `#linus-approvals` channel
- Verify 404 error without proper auth header

### Step 5: Register Cron Job (if approved)
- Run: `node scripts/register-auto-reject-cron.mjs --schedule "0 4 * * *"`
- Verify in Cloud Scheduler console: `bakedbot-prod-auto-reject-approvals` job exists
- Set success/failure notification to `#linus-incidents` channel

---

## 5. Test Plan

**Unit tests:**
- ✅ Already covered in Phase 3: `approval-workflow.integration.test.ts` includes "Auto-Rejection of Expired Requests" test
  - Tests >7 day age detection
  - Tests rejection reason assignment
  - Tests audit log entry

**Integration tests:**
- ✅ Phase 3 integration tests sufficient (full approval workflow tested)

**Manual smoke test:**
1. [ ] Create approval request via Linus agent
2. [ ] Manually modify Firestore `createdAt` timestamp to 8 days ago (simulation)
3. [ ] Trigger endpoint: `curl -H "Authorization: Bearer <CRON_SECRET>" https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/auto-reject-expired-approvals`
4. [ ] Verify response shows 1 rejection
5. [ ] Verify Firestore shows `status: 'rejected'` + rejection reason
6. [ ] Verify Slack notification arrived in `#linus-approvals`
7. [ ] Verify dashboard History tab shows auto-rejected request
8. [ ] Test without auth header: verify 401 response

**Golden set eval:**
- Not applicable (no LLM/prompt changes)

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — Revert creates git commit removing endpoint + script |
| Feature flag? | Not needed — cron job can be disabled via Cloud Scheduler UI (pause job) |
| Data migration rollback needed? | No — All rejects are appended to audit log (immutable) |
| Downstream services affected? | Slack notifications (non-blocking, failures don't affect core) |

**Rollback procedure if issues found:**
1. Pause Cloud Scheduler job in console: `bakedbot-prod-auto-reject-approvals`
2. Revert commit: `git revert <commit-hash>`
3. Deploy via `git push origin main`
4. **No data cleanup needed** — Auto-rejected requests remain in Firestore but won't auto-expire until job re-enabled

---

## 7. Success Criteria

- [ ] Endpoint created, tested, passes auth checks
- [ ] All Phase 3 tests still pass (zero regressions)
- [ ] Cron script runs without errors, job registered in Cloud Scheduler
- [ ] Manual smoke test passes all 8 checks
- [ ] No new errors in logs within 24h post-deployment
- [ ] Existing approval requests (< 7 days old) unaffected
- [ ] Slack notifications deliver consistently (spot-check 3 runs)
- [ ] Dashboard History tab shows auto-rejected requests correctly

---

## Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

---

## Implementation Notes

### Why This Design?

1. **Separate endpoint** — Follows established cron pattern from Phase 3 (heartbeat, analytics, etc.)
2. **Both GET + POST** — Cloud Scheduler sends POST; GET allows manual testing without scheduler
3. **Non-blocking Slack** — Failures don't prevent rejections; just logged
4. **Cloud Scheduler job creation script** — Idempotent, documentable, enables future job management
5. **No schema changes** — Leverages existing `autoRejectExpiredRequests()` function (already tested)
6. **Audit trail immutable** — All rejections logged with reason, timestamp, actor='system'

### Known Constraints

1. **7-day window is hardcoded** — Can be parametrized later if needed
2. **Runs daily at 4 AM UTC** — Configurable via script `--schedule` flag
3. **No approval > rejection state transition** — Rejected requests stay rejected (by design)
4. **Firestore eventual consistency** — Very newly-created requests might not be queried if run immediately (unlikely, 7-day window = milliseconds tolerance)

### Future Enhancements (Phase 4+)

- Configurable expiration window per operation type (e.g., 3 days for critical ops, 14 days for low-risk)
- Escalation to additional reviewers before auto-reject (email alert)
- Dashboard alert for requests nearing expiration (e.g., day 6)
- Approval templates to pre-approve certain operations (skip auto-reject)

---

*Awaiting approval to proceed to Stage 2: Implementation*
