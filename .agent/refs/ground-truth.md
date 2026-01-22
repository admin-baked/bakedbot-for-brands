# Ground Truth System - v1.0

> Versioned grounding system for customer-facing agents (Smokey AI Budtender)

---

## Overview

The Ground Truth system provides structured, auditable grounding data for customer-facing agents. It ensures Smokey gives accurate, compliant responses about:

- Store information (location, hours, policies)
- Product recommendations (with safety constraints)
- Compliance requirements (age verification, possession limits)
- Brand-specific messaging

**Version:** 1.0 (2026-01-22)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ground Truth Sources                      │
├─────────────────────┬───────────────────────────────────────┤
│   Firestore (Primary)   │     Code Registry (Fallback)       │
│   ground_truth/{brand}  │     GROUND_TRUTH_REGISTRY          │
└─────────────────────┴───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Dynamic Loader    │
                    │   loadGroundTruth() │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Grounding Builder │
                    │   buildGrounding*() │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Smokey Agent      │
                    │   System Prompt     │
                    └─────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/types/ground-truth.ts` | Types, schemas, strategy definitions |
| `src/server/grounding/index.ts` | Registry and exports |
| `src/server/grounding/dynamic-loader.ts` | Firestore-first loader |
| `src/server/grounding/builder.ts` | System prompt construction |
| `src/server/actions/ground-truth.ts` | CRUD server actions |
| `src/app/dashboard/ceo/components/ground-truth-tab.tsx` | CEO dashboard UI |

---

## Data Model

### GroundTruthQASet

Complete ground truth for a brand:

```typescript
interface GroundTruthQASet {
    metadata: GroundTruthMetadata;
    categories: Record<string, GroundTruthCategory>;
    evaluation_config: EvaluationConfig;
    maintenance_schedule: MaintenanceSchedule;
    recommendation_config?: RecommendationConfig;  // v1.0
}
```

### QA Pairs

Individual question-answer pairs with priority levels:

```typescript
interface GroundTruthQAPair {
    id: string;              // e.g., "SI-001", "CS-003"
    question: string;        // Customer question
    ideal_answer: string;    // Expected response
    context: string;         // Additional context
    intent: string;          // What customer wants to accomplish
    keywords: string[];      // Required keywords for validation
    priority: QAPriority;    // 'critical' | 'high' | 'medium'
}
```

### Priority Levels

| Priority | Accuracy Target | Use For |
|----------|-----------------|---------|
| `critical` | 100% | Compliance, safety, legal |
| `high` | 95% | FAQs, store policies |
| `medium` | 85% | Supplementary info |

---

## Recommendation Strategies (v1.0)

New in v1.0: Configurable strategies for how Smokey recommends products.

### Strategy Types

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `effect_based` | Match by desired effects | "I want to relax" |
| `price_tier` | Filter by budget | "Something under $30" |
| `experience_level` | Adjust for user experience | First-time users |
| `product_type` | Prefer specific categories | "Only flower please" |
| `brand_affinity` | Featured/partner brands | House brand promotion |
| `occasion` | Match to use case | "For sleep", "For a party" |
| `hybrid` | Combine strategies | Complex preferences |

### Effect-Based Strategy

```typescript
{
    type: 'effect_based',
    effects: [
        { name: 'relaxation', weight: 0.8, product_types: ['indica', 'hybrid'] },
        { name: 'energy', weight: 0.7, product_types: ['sativa'] },
        { name: 'focus', weight: 0.6 },
        { name: 'sleep', weight: 0.8, thc_range: { min: 15, max: 25 } },
    ],
    fallback_to_popular: true,
}
```

### Experience Level Strategy

```typescript
{
    type: 'experience_level',
    levels: [
        {
            name: 'beginner',
            thc_max: 15,
            dosage_guidance: 'Start with 2.5-5mg THC',
            prefer_product_types: ['edibles', 'tinctures'],
            avoid_product_types: ['concentrates'],
            warnings: ['Start low and go slow'],
        },
        {
            name: 'intermediate',
            thc_max: 25,
        },
        {
            name: 'experienced',
            // No limits
        },
    ],
    default_level: 'beginner',
    ask_if_unknown: true,
}
```

### Price Tier Strategy

```typescript
{
    type: 'price_tier',
    tiers: [
        { name: 'budget', max_price: 30 },
        { name: 'mid-range', min_price: 30, max_price: 60, default: true },
        { name: 'premium', min_price: 60 },
    ],
    show_deals_first: true,
    value_scoring: true,  // Factor in potency per dollar
}
```

### Beginner Safety

Built-in safety constraints for new users:

```typescript
beginner_safety: {
    enabled: true,
    max_thc_first_time: 10,        // Max 10% THC
    max_edible_mg_first_time: 5,   // Max 5mg per dose
    warning_message: 'Since you\'re new, I\'ll recommend lower-potency options.',
}
```

### Compliance Settings

```typescript
compliance: {
    require_age_confirmation: true,
    medical_disclaimer: 'These products are not intended to diagnose...',
    no_health_claims: true,
}
```

---

## Usage

### Loading Ground Truth

```typescript
import { loadGroundTruth } from '@/server/grounding';

// Firestore-first with code fallback
const groundTruth = await loadGroundTruth('thrivesyracuse');
```

### Checking for Strategies

```typescript
import {
    hasRecommendationStrategies,
    getDefaultStrategy,
    getStrategyByType,
    isBeginnerSafetyEnabled,
} from '@/types/ground-truth';

if (hasRecommendationStrategies(groundTruth)) {
    const effectStrategy = getStrategyByType(groundTruth, 'effect_based');
    // Use strategy for recommendations
}

if (isBeginnerSafetyEnabled(groundTruth)) {
    // Apply beginner safety constraints
}
```

### Creating Default Config

```typescript
import { createDefaultRecommendationConfig } from '@/types/ground-truth';

const config = createDefaultRecommendationConfig();
// Returns a starter template with common strategies
```

---

## Firestore Schema

```
ground_truth/
  {brandId}/
    metadata: { dispensary, address, version, ... }
    evaluation_config: { scoring_weights, target_metrics, ... }
    maintenance_schedule: { weekly, monthly, quarterly }
    recommendation_config: { version, default_strategy, strategies, ... }

    categories/
      {categoryKey}/
        description: string
        sort_order: number

        qa_pairs/
          {qaId}/
            id, question, ideal_answer, context, intent, keywords[], priority
```

---

## CEO Dashboard

Access at `/dashboard/ceo?tab=ground-truth`

Features:
- Brand selector (all brands for super admin)
- QA pair editor with category accordion
- Live Smokey tester (compare response to ideal)
- Import/Export JSON
- Migrate from code to Firestore

---

## Adding a New Pilot Customer

### Option 1: Code Registry (Quick)

```typescript
// src/server/grounding/customers/new-customer.ts
export const newCustomerGroundTruth: GroundTruthQASet = {
    metadata: {
        dispensary: 'New Customer Dispensary',
        brandId: 'newcustomer',
        address: '123 Main St',
        version: '1.0',
        created: '2026-01-22',
        last_updated: '2026-01-22',
        total_qa_pairs: 10,
        author: 'Setup Wizard',
    },
    categories: { ... },
    evaluation_config: { ... },
    maintenance_schedule: { weekly: [], monthly: [], quarterly: [] },
    recommendation_config: createDefaultRecommendationConfig(),
};

// src/server/grounding/index.ts
GROUND_TRUTH_REGISTRY['newcustomer'] = newCustomerGroundTruth;
```

### Option 2: Firestore (Dashboard)

1. Go to `/dashboard/ceo?tab=ground-truth`
2. Click "Create New"
3. Fill in brand details
4. Add categories and QA pairs
5. Configure recommendation strategies

---

## Testing

```bash
# QA audit tests
npm test -- tests/qa-audit/thrive-syracuse.test.ts

# Type/schema tests
npm test -- tests/types/ground-truth.test.ts

# Grounding tests
npm test -- tests/server/grounding/
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Recommendation strategies, beginner safety, compliance settings |
| 0.1 | 2026-01-20 | Initial QA system with Thrive Syracuse pilot |

---

## Best Practices

1. **Critical First**: Always define compliance/safety QAs as `critical` priority
2. **Keyword Coverage**: Include all required keywords for validation
3. **Experience Awareness**: Configure beginner safety for all dispensaries
4. **Test Live**: Use the dashboard tester before going live
5. **Version Strategies**: Update strategy version when making changes for A/B testing

---

## Grounding vs. Agent Memory

| Feature | Ground Truth | Letta Memory |
|---------|--------------|--------------|
| Purpose | Customer Q&A | Executive context |
| Agents | Smokey (customer-facing) | Leo, Jack, Linus (internal) |
| Content | Store info, compliance, products | Brand strategy, decisions |
| Update frequency | Weekly/monthly | Continuous |
| Storage | Firestore + code | Letta server |

Ground Truth is NOT for executive agents. They use BrandDomainMemory + Letta Hive Mind.

---

*Last updated: 2026-01-22*
