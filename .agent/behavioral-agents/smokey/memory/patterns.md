# Smokey — Patterns & Gotchas

> Recurring patterns, behavioral rules, and known pitfalls for Smokey.
> Read before modifying `smokey.ts` or the grounding section.

---

## Grounding Rules (CRITICAL — system prompt)

Smokey's system prompt enforces 5 grounding rules. These are behavioral contracts:

### Rule 1: Only recommend verified products
```
ONLY recommend products you can verify. Use searchMenu to check inventory.
- DO NOT recommend products that aren't in stock.
- If no results, say "I couldn't find that in our current menu."
```
`searchMenu` must be called before any product recommendation. Never assume stock.

### Rule 2: Only delegate to known squad agents
```
ONLY delegate to agents in the AGENT SQUAD list above.
DO NOT invent agents or misrepresent their capabilities.
```
`buildSquadRoster('smokey')` generates the live squad list — it's the source of truth.
Never hardcode agent names in prompts.

### Rule 3: Search first when uncertain
```
When uncertain about product availability, search first.
Don't assume products exist — verify with tools.
```

### Rule 4: Exact compliance answers only
```
For compliance/safety questions, use EXACT answers from CRITICAL COMPLIANCE section.
Age requirements, possession limits, and product testing info must be 100% accurate.
Never paraphrase or guess on legal/regulatory information.
```
The ground truth QA pairs from `loadGroundTruth()` provide exact answers for common
dispensary-specific compliance questions (hours, age limit, payment, possession limit).

### Rule 5: Use search_web silently (KEY BEHAVIORAL RULE)
```
Use search_web silently for general knowledge queries (trends, news, market info).
- Call search_web BEFORE answering industry trend / competitor / current events questions.
- If search returns no results, answer from training knowledge WITHOUT mentioning the search or tool failure.
- NEVER say "my tools aren't working", "web scraping isn't responding", or any variant.
- Just deliver the best answer you have — tools are an internal detail the user doesn't need to know about.
```

**This is the single most important behavioral rule.** Violating it means Smokey
announces internal tool failures to customers — terrible UX and erodes trust.

Jina `s.jina.ai` returns empty for cannabis queries (content policy). The Serper fallback
handles this automatically. The rule ensures Smokey never surfaces either failure.

---

## Upsell Behavior Rules

```
After recommending a product, use suggestUpsells to find ONE complementary item.
Present it with value-focused framing:
- Cannabis science: "These terpenes work together for the entourage effect"
- Lead with savings: "Save 15% when you pair these in our bundle"
- Keep it natural: "Customers who enjoy [X] also love [Y]"
- NEVER push more than ONE upsell suggestion per exchange
- If the customer says "no thanks" or ignores, respect that immediately
- Priority: bundles with savings > terpene pairings > category complements
```

---

## Fetching Margin Product Context

`fetchMarginProductContext()` is a **sequential load** that happens AFTER the parallel
`Promise.all`. It only fires when a margin goal exists AND has a target value:

```typescript
const marginGoal = activeGoals.find(g => g.category === 'margin');
const marginProductContext = marginGoal && marginGoal.metrics[0]
    ? await fetchMarginProductContext(orgId, marginGoal.metrics[0].targetValue).catch(() => '')
    : '';
```

Pattern: always `.catch(() => '')` — returns empty string on failure, not null/undefined.
Injected into system prompt as-is (no wrapping section header of its own — the function
builds its own formatted block).

---

## buildBrandVoiceBrief() vs buildSmokeyContextBlock()

There are two voice brief functions:

| Function | Source | When Used |
|----------|--------|-----------|
| `buildBrandVoiceBrief(brandGuide)` | `src/lib/brand-guide-prompt.ts` | Legacy: reads old `BrandGuide` type from `brands/` collection |
| `buildSmokeyContextBlock(orgProfile)` | `src/server/services/org-profile.ts` | Current: reads unified `OrgProfile` from `org_profiles/` |

Smokey currently uses `buildSmokeyContextBlock()`. `buildBrandVoiceBrief()` is lighter
(voice + vocabulary only) and is still available for contexts where the full block is
too verbose. Do not confuse them.

---

## Vendor Brands: Empty Array vs Missing

```typescript
const vendorBrandsSection = vendorBrands.length > 0
    ? `\n=== BRANDS WE CARRY (${vendorBrands.length}) ===\n...`
    : '';
```

`getVendorBrandSummary(orgId)` always returns an array (never null). An empty array
means no vendor brands have been ingested yet — the section is omitted entirely from
the system prompt (cleaner than showing an empty block).

Source: `src/server/actions/vendor-brands.ts` — reads `tenants/{orgId}/vendor_brands/`.
Ingestion: `ingestVendorBrand()` scrapes vendor sites via brand-guide-extractor.

---

## Test Isolation: Mock ALL initialize() Calls

When writing tests for Smokey, mock every external async call in `initialize()`:

```typescript
jest.mock('@/server/agents/goal-directive-builder', () => ({
    loadActiveGoals: jest.fn().mockResolvedValue([]),
    buildGoalDirectives: jest.fn().mockReturnValue(''),
    fetchMarginProductContext: jest.fn().mockResolvedValue(''),
}));
jest.mock('@/server/actions/vendor-brands', () => ({
    getVendorBrandSummary: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/server/services/org-profile', () => ({
    getOrgProfileWithFallback: jest.fn().mockResolvedValue(null),
    buildSmokeyContextBlock: jest.fn().mockReturnValue(''),
}));
jest.mock('@/server/services/market-benchmarks', () => ({
    getMarketBenchmarks: jest.fn().mockResolvedValue(null),
    buildBenchmarkContextBlock: jest.fn().mockReturnValue(''),
}));
jest.mock('@/server/grounding', () => ({
    loadGroundTruth: jest.fn().mockResolvedValue(null),
    buildGroundingInstructions: jest.fn().mockReturnValue({ full: '' }),
}));
```

Missing a mock = real Firestore call = Jest timeout (15s+).
See: `tests/smokey.test.ts`, session 2026-02-25 (OrgProfile Phases 5-7 + Test Fixes).

---

## Output Format Rules

```
- Use standard markdown headers (###) to separate sections:
    "Recommendations", "Product Details", "Next Steps"
- Cite your source: "Based on our current menu..."
- Tone: Friendly, knowledgeable, chill but professional.
```

The `###` header rule is critical — it enables the rich card UI in the user dashboard.
Without it, responses render as flat text.

---

## Common Mistakes to Avoid

| Mistake | Correct Pattern |
|---------|----------------|
| Calling `buildBrandBrief()` instead of `buildSmokeyContextBlock()` | Use `buildSmokeyContextBlock(orgProfile)` from org-profile service |
| Adding `await` inside Promise.all items that don't need it | Promise.all handles parallelism; inner items should be un-awaited promises |
| Forgetting `.catch(() => null)` on optional loads | Always add `.catch(() => null)` for optional context; never let optional context crash initialize() |
| Recommending products without calling `searchMenu` | Always verify inventory before recommending — this is Grounding Rule 1 |
| Mentioning tool failures to users | Rule 5: tools are internal detail; always deliver best available answer |
| Adding more than ONE upsell per exchange | Hard rule: maximum ONE upsell; respect "no thanks" immediately |

---

## Golden Set: smokey-qa.json

Location: `.agent/golden-sets/smokey-qa.json`

- 27 test cases total
- 10 marked `compliance_critical: true` (with `must_not_contain` assertions)
- Categories: `product_knowledge`, `compliance_awareness`, `recommendation_quality`, `tone_appropriateness`
- Threshold: 90% overall, 100% compliance
- Test type: all `llm` (requires `--full` mode with CLAUDE_API_KEY)

Compliance-critical cases test that Smokey never:
- Makes medical claims ("cure", "treat", "clinically proven")
- Claims to "prescribe" anything
- Guarantees specific effects
- Helps minors obtain cannabis

Run: `node scripts/run-golden-eval.mjs --agent smokey --full`
