# Bundle System Refactor - Heroes/Carousels Parity

**Status:** 📝 Draft
**Created:** 2026-02-20
**Owner:** Claude (User Requested)
**Priority:** P1 (Pattern Consistency)

---

## 1. Overview & Motivation

### Problem
The Bundle tool currently has inconsistent patterns compared to Heroes and Carousels:
- `BundleGeneratorInline` (inbox) uses old two-state design (AI vs Manual)
- Uses `/api/ai/bundle-suggest` endpoint instead of server actions
- Uses `useDispensaryId()` hook instead of `orgId` prop
- `BundleRuleBuilder` missing auto-generate and example prompts sections
- Redundant AI Suggestions Dialog in dashboard

### Solution
Refactor Bundle system to match the proven Heroes/Carousels pattern while preserving unique margin protection features.

### Success Criteria
- [ ] BundleGeneratorInline matches Hero/Carousel inline pattern exactly
- [ ] BundleRuleBuilder has all 5 sections (Auto-Generate, Presets, Natural Language, Suggestions, Examples)
- [ ] All components use server actions (no API endpoints)
- [ ] All components accept `orgId` prop (no `useDispensaryId` hook)
- [ ] Margin protection feature preserved and enhanced
- [ ] Build passes (`npm run check:types`)
- [ ] No regression in existing bundle functionality

### Impact
- **Users:** Consistent UX across all AI-powered content tools
- **Developers:** Familiar patterns = faster fixes, easier onboarding
- **Codebase:** Reduced complexity, better maintainability

---

## 2. Technical Design

### Architecture Pattern (Reference: Heroes/Carousels)

```
Dashboard Component Structure:
├── Page (bundles/page.tsx)
│   ├── Two-tab layout (AI Builder + Your Bundles)
│   └── BundleRuleBuilder component
│
└── BundleRuleBuilder (dashboard/bundles/bundle-rule-builder.tsx)
    ├── Auto-Generate All Section
    ├── Margin Protection Banner (unique to bundles)
    ├── Smart Presets
    ├── Natural Language Input
    ├── Suggestions Display
    └── Example Prompts Helper

Inbox Component:
└── BundleGeneratorInline (inbox/bundle-generator-inline.tsx)
    ├── Auto-Generate Button
    ├── Smart Presets (collapsed by default)
    ├── Natural Language Input
    ├── Suggestions Display
    ├── Example Prompts
    └── Manual Builder (collapsed)
```

### Server Actions (Already Exist ✅)
All in `src/app/actions/bundle-suggestions.ts`:
- `generateAIBundleSuggestions(orgId)` - 5 strategies
- `parseNaturalLanguageRule(orgId, naturalLanguageRule, minMargin)` - NL processing
- `getSmartPresets(orgId)` - inventory-based presets
- `createBundleFromSuggestion(orgId, suggestion)` - create from suggestion
- `getInventoryInsights(orgId)` - margin/inventory analysis

### Component Props Standardization

```typescript
// BundleRuleBuilder (dashboard)
interface BundleRuleBuilderProps {
    orgId: string;                      // ✅ Already correct
    onBundleCreated?: () => void;       // ✅ Already correct
}

// BundleGeneratorInline (inbox) - NEEDS CHANGE
interface BundleGeneratorInlineProps {
    orgId: string;                      // ❌ Currently uses useDispensaryId()
    onComplete?: (bundleData: BundleDeal) => void;
    initialPrompt?: string;
    className?: string;
}
```

### State Management Pattern (Match Heroes/Carousels)

```typescript
// UI State
const [isGeneratingAll, setIsGeneratingAll] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [loadingPresets, setLoadingPresets] = useState(true);

// Data State
const [suggestions, setSuggestions] = useState<SuggestedBundle[]>([]);
const [presets, setPresets] = useState<Preset[]>([]);
const [rulePrompt, setRulePrompt] = useState(initialPrompt);

// Creation State
const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);

// Bundle-specific State
const [minMargin, setMinMargin] = useState(15);
```

---

## 3. Implementation Plan

### Phase 1: Enhance BundleRuleBuilder (Small Changes)

**File:** `src/components/dashboard/bundles/bundle-rule-builder.tsx`

**Changes:**
1. **Add Auto-Generate All Section** (top of component)
   ```tsx
   <Card className="border-primary/20 bg-primary/5">
       <CardContent className="flex items-center justify-between py-4">
           <div>
               <h3 className="font-semibold">Auto-Generate Bundle Suggestions</h3>
               <p className="text-sm text-muted-foreground">
                   Let AI analyze your inventory and margins to suggest optimal bundles
               </p>
           </div>
           <Button onClick={handleGenerateAllSuggestions} disabled={isGeneratingAll}>
               {isGeneratingAll ? (
                   <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
               ) : (
                   <><Sparkles className="h-4 w-4 mr-2" />Generate All Suggestions</>
               )}
           </Button>
       </CardContent>
   </Card>
   ```

2. **Add Example Prompts Helper** (bottom of component)
   ```tsx
   <Card className="border-dashed">
       <CardHeader className="pb-2">
           <CardTitle className="text-sm text-muted-foreground">Example Rules</CardTitle>
       </CardHeader>
       <CardContent>
           <ul className="text-xs text-muted-foreground space-y-1">
               <li>"Bundle products expiring in 30-45 days with 20% off"</li>
               <li>"Create a BOGO deal for all edibles"</li>
               <li>"Bundle high-stock items (50+ units) with 25% discount"</li>
               <li>"Mix & match 3 flower products with 15% off"</li>
               <li>"Create starter pack with one item from each category at 20% off"</li>
           </ul>
       </CardContent>
   </Card>
   ```

3. **Add handleGenerateAllSuggestions handler**
   ```typescript
   const handleGenerateAllSuggestions = async () => {
       if (!orgId) return;
       setIsGeneratingAll(true);
       setSuggestions([]);

       try {
           const result = await generateAIBundleSuggestions(orgId);

           if (result.success && result.suggestions && result.suggestions.length > 0) {
               setSuggestions(result.suggestions);
               toast({
                   title: "Suggestions Ready",
                   description: `Generated ${result.suggestions.length} bundle suggestions based on inventory analysis.`,
               });
           } else {
               toast({
                   title: "No Suggestions",
                   description: result.error || "Could not generate suggestions. Add more products first.",
                   variant: "destructive",
               });
           }
       } catch {
           toast({
               title: "Error",
               description: "Failed to generate suggestions. Please try again.",
               variant: "destructive",
           });
       } finally {
           setIsGeneratingAll(false);
       }
   };
   ```

**Estimated Lines Changed:** ~80 lines added

---

### Phase 2: Refactor BundleGeneratorInline (Major Changes)

**File:** `src/components/inbox/bundle-generator-inline.tsx`

**Current Issues:**
- Uses `/api/ai/bundle-suggest` endpoint (line 71-78)
- Uses `useDispensaryId()` hook (line 54)
- Two-state UI (AI prompt vs manual builder)
- Missing smart presets, auto-generate, examples

**Refactor Strategy:**
1. Replace `useDispensaryId()` with `orgId` prop
2. Remove API endpoint call, use `parseNaturalLanguageRule()` server action
3. Add all 5 sections matching BundleRuleBuilder pattern
4. Keep motion animations and inline card styling (inbox-specific)
5. Preserve margin protection feature

**New Structure:**
```tsx
export function BundleGeneratorInline({ orgId, onComplete, initialPrompt, className }: BundleGeneratorInlineProps) {
    const { toast } = useToast();

    // State (matching pattern)
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingPresets, setLoadingPresets] = useState(true);
    const [suggestions, setSuggestions] = useState<SuggestedBundle[]>([]);
    const [presets, setPresets] = useState<Preset[]>([]);
    const [rulePrompt, setRulePrompt] = useState(initialPrompt);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);
    const [minMargin, setMinMargin] = useState(15);
    const [showManualBuilder, setShowManualBuilder] = useState(false);

    // Load presets on mount
    useEffect(() => {
        async function loadPresets() {
            if (!orgId) return;
            setLoadingPresets(true);
            const result = await getSmartPresets(orgId);
            if (result.success && result.presets) {
                setPresets(result.presets);
            }
            setLoadingPresets(false);
        }
        loadPresets();
    }, [orgId]);

    // Handlers (matching pattern)
    const handleGenerateAllSuggestions = async () => { /* ... */ };
    const handleGenerateFromPrompt = async () => { /* ... */ };
    const handlePresetClick = (prompt: string) => { /* ... */ };
    const handleAcceptSuggestion = async (suggestion: SuggestedBundle) => { /* ... */ };

    return (
        <motion.div /* ... */>
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader>{/* ... */}</CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* 1. Auto-Generate Section */}
                    {/* 2. Margin Protection Banner */}
                    {/* 3. Smart Presets */}
                    {/* 4. Natural Language Input */}
                    {/* 5. Suggestions Display */}
                    {/* 6. Example Prompts Helper */}
                    {/* 7. Manual Builder (collapsed) */}
                </CardContent>
            </Card>
        </motion.div>
    );
}
```

**Estimated Lines Changed:** ~300 lines (major refactor)

---

### Phase 3: Clean Up Dashboard

**File:** `src/app/dashboard/bundles/page.tsx`

**Changes:**
1. Remove AI Suggestions Dialog (lines 42-45, 86-127, 245-298)
2. Remove redundant "Quick AI Suggestions" button from bundles tab
3. All AI features now accessible from BundleRuleBuilder

**Estimated Lines Removed:** ~120 lines

---

### Phase 4: Update Inbox Integration

**Files:** `src/components/inbox/inbox-conversation.tsx`

**Changes:**
Update BundleGeneratorInline usage to pass `orgId` prop:
```tsx
<BundleGeneratorInline
    orgId={thread.orgId}
    onComplete={handleCompleteBundle}
    initialPrompt={bundleInitialPrompt}
/>
```

**Estimated Lines Changed:** ~4 lines (2 usages)

---

## 4. Files Changed

### Modified Files (6)
1. **`src/components/dashboard/bundles/bundle-rule-builder.tsx`**
   - Add auto-generate section (+40 lines)
   - Add example prompts helper (+20 lines)
   - Add handleGenerateAllSuggestions (+35 lines)
   - **Total:** +95 lines

2. **`src/components/inbox/bundle-generator-inline.tsx`**
   - Complete refactor to match pattern
   - Replace API endpoint with server actions
   - Replace useDispensaryId with orgId prop
   - Add all 5 sections
   - **Total:** ~300 lines changed (similar line count, major restructure)

3. **`src/app/dashboard/bundles/page.tsx`**
   - Remove AI Suggestions Dialog
   - Remove redundant button
   - **Total:** -120 lines

4. **`src/components/inbox/inbox-conversation.tsx`**
   - Update BundleGeneratorInline usage (add orgId prop)
   - **Total:** +4 lines (2 usages)

5. **`src/app/api/ai/bundle-suggest/route.ts`**
   - **Delete this file** (no longer needed, using server actions)

### No Changes Needed ✅
- `src/app/actions/bundle-suggestions.ts` (already has all server actions)
- `src/app/actions/bundles.ts` (unchanged)
- `src/types/bundles.ts` (unchanged)

---

## 5. Boundary Checks

| Boundary | Triggered? | Notes |
|----------|-----------|-------|
| **Authentication** | ❌ No | Uses existing requireUser patterns |
| **Payments/Billing** | ❌ No | No pricing changes |
| **Database Schema** | ❌ No | No Firestore schema changes |
| **External APIs** | ❌ No | Uses existing Genkit AI calls |
| **Cost Impact** | ❌ No | Same AI usage patterns |
| **User-Facing Prompts** | ✅ YES | New example prompts, UI text changes |
| **Compliance** | ❌ No | Bundle deals unchanged, UI refactor only |

**Risk Assessment:** 🟢 Low Risk
- No schema changes, no new APIs
- Server actions already exist and tested
- UI refactor only, preserving functionality
- Pattern proven in Heroes/Carousels

---

## 6. Testing Strategy

### Manual Testing Checklist

**BundleRuleBuilder (Dashboard):**
- [ ] Auto-generate all button creates 3-5 suggestions
- [ ] Smart presets load and populate prompt on click
- [ ] Natural language input generates valid bundles
- [ ] Margin protection validates minimum margin
- [ ] Suggestions display with correct badges
- [ ] "Add as Draft" creates bundle in Firestore
- [ ] Example prompts visible and helpful

**BundleGeneratorInline (Inbox):**
- [ ] Component renders with orgId prop
- [ ] Auto-generate button works
- [ ] Smart presets load from inventory
- [ ] Natural language input generates bundles
- [ ] Margin protection slider works
- [ ] Suggestions display correctly
- [ ] "Add to Menu" creates bundle and calls onComplete
- [ ] Manual builder toggle works

**Integration:**
- [ ] Dashboard bundles tab shows created bundles
- [ ] Inbox bundle generation creates artifacts correctly
- [ ] No console errors in browser
- [ ] Mobile responsive layout works

### Build Validation
```bash
npm run check:types  # Must pass
npm test             # No regressions
```

---

## 7. Rollout Plan

### Deployment Strategy
**Single-phase deployment** (low risk, UI-only changes)

### Rollback Plan
```bash
git revert <commit-hash>  # Single commit revert
git push origin main       # Immediate rollback
```

### Monitoring
- [ ] Check Sentry for errors in bundle creation
- [ ] Monitor Firestore writes to bundle_deals collection
- [ ] Check Genkit AI usage metrics (should be same as before)

---

## 8. Open Questions

None - pattern is proven, server actions exist, low risk refactor.

---

## 9. Acceptance Criteria

### Functional Requirements
- [ ] BundleRuleBuilder has auto-generate section
- [ ] BundleRuleBuilder has example prompts
- [ ] BundleGeneratorInline matches Heroes/Carousels pattern
- [ ] All components use server actions (no API endpoints)
- [ ] All components accept orgId prop
- [ ] Margin protection preserved
- [ ] Build passes with zero errors

### Non-Functional Requirements
- [ ] Code follows existing patterns (Heroes/Carousels)
- [ ] No performance regression
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation, ARIA labels)

### Definition of Done
- [ ] All code changes committed
- [ ] Build passes (`npm run check:types`)
- [ ] Manual testing completed
- [ ] Documentation updated (CLAUDE.md, prime.md, MEMORY.md)
- [ ] Deployed to production
- [ ] No errors in Sentry for 24 hours

---

## 10. Notes & Decisions

### Why This Approach?
1. **Pattern proven:** Heroes/Carousels pattern works well, tested in production
2. **Server actions exist:** No backend work needed, just UI refactor
3. **Low risk:** UI-only changes, no schema/API changes
4. **User benefit:** Consistent UX across all AI content tools
5. **Developer benefit:** Familiar patterns = faster maintenance

### Unique Bundle Features to Preserve
- **Margin Protection:** Slider + banner (unique to bundles)
- **Inventory Insights:** Show stock levels, expiration dates
- **Multi-strategy AI:** 5 different bundle strategies
- **Margin Impact Badge:** Show estimated margin after discount

### Reference Implementations
- Heroes: `src/components/inbox/hero-generator-inline.tsx`
- Carousels: `src/components/dashboard/carousels/carousel-rule-builder.tsx`
- Pattern proven across 2 implementations, now standardizing on 3rd

---

**Estimated Total Effort:** 3-4 hours
- Phase 1 (BundleRuleBuilder): 30 min
- Phase 2 (BundleGeneratorInline): 2 hours
- Phase 3 (Dashboard cleanup): 15 min
- Phase 4 (Inbox integration): 15 min
- Testing: 1 hour

**Ready for Approval:** ✅ Yes
