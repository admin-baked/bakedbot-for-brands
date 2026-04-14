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