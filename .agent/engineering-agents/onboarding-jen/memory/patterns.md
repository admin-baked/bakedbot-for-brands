# Onboarding Jen — Patterns & Gotchas

---

## The Big Ones

### 1. `in` operator, not truthiness, for dialog state

Brand guide step dialogs pre-fill from `initialData` extracted via scan. The useEffect must use `'fieldName' in initialData` not `if (initialData.fieldName)`:

```typescript
// ❌ WRONG — empty string is falsy, pre-fill silently drops
useEffect(() => {
  if (initialData.tagline) setTagline(initialData.tagline);
}, [open, initialData]);

// ✅ CORRECT — propagates empty strings from extraction
useEffect(() => {
  if ('tagline' in initialData) setTagline(initialData.tagline ?? '');
}, [open, initialData]);
```

This matters because extraction legitimately returns empty strings for unfound fields. Those empty strings should clear existing values, not preserve stale ones.

---

### 2. OrgProfile ≠ brands/ ≠ org_intent_profiles/

Three overlapping collections exist simultaneously:

| Collection | When Used | Status |
|-----------|-----------|--------|
| `brands/{slug}` | Legacy brand guide + slug ownership | Live, being deprecated |
| `org_intent_profiles/{orgId}` | Legacy intent profile | Live, being deprecated |
| `org_profiles/{orgId}` | Unified new system | Active for new saves |

`getOrgProfileWithFallback()` handles reading all three transparently. **Always use this function** for reads — never read legacy collections directly in agent code.

For writes, always use `upsertOrgProfile()` for the new system. The wizard also writes legacy collections for backward compat (until migration is complete).

---

### 3. completenessScore must be recalculated on every update

`brandGuideRepo.update()` now pre-reads the current doc, merges with updates, and calls `calculateCompleteness()` before every write. This was the root cause of the "0% completion" bug.

```typescript
// This is already handled in brandGuideRepo.update() — don't duplicate it
// But if you build any other update path, follow this pattern:
const currentDoc = await brandGuideRepo.get(brandId);
const merged = { ...currentDoc, ...updates };
const score = calculateCompleteness(merged);
await db.collection('brand_guides').doc(brandId).set({ ...merged, completenessScore: score });
```

---

### 4. Slug ownership check must precede availability rejection

The old bug: `checkSlugAvailability()` returned "taken" even when the current user owned the slug. Fix: check ownership before rejecting.

```typescript
// The correct pattern (already in slug-management.ts):
const doc = await db.collection('brands').doc(slug).get();
if (!doc.exists) return { available: true };
const existing = doc.data();
// User owns this slug — idempotent re-reserve is OK
if (existing.originalBrandId === orgId || existing.orgId === orgId) {
  return { available: true, alreadyOwned: true };
}
return { available: false };
```

Never revert this to the simpler "exists = taken" check.

---

### 5. Enricher is idempotent by design — don't fight it

The enricher checks `hasSamples`, `hasVocab`, `hasSubTones` before generating. This prevents overwriting user-edited voice samples. If you add a new enrichment step, always add an idempotency check:

```typescript
const hasNewField = !!(guide.newField && guide.newField.length > 0);
if (!hasNewField) {
  // generate and save
}
```

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Reading `brands/{id}` directly in agent code | Agent gets stale/missing data for new orgs | Use `getOrgProfileWithFallback(orgId)` |
| Calling `upsertOrgProfile()` without org membership check | Unauthorized profile updates | Always gate with `requireUser()` + org membership in server action |
| Forgetting `calculateCompleteness()` in a new update path | Completion score stuck at old value | Pre-read + merge + recalculate on every write |
| Using `STATE_ABBREVS` before it's imported | Undefined → wrong compliance state | Import from `brand-guide-enricher.ts`, check for full name |
| Multi-page crawl: expecting all paths to return content | Promise.allSettled — 404s return undefined | Filter results: `results.filter(r => r.status === 'fulfilled' && r.value?.length > 100)` |
| Extracting `valuePropositions` as singular | `messaging.valuePropositions` is an array (plural) | Access `valuePropositions[0]` with fallback for first prop |

---

## Patterns to Follow

### Adding a new wizard step

```typescript
// 1. Add step to WIZARD_STEPS array in brand-guide-client.tsx
const WIZARD_STEPS = [..., { id: 'new_step', label: 'New Step', section: 'Brand Identity' }];

// 2. Create Step dialog component with initialData prop
interface Step5DialogProps {
  initialData?: Partial<NewStepData>;
  onComplete: (data: NewStepData) => void;
}

// 3. Wire initialData via useEffect with 'in' operator
useEffect(() => {
  if ('fieldName' in (initialData ?? {})) setFieldName(initialData!.fieldName ?? '');
}, [open, initialData]);

// 4. On final submit: merge new step data into OrgProfile before upsert
// 5. Update step indicator labels if adding to a new section
```

### Adding a new field to OrgProfile

```typescript
// 1. src/types/org-profile.ts — add to relevant interface
interface OrgProfileBrand {
  newField?: string;  // always optional for backward compat
}

// 2. src/server/services/org-profile.ts — add to getOrgProfileFromLegacy()
//    if the field has a legacy equivalent

// 3. Add to calculateOrgProfileCompletion() if it contributes to score

// 4. Add to relevant buildXxxContextBlock() if agents should know about it

// 5. scripts/migrate-to-org-profiles.mjs — add to migration mapping
```

### Triggering brand image pre-generation

On first brand guide creation, 4 brand images are generated automatically:

```typescript
// This fires via second setImmediate() in createBrandGuide():
generateBrandImagesForNewAccount(brandId, brandData)
  → generates hero/product_bg/ambient/texture via FLUX.1
  → saves to Drive + tenants/{brandId}/brand_images subcollection
  → available in Creative Studio "Brand Kit" panel
```

Don't call this manually — it's triggered by `createBrandGuide()`. Only call directly if a brand needs images regenerated after colors/logo change.
