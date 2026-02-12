/**
 * Upsell Engine Service
 *
 * Core scoring and recommendation engine for product upsells.
 * Surfaces value-focused suggestions at every customer touchpoint:
 * product detail, cart, checkout, and Smokey chatbot.
 *
 * Scoring model (weighted composite):
 *  - 30% Terpene/Effect Match (cannabis science pairing)
 *  - 25% Margin Contribution (280E tax optimization)
 *  - 20% Inventory Priority (clearance/overstocked)
 *  - 15% Category Complement (cross-category variety)
 *  - 10% Price Fit (budget-appropriate)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Product } from '@/types/products';
import type { BundleDeal } from '@/types/bundles';
import type {
  UpsellContext,
  UpsellResult,
  UpsellSuggestion,
  UpsellStrategy,
  UpsellScoreBreakdown,
  UpsellScoringWeights,
} from '@/types/upsell';
import {
  DEFAULT_UPSELL_WEIGHTS,
  PLACEMENT_WEIGHT_OVERRIDES,
  TERPENE_PAIRINGS,
  EFFECT_COMPLEMENTS,
  CATEGORY_COMPLEMENTS,
  UPSELL_REASON_TEMPLATES,
} from '@/types/upsell';

// --- Caching ---

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const productCache = new Map<string, CacheEntry<Product[]>>();
const bundleCache = new Map<string, CacheEntry<BundleDeal[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data;
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// --- Product Fetching ---

/**
 * Fetch all products for an org (with caching).
 * Checks tenant catalog first (Thrive Syracuse pattern), then legacy products.
 */
async function fetchOrgProducts(orgId: string): Promise<Product[]> {
  const cached = getCached(productCache, orgId);
  if (cached) return cached;

  try {
    const db = getAdminFirestore();

    // 1. Tenant catalog (tenants/{orgId}/publicViews/products/items)
    const tenantSnap = await db
      .collection(`tenants/${orgId}/publicViews/products/items`)
      .limit(500)
      .get();

    if (!tenantSnap.empty) {
      const products = tenantSnap.docs.map((doc) => mapFirestoreToProduct(doc.id, doc.data()));
      setCache(productCache, orgId, products);
      return products;
    }

    // 2. Legacy products collection
    const legacySnap = await db
      .collection('products')
      .where('brandId', '==', orgId)
      .limit(500)
      .get();

    if (!legacySnap.empty) {
      const products = legacySnap.docs.map((doc) => mapFirestoreToProduct(doc.id, doc.data()));
      setCache(productCache, orgId, products);
      return products;
    }

    return [];
  } catch (error) {
    logger.error('[UPSELL_ENGINE] Error fetching products', { orgId, error });
    return [];
  }
}

function mapFirestoreToProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  return {
    id,
    name: data.name || 'Unknown',
    category: data.category || 'Other',
    price: data.price || 0,
    imageUrl: data.imageUrl || '',
    imageHint: data.imageHint || '',
    description: data.description || '',
    brandId: data.brandId || data.tenantId || '',
    terpenes: data.terpenes || [],
    effects: data.effects || [],
    thcPercent: data.thcPercent,
    cbdPercent: data.cbdPercent,
    strainType: data.strainType,
    stock: data.stock ?? data.quantity,
    cost: data.cost,
    featured: data.featured,
    sortOrder: data.sortOrder,
    originalPrice: data.originalPrice,
    dynamicPricingApplied: data.dynamicPricingApplied,
    dynamicPricingBadge: data.dynamicPricingBadge,
  };
}

/** Fetch active bundles for an org (with caching) */
async function fetchActiveBundles(orgId: string): Promise<BundleDeal[]> {
  const cached = getCached(bundleCache, orgId);
  if (cached) return cached;

  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('bundles')
      .where('orgId', '==', orgId)
      .where('status', '==', 'active')
      .limit(20)
      .get();

    const bundles = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as unknown as BundleDeal[];

    setCache(bundleCache, orgId, bundles);
    return bundles;
  } catch (error) {
    logger.error('[UPSELL_ENGINE] Error fetching bundles', { orgId, error });
    return [];
  }
}

// --- Scoring Functions ---

/**
 * Score terpene/effect match between anchor product(s) and candidate.
 * Uses cannabis science pairing rules for entourage effect.
 */
function scoreTerpeneEffectMatch(anchor: Product | Product[], candidate: Product): number {
  const anchors = Array.isArray(anchor) ? anchor : [anchor];
  let bestScore = 0;

  for (const a of anchors) {
    let score = 0;

    // Terpene pairing score
    const anchorTerps = (a.terpenes || []).map((t) => t.name.toLowerCase());
    const candidateTerps = (candidate.terpenes || []).map((t) => t.name.toLowerCase());

    if (anchorTerps.length > 0 && candidateTerps.length > 0) {
      let terpMatches = 0;
      for (const at of anchorTerps) {
        const pairings = TERPENE_PAIRINGS[at] || [];
        for (const ct of candidateTerps) {
          if (pairings.includes(ct)) terpMatches++;
          // Same terpene is also a good match (similar profile)
          if (at === ct) terpMatches += 0.5;
        }
      }
      score += Math.min(1, terpMatches / Math.max(1, anchorTerps.length)) * 0.6;
    }

    // Effect complement score
    const anchorEffects = (a.effects || []).map((e) => e.toLowerCase());
    const candidateEffects = (candidate.effects || []).map((e) => e.toLowerCase());

    if (anchorEffects.length > 0 && candidateEffects.length > 0) {
      let effectMatches = 0;
      for (const ae of anchorEffects) {
        const complements = EFFECT_COMPLEMENTS[ae] || [];
        for (const ce of candidateEffects) {
          if (complements.includes(ce)) effectMatches++;
        }
      }
      score += Math.min(1, effectMatches / Math.max(1, anchorEffects.length)) * 0.4;
    }

    // Fallback: if no terpene/effect data, use strain type similarity
    if (anchorTerps.length === 0 && anchorEffects.length === 0) {
      if (a.strainType && candidate.strainType && a.strainType === candidate.strainType) {
        score = 0.4; // Moderate score for same strain type
      } else {
        score = 0.2; // Low baseline
      }
    }

    bestScore = Math.max(bestScore, score);
  }

  return Math.min(1, bestScore);
}

/**
 * Score margin contribution.
 * Higher margin = higher score. Uses cost data if available.
 */
function scoreMarginContribution(candidate: Product): number {
  if (candidate.cost !== undefined && candidate.cost > 0 && candidate.price > 0) {
    const margin = (candidate.price - candidate.cost) / candidate.price;
    return Math.min(1, margin); // 0-100% mapped to 0-1
  }

  // Fallback: higher price products tend to have better margins
  // Normalize against a reasonable price ceiling ($100)
  return Math.min(1, (candidate.price || 0) / 100) * 0.5;
}

/**
 * Score inventory priority.
 * Boosts overstocked and slow-moving items, penalizes low stock.
 */
function scoreInventoryPriority(candidate: Product): number {
  const stock = candidate.stock;
  if (stock === undefined) return 0.3; // Neutral if unknown

  if (stock <= 3) return 0; // Don't upsell near-OOS items
  if (stock <= 10) return 0.2; // Low priority for limited stock
  if (stock >= 50) return 0.9; // Strong push for overstocked
  if (stock >= 30) return 0.7; // Good push

  return 0.4; // Normal stock level
}

/**
 * Score category complement.
 * Cross-category suggestions score higher than same-category.
 */
function scoreCategoryComplement(anchor: Product | Product[], candidate: Product): number {
  const anchors = Array.isArray(anchor) ? anchor : [anchor];
  const anchorCategories = [...new Set(anchors.map((a) => a.category))];

  // Same category = lower score (customer already browsing this category)
  if (anchorCategories.includes(candidate.category)) return 0.2;

  // Check if candidate's category is a known complement
  for (const cat of anchorCategories) {
    const complements = CATEGORY_COMPLEMENTS[cat] || [];
    if (complements.includes(candidate.category)) return 1.0;
  }

  // Different category but not a known complement
  return 0.5;
}

/**
 * Score price fit.
 * Products within ±30% of anchor price score highest.
 */
function scorePriceFit(anchor: Product | Product[], candidate: Product): number {
  const anchors = Array.isArray(anchor) ? anchor : [anchor];
  const avgPrice = anchors.reduce((sum, a) => sum + a.price, 0) / anchors.length;

  if (avgPrice === 0 || candidate.price === 0) return 0.5;

  const ratio = candidate.price / avgPrice;

  // Within ±30% is ideal
  if (ratio >= 0.7 && ratio <= 1.3) return 1.0;
  // Within ±50% is acceptable
  if (ratio >= 0.5 && ratio <= 1.5) return 0.6;
  // Outside range
  return 0.2;
}

// --- Strategy Detection ---

/**
 * Determine the primary upsell strategy based on scoring breakdown.
 */
function detectStrategy(
  anchor: Product | Product[],
  candidate: Product,
  breakdown: UpsellScoreBreakdown
): UpsellStrategy {
  // Check for bundle match first (overrides scoring)
  // This is handled separately in the main function

  const scores: [UpsellStrategy, number][] = [
    ['terpene_pairing', breakdown.terpeneEffectMatch],
    ['margin_boost', breakdown.marginContribution],
    ['clearance', breakdown.inventoryPriority > 0.7 ? breakdown.inventoryPriority : 0],
    ['category_complement', breakdown.categoryComplement],
  ];

  // Special strategies
  if (candidate.dynamicPricingApplied) {
    return 'clearance';
  }

  // Pick the highest-scoring strategy
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}

/**
 * Generate customer-facing reason text.
 */
function generateReason(strategy: UpsellStrategy, anchor: Product | Product[], candidate: Product): string {
  switch (strategy) {
    case 'terpene_pairing': {
      const anchorTerps = (Array.isArray(anchor) ? anchor[0] : anchor).terpenes || [];
      const candTerps = candidate.terpenes || [];
      if (anchorTerps.length > 0 && candTerps.length > 0) {
        return `Complementary terpene profile`;
      }
      return 'Similar effect profile';
    }
    case 'effect_stacking':
      return 'Enhances your experience';
    case 'category_complement':
      return 'Complete your session';
    case 'potency_ladder':
      return 'Try something new';
    case 'clearance':
      return candidate.dynamicPricingBadge || 'Limited time deal';
    case 'margin_boost':
      return 'Staff pick';
    case 'bundle_match':
      return 'Bundle & save';
    case 'popular_pairing':
      return 'Customers also enjoy';
    default:
      return UPSELL_REASON_TEMPLATES[strategy] || 'You might also like';
  }
}

// --- Main Engine Functions ---

/**
 * Score a candidate product against an anchor context.
 */
function scoreCandidate(
  anchor: Product | Product[],
  candidate: Product,
  weights: UpsellScoringWeights
): UpsellScoreBreakdown {
  const terpeneEffectMatch = scoreTerpeneEffectMatch(anchor, candidate);
  const marginContribution = scoreMarginContribution(candidate);
  const inventoryPriority = scoreInventoryPriority(candidate);
  const categoryComplement = scoreCategoryComplement(anchor, candidate);
  const priceFit = scorePriceFit(anchor, candidate);

  const totalScore =
    weights.terpeneEffectMatch * terpeneEffectMatch +
    weights.marginContribution * marginContribution +
    weights.inventoryPriority * inventoryPriority +
    weights.categoryComplement * categoryComplement +
    weights.priceFit * priceFit;

  return {
    terpeneEffectMatch,
    marginContribution,
    inventoryPriority,
    categoryComplement,
    priceFit,
    totalScore: Math.max(0, Math.min(1, totalScore)),
  };
}

/**
 * Get effective weights for a given placement.
 */
function getWeightsForPlacement(placement: UpsellContext['placement']): UpsellScoringWeights {
  const overrides = PLACEMENT_WEIGHT_OVERRIDES[placement];
  return { ...DEFAULT_UPSELL_WEIGHTS, ...overrides };
}

/**
 * Check if a candidate product is part of any active bundle with the anchor.
 */
function findBundleMatch(
  anchorIds: string[],
  candidateId: string,
  bundles: BundleDeal[]
): BundleDeal | null {
  for (const bundle of bundles) {
    const productIds = bundle.products.map((p) => p.productId);
    const hasAnchor = anchorIds.some((id) => productIds.includes(id));
    const hasCandidate = productIds.includes(candidateId);
    if (hasAnchor && hasCandidate) return bundle;
  }
  return null;
}

/**
 * Get upsell suggestions for a single product (product detail modal).
 */
export async function getProductUpsells(
  productId: string,
  orgId: string,
  options?: { maxResults?: number; userTolerance?: 'low' | 'medium' | 'high' }
): Promise<UpsellResult> {
  const maxResults = options?.maxResults ?? 3;
  const allProducts = await fetchOrgProducts(orgId);
  const bundles = await fetchActiveBundles(orgId);

  const anchor = allProducts.find((p) => p.id === productId);
  if (!anchor) {
    logger.warn('[UPSELL_ENGINE] Anchor product not found', { productId, orgId });
    return { suggestions: [], placement: 'product_detail', generatedAt: Date.now() };
  }

  const weights = getWeightsForPlacement('product_detail');
  const candidates = allProducts.filter((p) => p.id !== productId && (p.stock === undefined || p.stock > 0));

  const scored = candidates.map((candidate) => {
    const breakdown = scoreCandidate(anchor, candidate, weights);
    const bundleMatch = findBundleMatch([productId], candidate.id, bundles);

    let strategy = detectStrategy(anchor, candidate, breakdown);
    let savingsText: string | undefined;
    let bundleId: string | undefined;

    // Bundle match overrides strategy and adds savings text
    if (bundleMatch) {
      strategy = 'bundle_match';
      savingsText = `Save ${bundleMatch.savingsPercent}%`;
      bundleId = bundleMatch.id;
      // Boost score for bundle matches
      breakdown.totalScore = Math.min(1, breakdown.totalScore + 0.15);
    }

    const reason = generateReason(strategy, anchor, candidate);

    return {
      product: candidate,
      strategy,
      reason,
      savingsText,
      confidenceScore: breakdown.totalScore,
      bundleId,
      scoreBreakdown: breakdown,
    } satisfies UpsellSuggestion;
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // Diversify: don't show all same category
  const suggestions = diversifySuggestions(scored, maxResults);

  logger.info('[UPSELL_ENGINE] Product upsells generated', {
    productId,
    orgId,
    candidatesScored: candidates.length,
    suggestionsReturned: suggestions.length,
  });

  return {
    suggestions,
    placement: 'product_detail',
    generatedAt: Date.now(),
  };
}

/**
 * Get upsell suggestions for cart contents.
 */
export async function getCartUpsells(
  cartItemIds: string[],
  orgId: string,
  options?: { maxResults?: number }
): Promise<UpsellResult> {
  const maxResults = options?.maxResults ?? 2;
  const allProducts = await fetchOrgProducts(orgId);
  const bundles = await fetchActiveBundles(orgId);

  const cartProducts = allProducts.filter((p) => cartItemIds.includes(p.id));
  if (cartProducts.length === 0) {
    return { suggestions: [], placement: 'cart', generatedAt: Date.now() };
  }

  const weights = getWeightsForPlacement('cart');
  const excludeSet = new Set(cartItemIds);
  const candidates = allProducts.filter((p) => !excludeSet.has(p.id) && (p.stock === undefined || p.stock > 0));

  const scored = candidates.map((candidate) => {
    const breakdown = scoreCandidate(cartProducts, candidate, weights);
    const bundleMatch = findBundleMatch(cartItemIds, candidate.id, bundles);

    let strategy = detectStrategy(cartProducts, candidate, breakdown);
    let savingsText: string | undefined;
    let bundleId: string | undefined;

    if (bundleMatch) {
      strategy = 'bundle_match';
      savingsText = `Save ${bundleMatch.savingsPercent}%`;
      bundleId = bundleMatch.id;
      breakdown.totalScore = Math.min(1, breakdown.totalScore + 0.15);
    }

    const reason = generateReason(strategy, cartProducts, candidate);

    return {
      product: candidate,
      strategy,
      reason,
      savingsText,
      confidenceScore: breakdown.totalScore,
      bundleId,
      scoreBreakdown: breakdown,
    } satisfies UpsellSuggestion;
  });

  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const suggestions = diversifySuggestions(scored, maxResults);

  logger.info('[UPSELL_ENGINE] Cart upsells generated', {
    cartItems: cartItemIds.length,
    orgId,
    suggestionsReturned: suggestions.length,
  });

  return {
    suggestions,
    placement: 'cart',
    generatedAt: Date.now(),
  };
}

/**
 * Get upsell suggestions for checkout (last-chance, high-margin focus).
 */
export async function getCheckoutUpsells(
  cartItemIds: string[],
  orgId: string,
  options?: { maxResults?: number }
): Promise<UpsellResult> {
  const maxResults = options?.maxResults ?? 2;
  const allProducts = await fetchOrgProducts(orgId);

  const cartProducts = allProducts.filter((p) => cartItemIds.includes(p.id));
  if (cartProducts.length === 0) {
    return { suggestions: [], placement: 'checkout', generatedAt: Date.now() };
  }

  const weights = getWeightsForPlacement('checkout');
  const excludeSet = new Set(cartItemIds);
  const candidates = allProducts.filter((p) => !excludeSet.has(p.id) && (p.stock === undefined || p.stock > 0));

  const scored = candidates.map((candidate) => {
    const breakdown = scoreCandidate(cartProducts, candidate, weights);
    const strategy = detectStrategy(cartProducts, candidate, breakdown);
    const reason = generateReason(strategy, cartProducts, candidate);

    return {
      product: candidate,
      strategy,
      reason,
      confidenceScore: breakdown.totalScore,
      scoreBreakdown: breakdown,
    } satisfies UpsellSuggestion;
  });

  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const suggestions = diversifySuggestions(scored, maxResults);

  logger.info('[UPSELL_ENGINE] Checkout upsells generated', {
    cartItems: cartItemIds.length,
    orgId,
    suggestionsReturned: suggestions.length,
  });

  return {
    suggestions,
    placement: 'checkout',
    generatedAt: Date.now(),
  };
}

/**
 * Get upsell suggestions for Smokey chatbot (conversational context).
 */
export async function getChatbotUpsells(
  productId: string,
  orgId: string,
  options?: { maxResults?: number; cartItemIds?: string[] }
): Promise<UpsellResult> {
  const maxResults = options?.maxResults ?? 1;
  const excludeIds = [productId, ...(options?.cartItemIds || [])];

  const allProducts = await fetchOrgProducts(orgId);
  const bundles = await fetchActiveBundles(orgId);

  const anchor = allProducts.find((p) => p.id === productId);
  if (!anchor) {
    return { suggestions: [], placement: 'chatbot', generatedAt: Date.now() };
  }

  const weights = getWeightsForPlacement('chatbot');
  const excludeSet = new Set(excludeIds);
  const candidates = allProducts.filter((p) => !excludeSet.has(p.id) && (p.stock === undefined || p.stock > 0));

  const scored = candidates.map((candidate) => {
    const breakdown = scoreCandidate(anchor, candidate, weights);
    const bundleMatch = findBundleMatch([productId], candidate.id, bundles);

    let strategy = detectStrategy(anchor, candidate, breakdown);
    let savingsText: string | undefined;
    let bundleId: string | undefined;

    if (bundleMatch) {
      strategy = 'bundle_match';
      savingsText = `Save ${bundleMatch.savingsPercent}%`;
      bundleId = bundleMatch.id;
      breakdown.totalScore = Math.min(1, breakdown.totalScore + 0.15);
    }

    const reason = generateReason(strategy, anchor, candidate);

    return {
      product: candidate,
      strategy,
      reason,
      savingsText,
      confidenceScore: breakdown.totalScore,
      bundleId,
      scoreBreakdown: breakdown,
    } satisfies UpsellSuggestion;
  });

  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return {
    suggestions: scored.slice(0, maxResults),
    placement: 'chatbot',
    generatedAt: Date.now(),
  };
}

// --- Helpers ---

/**
 * Diversify suggestions to avoid showing all same-category products.
 * Ensures at least one cross-category suggestion when possible.
 */
function diversifySuggestions(sorted: UpsellSuggestion[], maxResults: number): UpsellSuggestion[] {
  if (sorted.length <= maxResults) return sorted;

  const result: UpsellSuggestion[] = [];
  const seenCategories = new Set<string>();

  // First pass: take highest-scoring per unique category
  for (const suggestion of sorted) {
    if (result.length >= maxResults) break;
    if (!seenCategories.has(suggestion.product.category)) {
      result.push(suggestion);
      seenCategories.add(suggestion.product.category);
    }
  }

  // Second pass: fill remaining slots with highest-scoring overall
  if (result.length < maxResults) {
    const resultIds = new Set(result.map((s) => s.product.id));
    for (const suggestion of sorted) {
      if (result.length >= maxResults) break;
      if (!resultIds.has(suggestion.product.id)) {
        result.push(suggestion);
      }
    }
  }

  return result;
}
