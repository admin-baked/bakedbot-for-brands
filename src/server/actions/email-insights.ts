'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface EmailInsights {
    orgId: string;
    orgName: string;
    sent7d: number;
    openRate: number;    // 0-100
    clickRate: number;   // 0-100
    lastSentAt: string | null;
    topCampaignSubject: string | null;
}

const ORG_NAMES: Record<string, string> = {
    'org_thrive_syracuse':     'Thrive Syracuse',
    'brand_ecstatic_edibles':  'Ecstatic Edibles',
};

/**
 * Fetch last-7-day email performance for a list of orgs.
 * Reads customer_communications (transactional) + campaigns (bulk).
 */
export async function getEmailInsights(
    orgIds: string[] = ['org_thrive_syracuse', 'brand_ecstatic_edibles']
): Promise<EmailInsights[]> {
    await requireSuperUser();
    const db = getAdminFirestore();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const results = await Promise.allSettled(
        orgIds.map(async (orgId): Promise<EmailInsights> => {
            // Transactional sends (customer_communications)
            const commSnap = await db
                .collection('customer_communications')
                .where('orgId', '==', orgId)
                .where('channel', '==', 'email')
                .where('sentAt', '>=', since)
                .get();
            const sent7d = commSnap.size;
            const lastSentAt = commSnap.size > 0
                ? commSnap.docs.sort((a, b) =>
                    (b.data().sentAt?.toDate?.()?.getTime() ?? 0) -
                    (a.data().sentAt?.toDate?.()?.getTime() ?? 0)
                  )[0]?.data()?.sentAt?.toDate?.()?.toISOString() ?? null
                : null;

            // Campaign performance (open/click rates)
            const campSnap = await db
                .collection('campaigns')
                .where('orgId', '==', orgId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            let totalSent = 0, totalOpened = 0, totalClicked = 0;
            let topCampaignSubject: string | null = null;

            for (const doc of campSnap.docs) {
                const d = doc.data();
                const p = d.performance ?? {};
                totalSent    += p.sent    ?? 0;
                totalOpened  += p.opened  ?? 0;
                totalClicked += p.clicked ?? 0;
                if (!topCampaignSubject && d.subject) topCampaignSubject = d.subject as string;
            }

            const openRate  = totalSent > 0 ? Math.round((totalOpened  / totalSent) * 100) : 0;
            const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

            return {
                orgId,
                orgName: ORG_NAMES[orgId] ?? orgId,
                sent7d,
                openRate,
                clickRate,
                lastSentAt,
                topCampaignSubject,
            };
        })
    );

    return results
        .filter((r): r is PromiseFulfilledResult<EmailInsights> => r.status === 'fulfilled')
        .map(r => r.value);
}
