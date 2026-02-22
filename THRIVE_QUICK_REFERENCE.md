# Thrive Syracuse: 30-Second Quick Reference

## ✅ What's Done

- **111 customers** enrolled in Loyalty (Bronze tier, 0 points)
- **22 playbooks** created and assigned (PAUSED state)
- **All documentation** created (3 guides + 3 scripts)
- **Ready to activate** once Mailjet is configured

---

## ⏳ What's Blocked

- Email campaigns paused (awaiting Mailjet subuser setup)
- All other functionality working (dashboards, insights, loyalty tracking)

---

## 🚀 Your Action Items

### 1. Mailjet Setup (~10 minutes)
```
Mailjet → Settings → Subaccounts
→ Create "Thrive Syracuse" subuser
→ Generate API keys
→ Provide to team (or deploy to secrets)
```

### 2. Activate Playbooks (~5 minutes)
```
Firebase Console → Firestore → playbook_assignments
→ Filter: subscriptionId == org_thrive_syracuse-empire-subscription
→ Change all: status "paused" → "active" (22 docs)
```

### 3. Test (~5 minutes)
```
Create test customer on Thrive brand page
→ Verify welcome email arrives in 5 min
→ Check Inbox thread for campaign log
```

---

## 📂 Your Files

| File | What | Use Case |
|------|------|----------|
| `THRIVE_ENROLLMENT_SUMMARY.md` | **Read this first** | Overview + checklist |
| `PLAYBOOK_ACTIVATION_GUIDE.md` | **Activation how-to** | Step-by-step activation |
| `THRIVE_ENROLLMENT_SETUP.md` | **Full reference** | Architecture + troubleshooting |

---

## 🎯 The 22 Playbooks

**Onboarding (4):** Welcome sequence, quickstart guide, menu health scan, white-glove onboarding

**Engagement (5):** Post-purchase thank you, birthday reminder, win-back sequence, new product launch, VIP identification

**Competitive Intel (4):** Weekly brief, daily intel, real-time price alerts, + competitive monitoring

**Compliance (4):** Weekly digest, pre-send checks, jurisdiction alerts, audit prep

**Analytics (4):** Weekly snapshot, ROI report, executive digest, multi-location rollup

**Seasonal (1):** Quarterly template pack

---

## 💡 Remember

- **Playbooks are org-wide** — ALL 111 customers get all 22 playbooks
- **PAUSED = Safe** — Nothing sends until Mailjet is configured
- **Easy to activate** — Just change status field in Firestore
- **Easy to pause again** — Change status back to "paused" anytime

---

## ⚡ Quick Commands

**Verify playbooks are paused:**
```bash
# In Firestore Console
Collections → playbook_assignments
Filter: subscriptionId == org_thrive_syracuse-empire-subscription
→ Should show 22 docs, all with status: "paused"
```

**Manual playbook trigger (for testing):**
```bash
curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/playbook-runner \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"playbookId": "welcome-sequence", "orgId": "org_thrive_syracuse"}'
```

**Check loyalty sync status:**
```bash
# In Firestore Console
Collections → customers
Filter: orgId == org_thrive_syracuse
→ Check tier, points, lastOrderDate
```

---

## 🎯 Success Looks Like

After activation:
1. ✅ Welcome email arrives 5 min after signup
2. ✅ Daily emails arrive at 7 AM
3. ✅ Mailjet shows >98% delivery rate
4. ✅ Customers accumulate loyalty points
5. ✅ Tiers advance (Bronze→Silver→Gold→Platinum)

---

## ❌ If Something's Wrong

| Issue | Solution |
|-------|----------|
| Playbooks still paused | Hard refresh browser (Ctrl+Shift+R) |
| Emails not sending | Check Mailjet API keys deployed |
| Missing customers | Run `scripts/explore-thrive-customers.mjs` |
| Loyalty not tracking | Trigger `POST /api/cron/loyalty-sync` |

---

## 📞 Need Help?

- **Setup questions:** See `THRIVE_ENROLLMENT_SETUP.md`
- **Activation steps:** See `PLAYBOOK_ACTIVATION_GUIDE.md`
- **Status check:** Run `scripts/explore-thrive-customers.mjs`

---

**Status: 🟢 READY**
**Next: Configure Mailjet → Activate Playbooks → Test**

Time to activation: **~20 minutes total**

