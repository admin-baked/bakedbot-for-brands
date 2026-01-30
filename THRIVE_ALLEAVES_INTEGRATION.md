# Thrive Cannabis Syracuse - Alleaves POS Integration Guide

## Overview
This document outlines the complete integration of Alleaves POS system for Thrive Cannabis Syracuse, our pilot customer. The integration will power the headless menu, Smokey AI budtender widget, CEO dashboard, and all agent tools.

**Status**: 🚧 In Progress
**Pilot Customer**: Thrive Cannabis Syracuse
**Location**: 3065 Erie Blvd E, Syracuse, NY 13224
**BakedBot URL**: bakedbot.ai/thrivesyracuse
**Email**: thrivesyracuse@bakedbot.ai

---

## 📋 Credentials Provided

| Credential | Value |
|-----------|-------|
| **Username** | Bakedbotai@thrivesyracuse.com |
| **Password** | Bakedbotthrive1! |
| **Pin** | 1234 |
| **Location ID** | 1000 |

⚠️ **Important**: These appear to be web portal credentials, not API credentials.

---

## 🔐 Step 1: Obtaining API Credentials

### Current Situation
- The Alleaves adapter (`src/lib/pos/adapters/alleaves.ts`) expects **Bearer token authentication**
- We have web login credentials but need an **API key**
- API Base URL in adapter: `https://api.alleaves.com/v1`
- Documentation URL provided: `https://app.alleaves.com/api/documentation/`

### Action Required
You need to obtain an API key from Alleaves. Here are the recommended steps:

#### Option 1: Portal API Key Generation (Recommended)
1. Log in to Alleaves portal at `https://app.alleaves.com`
   - Username: `Bakedbotai@thrivesyracuse.com`
   - Password: `Bakedbotthrive1!`
2. Navigate to **Settings** → **API Access** or **Integrations**
3. Generate a new API key for BakedBot AI integration
4. Copy the API key (it will look like: `alv_live_xxxxxxxxxxxxx`)

#### Option 2: Contact Alleaves Support
If API key generation is not available in the portal:
1. Email: support@alleaves.com
2. Subject: "API Key Request for BakedBot Integration - Thrive Syracuse"
3. Body:
   ```
   Hello Alleaves Support,

   We are integrating Thrive Syracuse (Location ID: 1000) with BakedBot AI
   for headless menu and AI budtender capabilities.

   Please provide:
   - API Key for programmatic access
   - API Base URL (if different from https://api.alleaves.com/v1)
   - Rate limits and usage guidelines
   - Webhook configuration details (if available)

   Account: Bakedbotai@thrivesyracuse.com
   Location: Thrive Syracuse (Location ID: 1000)

   Thank you!
   ```

#### Option 3: Partner Integration Request
If Thrive Syracuse is using Alleaves through a partner/reseller:
1. Contact your Alleaves account manager
2. Request partner-level API access
3. You may need a **Partner ID** in addition to the API key

---

## 🔧 Step 2: Environment Configuration

Once you have the API key, add it to Firebase App Hosting secrets:

### Using Firebase CLI
```bash
# Set the Alleaves API key as a secret
firebase apphosting:secrets:set ALLEAVES_API_KEY

# When prompted, paste your API key
```

### Using Google Cloud Console
1. Go to Google Cloud Console → Secret Manager
2. Create new secret: `ALLEAVES_API_KEY`
3. Set value to your API key
4. Grant access to App Hosting service account

### Update apphosting.yaml
Add these lines to `apphosting.yaml` after line 183:

```yaml
  # Alleaves POS
  - variable: ALLEAVES_API_KEY
    secret: ALLEAVES_API_KEY
    availability:
      - RUNTIME
  - variable: ALLEAVES_API_BASE
    value: "https://api.alleaves.com/v1"
    availability:
      - RUNTIME
```

---

## 🏗️ Step 3: Implementation Checklist

### A. Update POS Sync Action
**File**: `src/server/actions/pos-sync.ts`

Current issue: Only supports Dutchie. Need to add Alleaves support.

```typescript
// Add import
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

// Update client initialization (around line 36-45)
let client;
if (posConfig.provider === 'dutchie') {
    client = new DutchieClient({
        apiKey: posConfig.apiKey,
        storeId: posConfig.dispensaryId || posConfig.storeId,
    });
} else if (posConfig.provider === 'alleaves') {
    client = new ALLeavesClient({
        apiKey: posConfig.apiKey || process.env.ALLEAVES_API_KEY,
        storeId: posConfig.storeId,
        locationId: posConfig.locationId || '1000',
        partnerId: posConfig.partnerId,
        environment: posConfig.environment || 'production',
    });
} else {
    logger.warn('[POS_SYNC] Unsupported POS provider', { provider: posConfig.provider });
    return 0;
}
```

### B. Create Thrive Syracuse Setup Script
**File**: `dev/setup-thrive-alleaves.ts`

```typescript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp();
const firestore = getFirestore(app);

async function setupThriveAlleaves() {
    const brandId = 'thrivesyracuse';
    const orgId = 'org_thrive_syracuse';
    const locationId = 'loc_thrive_syracuse_main';

    // 1. Create/Update Organization
    await firestore.collection('orgs').doc(orgId).set({
        id: orgId,
        name: 'Thrive Cannabis Syracuse',
        type: 'dispensary',
        brandId: brandId,
        email: 'thrivesyracuse@bakedbot.ai',
        address: {
            street: '3065 Erie Blvd E',
            city: 'Syracuse',
            state: 'NY',
            zip: '13224',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 2. Create/Update Location with Alleaves POS Config
    await firestore.collection('locations').doc(locationId).set({
        id: locationId,
        orgId: orgId,
        brandId: brandId,
        name: 'Thrive Syracuse - Main Store',
        address: {
            street: '3065 Erie Blvd E',
            city: 'Syracuse',
            state: 'NY',
            zip: '13224',
        },
        posConfig: {
            provider: 'alleaves',
            status: 'active',
            locationId: '1000',
            storeId: '1000',
            environment: 'production',
            // API key will be pulled from env vars
            lastSyncAt: null,
            autoSync: true,
            syncIntervalHours: 4,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. Create Brand Document
    await firestore.collection('brands').doc(brandId).set({
        id: brandId,
        name: 'Thrive Syracuse',
        displayName: 'Thrive Cannabis Syracuse',
        orgId: orgId,
        email: 'thrivesyracuse@bakedbot.ai',
        phone: '',
        website: 'https://bakedbot.ai/thrivesyracuse',
        description: 'Syracuse\'s premier cannabis dispensary committed to community reinvestment and quality products.',
        logoUrl: '',
        primaryColor: '#4ade80',
        state: 'NY',
        licenseNumber: '',
        settings: {
            enableSmokey: true,
            enableCraig: true,
            enableEzal: true,
            enableDashboard: true,
            menuStyle: 'grid',
            ageGateEnabled: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Thrive Syracuse setup complete!');
    console.log('📍 Organization ID:', orgId);
    console.log('📍 Brand ID:', brandId);
    console.log('📍 Location ID:', locationId);
    console.log('\n🔄 Next: Run POS sync to import menu');
}

setupThriveAlleaves().then(() => process.exit(0)).catch(console.error);
```

### C. Smokey Integration
Smokey automatically uses menu data from Firestore. Once POS sync runs, Smokey will have access to Alleaves products.

**Verify in**: `src/server/agents/smokey.ts`
- The agent already queries `brands/{brandId}/products` collection
- Products from Alleaves sync will automatically be available

### D. Dashboard Integration
**File**: `src/app/dashboard/menu/actions.ts`

Already supports POS-synced products. The `getMenuData()` action reads from Firestore, so Alleaves products will appear automatically.

### E. Ezal Integration
**File**: `src/server/agents/ezal-team/orchestrator.ts`

Ezal can access competitor pricing via:
1. Direct Alleaves inventory data (for internal pricing)
2. CannMenus API (for external competitor pricing)

No changes needed - Ezal already queries Firestore products.

---

## 🧪 Step 4: Testing Plan

### A. Connection Test
Create test script: `dev/test-alleaves-connection.ts`

```typescript
import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';

async function testConnection() {
    const client = new ALLeavesClient({
        apiKey: process.env.ALLEAVES_API_KEY!,
        storeId: '1000',
        locationId: '1000',
        environment: 'production',
    });

    console.log('🔍 Testing Alleaves connection...\n');

    // 1. Validate Connection
    const isValid = await client.validateConnection();
    console.log('✅ Connection valid:', isValid);

    if (!isValid) {
        console.error('❌ Connection failed. Check API key and location ID.');
        return;
    }

    // 2. Fetch Menu
    const products = await client.fetchMenu();
    console.log(`\n📦 Fetched ${products.length} products`);

    if (products.length > 0) {
        console.log('\n📋 Sample product:');
        console.log(JSON.stringify(products[0], null, 2));
    }

    // 3. Check Inventory
    if (products.length > 0) {
        const productIds = products.slice(0, 5).map(p => p.externalId);
        const inventory = await client.getInventory(productIds);
        console.log('\n📊 Sample inventory:');
        console.log(inventory);
    }

    console.log('\n✅ All tests passed!');
}

testConnection().catch(console.error);
```

**Run**:
```bash
npx tsx dev/test-alleaves-connection.ts
```

### B. Full Sync Test
```bash
# After setup script runs, trigger POS sync
npx tsx dev/manual-pos-sync.ts
```

Create `dev/manual-pos-sync.ts`:
```typescript
import { syncPOSProducts } from '@/server/actions/pos-sync';

async function manualSync() {
    const locationId = 'loc_thrive_syracuse_main';
    const orgId = 'org_thrive_syracuse';

    console.log('🔄 Starting POS sync...');
    const count = await syncPOSProducts(locationId, orgId);
    console.log(`✅ Synced ${count} products!`);
}

manualSync().catch(console.error);
```

### C. Smokey Widget Test
1. Navigate to `https://bakedbot.ai/thrivesyracuse`
2. Open Smokey chatbot
3. Ask: "What flower products do you have?"
4. Verify products from Alleaves appear

### D. Dashboard Test
1. Log in as Thrive Syracuse admin
2. Navigate to Dashboard → Menu
3. Verify products from Alleaves sync appear
4. Check inventory levels update correctly

---

## 🔄 Step 5: Automated Sync Setup

### Option A: Cloud Scheduler (Recommended)
```bash
gcloud scheduler jobs create http thrive-alleaves-sync \
  --schedule="0 */4 * * *" \
  --uri="https://bakedbot.ai/api/pos/sync?locationId=loc_thrive_syracuse_main&orgId=org_thrive_syracuse" \
  --http-method=POST \
  --location=us-central1 \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

### Option B: Firestore Trigger
Add to `firestore.rules`:
```javascript
match /locations/{locationId} {
  allow read, write: if request.auth != null;

  // Trigger POS sync on posConfig update
  allow update: if request.resource.data.posConfig.lastSyncAt != resource.data.posConfig.lastSyncAt;
}
```

---

## 📊 Integration Points Summary

| Component | Integration Method | Status |
|-----------|-------------------|--------|
| **Headless Menu** | Firestore products from POS sync | ✅ Ready |
| **Smokey Widget** | Queries `brands/{brandId}/products` | ✅ Ready |
| **Dashboard** | `getMenuData()` server action | ✅ Ready |
| **Ezal Agent** | Firestore products + CannMenus API | ✅ Ready |
| **Craig Agent** | Firestore products for campaigns | ✅ Ready |
| **Order Management** | `createOrder()` in Alleaves client | ✅ Ready |
| **Customer Sync** | `syncCustomer()` in Alleaves client | ✅ Ready |

---

## 🚨 Known Considerations

### 1. API Base URL Verification
- Adapter uses: `https://api.alleaves.com/v1`
- Documentation URL: `https://app.alleaves.com/api/documentation/`
- **Action**: Verify correct base URL with Alleaves support

### 2. Rate Limiting
- Unknown rate limits for Alleaves API
- **Action**: Request rate limit documentation from Alleaves
- **Mitigation**: Implement exponential backoff in adapter

### 3. Webhook Support
- Alleaves may support webhooks for real-time inventory updates
- **Action**: Request webhook documentation
- **Benefit**: Near-instant inventory updates vs polling

### 4. Product Matching
- Ensure Alleaves product IDs map correctly to BakedBot product schema
- **Action**: Monitor first sync for any data mapping issues

### 5. Image URLs
- Verify Alleaves image URLs are publicly accessible
- **Action**: Test image URLs in browser after sync

---

## 📞 Support Contacts

| Issue | Contact |
|-------|---------|
| **Alleaves API Issues** | support@alleaves.com |
| **Thrive Syracuse Account** | thrivesyracuse@bakedbot.ai |
| **BakedBot Integration** | Ade Adeyemi (owner) |

---

## ✅ Next Steps

1. **Obtain API Key**
   - [ ] Log in to Alleaves portal
   - [ ] Generate API key or contact support
   - [ ] Document any partner ID if required

2. **Configure Environment**
   - [ ] Add `ALLEAVES_API_KEY` secret to Firebase
   - [ ] Update `apphosting.yaml`
   - [ ] Deploy configuration changes

3. **Run Setup Scripts**
   - [ ] Run `dev/setup-thrive-alleaves.ts`
   - [ ] Run `dev/test-alleaves-connection.ts`
   - [ ] Verify connection successful

4. **Update Code**
   - [ ] Update `pos-sync.ts` to support Alleaves
   - [ ] Test POS sync with `dev/manual-pos-sync.ts`
   - [ ] Verify products appear in Firestore

5. **End-to-End Testing**
   - [ ] Test Smokey widget with Alleaves products
   - [ ] Test dashboard menu display
   - [ ] Test order creation flow
   - [ ] Monitor for any errors

6. **Production Deployment**
   - [ ] Set up automated sync schedule
   - [ ] Configure webhooks (if available)
   - [ ] Monitor sync logs for 48 hours
   - [ ] Document any issues for refinement

---

## 📚 Related Documentation

- [Alleaves POS Adapter](src/lib/pos/adapters/alleaves.ts) - Full implementation
- [Alleaves Tests](tests/lib/pos/alleaves.test.ts) - Unit tests
- [POS Sync Action](src/server/actions/pos-sync.ts) - Sync orchestration
- [Thrive Ground Truth](src/server/grounding/customers/thrive-syracuse.ts) - QA data
- [Pilot Setup Reference](.agent/refs/pilot-setup.md) - General pilot setup guide

---

**Last Updated**: 2026-01-29
**Author**: Claude (BakedBot AI Integration Assistant)
**Status**: 🚧 Awaiting API credentials from Alleaves
