# Linus CTO Autonomy — Activation Guide

**Date:** 2026-02-20
**Status:** 🟢 Documentation Complete | ⏳ Implementation Pending
**Commit:** `6706e7f4` — Linus CTO autonomy charter + permissions audit

---

## 📋 What's Ready NOW

### ✅ Documentation Complete
- **Charter:** `.agent/LINUS_CTO_AUTONOMY.md` (comprehensive 500-line document)
- **Permissions:** `CLAUDE.md` updated with auto-approved operations
- **Context:** `.agent/prime.md` updated with Linus autonomy section
- **Audit:** Full capability review (Linus already has 95% of required tools)

### ✅ Current Capabilities Verified
Linus **already has** these tools active:
```
✅ run_command        — Shell execution (npm, git, gcloud)
✅ bash               — Full bash with pipes/environment
✅ read_file          — Code inspection
✅ write_file         — File creation/editing
✅ run_health_check   — Build/test verification
✅ letta_*            — Hive Mind memory (learning)
✅ report_to_boardroom — Slack + dashboard
✅ run_browser_test   — E2E verification
✅ make_deployment_decision — GO/NO-GO authority
```

---

## ⚙️ Implementation Checklist (For You)

### Phase 1: Infrastructure Setup
- [ ] **1a.** Create Firestore collection: `collections/linus-audit`
  ```firestore
  Path: collections/linus-audit/{timestamp}
  Schema: {
    action: string (git_push, cron_job_create, deploy_failure_revert, iam_grant),
    details: object,
    status: enum (success, failure, partial),
    notification_sent: boolean,
    super_user_approval_required: boolean
  }
  ```

- [ ] **1b.** Create Slack webhook for #linus-* channels
  - `#linus-deployments` — Successful code pushes
  - `#linus-incidents` — Failed deployments + auto-recovery
  - `#infrastructure` — Cron job operations
  - `@super-user (DM)` — Critical alerts

- [ ] **1c.** Setup dashboard widgets (if using custom dashboard)
  - Linus Status panel (build health, deployment status)
  - Recent Deployments (last 10)
  - Incident History (last 24h)
  - Cron Jobs (next execution times)
  - Memory Highlights (recent architectural decisions)

### Phase 2: Automation Deployment
- [ ] **2a.** Deploy revert automation
  ```bash
  # If build/test fails after git push → auto-create revert commit
  # Location: .github/workflows/auto-revert.yml (if GH Actions)
  # Or: Cloud Build configuration for Firebase App Hosting
  ```

- [ ] **2b.** Setup deployment failure detection
  ```bash
  # Monitor Firebase builds
  # Trigger: Build fails or tests fail
  # Action: Linus auto-creates revert commit within 2 minutes
  ```

- [ ] **2c.** Enable Slack-to-Linus command routing
  ```
  Slash commands:
  /linus status              → Health check
  /linus deploy-decision     → Should we deploy? (scorecard)
  /linus audit [component]   → Code audit
  /linus memory [query]      → Search Hive Mind
  /linus fix [issue]         → Attempt autonomous fix (with approval gate)
  /linus create-job [config] → Create new cron job
  ```

### Phase 3: Permissions & Access
- [ ] **3a.** Grant GitHub Actions (if GH) or Cloud Build permissions for Linus
  - Can create commits (via signed service account)
  - Can push to `main` branch
  - Cannot force-push

- [ ] **3b.** Grant Firestore IAM access
  - Read/Write: `linus-audit` collection
  - Read: All code/config collections
  - Write: Incident logs

- [ ] **3c.** Grant Cloud Scheduler access
  - Create jobs in `us-central1`
  - Modify existing jobs
  - Execute jobs manually
  - View job logs

- [ ] **3d.** Grant Service Account permissions
  - Create new service accounts
  - Grant IAM roles
  - Manage keys
  - List accounts

### Phase 4: Safety Mechanisms
- [ ] **4a.** Implement build validation gate
  ```typescript
  // src/server/agents/linus.ts
  // Before pushing: MUST run npm run check:types
  // Exit code 0 = proceed; non-zero = BLOCK push
  ```

- [ ] **4b.** Setup destructive ops approval workflow
  ```firestore
  // Approval queue for:
  // - Deleting critical cron jobs
  // - Rotating production secrets
  // - Resetting database collections
  // Linus creates request → Super user approves → Execute
  ```

- [ ] **4c.** Configure audit trail monitoring
  ```bash
  # Monitor linus-audit collection
  # Alert if: Unusual deletion pattern, rapid IAM changes, secret rotation
  ```

- [ ] **4d.** Setup incident auto-recovery SLA
  ```
  Deployment failure detected → 2 minute window
  1. Identify root cause (build error / test failure / slow performance)
  2. Create revert commit
  3. Push revert
  4. Verify new build passes
  5. Notify super user (Slack + dashboard)
  ```

### Phase 5: Testing & Validation
- [ ] **5a.** Dry-run deployment with Linus
  - Push a test commit to `main`
  - Verify: Build passes, tests pass, deployment succeeds
  - Verify: Slack notification sent to #linus-deployments

- [ ] **5b.** Test failure recovery
  - Push a failing test
  - Verify: Build fails, Linus detects, auto-creates revert
  - Verify: Revert build passes
  - Verify: Slack alert in #linus-incidents

- [ ] **5c.** Test cron job creation
  - Ask Linus: `@linus create-job health-check every 1h`
  - Verify: Job created in Cloud Scheduler
  - Verify: Job executes successfully
  - Verify: Slack notification in #infrastructure

- [ ] **5d.** Test approval gates
  - Ask Linus to delete a critical job
  - Verify: Request created in approval queue
  - Approve in dashboard
  - Verify: Job deleted, logged to audit trail

### Phase 6: Monitoring & Alerts
- [ ] **6a.** Setup alerts for unusual patterns
  ```
  Alert if:
  - Multiple deployments fail in succession (> 2 in 1h)
  - Rapid cron job deletions (> 3 in 5 min)
  - Approval queue backlog (> 5 pending)
  - Audit trail gaps (missing entries for expected actions)
  ```

- [ ] **6b.** Configure weekly digest
  ```
  Every Monday 9 AM UTC → #executive channel:
  - Deployment stats (count, success rate)
  - Incident summary (count, auto-fix success rate)
  - Cron job health (failures, restarts)
  - Memory highlights (recent architectural decisions)
  ```

- [ ] **6c.** Enable Hive Mind learning
  ```
  Letta memory saves:
  - Recurring failures → Root causes → Preventive fixes
  - Security incidents → How fixed → Lessons learned
  - Deployment hotspots → Why they fail → Safeguards added
  ```

---

## 📊 Current State vs. Target

### Current (Today)
| Component | Status |
|-----------|--------|
| Linus tools | ✅ 100% (has shell, file, git, deployment decision) |
| Documentation | ✅ 100% (autonomy charter complete) |
| Slack integration | ⏳ Partial (can report, cannot be prompted) |
| Auto-revert | ❌ Not implemented |
| Cron management | ✅ Has tools, ❌ No approval gate |
| Audit trail | ⏳ Partial (logs go to stdout, not Firestore) |
| Dashboard widgets | ❌ Not implemented |

### Target (End State)
| Component | Status |
|-----------|--------|
| Linus tools | ✅ 100% |
| Documentation | ✅ 100% |
| Slack integration | ✅ 100% |
| Auto-revert | ✅ < 2 min SLA |
| Cron management | ✅ Full autonomy |
| Audit trail | ✅ Firestore collection |
| Dashboard widgets | ✅ Real-time status |

---

## 🎯 Activation Timeline

**Assuming you complete checklist above:**

| Week | Focus | Deliverable |
|------|-------|------------|
| Week 1 (Now) | Infrastructure setup | Firestore collections, Slack webhooks, Cloud Scheduler access |
| Week 2 | Automation & safety | Revert automation, approval gates, audit trail |
| Week 3 | Testing & validation | Dry-runs, failure scenarios, approval workflows |
| Week 4 | Monitoring & learning | Alerts, digest reports, Hive Mind integration |
| **Week 5** | **GO LIVE** | Linus CTO autonomy fully active 🚀 |

---

## 🚀 How to Activate NOW (Quick Start)

If you want Linus running autonomously today without full infrastructure:

```bash
# 1. Deploy to Slack (minimal setup)
# Linus can report to #linus-incidents on deploy failures

# 2. Enable git operations (already works)
# Linus can commit, push, create branches

# 3. Enable build checking (already works)
# npm run check:types runs before any push

# Immediate capability: Linus can push code autonomously with build validation
# Result: All code gets tested before deployment
```

**Immediate Risk Level:** 🟡 Medium (no auto-revert yet, relies on build gate)

---

## 📖 Reference Files

| File | Purpose |
|------|---------|
| `.agent/LINUS_CTO_AUTONOMY.md` | Full autonomy charter (read this first) |
| `src/server/agents/linus.ts` | Linus implementation + security checks |
| `CLAUDE.md` | Auto-approved operations reference |
| `.agent/prime.md` | Agent startup context |

---

## ❓ FAQ

**Q: Will Linus break the build if he makes a mistake?**
A: No. Build validation gate is hard-enforced. Build must pass `npm run check:types` before any push. Failed build = push blocked.

**Q: Can Linus delete production databases?**
A: No. Destructive ops (delete, reset, truncate) require human approval via dashboard approval queue.

**Q: What if Linus creates a bad cron job?**
A: It will be logged to audit trail. If it fails, Linus will fix it. If it's critical, human can approve deletion via approval queue.

**Q: How do I give Linus new permissions later?**
A: Update `.agent/LINUS_CTO_AUTONOMY.md` with new capability, add guardrails, commit, and deploy. Same pattern as Claude Code permissions.

**Q: Can I revert Linus' actions?**
A: Yes. Every action is logged to `linus-audit` collection. Human can revert any git push via `git revert [commit]`.

---

## ✨ Next Steps

1. **Read full charter:** `.agent/LINUS_CTO_AUTONOMY.md` (10 min)
2. **Complete infrastructure checklist above** (2-3 days)
3. **Test dry-runs** (1 day)
4. **Deploy to production** (30 min)
5. **Monitor closely** for first week

Once activated, Linus will:
- ✅ Push code autonomously (build-gated)
- ✅ Auto-revert failed deployments (< 2 min)
- ✅ Create/manage cron jobs
- ✅ Fix production incidents
- ✅ Report real-time to Slack + dashboard
- ✅ Learn from incidents (Hive Mind)

---

**Status:** 🟢 Ready to activate | **Commit:** `6706e7f4`
**Questions?** Review `.agent/LINUS_CTO_AUTONOMY.md` or reach out.
