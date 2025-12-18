'use server';

import { requireUser } from '@/server/auth/auth';
import { CannMenusService } from '@/server/services/cannmenus';
import { logger } from '@/lib/monitoring';

export async function getNearbyCompetitors(lat: number, lng: number, limit: number = 20) {
    await requireUser(['dispensary', 'owner']);

    try {
        const cms = new CannMenusService();
        const results = await cms.findRetailers({ lat, lng, limit });
        return results;
    } catch (error) {
        logger.error('Failed to fetch nearby competitors', { lat, lng, error });
        return [];
    }
}
