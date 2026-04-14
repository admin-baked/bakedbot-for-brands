// src/server/agents/uncleElroy.ts
/**
 * Uncle Elroy — Adversarial Data Auditor
 *
 * "I don't trust nobody's numbers. Prove it."
 *
 * Uncle Elroy is the skeptical counterbalance to every data claim.
 * He challenges inventory valuations, COGS figures, revenue reports,
 * and any assertion made by other agents (especially Money Mike).
 *
 * Deliberative Pipeline:
 *   Money Mike produces → Uncle Elroy challenges → artifacts prove ground truth
 *   The debate produces audit-grade artifacts stored in Firestore for the learning loop.
 */
import { AgentImplementation } from './harness';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { runMultiStepTask } from '@/server/agents/harness';
import {
    buildSquadRoster
} from './agent-definitions';
import { buildBulletSection, buildContextDisciplineSection, buildLearningLoopSection, joinPromptSections } from './prompt-kit';
import { contextOsToolDefs, lettaToolDefs, learningLoopToolDefs } from './shared-tools';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';
import { getOrgProfileWithFallback } from '@/server/services/org-profile';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import { getApps, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// --- Memory Schema ---
export interface UncleElroyMemory {
    [key: string]: unknown;
    agent_id: string;
    system_instructions?: string;
    challenges_raised: ChallengeRecord[];
    audit_trail: AuditArtifact[];
    trust_scores: Record<string, number>; // agentId → trust score (0-1)
}

export interface ChallengeRecord {
    id: string;
    timestamp: string;
    targetAgent: string;
    claim: string;
    challenge: string;
    resolution: 'confirmed' | 'refuted' | 'inconclusive';
    evidence: string;
}

export interface AuditArtifact {
    id: string;
    timestamp: string;
    type: 'inventory_valuation' | 'cogs_audit' | 'revenue_reconciliation' | 'data_freshness';
    orgId: string;
    status: 'passed' | 'failed' | 'warning';
    summary: string;
    details: Record<string, unknown>;
    challengedBy: string; // always 'uncle_elroy'
    defendedBy: string;   // usually 'money_mike'
    evidenceChain: EvidenceItem[];
}

export interface EvidenceItem {
    source: string;      // 'firestore' | 'pos_api' | 'agent_claim'
    query: string;
    result: unknown;
    timestamp: string;
}

// --- Tools ---
export interface UncleElroyTools {
    challengeInventoryValuation(orgId: string): Promise<AuditArtifact>;
    challengeCOGSClaims(orgId: string): Promise<AuditArtifact>;
    verifyDataFreshness(orgId: string): Promise<AuditArtifact>;
    crossReferencePOSDatavsFirestore(orgId: string): Promise<AuditArtifact>;
}

// --- Agent Implementation ---
export const uncleElroyAgent: AgentImplementation<UncleElroyMemory, UncleElroyTools> = {
    agentName: 'uncle_elroy',

    async initialize(brandMemory, agentMemory) {
        logger.info('[UncleElroy] Initializing. Trust nothing, verify everything.');

        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const orgProfile = await getOrgProfileWithFallback(orgId).catch(() => null);
        const brandName = (brandMemory as any)?.brand_profile?.name || 'your brand';

        const squadRoster = buildSquadRoster('uncle_elroy');
        const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

        agentMemory.system_instructions = joinPromptSections(
            `You are Uncle Elroy, the Adversarial Data Auditor for ${brandName}. You trust NO claim without proof. Your job is to challenge every number, every valuation, every assertion from other agents — especially Money Mike.`,
            `=== AGENT SQUAD (For Collaboration) ===\n${squadRoster}`,
            `=== INTEGRATION STATUS ===\n${integrationStatus}`,
            buildBulletSection('CORE PERSONALITY', [
                'Skeptical, direct, no-nonsense. "Show me the receipt."',
                'Every number is guilty until proven innocent.',
                'You do NOT accept claims at face value — you verify against raw data.',
                'You challenge Money Mike on pricing, Pops on analytics, Smokey on inventory counts.',
                'Tone: Gruff, old-school, suspicious. "That ain\'t right and you know it."',
            ]),
            buildBulletSection('ADVERSARIAL PROTOCOL', [
                'Step 1: Hear the claim (e.g., "Inventory is worth $144K").',
                'Step 2: Ask: Where did this number come from? What data source? When was it last synced?',
                'Step 3: Run your OWN query. Count products, sum prices, check for duplicates, check stock levels.',
                'Step 4: Compare. If numbers don\'t match, flag it as a DISCREPANCY.',
                'Step 5: Produce an Audit Artifact — a verifiable record of what you found.',
            ]),
            buildBulletSection('AUDIT TRIGGER RULES (Auto-Act)', [
                'Any claim about inventory value → Challenge: count SKUs, sum prices, exclude gift cards, use WHOLESALE not retail.',
                'Any COGS claim → Challenge: verify cost field exists, check if batch-level vs unit-level, flag missing data.',
                'Any "X% increase/decrease" claim → Challenge: what\'s the baseline? Over what period? Is it seasonality?',
                'Data freshness > 24 hours → Flag as STALE. Require re-sync before trusting.',
                'Duplicate SKUs detected → Flag immediately. This is the #1 cause of inflated inventory.',
            ]),
            buildBulletSection('GROUNDING RULES (CRITICAL)', [
                'NEVER fabricate audit results. Run actual Firestore queries.',
                'If you can\'t access the data, say so — don\'t pretend to have verified.',
                'Always cite the collection path, document count, and timestamp of your queries.',
                'Distinguish between RETAIL value and WHOLESALE cost — they are NOT the same.',
            ]),
            buildContextDisciplineSection([
                'Keep prompts focused on adversarial verification, data integrity, and audit methodology.',
            ]),
            buildLearningLoopSection('Uncle Elroy', ['audit', 'data-integrity', 'inventory', 'adversarial']),
            buildBulletSection('OUTPUT FORMAT', [
                'Every challenge produces an Audit Artifact with: status (PASSED/FAILED/WARNING), evidence chain, and resolution.',
                'Use ✅ (verified), ⚠️ (suspicious), ❌ (failed) for quick scanning.',
                'End with: "Uncle Elroy says: [TRUST / DON\'T TRUST / VERIFY AGAIN]"',
            ]),
        );

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: UncleElroyTools, stimulus?: string) {
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || 'unknown';

        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;

            const auditTools = [
                {
                    name: 'challengeInventoryValuation',
                    description: 'Audit the inventory valuation. Count real SKUs, sum prices, check for duplicates, exclude non-merchandise.',
                    schema: z.object({ orgId: z.string() })
                },
                {
                    name: 'challengeCOGSClaims',
                    description: 'Verify COGS data exists and is reasonable. Check cost fields, flag missing data.',
                    schema: z.object({ orgId: z.string() })
                },
                {
                    name: 'verifyDataFreshness',
                    description: 'Check when data was last synced. Flag stale data (>24h old).',
                    schema: z.object({ orgId: z.string() })
                },
                {
                    name: 'crossReferencePOSDatavsFirestore',
                    description: 'Compare POS source data with what\'s stored in Firestore.',
                    schema: z.object({ orgId: z.string() })
                },
            ];

            const toolsDef = [...auditTools, ...learningLoopToolDefs, ...contextOsToolDefs, ...lettaToolDefs];

            try {
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: {
                        ...tools,
                        ...makeLearningLoopToolsImpl({
                            agentId: 'uncle_elroy',
                            role: 'Auditor',
                            orgId,
                            brandId: orgId,
                            defaultCategory: 'audit',
                        }),
                    },
                    model: 'googleai/gemini-2.5-flash',
                    maxIterations: 5
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'uncle_elroy_audit_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };
            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Uncle Elroy audit failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        return {
            updatedMemory: agentMemory,
            logEntry: { action: 'idle', result: 'Uncle Elroy is watching. Trust nothing.' }
        };
    }
};

// --- Standalone Audit Functions (callable from pipeline) ---

/**
 * Run a full inventory audit for an org.
 * This is the core adversarial check — queries raw data, no trust assumptions.
 */
export async function runInventoryAudit(orgId: string): Promise<AuditArtifact> {
    const apps = getApps();
    if (apps.length === 0) {
        throw new Error('Firebase not initialized');
    }
    const db = getFirestore(apps[0]);

    const artifactId = `audit_${Date.now()}`;
    const now = new Date().toISOString();
    const evidenceChain: EvidenceItem[] = [];

    // Step 1: Count all products at the canonical path
    const productsSnap = await db
        .collection('tenants').doc(orgId)
        .collection('publicViews').doc('products')
        .collection('items').get();

    const totalSKUs = productsSnap.size;
    evidenceChain.push({
        source: 'firestore',
        query: `tenants/${orgId}/publicViews/products/items`,
        result: { totalDocs: totalSKUs },
        timestamp: now,
    });

    // Step 2: Calculate inventory with adversarial checks
    let retailValue = 0;
    let wholesaleValue = 0;
    let inStock = 0;
    let outOfStock = 0;
    let giftCardValue = 0;
    let duplicatesDetected = 0;
    let missingCost = 0;
    let staleDocs = 0;
    const nameCounts: Record<string, number> = {};
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const doc of productsSnap.docs) {
        const p = doc.data();
        const price = p.price || p.retailPrice || 0;
        const cost = p.cost || p.wholesalePrice || p.cogs || 0;
        const stock = p.stock || p.stockCount || 0;
        const name = (p.name || p.productName || '').toLowerCase().trim();

        // Track name duplicates
        if (name) {
            nameCounts[name] = (nameCounts[name] || 0) + 1;
        }

        // Check freshness
        const updatedAt = p.updatedAt?.toMillis?.() || p.updatedAt?.getTime?.() || 0;
        if (updatedAt > 0 && updatedAt < oneDayAgo) {
            staleDocs++;
        }

        // Check if gift card
        const isGiftCard = name.includes('gift card') || name.includes('gift card') ||
            (p.category || '').toLowerCase().includes('gift');

        if (isGiftCard) {
            giftCardValue += price * stock;
        } else {
            retailValue += price * stock;
            wholesaleValue += cost * stock;
        }

        if (stock > 0) inStock++;
        else outOfStock++;

        if (cost === 0 && stock > 0 && !isGiftCard) missingCost++;
    }

    // Count duplicates
    for (const [name, count] of Object.entries(nameCounts)) {
        if (count > 1) {
            duplicatesDetected += count - 1;
        }
    }

    // Step 3: Also check the OLD products collection (should be empty)
    const oldProductsSnap = await db
        .collection('tenants').doc(orgId)
        .collection('products').limit(10).get();

    evidenceChain.push({
        source: 'firestore',
        query: `tenants/${orgId}/products (legacy path)`,
        result: { totalDocs: oldProductsSnap.size, note: 'Should be 0 — legacy duplicate path' },
        timestamp: now,
    });

    // Step 4: Determine audit status
    const issues: string[] = [];
    if (oldProductsSnap.size > 0) issues.push(`Legacy products collection still has ${oldProductsSnap.size} docs (duplicate risk)`);
    if (duplicatesDetected > 0) issues.push(`${duplicatesDetected} potential duplicate product names detected`);
    if (missingCost > 0) issues.push(`${missingCost} in-stock products missing cost/COGS data`);
    if (staleDocs > totalSKUs * 0.5) issues.push(`${staleDocs} products have stale timestamps (>24h old)`);
    if (giftCardValue > 0) issues.push(`$${Math.round(giftCardValue)} in gift cards included in raw data (not merchandise)`);

    const status: AuditArtifact['status'] = issues.length === 0 ? 'passed' :
        issues.some(i => i.includes('duplicate') || i.includes('legacy')) ? 'failed' : 'warning';

    const summary = status === 'passed'
        ? `✅ Inventory audit PASSED. ${totalSKUs} SKUs, ${inStock} in-stock, $${Math.round(retailValue).toLocaleString()} retail / $${Math.round(wholesaleValue).toLocaleString()} wholesale.`
        : status === 'failed'
            ? `❌ Inventory audit FAILED. Issues: ${issues.join('; ')}`
            : `⚠️ Inventory audit WARNING. ${issues.join('; ')}`;

    const artifact: AuditArtifact = {
        id: artifactId,
        timestamp: now,
        type: 'inventory_valuation',
        orgId,
        status,
        summary,
        details: {
            totalSKUs,
            inStock,
            outOfStock,
            retailValue: Math.round(retailValue),
            wholesaleValue: Math.round(wholesaleValue),
            giftCardValue: Math.round(giftCardValue),
            duplicatesDetected,
            missingCost,
            staleDocs,
            legacyCollectionSize: oldProductsSnap.size,
            issues,
        },
        challengedBy: 'uncle_elroy',
        defendedBy: 'money_mike',
        evidenceChain,
    };

    // Persist to Firestore
    await db.collection('tenants').doc(orgId)
        .collection('auditArtifacts').doc(artifactId)
        .set(artifact);

    logger.info(`[UncleElroy] Inventory audit complete: ${status} for ${orgId}`);

    return artifact;
}

/**
 * Run a COGS audit — verify cost data coverage and reasonableness.
 */
export async function runCOGSAudit(orgId: string): Promise<AuditArtifact> {
    const apps = getApps();
    if (apps.length === 0) throw new Error('Firebase not initialized');
    const db = getFirestore(apps[0]);

    const artifactId = `cogs_audit_${Date.now()}`;
    const now = new Date().toISOString();
    const evidenceChain: EvidenceItem[] = [];

    const productsSnap = await db
        .collection('tenants').doc(orgId)
        .collection('publicViews').doc('products')
        .collection('items').get();

    let totalWithCost = 0;
    let totalWithoutCost = 0;
    let costRangeMin = Infinity;
    let costRangeMax = -Infinity;
    let unreasonableCosts = 0;
    const categoryCoverage: Record<string, { with: number; without: number }> = {};

    for (const doc of productsSnap.docs) {
        const p = doc.data();
        const cost = p.cost || p.wholesalePrice || p.cogs || p.batchCost || 0;
        const price = p.price || p.retailPrice || 0;
        const stock = p.stock || p.stockCount || 0;
        const cat = p.category || 'Unknown';

        if (!categoryCoverage[cat]) categoryCoverage[cat] = { with: 0, without: 0 };

        if (cost > 0) {
            totalWithCost++;
            categoryCoverage[cat].with++;
            costRangeMin = Math.min(costRangeMin, cost);
            costRangeMax = Math.max(costRangeMax, cost);

            // Check reasonableness: cost should be < price (typically 40-70% of retail)
            if (price > 0 && cost > price) {
                unreasonableCosts++;
            }
        } else {
            if (stock > 0) totalWithoutCost++; // Only flag if in stock
            categoryCoverage[cat].without++;
        }
    }

    evidenceChain.push({
        source: 'firestore',
        query: `tenants/${orgId}/publicViews/products/items (COGS scan)`,
        result: { totalWithCost, totalWithoutCost, unreasonableCosts },
        timestamp: now,
    });

    const coveragePercent = productsSnap.size > 0
        ? Math.round((totalWithCost / productsSnap.size) * 100)
        : 0;

    const issues: string[] = [];
    if (coveragePercent < 50) issues.push(`Only ${coveragePercent}% COGS coverage — majority of products missing cost data`);
    if (unreasonableCosts > 0) issues.push(`${unreasonableCosts} products have cost > retail price (data error)`);
    if (totalWithoutCost > 0) issues.push(`${totalWithoutCost} in-stock products missing cost data entirely`);

    const status: AuditArtifact['status'] = issues.length === 0 ? 'passed' :
        coveragePercent < 50 ? 'failed' : 'warning';

    const summary = `COGS Audit: ${coveragePercent}% coverage. ${totalWithCost} products with cost data, ${totalWithoutCost} without. ${issues.length === 0 ? 'All clear.' : issues.join('; ')}`;

    const artifact: AuditArtifact = {
        id: artifactId,
        timestamp: now,
        type: 'cogs_audit',
        orgId,
        status,
        summary,
        details: {
            totalProducts: productsSnap.size,
            totalWithCost,
            totalWithoutCost,
            coveragePercent,
            costRangeMin: costRangeMin === Infinity ? 0 : costRangeMin,
            costRangeMax: costRangeMax === -Infinity ? 0 : costRangeMax,
            unreasonableCosts,
            categoryCoverage,
            issues,
        },
        challengedBy: 'uncle_elroy',
        defendedBy: 'money_mike',
        evidenceChain,
    };

    await db.collection('tenants').doc(orgId)
        .collection('auditArtifacts').doc(artifactId)
        .set(artifact);

    logger.info(`[UncleElroy] COGS audit complete: ${status} for ${orgId}`);
    return artifact;
}

export async function handleUncleElroyEvent(orgId: string, eventId: string) {
    logger.info(`[UncleElroy] Handled event ${eventId} for org ${orgId}`);
}
