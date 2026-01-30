# Thrive Syracuse - Alleaves Integration Deployment Guide

**Status**: ✅ Code Complete - Ready for Deployment
**Date**: 2026-01-29

---

## 📋 Overview

The Alleaves POS integration for Thrive Syracuse is **fully implemented and tested**. All code changes are complete. Only deployment steps remain.

### What's Working
- ✅ JWT authentication with auto-refresh
- ✅ Menu fetch (395 products successfully retrieved)
- ✅ Category mapping (11 categories)
- ✅ Stock level tracking
- ✅ THC/CBD percentage mapping
- ✅ TypeScript compilation passing
- ✅ Adapter tests passing

### Known Issue
⚠️ **Price Data**: Only 17 out of 395 items have price data in the Alleaves API
- Most cannabis products show $0 (price_retail: 0, price_otd: 0)
- Accessories and gift cards have prices
- This is a **data configuration issue in Alleaves**, not our adapter
- Products will sync but may show $0 until prices are configured in Alleaves admin

---

## 🚀 Deployment Steps

### Step 1: Set Firebase Secrets

Run these commands to add the Alleaves credentials as Firebase secrets:

```bash
firebase apphosting:secrets:set ALLEAVES_USERNAME="bakedbotai@thrivesyracuse.com"
firebase apphosting:secrets:set ALLEAVES_PASSWORD="Dreamchasing2030!!@@!!"
firebase apphosting:secrets:set ALLEAVES_PIN="1234"
```

### Step 2: Deploy Configuration

The following files have been updated and are ready to deploy:

- ✅ `src/lib/pos/adapters/alleaves.ts` - Updated adapter
- ✅ `src/server/actions/pos-sync.ts` - Alleaves support added
- ✅ `apphosting.yaml` - Environment variables configured
- ✅ `dev/setup-thrive-alleaves.ts` - Firestore setup script

Push to main to deploy via Firebase App Hosting:

```bash
git add .
git commit -m "feat(thrive): complete Alleaves POS integration with JWT auth"
git push origin main
```

### Step 3: Initialize Firestore

Run the setup script to create the organization, brand, and location documents:

```bash
npx tsx dev/setup-thrive-alleaves.ts
```

This will create:
- Organization: `org_thrive_syracuse`
- Brand: `thrivesyracuse`
- Location: `loc_thrive_syracuse_main`
- POS Config: Alleaves with JWT credentials

### Step 4: Run Initial POS Sync

Trigger the initial product sync via API:

```bash
# Using curl
curl -X POST https://your-app.web.app/api/pos/sync \
  -H "Content-Type: application/json" \
  -d '{"brandId": "thrivesyracuse"}'

# Or via dashboard
# Navigate to: /dashboard/content
# Click "Sync POS Products"
```

### Step 5: Verify Integration

1. **Check Products in Firestore**:
   - Collection: `brands/thrivesyracuse/products`
   - Should contain 395 products

2. **Test Smokey Widget**:
   - URL: https://bakedbot.ai/thrivesyracuse
   - Should show product recommendations

3. **Check Dashboard**:
   - Navigate to: /dashboard/content
   - Should display menu with categories

---

## 📊 Integration Details

### API Endpoint Used
```
POST https://app.alleaves.com/api/inventory/search
Body: { "query": "" }
```

### Authentication
- Method: JWT (JSON Web Token)
- Login: POST /api/auth
- Token expiry: 24 hours
- Auto-refresh: 5 minutes before expiry

### Data Mapping
| Alleaves Field | BakedBot Field | Notes |
|----------------|----------------|-------|
| `id_item` | `externalId` | Convert to string |
| `item` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `category` | `category` | Strips "Category > " prefix |
| `price_otd` | `price` | Out-the-door price (with tax) |
| `available` | `stock` | Available quantity |
| `thc` | `thcPercent` | THC percentage |
| `cbd` | `cbdPercent` | CBD percentage |

### Product Categories (11 total)
- Flower (93 items)
- Vapes (89 items)
- Edibles (77 items)
- Pre rolls (75 items)
- Concentrate (20 items)
- Beverages (13 items)
- Gift Cards (10 items)
- Accessories (7 items)
- Tinctures (7 items)
- Topicals (3 items)
- Uncategorized (1 item)

---

## 🔧 Testing Commands

### Test Adapter Directly
```bash
npx tsx dev/test-alleaves-adapter.ts
```
Expected output: ✅ All tests passed!

### Check Price Data
```bash
npx tsx dev/check-price-data.ts
```
Shows which products have pricing data.

### Get Full Inventory
```bash
npx tsx dev/get-full-inventory.ts
```
Retrieves and saves full inventory to JSON.

---

## 📁 Files Modified

### Core Implementation
- [src/lib/pos/adapters/alleaves.ts](src/lib/pos/adapters/alleaves.ts:267) - Complete JWT rewrite
- [src/server/actions/pos-sync.ts](src/server/actions/pos-sync.ts) - Added Alleaves support
- [apphosting.yaml](apphosting.yaml:183) - Updated environment variables

### Setup & Testing
- [dev/setup-thrive-alleaves.ts](dev/setup-thrive-alleaves.ts) - Firestore setup script
- [dev/test-alleaves-adapter.ts](dev/test-alleaves-adapter.ts) - Adapter test (✅ passing)
- [dev/check-price-data.ts](dev/check-price-data.ts) - Price data analysis
- [dev/get-full-inventory.ts](dev/get-full-inventory.ts) - Full inventory retrieval

### Documentation
- [THRIVE_ALLEAVES_STATUS.md](THRIVE_ALLEAVES_STATUS.md) - Integration status (95% complete)
- [THRIVE_DEPLOYMENT_GUIDE.md](THRIVE_DEPLOYMENT_GUIDE.md) - This file

---

## ⚠️ Price Data Issue Resolution

If you need full pricing for all products:

### Option 1: Configure in Alleaves Admin
1. Log in to https://app.alleaves.com
2. Navigate to inventory management
3. Add retail prices for products missing them

### Option 2: Contact Alleaves Support
Ask about:
- Why inventory items lack pricing data
- If there's a separate pricing endpoint
- If prices are configured elsewhere in the system

### Option 3: Accept Current State
- Proceed with integration as-is
- Prices may be added at checkout/POS level
- Update pricing manually in BakedBot if needed

---

## 📞 Support

### Alleaves Credentials
- **API URL**: https://app.alleaves.com/api
- **Admin Panel**: https://app.alleaves.com
- **Username**: bakedbotai@thrivesyracuse.com
- **Password**: Dreamchasing2030!!@@!!
- **PIN**: 1234
- **Location ID**: 1000

### BakedBot Configuration
- **Brand ID**: thrivesyracuse
- **Org ID**: org_thrive_syracuse
- **Location ID**: loc_thrive_syracuse_main
- **Email**: thrivesyracuse@bakedbot.ai

---

## ✅ Deployment Checklist

- [ ] Set Firebase secrets (USERNAME, PASSWORD, PIN)
- [ ] Push code to main branch
- [ ] Wait for deployment to complete
- [ ] Run Firestore setup script
- [ ] Trigger initial POS sync
- [ ] Verify products in Firestore
- [ ] Test Smokey widget
- [ ] Test dashboard menu
- [ ] Confirm auto-sync is working (every 4 hours)

---

**Integration Status**: ✅ Ready to Deploy
**Code Quality**: All TypeScript checks passing
**Test Results**: All adapter tests passing
**Estimated Deployment Time**: 15-30 minutes

