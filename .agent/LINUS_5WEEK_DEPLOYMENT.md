# Linus CTO — 5-Week Full Deployment Roadmap

**Start Date:** 2026-02-20 (Thursday)
**Target Go-Live:** 2026-03-26 (Wednesday) — 5 weeks
**Risk Level:** 🟢 MINIMAL
**Status:** Phase 1 Kicking Off Now

---

## 📅 WEEK-BY-WEEK PLAN

### **WEEK 1: Infrastructure Foundation (Feb 20-26)**
**Goal:** All infrastructure in place, Phase 1 complete

#### Monday Feb 20 (Today)
- [ ] Create Firestore collections (3x: audit, approvals, alerts)
- [ ] Create Slack channels (4x: deployments, incidents, infrastructure, @super-user)
- [ ] Setup Slack incoming webhooks
- [ ] Grant initial IAM roles (Firestore, Cloud Scheduler)
- [ ] **Deliverable:** All infrastructure ready, Linus can log actions

#### Tuesday Feb 21
- [ ] Verify Linus can write to `linus-audit` Firestore collection
- [ ] Test Slack webhook integration (send test message)
- [ ] Setup GitHub token/SSH for Linus (if needed)
- [ ] **Deliverable:** Integration working end-to-end

#### Wednesday Feb 22
- [ ] Test build validation gate (push failing test, verify block)
- [ ] Test successful code push (build passes, deploys)
- [ ] Verify code appears on bakedbot.ai
- [ ] **Deliverable:** Full code push pipeline working

#### Thursday Feb 23
- [ ] Document Phase 1 completion
- [ ] Create approval queue schema (for Phase 2)
- [ ] Brief super user on progress
- [ ] **Deliverable:** Ready to start Phase 2

**Phase 1 Checklist:** [See full checklist below]

---

### **WEEK 2: Auto-Recovery & Failure Handling (Feb 27 - Mar 5)**
**Goal:** Auto-revert on failed deployments (< 2 min SLA)

#### Setup
- [ ] Deploy build failure detection (webhook)
- [ ] Deploy test failure detection (webhook)
- [ ] Implement revert automation (`git revert` on failure)
- [ ] Create incident log in `linus-incidents` channel
- [ ] Test failure recovery (push bad code → auto-revert)

**Deliverable:** Full incident auto-recovery working, <2 min response time

---

### **WEEK 3: Safety Gates & Approvals (Mar 6-12)**
**Goal:** Destructive ops approval workflow + role-based access

#### Setup
- [ ] Implement approval queue (Firestore)
- [ ] Configure destructive ops list (delete critical job, rotate secret)
- [ ] Setup approval dashboard (super user interface)
- [ ] Test approval flow (request → approve → execute)
- [ ] Add audit trail for all approvals

**Deliverable:** Approval gates working, destructive ops protected

---

### **WEEK 4: Monitoring & Intelligence (Mar 13-19)**
**Goal:** Alerts, dashboards, Hive Mind learning

#### Setup
- [ ] Deploy alert rules (failure patterns, unusual activity)
- [ ] Create dashboard widgets (Linus status, deployments, incidents)
- [ ] Enable Letta memory integration (learn from incidents)
- [ ] Setup weekly digest report (Monday 9 AM)
- [ ] Configure incident pattern detection

**Deliverable:** Full monitoring + learning system active

---

### **WEEK 5: Testing & Go-Live (Mar 20-26)**
**Goal:** Comprehensive testing, production readiness check, LAUNCH

#### Testing
- [ ] Dry-run: Push code (success path)
- [ ] Dry-run: Failure recovery (auto-revert)
- [ ] Dry-run: Create cron job
- [ ] Dry-run: Approval workflow
- [ ] Dry-run: Incident response

#### Validation
- [ ] All 8 success criteria met ✅
- [ ] Build health green 🟢
- [ ] Audit trail complete
- [ ] Documentation updated
- [ ] Super user trained

#### Launch
- [ ] Enable Linus CTO mode
- [ ] Monitor closely for first 48 hours
- [ ] Collect feedback
- [ ] Document lessons learned

**Deliverable:** 🚀 Linus CTO fully autonomous in production

---

## 🔧 PHASE 1 DETAILED CHECKLIST (Week 1: Feb 20-26)

### 1a. Firestore Collections (**Target: Mon Feb 20**)

```firestore
Collection 1: linus-audit
├── Document structure:
│   ├── timestamp: ISO 8601 string
│   ├── action: enum (git_push, cron_job_create, deploy_failure_revert, etc.)
│   ├── details: object
│   │   ├── commit_hash: string
│   │   ├── branch: string
│   │   ├── error_message: string (if failed)
│   ├── status: enum (success, failure, partial)
│   ├── notification_sent: boolean
│   └── super_user_approval_required: boolean

Collection 2: linus-approvals (for Phase 3)
├── Document structure:
│   ├── timestamp: ISO 8601 string
│   ├── action: enum (delete_critical_job, rotate_secret, reset_collection)
│   ├── reason: string
│   ├── requested_by: "linus-agent"
│   ├── status: enum (pending, approved, rejected)
│   ├── approved_by: string (super user email)
│   ├── decision_timestamp: ISO 8601 string (when approved)
│   └── executed: boolean

Collection 3: linus-alerts (for Phase 4)
├── Document structure:
│   ├── alert_type: enum (failure_pattern, unusual_activity, approval_backlog)
│   ├── severity: enum (info, warning, critical)
│   ├── message: string
│   ├── timestamp: ISO 8601 string
│   ├── notification_sent: boolean
│   └── resolved: boolean
```

**Action Items:**
- [ ] Go to Firebase Console → Firestore Database
- [ ] Click "Create collection"
- [ ] Create "linus-audit" (add first test document)
- [ ] Create "linus-approvals"
- [ ] Create "linus-alerts"
- [ ] Create composite indexes (if needed)
- [ ] Test write from localhost

### 1b. Slack Channels & Webhooks (**Target: Mon Feb 20**)

```
Channels to create:
□ #linus-deployments
  Purpose: Every successful code push
  Webhook URL: [GENERATE IN SLACK]
  Message format: "✅ [Commit] [Files changed] [Timestamp]"

□ #linus-incidents
  Purpose: Failed deployments + auto-recovery
  Webhook URL: [GENERATE IN SLACK]
  Message format: "🔴 [Error] [Auto-reverted] [Root cause]"

□ #infrastructure
  Purpose: Cron jobs, service accounts, IAM changes
  Webhook URL: [GENERATE IN SLACK]
  Message format: "⚙️ [Action] [Resource] [Status]"

@super-user (DM Channel)
  Purpose: Critical alerts only
  Message format: "🚨 CRITICAL [Issue] [Action needed]"
```

**Action Items:**
- [ ] Open Slack workspace settings
- [ ] Create #linus-deployments channel
- [ ] Create #linus-incidents channel
- [ ] Create #infrastructure channel
- [ ] For each channel: Add Slack Webhook
  - Settings → Integrations → Create New Webhook
  - Copy webhook URL
  - Store securely (pass to Linus agent)

### 1c. IAM & Cloud Access (**Target: Tue Feb 21**)

```
Roles needed:
✅ Cloud Scheduler Admin (already granted to claude-scheduler-admin)
□ Firestore read/write (linus-audit, linus-approvals, linus-alerts)
□ Cloud Build — read logs (deployment status)
□ Secret Manager — read (secret rotation auditing, optional)
□ Service Accounts — create/manage (for automation infrastructure)
```

**Action Items:**
- [ ] Verify Linus service account has Firestore write access
- [ ] Grant Cloud Build log read access
- [ ] Grant Cloud Scheduler full access (already done)
- [ ] Test permissions (Linus writes to Firestore)

### 1d. GitHub / Git Access (**Target: Tue Feb 21**)

```
Requirements:
□ Linus can commit to main branch
□ Linus can create feature branches
□ Linus cannot force-push to main (blocked by server)
□ Git signatures are enabled (optional but recommended)
```

**Action Items:**
- [ ] Verify GitHub/Git credentials for Linus
- [ ] Test: `git push origin feature/test-branch` (should succeed)
- [ ] Test: `git push --force origin main` (should be blocked)
- [ ] Verify: Commits appear as "Linus" author

### 1e. Build Validation Gate (**Target: Wed Feb 22**)

```
Gate logic:
IF git push triggered
  → Run npm run check:types
  → IF exit code 0: Allow push
  → IF exit code non-zero: BLOCK push, notify Linus
```

**Action Items:**
- [ ] Verify `npm run check:types` runs before push (pre-commit hook)
- [ ] Test: Push with failing TypeScript → verify block
- [ ] Test: Push with passing TypeScript → verify allow
- [ ] Verify: Error message clear (what's broken)

### 1f. Test End-to-End Push (**Target: Wed Feb 22**)

```
Test scenario:
1. Create test file: src/test-linus-deploy.ts
2. Add to git: git add src/test-linus-deploy.ts
3. Commit: git commit -m "test: Linus deployment verification"
4. Push: git push origin main
5. Verify:
   - Build passes ✅
   - Tests run ✅
   - Code deploys to bakedbot.ai ✅
   - Slack notification sent ✅
   - Firestore audit logged ✅
```

**Action Items:**
- [ ] Linus creates test commit
- [ ] Monitor build logs (Firebase Console)
- [ ] Verify deployment succeeded
- [ ] Check bakedbot.ai for new code
- [ ] Confirm Slack notification
- [ ] Review Firestore audit trail

---

## ✅ PHASE 1 SUCCESS CRITERIA

**All items must be DONE before moving to Phase 2:**

- [ ] Firestore collections created (3x)
- [ ] Slack channels setup + webhooks working (4x)
- [ ] IAM roles granted (Firestore, Cloud Scheduler)
- [ ] GitHub/Git access verified
- [ ] Build validation gate working
- [ ] End-to-end code push tested
- [ ] Slack notifications verified
- [ ] Firestore audit trail logging
- [ ] Zero build failures on test push
- [ ] Code confirmed on production site

---

## 📊 PHASE 1 TRACKING

| Task | Owner | Due | Status |
|------|-------|-----|--------|
| Firestore collections | You | Feb 20 | ⏳ |
| Slack setup | You | Feb 20 | ⏳ |
| IAM roles | You | Feb 21 | ⏳ |
| Git access verify | You/Linus | Feb 21 | ⏳ |
| Build gate test | Linus | Feb 22 | ⏳ |
| E2E push test | Linus | Feb 22 | ⏳ |
| Phase 1 sign-off | You | Feb 26 | ⏳ |

---

## 🎯 WHAT HAPPENS NEXT (After Phase 1)

**Week 2 (Feb 27 - Mar 5):** Auto-revert on failure
- Setup build failure detection
- Implement `git revert` automation
- Test failure recovery

**Week 3 (Mar 6-12):** Approval gates
- Implement approval queue
- Test destructive ops approval

**Week 4 (Mar 13-19):** Monitoring
- Deploy alert rules
- Create dashboards

**Week 5 (Mar 20-26):** Testing & Launch
- Comprehensive testing
- Production go-live

---

## 📞 SUPPORT & ESCALATION

**If stuck on:**
- Firestore → Ask Claude to help with Firebase console
- Slack → Slack admin guide or test webhook first
- Git/GitHub → Review GitHub docs for token setup
- Build issues → Check `.agent/prime.md` for troubleshooting

---

**Ready to start Phase 1?** I'll begin immediately with:
1. Creating Firestore collections
2. Guiding you through Slack setup
3. Testing everything end-to-end

Let's go! 🚀
