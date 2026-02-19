/**
 * Dynamic Pricing System Types
 *
 * Intelligent pricing engine that adjusts product prices based on:
 * - Competitor intelligence (Ezal)
 * - Inventory age (Alleaves)
 * - Customer segments
 * - Traffic patterns
 * - Demand signals
 */

export type PricingAdjustmentType = 'percentage' | 'fixed_amount' | 'set_price';
export type DemandLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type PricingStrategy = 'competitive' | 'premium' | 'value' | 'clearance' | 'dynamic';
export type CustomerTier = 'new' | 'regular' | 'vip' | 'whale';

// ============ Core Pricing Rule ============

export interface DynamicPricingRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher = applied first (1-100)
  active: boolean;
  strategy: PricingStrategy;

  // Conditions (AND logic - all must match)
  conditions: {
    // Inventory conditions
    inventoryAge?: { min?: number; max?: number }; // days
    stockLevel?: { below?: number; above?: number }; // units
    stockLevelPercent?: { below?: number; above?: number }; // % of capacity

    // Competitor conditions
    competitorPrice?: {
      below?: number; // Our price is below competitor avg
      above?: number; // Our price is above competitor avg
    };

    // Time-based conditions
    daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
    timeRange?: { start: string; end: string }; // "09:00"-"17:00"
    dateRange?: { start: Date; end: Date };

    // Traffic conditions
    trafficLevel?: DemandLevel[];

    // Customer conditions
    customerTier?: CustomerTier[];

    // Product conditions
    productIds?: string[]; // Specific products
    categories?: string[]; // Product categories
  };

  // Price Adjustment
  priceAdjustment: {
    type: PricingAdjustmentType;
    value: number; // percentage (0.15 = 15%) or fixed amount ($5.00)
    minPrice?: number; // Floor - never go below
    maxPrice?: number; // Ceiling - never go above
  };

  // Metadata
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Analytics
  timesApplied?: number;
  revenueImpact?: number;
  avgConversionRate?: number;

  // Alleaves POS sync
  alleavesDiscountId?: number;
  lastSyncedToAlleaves?: Date;
  alleavesDiscountActive?: boolean;
}

// ============ Dynamic Price Result ============

export interface DynamicPrice {
  productId: string;
  originalPrice: number;
  dynamicPrice: number;
  discount: number; // Dollar amount
  discountPercent: number;

  // Applied rules
  appliedRules: {
    ruleId: string;
    ruleName: string;
    adjustment: number;
  }[];

  // Customer-facing explanation
  displayReason: string; // "Flash Sale" | "Loyalty Discount" | "Moving Inventory"
  badge?: {
    text: string;
    color: string;
  };

  // Validity
  validUntil: Date;

  // Intelligence context
  context: {
    inventoryAge?: number;
    stockLevel?: number;
    competitorAvgPrice?: number;
    demandLevel?: DemandLevel;
    customerTier?: CustomerTier;
  };
}

// ============ Competitor Intelligence ============

export interface CompetitorPriceData {
  competitorId: string;
  competitorName: string;
  productName: string;
  price: number;
  inStock: boolean;
  lastChecked: Date;
  url?: string;

  // Analytics
  priceHistory?: {
    date: Date;
    price: number;
  }[];
  sellThroughRate?: number;
}

// ============ Inventory Intelligence ============

export interface InventoryAgeData {
  productId: string;
  procurementDate: Date;
  daysInInventory: number;
  expiryDate?: Date;
  stockLevel: number;
  reorderPoint: number;
  turnoverRate: number; // Units sold per day
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
}

// ============ Traffic Pattern ============

export interface TrafficPattern {
  timestamp: Date;
  hourOfDay: number;
  dayOfWeek: number;
  orderCount: number;
  avgOrderValue: number;
  demandLevel: DemandLevel;
  surgeMultiplier: number; // 1.0 = normal, 1.5 = 50% surge
}

// ============ Customer Segment ============

export interface CustomerSegment {
  customerId: string;
  tier: CustomerTier;

  behavior: {
    avgOrderValue: number;
    orderFrequency: number; // orders per month
    lifetimeValue: number;
    lastOrderDate: Date;
  };

  preferences: {
    priceElasticity: number; // 0-1, higher = more price sensitive
    preferredCategories: string[];
    avgDiscountUsed: number;
  };
}

// ============ Pricing Suggestion (AI-Generated) ============

export interface PricingSuggestion {
  productId: string;
  suggestedPrice: number;
  confidence: number; // 0-1
  reasoning: string;

  factors: {
    competitorPricing?: {
      avgPrice: number;
      lowestPrice: number;
      highestPrice: number;
      suggestion: string;
    };
    inventoryAge?: {
      daysOld: number;
      urgency: 'low' | 'medium' | 'high';
      suggestion: string;
    };
    demand?: {
      level: DemandLevel;
      trend: 'increasing' | 'stable' | 'decreasing';
      suggestion: string;
    };
  };

  // Recommended rule
  recommendedRule?: Partial<DynamicPricingRule>;
}

// ============ Pricing Analytics ============

export interface PricingAnalytics {
  orgId: string;
  dateRange: { start: Date; end: Date };

  overview: {
    totalProducts: number;
    productsWithDynamicPricing: number;
    avgDiscountPercent: number;
    totalRevenue: number;
    revenueImpact: number; // vs baseline
    marginImpact: number; // vs baseline
  };

  rulePerformance: {
    ruleId: string;
    ruleName: string;
    timesApplied: number;
    avgDiscount: number;
    conversionRate: number;
    revenue: number;
  }[];

  productPerformance: {
    productId: string;
    productName: string;
    basePrice: number;
    avgDynamicPrice: number;
    unitsSold: number;
    revenue: number;
    marginPercent: number;
  }[];
}

// ============ Pricing Strategy Template ============

export interface PricingStrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'clearance' | 'competitive' | 'premium' | 'time_based' | 'loyalty';

  // Pre-configured rules
  rules: Partial<DynamicPricingRule>[];

  // Configuration options
  configurable: {
    discountPercent?: { min: number; max: number; default: number };
    timeWindows?: boolean;
    customerTiers?: boolean;
  };
}
