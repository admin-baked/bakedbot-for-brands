'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { DynamicPricingRule, DynamicPrice } from '@/types/dynamic-pricing';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

const PRICING_RULES_COLLECTION = 'pricingRules';

// ============ CRUD Operations ============

export async function createPricingRule(
  data: Partial<DynamicPricingRule>
): Promise<{ success: boolean; data?: DynamicPricingRule; error?: string }> {
  try {
    if (!data.name || !data.orgId) {
      throw new Error('Name and Organization ID are required');
    }

    const id = uuidv4();
    const db = getAdminFirestore();
    const now = new Date();

    const newRule: DynamicPricingRule = {
      // Defaults
      strategy: 'dynamic',
      priority: 50,
      active: true,
      conditions: {},
      priceAdjustment: {
        type: 'percentage',
        value: 0.15,
      },
      timesApplied: 0,
      revenueImpact: 0,
      avgConversionRate: 0,

      // Override with provided data
      ...data,

      // System fields
      id,
      description: data.description || '',
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    } as DynamicPricingRule;

    await db.collection(PRICING_RULES_COLLECTION).doc(id).set(newRule);

    revalidatePath('/dashboard/pricing');
    return { success: true, data: newRule };
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    return { success: false, error: 'Failed to create pricing rule' };
  }
}

export async function getPricingRules(
  orgId: string
): Promise<{ success: boolean; data?: DynamicPricingRule[]; error?: string }> {
  try {
    if (!orgId) throw new Error('Organization ID is required');

    const db = getAdminFirestore();
    const snapshot = await db
      .collection(PRICING_RULES_COLLECTION)
      .where('orgId', '==', orgId)
      .orderBy('priority', 'desc')
      .get();

    const toISOString = (val: any): string | undefined => {
      if (!val) return undefined;
      if (val.toDate) return val.toDate().toISOString();
      if (val instanceof Date) return val.toISOString();
      if (typeof val === 'string') return val;
      return undefined;
    };

    const rules = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: toISOString(data.createdAt) || new Date().toISOString(),
        updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
      };
    }) as unknown as DynamicPricingRule[];

    return { success: true, data: rules };
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    return { success: false, error: 'Failed to fetch pricing rules' };
  }
}

export async function updatePricingRule(
  id: string,
  updates: Partial<DynamicPricingRule>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) throw new Error('Rule ID is required');

    const db = getAdminFirestore();
    await db.collection(PRICING_RULES_COLLECTION).doc(id).update({
      ...updates,
      updatedAt: new Date(),
    });

    revalidatePath('/dashboard/pricing');
    return { success: true };
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    return { success: false, error: 'Failed to update pricing rule' };
  }
}

export async function deletePricingRule(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) throw new Error('Rule ID is required');

    const db = getAdminFirestore();
    await db.collection(PRICING_RULES_COLLECTION).doc(id).delete();

    revalidatePath('/dashboard/pricing');
    return { success: true };
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    return { success: false, error: 'Failed to delete pricing rule' };
  }
}

export async function togglePricingRule(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) throw new Error('Rule ID is required');

    const db = getAdminFirestore();
    await db.collection(PRICING_RULES_COLLECTION).doc(id).update({
      active,
      updatedAt: new Date(),
    });

    revalidatePath('/dashboard/pricing');
    return { success: true };
  } catch (error) {
    console.error('Error toggling pricing rule:', error);
    return { success: false, error: 'Failed to toggle pricing rule' };
  }
}

// ============ Price Calculation ============

export async function calculateDynamicPrice(params: {
  productId: string;
  orgId: string;
  customerId?: string;
  timestamp?: Date;
}): Promise<{ success: boolean; data?: DynamicPrice; error?: string }> {
  try {
    const { productId, orgId, customerId, timestamp = new Date() } = params;

    // Get product base price
    const db = getAdminFirestore();
    const productDoc = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .doc(productId)
      .get();

    if (!productDoc.exists) {
      throw new Error('Product not found');
    }

    const product = productDoc.data();
    const basePrice = product?.price || 0;

    // Get active pricing rules
    const rulesResult = await getPricingRules(orgId);
    if (!rulesResult.success || !rulesResult.data) {
      throw new Error('Failed to fetch pricing rules');
    }

    const activeRules = rulesResult.data.filter(r => r.active);

    // Apply rules in priority order
    let adjustedPrice = basePrice;
    const appliedRules: { ruleId: string; ruleName: string; adjustment: number }[] = [];

    for (const rule of activeRules) {
      // Simplified condition evaluation (expand this based on actual conditions)
      const shouldApply = evaluateRuleConditions(rule, {
        productId,
        product,
        timestamp,
      });

      if (shouldApply) {
        const adjustment = applyPriceAdjustment(adjustedPrice, rule.priceAdjustment);
        adjustedPrice = adjustment.newPrice;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          adjustment: adjustment.adjustmentAmount,
        });

        // Track rule usage
        await db.collection(PRICING_RULES_COLLECTION).doc(rule.id).update({
          timesApplied: (rule.timesApplied || 0) + 1,
          updatedAt: new Date(),
        });
      }
    }

    // Apply min/max constraints
    const finalPrice = Math.max(basePrice * 0.6, Math.min(adjustedPrice, basePrice * 1.2));

    const discount = basePrice - finalPrice;
    const discountPercent = (discount / basePrice) * 100;

    const dynamicPrice: DynamicPrice = {
      productId,
      originalPrice: basePrice,
      dynamicPrice: finalPrice,
      discount,
      discountPercent,
      appliedRules,
      displayReason: generateDisplayReason(appliedRules),
      badge: discountPercent > 0 ? {
        text: `${Math.round(discountPercent)}% OFF`,
        color: 'red',
      } : undefined,
      validUntil: new Date(Date.now() + 3600000), // 1 hour
      context: {
        stockLevel: product?.stock || 0,
      },
    };

    return { success: true, data: dynamicPrice };
  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    return { success: false, error: 'Failed to calculate dynamic price' };
  }
}

// ============ Helper Functions ============

function evaluateRuleConditions(
  rule: DynamicPricingRule,
  context: { productId: string; product: any; timestamp: Date }
): boolean {
  // Simplified evaluation - expand based on actual condition types
  const { conditions } = rule;

  // Check inventory age
  if (conditions.inventoryAge) {
    // Would integrate with Alleaves here
    // For now, assume condition is met
  }

  // Check time-based conditions
  if (conditions.timeRange) {
    const hour = context.timestamp.getHours();
    const [startHour] = conditions.timeRange.start.split(':').map(Number);
    const [endHour] = conditions.timeRange.end.split(':').map(Number);

    if (hour < startHour || hour >= endHour) {
      return false;
    }
  }

  // Check day of week
  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    const dayOfWeek = context.timestamp.getDay();
    if (!conditions.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
  }

  // Check product IDs
  if (conditions.productIds && conditions.productIds.length > 0) {
    if (!conditions.productIds.includes(context.productId)) {
      return false;
    }
  }

  // Check categories
  if (conditions.categories && conditions.categories.length > 0) {
    const productCategory = context.product?.category;
    if (!productCategory || !conditions.categories.includes(productCategory)) {
      return false;
    }
  }

  return true;
}

function applyPriceAdjustment(
  currentPrice: number,
  adjustment: DynamicPricingRule['priceAdjustment']
): { newPrice: number; adjustmentAmount: number } {
  let newPrice = currentPrice;

  switch (adjustment.type) {
    case 'percentage':
      newPrice = currentPrice * (1 - adjustment.value);
      break;
    case 'fixed_amount':
      newPrice = currentPrice - adjustment.value;
      break;
    case 'set_price':
      newPrice = adjustment.value;
      break;
  }

  // Apply min/max constraints
  if (adjustment.minPrice !== undefined) {
    newPrice = Math.max(newPrice, adjustment.minPrice);
  }
  if (adjustment.maxPrice !== undefined) {
    newPrice = Math.min(newPrice, adjustment.maxPrice);
  }

  const adjustmentAmount = currentPrice - newPrice;

  return { newPrice, adjustmentAmount };
}

function generateDisplayReason(
  appliedRules: { ruleId: string; ruleName: string; adjustment: number }[]
): string {
  if (appliedRules.length === 0) return 'Standard pricing';
  if (appliedRules.length === 1) return appliedRules[0].ruleName;
  return 'Multiple discounts applied';
}
