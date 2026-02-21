'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { BundleDeal, BundleProduct } from '@/types/bundles';
import { createBundle } from '@/app/actions/bundles';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

export interface ProductWithInventory {
    id: string;
    name: string;
    category: string;
    price: number;
    cost?: number; // COGS for margin calculation
    stock?: number;
    expirationDate?: Date;
    daysUntilExpiration?: number;
    strainType?: string;
    thcPercent?: number;
    effects?: string[];
}

export interface SuggestedBundle {
    name: string;
    description: string;
    products: ProductWithInventory[];
    savingsPercent: number;
    badgeText?: string;
    marginImpact?: number; // Estimated margin after discount
    ruleId?: string; // Reference to the rule that created this
}

export interface BundleRule {
    id: string;
    name: string;
    description: string;
    naturalLanguageRule: string; // User's original prompt
    conditions: BundleCondition[];
    action: BundleAction;
    minMarginPercent: number; // Minimum allowed margin (default 15%)
    isActive: boolean;
    createdAt: Date;
}

export interface BundleCondition {
    field: 'daysUntilExpiration' | 'stock' | 'category' | 'price' | 'strainType' | 'thcPercent';
    operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte' | 'in' | 'between';
    value: string | number | string[] | [number, number];
}

export interface BundleAction {
    type: 'percentage_discount' | 'fixed_price' | 'bogo';
    value: number; // Discount percentage or fixed price
    minProducts?: number;
    maxProducts?: number;
}

export interface InventoryInsights {
    totalProducts: number;
    expiringProducts: ProductWithInventory[];
    lowStockProducts: ProductWithInventory[];
    highStockProducts: ProductWithInventory[];
    categoryBreakdown: Record<string, number>;
    avgMargin: number;
}

/**
 * Fetch products for an organization (works for both brands and dispensaries)
 * Checks both legacy products collection and tenant catalog
 */
async function fetchOrgProducts(orgId: string): Promise<ProductWithInventory[]> {
    const db = getAdminFirestore();
    const now = new Date();

    // Helper to map product data to ProductWithInventory
    const mapProductData = (id: string, data: FirebaseFirestore.DocumentData): ProductWithInventory => {
        const expirationDate = data.expirationDate?.toDate?.() || data.expirationDate;
        let daysUntilExpiration: number | undefined;

        if (expirationDate instanceof Date) {
            daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
            id,
            name: data.name || 'Unknown',
            category: data.category || 'Other',
            price: data.price || 0,
            cost: data.cost,
            stock: data.stock ?? data.quantity,
            expirationDate,
            daysUntilExpiration,
            strainType: data.strainType,
            thcPercent: data.thcPercent,
            effects: data.effects || [],
        };
    };

    // 1. Try brandId in legacy products collection
    let snapshot = await db.collection('products')
        .where('brandId', '==', orgId)
        .limit(200)
        .get();

    if (!snapshot.empty) {
        return snapshot.docs.map(doc => mapProductData(doc.id, doc.data()));
    }

    // 2. Try dispensaryId in legacy products collection
    snapshot = await db.collection('products')
        .where('dispensaryId', '==', orgId)
        .limit(200)
        .get();

    if (!snapshot.empty) {
        return snapshot.docs.map(doc => mapProductData(doc.id, doc.data()));
    }

    // 3. Try tenant catalog (tenants/{orgId}/publicViews/products/items)
    // This is where Alleaves-synced products are stored for dispensaries like Thrive Syracuse
    const tenantCatalog = await db.collection(`tenants/${orgId}/publicViews/products/items`)
        .limit(200)
        .get();

    if (!tenantCatalog.empty) {
        logger.info(`[fetchOrgProducts] Found ${tenantCatalog.size} products in tenant catalog for ${orgId}`);
        return tenantCatalog.docs.map(doc => mapProductData(doc.id, doc.data()));
    }

    // 4. If orgId might be a brand doc ID, try to find the brand and get its orgId
    if (!orgId.startsWith('org_')) {
        const brandDoc = await db.collection('brands').doc(orgId).get();
        if (brandDoc.exists) {
            const brandOrgId = brandDoc.data()?.orgId;
            if (brandOrgId && brandOrgId !== orgId) {
                const brandTenantCatalog = await db.collection(`tenants/${brandOrgId}/publicViews/products/items`)
                    .limit(200)
                    .get();
                if (!brandTenantCatalog.empty) {
                    logger.info(`[fetchOrgProducts] Found ${brandTenantCatalog.size} products via brand orgId ${brandOrgId}`);
                    return brandTenantCatalog.docs.map(doc => mapProductData(doc.id, doc.data()));
                }
            }
        }
    }

    return [];
}

/**
 * Calculate margin for a bundle
 */
function calculateBundleMargin(products: ProductWithInventory[], discountPercent: number): number {
    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
    const totalCost = products.reduce((sum, p) => sum + (p.cost || p.price * 0.5), 0); // Assume 50% cost if unknown
    const discountedPrice = totalPrice * (1 - discountPercent / 100);
    const margin = ((discountedPrice - totalCost) / discountedPrice) * 100;
    return Math.round(margin * 10) / 10;
}

/**
 * Get inventory insights for generating data-driven presets
 */
export async function getInventoryInsights(orgId: string): Promise<{ success: boolean; insights?: InventoryInsights; error?: string }> {
    try {
        const products = await fetchOrgProducts(orgId);

        if (products.length === 0) {
            return { success: false, error: 'No products found' };
        }

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Categorize products
        const expiringProducts = products.filter(p =>
            p.daysUntilExpiration !== undefined && p.daysUntilExpiration > 0 && p.daysUntilExpiration <= 45
        ).sort((a, b) => (a.daysUntilExpiration || 999) - (b.daysUntilExpiration || 999));

        const lowStockProducts = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 10);
        const highStockProducts = products.filter(p => p.stock !== undefined && p.stock >= 50);

        // Category breakdown
        const categoryBreakdown: Record<string, number> = {};
        for (const p of products) {
            categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + 1;
        }

        // Average margin
        const productsWithCost = products.filter(p => p.cost !== undefined);
        const avgMargin = productsWithCost.length > 0
            ? productsWithCost.reduce((sum, p) => {
                const margin = ((p.price - (p.cost || 0)) / p.price) * 100;
                return sum + margin;
            }, 0) / productsWithCost.length
            : 40; // Default assumption

        return {
            success: true,
            insights: {
                totalProducts: products.length,
                expiringProducts: expiringProducts.slice(0, 20),
                lowStockProducts: lowStockProducts.slice(0, 20),
                highStockProducts: highStockProducts.slice(0, 20),
                categoryBreakdown,
                avgMargin: Math.round(avgMargin * 10) / 10,
            }
        };
    } catch (error) {
        logger.error('Error getting inventory insights:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to analyze inventory' };
    }
}

/**
 * Generate AI-suggested bundles based on existing products
 */
export async function generateAIBundleSuggestions(orgId: string): Promise<{ success: boolean; suggestions?: SuggestedBundle[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const products = await fetchOrgProducts(orgId);

        if (products.length === 0) {
            return { success: false, error: 'No products found to create bundles from.' };
        }

        // Group products by category
        const byCategory: Record<string, ProductWithInventory[]> = {};
        for (const p of products) {
            if (!byCategory[p.category]) byCategory[p.category] = [];
            byCategory[p.category].push(p);
        }

        const suggestions: SuggestedBundle[] = [];
        const MIN_MARGIN = 15; // Minimum 15% margin protection

        // Strategy 1: Category Bundle (3 items from same category)
        for (const [category, prods] of Object.entries(byCategory)) {
            if (prods.length >= 3) {
                const selected = prods.slice(0, 3);
                let discountPercent = 15;

                // Check margin and adjust discount if needed
                let margin = calculateBundleMargin(selected, discountPercent);
                while (margin < MIN_MARGIN && discountPercent > 5) {
                    discountPercent -= 2;
                    margin = calculateBundleMargin(selected, discountPercent);
                }

                if (margin >= MIN_MARGIN) {
                    suggestions.push({
                        name: `${category} Sampler`,
                        description: `Try our best ${category.toLowerCase()} products together!`,
                        products: selected,
                        savingsPercent: discountPercent,
                        badgeText: 'POPULAR',
                        marginImpact: margin,
                    });
                }
            }
        }

        // Strategy 2: Starter Pack (cheapest items from different categories)
        const allCategories = Object.keys(byCategory);
        if (allCategories.length >= 2) {
            const starterProducts: ProductWithInventory[] = [];
            for (const cat of allCategories.slice(0, 3)) {
                const sorted = byCategory[cat].sort((a, b) => a.price - b.price);
                if (sorted[0]) starterProducts.push(sorted[0]);
            }
            if (starterProducts.length >= 2) {
                let discountPercent = 20;
                let margin = calculateBundleMargin(starterProducts, discountPercent);
                while (margin < MIN_MARGIN && discountPercent > 5) {
                    discountPercent -= 2;
                    margin = calculateBundleMargin(starterProducts, discountPercent);
                }

                if (margin >= MIN_MARGIN) {
                    suggestions.push({
                        name: 'Starter Pack',
                        description: 'Perfect for first-time buyers. A little bit of everything!',
                        products: starterProducts,
                        savingsPercent: discountPercent,
                        badgeText: 'NEW USER',
                        marginImpact: margin,
                    });
                }
            }
        }

        // Strategy 3: Premium Bundle (most expensive items)
        const sortedByPrice = [...products].sort((a, b) => b.price - a.price);
        if (sortedByPrice.length >= 3) {
            const premiumProducts = sortedByPrice.slice(0, 3);
            let discountPercent = 10;
            let margin = calculateBundleMargin(premiumProducts, discountPercent);
            while (margin < MIN_MARGIN && discountPercent > 5) {
                discountPercent -= 2;
                margin = calculateBundleMargin(premiumProducts, discountPercent);
            }

            if (margin >= MIN_MARGIN) {
                suggestions.push({
                    name: 'Premium Experience',
                    description: 'Our top-shelf products in one exclusive bundle.',
                    products: premiumProducts,
                    savingsPercent: discountPercent,
                    badgeText: 'PREMIUM',
                    marginImpact: margin,
                });
            }
        }

        // Strategy 4: Expiring Soon Bundle (if products have expiration data)
        const expiringProducts = products.filter(p =>
            p.daysUntilExpiration !== undefined && p.daysUntilExpiration > 0 && p.daysUntilExpiration <= 45
        );
        if (expiringProducts.length >= 2) {
            const expiringSoon = expiringProducts.slice(0, 4);
            let discountPercent = 25; // Higher discount for expiring products
            let margin = calculateBundleMargin(expiringSoon, discountPercent);
            while (margin < MIN_MARGIN && discountPercent > 10) {
                discountPercent -= 2;
                margin = calculateBundleMargin(expiringSoon, discountPercent);
            }

            if (margin >= MIN_MARGIN) {
                suggestions.push({
                    name: 'Fresh Finds Bundle',
                    description: 'Great products at special prices - grab them while they last!',
                    products: expiringSoon,
                    savingsPercent: discountPercent,
                    badgeText: 'LIMITED TIME',
                    marginImpact: margin,
                });
            }
        }

        // Strategy 5: High Stock Clearance (if stock data available)
        const highStockProducts = products.filter(p => p.stock !== undefined && p.stock >= 50);
        if (highStockProducts.length >= 2) {
            const clearanceProducts = highStockProducts.slice(0, 3);
            let discountPercent = 20;
            let margin = calculateBundleMargin(clearanceProducts, discountPercent);
            while (margin < MIN_MARGIN && discountPercent > 10) {
                discountPercent -= 2;
                margin = calculateBundleMargin(clearanceProducts, discountPercent);
            }

            if (margin >= MIN_MARGIN) {
                suggestions.push({
                    name: 'Stock Up & Save',
                    description: 'Our most stocked items bundled for maximum savings!',
                    products: clearanceProducts,
                    savingsPercent: discountPercent,
                    badgeText: 'BEST VALUE',
                    marginImpact: margin,
                });
            }
        }

        return { success: true, suggestions };
    } catch (error) {
        logger.error('Error generating bundle suggestions:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate suggestions' };
    }
}

/**
 * Create a draft bundle from a suggestion
 */
export async function createBundleFromSuggestion(
    orgId: string,
    suggestion: SuggestedBundle & { customPrice?: number }
): Promise<{ success: boolean; data?: BundleDeal; error?: string }> {
    try {
        const bundleProducts: BundleProduct[] = suggestion.products.map(p => ({
            productId: p.id,
            name: p.name,
            category: p.category,
            requiredQty: 1,
            originalPrice: p.price,
        }));

        const originalTotal = suggestion.products.reduce((sum, p) => sum + p.price, 0);

        // Use custom price if provided, otherwise calculate from savings percent
        let bundlePrice: number;
        let savingsPercent: number;
        let savingsAmount: number;

        if (suggestion.customPrice !== undefined) {
            bundlePrice = suggestion.customPrice;
            savingsAmount = Math.round((originalTotal - bundlePrice) * 100) / 100;
            savingsPercent = originalTotal > 0 ? Math.round((savingsAmount / originalTotal) * 100) : 0;
        } else {
            bundlePrice = originalTotal * (1 - suggestion.savingsPercent / 100);
            savingsAmount = Math.round((originalTotal - bundlePrice) * 100) / 100;
            savingsPercent = suggestion.savingsPercent;
        }

        const result = await createBundle({
            name: suggestion.name,
            description: suggestion.description,
            type: 'mix_match',
            status: 'draft', // User can review and activate
            orgId,
            products: bundleProducts,
            originalTotal,
            bundlePrice: Math.round(bundlePrice * 100) / 100,
            savingsAmount,
            savingsPercent,
            badgeText: suggestion.badgeText,
            featured: false,
        });

        return result;
    } catch (error) {
        logger.error('Error creating bundle from suggestion:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to create bundle' };
    }
}

/**
 * Parse natural language bundle rule and generate matching bundles
 * Examples:
 * - "If a product is within 30-45 days of expiration, create a 20% off bundle"
 * - "Bundle products over $50 with a 15% discount"
 * - "Create a BOGO deal for all edibles"
 */
export async function parseNaturalLanguageRule(
    orgId: string,
    naturalLanguageRule: string,
    minMarginPercent: number = 15
): Promise<{ success: boolean; suggestions?: SuggestedBundle[]; parsedRule?: BundleRule; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');
        if (!naturalLanguageRule.trim()) throw new Error('Please describe your bundle rule');

        const products = await fetchOrgProducts(orgId);
        if (products.length === 0) {
            return { success: false, error: 'No products found. Add products to your catalog first.' };
        }

        // Get inventory insights for context
        const insightsResult = await getInventoryInsights(orgId);
        const insights = insightsResult.insights;

        // Use Claude to parse the natural language rule
        const systemPrompt = `You are a bundle rule parser for a cannabis dispensary inventory system.
Parse the user's natural language bundle rule and extract:
1. Conditions (what products to include)
2. Action (what discount/bundle type to create)

Available product fields:
- daysUntilExpiration: number (days until product expires)
- stock: number (current inventory count)
- category: string (e.g., Flower, Edibles, Vape, Pre-roll, Concentrate)
- price: number (product price)
- strainType: string (Indica, Sativa, Hybrid)
- thcPercent: number (THC percentage)

Respond with ONLY valid JSON in this exact format:
{
  "conditions": [
    {"field": "daysUntilExpiration", "operator": "between", "value": [30, 45]}
  ],
  "action": {
    "type": "percentage_discount",
    "value": 20,
    "minProducts": 2,
    "maxProducts": 5
  },
  "bundleName": "Expiring Soon Bundle",
  "bundleDescription": "Great savings on products expiring soon!",
  "badgeText": "SAVE 20%"
}

Operators: lt (less than), gt (greater than), eq (equals), lte, gte, in (for arrays), between (for ranges)
Action types: percentage_discount, fixed_price, bogo`;

        const userPrompt = `Parse this bundle rule: "${naturalLanguageRule}"

Current inventory context:
- Total products: ${insights?.totalProducts || products.length}
- Products expiring within 45 days: ${insights?.expiringProducts?.length || 0}
- Low stock products (<=10): ${insights?.lowStockProducts?.length || 0}
- High stock products (>=50): ${insights?.highStockProducts?.length || 0}
- Categories: ${Object.keys(insights?.categoryBreakdown || {}).join(', ')}
- Average margin: ${insights?.avgMargin || 40}%

IMPORTANT: The minimum margin allowed is ${minMarginPercent}%. If the requested discount would push margins below this, suggest a lower discount.`;

        const { text: responseText } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-lite',
            system: systemPrompt,
            prompt: userPrompt,
        });

        // Parse the AI response
        let parsedRule;
        try {
            // Extract JSON from the response (handle potential markdown code blocks)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }
            parsedRule = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('Failed to parse AI response:', parseError instanceof Error ? parseError : new Error(String(parseError)));
            return { success: false, error: 'Could not understand your bundle rule. Please try rephrasing.' };
        }

        // Apply the parsed conditions to filter products
        let matchingProducts = [...products];

        for (const condition of parsedRule.conditions || []) {
            matchingProducts = matchingProducts.filter(p => {
                const fieldValue = (p as unknown as Record<string, unknown>)[condition.field];
                if (fieldValue === undefined) return false;

                switch (condition.operator) {
                    case 'lt': return Number(fieldValue) < Number(condition.value);
                    case 'gt': return Number(fieldValue) > Number(condition.value);
                    case 'lte': return Number(fieldValue) <= Number(condition.value);
                    case 'gte': return Number(fieldValue) >= Number(condition.value);
                    case 'eq': return fieldValue === condition.value;
                    case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
                    case 'between':
                        if (!Array.isArray(condition.value) || condition.value.length !== 2) return false;
                        const [min, max] = condition.value as [number, number];
                        return Number(fieldValue) >= min && Number(fieldValue) <= max;
                    default: return true;
                }
            });
        }

        if (matchingProducts.length === 0) {
            return {
                success: false,
                error: `No products match your criteria. Try adjusting your rule or check that your products have the required data (e.g., expiration dates, stock levels).`
            };
        }

        // Generate bundle suggestions with margin protection
        const suggestions: SuggestedBundle[] = [];
        const action = parsedRule.action || { type: 'percentage_discount', value: 15 };
        const minProducts = action.minProducts || 2;
        const maxProducts = Math.min(action.maxProducts || 5, matchingProducts.length);

        // Create bundles of appropriate size
        for (let size = minProducts; size <= maxProducts && size <= matchingProducts.length; size++) {
            const bundleProducts = matchingProducts.slice(0, size);
            let discountPercent = action.type === 'bogo' ? 50 : (action.value || 15);

            // Margin protection: reduce discount if it would push below minimum
            let margin = calculateBundleMargin(bundleProducts, discountPercent);
            while (margin < minMarginPercent && discountPercent > 5) {
                discountPercent -= 2;
                margin = calculateBundleMargin(bundleProducts, discountPercent);
            }

            if (margin >= minMarginPercent) {
                suggestions.push({
                    name: `${parsedRule.bundleName || 'Custom Bundle'} (${size} items)`,
                    description: parsedRule.bundleDescription || 'Custom bundle based on your rule',
                    products: bundleProducts,
                    savingsPercent: discountPercent,
                    badgeText: parsedRule.badgeText || `SAVE ${discountPercent}%`,
                    marginImpact: margin,
                    ruleId: `rule_${Date.now()}`,
                });
                break; // Only create one suggestion per rule for now
            }
        }

        if (suggestions.length === 0) {
            return {
                success: false,
                error: `Cannot create a bundle that maintains the ${minMarginPercent}% minimum margin. Try a smaller discount or different products.`
            };
        }

        // Construct the parsed rule for reference
        const fullParsedRule: BundleRule = {
            id: `rule_${Date.now()}`,
            name: parsedRule.bundleName || 'Custom Rule',
            description: parsedRule.bundleDescription || '',
            naturalLanguageRule,
            conditions: parsedRule.conditions || [],
            action: parsedRule.action || { type: 'percentage_discount', value: 15 },
            minMarginPercent,
            isActive: false,
            createdAt: new Date(),
        };

        return {
            success: true,
            suggestions,
            parsedRule: fullParsedRule,
        };
    } catch (error) {
        logger.error('Error parsing natural language rule:', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse bundle rule'
        };
    }
}

/**
 * Get smart preset prompts based on actual inventory data
 */
export async function getSmartPresets(orgId: string): Promise<{ success: boolean; presets?: Array<{ label: string; prompt: string; icon: string; available: boolean; reason?: string }>; error?: string }> {
    try {
        const insightsResult = await getInventoryInsights(orgId);
        if (!insightsResult.success || !insightsResult.insights) {
            return { success: false, error: insightsResult.error || 'Could not analyze inventory' };
        }

        const insights = insightsResult.insights;
        const presets: Array<{ label: string; prompt: string; icon: string; available: boolean; reason?: string }> = [];

        // Expiration-based presets
        if (insights.expiringProducts.length > 0) {
            const days = insights.expiringProducts[0].daysUntilExpiration || 30;
            presets.push({
                label: `${insights.expiringProducts.length} Products Expiring Soon`,
                prompt: `Create a bundle with products expiring in the next ${Math.min(days + 15, 45)} days with a 20% discount`,
                icon: 'clock',
                available: true,
            });
        } else {
            presets.push({
                label: 'Expiring Products Bundle',
                prompt: 'Bundle products within 30-45 days of expiration with 20% off',
                icon: 'clock',
                available: false,
                reason: 'No products with expiration dates in the next 45 days',
            });
        }

        // Stock-based presets
        if (insights.highStockProducts.length >= 2) {
            presets.push({
                label: `Clear ${insights.highStockProducts.length} Overstocked Items`,
                prompt: 'Bundle high-stock products (50+ units) with a 25% discount to move inventory',
                icon: 'package',
                available: true,
            });
        }

        if (insights.lowStockProducts.length > 0 && insights.lowStockProducts.length <= 10) {
            presets.push({
                label: 'Last Chance Bundle',
                prompt: 'Create a premium bundle with low-stock items (under 10 units) at 10% off',
                icon: 'alert-triangle',
                available: true,
            });
        }

        // Category-based presets
        const categories = Object.entries(insights.categoryBreakdown);
        for (const [category, count] of categories.slice(0, 3)) {
            if (count >= 3) {
                presets.push({
                    label: `${category} Sampler`,
                    prompt: `Bundle 3 ${category.toLowerCase()} products together with 15% off`,
                    icon: 'layers',
                    available: true,
                });
            }
        }

        // Margin-safe presets
        if (insights.avgMargin > 30) {
            presets.push({
                label: 'Maximum Savings Bundle',
                prompt: 'Create the highest discount bundle possible while maintaining 15% margin',
                icon: 'percent',
                available: true,
            });
        }

        // Add a generic starter preset if we have enough products
        if (insights.totalProducts >= 6) {
            presets.push({
                label: 'Starter Pack',
                prompt: 'Create a starter pack with one item from each category at 20% off for new customers',
                icon: 'gift',
                available: true,
            });
        }

        return { success: true, presets };
    } catch (error) {
        logger.error('Error generating smart presets:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate presets' };
    }
}
