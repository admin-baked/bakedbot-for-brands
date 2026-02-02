# Hybrid Loyalty System Implementation Plan

## Overview
Implement a hybrid loyalty system that:
1. **Calculates** points from Alleaves order history
2. **Syncs** with Alpine IQ for reconciliation
3. **Stores** loyalty data in BakedBot customer profiles
4. **Surfaces** discrepancies for review

---

## Current State

### Alleaves POS
- **Order data includes:**
  - `loyalty`: Discount applied (e.g., `0`)
  - `points_earned`: Points earned per order (e.g., `null`)
  - `loyalties`: Array of loyalty transactions
- **Customer data includes:**
  - `alpine_user_code`: Alpine IQ integration ID
  - NO direct loyalty points field

### Alpine IQ
- **Current integration:**
  - `getLoyaltyProfile(phone)` → returns `{ points, tier, lastVisit }`
  - Used by agents to check customer loyalty status
- **Status:** Production, working

### BakedBot
- **Customer profiles:**
  - `points` field exists but not populated
  - `tier` field exists
  - Loyalty settings stored in Firestore

---

## Architecture Design

### 1. Data Flow

```
┌─────────────────┐
│  Alleaves POS   │
│   (Orders)      │
└────────┬────────┘
         │
         │ Fetch orders
         ▼
┌─────────────────────────┐
│  Loyalty Sync Service   │ ◄─── Triggered by:
│                         │      - Manual sync
│  1. Fetch orders        │      - Scheduled job
│  2. Calculate points    │      - New order webhook
│  3. Update Firestore    │
│  4. Sync with Alpine    │
└────────┬────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌─────────────┐  ┌──────────┐  ┌──────────────┐
│  Firestore  │  │ Alpine   │  │   Discord    │
│  (Customer  │  │   IQ     │  │  (Alerts if  │
│  Profiles)  │  │          │  │ discrepancy) │
└─────────────┘  └──────────┘  └──────────────┘
```

### 2. Loyalty Calculation Logic

**Points Per Dollar:**
```typescript
const basePoints = totalSpent * loyaltySettings.pointsPerDollar;
const equityBonus = customer.equityStatus
  ? basePoints * (loyaltySettings.equityMultiplier - 1)
  : 0;
const totalPoints = basePoints + equityBonus;
```

**Tier Assignment:**
```typescript
// Based on loyalty settings tiers
const tiers = [
  { id: 'bronze', threshold: 0 },
  { id: 'silver', threshold: 500 },
  { id: 'gold', threshold: 1000 },
];

const tier = tiers.reverse().find(t => totalPoints >= t.threshold);
```

### 3. Reconciliation Strategy

**Compare Three Sources:**
1. **Calculated from Orders** (Alleaves)
2. **Alpine IQ** (external truth)
3. **BakedBot Firestore** (cached)

**Reconciliation Rules:**
- If Alpine IQ points > Calculated: Customer likely earned points from in-store visits not in order history
- If Calculated > Alpine IQ: Potential sync issue or Alpine IQ not configured
- If difference > 10%: Alert admin

---

## Implementation Plan

### Phase 1: Loyalty Sync Service

**File:** `src/server/services/loyalty-sync.ts`

```typescript
export class LoyaltySyncService {
  constructor(
    private posClient: ALLeavesClient,
    private alpineClient: AlpineIQClient,
    private firestore: Firestore
  ) {}

  // Sync single customer
  async syncCustomer(customerId: string): Promise<LoyaltySyncResult> {
    // 1. Fetch orders from Alleaves
    // 2. Calculate points from order history
    // 3. Fetch Alpine IQ points (if alpine_user_code exists)
    // 4. Compare and reconcile
    // 5. Update Firestore customer profile
  }

  // Sync all customers (batch job)
  async syncAllCustomers(orgId: string): Promise<BatchSyncResult> {
    // 1. Fetch all customers from Alleaves
    // 2. Get spending data via getCustomerSpending()
    // 3. Calculate points for each
    // 4. Batch update Firestore
  }

  // Reconcile with Alpine IQ
  async reconcile(customerId: string): Promise<ReconciliationResult> {
    // Compare calculated vs Alpine IQ
    // Return discrepancies
  }
}
```

### Phase 2: Customer Profile Updates

**File:** `src/app/dashboard/customers/actions.ts`

Add new action:
```typescript
export async function syncCustomerLoyalty(customerId: string) {
  // Call LoyaltySyncService
  // Update customer profile
  // Return updated profile
}
```

### Phase 3: Loyalty Tools Enhancement

**File:** `src/server/tools/loyalty.ts`

Update to show both sources:
```typescript
export const LoyaltyTools = {
  checkPoints: async (phone: string) => {
    // 1. Fetch from Firestore (calculated)
    // 2. Fetch from Alpine IQ (external)
    // 3. Return both + reconciliation status

    return {
      calculated: { points: 450, tier: 'bronze', source: 'orders' },
      alpine: { points: 475, tier: 'silver', source: 'alpine_iq' },
      reconciled: true,
      discrepancy: 25,
      lastSyncAt: '2026-01-30'
    };
  }
}
```

### Phase 4: Sync API Endpoint

**File:** `src/app/api/loyalty/sync/route.ts`

```typescript
// POST /api/loyalty/sync
// Trigger manual sync for org or specific customer

export async function POST(request: Request) {
  const { orgId, customerId } = await request.json();

  if (customerId) {
    // Sync single customer
    return syncService.syncCustomer(customerId);
  } else {
    // Sync all customers for org
    return syncService.syncAllCustomers(orgId);
  }
}
```

### Phase 5: Scheduled Sync Job

**Options:**
1. Firebase Cloud Scheduler → calls `/api/loyalty/sync`
2. Next.js API route with cron
3. Manual trigger from admin dashboard

**Recommended frequency:** Daily at 2 AM

---

## Data Models

### Updated CustomerProfile

```typescript
export interface CustomerProfile {
  // ... existing fields ...

  // Loyalty data (calculated from orders)
  points: number;
  pointsFromOrders: number;        // NEW: Calculated from Alleaves
  pointsFromAlpine?: number;       // NEW: Synced from Alpine IQ
  pointsLastCalculated: Date;      // NEW: Last sync timestamp

  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tierSource: 'calculated' | 'alpine_iq';  // NEW: Source of truth

  // Reconciliation
  loyaltyReconciled: boolean;      // NEW: Are sources in sync?
  loyaltyDiscrepancy?: number;     // NEW: Difference if any

  // Alpine IQ integration
  alpineUserId?: string;           // NEW: Alpine user code from Alleaves
}
```

### LoyaltySyncResult

```typescript
export interface LoyaltySyncResult {
  success: boolean;
  customerId: string;
  calculated: {
    points: number;
    tier: string;
    ordersProcessed: number;
    totalSpent: number;
  };
  alpine?: {
    points: number;
    tier: string;
    lastVisit: string;
  };
  reconciliation: {
    reconciled: boolean;
    discrepancy: number;
    action: 'none' | 'alert_admin' | 'auto_adjust';
  };
  updatedAt: Date;
}
```

---

## UI Enhancements

### Customer Profile Page
Show loyalty breakdown:
```
┌─────────────────────────────────┐
│  Loyalty Status                 │
│                                 │
│  Points: 475                    │
│  └─ From orders: 450            │
│  └─ Alpine IQ: 475              │
│  └─ Discrepancy: 25 ⚠️          │
│                                 │
│  Tier: Silver                   │
│  Last synced: 2 hours ago       │
│                                 │
│  [Sync Now] [View History]      │
└─────────────────────────────────┘
```

### Loyalty Dashboard (New Page)
- Total customers by tier
- Sync status (last sync, errors)
- Discrepancies to review
- Manual sync triggers

---

## Migration Strategy

### Step 1: Deploy Service (No UI)
- Add `LoyaltySyncService`
- Add API endpoint
- Test with small batch (10 customers)

### Step 2: Run Initial Sync
- Sync all customers via API
- Review results in Firestore
- Check for major discrepancies

### Step 3: Enable UI
- Update customer profile pages
- Add loyalty dashboard
- Enable manual sync buttons

### Step 4: Schedule Automated Sync
- Set up daily cron job
- Monitor for errors
- Alert on discrepancies > threshold

---

## Testing Checklist

- [ ] Fetch orders from Alleaves for test customer
- [ ] Calculate points correctly (including equity multiplier)
- [ ] Assign correct tier based on points
- [ ] Fetch Alpine IQ points via phone lookup
- [ ] Compare calculated vs Alpine IQ
- [ ] Update Firestore customer profile
- [ ] Handle customers without Alpine IQ account
- [ ] Handle customers with no orders
- [ ] Batch sync 100 customers
- [ ] Performance: Sync 1000 customers < 60 seconds
- [ ] API endpoint authentication
- [ ] Error handling (network failures, invalid data)

---

## Rollout Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 1 | Build LoyaltySyncService | 2-3 hours |
| 2 | Create API endpoint | 30 min |
| 3 | Test with sample data | 1 hour |
| 4 | Initial full sync | 30 min |
| 5 | Update customer UI | 1 hour |
| 6 | Deploy & monitor | Ongoing |

**Total estimated effort:** 5-6 hours

---

## Future Enhancements

1. **Webhook from Alleaves** on new order → auto-sync customer
2. **Points redemption** directly in BakedBot
3. **Custom rewards** configured per brand
4. **SMS notifications** when tier changes
5. **Loyalty leaderboard** for gamification
6. **Export loyalty data** for marketing campaigns

---

## Questions to Address

1. **Primary source of truth?**
   - Option A: Alpine IQ is truth, orders are backup
   - Option B: Orders are truth, Alpine is reference
   - **Recommendation:** Alpine IQ is truth, but show both

2. **What to do with discrepancies?**
   - Alert admin via Discord/email?
   - Auto-adjust to Alpine IQ?
   - Manual review?
   - **Recommendation:** Alert if > 10% difference

3. **Sync frequency?**
   - Real-time (webhook)?
   - Hourly? Daily?
   - **Recommendation:** Daily + manual trigger

4. **Handle customers without Alpine IQ account?**
   - Create Alpine account automatically?
   - Just use calculated points?
   - **Recommendation:** Use calculated, prompt to create Alpine account

---

## Success Metrics

- 90%+ customers have loyalty data synced
- <5% discrepancy rate between calculated and Alpine IQ
- Sync completes in <60 seconds for 1000 customers
- Zero data loss during migration
- Agents can access loyalty data in <2 seconds

---

## Next Steps

1. ✅ Review and approve this plan
2. ⬜ Implement LoyaltySyncService
3. ⬜ Create API endpoint
4. ⬜ Test with sample customers
5. ⬜ Run initial full sync
6. ⬜ Update UI components
7. ⬜ Deploy and monitor

---

**Ready to proceed?** Let me know if you'd like to adjust any part of this plan, or we can start building the LoyaltySyncService!
