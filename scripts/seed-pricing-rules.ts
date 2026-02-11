#!/usr/bin/env tsx
/**
 * Seed Pricing Rules for Thrive Syracuse
 *
 * Creates sample dynamic pricing rules to demonstrate the system:
 * - Clearance pricing for aging inventory
 * - Competitor price matching
 * - Time-based promotions (Happy Hour)
 * - Category-specific deals
 *
 * Usage:
 *   npx tsx scripts/seed-pricing-rules.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'studio-567050101-bc6e8',
});

const db = getFirestore();

interface PricingRuleTemplate {
  name: string;
  description: string;
  strategy: 'clearance' | 'competitive' | 'dynamic' | 'time_based';
  priority: number;
  active: boolean;
  conditions: Record<string, any>;
  priceAdjustment: {
    type: 'percentage' | 'fixed';
    value: number;
    minPrice?: number;
    maxDiscount?: number;
  };
  schedule?: {
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

const THRIVE_ORG_ID = 'org_thrive_syracuse';

const PRICING_RULES: PricingRuleTemplate[] = [
  // Rule 1: Clearance - Aging Inventory
  {
    name: '🔥 Clearance - 45+ Days Old',
    description: 'Aggressive discount on products sitting in inventory for 45+ days to clear old stock and improve turnover.',
    strategy: 'clearance',
    priority: 90,
    active: true,
    conditions: {
      inventoryAge: { min: 45 },
    },
    priceAdjustment: {
      type: 'percentage',
      value: 0.30, // 30% off
      minPrice: 5.00,
    },
  },

  // Rule 2: Clearance - Moderate Aging
  {
    name: '💨 Quick Sale - 30-44 Days Old',
    description: 'Moderate discount on products aging 30-44 days to accelerate turnover before hitting clearance threshold.',
    strategy: 'clearance',
    priority: 80,
    active: true,
    conditions: {
      inventoryAge: { min: 30, max: 44 },
    },
    priceAdjustment: {
      type: 'percentage',
      value: 0.20, // 20% off
      minPrice: 5.00,
    },
  },

  // Rule 3: Competitor Price Match
  {
    name: '🎯 Match Market - 15% Above',
    description: 'Automatically match competitor pricing when our price is 15%+ above market average to stay competitive.',
    strategy: 'competitive',
    priority: 70,
    active: false, // Disabled until Ezal competitor data is populated
    conditions: {
      competitorPrice: { above: 15 },
    },
    priceAdjustment: {
      type: 'percentage',
      value: 0.12, // 12% off to get close to market
      minPrice: 8.00,
    },
  },

  // Rule 4: Happy Hour - Weekday Afternoons
  {
    name: '🕐 Happy Hour - Weekdays 2-5pm',
    description: 'Drive afternoon traffic during slower weekday hours with a time-limited discount.',
    strategy: 'time_based',
    priority: 60,
    active: true,
    conditions: {},
    priceAdjustment: {
      type: 'percentage',
      value: 0.10, // 10% off
      minPrice: 5.00,
    },
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      startTime: '14:00',
      endTime: '17:00',
    },
  },

  // Rule 5: Weekend Flower Special
  {
    name: '🌿 Weekend Flower Deal',
    description: 'Boost weekend flower sales with a category-specific promotion targeting high-volume products.',
    strategy: 'dynamic',
    priority: 65,
    active: true,
    conditions: {
      categories: ['Flower', 'flower'],
    },
    priceAdjustment: {
      type: 'percentage',
      value: 0.15, // 15% off
      minPrice: 10.00,
    },
    schedule: {
      daysOfWeek: [5, 6, 0], // Friday, Saturday, Sunday
    },
  },

  // Rule 6: New Customer Welcome Discount (Template - Disabled)
  {
    name: '👋 New Customer Welcome',
    description: 'Welcome discount for first-time customers (requires customer tracking integration).',
    strategy: 'dynamic',
    priority: 50,
    active: false, // Template only - requires customer tracking
    conditions: {
      // Would need: customerSegment: 'new'
    },
    priceAdjustment: {
      type: 'percentage',
      value: 0.10,
      minPrice: 5.00,
    },
  },

  // Rule 7: High-Traffic Surge Pricing (Template - Disabled)
  {
    name: '⚡ Surge Pricing - Peak Hours',
    description: 'Slight markup during peak traffic hours to optimize margin (requires traffic monitoring).',
    strategy: 'dynamic',
    priority: 40,
    active: false, // Template only - controversial, use with caution
    conditions: {
      trafficLevel: ['very_high'],
    },
    priceAdjustment: {
      type: 'percentage',
      value: -0.05, // Negative = price increase (5% markup)
    },
  },
];

async function seedPricingRules() {
  console.log('🌱 Seeding Dynamic Pricing Rules for Thrive Syracuse...\n');

  const batch = db.batch();
  let count = 0;

  for (const template of PRICING_RULES) {
    const ruleId = uuidv4();
    const ruleRef = db.collection('pricingRules').doc(ruleId);

    const rule = {
      id: ruleId,
      orgId: THRIVE_ORG_ID,
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
      timesApplied: 0,
      revenueImpact: 0,
      avgConversionRate: 0,
    };

    batch.set(ruleRef, rule);
    count++;

    const status = template.active ? '✅ ACTIVE' : '⏸️  DISABLED';
    console.log(`${status} | Priority ${template.priority} | ${template.name}`);
    console.log(`   Strategy: ${template.strategy} | Discount: ${template.priceAdjustment.value * 100}%`);
    console.log(`   ${template.description}\n`);
  }

  await batch.commit();

  console.log(`✨ Successfully created ${count} pricing rules for Thrive Syracuse!\n`);
  console.log('📊 Next Steps:');
  console.log('   1. Review rules in dashboard: /dashboard/pricing');
  console.log('   2. Enable Ezal competitor data for competitive rules');
  console.log('   3. Monitor analytics tab for rule performance');
  console.log('   4. Adjust priorities and discounts based on results\n');
}

// Run the seed script
seedPricingRules()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
