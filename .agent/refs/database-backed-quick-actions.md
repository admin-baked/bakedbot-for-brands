# Database-Backed Quick Actions

## Overview

The inbox quick actions system has been enhanced to support dynamic loading from the database (Firestore) while maintaining backward compatibility with hardcoded actions.

## Feature Flag

**Environment Variable**: `NEXT_PUBLIC_USE_DB_QUICK_ACTIONS`

- `true`: Load quick actions from Firestore `ground_truth_v2` collection
- `false` or unset: Use hardcoded `INBOX_QUICK_ACTIONS` from `src/types/inbox.ts`

**Set in**: `.env.local` or Firebase App Hosting environment variables

```bash
# Enable database-backed quick actions
NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=true

# Disable (use hardcoded fallback)
NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=false
```

## Architecture

### Data Flow

```
User opens inbox
    ↓
unified-inbox.tsx sets currentRole via useInboxStore
    ↓
inbox-sidebar.tsx / inbox-empty-state.tsx useEffect detects role change
    ↓
loadQuickActions() called
    ↓
getQuickActionsForRoleAsync(role, tenantId) checks feature flag
    ↓
If enabled: Load from Firestore ground_truth_v2/{roleId}
If disabled: Use hardcoded INBOX_QUICK_ACTIONS
    ↓
Quick actions stored in Zustand state
    ↓
Components render quick actions from state
```

### Modified Files

#### 1. **src/types/inbox.ts**
- Added `getQuickActionsForRoleAsync(role, tenantId)` - Async function that:
  - Checks `NEXT_PUBLIC_USE_DB_QUICK_ACTIONS` flag
  - Loads from database via `getPresetPrompts()` server action
  - Converts `PresetPromptTemplate` to `InboxQuickAction`
  - Falls back to hardcoded on error
- Deprecated `getQuickActionsForRole(role)` - Kept for backward compatibility

#### 2. **src/lib/store/inbox-store.ts**
- Added `quickActions: InboxQuickAction[]` to state
- Added `loadQuickActions()` async action that:
  - Gets current role and orgId from state
  - Calls `getQuickActionsForRoleAsync()`
  - Updates `quickActions` state
- Updated `getQuickActions()` getter to return from state (was calling function directly)

#### 3. **src/components/inbox/inbox-sidebar.tsx**
- Added `useEffect` to call `loadQuickActions()` when `currentRole` changes
- Quick actions reload automatically when user switches roles

#### 4. **src/components/inbox/inbox-empty-state.tsx**
- Added `useEffect` to call `loadQuickActions()` when `currentRole` changes
- Ensures quick actions are loaded even when sidebar isn't visible

## Database Schema

Quick actions are stored as **Preset Prompts** in the Role Ground Truth system:

```
ground_truth_v2/
  {roleId}/                    # 'brand', 'dispensary', 'super_user', 'customer'
    preset_prompts: [
      {
        id: 'create-carousel',
        label: 'Create Carousel',
        description: 'Generate a product carousel',
        threadType: 'carousel',
        defaultAgent: 'craig',
        promptTemplate: 'Create a carousel for {{product_name}}',
        variables: ['product_name'],
        category: 'marketing',
        roles: ['brand', 'dispensary'],
        icon: 'Images',
        version: '2.0'
      }
    ]
```

### Tenant Overrides

Tenants can customize quick actions:

```
tenants/{tenantId}/ground_truth_overrides/{roleId}
  preset_prompts: [...]         # Custom tenant-specific quick actions
  disabled_presets: ['id1']     # IDs of global presets to hide
```

## Migration

### Step 1: Seed Database

Run the migration script to convert hardcoded actions to database format:

```bash
# Dry run (preview changes)
npx ts-node src/scripts/migrate-quick-actions-to-db.ts --dry-run

# Migrate all roles
npx ts-node src/scripts/migrate-quick-actions-to-db.ts

# Migrate specific role only
npx ts-node src/scripts/migrate-quick-actions-to-db.ts --role brand
```

This migrates all 50+ quick actions from `INBOX_QUICK_ACTIONS` to Firestore.

### Step 2: Enable Feature Flag

Once database is seeded, enable the feature flag:

```bash
# In .env.local
NEXT_PUBLIC_USE_DB_QUICK_ACTIONS=true
```

### Step 3: Verify

1. Open inbox as different roles (brand, dispensary, super_user)
2. Verify quick actions load correctly
3. Check browser console for any errors

### Step 4: Rollout

- **Pilot**: Enable for test tenants first
- **Gradual**: Monitor for issues before full rollout
- **Rollback**: Set flag to `false` to revert to hardcoded

## Benefits

### 1. **Dynamic Updates**
Quick actions can be updated via the Ground Truth dashboard without code changes.

### 2. **Role-Based Customization**
Different quick actions for Brand, Dispensary, Super User, Customer roles.

### 3. **Tenant Customization**
Each tenant can disable global actions or add custom ones.

### 4. **Variable Support**
Templates support Mustache-style variables: `{{product_name}}`, `{{target_date}}`

### 5. **Analytics Ready**
Database storage enables tracking which quick actions are most used.

### 6. **A/B Testing**
Easy to test different quick action sets per tenant.

## Fallback Behavior

The system is designed to **never break** the inbox:

1. **Flag disabled**: Use hardcoded `INBOX_QUICK_ACTIONS`
2. **Database error**: Catch exception, fall back to hardcoded
3. **Empty result**: Return hardcoded actions
4. **No role set**: Return empty array (graceful)

## Managing Quick Actions

### Via CEO Dashboard

1. Navigate to **Dashboard → CEO → Ground Truth**
2. Select role (Brand / Dispensary / Super User / Customer)
3. Go to **Preset Prompts** tab
4. Add/Edit/Delete quick actions
5. Changes take effect immediately (cache: 5 min TTL)

### Via Server Actions

```typescript
import { upsertPresetPrompt, deletePresetPrompt } from '@/server/actions/role-ground-truth';

// Add new quick action
await upsertPresetPrompt('brand', {
  id: 'my-custom-action',
  label: 'Custom Action',
  description: 'Does something custom',
  threadType: 'campaign',
  defaultAgent: 'craig',
  promptTemplate: 'Do {{task}} for {{brand_name}}',
  variables: ['task', 'brand_name'],
  category: 'marketing',
  roles: ['brand'],
  icon: 'Sparkles',
  version: '2.0'
});

// Remove quick action
await deletePresetPrompt('brand', 'my-custom-action');
```

## Testing

### Unit Tests
Located in `tests/server/grounding/role-ground-truth.test.ts` (27 tests)

### Integration Tests
Located in `tests/server/grounding/role-loader.test.ts` (12 tests)

### Manual Testing

```typescript
// Test loading quick actions
const { loadQuickActions, getQuickActions } = useInboxStore.getState();
await loadQuickActions();
console.log('Quick actions:', getQuickActions());
```

## Performance

### Caching

- **In-memory cache**: 5-minute TTL on role ground truth
- **Zustand state**: Quick actions cached in state until role changes
- **Firestore queries**: Indexed by roleId for fast retrieval

### Load Times

- **Database-backed**: ~100-300ms (first load, then cached)
- **Hardcoded**: <1ms (synchronous)

## Security

### Firestore Rules

```javascript
// Only allow reading quick actions for user's role
match /ground_truth_v2/{roleId} {
  allow read: if canAccessRoleGroundTruth(roleId);
  allow write: if isRole('owner');  // Super admin only
}
```

### Tenant Isolation

- Tenant overrides are scoped to `tenants/{tenantId}`
- Users can only modify their own tenant's overrides
- Global defaults require super admin permissions

## Troubleshooting

### Quick actions not loading

1. Check feature flag: `console.log(process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS)`
2. Check role is set: `useInboxStore.getState().currentRole`
3. Check browser console for errors
4. Verify database has preset prompts: Firebase Console → Firestore → `ground_truth_v2/{roleId}`

### Wrong quick actions showing

1. Verify role mapping in `getQuickActionsForRoleAsync()`
2. Check tenant overrides aren't hiding actions
3. Clear cache: Restart app or wait 5 minutes

### Migration failed

1. Run with `--dry-run` to preview changes
2. Check Firebase Admin credentials
3. Verify Firestore security rules allow writes
4. Check script logs for specific errors

## Future Enhancements

- [ ] Quick action usage analytics (track which actions are clicked)
- [ ] A/B testing framework for quick action variants
- [ ] Quick action recommendations based on user behavior
- [ ] Drag-and-drop reordering in dashboard
- [ ] Quick action categories/groups in sidebar
- [ ] Search/filter quick actions
- [ ] Quick action templates marketplace

## Related Documentation

- [Role-Based Ground Truth System](./role-ground-truth-integration.md)
- [Ground Truth v2.0 Architecture](./ground-truth-v2.md)
- [Migration Script Guide](../scripts/migrate-quick-actions-to-db.ts)
- [Preset Prompts Manager UI](../../src/components/ground-truth/preset-prompts-manager.tsx)
