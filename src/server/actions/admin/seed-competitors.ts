'use server';

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CompetitorSeed } from '@/config/competitor-presets';

export type { CompetitorSeed };

export interface SeedCompetitorsResult {
    success: boolean;
    added: number;
    skipped: number;
    error?: string;
}

export async function seedOrgCompetitors(
    orgId: string,
    competitors: CompetitorSeed[]
): Promise<SeedCompetitorsResult> {
    await requireSuperUser();

    if (!competitors.length) {
        return { success: true, added: 0, skipped: 0 };
    }

    const db = getAdminFirestore();
    const competitorsRef = db.collection('organizations').doc(orgId).collection('competitors');

    // Load existing names to skip duplicates
    const existing = await competitorsRef.select('name').get();
    const existingNames = new Set(existing.docs.map(d => (d.data().name as string).toLowerCase()));

    try {
        const batch = db.batch();
        let added = 0;
        let skipped = 0;

        for (const c of competitors) {
            if (existingNames.has(c.name.toLowerCase())) {
                skipped++;
                continue;
            }
            const docRef = competitorsRef.doc();
            batch.set(docRef, {
                name: c.name,
                city: c.city ?? null,
                state: c.state ?? null,
                address: c.address ?? null,
                menuUrl: c.menuUrl ?? null,
                source: 'manual',
                lastUpdated: new Date(),
            });
            added++;
        }

        await batch.commit();

        logger.info('[SeedCompetitors] Seeded competitors', { orgId, added, skipped });
        return { success: true, added, skipped };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[SeedCompetitors] Failed', { orgId, error: msg });
        return { success: false, added: 0, skipped: 0, error: msg };
    }
}
