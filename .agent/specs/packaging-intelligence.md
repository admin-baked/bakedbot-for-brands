# Spec: Packaging Intelligence — Phase 2

**Status:** 🔒 LOCKED — Awaiting first vertically integrated customer
**Phase 1:** Stub shipped (`packaging-intelligence.ts` returns null, types defined)
**Phase 2:** This spec. Full Gemini Vision pipeline.
**Trigger:** Sign first cannabis manufacturer/cultivator customer (NOT a retailer)

---

## Intent

Give vertically integrated cannabis brands an AI-powered compliance co-pilot for their product packaging. Upload a label photo → instantly know:

1. **COA data extracted** — THC%, CBD%, terpenes, batch ID, lab, test date
2. **Youth-appeal risk scored** — 0–100 CV scan against NY §128 + state rules
3. **State compliance gaps** — which required warnings/elements are missing per jurisdiction

**Target customer:** Cannabis manufacturers, cultivators, processors — companies that design their own labels.
**NOT for:** Retailers like Thrive who carry other brands (use vendor-brands for those).

---

## Scope

### In Scope
- Packaging photo upload (drag-drop in brand guide settings)
- Gemini Vision COA extraction (THC%, CBD%, terpenes, batch, lab, QR)
- Youth-appeal CV scan (cartoon, mascot, candy colors, animal characters)
- State compliance overlay for NY (initial), expanding to CA, IL, WA
- QR code follow-through — fetch and parse COA PDF/JSON from QR URL
- Firestore persistence at `tenants/{orgId}/products/{productId}/packaging/{id}`
- Slack alert on reject-level youth-appeal or COA mismatch > 5%
- CEO QA tab integration — packaging violations surface as P1 bugs

### Out of Scope
- Video packaging analysis
- Physical barcode/UPC lookup
- Competitor packaging analysis (that's Ezal)
- Automatic label redesign suggestions (future v3)

---

## Boundary Check

| Trigger | Status |
|---------|--------|
| Auth | ✅ requireUser(['brand_admin', 'brand', 'super_user']) |
| New Firestore collection | ✅ needs 2 new indexes |
| External AI (Gemini Vision) | ✅ existing ai.generate() pattern |
| Firebase Storage write | ✅ existing bakedbot-global-assets bucket |
| Compliance (youth-appeal, state rules) | ✅ boundary trigger — full spec required |
| Deebo integration | ✅ reuses getRulePack() + existing rule packs |

**Full spec required:** YES (compliance trigger)

---

## Exact File Paths

### Files to Create
| File | Purpose |
|------|---------|
| `src/types/packaging-intelligence.ts` | ✅ DONE (Phase 1) — types already defined |
| `src/server/services/packaging-intelligence.ts` | ✅ DONE (Phase 1) — stub functions, replace bodies |
| `src/server/services/packaging-intelligence/coa-extractor.ts` | Phase 2: Gemini Vision COA extraction |
| `src/server/services/packaging-intelligence/youth-appeal-scanner.ts` | Phase 2: CV youth-appeal analysis |
| `src/server/services/packaging-intelligence/state-overlay-validator.ts` | Phase 2: State compliance overlay |
| `src/app/api/packaging/analyze/route.ts` | Phase 2: POST endpoint (multipart/form-data) |
| `src/app/dashboard/settings/brand-guide/components/packaging-analyzer.tsx` | Phase 2: UI upload panel |

### Files to Modify
| File | Change |
|------|--------|
| `src/server/services/packaging-intelligence.ts` | Replace stub bodies with real implementation |
| `src/app/dashboard/settings/brand-guide/page.tsx` | Add "Packaging" tab/section |
| `firestore.indexes.json` | Add 2 new composite indexes |
| `src/server/agents/deebo.ts` | Wire `getProductCOAData()` into compliance checks |

---

## Exact Firestore Schema

### Collection: `tenants/{orgId}/products/{productId}/packaging/{analysisId}`

```typescript
{
  id: string,                           // auto-generated
  productId: string,
  orgId: string,
  imageUrl: string,                     // original upload URL
  storageUrl: string,                   // Firebase Storage copy
  status: 'pending' | 'processing' | 'complete' | 'failed',
  coaData: {
    thcPercent: number | null,
    cbdPercent: number | null,
    cannabinoids: { name: string; percent: number }[],
    terpenes: { name: string; percent: number }[],
    lab: string | null,
    testDate: string | null,            // ISO date string
    batchId: string | null,
    passedTesting: boolean | null,
    coaQrUrl: string | null,
    extractionConfidence: number,       // 0–100
  },
  youthAppealScore: {
    score: number,                      // 0–100
    recommendation: 'compliant' | 'review' | 'reject',
    flags: {
      type: YouthAppealFlagType,
      description: string,
      boundingBox: [number, number, number, number] | null,
      severity: 'low' | 'medium' | 'high',
      regulation: string,
    }[],
    prohibitedIn: string[],
  },
  stateCompliance: {
    NY: StateComplianceOverlay,         // always run NY
    CA?: StateComplianceOverlay,        // if jurisdictions includes 'CA'
    IL?: StateComplianceOverlay,
    WA?: StateComplianceOverlay,
  },
  extractedText: string[],
  overallConfidence: number,
  analyzedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### Collection: products/{productId} (patch only)
Add these fields to existing product doc after analysis:
```typescript
{
  lastPackagingAnalysisId: string,
  lastPackagingAnalyzedAt: Timestamp,
  coaData: COAData,                     // denormalized for fast reads
  youthAppealRisk: 'compliant' | 'review' | 'reject',
}
```

---

## Exact API Contract

### `POST /api/packaging/analyze`

**Auth:** `requireUser(['brand_admin', 'brand', 'super_user'])`
**Content-Type:** `multipart/form-data`

**Request body:**
```
image: File (JPEG/PNG/WebP, max 10MB)
productId: string
jurisdictions?: string  (comma-separated, e.g. "NY,CA,IL")
fetchCoaFromQr?: "true" | "false"
```

**Response 200:**
```typescript
{
  success: true,
  analysisId: string,
  status: 'processing',  // async — poll GET endpoint for result
  estimatedSeconds: number,
}
```

**Response 400:** `{ success: false, error: 'Image required' | 'productId required' | 'Unsupported file type' }`
**Response 413:** `{ success: false, error: 'Image exceeds 10MB limit' }`

### `GET /api/packaging/analyze?productId={id}`

Returns latest `PackagingAnalysis` for the product, or `{ analysis: null }` if none.

---

## Exact Function Signatures (Phase 2 implementation)

```typescript
// coa-extractor.ts
export async function extractCOAFromImage(
  imageUrl: string,
  options?: { fetchQrUrl?: boolean }
): Promise<COAData>;

// youth-appeal-scanner.ts
export async function scanYouthAppeal(
  imageUrl: string,
  jurisdictions: string[]
): Promise<YouthAppealScore>;

// state-overlay-validator.ts
export async function validateStateCompliance(
  extractedText: string[],
  jurisdiction: string
): Promise<StateComplianceOverlay>;

// packaging-intelligence.ts (replace stubs)
export async function analyzePackaging(
  request: AnalyzePackagingRequest
): Promise<AnalyzePackagingResponse>;

export async function getLatestPackagingAnalysis(
  productId: string,
  orgId: string
): Promise<PackagingAnalysis | null>;
```

---

## Exact Firestore Indexes (add to firestore.indexes.json)

```json
{
  "collectionGroup": "packaging",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "productId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "packaging",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orgId", "order": "ASCENDING" },
    { "fieldPath": "youthAppealScore.recommendation", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Gemini Vision Prompt Templates

### COA Extraction Prompt
```
You are analyzing a cannabis product label image. Extract all laboratory and Certificate of Analysis (COA) data you can find.

Return JSON with this exact structure:
{
  "thcPercent": number | null,
  "cbdPercent": number | null,
  "cannabinoids": [{ "name": string, "percent": number }],
  "terpenes": [{ "name": string, "percent": number }],
  "lab": string | null,
  "testDate": "YYYY-MM-DD" | null,
  "batchId": string | null,
  "passedTesting": boolean | null,
  "coaQrUrl": string | null,
  "extractionConfidence": number (0-100)
}

Rules:
- thcPercent and cbdPercent should be 0–100 (not 0–1 decimals)
- If you see a QR code, describe the URL it encodes in coaQrUrl
- Set extractionConfidence low (< 50) if the label is unclear, blurry, or partially occluded
- Return null for any field you cannot confidently extract
```

### Youth Appeal Scan Prompt
```
You are a cannabis packaging compliance officer reviewing this product label for youth-appeal violations under NY Cannabis Law §128 and similar state regulations.

Identify any visual elements that could appeal to individuals under 21, including:
- Cartoon characters or mascots
- Bright candy-like colors (neon, pastels resembling candy packaging)
- Animal characters with cute/friendly faces
- References to toys, games, or school
- Childlike fonts or handwriting styles
- Celebrity or athlete imagery that appeals to youth
- Names resembling candy, desserts, or children's food products

Return JSON:
{
  "score": number (0=compliant, 100=extreme risk),
  "recommendation": "compliant" | "review" | "reject",
  "flags": [{
    "type": "cartoon_character" | "mascot_figure" | "bright_candy_colors" | "candy_like_name" | "toy_imagery" | "school_reference" | "sports_team" | "celebrity_appeal" | "childlike_font" | "animal_character",
    "description": string,
    "boundingBox": [x, y, width, height] as 0-1 fractions | null,
    "severity": "low" | "medium" | "high",
    "regulation": string (e.g. "NY Cannabis Law §128")
  }],
  "prohibitedIn": string[] (list of state codes where this would be explicitly banned)
}

Score thresholds:
- 0–25: compliant (no action needed)
- 26–60: review (flag for human review)
- 61–100: reject (remove element before sale)
```

---

## Exact Test Cases

```typescript
// coa-extractor.test.ts
it('extracts THC% from clear label image', async () => {
  const result = await extractCOAFromImage('https://example.com/clear-label.jpg');
  expect(result.thcPercent).toBeGreaterThan(0);
  expect(result.thcPercent).toBeLessThanOrEqual(100);
  expect(result.extractionConfidence).toBeGreaterThan(50);
});

it('returns null for blurry/unreadable label', async () => {
  const result = await extractCOAFromImage('https://example.com/blurry.jpg');
  expect(result.thcPercent).toBeNull();
  expect(result.extractionConfidence).toBeLessThan(50);
});

// youth-appeal-scanner.test.ts
it('flags cartoon character as high severity', async () => {
  const result = await scanYouthAppeal('https://example.com/cartoon-label.jpg', ['NY']);
  expect(result.recommendation).toBe('reject');
  expect(result.flags.some(f => f.type === 'cartoon_character')).toBe(true);
  expect(result.flags.find(f => f.type === 'cartoon_character')?.severity).toBe('high');
});

it('returns compliant for plain professional label', async () => {
  const result = await scanYouthAppeal('https://example.com/plain-label.jpg', ['NY']);
  expect(result.recommendation).toBe('compliant');
  expect(result.score).toBeLessThan(26);
});

// state-overlay-validator.test.ts
it('detects missing NY impairment warning', async () => {
  const text = ['THC 22%', 'Hybrid', 'Batch: ABC123'];  // no impairment warning
  const result = await validateStateCompliance(text, 'NY');
  const impairmentWarning = result.warnings.find(w => w.text.includes('impairment'));
  expect(impairmentWarning?.present).toBe(false);
  expect(result.complianceScore).toBeLessThan(100);
});

it('passes full NY compliance for complete label', async () => {
  const text = [
    'This product may cause impairment and may be habit forming',
    'For use only by adults 21 years of age and older',
    'Keep out of reach of children',
    'THC 22%', 'License: MM-2025-000001'
  ];
  const result = await validateStateCompliance(text, 'NY');
  expect(result.complianceScore).toBeGreaterThan(80);
});
```

---

## Notifications (Phase 2)

| Event | Severity | Channel | Action |
|-------|----------|---------|--------|
| `youthAppealScore.recommendation === 'reject'` | P1 | `#qa-bugs` | Auto-file bug via `reportBug()` + Slack DM to brand admin |
| `coaData mismatch > 5%` (label vs QR) | P1 | `#qa-bugs` | Alert — potential label fraud risk |
| Missing required state warning | P2 | `#qa-bugs` | File bug, prompt brand to update label |
| `overallConfidence < 30` | P3 | Brand dashboard only | "Low confidence scan — upload clearer photo" |

---

## UI Integration (Phase 2)

**Location:** `/dashboard/settings/brand-guide` → new "Packaging" tab

**Panel layout:**
```
┌─── Packaging Intelligence ─────────────────────────────────────────────────┐
│  [Upload Label Photo]  ← drag-drop or click                                │
│                                                                              │
│  ┌─ COA Data ───────────────┐  ┌─ Compliance Score ──────────────────────┐ │
│  │  THC: 22.4%              │  │  NY: 94/100 ✅                          │ │
│  │  CBD: 0.3%               │  │  CA: 78/100 ⚠️ (2 missing warnings)    │ │
│  │  Lab: Kaycha Labs        │  └─────────────────────────────────────────┘ │
│  │  Batch: ABC-2025-001     │                                              │
│  │  Tested: Feb 15, 2025    │  ┌─ Youth Appeal ──────────────────────────┐ │
│  └──────────────────────────┘  │  Score: 12/100 ✅ Compliant             │ │
│                                 │  No flags detected                       │ │
│                                 └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Rollback Plan

1. If Gemini Vision quality is unacceptable (< 60% accuracy on test set):
   - Fall back to stub (return null) — already implemented in Phase 1
   - No user-facing feature was promised; no regression
2. If youth-appeal false positive rate is too high (> 10%):
   - Lower score threshold for 'reject' from 61 → 75
   - Add human-review queue before auto-filing bugs
3. If Firestore subcollection costs are unexpectedly high:
   - Move `packaging` from subcollection to top-level `product_packaging` collection

---

## Success Criteria

| Metric | Target |
|--------|--------|
| COA extraction accuracy on clear labels | ≥ 85% |
| Youth-appeal false positive rate | ≤ 10% |
| Youth-appeal recall (catches actual violations) | ≥ 95% |
| NY state compliance overlay accuracy | ≥ 90% |
| API response time (analysis trigger) | < 5s |
| Full analysis completion time (async) | < 30s |
| Zero false-rejects on professional plain labels | 100% |

---

## Implementation Order (Phase 2)

1. `coa-extractor.ts` — Gemini Vision + structured output
2. `youth-appeal-scanner.ts` — CV analysis + bounding boxes
3. `state-overlay-validator.ts` — reuse Deebo rule packs
4. Update `packaging-intelligence.ts` — wire 3 services together
5. `POST /api/packaging/analyze` + `GET` endpoint
6. Firestore indexes (2 new)
7. `packaging-analyzer.tsx` — UI upload panel
8. Wire into brand guide settings page
9. Notifications — `reportBug()` for reject/mismatch
10. Tests (COA, youth-appeal, state overlay, API)
