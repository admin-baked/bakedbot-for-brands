/**
 * Dynamic Pricing Rule Templates
 *
 * Pre-configured templates for common pricing strategies.
 * Users can select a template and customize it for their needs.
 */

import type { DynamicPricingRule } from '@/types/dynamic-pricing';

export interface PricingRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'clearance' | 'competitive' | 'promotional' | 'advanced';
  icon: string;
  recommendedFor: string[];
  estimatedImpact: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  config: Omit<DynamicPricingRule, 'id' | 'orgId' | 'createdAt' | 'updatedAt' | 'timesApplied' | 'revenueImpact' | 'avgConversionRate' | 'createdBy'>;
}

export const PRICING_TEMPLATES: PricingRuleTemplate[] = [
  // ============= CLEARANCE TEMPLATES =============
  {
    id: 'clearance-aggressive',
    name: 'Aggressive Clearance',
    description: 'Move aging inventory (45+ days) with steep discounts to prevent expiration losses.',
    category: 'clearance',
    icon: '🔥',
    recommendedFor: ['Dispensaries with expiring inventory', 'High turnover needed', 'Perishable products'],
    estimatedImpact: '+$5-10K monthly revenue from saved inventory',
    difficulty: 'beginner',
    config: {
      name: 'Aggressive Clearance - 45+ Days',
      description: 'Move aging inventory (45+ days) with steep discounts to prevent expiration losses.',
      strategy: 'clearance',
      priority: 90,
      active: true,
      conditions: {
        inventoryAge: { min: 45 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.30,
        minPrice: 5.00,
      },
    },
  },

  {
    id: 'clearance-moderate',
    name: 'Moderate Clearance',
    description: 'Gentle discount on products 30-44 days old to accelerate turnover.',
    category: 'clearance',
    icon: '💨',
    recommendedFor: ['Preventing inventory aging', 'Improving turnover rate', 'Proactive clearance'],
    estimatedImpact: '+40% faster inventory movement',
    difficulty: 'beginner',
    config: {
      name: 'Quick Sale - 30-44 Days',
      description: 'Gentle discount on products 30-44 days old to accelerate turnover.',
      strategy: 'clearance',
      priority: 80,
      active: true,
      conditions: {
        inventoryAge: { min: 30, max: 44 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.20,
        minPrice: 5.00,
      },
    },
  },

  {
    id: 'clearance-low-stock',
    name: 'Low Stock Liquidation',
    description: 'Clear final units with aggressive discounts when stock hits minimum levels.',
    category: 'clearance',
    icon: '⚡',
    recommendedFor: ['Discontinuing products', 'Final clearance sales', 'Seasonal changeover'],
    estimatedImpact: 'Clear inventory 3x faster',
    difficulty: 'intermediate',
    config: {
      name: 'Final Units Clearance',
      description: 'Clear final units with aggressive discounts when stock hits minimum levels.',
      strategy: 'clearance',
      priority: 85,
      active: false, // Template only
      conditions: {
        inventoryAge: { min: 20 },
        stockLevel: { below: 5 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.35,
        minPrice: 3.00,
      },
    },
  },

  // ============= COMPETITIVE TEMPLATES =============
  {
    id: 'competitive-match',
    name: 'Competitor Price Match',
    description: 'Automatically match prices when 15%+ above market average (requires Ezal).',
    category: 'competitive',
    icon: '🎯',
    recommendedFor: ['Competitive markets', 'Price-sensitive customers', 'Market share growth'],
    estimatedImpact: '+12-18% conversion on overpriced products',
    difficulty: 'intermediate',
    config: {
      name: 'Match Market - 15% Above',
      description: 'Automatically match prices when 15%+ above market average (requires Ezal).',
      strategy: 'competitive',
      priority: 70,
      active: false, // Requires Ezal competitor data
      conditions: {
        competitorPrice: { above: 15 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.12,
        minPrice: 8.00,
      },
    },
  },

  {
    id: 'competitive-beat',
    name: 'Beat Competitor Prices',
    description: 'Undercut market by small margin to win price-conscious customers (requires Ezal).',
    category: 'competitive',
    icon: '💪',
    recommendedFor: ['Market penetration', 'Stealing market share', 'Aggressive growth'],
    estimatedImpact: '+25% traffic on targeted products',
    difficulty: 'advanced',
    config: {
      name: 'Beat Market - 5% Below',
      description: 'Undercut market by small margin to win price-conscious customers (requires Ezal).',
      strategy: 'competitive',
      priority: 75,
      active: false, // Requires Ezal + careful margin management
      conditions: {
        competitorPrice: { above: 10 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.15, // Beats market by ~3-5%
        minPrice: 10.00,
      },
    },
  },

  // ============= PROMOTIONAL TEMPLATES =============
  {
    id: 'promo-happy-hour',
    name: 'Happy Hour',
    description: 'Drive afternoon traffic with weekday discounts during slow hours (2-5pm).',
    category: 'promotional',
    icon: '🕐',
    recommendedFor: ['Slow afternoon periods', 'Weekday traffic boost', 'Regular customer incentive'],
    estimatedImpact: '+30% transactions during happy hour',
    difficulty: 'beginner',
    config: {
      name: 'Happy Hour - Weekdays 2-5pm',
      description: 'Drive afternoon traffic with weekday discounts during slow hours (2-5pm).',
      strategy: 'dynamic',
      priority: 60,
      active: true,
      conditions: {
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        timeRange: { start: '14:00', end: '17:00' },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.10,
        minPrice: 5.00,
      },
    },
  },

  {
    id: 'promo-weekend-special',
    name: 'Weekend Special',
    description: 'Boost weekend sales with Friday-Sunday category discounts.',
    category: 'promotional',
    icon: '🎉',
    recommendedFor: ['Weekend traffic maximization', 'Category-specific promotions', 'High-volume products'],
    estimatedImpact: '+20% weekend sales',
    difficulty: 'beginner',
    config: {
      name: 'Weekend Deal',
      description: 'Boost weekend sales with Friday-Sunday category discounts.',
      strategy: 'dynamic',
      priority: 65,
      active: true,
      conditions: {
        categories: ['Flower'], // Customize to your top category
        daysOfWeek: [5, 6, 0], // Fri, Sat, Sun
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.15,
        minPrice: 10.00,
      },
    },
  },

  {
    id: 'promo-early-bird',
    name: 'Early Bird Special',
    description: 'Reward early customers with morning discounts to smooth daily demand curve.',
    category: 'promotional',
    icon: '🌅',
    recommendedFor: ['Morning traffic', 'Demand spreading', 'Reducing afternoon queues'],
    estimatedImpact: '+15% morning transactions',
    difficulty: 'beginner',
    config: {
      name: 'Early Bird - Open to Noon',
      description: 'Reward early customers with morning discounts to smooth daily demand curve.',
      strategy: 'dynamic',
      priority: 55,
      active: false, // Template - adjust to your hours
      conditions: {
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        timeRange: { start: '10:00', end: '12:00' }, // Adjust to your opening time
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.08,
        minPrice: 5.00,
      },
    },
  },

  {
    id: 'promo-closeout',
    name: 'Closing Hour Flash Sale',
    description: 'Final hour discounts to drive last-minute purchases before closing.',
    category: 'promotional',
    icon: '🌙',
    recommendedFor: ['Maximizing daily revenue', 'Impulse purchases', 'High foot traffic areas'],
    estimatedImpact: '+10% daily revenue',
    difficulty: 'beginner',
    config: {
      name: 'Closing Hour Flash - Last 60min',
      description: 'Final hour discounts to drive last-minute purchases before closing.',
      strategy: 'dynamic',
      priority: 58,
      active: false, // Template - adjust to your hours
      conditions: {
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        timeRange: { start: '19:00', end: '20:00' }, // Adjust to your closing time
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.12,
        minPrice: 5.00,
      },
    },
  },

  // ============= ADVANCED TEMPLATES =============
  {
    id: 'advanced-dynamic-margin',
    name: 'Dynamic Margin Optimizer',
    description: 'Complex rule balancing inventory age, stock level, and competitor pricing for optimal margins.',
    category: 'advanced',
    icon: '🧠',
    recommendedFor: ['Experienced users', 'Data-driven optimization', 'Maximum profitability'],
    estimatedImpact: '+25% profit margin optimization',
    difficulty: 'advanced',
    config: {
      name: 'Dynamic Margin Optimization',
      description: 'Complex rule balancing inventory age, stock level, and competitor pricing for optimal margins.',
      strategy: 'dynamic',
      priority: 78,
      active: false, // Requires careful tuning
      conditions: {
        inventoryAge: { min: 25, max: 40 },
        competitorPrice: { above: 10 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.15,
        minPrice: 10.00,
      },
    },
  },

  {
    id: 'advanced-category-rotation',
    name: 'Category Rotation Promo',
    description: 'Weekly rotating category promotions to drive discovery and balance inventory across categories.',
    category: 'advanced',
    icon: '🔄',
    recommendedFor: ['Diverse product lines', 'Category balance', 'Customer education'],
    estimatedImpact: '+30% category discovery',
    difficulty: 'advanced',
    config: {
      name: 'Rotating Category - Week 1',
      description: 'Weekly rotating category promotions to drive discovery and balance inventory across categories.',
      strategy: 'dynamic',
      priority: 60,
      active: false, // Requires manual rotation
      conditions: {
        categories: ['Edibles'], // Change weekly: Edibles → Vapes → Flower → Concentrates
        dateRange: {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.18,
        minPrice: 8.00,
      },
    },
  },

  {
    id: 'advanced-bundle-pricing',
    name: 'Multi-Buy Discount',
    description: 'Volume-based pricing for bulk purchases (requires custom implementation).',
    category: 'advanced',
    icon: '📦',
    recommendedFor: ['Bulk buyers', 'Customer retention', 'Average order value increase'],
    estimatedImpact: '+35% average order value',
    difficulty: 'advanced',
    config: {
      name: 'Buy More Save More',
      description: 'Volume-based pricing for bulk purchases (requires custom implementation).',
      strategy: 'dynamic',
      priority: 50,
      active: false, // Template only - requires custom quantity logic
      conditions: {
        // Note: Bulk purchase conditions would need custom implementation
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.15,
        minPrice: 5.00,
      },
    },
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: PricingRuleTemplate['category']): PricingRuleTemplate[] {
  return PRICING_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: PricingRuleTemplate['difficulty']): PricingRuleTemplate[] {
  return PRICING_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PricingRuleTemplate | undefined {
  return PRICING_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get recommended templates for a specific use case
 */
export function getRecommendedTemplates(useCase: string): PricingRuleTemplate[] {
  const normalized = useCase.toLowerCase();
  return PRICING_TEMPLATES.filter((t) =>
    t.recommendedFor.some((rec) => rec.toLowerCase().includes(normalized))
  );
}

/**
 * Categories with metadata
 */
export const TEMPLATE_CATEGORIES = [
  {
    id: 'clearance',
    name: 'Clearance & Inventory',
    description: 'Move aging stock and prevent expiration losses',
    icon: '🔥',
    color: 'orange',
  },
  {
    id: 'competitive',
    name: 'Competitive Pricing',
    description: 'Match or beat competitor prices automatically',
    icon: '🎯',
    color: 'blue',
  },
  {
    id: 'promotional',
    name: 'Promotions & Time-Based',
    description: 'Happy hours, weekend specials, and scheduled deals',
    icon: '🎉',
    color: 'green',
  },
  {
    id: 'advanced',
    name: 'Advanced Strategies',
    description: 'Complex rules for experienced users',
    icon: '🧠',
    color: 'purple',
  },
] as const;
