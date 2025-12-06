'use server';

// src/server/services/ezal/diff-engine.ts
/**
 * Diff Engine
 * Detects changes in competitive product data and generates insights
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
    CompetitiveProduct,
    PricePoint,
    EzalInsight,
    InsightType,
    InsightSeverity
} from '@/types/ezal-scraper';
import { ParsedProduct } from './parser-engine';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_PRODUCTS = 'products_competitive';
const COLLECTION_PRICE_POINTS = 'price_points_competitive';
const COLLECTION_INSIGHTS = 'insights_ezal';

// =============================================================================
// PRODUCT DIFFING
// =============================================================================

export interface DiffResult {
    newProducts: number;
    updatedProducts: number;
    unchangedProducts: number;
    outOfStockChanges: number;
    priceChanges: number;
    insightsGenerated: number;
}

/**
 * Process parsed products and detect changes
 */
export async function processParsedProducts(
    tenantId: string,
    competitorId: string,
    runId: string,
    parsedProducts: ParsedProduct[]
): Promise<DiffResult> {
    const { firestore } = await createServerClient();
    const results: DiffResult = {
        newProducts: 0,
        updatedProducts: 0,
        unchangedProducts: 0,
        outOfStockChanges: 0,
        priceChanges: 0,
        insightsGenerated: 0,
    };

    const now = new Date();
    const batch = firestore.batch();
    const insights: Omit<EzalInsight, 'id'>[] = [];

    for (const parsed of parsedProducts) {
        try {
            // Look for existing product
            const existingQuery = await firestore
                .collection('tenants')
                .doc(tenantId)
                .collection(COLLECTION_PRODUCTS)
                .where('competitorId', '==', competitorId)
                .where('externalProductId', '==', parsed.externalProductId)
                .limit(1)
                .get();

            const productRef = existingQuery.empty
                ? firestore.collection('tenants').doc(tenantId).collection(COLLECTION_PRODUCTS).doc()
                : existingQuery.docs[0].ref;

            if (existingQuery.empty) {
                // New product
                const newProduct: Omit<CompetitiveProduct, 'id'> = {
                    tenantId,
                    competitorId,
                    externalProductId: parsed.externalProductId,
                    brandName: parsed.brandName,
                    productName: parsed.productName,
                    category: parsed.category,
                    strainType: parsed.strainType,
                    thcPct: parsed.thcPct,
                    cbdPct: parsed.cbdPct,
                    priceCurrent: parsed.price,
                    priceRegular: parsed.regularPrice,
                    inStock: parsed.inStock,
                    lastSeenAt: now,
                    firstSeenAt: now,
                    lastRunId: runId,
                    metadata: parsed.metadata,
                };

                batch.set(productRef, newProduct);
                results.newProducts++;

                // Generate insight for new product
                insights.push({
                    tenantId,
                    type: 'new_product',
                    brandName: parsed.brandName,
                    competitorId,
                    competitorProductId: productRef.id,
                    currentValue: parsed.price,
                    severity: 'low',
                    jurisdiction: '', // Would be filled from competitor data
                    createdAt: now,
                    consumedBy: [],
                    dismissed: false,
                });

            } else {
                // Existing product - check for changes
                const existing = existingQuery.docs[0].data() as CompetitiveProduct;
                const updates: Partial<CompetitiveProduct> = {
                    lastSeenAt: now,
                    lastRunId: runId,
                };

                let hasChanges = false;

                // Check price change
                if (Math.abs(existing.priceCurrent - parsed.price) > 0.01) {
                    const priceChange = parsed.price - existing.priceCurrent;
                    const changePercent = (priceChange / existing.priceCurrent) * 100;

                    updates.priceCurrent = parsed.price;
                    updates.priceRegular = parsed.regularPrice;
                    hasChanges = true;
                    results.priceChanges++;

                    // Generate price insight
                    const insightType: InsightType = priceChange < 0 ? 'price_drop' : 'price_increase';
                    const severity = getSeverity(Math.abs(changePercent));

                    insights.push({
                        tenantId,
                        type: insightType,
                        brandName: parsed.brandName,
                        competitorId,
                        competitorProductId: existingQuery.docs[0].id,
                        previousValue: existing.priceCurrent,
                        currentValue: parsed.price,
                        deltaPercentage: changePercent,
                        deltaAbsolute: priceChange,
                        severity,
                        jurisdiction: '',
                        createdAt: now,
                        consumedBy: [],
                        dismissed: false,
                    });

                    // Also create price point record
                    const pricePointRef = firestore
                        .collection('tenants')
                        .doc(tenantId)
                        .collection(COLLECTION_PRICE_POINTS)
                        .doc();

                    batch.set(pricePointRef, {
                        tenantId,
                        productRef: productRef.path,
                        competitorId,
                        price: parsed.price,
                        regularPrice: parsed.regularPrice,
                        isPromo: parsed.regularPrice ? parsed.price < parsed.regularPrice : false,
                        capturedAt: now,
                        runId,
                    });
                }

                // Check stock change
                if (existing.inStock !== parsed.inStock) {
                    updates.inStock = parsed.inStock;
                    hasChanges = true;
                    results.outOfStockChanges++;

                    insights.push({
                        tenantId,
                        type: parsed.inStock ? 'back_in_stock' : 'out_of_stock',
                        brandName: parsed.brandName,
                        competitorId,
                        competitorProductId: existingQuery.docs[0].id,
                        previousValue: existing.inStock,
                        currentValue: parsed.inStock,
                        severity: parsed.inStock ? 'low' : 'medium',
                        jurisdiction: '',
                        createdAt: now,
                        consumedBy: [],
                        dismissed: false,
                    });
                }

                // Update THC/CBD if changed
                if (parsed.thcPct !== null && parsed.thcPct !== existing.thcPct) {
                    updates.thcPct = parsed.thcPct;
                    hasChanges = true;
                }
                if (parsed.cbdPct !== null && parsed.cbdPct !== existing.cbdPct) {
                    updates.cbdPct = parsed.cbdPct;
                    hasChanges = true;
                }

                if (hasChanges) {
                    batch.update(productRef, updates);
                    results.updatedProducts++;
                } else {
                    // Just update lastSeenAt
                    batch.update(productRef, { lastSeenAt: now, lastRunId: runId });
                    results.unchangedProducts++;
                }
            }

        } catch (error) {
            logger.error('[Ezal Diff] Failed to process product:', {
                externalId: parsed.externalProductId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Commit product updates
    await batch.commit();

    // Save insights
    for (const insight of insights) {
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection(COLLECTION_INSIGHTS)
            .add(insight);
    }

    results.insightsGenerated = insights.length;

    logger.info('[Ezal Diff] Processing complete:', {
        tenantId,
        competitorId,
        ...results,
    });

    return results;
}

/**
 * Determine severity based on percentage change
 */
function getSeverity(percentChange: number): InsightSeverity {
    if (percentChange >= 20) return 'critical';
    if (percentChange >= 10) return 'high';
    if (percentChange >= 5) return 'medium';
    return 'low';
}

// =============================================================================
// INSIGHT QUERIES
// =============================================================================

/**
 * Get recent insights for a tenant
 */
export async function getRecentInsights(
    tenantId: string,
    options?: {
        type?: InsightType;
        competitorId?: string;
        brandName?: string;
        severity?: InsightSeverity;
        limit?: number;
        includeDissmissed?: boolean;
    }
): Promise<EzalInsight[]> {
    const { firestore } = await createServerClient();

    let query = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_INSIGHTS) as FirebaseFirestore.Query;

    if (options?.type) {
        query = query.where('type', '==', options.type);
    }
    if (options?.competitorId) {
        query = query.where('competitorId', '==', options.competitorId);
    }
    if (options?.brandName) {
        query = query.where('brandName', '==', options.brandName);
    }
    if (options?.severity) {
        query = query.where('severity', '==', options.severity);
    }
    if (!options?.includeDissmissed) {
        query = query.where('dismissed', '==', false);
    }

    query = query.orderBy('createdAt', 'desc').limit(options?.limit || 50);

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    })) as EzalInsight[];
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(
    tenantId: string,
    insightId: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_INSIGHTS)
        .doc(insightId)
        .update({ dismissed: true });
}

/**
 * Mark insight as consumed by an agent
 */
export async function markInsightConsumed(
    tenantId: string,
    insightId: string,
    agentId: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_INSIGHTS)
        .doc(insightId)
        .update({
            consumedBy: FieldValue.arrayUnion(agentId),
        });
}

// =============================================================================
// PRICE GAP ANALYSIS
// =============================================================================

/**
 * Find price gaps between competitor prices and our prices
 */
export async function findPriceGaps(
    tenantId: string,
    options?: {
        minGapPercent?: number;
        brandName?: string;
        competitorId?: string;
    }
): Promise<{
    productId: string;
    productName: string;
    brandName: string;
    ourPrice: number;
    competitorPrice: number;
    competitorName: string;
    gapPercent: number;
    gapAbsolute: number;
}[]> {
    const { firestore } = await createServerClient();
    const minGap = options?.minGapPercent || 5;

    // Get competitive products
    let query = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_PRODUCTS)
        .where('inStock', '==', true) as FirebaseFirestore.Query;

    if (options?.competitorId) {
        query = query.where('competitorId', '==', options.competitorId);
    }
    if (options?.brandName) {
        query = query.where('brandName', '==', options.brandName);
    }

    const competitiveProducts = await query.limit(500).get();

    // Get our products for comparison
    const ourProductsSnap = await firestore
        .collection('organizations')
        .doc(tenantId)
        .collection('products')
        .limit(1000)
        .get();

    // Build lookup map by normalized name
    const ourProducts = new Map<string, { id: string; name: string; price: number }>();
    ourProductsSnap.docs.forEach(doc => {
        const data = doc.data();
        const normalizedName = (data.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        ourProducts.set(normalizedName, {
            id: doc.id,
            name: data.name,
            price: data.price || 0,
        });
    });

    const gaps: any[] = [];

    competitiveProducts.docs.forEach(doc => {
        const comp = doc.data() as CompetitiveProduct;
        const normalizedName = comp.productName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Try to find matching product
        const ourProduct = ourProducts.get(normalizedName);
        if (!ourProduct || ourProduct.price <= 0) return;

        const gapPercent = ((ourProduct.price - comp.priceCurrent) / ourProduct.price) * 100;

        if (Math.abs(gapPercent) >= minGap) {
            gaps.push({
                productId: ourProduct.id,
                productName: ourProduct.name,
                brandName: comp.brandName,
                ourPrice: ourProduct.price,
                competitorPrice: comp.priceCurrent,
                competitorName: comp.competitorId, // Would be resolved to name
                gapPercent,
                gapAbsolute: ourProduct.price - comp.priceCurrent,
            });
        }
    });

    return gaps.sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));
}

/**
 * Get competitive product history
 */
export async function getProductPriceHistory(
    tenantId: string,
    productId: string,
    days: number = 30
): Promise<PricePoint[]> {
    const { firestore } = await createServerClient();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_PRICE_POINTS)
        .where('productRef', '==', `tenants/${tenantId}/${COLLECTION_PRODUCTS}/${productId}`)
        .where('capturedAt', '>=', cutoff)
        .orderBy('capturedAt', 'asc')
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        capturedAt: doc.data().capturedAt?.toDate?.() || new Date(),
    })) as PricePoint[];
}
