# Dispensary Onboarding Guide

**Complete guide for setting up a new dispensary on BakedBot AI**

---

## Overview

This guide walks through the complete onboarding process for a new dispensary customer, from initial setup to going live with the full platform.

---

## Pre-Requisites

Before starting, ensure you have:

- [ ] Dispensary business information (name, address, license number)
- [ ] POS system credentials (if using Alleaves or other supported POS)
- [ ] Owner contact information (email, phone)
- [ ] Payment information (for billing)
- [ ] Alpine IQ API credentials (optional, for loyalty sync)

---

## Step 1: Create Organization

### Option A: Via Firebase Console (Recommended for First Pilot)

1. **Open Firebase Console**
   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Firestore Database**

2. **Create Brand Document**
   ```firestore
   Collection: brands
   Document ID: org_[dispensary_name]

   Fields:
   - id: string = "org_[dispensary_name]"
   - name: string = "[Dispensary Display Name]"
   - type: string = "dispensary"
   - status: string = "active"
   - createdAt: timestamp = (auto)
   - updatedAt: timestamp = (auto)
   ```

3. **Add POS Configuration** (if using Alleaves)
   ```firestore
   Add nested map: posConfig

   Fields:
   - provider: string = "alleaves"
   - storeId: string = "[Alleaves Store ID]"
   - locationId: string = "[Alleaves Location ID]"
   - username: string = "[Alleaves Username]"
   - password: string = "[Alleaves Password]"
   - pin: string = "[Alleaves PIN]"
   - environment: string = "production"
   - status: string = "active"
   ```

### Option B: Via Admin Script (Future)

```bash
npm run setup:dispensary --name="Dispensary Name" --email="owner@dispensary.com"
```

---

## Step 2: Create Owner Account

### Via Firebase Console

1. **Go to Authentication** in Firebase Console

2. **Add User**
   - Email: Owner's email
   - Password: Generate secure password
   - Email verified: ✓ (check)

3. **Set Custom Claims**
   - Click on user
   - **Custom Claims** tab
   - Add the following JSON:
   ```json
   {
     "role": "dispensary_admin",
     "locationId": "org_[dispensary_name]",
     "currentOrgId": "org_[dispensary_name]",
     "organizationIds": ["org_[dispensary_name]"]
   }
   ```

4. **Send Password Reset Email**
   - Copy the user's UID
   - Send welcome email with password reset link

---

## Step 3: Configure Loyalty Program (Optional)

1. **Create Loyalty Settings Document**
   ```firestore
   Collection: loyalty_settings
   Document ID: org_[dispensary_name]

   Fields:
   - orgId: string = "org_[dispensary_name]"
   - enabled: boolean = true
   - pointsPerDollar: number = 1
   - equityMultiplier: number = 1.2
   - tiers: array = [
       {
         id: "bronze",
         name: "Bronze",
         threshold: 0,
         color: "#CD7F32"
       },
       {
         id: "silver",
         name: "Silver",
         threshold: 500,
         color: "#C0C0C0"
       },
       {
         id: "gold",
         name: "Gold",
         threshold: 1000,
         color: "#FFD700"
       }
     ]
   ```

2. **Set Alpine IQ API Key** (if using)
   - Add to Firebase secrets or environment variables
   - Test connection: `npx tsx dev/test-alpine-connection.ts`

---

## Step 4: Initial POS Sync

### Test POS Connection

```bash
# Verify POS credentials
npx tsx dev/verify-pos-integration.ts

# Should output:
# ✅ POS config found
# ✅ Authentication successful
# ✅ Customers fetched: [count]
# ✅ Orders fetched: [count]
```

### Run Initial Sync

```bash
# Trigger full sync
npx tsx dev/test-pos-sync.ts

# Expected output:
# Syncing products... ✓
# Syncing customers... ✓
# Syncing orders... ✓
# Total: [count] products, [count] customers, [count] orders
```

### Verify Data in Dashboard

1. **Login as dispensary admin**
   - Navigate to https://bakedbot.ai/dashboard/dispensary
   - Should see dashboard with today's stats

2. **Check Data**
   - Customers: `/dashboard/customers`
   - Orders: `/dashboard/orders`
   - Products (menu): `/dashboard/menu`

---

## Step 5: Invite Team Members

### Invite Staff Members

1. **Navigate to Settings**
   - Go to `/dashboard/settings`
   - Click **"Invite Team Member"**

2. **Select Role**
   - **Dispensary Admin**: Full access (billing, team, settings)
   - **Dispensary Staff**: Operational access (orders, inventory, customers)
   - **Budtender**: Read-only access (view products, orders, customers)

3. **Send Invitation**
   - Enter email address
   - Optionally add first/last name
   - Click **"Send Invitation"**
   - Share the invitation link

### Staff Onboarding

When staff receives invitation:
1. Click invitation link
2. Set password
3. Complete profile
4. Redirected to role-specific dashboard

---

## Step 6: Configure Auto-Sync

### GitHub Actions (Recommended)

Auto-sync is already configured via GitHub Actions to run every 30 minutes.

**Verify:**
```bash
# Check .github/workflows/pos-sync-cron.yml exists
cat .github/workflows/pos-sync-cron.yml
```

### Manual Sync Button

Available in dashboard:
- `/dashboard/dispensary` - Sync status widget
- `/dashboard/loyalty` - Manual "Sync Now" button
- `/dashboard/menu` - Product sync

---

## Step 7: Set Up Webhooks (Optional)

For real-time updates from Alleaves POS, set up webhooks.

**See:** [`WEBHOOK_SETUP.md`](./WEBHOOK_SETUP.md)

---

## Step 8: Customize Branding

### Brand Page Settings

1. **Navigate to Brand Page**
   - Go to `/dashboard/content/brand-page`

2. **Upload Logo**
   - Recommended size: 512x512px
   - Format: PNG with transparent background

3. **Set Colors**
   - Primary color: Brand color
   - Secondary color: Accent color
   - Background: Light/dark theme

4. **Add Content**
   - About section
   - Product highlights
   - Store hours

### Public Menu URL

Your public menu will be available at:
```
https://bakedbot.ai/[dispensary_name]
```

Example: `https://bakedbot.ai/thrivesyracuse`

---

## Step 9: Go Live!

### Pre-Launch Checklist

- [ ] POS sync working (customers, orders, products)
- [ ] Loyalty program configured (if enabled)
- [ ] Team members invited and onboarded
- [ ] Dashboard accessible and data visible
- [ ] Public menu tested
- [ ] Chatbot (Smokey) responding correctly
- [ ] Staff trained on platform

### Launch Day

1. **Announce to team**
   - Share dashboard URL
   - Share public menu URL
   - Provide training materials

2. **Monitor for issues**
   - Watch dashboard for errors
   - Check sync status
   - Review customer feedback

3. **Support**
   - Contact: support@bakedbot.ai
   - Documentation: https://docs.bakedbot.ai
   - Status: https://status.bakedbot.ai

---

## Troubleshooting

### POS Sync Issues

**Problem:** Sync failing with authentication error

**Solution:**
```bash
# Re-verify credentials
npx tsx dev/verify-pos-integration.ts

# Check credentials in Firebase:
# brands/org_[name]/posConfig
```

**Problem:** Products showing $0 price

**Solution:**
- Check Alleaves pricing fields (use adult-use/medical variants)
- Run pricing analysis: `npx tsx dev/check-alleaves-raw-pricing.ts`
- May need to apply category-based markup

### Login Issues

**Problem:** User can't login

**Solution:**
1. Verify user exists in Firebase Auth
2. Check custom claims are set correctly
3. Send password reset email

**Problem:** User sees "Forbidden" error

**Solution:**
1. Verify `locationId` matches org ID
2. Check `role` is set correctly
3. Verify `currentOrgId` is set

### Dashboard Issues

**Problem:** Dashboard shows no data

**Solution:**
1. Check POS sync ran successfully
2. Verify user's `locationId` matches `orgId` in data
3. Check Firestore security rules allow read access

---

## Post-Launch

### Weekly Tasks

- [ ] Review sync logs for errors
- [ ] Check customer feedback
- [ ] Monitor dashboard usage
- [ ] Review loyalty sync discrepancies

### Monthly Tasks

- [ ] Update product images
- [ ] Review staff access levels
- [ ] Analyze customer segments
- [ ] Update ground truth QA set

### Quarterly Tasks

- [ ] Full platform audit
- [ ] Staff training refresh
- [ ] Review and optimize workflows
- [ ] Update branding/content

---

## Support & Resources

- **Documentation**: https://docs.bakedbot.ai
- **Support Email**: support@bakedbot.ai
- **Status Page**: https://status.bakedbot.ai
- **Community**: https://discord.gg/bakedbot

---

**Last Updated:** February 2, 2026
**Version:** 1.0
