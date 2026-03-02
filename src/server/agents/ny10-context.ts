/**
 * NY10 Pilot Context Builder
 *
 * Loads live NY Founding Partner Program data from Firestore and formats it
 * as a context block injected into executive agent system_instructions.
 * Non-blocking — returns empty string on any failure.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { PROMO_CODES } from '@/config/promos';

interface PilotOrgSummary {
    name: string;
    city: string;
    planId: string;
    posConnected: boolean;
    promoPhase: string;
    discount: string;
    daysActive: number;
}

// 5-minute in-memory cache to avoid repeated Firestore reads per agent init
let cachedContext: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Build a formatted context block with live NY10 pilot data.
 * Returns empty string on failure — agents work normally without it.
 */
export async function buildNY10PilotContext(): Promise<string> {
    // Return cache if fresh
    if (cachedContext !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return cachedContext;
    }

    try {
        const db = getAdminFirestore();
        const orgsSnap = await db
            .collection('organizations')
            .where('state', '==', 'NY')
            .get();

        const pilots: PilotOrgSummary[] = [];
        const promoConfig = PROMO_CODES.NYFOUNDINGPARTNER;

        for (const doc of orgsSnap.docs) {
            const data = doc.data();
            const hasPromo = data.activePromo?.code === 'NYFOUNDINGPARTNER';
            const hasTag = Array.isArray(data.tags) && data.tags.includes('ny-founding-partner');
            const isThrive = doc.id === 'org_thrive_syracuse';

            if (!hasPromo && !hasTag && !isThrive) continue;

            // Calculate promo phase
            let promoPhase = 'None';
            let discount = '0%';
            if (data.activePromo?.code === 'NYFOUNDINGPARTNER' && data.activePromo?.activatedAt) {
                const activatedAt = data.activePromo.activatedAt?.toDate
                    ? data.activePromo.activatedAt.toDate()
                    : new Date(data.activePromo.activatedAt);
                const daysSince = Math.floor((Date.now() - activatedAt.getTime()) / 86_400_000);
                const phases = promoConfig.phases;
                let cum = 0;
                let found = false;
                for (let i = 0; i < phases.length; i++) {
                    cum += phases[i].durationDays;
                    if (daysSince < cum) {
                        promoPhase = `Phase ${i + 1}`;
                        discount = `${phases[i].discountPercent}% off`;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    promoPhase = 'Full price';
                    discount = '0%';
                }
            } else if (isThrive) {
                promoPhase = 'Founding partner';
                discount = 'Empire plan';
            }

            const createdAt = data.createdAt?.toDate
                ? data.createdAt.toDate()
                : data.createdAt
                    ? new Date(data.createdAt)
                    : null;
            const daysActive = createdAt
                ? Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
                : 0;

            pilots.push({
                name: data.name || doc.id,
                city: data.city || 'Unknown',
                planId: data.planId || data.subscriptionPlanId || 'scout',
                posConnected: !!data.posConnected || !!data.posProvider,
                promoPhase,
                discount,
                daysActive,
            });
        }

        if (pilots.length === 0) {
            cachedContext = '';
            cacheTimestamp = Date.now();
            return '';
        }

        const pilotList = pilots
            .map(p => `- ${p.name} (${p.city}) | Plan: ${p.planId} | POS: ${p.posConnected ? 'Yes' : 'No'} | ${p.promoPhase} (${p.discount}) | ${p.daysActive}d active`)
            .join('\n            ');

        const context = `
            === NY FOUNDING PARTNER PROGRAM (NY10 PILOT) ===
            BakedBot is running a pilot program to onboard 10 NY dispensaries.
            Promo: NYFOUNDINGPARTNER — 50% off first 60 days, then 30% off for 6 months.
            Max slots: ${promoConfig.maxRedemptions}. Current enrolled: ${pilots.length}.

            ENROLLED DISPENSARIES:
            ${pilotList}

            YOUR ROLE IN THE PILOT:
            - Track pilot progress and report on KPIs (signups, POS connections, activation).
            - When asked about the NY pilot, reference this REAL data — don't fabricate.
            - The NY10 Pilot Command Center is at /dashboard/ceo?tab=ny-pilot.
            - Proactively mention pilot status when relevant to the conversation.
        `;

        cachedContext = context;
        cacheTimestamp = Date.now();
        return context;
    } catch (err) {
        logger.warn('[NY10Context] Failed to build pilot context', { error: String(err) });
        cachedContext = '';
        cacheTimestamp = Date.now();
        return '';
    }
}
