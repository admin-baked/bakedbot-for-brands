# Dynamic Pricing System - Implementation Guide

## ✅ Completed Components

1. **Type Definitions** (`src/types/dynamic-pricing.ts`)
   - Complete type system for pricing rules, strategies, and analytics
   - Competitor intelligence types
   - Inventory age types
   - Traffic pattern types
   - Customer segment types

2. **Inline Generator** (`src/components/inbox/dynamic-pricing-generator-inline.tsx`)
   - AI-powered pricing strategy generator
   - 5 pricing strategies (Competitive, Clearance, Premium, Value, Dynamic)
   - Advanced conditions (inventory age, competitor pricing, time-based, customer tiers)
   - Slider-based discount configuration
   - Real-time AI suggestions

## 🔨 Remaining Implementation

### 3. AI Pricing Suggestion API

**File**: `src/app/api/ai/pricing-suggest/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  const { prompt, strategy, orgId } = await request.json();

  // Fetch product data, competitor data, inventory age
  // Generate AI suggestion using Genkit
  // Return structured pricing recommendation
}
```

**AI Prompt Strategy:**
- Analyze product catalog
- Consider competitor pricing (from Ezal)
- Factor in inventory age (from Alleaves)
- Recommend discount percentages
- Suggest conditions (time windows, customer tiers)

### 4. Pricing Rules Server Actions

**File**: `src/app/actions/dynamic-pricing.ts`

```typescript
'use server';

// CRUD operations for pricing rules
export async function createPricingRule(rule: Partial<DynamicPricingRule>)
export async function getPricingRules(orgId: string)
export async function updatePricingRule(id: string, updates: Partial<DynamicPricingRule>)
export async function deletePricingRule(id: string)
export async function togglePricingRule(id: string, active: boolean)

// Calculate dynamic price for a product
export async function calculateDynamicPrice(params: {
  productId: string;
  customerId?: string;
  timestamp?: Date;
}): Promise<DynamicPrice>

// Analytics
export async function getPricingAnalytics(orgId: string, dateRange: { start: Date; end: Date })
```

### 5. Pricing Engine Core Logic

**File**: `src/server/services/pricing/engine.ts`

```typescript
export class DynamicPricingEngine {
  async calculatePrice(params): Promise<DynamicPrice> {
    // 1. Get base price
    // 2. Gather intelligence (competitor, inventory, traffic)
    // 3. Apply rules in priority order
    // 4. Apply constraints (min/max)
    // 5. Return with transparency
  }

  private async gatherIntelligence() {
    // Competitor data from Ezal
    // Inventory age from Alleaves
    // Traffic patterns from analytics
    // Customer segment from profile
  }

  private evaluateRuleConditions() {
    // Check if rule conditions match current context
  }

  private applyAdjustment() {
    // Apply price adjustment (percentage, fixed, set)
  }
}
```

### 6. Ezal Integration for Competitor Intelligence

**File**: `src/server/services/ezal/competitor-pricing.ts`

```typescript
export async function getCompetitorPricing(productName: string): Promise<CompetitorPriceData[]> {
  // Call Ezal agent to scrape competitor menus
  // Return price comparisons
}

export async function monitorCompetitorPrices(orgId: string) {
  // Background job to track competitor price changes
  // Store historical data
  // Trigger alerts on significant changes
}
```

### 7. Alleaves Integration for Inventory Age

**File**: `src/server/services/alleaves/inventory-intelligence.ts`

```typescript
export async function getInventoryAge(productId: string): Promise<InventoryAgeData> {
  // Call Alleaves API for procurement date
  // Calculate days in inventory
  // Return velocity metrics
}

export async function getSlowMovingInventory(orgId: string): Promise<Product[]> {
  // Identify products with low turnover
  // Suggest clearance pricing
}
```

### 8. Inbox Conversation Integration

**File**: `src/components/inbox/inbox-conversation.tsx`

**Add to imports:**
```typescript
import { DynamicPricingGeneratorInline } from './dynamic-pricing-generator-inline';
```

**Add state:**
```typescript
const [showPricingGenerator, setShowPricingGenerator] = useState(false);
const [pricingInitialPrompt, setPricingInitialPrompt] = useState('');
const hasAutoShownPricing = useRef<boolean>(false);
```

**Add useEffect for auto-show:**
```typescript
useEffect(() => {
  if (thread.type === 'inventory_promo') {
    if (!showPricingGenerator) {
      setShowPricingGenerator(true);
    }
    hasAutoShownPricing.current = true;
  } else {
    if (showPricingGenerator) {
      setShowPricingGenerator(false);
    }
    hasAutoShownPricing.current = false;
  }
}, [thread.id, thread.type, showPricingGenerator]);
```

**Add keyword detection:**
```typescript
const pricingKeywords = ['dynamic pricing', 'price optimization', 'pricing strategy', 'competitor pricing', 'clearance pricing', 'optimize prices'];
const isPricingRequest = pricingKeywords.some(keyword => lowerInput.includes(keyword));

if (isPricingRequest) {
  const userMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    type: 'user',
    content: input.trim(),
    timestamp: new Date(),
  };
  addMessageToThread(thread.id, userMessage);
  setPricingInitialPrompt(input.trim());
  setShowPricingGenerator(true);
  setInput('');
  return;
}
```

**Add completion handler:**
```typescript
const handleCompletePricing = async (rule: DynamicPricingRule) => {
  setShowPricingGenerator(false);

  const confirmationMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    type: 'agent',
    content: `✅ **Dynamic Pricing Rule Activated!**\n\n"${rule.name}" is now optimizing prices based on:\n• ${rule.strategy.charAt(0).toUpperCase() + rule.strategy.slice(1)} strategy\n• ${rule.priceAdjustment.value * 100}% discount adjustment\n${rule.conditions.inventoryAge ? '• Inventory age monitoring\n' : ''}${rule.conditions.competitorPrice ? '• Competitor price tracking\n' : ''}\n\nMonitor performance in your [Pricing Dashboard](/dashboard/pricing).`,
    timestamp: new Date(),
  };
  addMessageToThread(thread.id, confirmationMessage);
  setPricingInitialPrompt('');
};
```

**Add to UI rendering (both empty and with messages):**
```typescript
{showPricingGenerator && (
  <div className="mt-4">
    <DynamicPricingGeneratorInline
      onComplete={handleCompletePricing}
      initialPrompt={pricingInitialPrompt}
    />
  </div>
)}
```

### 9. Dashboard Component (Preview)

**File**: `src/components/dashboard/pricing/pricing-dashboard.tsx`

**Features:**
- Active pricing rules list
- Rule performance metrics
- Product price changes timeline
- Revenue impact chart
- Competitor price comparison
- Inventory velocity indicators
- Quick actions (pause/resume/edit rules)

### 10. Product Display Integration

**File**: `src/components/menu/product-card.tsx` (modifications)

**Add:**
```typescript
interface DynamicPriceDisplay {
  originalPrice: number;
  dynamicPrice: number;
  badge?: { text: string; color: string };
  expiresAt?: Date;
}

// Display strikethrough original price
// Show dynamic price prominently
// Display savings badge
// Show countdown timer if time-limited
```

## 🎯 Phased Rollout Plan

### Phase 1: Foundation (Week 1)
- ✅ Type definitions
- ✅ Inline generator UI
- ✅ Basic AI suggestions
- ✅ Manual rule creation
- ✅ Inbox integration

### Phase 2: Intelligence (Week 2)
- Ezal competitor monitoring
- Alleaves inventory age integration
- Traffic pattern analysis
- Rule evaluation engine
- Price calculation API

### Phase 3: Advanced Features (Week 3)
- Customer segment pricing
- Time-based dynamic pricing
- ML-powered elasticity modeling
- A/B testing framework
- Performance analytics

### Phase 4: Automation (Week 4)
- Auto-rule suggestions
- Predictive pricing
- Competitive response automation
- Inventory velocity predictions
- Multi-location optimization

## 🔐 Ethical & Legal Considerations

### Compliance Checklist
- [ ] No discriminatory pricing (protected classes)
- [ ] Transparent pricing rules
- [ ] Customer notification of dynamic pricing
- [ ] Price floor enforcement (never below cost)
- [ ] Cannabis-specific compliance review
- [ ] State-by-state pricing law review
- [ ] Data privacy for customer segmentation
- [ ] Clear opt-out mechanisms

### Transparency Guidelines
1. **Always show original price** - Strike through if discounted
2. **Explain discounts** - "Flash Sale" not "Your personalized price"
3. **Segment-based not individual** - VIP tier, not "John's price"
4. **Consistent within segments** - All VIPs see same price at same time
5. **No surge pricing on essentials** - Medical products stay stable

## 🚀 Next Steps

To complete implementation:

1. Create `/api/ai/pricing-suggest/route.ts`
2. Create `/app/actions/dynamic-pricing.ts`
3. Implement pricing engine in `/server/services/pricing/engine.ts`
4. Build Ezal integration for competitor data
5. Build Alleaves integration for inventory age
6. Integrate into `inbox-conversation.tsx`
7. Create pricing dashboard
8. Add product card dynamic price display
9. Comprehensive testing
10. Legal/compliance review

Would you like me to proceed with implementing the remaining components?
