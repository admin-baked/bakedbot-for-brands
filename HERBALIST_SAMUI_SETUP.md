# The Herbalist Samui — International Pilot Setup Guide

## Overview

The Herbalist Samui is BakedBot's **first international dispensary pilot** on Koh Samui Island, Thailand. This setup creates a fully-configured org with demo menu, competitive intelligence, and team invitations.

**Org ID:** `dispensary_herbalistsamui`
**Menu URL:** `bakedbot.ai/herbalistsamui`
**Plan:** empire ($999/month, unlimited)
**Currency:** THB (฿) — Thai Baht

---

## What Gets Created

### 1. Organization Infrastructure
- Firebase Auth user: `herbalistsamui@bakedbot.ai`
- Organization doc: `organizations/dispensary_herbalistsamui`
- Brand doc: `brands/dispensary_herbalistsamui` (routes to bakedbot.ai/herbalistsamui)
- Tenant doc: `tenants/dispensary_herbalistsamui` (for billing + competitive intel)
- Location doc: `locations/loc_herbalistsamui_main`
- Firestore users doc with role `dispensary_admin`

### 2. Demo Menu (22 Products)
All products in **Thai Baht (฿)** with competitor-based pricing:

| Category | Count | Price Range |
|----------|-------|-------------|
| Flower | 5 | ฿320–฿1,500 |
| Pre-Rolls | 4 | ฿120–฿350 |
| Vaporizers | 4 | ฿850–฿1,300 |
| Edibles | 4 | ฿280–฿450 |
| Wellness/Topicals | 3 | ฿520–฿750 |
| Accessories | 2 | ฿80–฿380 |

### 3. Koh Samui Competitors (4 local dispensaries)
Each with initial pricing snapshots for first intel report:
- Island Cannabis Co. (Chaweng Beach, 0.8 km)
- Samui Herb Garden (Lamai Beach, 4.2 km)
- Green Wave Samui (Bo Phut, 3.1 km)
- Tropicanna Koh Samui (Mae Nam, 6.5 km)

### 4. Competitive Intelligence Setup
- Playbook: `playbook_herbalistsamui_competitive_intel`
- Schedule: Weekly Monday 8 AM Bangkok time
- Initial snapshots: Seeded for all 4 competitors
- Drive reports: Auto-created on first run

### 5. Team Invitations
Three team members invited to `dispensary_admin` role:
- `herbalistsamui@bakedbot.ai` — primary admin (created + invited)
- `jack@bakedbot.ai` — BakedBot contact (invitation email)
- `bryan@thebeachsamui.com` — The Beach Samui partner (invitation email)

All invitations expire in 7 days. Invitees can accept at: `https://bakedbot.ai/join/{token}`

---

## How to Run

### Prerequisites
1. **Firebase service account key** — Download from Google Cloud Console:
   - https://console.cloud.google.com/iam-admin/serviceaccounts?project=studio-567050101-bc6e8
   - Click `firebase-adminsdk-fbsvc@...` service account
   - Go to "Keys" tab → "Add Key" → "Create new key" → JSON
   - Save to: `C:\temp\firebase-key.json`

2. **Confirm you have the file:**
   ```powershell
   Test-Path "C:\temp\firebase-key.json"  # Should return True
   ```

### Run the Seed Script

```powershell
# Set the credentials
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\temp\firebase-key.json"

# Run the seed script
npx tsx scripts/seed-herbalist-samui.ts
```

### Expected Output

```
✅ Firebase Admin SDK initialized
[HerbalistSamui] Starting full setup...

[Step 1] Creating Firebase Auth user...
  ✅ User created: herbalistsamui@bakedbot.ai (UID: xxx)

[Step 2] Creating organization document...
  ✅ Organization created: dispensary_herbalistsamui

[Step 3] Creating brand document...
  ✅ Brand created: herbalistsamui → bakedbot.ai/herbalistsamui

[Step 4] Creating tenant document...
  ✅ Tenant created: dispensary_herbalistsamui

[Step 5] Creating location document...
  ✅ Location created: loc_herbalistsamui_main

[Step 6] Creating users document...
  ✅ User document created and custom claims set

[Step 7] Seeding demo products...
  ✅ 22 products seeded

[Step 8] Seeding competitors...
  ✅ 4 competitors seeded

[Step 9] Seeding initial competitor snapshots...
  ✅ 4 initial snapshots seeded

[Step 10] Creating competitive intel playbook...
  ✅ Playbook created: playbook_herbalistsamui_competitive_intel

[Step 11] Creating invitations for team members...
  ✅ Invitation created: jack@bakedbot.ai
     Link: https://bakedbot.ai/join/...
  ✅ Invitation created: bryan@thebeachsamui.com
     Link: https://bakedbot.ai/join/...

═══════════════════════════════════════════════════════════════
✅ THE HERBALIST SAMUI — SETUP COMPLETE
═══════════════════════════════════════════════════════════════
```

---

## Next Steps After Seeding

### 1. Deploy & Test Menu Page
Once deployed to Firebase App Hosting:
```
https://bakedbot.ai/herbalistsamui
```
Should show:
- 22 products with ฿ prices
- Product categories (Flower, Pre-Rolls, etc.)
- Add-to-cart functionality (if available)

### 2. Set Up Daily Competitive Intelligence

Create Cloud Scheduler job (run once via gcloud):

```bash
gcloud scheduler jobs create http herbalistsamui-competitive-intel \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Bangkok" \
  --uri="https://bakedbot.ai/api/cron/competitive-intel" \
  --message-body='{"orgId":"dispensary_herbalistsamui"}' \
  --headers="Authorization=Bearer $(gcloud secrets versions access latest --secret=CRON_SECRET),Content-Type=application/json" \
  --project=studio-567050101-bc6e8
```

Schedule: **9 AM Bangkok time daily** (2 AM UTC) = every morning before market opens

### 3. Trigger First Report Manually (Optional)

```bash
$CRON_SECRET = $(gcloud secrets versions access latest --secret=CRON_SECRET)
$headers = @{ "Authorization" = "Bearer $CRON_SECRET"; "Content-Type" = "application/json" }
Invoke-RestMethod -Uri "https://bakedbot.ai/api/cron/competitive-intel" `
  -Method POST `
  -Headers $headers `
  -Body '{"orgId":"dispensary_herbalistsamui"}' `
  -ContentType "application/json"
```

Expected response:
```json
{
  "success": true,
  "reportId": "xxx",
  "competitorsTracked": 4,
  "totalDeals": 20,
  "totalSnapshots": 4
}
```

### 4. Verify Competitive Intelligence

Check Firestore collections:
- `tenants/dispensary_herbalistsamui/weekly_reports/` — Generated report
- `tenants/dispensary_herbalistsamui/competitor_alerts/` — Price change alerts
- `drive_files/` — Markdown report in BakedBot Drive

Check inbox:
- Should have thread from Ezal agent with report summary

### 5. Team Member Acceptance

Share invitation links with team members:
- `jack@bakedbot.ai` — Link sent via email
- `bryan@thebeachsamui.com` — Link sent via email

Each invitation link: `https://bakedbot.ai/join/{token}`

Once accepted:
- User gains `dispensary_admin` role
- Auto-routed to `/dashboard/dispensary-admin`
- Access to menu, analytics, competitive intel
- Can invite more team members

---

## Default Login Credentials

**Admin Account:**
- Email: `herbalistsamui@bakedbot.ai`
- Temporary Password: `HerbalistSamui2024!TempPassword`

**⚠️ IMPORTANT:** User must change password on first login!

---

## Firestore Collections Summary

| Collection | Count | Purpose |
|-----------|-------|---------|
| `organizations/dispensary_herbalistsamui` | 1 | Org profile + billing |
| `brands/dispensary_herbalistsamui` | 1 | Brand routing + theme |
| `tenants/dispensary_herbalistsamui` | 1 | Operational tenant (competitive intel, channels) |
| `users/{uid}` | 1 | Admin user profile |
| `locations/loc_herbalistsamui_main` | 1 | Physical location |
| `products/` (filtered by brandId) | 22 | Demo menu items |
| `tenants/{orgId}/competitors/` | 4 | Koh Samui competitors |
| `tenants/{orgId}/competitor_snapshots/` | 4 | Initial pricing snapshots |
| `playbooks/playbook_herbalistsamui_*` | 1 | Competitive intel playbook |
| `invitations/` (filtered by targetOrgId) | 2 | Pending team invitations |

---

## Differences from Thrive Syracuse (Domestic Pilot)

| Feature | Thrive | Herbalist Samui |
|---------|--------|-----------------|
| **POS System** | Alleaves JWT | ❌ None (demo menu only) |
| **Currency** | USD ($) | THB (฿) |
| **Timezone** | America/New_York (UTC-5) | Asia/Bangkok (UTC+7) |
| **Compliance** | NY OCM | Thai Cannabis Regs |
| **Competitors** | Syracuse area | Koh Samui local |
| **Plan Cost** | $0 custom | $999 flat |
| **Tenant Doc** | MISSING (bug) | ✅ CREATED |
| **Deebo Compliance** | Enabled | Disabled |

---

## Troubleshooting

### Error: "reauth related error (invalid_rapt)"
**Solution:** Use the Firebase service account key file instead of Firebase CLI:
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\temp\firebase-key.json"
npx tsx scripts/seed-herbalist-samui.ts
```

### Error: "User already exists: herbalistsamui@bakedbot.ai"
**Expected behavior** — The script handles this gracefully. It will skip user creation and proceed with org setup.

### Products not showing on menu page
1. Verify products exist: Firestore `products/` collection, filter `brandId == dispensary_herbalistsamui`
2. Verify brand slug: `brands/dispensary_herbalistsamui` should have `slug: "herbalistsamui"`
3. Clear browser cache and retry

### Competitive intel report not generating
1. Verify Cloud Scheduler job is enabled: `gcloud scheduler jobs list --location=us-central1`
2. Check cron secret exists: `gcloud secrets versions list --secret=CRON_SECRET`
3. Manually trigger: See "Trigger First Report" section above
4. Check logs: Firebase Console → Cloud Functions → competitive-intel

---

## Architecture Decisions

### No POS Connection
Unlike Thrive (Alleaves), The Herbalist Samui has no POS system. Products are manually seeded as demo data to:
1. **Showcase menu layout** — Visitors see a realistic product catalog
2. **Enable competitive intel** — System learns market pricing without POS syncing
3. **Simplify first deployment** — No POS API credentials needed for launch
4. **Support future growth** — When ready, can integrate any POS system

### Thai Market Pricing (THB)
All prices in **Thai Baht (฿)** to match local market:
- Flower: ฿320–฿1,500 per gram or 3.5g
- Pre-rolls: ฿120–฿350 per unit
- Vapes: ฿850–฿1,300 per cartridge
- Edibles: ฿280–฿450 per item
- Topicals: ฿520–฿750 per product

Prices sourced from Koh Samui competitor research.

### Unlimited Empire Tier
The $999 empire plan provides:
- Unlimited AI sessions ✓
- Unlimited competitors tracked ✓
- Unlimited email campaigns ✓
- Unlimited playbooks (23 included) ✓
- No rate limits on Ezal (every 15 minutes) ✓

Perfect for a high-growth, feature-complete pilot.

---

## Contact & Support

Questions about The Herbalist Samui setup? Check:
1. This guide (you're reading it!)
2. Firestore Console: `dispensary_herbalistsamui` org docs
3. Firebase App Hosting logs: Cloud Functions → competitive-intel
4. Team invitations: Firestore `invitations/` collection

---

**Setup Date:** 2026-02-18
**Script:** `scripts/seed-herbalist-samui.ts`
**Status:** ✅ Ready to deploy
