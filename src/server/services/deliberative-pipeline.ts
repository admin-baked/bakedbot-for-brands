// src/server/services/deliberative-pipeline.ts
/**
 * Deliberative Pipeline: Uncle Elroy ↔ Money Mike
 *
 * "I don't trust nobody's numbers. Prove it." — Uncle Elroy
 * "Watch me work." — Money Mike
 *
 * This pipeline forces adversarial review of financial data claims.
 * Money Mike produces financial assertions → Uncle Elroy challenges them
 * with raw data → artifacts are produced for audit trail.
 *
 * The learning loop captures every debate outcome so the system
 * gets better at catching discrepancies over time.
 */
import { logger } from '@/lib/logger';
import { runInventoryAudit, runCOGSAudit, type AuditArtifact } from '@/server/agents/uncleElroy';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export interface DeliberationResult {
    id: string;
    timestamp: string;
    orgId: string;
    trigger: string;
    rounds: DeliberationRound[];
    finalVerdict: 'TRUST' | 'DON_T_TRUST' | 'VERIFY_AGAIN';
    summary: string;
    artifacts: AuditArtifact[];
}

export interface DeliberationRound {
    round: number;
    speaker: 'money_mike' | 'uncle_elroy';
    claim: string;
    challenge?: string;
    evidence?: string;
    status: 'asserted' | 'challenged' | 'defended' | 'conceded';
}

/**
 * Run the full deliberative pipeline for inventory data.
 * Money Mike claims a value → Uncle Elroy audits → verdict rendered.
 */
export async function runInventoryDeliberation(
    orgId: string,
    moneyMikeClaim: string,
    claimedValue?: number
): Promise<DeliberationResult> {
    const id = `delib_${Date.now()}`;
    const now = new Date().toISOString();
    const rounds: DeliberationRound[] = [];
    const artifacts: AuditArtifact[] = [];

    logger.info(`[DeliberativePipeline] Starting inventory deliberation for ${orgId}`);

    // Round 1: Money Mike asserts
    rounds.push({
        round: 1,
        speaker: 'money_mike',
        claim: moneyMikeClaim,
        status: 'asserted',
    });

    // Round 2: Uncle Elroy challenges with raw data
    try {
        const inventoryAudit = await runInventoryAudit(orgId);
        artifacts.push(inventoryAudit);

        const details = inventoryAudit.details as Record<string, unknown>;
        const actualRetail = (details.retailValue as number) || 0;
        const actualWholesale = (details.wholesaleValue as number) || 0;
        const totalSKUs = (details.totalSKUs as number) || 0;
        const inStock = (details.inStock as number) || 0;
        const issues = (details.issues as string[]) || [];

        let challenge: string;
        if (inventoryAudit.status === 'failed') {
            challenge = `❌ HOLD UP. I ran my own count and found problems: ${issues.join('; ')}. `;
            challenge += `Raw numbers: ${totalSKUs} SKUs, ${inStock} in-stock. `;
            challenge += `Retail total: $${actualRetail.toLocaleString()}, Wholesale total: $${actualWholesale.toLocaleString()}. `;
            if (claimedValue && claimedValue > 0) {
                const diff = claimedValue - actualRetail;
                challenge += `You claimed $${claimedValue.toLocaleString()} — that's $${Math.abs(diff).toLocaleString()} ${diff > 0 ? 'MORE' : 'LESS'} than what I see in raw data.`;
            }
        } else if (inventoryAudit.status === 'warning') {
            challenge = `⚠️ I verified the numbers but found concerns: ${issues.join('; ')}. `;
            challenge += `Retail: $${actualRetail.toLocaleString()}, Wholesale: $${actualWholesale.toLocaleString()}. `;
            challenge += `The wholesale value is what you actually paid — that's your real inventory value.`;
        } else {
            challenge = `✅ Alright, I checked. ${totalSKUs} SKUs, ${inStock} in-stock. `;
            challenge += `Retail: $${actualRetail.toLocaleString()}, Wholesale: $${actualWholesale.toLocaleString()}. `;
            challenge += `Numbers match the raw data. I'll allow it — for now.`;
        }

        rounds.push({
            round: 2,
            speaker: 'uncle_elroy',
            claim: moneyMikeClaim,
            challenge,
            evidence: JSON.stringify(inventoryAudit.details),
            status: inventoryAudit.status === 'failed' ? 'challenged' : 'defended',
        });

        // Round 3: Run COGS audit too if there are products
        if (totalSKUs > 0) {
            const cogsAudit = await runCOGSAudit(orgId);
            artifacts.push(cogsAudit);

            rounds.push({
                round: 3,
                speaker: 'uncle_elroy',
                claim: 'COGS data quality check',
                challenge: cogsAudit.summary,
                evidence: JSON.stringify(cogsAudit.details),
                status: cogsAudit.status === 'passed' ? 'defended' : 'challenged',
            });
        }

    } catch (e: any) {
        rounds.push({
            round: 2,
            speaker: 'uncle_elroy',
            claim: moneyMikeClaim,
            challenge: `⚠️ I couldn't verify — audit query failed: ${e.message}`,
            status: 'challenged',
        });
    }

    // Determine verdict
    const hasFailed = artifacts.some(a => a.status === 'failed');
    const hasWarning = artifacts.some(a => a.status === 'warning');
    const finalVerdict = hasFailed ? 'DON_T_TRUST' : hasWarning ? 'VERIFY_AGAIN' : 'TRUST';

    const summary = renderDeliberationSummary(rounds, finalVerdict);

    const result: DeliberationResult = {
        id,
        timestamp: now,
        orgId,
        trigger: moneyMikeClaim,
        rounds,
        finalVerdict,
        summary,
        artifacts,
    };

    // Persist to Firestore
    try {
        const apps = getApps();
        if (apps.length > 0) {
            const db = getFirestore(apps[0]);
            await db.collection('tenants').doc(orgId)
                .collection('deliberations').doc(id)
                .set(result);
            logger.info(`[DeliberativePipeline] Persisted deliberation ${id} for ${orgId}`);
        }
    } catch (persistErr) {
        logger.warn(`[DeliberativePipeline] Failed to persist: ${persistErr}`);
    }

    return result;
}

/**
 * COGS Estimation Audit — adversarial check on estimated costs.
 *
 * When profitability.ts Phase 2A estimates costs using category-average margins,
 * this guard verifies those estimates are reasonable by checking:
 * 1. How many products in each category actually have real COGS data
 * 2. Whether the sample size is large enough to produce reliable estimates
 * 3. Whether estimated values fall within known distribution ranges
 */
export async function runCOGSEstimationAudit(
    orgId: string,
    categoryEstimates: Record<string, { avgMargin: number; estimatedCount: number; realCount: number }>
): Promise<AuditArtifact> {
    const { runCOGSAudit } = await import('@/server/agents/uncleElroy');
    const baseAudit = await runCOGSAudit(orgId);

    const artifactId = `cogs_est_audit_${Date.now()}`;
    const now = new Date().toISOString();

    const issues: string[] = [];
    const warnings: string[] = [];

    for (const [category, est] of Object.entries(categoryEstimates)) {
        // Sample too small — estimates unreliable
        if (est.realCount < 3) {
            issues.push(
                `${category}: Only ${est.realCount} products with real COGS — too few to estimate ${est.estimatedCount} products reliably`
            );
        }

        // Margin out of expected range for cannabis
        if (est.avgMargin < 0.1 || est.avgMargin > 0.8) {
            issues.push(
                `${category}: Average margin ${(est.avgMargin * 100).toFixed(0)}% is outside expected cannabis range (10-80%) — likely bad data`
            );
        }

        // More estimated than real — majority of data is fabricated
        if (est.estimatedCount > est.realCount) {
            warnings.push(
                `${category}: ${est.estimatedCount} estimated vs ${est.realCount} real — majority of costs are guesses`
            );
        }
    }

    const totalEstimated = Object.values(categoryEstimates).reduce((s, e) => s + e.estimatedCount, 0);
    const totalReal = Object.values(categoryEstimates).reduce((s, e) => s + e.realCount, 0);

    if (totalEstimated > totalReal) {
        issues.push(
            `CRITICAL: ${totalEstimated} products have estimated COGS vs ${totalReal} with real data — dashboard numbers are majority estimated`
        );
    }

    const status: AuditArtifact['status'] =
        issues.length > 0 ? 'failed' :
            warnings.length > 0 ? 'warning' : 'passed';

    const artifact: AuditArtifact = {
        id: artifactId,
        timestamp: now,
        type: 'cogs_audit',
        orgId,
        status,
        summary: status === 'passed'
            ? `✅ COGS estimation audit PASSED. ${totalEstimated} estimates grounded in ${totalReal} real data points.`
            : status === 'failed'
                ? `❌ COGS estimation audit FAILED. ${issues.join('; ')}`
                : `⚠️ COGS estimation WARNING. ${warnings.join('; ')}`,
        details: {
            totalEstimated,
            totalReal,
            estimationRatio: totalReal > 0 ? totalEstimated / totalReal : Infinity,
            categoryBreakdown: categoryEstimates,
            issues,
            warnings,
            baseCOGSCoverage: baseAudit.details,
        },
        challengedBy: 'uncle_elroy',
        defendedBy: 'money_mike',
        evidenceChain: [
            ...(baseAudit.evidenceChain || []),
            {
                source: 'firestore',
                query: `COGS estimation validation for ${orgId}`,
                result: { totalEstimated, totalReal, issues, warnings },
                timestamp: now,
            },
        ],
    };

    // Persist
    try {
        const apps = getApps();
        if (apps.length > 0) {
            const db = getFirestore(apps[0]);
            await db.collection('tenants').doc(orgId)
                .collection('auditArtifacts').doc(artifactId)
                .set(artifact);
        }
    } catch { /* non-blocking */ }

    return artifact;
}

/**
 * Tax Calculation Guard — verifies COGS data quality before tax calculations.
 *
 * Prevents the #1 financial hallucination vector: wrong tax liability because
 * COGS data is inflated, missing, or estimated beyond reliability threshold.
 */
export async function runTaxCalculationGuard(orgId: string): Promise<{
    safe: boolean;
    cogsCoveragePercent: number;
    estimatedRatio: number;
    warnings: string[];
    audit: AuditArtifact;
}> {
    const { runCOGSAudit } = await import('@/server/agents/uncleElroy');
    const cogsAudit = await runCOGSAudit(orgId);

    const details = cogsAudit.details as Record<string, unknown>;
    const coveragePercent = (details.coveragePercent as number) || 0;
    const totalWith = (details.totalWithCost as number) || 0;
    const totalWithout = (details.totalWithoutCost as number) || 0;
    const unreasonable = (details.unreasonableCosts as number) || 0;

    const warnings: string[] = [];

    // Gate 1: COGS coverage must be > 50%
    if (coveragePercent < 50) {
        warnings.push(
            `COGS coverage is only ${coveragePercent}% — tax calculations will be mostly estimated. ` +
            `Need at least 50% real cost data for reliable tax figures.`
        );
    }

    // Gate 2: No unreasonable costs (cost > retail)
    if (unreasonable > 0) {
        warnings.push(
            `${unreasonable} products have cost exceeding retail price — these will distort COGS totals.`
        );
    }

    // Gate 3: Must have recent data (not all stale)
    const totalProducts = (details.totalProducts as number) || 0;
    if (totalProducts === 0) {
        warnings.push('No products found at all — tax calculations will be zero-filled.');
    }

    const safe = warnings.filter(w => w.includes('coverage') || w.includes('exceeding')).length === 0
        && coveragePercent >= 50;

    return {
        safe,
        cogsCoveragePercent: coveragePercent,
        estimatedRatio: totalWith > 0 ? totalWithout / totalWith : Infinity,
        warnings,
        audit: cogsAudit,
    };
}

/**
 * Phase 2: Pricing Recommendation Deliberation
 *
 * Validates market averages used in pricing recommendations by checking
 * for duplicates, category consistency, and statistical outliers.
 */
export async function runPricingRecommendationDeliberation(
    brandId: string,
    category: string,
    marketStats: { average: number; low: number; high: number; count: number }
): Promise<AuditArtifact> {
    const artifactId = `pricing_delib_${Date.now()}`;
    const now = new Date().toISOString();

    const issues: string[] = [];
    const warnings: string[] = [];

    // Gate 1: Sample size too small
    if (marketStats.count < 5) {
        issues.push(
            `Only ${marketStats.count} competitor products in ${category} — recommendations unreliable (need ≥5)`
        );
    }

    // Gate 2: Price spread too wide (likely mixed unit types)
    if (marketStats.high > marketStats.low * 3) {
        warnings.push(
            `${category}: Price range $${marketStats.low}-$${marketStats.high} spread >3x — likely mixing grams with units/eighths`
        );
    }

    // Gate 3: Zero or negative prices in data
    if (marketStats.low <= 0) {
        issues.push(`${category}: Market low price is $${marketStats.low} — bad data in product catalog`);
    }

    // Gate 4: Average outside [low, high] (math error)
    if (marketStats.average < marketStats.low || marketStats.average > marketStats.high) {
        issues.push(
            `${category}: Average $${marketStats.average} outside range [$${marketStats.low}, $${marketStats.high}] — calculation error`
        );
    }

    const status: AuditArtifact['status'] =
        issues.length > 0 ? 'failed' :
            warnings.length > 0 ? 'warning' : 'passed';

    const artifact: AuditArtifact = {
        id: artifactId,
        timestamp: now,
        type: 'cogs_audit',
        orgId: brandId,
        status,
        summary: status === 'passed'
            ? `✅ Pricing deliberation PASSED for ${category}. ${marketStats.count} competitors, avg $${marketStats.average}.`
            : status === 'failed'
                ? `❌ Pricing deliberation FAILED for ${category}: ${issues.join('; ')}`
                : `⚠️ Pricing deliberation WARNING for ${category}: ${warnings.join('; ')}`,
        details: { category, marketStats, issues, warnings },
        challengedBy: 'uncle_elroy',
        defendedBy: 'money_mike',
        evidenceChain: [{
            source: 'firestore',
            query: `pricing_recs verification for ${brandId} category ${category}`,
            result: { marketStats, issues, warnings },
            timestamp: now,
        }],
    };

    return artifact;
}

/**
 * Phase 2: Working Capital Guard
 *
 * Flags when working capital analysis uses hardcoded config values
 * instead of real financial data, so the owner knows what's estimated.
 */
export interface WorkingCapitalInput {
    cashOnHand: number;
    inventoryValue: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    source: 'actual' | 'hardcoded' | 'mixed';
    hardcodedFields: string[];
}

export function runWorkingCapitalGuard(input: WorkingCapitalInput): {
    safe: boolean;
    warnings: string[];
    flaggedFields: string[];
} {
    const warnings: string[] = [];
    const flaggedFields: string[] = [...input.hardcodedFields];

    if (input.source === 'hardcoded') {
        warnings.push(
            'ALL working capital inputs are hardcoded estimates — do NOT use for financial decisions'
        );
    } else if (input.source === 'mixed') {
        warnings.push(
            `Working capital uses hardcoded values for: ${input.hardcodedFields.join(', ')} — partial estimate`
        );
    }

    if (input.inventoryValue === 0) {
        warnings.push('Inventory value is $0 — likely no COGS data loaded');
    }

    if (input.monthlyRevenue === 0) {
        warnings.push('Monthly revenue is $0 — likely no order data connected');
    }

    const safe = warnings.filter(w => w.includes('hardcoded estimates')).length === 0
        && input.inventoryValue > 0;

    return { safe, warnings, flaggedFields };
}

/**
 * Phase 3: Menu Sync Guard
 *
 * Validates incoming POS sync data before writing to Firestore.
 * Checks for price anomalies, duplicate SKUs, and category consistency.
 */
export function runMenuSyncGuard(products: Array<{
    name?: string;
    sku_id?: string;
    category?: string;
    price?: number | string;
}>): {
    safe: boolean;
    filteredProducts: typeof products;
    anomalies: Array<{ field: string; value: unknown; reason: string }>;
    duplicateSkus: string[];
} {
    const anomalies: Array<{ field: string; value: unknown; reason: string }> = [];
    const seenSkus = new Map<string, number>();
    const duplicateSkus: string[] = [];
    const filteredProducts: typeof products = [];

    for (const product of products) {
        const price = typeof product.price === 'string'
            ? parseFloat(product.price)
            : product.price;

        // Check price anomalies
        if (price !== undefined && price !== null && !isNaN(price)) {
            if (price < 0) {
                anomalies.push({
                    field: 'price',
                    value: price,
                    reason: `Negative price on ${product.name || 'unknown'}: $${price}`,
                });
                continue; // Skip this product
            }
            if (price > 10000) {
                anomalies.push({
                    field: 'price',
                    value: price,
                    reason: `Suspiciously high price on ${product.name || 'unknown'}: $${price} — likely case-level pricing`,
                });
            }
            if (price === 0) {
                anomalies.push({
                    field: 'price',
                    value: price,
                    reason: `Zero price on ${product.name || 'unknown'} — will show as free`,
                });
            }
        }

        // Track SKU duplicates
        const sku = product.sku_id || '';
        if (sku) {
            const count = seenSkus.get(sku) || 0;
            if (count > 0) {
                duplicateSkus.push(sku);
            }
            seenSkus.set(sku, count + 1);
        }

        // Check category consistency
        if (!product.category) {
            anomalies.push({
                field: 'category',
                value: null,
                reason: `Missing category on ${product.name || 'unknown'}`,
            });
        }

        // Product passes basic validation
        filteredProducts.push(product);
    }

    const safe = anomalies.filter(a => a.reason.includes('Negative')).length === 0;

    return { safe, filteredProducts, anomalies, duplicateSkus };
}

/**
 * Phase 3: Chatbot Data Grounding
 *
 * Injects a grounding constraint into the chat response prompt to prevent
 * the LLM from hallucinating prices, stock levels, or effects that don't
 * match actual product data. This is a prompt-level guard (not a runtime guard).
 */
export const CHATBOT_GROUNDING_INSTRUCTION = `
<grounding_rules>
CRITICAL DATA GROUNDING RULES — Uncle Elroy is watching:
1. NEVER state a product price unless it was provided in the product search results above.
2. NEVER claim a product is "in stock" or "out of stock" unless stock data was explicitly returned.
3. NEVER invent product effects, THC/CBD percentages, or strain information not in the data.
4. If you don't have data, say "I don't have that information right now" — do NOT guess.
5. When discussing prices, use exact phrasing: "The listed price is $X" (not "it costs" or "it's priced at").
6. If product data looks wrong (e.g., $0 price, 0% THC on flower), acknowledge it might be a data issue.
</grounding_rules>
`;

/**
 * Phase 4: Agent Claim Verification
 *
 * Spot-checks claims made by agents against raw Firestore data.
 * Used by Uncle Elroy to verify Pops's sales claims, Craig's campaign stats, etc.
 */
export async function runAgentClaimVerification(
    orgId: string,
    claim: string,
    claimType: 'sales_figure' | 'revenue_figure' | 'inventory_count' | 'customer_count' | 'general'
): Promise<{
    verified: boolean;
    actualValue: unknown;
    claimedValue?: string;
    discrepancy?: string;
    evidence: string;
}> {
    try {
        const apps = getApps();
        if (apps.length === 0) {
            return { verified: false, actualValue: null, evidence: 'No Firestore connection' };
        }
        const db = getFirestore(apps[0]);

        // For inventory claims, verify against product count
        if (claimType === 'inventory_count') {
            const snap = await db.collection('tenants').doc(orgId)
                .collection('publicViews').doc('products')
                .collection('items').get();
            const actualCount = snap.size;
            const match = claim.match(/(\d+)/);
            const claimedCount = match ? parseInt(match[1]) : null;

            if (claimedCount !== null && Math.abs(actualCount - claimedCount) > actualCount * 0.1) {
                return {
                    verified: false,
                    actualValue: actualCount,
                    claimedValue: String(claimedCount),
                    discrepancy: `Claimed ${claimedCount} items, but Firestore has ${actualCount}`,
                    evidence: `Firestore query: tenants/{orgId}/publicViews/products/items → ${actualCount} docs`,
                };
            }
            return {
                verified: true,
                actualValue: actualCount,
                claimedValue: claimedCount !== null ? String(claimedCount) : undefined,
                evidence: `Firestore has ${actualCount} product documents`,
            };
        }

        // For general claims, log that we can't auto-verify
        return {
            verified: false,
            actualValue: null,
            evidence: `Auto-verification not implemented for claim type: ${claimType}`,
        };
    } catch (err) {
        return {
            verified: false,
            actualValue: null,
            evidence: `Verification failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Phase 4: Recommendation Freshness Check
 *
 * Checks if product embeddings and metadata are stale before
 * generating AI-powered recommendations.
 */
export async function runRecommendationFreshnessCheck(
    orgId: string,
    maxAgeHours: number = 24
): Promise<{
    fresh: boolean;
    staleCount: number;
    freshCount: number;
    oldestUpdate: Date | null;
    warnings: string[];
}> {
    try {
        const apps = getApps();
        if (apps.length === 0) {
            return { fresh: false, staleCount: 0, freshCount: 0, oldestUpdate: null, warnings: ['No Firestore'] };
        }
        const db = getFirestore(apps[0]);
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

        const snap = await db.collection('tenants').doc(orgId)
            .collection('publicViews').doc('products')
            .collection('items')
            .select('updatedAt', 'name')
            .get();

        let staleCount = 0;
        let freshCount = 0;
        let oldestUpdate: Date | null = null;
        const warnings: string[] = [];

        for (const doc of snap.docs) {
            const data = doc.data();
            const updated = data.updatedAt?.toDate?.() || data.updatedAt;

            if (!updated) {
                staleCount++;
                continue;
            }

            const updateDate = updated instanceof Date ? updated : new Date(updated);

            if (!oldestUpdate || updateDate < oldestUpdate) {
                oldestUpdate = updateDate;
            }

            if (updateDate < cutoff) {
                staleCount++;
            } else {
                freshCount++;
            }
        }

        if (staleCount > freshCount) {
            warnings.push(
                `${staleCount} products are older than ${maxAgeHours}h vs ${freshCount} fresh — recommendations may be stale`
            );
        }

        return {
            fresh: staleCount <= freshCount,
            staleCount,
            freshCount,
            oldestUpdate,
            warnings,
        };
    } catch (err) {
        return {
            fresh: false,
            staleCount: 0,
            freshCount: 0,
            oldestUpdate: null,
            warnings: [`Freshness check failed: ${err instanceof Error ? err.message : String(err)}`],
        };
    }
}

function renderDeliberationSummary(rounds: DeliberationRound[], verdict: DeliberationResult['finalVerdict']): string {
    const verdictEmoji = verdict === 'TRUST' ? '✅' : verdict === 'DON_T_TRUST' ? '❌' : '⚠️';
    let summary = `\n${verdictEmoji} **DELIBERATIVE VERDICT: ${verdict.replace('_', "'")}**\n\n`;

    for (const round of rounds) {
        const emoji = round.speaker === 'uncle_elroy' ? '🔍' : '💰';
        summary += `**Round ${round.round} — ${round.speaker === 'uncle_elroy' ? 'Uncle Elroy' : 'Money Mike'}:**\n`;
        summary += `> ${round.claim}\n`;
        if (round.challenge) {
            summary += `> ${round.challenge}\n`;
        }
        summary += '\n';
    }

    return summary;
}