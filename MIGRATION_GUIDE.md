# Role-Based Ground Truth Migration Guide

## Overview

This guide walks through migrating the BakedBot platform from hardcoded quick actions and prompts to a dynamic, database-backed Ground Truth system with role-based customization.

## What's Being Migrated

- **37 Quick Actions** (Inbox preset prompts) → Firestore `ground_truth_v2` collection
- **70 QA Pairs** (Role-specific knowledge) → Firestore `ground_truth_v2/{roleId}/categories/{category}/qa_pairs`
- **Distribution**:
  - Brand: 10 quick actions + 20 QA pairs
  - Dispensary: 10 quick actions + 20 QA pairs
  - Super User: 34 quick actions + 30 QA pairs
  - Customer: 3 quick actions

---

## Prerequisites

### 1. Firebase Service Account Key

You need a Firebase service account key with Firestore write permissions.

**Option A: Check existing environment**
```powershell
# Check if already set in your .env.local
Get-Content .env.local | Select-String "FIREBASE_SERVICE_ACCOUNT_KEY"
```

**Option B: Get from Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Settings (gear icon) → Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely
6. Base64 encode it:
   ```powershell
   # In PowerShell
   $json = Get-Content path\to\serviceAccountKey.json -Raw
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
   $base64 = [Convert]::ToBase64String($bytes)
   echo $base64
   ```

### 2. Set Environment Variable

**In PowerShell (for current session)**:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT_KEY = "your-base64-encoded-key-here"
```

**Or add to `.env.local` (permanent)**:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY=your-base64-encoded-key-here
```

---

## Migration Steps

### Step 1: Preview Migration (Dry Run)

```powershell
node scripts/migrate-quick-actions.mjs --dry-run
```

**Expected output**:
```
[Migration] Starting quick actions migration...
[Migration] Mode: DRY RUN
[Migration] Loaded 37 quick actions from source
[Migration] Converting 37 quick actions...

================================================================================
MIGRATION SUMMARY
================================================================================

BRAND: 10 presets
  - marketing: 5
  - product_launches: 1
  - analytics: 1
  ...

DISPENSARY: 10 presets
SUPER_USER: 34 presets
CUSTOMER: 3 presets

[Migration] ✅ Migration completed successfully
⚠️  DRY RUN MODE - No changes were made to the database
```

### Step 2: Run Live Migration

```powershell
# Ensure Firebase credentials are set
$env:FIREBASE_SERVICE_ACCOUNT_KEY = "your-base64-key"

# Run migration
node scripts/migrate-quick-actions.mjs
```

**Expected output**:
```
[Migration] Starting quick actions migration...
[Migration] Mode: LIVE
[Migration] ✅ Firebase Admin initialized
[Migration] Loaded 37 quick actions from source
[Migration] Converting 37 quick actions...

[Migration] Migrating 10 preset prompts for role: brand
[Migration] ✅ Migrated 10 new presets for role: brand (10 total)

[Migration] Migrating 10 preset prompts for role: dispensary
[Migration] ✅ Migrated 10 new presets for role: dispensary (10 total)

[Migration] Migrating 34 preset prompts for role: super_user
[Migration] ✅ Migrated 34 new presets for role: super_user (34 total)

[Migration] Migrating 3 preset prompts for role: customer
[Migration] ✅ Migrated 3 new presets for role: customer (3 total)

[Migration] ✅ Migration completed successfully
```

### Step 3: Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Firestore Database
3. Check `ground_truth_v2` collection
4. Verify documents exist for: `brand`, `dispensary`, `super_user`, `customer`
5. Click on any document → verify `preset_prompts` array has items

---

## Seeding QA Pairs

QA pairs must be added through the CEO dashboard UI (not via script, to ensure proper validation and structure).

### Via CEO Dashboard

1. Navigate to **Dashboard → CEO → Ground Truth**
2. Select role from dropdown (Brand / Dispensary / Super User)
3. Click **"Import/Export"** tab
4. Click **"Import Ground Truth"**
5. Upload the corresponding JSON file:
   - Brand: `scripts/seed-brand-qa-pairs.json`
   - Dispensary: `scripts/seed-dispensary-qa-pairs.json`
   - Super User: `scripts/seed-super-user-qa-pairs.json`
6. Click **"Import"**

### QA Pair Distribution

- **Brand** (20 QA pairs): Marketing, product launches, compliance, customer engagement, pricing, seasonal promotions
- **Dispensary** (20 QA pairs): Operations, inventory, customer service, compliance, loyalty, events, training
- **Super User** (30 QA pairs): Growth metrics, churn, revenue forecasting, pipeline, customer health, competitive intelligence, partnerships, experiments, sprints, releases, incidents, onboarding, hiring, research, fundraising, crisis management

---

## Enable Database-Backed Quick Actions

### Step 1: Enable Feature Flag

**In `.env.local`**:
```bash
NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=true
```

### Step 2: Restart Development Server

```powershell
# Stop current server (Ctrl+C)

# Restart
npm run dev
```

### Step 3: Verify Quick Actions Load

1. Open your application
2. Navigate to **Inbox**
3. Check sidebar for quick actions
4. Open browser DevTools Console
5. Should NOT see any errors related to quick actions
6. Quick actions should load based on your role

---

## Testing the Migration

### Test 1: Quick Actions by Role

**As Brand User:**
- Should see: New Carousel, New Bundle, Create Post, Plan Campaign, QR Code, Product Launch, Review Performance, Customer Blast, Move Inventory, Plan Event
- Should NOT see: Super User actions (Growth Review, Sprint Planning, etc.)

**As Dispensary User:**
- Same actions as Brand

**As Super User:**
- Should see: All Brand/Dispensary actions PLUS Growth Review, Churn Analysis, Pipeline Review, Daily Standup, Sprint Planning, Incident Response, etc. (34 total)

**As Customer:**
- Should see: Find Products, My Routines, Get Help (3 total)

### Test 2: Database vs. Hardcoded Fallback

**Test Database Loading:**
```javascript
// In browser console
const store = require('@/lib/store/inbox-store').useInboxStore.getState();
await store.loadQuickActions();
console.log('Quick actions:', store.getQuickActions());
```

**Test Fallback (disable feature flag):**
1. Set `NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=false` in `.env.local`
2. Restart server
3. Quick actions should still load (from hardcoded fallback)

### Test 3: Role Ground Truth Loading

Check agent logs to verify ground truth is being loaded:

1. Open an inbox thread as a Brand user
2. Check server logs for:
   ```
   [Craig:GroundTruth] Loaded brand ground truth
   ```
3. Should see:
   - Number of QA pairs
   - Number of preset prompts
   - Number of workflows

---

## Using the CEO Dashboard

### Accessing Ground Truth Management

1. Navigate to **Dashboard → CEO → Ground Truth**
2. Select role from dropdown: Brand / Dispensary / Super User / Customer
3. Choose from 6 tabs:

### Tab 1: QA Pairs (Legacy)

- Select a brand to manage legacy Smokey QA pairs
- Add categories and QA pairs specific to that brand
- Used for brand-specific product knowledge

### Tab 2: Preset Prompts

**Managing Quick Actions:**
- View all preset prompts for selected role
- Add new quick action:
  1. Click "Add Preset Prompt"
  2. Fill in: Label, Description, Thread Type, Default Agent, Prompt Template
  3. Add variables using `{{variable_name}}` syntax
  4. Assign to roles
  5. Set category and icon
  6. Save
- Edit existing: Click edit icon → Update → Save
- Delete: Click trash icon → Confirm
- Duplicate: Click copy icon → Modify → Save

**Variable Substitution:**
- Use Mustache syntax: `{{product_name}}`, `{{target_date}}`
- Variables are automatically extracted and shown
- Live preview shows variable substitution

### Tab 3: Workflow Guides

**Creating Step-by-Step Workflows:**
- Click "Add Workflow Guide"
- Set title, description, difficulty level
- Add steps:
  1. Click "Add Step"
  2. Enter step title and description
  3. Assign agent (optional)
  4. List tools used
  5. Define expected output
- Reorder steps with up/down arrows
- Add tags for categorization
- Save workflow

### Tab 4: Tenant Overrides

**Customizing for Specific Tenants:**
- Select a tenant (coming soon: tenant selector UI)
- View global presets vs. tenant-specific
- Disable global presets: Toggle off unwanted actions
- Add custom presets: Click "Add Custom Preset" → Fill form → Save
- Preview merged view: See final set of actions (global + tenant overrides)

### Tab 5: Live Tester

- Select a brand
- Test Smokey responses with ground truth
- Enter question → See answer + grounding references
- Verify QA pairs are being used correctly

### Tab 6: Import/Export

**Export:**
- Download current ground truth as JSON
- Use for backups or sharing between environments

**Import:**
- Upload JSON file (from export or manually created)
- Validates schema before importing
- Merges with existing data (doesn't overwrite)

---

## Rollback Plan

If issues occur, you can quickly rollback:

### Option 1: Disable Feature Flag

```bash
# In .env.local
NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=false
```

Restart server. Quick actions will load from hardcoded fallback immediately.

### Option 2: Delete Database Collections

**⚠️ USE WITH CAUTION**

```javascript
// In Firebase Console Firestore
// Delete documents: ground_truth_v2/brand, dispensary, super_user, customer
```

Then disable feature flag as in Option 1.

---

## Troubleshooting

### Quick Actions Not Loading

**Check 1: Feature flag**
```javascript
console.log(process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS);
// Should be 'true'
```

**Check 2: Role is set**
```javascript
const store = require('@/lib/store/inbox-store').useInboxStore.getState();
console.log('Current role:', store.currentRole);
// Should not be null
```

**Check 3: Database has data**
- Go to Firebase Console → Firestore
- Check `ground_truth_v2/{roleId}` document exists
- Check `preset_prompts` array has items

**Check 4: Browser console errors**
- Open DevTools → Console
- Look for errors containing "quick actions" or "preset prompts"

### Migration Script Fails

**Error: "FIREBASE_SERVICE_ACCOUNT_KEY not found"**
```powershell
# Set the environment variable
$env:FIREBASE_SERVICE_ACCOUNT_KEY = "your-base64-key"

# Then run migration again
node scripts/migrate-quick-actions.mjs
```

**Error: "Permission denied"**
- Verify service account has Firestore write permissions
- Check Firestore security rules allow writes to `ground_truth_v2`

**Error: "Document already exists"**
- This is fine! Script merges with existing data (doesn't overwrite)
- Re-running migration is safe (idempotent)

### Agent Not Receiving Ground Truth

**Check agent logs:**
```
[Craig:GroundTruth] Loaded brand ground truth
```

If not present:
1. Verify user role is correctly set
2. Check `src/server/grounding/role-loader.ts` is loading correctly
3. Verify agent initialization in `src/server/agents/{agent}.ts` includes ground truth loading

### Dashboard Can't Save Changes

**Check:**
1. User has super_user or owner role
2. Firestore security rules allow writes
3. Server actions are properly authenticated
4. No validation errors in form (check browser console)

---

## Best Practices

### 1. Test in Staging First

- Run migration on staging environment before production
- Test with real users in staging
- Verify performance impact is acceptable

### 2. Incremental Rollout

- Enable feature flag for internal users first (set role to test account)
- Monitor for issues 24-48 hours
- Gradually expand to beta customers
- Full rollout after validation

### 3. Monitor Performance

- Watch Firestore read/write quotas
- Monitor page load times
- Check agent initialization times
- Review error rates in Sentry

### 4. Regular Backups

- Export ground truth weekly (Import/Export tab)
- Store exports in version control or secure storage
- Document any manual changes made through dashboard

### 5. Keep Hardcoded Fallback

- Don't delete `INBOX_QUICK_ACTIONS` from code for at least 2 release cycles
- Provides instant rollback capability
- Useful for debugging/comparison

---

## Performance Considerations

### Caching

- **In-memory cache**: 5-minute TTL on role ground truth
- **Zustand state**: Quick actions cached until role changes
- **Firestore**: Indexed by roleId for fast retrieval

### Load Times

- **First load (database)**: ~100-300ms
- **Cached**: <10ms
- **Hardcoded fallback**: <1ms

### Optimization Tips

- Cache is shared across all agents for same role
- Tenant overrides are merged at load time (not runtime)
- Quick actions load async (doesn't block page render)

---

## Support

### Documentation

- [Database-Backed Quick Actions](.agent/refs/database-backed-quick-actions.md)
- [Role Ground Truth Integration](.agent/refs/role-ground-truth-integration.md)
- [Ground Truth v2.0 Types](src/types/ground-truth.ts)

### Getting Help

- Check browser console for errors
- Review server logs for ground truth loading messages
- Inspect Firestore data structure in Firebase Console
- Test with feature flag disabled to isolate database issues

### Reporting Issues

Include in bug reports:
1. Feature flag state (`NEXT_PUBLIC_USE_DB_QUICK_ACTIONS`)
2. User role
3. Browser console errors
4. Server logs (if available)
5. Steps to reproduce

---

## Next Steps

After successful migration:

1. **Create Custom Quick Actions**
   - Use CEO Dashboard → Preset Prompts tab
   - Add brand-specific or use case-specific actions
   - Test with actual users

2. **Add More QA Pairs**
   - Continuously improve agent knowledge
   - Add QA pairs based on common user questions
   - Regular updates maintain accuracy

3. **Configure Tenant Overrides**
   - Allow beta customers to customize their quick actions
   - Disable irrelevant actions for specific tenants
   - Add tenant-specific workflows

4. **Monitor and Iterate**
   - Track which quick actions are used most
   - Gather user feedback
   - Refine prompts based on actual usage
   - A/B test variations

---

## Migration Checklist

- [ ] Firebase service account key obtained and encoded
- [ ] Environment variable set (`FIREBASE_SERVICE_ACCOUNT_KEY`)
- [ ] Dry-run migration completed successfully
- [ ] Live migration run and verified in Firebase Console
- [ ] QA pairs imported for all roles via CEO dashboard
- [ ] Feature flag enabled (`NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=true`)
- [ ] Development server restarted
- [ ] Quick actions load correctly for each role
- [ ] Agent ground truth loading confirmed in logs
- [ ] Dashboard UI tested (add/edit/delete presets)
- [ ] Rollback plan documented and tested
- [ ] Stakeholders notified of changes
- [ ] Monitoring in place for issues

---

**Migration completed!** 🎉

You now have a fully dynamic, database-backed Ground Truth system with role-based customization.
