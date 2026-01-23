'use server';

/**
 * Carousel AI Suggestions
 *
 * Uses natural language processing to create carousel configurations
 * based on inventory data and competitive intelligence from Ezal.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Carousel } from '@/types/carousels';
import { createCarousel } from '@/app/actions/carousels';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';
import type { ProductWithInventory } from '@/app/actions/bundle-suggestions';

export interface CarouselInsights {
    totalProducts: number;
    topCategories: Array<{ category: string; count: number }>;
    featuredProducts: ProductWithInventory[];
    newArrivals: ProductWithInventory[];
    topSellers: ProductWithInventory[];
    lowStockItems: ProductWithInventory[];
    highMarginProducts: ProductWithInventory[];
    competitorTrends?: CompetitorTrend[];
}

export interface CompetitorTrend {
    trend: string;
    description: string;
    relevantProducts: string[];
    source: string;
}

export interface SuggestedCarousel {
    title: string;
    description: string;
    products: ProductWithInventory[];
    rationale: string;
    source: 'inventory' | 'competitive' | 'ai';
    priority: 'high' | 'medium' | 'low';
}

/**
 * Fetch products for an organization (works for both brands and dispensaries)
 */
async function fetchOrgProducts(orgId: string): Promise<ProductWithInventory[]> {
    const db = getAdminFirestore();

    // Try brandId first
    let snapshot = await db.collection('products')
        .where('brandId', '==', orgId)
        .limit(200)
        .get();

    // If no results, try dispensaryId
    if (snapshot.empty) {
        snapshot = await db.collection('products')
            .where('dispensaryId', '==', orgId)
            .limit(200)
            .get();
    }

    if (snapshot.empty) {
        return [];
    }

    const now = new Date();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const expirationDate = data.expirationDate?.toDate?.() || data.expirationDate;
        let daysUntilExpiration: number | undefined;

        if (expirationDate instanceof Date) {
            daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
            id: doc.id,
            name: data.name || 'Unknown',
            category: data.category || 'Other',
            price: data.price || 0,
            cost: data.cost,
            stock: data.stock,
            expirationDate,
            daysUntilExpiration,
            strainType: data.strainType,
            thcPercent: data.thcPercent,
            effects: data.effects || [],
            featured: data.featured,
            sortOrder: data.sortOrder,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
    });
}

/**
 * Fetch competitive intelligence from Ezal snapshots
 */
async function fetchCompetitorInsights(orgId: string): Promise<CompetitorTrend[]> {
    const db = getAdminFirestore();
    const trends: CompetitorTrend[] = [];

    try {
        // Get recent competitor snapshots for this tenant
        const snapshotsQuery = await db.collection('competitor_snapshots')
            .where('tenantId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (!snapshotsQuery.empty) {
            const categories = new Set<string>();
            const promotedProducts: string[] = [];
            const priceTrends: string[] = [];

            for (const doc of snapshotsQuery.docs) {
                const data = doc.data();

                // Extract trending categories from competitor data
                if (data.categories) {
                    Object.keys(data.categories).forEach(cat => categories.add(cat));
                }

                // Look for promotional/featured items
                if (data.featuredProducts) {
                    promotedProducts.push(...data.featuredProducts.map((p: { name: string }) => p.name));
                }

                // Track price changes
                if (data.priceChanges) {
                    priceTrends.push(...data.priceChanges);
                }
            }

            // Create trend insights
            if (categories.size > 0) {
                trends.push({
                    trend: 'Popular Categories',
                    description: `Competitors are featuring: ${Array.from(categories).slice(0, 5).join(', ')}`,
                    relevantProducts: [],
                    source: 'Ezal Competitive Intel',
                });
            }

            if (promotedProducts.length > 0) {
                trends.push({
                    trend: 'Hot Products',
                    description: `Trending items across competitors: ${promotedProducts.slice(0, 5).join(', ')}`,
                    relevantProducts: promotedProducts.slice(0, 10),
                    source: 'Ezal Market Analysis',
                });
            }
        }

        // Also check for intel reports
        const reportsQuery = await db.collection('intel_reports')
            .where('tenantId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (!reportsQuery.empty) {
            for (const doc of reportsQuery.docs) {
                const data = doc.data();
                if (data.insights && Array.isArray(data.insights)) {
                    for (const insight of data.insights.slice(0, 3)) {
                        trends.push({
                            trend: insight.title || 'Market Insight',
                            description: insight.description || insight.summary,
                            relevantProducts: insight.products || [],
                            source: 'Ezal Weekly Report',
                        });
                    }
                }
            }
        }
    } catch (error) {
        logger.error('Error fetching competitor insights:', error instanceof Error ? error : new Error(String(error)));
    }

    return trends;
}

/**
 * Get inventory insights for carousel recommendations
 */
export async function getCarouselInsights(orgId: string): Promise<{ success: boolean; insights?: CarouselInsights; error?: string }> {
    try {
        const products = await fetchOrgProducts(orgId);

        if (products.length === 0) {
            return { success: false, error: 'No products found' };
        }

        // Category breakdown
        const categoryCount: Record<string, number> = {};
        for (const p of products) {
            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
        }
        const topCategories = Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));

        // Featured products (marked as featured)
        const featuredProducts = products.filter(p => (p as { featured?: boolean }).featured).slice(0, 10);

        // New arrivals (most recent createdAt)
        const newArrivals = [...products]
            .filter(p => (p as { createdAt?: Date }).createdAt)
            .sort((a, b) => {
                const aDate = (a as { createdAt?: Date }).createdAt;
                const bDate = (b as { createdAt?: Date }).createdAt;
                if (!aDate || !bDate) return 0;
                return new Date(bDate).getTime() - new Date(aDate).getTime();
            })
            .slice(0, 10);

        // Top sellers (by sortOrder if available, otherwise by price - higher price = premium)
        const topSellers = [...products]
            .filter(p => (p as { sortOrder?: number }).sortOrder !== undefined)
            .sort((a, b) => ((a as { sortOrder?: number }).sortOrder || 999) - ((b as { sortOrder?: number }).sortOrder || 999))
            .slice(0, 10);

        // Low stock items
        const lowStockItems = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 10).slice(0, 10);

        // High margin products
        const highMarginProducts = products
            .filter(p => p.cost !== undefined && p.price > 0)
            .map(p => ({ ...p, margin: ((p.price - (p.cost || 0)) / p.price) * 100 }))
            .filter(p => p.margin > 40)
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 10);

        // Fetch competitive intelligence
        const competitorTrends = await fetchCompetitorInsights(orgId);

        return {
            success: true,
            insights: {
                totalProducts: products.length,
                topCategories,
                featuredProducts,
                newArrivals,
                topSellers: topSellers.length > 0 ? topSellers : [...products].sort((a, b) => b.price - a.price).slice(0, 10),
                lowStockItems,
                highMarginProducts,
                competitorTrends,
            }
        };
    } catch (error) {
        logger.error('Error getting carousel insights:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to analyze inventory' };
    }
}

/**
 * Generate AI-suggested carousels based on inventory and competitive data
 */
export async function generateAICarouselSuggestions(orgId: string): Promise<{ success: boolean; suggestions?: SuggestedCarousel[]; error?: string }> {
    try {
        const insightsResult = await getCarouselInsights(orgId);
        if (!insightsResult.success || !insightsResult.insights) {
            return { success: false, error: insightsResult.error || 'Could not analyze inventory' };
        }

        const insights = insightsResult.insights;
        const suggestions: SuggestedCarousel[] = [];

        // Strategy 1: Featured Products Carousel
        if (insights.featuredProducts.length >= 3) {
            suggestions.push({
                title: 'Staff Picks',
                description: 'Hand-selected favorites from our team',
                products: insights.featuredProducts.slice(0, 8),
                rationale: `${insights.featuredProducts.length} products marked as featured in your catalog`,
                source: 'inventory',
                priority: 'high',
            });
        }

        // Strategy 2: New Arrivals
        if (insights.newArrivals.length >= 3) {
            suggestions.push({
                title: 'Just Dropped',
                description: 'Fresh additions to our menu',
                products: insights.newArrivals.slice(0, 8),
                rationale: 'Showcasing your newest products keeps the menu fresh',
                source: 'inventory',
                priority: 'high',
            });
        }

        // Strategy 3: Category-specific carousels
        for (const { category, count } of insights.topCategories.slice(0, 3)) {
            if (count >= 4) {
                const categoryProducts = (await fetchOrgProducts(orgId))
                    .filter(p => p.category === category)
                    .slice(0, 8);

                suggestions.push({
                    title: `Top ${category}`,
                    description: `Our best ${category.toLowerCase()} selection`,
                    products: categoryProducts,
                    rationale: `${count} products in ${category} - your largest category`,
                    source: 'inventory',
                    priority: 'medium',
                });
            }
        }

        // Strategy 4: High Margin Products (for revenue optimization)
        if (insights.highMarginProducts.length >= 3) {
            suggestions.push({
                title: 'Premium Selection',
                description: 'Top-shelf quality for the discerning customer',
                products: insights.highMarginProducts.slice(0, 8),
                rationale: 'These products have your highest margins - featuring them can boost profitability',
                source: 'inventory',
                priority: 'high',
            });
        }

        // Strategy 5: Competitive Intelligence-driven
        if (insights.competitorTrends && insights.competitorTrends.length > 0) {
            const trendingCategories = insights.competitorTrends
                .filter(t => t.trend === 'Popular Categories')
                .flatMap(t => t.description.split(': ')[1]?.split(', ') || []);

            if (trendingCategories.length > 0) {
                const allProducts = await fetchOrgProducts(orgId);
                const trendingProducts = allProducts.filter(p =>
                    trendingCategories.some(cat =>
                        p.category.toLowerCase().includes(cat.toLowerCase())
                    )
                ).slice(0, 8);

                if (trendingProducts.length >= 3) {
                    suggestions.push({
                        title: 'Trending Now',
                        description: 'What customers are looking for',
                        products: trendingProducts,
                        rationale: `Based on Ezal competitive analysis: ${insights.competitorTrends[0].description}`,
                        source: 'competitive',
                        priority: 'high',
                    });
                }
            }
        }

        // Strategy 6: Low Stock / Last Chance (FOMO)
        if (insights.lowStockItems.length >= 2) {
            suggestions.push({
                title: 'Last Chance',
                description: 'Limited stock - grab them while you can!',
                products: insights.lowStockItems.slice(0, 6),
                rationale: `${insights.lowStockItems.length} products with stock under 10 units`,
                source: 'inventory',
                priority: 'medium',
            });
        }

        return { success: true, suggestions };
    } catch (error) {
        logger.error('Error generating carousel suggestions:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate suggestions' };
    }
}

/**
 * Create a carousel from a suggestion
 */
export async function createCarouselFromSuggestion(
    orgId: string,
    suggestion: SuggestedCarousel
): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await createCarousel({
            title: suggestion.title,
            description: suggestion.description,
            productIds: suggestion.products.map(p => p.id),
            orgId,
            active: true,
            displayOrder: 0,
        });

        return result;
    } catch (error) {
        logger.error('Error creating carousel from suggestion:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to create carousel' };
    }
}

/**
 * Parse natural language to create a carousel
 * Examples:
 * - "Create a carousel of our top-selling edibles"
 * - "Show products similar to what competitors are featuring"
 * - "Feature high-THC strains for experienced users"
 */
export async function parseNaturalLanguageCarousel(
    orgId: string,
    naturalLanguageRule: string
): Promise<{ success: boolean; suggestion?: SuggestedCarousel; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');
        if (!naturalLanguageRule.trim()) throw new Error('Please describe your carousel');

        const products = await fetchOrgProducts(orgId);
        if (products.length === 0) {
            return { success: false, error: 'No products found. Add products to your catalog first.' };
        }

        // Get insights for context
        const insightsResult = await getCarouselInsights(orgId);
        const insights = insightsResult.insights;

        // Use AI to parse the natural language
        const systemPrompt = `You are a carousel creator for a cannabis dispensary menu system.
Parse the user's natural language request and determine which products should be included in the carousel.

Available product fields:
- category: string (e.g., Flower, Edibles, Vape, Pre-roll, Concentrate)
- price: number (product price)
- strainType: string (Indica, Sativa, Hybrid)
- thcPercent: number (THC percentage)
- stock: number (inventory count)
- effects: array of strings (e.g., Relaxed, Energetic, Happy)

Respond with ONLY valid JSON in this exact format:
{
  "title": "Carousel Title",
  "description": "Subtitle for the carousel",
  "filters": [
    {"field": "category", "operator": "eq", "value": "Edibles"}
  ],
  "sortBy": "price",
  "sortOrder": "desc",
  "limit": 8
}

Operators: eq (equals), gt, lt, gte, lte, in (for arrays), contains (for effects)
Sort fields: price, thcPercent, name, stock`;

        const userPrompt = `Create a carousel based on: "${naturalLanguageRule}"

Current inventory context:
- Total products: ${insights?.totalProducts || products.length}
- Top categories: ${insights?.topCategories?.map(c => `${c.category} (${c.count})`).join(', ') || 'Various'}
${insights?.competitorTrends?.length ? `- Competitor trends: ${insights.competitorTrends.map(t => t.trend).join(', ')}` : ''}`;

        const { text: responseText } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-lite',
            system: systemPrompt,
            prompt: userPrompt,
        });

        // Parse the AI response
        let parsedConfig;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }
            parsedConfig = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('Failed to parse AI response:', parseError instanceof Error ? parseError : new Error(String(parseError)));
            return { success: false, error: 'Could not understand your request. Please try rephrasing.' };
        }

        // Apply filters to products
        let filteredProducts = [...products];

        for (const filter of parsedConfig.filters || []) {
            filteredProducts = filteredProducts.filter(p => {
                const fieldValue = (p as unknown as Record<string, unknown>)[filter.field];
                if (fieldValue === undefined) return false;

                switch (filter.operator) {
                    case 'eq': return fieldValue === filter.value;
                    case 'gt': return Number(fieldValue) > Number(filter.value);
                    case 'lt': return Number(fieldValue) < Number(filter.value);
                    case 'gte': return Number(fieldValue) >= Number(filter.value);
                    case 'lte': return Number(fieldValue) <= Number(filter.value);
                    case 'in': return Array.isArray(filter.value) && filter.value.includes(fieldValue);
                    case 'contains':
                        if (Array.isArray(fieldValue)) {
                            return fieldValue.some(v =>
                                String(v).toLowerCase().includes(String(filter.value).toLowerCase())
                            );
                        }
                        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
                    default: return true;
                }
            });
        }

        // Sort products
        if (parsedConfig.sortBy) {
            filteredProducts.sort((a, b) => {
                const aVal = (a as unknown as Record<string, unknown>)[parsedConfig.sortBy];
                const bVal = (b as unknown as Record<string, unknown>)[parsedConfig.sortBy];
                if (aVal === undefined || bVal === undefined) return 0;
                const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return parsedConfig.sortOrder === 'desc' ? -comparison : comparison;
            });
        }

        // Limit results
        const limitedProducts = filteredProducts.slice(0, parsedConfig.limit || 8);

        if (limitedProducts.length === 0) {
            return {
                success: false,
                error: 'No products match your criteria. Try a different description.'
            };
        }

        return {
            success: true,
            suggestion: {
                title: parsedConfig.title || 'Custom Carousel',
                description: parsedConfig.description || '',
                products: limitedProducts,
                rationale: `AI-generated based on: "${naturalLanguageRule}"`,
                source: 'ai',
                priority: 'medium',
            }
        };
    } catch (error) {
        logger.error('Error parsing natural language carousel:', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process your request'
        };
    }
}

/**
 * Get smart preset prompts based on inventory and competitive data
 */
export async function getCarouselPresets(orgId: string): Promise<{ success: boolean; presets?: Array<{ label: string; prompt: string; icon: string; available: boolean; source: 'inventory' | 'competitive'; reason?: string }>; error?: string }> {
    try {
        const insightsResult = await getCarouselInsights(orgId);
        if (!insightsResult.success || !insightsResult.insights) {
            return { success: false, error: insightsResult.error || 'Could not analyze inventory' };
        }

        const insights = insightsResult.insights;
        const presets: Array<{ label: string; prompt: string; icon: string; available: boolean; source: 'inventory' | 'competitive'; reason?: string }> = [];

        // Featured products preset
        if (insights.featuredProducts.length >= 3) {
            presets.push({
                label: `${insights.featuredProducts.length} Staff Picks`,
                prompt: 'Create a carousel of staff picks and featured products',
                icon: 'star',
                available: true,
                source: 'inventory',
            });
        }

        // New arrivals preset
        if (insights.newArrivals.length >= 3) {
            presets.push({
                label: 'New Arrivals',
                prompt: 'Show our newest products in a "Just Dropped" carousel',
                icon: 'sparkles',
                available: true,
                source: 'inventory',
            });
        }

        // Category presets
        for (const { category, count } of insights.topCategories.slice(0, 2)) {
            if (count >= 4) {
                presets.push({
                    label: `Best ${category}`,
                    prompt: `Create a carousel featuring our best ${category.toLowerCase()} products`,
                    icon: 'layers',
                    available: true,
                    source: 'inventory',
                });
            }
        }

        // High margin preset
        if (insights.highMarginProducts.length >= 3) {
            presets.push({
                label: 'Premium Selection',
                prompt: 'Feature our premium, high-margin products',
                icon: 'crown',
                available: true,
                source: 'inventory',
            });
        }

        // Competitive presets
        if (insights.competitorTrends && insights.competitorTrends.length > 0) {
            presets.push({
                label: 'Match Competitors',
                prompt: 'Create a carousel based on what competitors are featuring',
                icon: 'target',
                available: true,
                source: 'competitive',
            });

            // Specific trend-based presets
            for (const trend of insights.competitorTrends.slice(0, 2)) {
                presets.push({
                    label: trend.trend,
                    prompt: `Feature products related to: ${trend.description}`,
                    icon: 'trending-up',
                    available: true,
                    source: 'competitive',
                });
            }
        } else {
            presets.push({
                label: 'Competitive Insights',
                prompt: 'Create carousel based on market trends',
                icon: 'target',
                available: false,
                source: 'competitive',
                reason: 'Run Ezal competitive analysis to unlock this feature',
            });
        }

        // Low stock FOMO preset
        if (insights.lowStockItems.length >= 2) {
            presets.push({
                label: 'Last Chance',
                prompt: 'Create a "limited stock" carousel to drive urgency',
                icon: 'alert-triangle',
                available: true,
                source: 'inventory',
            });
        }

        // Effect-based presets
        presets.push({
            label: 'Relaxation',
            prompt: 'Show products with relaxing effects for evening use',
            icon: 'moon',
            available: true,
            source: 'inventory',
        });

        presets.push({
            label: 'Energy & Focus',
            prompt: 'Feature energizing strains for daytime productivity',
            icon: 'sun',
            available: true,
            source: 'inventory',
        });

        return { success: true, presets };
    } catch (error) {
        logger.error('Error generating carousel presets:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate presets' };
    }
}
