'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { DynamicPricingRule, DynamicPrice, InventoryAgeData } from '@/types/dynamic-pricing';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getInventoryAge, needsClearancePricing } from '@/server/services/alleaves/inventory-intelligence';
import { getCompetitorPricingForProduct } from '@/server/services/ezal/competitor-pricing';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { logger } from '@/lib/logger';

const PRICING_RULES_COLLECTION = 'pricingRules';

// Cache for inventory age lookups (5 minute TTL)
const inventoryAgeCache = new Map<string, { data: InventoryAgeData | null; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for competitor pricing lookups (5 minute TTL)
interface CompetitorPricingCache {
  avgPrice: number;
  lowestPrice: number;
  highestPrice: number;
  competitorCount: number;
}
const competitorPricingCache = new Map<string, { data: CompetitorPricingCache | null; expiry: number }>();

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

/**
 * Get inventory age with caching to reduce Alleaves API calls
 */
async function getCachedInventoryAge(
  productId: string,
  orgId: string
): Promise<InventoryAgeData | null> {
  const cacheKey = `${orgId}:${productId}`;
  const cached = inventoryAgeCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch fresh data from Alleaves
  const inventoryAge = await getInventoryAge(productId, orgId);

  // Cache the result
  inventoryAgeCache.set(cacheKey, {
    data: inventoryAge,
    expiry: Date.now() + CACHE_TTL,
  });

  return inventoryAge;
}

/**
 * Get competitor pricing with caching to reduce Firestore queries
 */
async function getCachedCompetitorPricing(
  productId: string,
  orgId: string
): Promise<CompetitorPricingCache | null> {
  const cacheKey = `${orgId}:${productId}`;
  const cached = competitorPricingCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch fresh data from Ezal
  const competitorData = await getCompetitorPricingForProduct(productId, orgId);

  // Cache the result
  competitorPricingCache.set(cacheKey, {
    data: competitorData,
    expiry: Date.now() + CACHE_TTL,
  });

  return competitorData;
}

export async function calculateDynamicPrice(params: {
  productId: string;
  orgId: string;
  customerId?: string;
  timestamp?: Date;
}): Promise<{ success: boolean; data?: DynamicPrice; error?: string }> {
  try {
    const { productId, orgId, customerId, timestamp = new Date() } = params;

    logger.info('[DYNAMIC_PRICING] Calculating price', { productId, orgId });

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

    // Fetch inventory age from Alleaves (cached)
    const inventoryAge = await getCachedInventoryAge(productId, orgId);

    logger.debug('[DYNAMIC_PRICING] Inventory age fetched', {
      productId,
      daysInInventory: inventoryAge?.daysInInventory,
      expiryDate: inventoryAge?.expiryDate?.toISOString(),
    });

    // Fetch competitor pricing from Ezal (cached)
    const competitorPricing = await getCachedCompetitorPricing(productId, orgId);

    logger.debug('[DYNAMIC_PRICING] Competitor pricing fetched', {
      productId,
      competitorAvgPrice: competitorPricing?.avgPrice,
      competitorCount: competitorPricing?.competitorCount,
    });

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
      // Evaluate conditions with real inventory and competitor data
      const shouldApply = await evaluateRuleConditions(rule, {
        productId,
        product: product || {},
        basePrice,
        timestamp,
        inventoryAge,
        competitorPricing,
        customerId,
      });

      if (shouldApply) {
        const adjustment = applyPriceAdjustment(adjustedPrice, rule.priceAdjustment);
        adjustedPrice = adjustment.newPrice;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          adjustment: adjustment.adjustmentAmount,
        });

        logger.info('[DYNAMIC_PRICING] Rule applied', {
          ruleId: rule.id,
          ruleName: rule.name,
          adjustment: adjustment.adjustmentAmount,
        });

        // Track rule usage (fire and forget)
        db.collection(PRICING_RULES_COLLECTION).doc(rule.id).update({
          timesApplied: (rule.timesApplied || 0) + 1,
          updatedAt: new Date(),
        }).catch(err => logger.warn('[DYNAMIC_PRICING] Failed to update rule stats', { error: err }));
      }
    }

    // Apply min/max constraints (40% max discount, no price increases)
    const finalPrice = Math.max(basePrice * 0.6, Math.min(adjustedPrice, basePrice));

    const discount = basePrice - finalPrice;
    const discountPercent = basePrice > 0 ? (discount / basePrice) * 100 : 0;

    // Generate display reason based on applied rules and inventory
    let displayReason = generateDisplayReason(appliedRules);
    let badgeColor = 'red';

    // Customize badge for clearance items
    if (inventoryAge?.expiryDate) {
      const daysUntilExpiry = Math.floor(
        (inventoryAge.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 7) {
        displayReason = 'Clearance - Expiring Soon';
        badgeColor = 'orange';
      } else if (daysUntilExpiry <= 14) {
        displayReason = 'Moving Inventory';
        badgeColor = 'yellow';
      }
    }

    const dynamicPrice: DynamicPrice = {
      productId,
      originalPrice: basePrice,
      dynamicPrice: Math.round(finalPrice * 100) / 100, // Round to cents
      discount: Math.round(discount * 100) / 100,
      discountPercent: Math.round(discountPercent * 10) / 10,
      appliedRules,
      displayReason,
      badge: discountPercent > 0 ? {
        text: `${Math.round(discountPercent)}% OFF`,
        color: badgeColor,
      } : undefined,
      validUntil: new Date(Date.now() + 3600000), // 1 hour
      context: {
        stockLevel: product?.stock || 0,
        inventoryAge: inventoryAge?.daysInInventory,
        competitorAvgPrice: competitorPricing?.avgPrice,
        demandLevel: inventoryAge?.velocityTrend === 'increasing' ? 'high' :
                     inventoryAge?.velocityTrend === 'decreasing' ? 'low' : 'medium',
      },
    };

    logger.info('[DYNAMIC_PRICING] Price calculated', {
      productId,
      originalPrice: basePrice,
      dynamicPrice: finalPrice,
      discountPercent,
      rulesApplied: appliedRules.length,
    });

    return { success: true, data: dynamicPrice };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error calculating price', { error });
    return { success: false, error: 'Failed to calculate dynamic price' };
  }
}

// ============ Helper Functions ============

interface RuleContext {
  productId: string;
  product: Record<string, unknown>;
  basePrice: number;
  timestamp: Date;
  inventoryAge: InventoryAgeData | null;
  competitorPricing: CompetitorPricingCache | null;
  customerId?: string;
}

async function evaluateRuleConditions(
  rule: DynamicPricingRule,
  context: RuleContext
): Promise<boolean> {
  const { conditions } = rule;

  // Check inventory age (REAL DATA from Alleaves)
  if (conditions.inventoryAge) {
    if (!context.inventoryAge) {
      // No inventory data available - can't evaluate this condition
      logger.debug('[DYNAMIC_PRICING] No inventory age data for product', {
        productId: context.productId,
        ruleId: rule.id,
      });
      return false;
    }

    const { min, max } = conditions.inventoryAge;
    const daysInInventory = context.inventoryAge.daysInInventory;

    // Check minimum age
    if (min !== undefined && daysInInventory < min) {
      logger.debug('[DYNAMIC_PRICING] Inventory age below minimum', {
        productId: context.productId,
        daysInInventory,
        minRequired: min,
      });
      return false;
    }

    // Check maximum age
    if (max !== undefined && daysInInventory > max) {
      logger.debug('[DYNAMIC_PRICING] Inventory age above maximum', {
        productId: context.productId,
        daysInInventory,
        maxAllowed: max,
      });
      return false;
    }
  }

  // Check stock level conditions
  if (conditions.stockLevel) {
    const stockLevel = context.inventoryAge?.stockLevel ?? (context.product?.stock as number) ?? 0;

    if (conditions.stockLevel.below !== undefined && stockLevel >= conditions.stockLevel.below) {
      return false;
    }
    if (conditions.stockLevel.above !== undefined && stockLevel <= conditions.stockLevel.above) {
      return false;
    }
  }

  // Check stock level percentage (if capacity known)
  if (conditions.stockLevelPercent) {
    // Would need to know max capacity - skip for now
    // TODO: Add max capacity to product data
  }

  // Check time-based conditions
  if (conditions.timeRange) {
    const hour = context.timestamp.getHours();
    const minute = context.timestamp.getMinutes();
    const currentTime = hour * 60 + minute; // Minutes since midnight

    const [startHour, startMin = 0] = conditions.timeRange.start.split(':').map(Number);
    const [endHour, endMin = 0] = conditions.timeRange.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime < startTime || currentTime >= endTime) {
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

  // Check date range
  if (conditions.dateRange) {
    const now = context.timestamp.getTime();
    if (conditions.dateRange.start && new Date(conditions.dateRange.start).getTime() > now) {
      return false;
    }
    if (conditions.dateRange.end && new Date(conditions.dateRange.end).getTime() < now) {
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
    const productCategory = context.product?.category as string;
    if (!productCategory || !conditions.categories.includes(productCategory)) {
      return false;
    }
  }

  // Check traffic/demand level
  if (conditions.trafficLevel && conditions.trafficLevel.length > 0) {
    const demandLevel = context.inventoryAge?.velocityTrend === 'increasing' ? 'high' :
                        context.inventoryAge?.velocityTrend === 'decreasing' ? 'very_low' : 'medium';
    if (!conditions.trafficLevel.includes(demandLevel)) {
      return false;
    }
  }

  // Check competitor price conditions (REAL DATA from Ezal)
  if (conditions.competitorPrice) {
    if (!context.competitorPricing || context.competitorPricing.competitorCount === 0) {
      // No competitor data available - can't evaluate this condition
      logger.debug('[DYNAMIC_PRICING] No competitor pricing data for product', {
        productId: context.productId,
        ruleId: rule.id,
      });
      return false;
    }

    const ourPrice = context.basePrice;
    const competitorAvg = context.competitorPricing.avgPrice;
    const priceDiffPercent = ((ourPrice - competitorAvg) / competitorAvg) * 100;

    // Check if our price is below competitor average by X%
    if (conditions.competitorPrice.below !== undefined) {
      // Rule: apply when our price is BELOW competitor by at least X%
      if (priceDiffPercent >= -conditions.competitorPrice.below) {
        logger.debug('[DYNAMIC_PRICING] Our price not below competitor threshold', {
          productId: context.productId,
          ourPrice,
          competitorAvg,
          priceDiffPercent,
          requiredBelow: conditions.competitorPrice.below,
        });
        return false;
      }
    }

    // Check if our price is above competitor average by X%
    if (conditions.competitorPrice.above !== undefined) {
      // Rule: apply when our price is ABOVE competitor by at least X%
      if (priceDiffPercent <= conditions.competitorPrice.above) {
        logger.debug('[DYNAMIC_PRICING] Our price not above competitor threshold', {
          productId: context.productId,
          ourPrice,
          competitorAvg,
          priceDiffPercent,
          requiredAbove: conditions.competitorPrice.above,
        });
        return false;
      }
    }

    logger.info('[DYNAMIC_PRICING] Competitor price condition matched', {
      productId: context.productId,
      ruleId: rule.id,
      ourPrice,
      competitorAvg,
      priceDiffPercent,
      competitorCount: context.competitorPricing.competitorCount,
    });
  }

  // All conditions passed
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

// ============ Alleaves Two-Way Sync ============

/**
 * Create Alleaves client for an org
 */
function createAlleavesClientForOrg(orgId: string): ALLeavesClient {
  // For now, use environment variables (Thrive Syracuse)
  // TODO: Fetch credentials from tenant config
  const config: ALLeavesConfig = {
    username: process.env.ALLEAVES_USERNAME || '',
    password: process.env.ALLEAVES_PASSWORD || '',
    pin: process.env.ALLEAVES_PIN,
    storeId: process.env.ALLEAVES_LOCATION_ID || '1',
    locationId: process.env.ALLEAVES_LOCATION_ID || '1',
  };

  return new ALLeavesClient(config);
}

/**
 * Sync a BakedBot pricing rule to Alleaves as a discount
 *
 * This enables two-way sync: rules created in BakedBot are applied in the POS
 *
 * @param ruleId - BakedBot pricing rule ID
 * @param orgId - Organization ID
 * @returns Result with Alleaves discount ID if successful
 */
export async function syncRuleToAlleaves(
  ruleId: string,
  orgId: string
): Promise<{ success: boolean; alleavesDiscountId?: number; error?: string }> {
  try {
    logger.info('[DYNAMIC_PRICING] Syncing rule to Alleaves', { ruleId, orgId });

    // Fetch the rule
    const db = getAdminFirestore();
    const ruleDoc = await db.collection(PRICING_RULES_COLLECTION).doc(ruleId).get();

    if (!ruleDoc.exists) {
      return { success: false, error: 'Rule not found' };
    }

    const rule = ruleDoc.data() as DynamicPricingRule;

    // Convert BakedBot rule to Alleaves discount format
    const discountType = rule.priceAdjustment.type === 'percentage' ? 'percent' :
                         rule.priceAdjustment.type === 'fixed_amount' ? 'amount' : 'fixed_price';

    const discountValue = rule.priceAdjustment.type === 'percentage'
      ? rule.priceAdjustment.value * 100  // Convert 0.15 to 15
      : rule.priceAdjustment.value;

    // Build conditions
    const conditions: {
      categories?: string[];
      brands?: string[];
      products?: number[];
      min_qty?: number;
    } = {};

    if (rule.conditions.categories && rule.conditions.categories.length > 0) {
      conditions.categories = rule.conditions.categories;
    }

    if (rule.conditions.productIds && rule.conditions.productIds.length > 0) {
      conditions.products = rule.conditions.productIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }

    // Calculate dates if time-bounded
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (rule.conditions.dateRange) {
      if (rule.conditions.dateRange.start) {
        startDate = new Date(rule.conditions.dateRange.start).toISOString().split('T')[0];
      }
      if (rule.conditions.dateRange.end) {
        endDate = new Date(rule.conditions.dateRange.end).toISOString().split('T')[0];
      }
    }

    // Create discount in Alleaves
    const client = createAlleavesClientForOrg(orgId);

    const result = await client.createDiscount({
      name: `[BakedBot] ${rule.name}`,
      discount_type: discountType,
      discount_value: discountValue,
      start_date: startDate,
      end_date: endDate,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      badge_text: `${Math.round(discountValue)}% OFF`,
    });

    if (!result.success) {
      logger.warn('[DYNAMIC_PRICING] Failed to create Alleaves discount', {
        ruleId,
        error: result.error,
      });
      return { success: false, error: result.error };
    }

    // Store the Alleaves discount ID on the rule for future reference
    await db.collection(PRICING_RULES_COLLECTION).doc(ruleId).update({
      alleavesDiscountId: result.discount?.id_discount,
      lastSyncedToAlleaves: new Date(),
      updatedAt: new Date(),
    });

    logger.info('[DYNAMIC_PRICING] Rule synced to Alleaves', {
      ruleId,
      alleavesDiscountId: result.discount?.id_discount,
    });

    return {
      success: true,
      alleavesDiscountId: result.discount?.id_discount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[DYNAMIC_PRICING] Error syncing rule to Alleaves', { ruleId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Deactivate a synced discount in Alleaves
 *
 * @param ruleId - BakedBot pricing rule ID
 * @param orgId - Organization ID
 */
export async function deactivateRuleInAlleaves(
  ruleId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const ruleDoc = await db.collection(PRICING_RULES_COLLECTION).doc(ruleId).get();

    if (!ruleDoc.exists) {
      return { success: false, error: 'Rule not found' };
    }

    const rule = ruleDoc.data();
    const alleavesDiscountId = rule?.alleavesDiscountId;

    if (!alleavesDiscountId) {
      logger.info('[DYNAMIC_PRICING] Rule not synced to Alleaves, nothing to deactivate', { ruleId });
      return { success: true };
    }

    const client = createAlleavesClientForOrg(orgId);
    const result = await client.deactivateDiscount(alleavesDiscountId);

    if (result.success) {
      await db.collection(PRICING_RULES_COLLECTION).doc(ruleId).update({
        alleavesDiscountActive: false,
        updatedAt: new Date(),
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[DYNAMIC_PRICING] Error deactivating rule in Alleaves', { ruleId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a pricing rule AND sync it to Alleaves in one operation
 *
 * Convenience function for creating rules that should immediately be active in the POS
 */
export async function createAndSyncPricingRule(
  data: Partial<DynamicPricingRule>,
  syncToAlleaves: boolean = false
): Promise<{
  success: boolean;
  data?: DynamicPricingRule;
  alleavesDiscountId?: number;
  error?: string
}> {
  // First create the rule in BakedBot
  const createResult = await createPricingRule(data);

  if (!createResult.success || !createResult.data) {
    return createResult;
  }

  // Optionally sync to Alleaves
  if (syncToAlleaves && data.orgId) {
    const syncResult = await syncRuleToAlleaves(createResult.data.id, data.orgId);

    if (!syncResult.success) {
      logger.warn('[DYNAMIC_PRICING] Rule created but Alleaves sync failed', {
        ruleId: createResult.data.id,
        error: syncResult.error,
      });
    }

    return {
      ...createResult,
      alleavesDiscountId: syncResult.alleavesDiscountId,
    };
  }

  return createResult;
}

/**
 * Batch sync all active pricing rules to Alleaves POS
 *
 * Creates discounts in Alleaves for all active rules that haven't been synced yet.
 *
 * @param orgId - Organization ID
 * @returns Summary of rules synced
 */
export async function syncAllRulesToPOS(
  orgId: string
): Promise<{
  success: boolean;
  rulesSynced?: number;
  errors?: string[];
  error?: string;
}> {
  try {
    logger.info('[DYNAMIC_PRICING] Batch syncing all rules to POS', { orgId });

    // Get all active rules
    const rulesResult = await getPricingRules(orgId);
    if (!rulesResult.success || !rulesResult.data) {
      return { success: false, error: 'Failed to fetch pricing rules' };
    }

    const activeRules = rulesResult.data.filter(r => r.active);

    if (activeRules.length === 0) {
      return { success: true, rulesSynced: 0 };
    }

    // Sync each rule to Alleaves
    const results = await Promise.allSettled(
      activeRules.map(rule => syncRuleToAlleaves(rule.id, orgId))
    );

    // Aggregate results
    let rulesSynced = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        rulesSynced++;
      } else if (result.status === 'rejected') {
        errors.push(`Rule ${activeRules[index].name}: ${result.reason}`);
      } else if (result.status === 'fulfilled' && !result.value.success) {
        errors.push(`Rule ${activeRules[index].name}: ${result.value.error}`);
      }
    });

    logger.info('[DYNAMIC_PRICING] Batch POS sync complete', {
      orgId,
      rulesSynced,
      errorCount: errors.length,
    });

    return {
      success: true,
      rulesSynced,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error batch syncing rules to POS', { error, orgId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync to POS'
    };
  }
}

// ============ Public Menu Publishing ============

/**
 * Apply dynamic pricing to a single product in the public view
 *
 * Updates the product's price in tenants/{orgId}/publicViews/products/items/{productId}
 * to reflect the calculated dynamic price, making it visible on the live menu.
 */
export async function applyPriceToMenu(params: {
  productId: string;
  orgId: string;
}): Promise<{ success: boolean; originalPrice?: number; newPrice?: number; error?: string }> {
  try {
    const { productId, orgId } = params;

    logger.info('[DYNAMIC_PRICING] Applying price to menu', { productId, orgId });

    // Calculate dynamic price
    const priceResult = await calculateDynamicPrice({ productId, orgId });

    if (!priceResult.success || !priceResult.data) {
      return {
        success: false,
        error: priceResult.error || 'Failed to calculate price'
      };
    }

    const { originalPrice, dynamicPrice, discount, badge } = priceResult.data;

    // No discount = no change needed
    if (discount === 0) {
      logger.info('[DYNAMIC_PRICING] No discount to apply', { productId });
      return {
        success: true,
        originalPrice,
        newPrice: originalPrice
      };
    }

    // Update product in public view
    const db = getAdminFirestore();
    const productRef = db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .doc(productId);

    await productRef.update({
      price: dynamicPrice,
      originalPrice, // Store original for reverting later
      dynamicPricingApplied: true,
      dynamicPricingBadge: badge?.text || null,
      dynamicPricingReason: priceResult.data.displayReason,
      dynamicPricingUpdatedAt: new Date(),
    });

    logger.info('[DYNAMIC_PRICING] Price applied to menu', {
      productId,
      originalPrice,
      newPrice: dynamicPrice,
      discount,
    });

    // Revalidate the brand page to show updated prices
    revalidatePath(`/${orgId}`);

    return {
      success: true,
      originalPrice,
      newPrice: dynamicPrice,
    };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error applying price to menu', { error, params });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply price'
    };
  }
}

/**
 * Batch apply dynamic pricing to all products matching active rules
 *
 * This is the "Publish to Menu" function that applies all active pricing rules
 * to the public menu, making dynamic prices visible to customers.
 *
 * @param orgId - Organization ID
 * @param ruleId - Optional: only apply a specific rule. If not provided, applies all active rules.
 * @returns Summary of products updated
 */
export async function publishPricesToMenu(
  orgId: string,
  ruleId?: string
): Promise<{
  success: boolean;
  productsUpdated?: number;
  totalSavings?: number;
  errors?: string[];
  error?: string;
}> {
  try {
    logger.info('[DYNAMIC_PRICING] Publishing prices to menu', { orgId, ruleId });

    const db = getAdminFirestore();

    // Get products from public view
    const productsSnapshot = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .get();

    if (productsSnapshot.empty) {
      return { success: false, error: 'No products found in public view' };
    }

    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info('[DYNAMIC_PRICING] Found products to process', { count: products.length });

    // Apply pricing to each product
    const results = await Promise.allSettled(
      products.map(product => applyPriceToMenu({ productId: product.id, orgId }))
    );

    // Aggregate results
    let productsUpdated = 0;
    let totalSavings = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const { originalPrice = 0, newPrice = 0 } = result.value;
        if (originalPrice > newPrice) {
          productsUpdated++;
          totalSavings += (originalPrice - newPrice);
        }
      } else if (result.status === 'rejected') {
        errors.push(`Product ${products[index].id}: ${result.reason}`);
      } else if (result.status === 'fulfilled' && !result.value.success) {
        errors.push(`Product ${products[index].id}: ${result.value.error}`);
      }
    });

    logger.info('[DYNAMIC_PRICING] Batch publish complete', {
      orgId,
      productsUpdated,
      totalSavings: totalSavings.toFixed(2),
      errorCount: errors.length,
    });

    return {
      success: true,
      productsUpdated,
      totalSavings: Math.round(totalSavings * 100) / 100,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error publishing prices to menu', { error, orgId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish prices'
    };
  }
}

/**
 * Revert dynamic pricing for a product (restore original price)
 *
 * @param productId - Product ID
 * @param orgId - Organization ID
 */
export async function revertPriceOnMenu(params: {
  productId: string;
  orgId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { productId, orgId } = params;

    logger.info('[DYNAMIC_PRICING] Reverting price on menu', { productId, orgId });

    const db = getAdminFirestore();
    const productRef = db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .doc(productId);

    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return { success: false, error: 'Product not found' };
    }

    const product = productDoc.data();
    const originalPrice = product?.originalPrice || product?.price;

    await productRef.update({
      price: originalPrice,
      dynamicPricingApplied: false,
      dynamicPricingBadge: null,
      dynamicPricingReason: null,
      dynamicPricingUpdatedAt: new Date(),
    });

    logger.info('[DYNAMIC_PRICING] Price reverted on menu', { productId, originalPrice });

    // Revalidate the brand page
    revalidatePath(`/${orgId}`);

    return { success: true };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error reverting price on menu', { error, params });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revert price'
    };
  }
}

/**
 * Revert all dynamic pricing for an org (restore all original prices)
 *
 * @param orgId - Organization ID
 */
export async function revertAllPricesOnMenu(
  orgId: string
): Promise<{ success: boolean; productsReverted?: number; error?: string }> {
  try {
    logger.info('[DYNAMIC_PRICING] Reverting all prices on menu', { orgId });

    const db = getAdminFirestore();

    // Get all products with dynamic pricing applied
    const productsSnapshot = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .where('dynamicPricingApplied', '==', true)
      .get();

    if (productsSnapshot.empty) {
      logger.info('[DYNAMIC_PRICING] No products with dynamic pricing to revert', { orgId });
      return { success: true, productsReverted: 0 };
    }

    const batch = db.batch();

    productsSnapshot.docs.forEach(doc => {
      const product = doc.data();
      const originalPrice = product.originalPrice || product.price;

      batch.update(doc.ref, {
        price: originalPrice,
        dynamicPricingApplied: false,
        dynamicPricingBadge: null,
        dynamicPricingReason: null,
        dynamicPricingUpdatedAt: new Date(),
      });
    });

    await batch.commit();

    logger.info('[DYNAMIC_PRICING] All prices reverted on menu', {
      orgId,
      productsReverted: productsSnapshot.size,
    });

    // Revalidate the brand page
    revalidatePath(`/${orgId}`);

    return {
      success: true,
      productsReverted: productsSnapshot.size,
    };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error reverting all prices on menu', { error, orgId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revert prices'
    };
  }
}

/**
 * Publish pricing to both BakedBot menu AND Alleaves POS simultaneously
 *
 * This is the "one-click deploy everywhere" function that:
 * 1. Applies all pricing rules to the public menu (instant)
 * 2. Syncs all pricing rules to Alleaves POS (5-15 min)
 *
 * @param orgId - Organization ID
 * @returns Combined results from both operations
 */
export async function publishToMenuAndPOS(
  orgId: string
): Promise<{
  success: boolean;
  menuResult?: {
    productsUpdated: number;
    totalSavings: number;
    errors?: string[];
  };
  posResult?: {
    rulesSynced: number;
    errors?: string[];
  };
  error?: string;
}> {
  try {
    logger.info('[DYNAMIC_PRICING] Publishing to menu and POS', { orgId });

    // Execute both operations in parallel for speed
    const [menuResult, posResult] = await Promise.allSettled([
      publishPricesToMenu(orgId),
      syncAllRulesToPOS(orgId),
    ]);

    // Extract results
    const menuData = menuResult.status === 'fulfilled' && menuResult.value.success
      ? {
          productsUpdated: menuResult.value.productsUpdated || 0,
          totalSavings: menuResult.value.totalSavings || 0,
          errors: menuResult.value.errors,
        }
      : undefined;

    const posData = posResult.status === 'fulfilled' && posResult.value.success
      ? {
          rulesSynced: posResult.value.rulesSynced || 0,
          errors: posResult.value.errors,
        }
      : undefined;

    // Determine overall success
    const menuSuccess = menuResult.status === 'fulfilled' && menuResult.value.success;
    const posSuccess = posResult.status === 'fulfilled' && posResult.value.success;

    // Partial success is still success (one system updated)
    const overallSuccess = menuSuccess || posSuccess;

    // Collect errors
    const errors: string[] = [];
    if (!menuSuccess) {
      const error = menuResult.status === 'rejected'
        ? menuResult.reason
        : menuResult.value.error;
      errors.push(`Menu: ${error}`);
    }
    if (!posSuccess) {
      const error = posResult.status === 'rejected'
        ? posResult.reason
        : posResult.value.error;
      errors.push(`POS: ${error}`);
    }

    logger.info('[DYNAMIC_PRICING] Publish to menu and POS complete', {
      orgId,
      menuSuccess,
      posSuccess,
      menuProductsUpdated: menuData?.productsUpdated,
      posRulesSynced: posData?.rulesSynced,
    });

    return {
      success: overallSuccess,
      menuResult: menuData,
      posResult: posData,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    logger.error('[DYNAMIC_PRICING] Error publishing to menu and POS', { error, orgId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish'
    };
  }
}
