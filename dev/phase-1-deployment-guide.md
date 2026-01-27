# Phase 1 Deployment Guide: Unified Artifacts System
**Date:** January 27, 2026
**Commit:** `26c10f72`
**Status:** ✅ Infrastructure Complete, Ready for UI Integration

---

## 🎉 What We've Built

### ✅ Completed (Commit 26c10f72)

1. **Unified Artifact Schema** ([types/unified-artifact.ts](../src/types/unified-artifact.ts))
   - 37 artifact types (carousel, bundle, creative_content, campaign, etc.)
   - Role-based access (brand, dispensary, super_user)
   - HitL approval workflow (draft → pending_review → approved → published)
   - Agent attribution for all 15 agent personas
   - Legacy migration support with backwards compat fields

2. **Server Actions API** ([server/actions/unified-artifacts.ts](../src/server/actions/unified-artifacts.ts))
   - `createArtifact()` - Create new artifacts with role/agent context
   - `listArtifacts()` - Query with filters (role, type, status, brandId, etc.)
   - `getArtifact()` - Retrieve single artifact by ID
   - `updateArtifact()` - Edit draft/rejected artifacts
   - `approveArtifact()` / `rejectArtifact()` - HitL approval actions
   - `publishArtifact()` - Publish approved artifacts
   - `submitForReview()` - Move draft → pending_review
   - `deleteArtifact()` - Safe deletion with thread cleanup

3. **Inbox Integration Bridge** ([server/actions/inbox-unified-bridge.ts](../src/server/actions/inbox-unified-bridge.ts))
   - `createInboxArtifactUnified()` - Inbox → Unified adapter
   - `getInboxArtifactsUnified()` - Fetch artifacts for thread
   - `approveInboxArtifactUnified()` - Approve via unified system
   - `rejectInboxArtifactUnified()` - Reject with reason
   - `publishInboxArtifactUnified()` - Publish to live/scheduled
   - Maintains inbox API compatibility during transition

4. **Migration Script** ([scripts/migrate-to-unified-artifacts.ts](../scripts/migrate-to-unified-artifacts.ts))
   - Migrates `carousels`, `bundles`, `creative_content` → `artifacts`
   - Dry-run mode for safe testing
   - Idempotent (safe to run multiple times)
   - Preserves legacy IDs and marks source documents

5. **Audit Documentation** ([dev/inbox-audit-2026-01.md](./inbox-audit-2026-01.md))
   - Gap analysis vs. technical spec
   - Architecture recommendations
   - Quick wins (can ship today)
   - Phase 2-5 roadmap

---

## 📋 Deployment Checklist

### Pre-Deployment (Required)

- [ ] **Run Type Check**
  ```bash
  npm run check:types
  ```

- [ ] **Run Migration Script (Dry Run)**
  ```bash
  npm run migrate:artifacts
  ```
  Review the output to verify:
  - Number of artifacts to migrate
  - No errors in data transformation
  - All required fields present

- [ ] **Test in Staging** (if available)
  ```bash
  npm run migrate:artifacts:execute
  ```
  Verify:
  - Artifacts appear in new `artifacts` collection
  - Legacy collections have `_migrated` flags
  - No data loss or corruption

### Deployment Steps

1. **Deploy to Production**
   ```bash
   git pull origin main
   npm run build
   git push origin main  # Triggers Firebase App Hosting deployment
   ```

2. **Run Migration (Production)**
   ```bash
   # SSH into your server or use Firebase CLI
   npm run migrate:artifacts:execute
   ```

3. **Verify Migration**
   - Check Firestore console for `artifacts` collection
   - Verify artifact count matches legacy collections
   - Spot-check 5-10 artifacts for data integrity

4. **Monitor for 24 Hours**
   - Watch Firebase logs for errors
   - Check user reports of missing artifacts
   - Monitor performance (query times)

### Post-Deployment (Optional, Phase 1 Completion)

- [ ] Add "Create in Inbox" CTAs to Creative Center
- [ ] Convert Creative Center to read-only gallery view
- [ ] Deprecate old artifact creation flows
- [ ] Update user onboarding to use inbox

---

## 🚀 How to Use the New System

### Creating an Artifact (Brand Role Example)

```typescript
import { createArtifact } from '@/server/actions/unified-artifacts';

const result = await createArtifact({
  type: 'carousel',
  role: 'brand',
  orgId: 'org_123',
  userId: 'user_456',
  brandId: 'brand_789',
  title: 'Summer Sale Carousel',
  description: 'Featured products for summer promotion',
  data: {
    title: 'Summer Sale Carousel',
    products: [
      { productId: 'p1', productName: 'Product A', order: 0 },
      { productId: 'p2', productName: 'Product B', order: 1 },
    ],
    displayOrder: 1,
    autoRotate: true,
    rotationInterval: 5000,
    style: 'hero',
  },
  createdBy: 'smokey',
  rationale: 'Created seasonal carousel based on top-selling products',
  tags: ['summer', 'sale', 'featured'],
});

if (result.success) {
  console.log('Artifact created:', result.artifactId);
}
```

### Listing Artifacts with Filters

```typescript
import { listArtifacts } from '@/server/actions/unified-artifacts';

// Get all brand carousels pending review
const result = await listArtifacts({
  role: 'brand',
  type: 'carousel',
  status: 'pending_review',
  orgId: 'org_123',
  orderBy: 'createdAt',
  orderDirection: 'desc',
});

if (result.success) {
  console.log(`Found ${result.artifacts.length} carousels pending review`);
}
```

### Approval Workflow

```typescript
import { submitForReview, approveArtifact, publishArtifact } from '@/server/actions/unified-artifacts';

// 1. Agent creates artifact (status: draft)
const createResult = await createArtifact({ ... });

// 2. Submit for review (draft → pending_review)
await submitForReview(createResult.artifactId);

// 3. User approves (pending_review → approved)
await approveArtifact(createResult.artifactId, 'user_456');

// 4. User publishes (approved → published)
await publishArtifact(createResult.artifactId, 'user_456', 'live');
```

### Inbox Integration (Automatic)

When creating artifacts in the inbox, use the bridge:

```typescript
import { createInboxArtifactUnified } from '@/server/actions/inbox-unified-bridge';

// Inbox automatically routes to unified system
const result = await createInboxArtifactUnified({
  threadId: 'thread_123',
  type: 'carousel',
  data: { /* carousel data */ },
  rationale: 'Agent-generated carousel from conversation',
});

// Artifact is created in unified collection
// Thread's artifactIds array is updated
// Old inbox_artifacts collection is NOT used
```

---

## 🔍 Querying Examples

### Get All Artifacts for a Brand

```typescript
const artifacts = await listArtifacts({
  role: 'brand',
  brandId: 'brand_789',
  orgId: 'org_123',
});
```

### Get Published Artifacts Only

```typescript
const published = await listArtifacts({
  status: 'published',
  orgId: 'org_123',
});
```

### Get Artifacts Awaiting Approval

```typescript
const pending = await listArtifacts({
  status: ['pending_review', 'draft'],
  orgId: 'org_123',
});
```

### Get Artifacts Created by Specific Agent

```typescript
// Note: createdBy is stored, but not indexed for queries yet
// Fetch all and filter client-side, or add index in Firestore
const artifacts = await listArtifacts({ orgId: 'org_123' });
const smokeysArtifacts = artifacts.artifacts?.filter(a => a.createdBy === 'smokey');
```

---

## ⚠️ Important Notes

### During Migration Period

- **Both systems work:** Legacy collections AND unified artifacts
- **No data loss:** Migration preserves all data
- **Backwards compat:** Legacy IDs stored in `legacyId` field
- **Rollback possible:** Legacy collections remain untouched

### Firestore Indexes Required

The unified artifacts system needs these composite indexes:

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "artifacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "artifacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "artifacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "threadId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Firestore will auto-create these when you first query with those filters.

### Performance Considerations

- **Query limits:** Default 100 artifacts per query (configurable)
- **Pagination:** Not yet implemented (Phase 2 feature)
- **Search:** Uses `searchTerms` array for basic search (Phase 2: full-text)
- **Caching:** No client-side cache yet (Phase 2 feature)

---

## 🐛 Troubleshooting

### Migration Failed

**Issue:** Migration script reports errors.

**Fix:**
1. Check Firestore connection (credentials, network)
2. Verify legacy collections exist and have data
3. Check for missing required fields (orgId, userId)
4. Re-run in dry-run mode to see detailed errors

### Artifacts Not Showing in Inbox

**Issue:** Created artifacts don't appear in inbox UI.

**Fix:**
1. Verify `threadId` is set correctly
2. Check thread's `artifactIds` array was updated
3. Ensure inbox is using `getInboxArtifactsUnified()` not old function
4. Check Firestore rules allow read access

### Approval Actions Failing

**Issue:** Cannot approve/reject artifacts.

**Fix:**
1. Verify artifact status is `pending_review` (can't approve `draft` or `published`)
2. Check user has permission (userId matches artifact.userId or orgId)
3. Ensure Firestore rules allow write access
4. Check for missing `updatedAt` timestamp

---

## 📊 Metrics to Monitor

### Success Indicators
- [ ] Migration completes with 0 errors
- [ ] Artifact count matches legacy collections
- [ ] Inbox creates artifacts in unified collection
- [ ] Approval workflow completes end-to-end
- [ ] No increase in error rates

### Warning Signs
- [ ] Query times > 500ms (add indexes)
- [ ] Missing artifacts after migration (re-run migration)
- [ ] Duplicate artifacts (check idempotency)
- [ ] Firestore quota exceeded (optimize queries)

---

## 🚧 Known Limitations (Phase 1)

- **No pagination:** Large artifact lists may be slow
- **No full-text search:** Uses basic searchTerms array
- **No client-side cache:** Every query hits Firestore
- **No bulk operations:** Must approve/reject individually
- **No version history:** Only stores latest version
- **No audit log:** Approval actions not logged separately

**These will be addressed in Phase 2-5.**

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Run migration script on production
2. ⏳ Add "Create in Inbox" CTAs to Creative Center
3. ⏳ Convert Creative Center to gallery view
4. ⏳ Test end-to-end workflows

### Phase 2 (Next Sprint)
- Deprecate legacy artifact creation pages
- Add global approval queue (`/dashboard/approvals`)
- Implement pagination and search
- Add client-side caching (React Query)

### Phase 3 (Following Sprint)
- Add dispensary role artifacts
- Implement agent handoffs
- Integrate remote sidecar for research
- Build multi-role oversight dashboard

---

## 📞 Support

**Questions?** Check the audit document: [dev/inbox-audit-2026-01.md](./inbox-audit-2026-01.md)

**Issues?** Open a GitHub issue with:
- Migration output logs
- Firestore error messages
- Steps to reproduce

**Success?** Share metrics:
- Migration time
- Artifact count before/after
- Query performance improvements

---

**Let's ship this! 🚀**
