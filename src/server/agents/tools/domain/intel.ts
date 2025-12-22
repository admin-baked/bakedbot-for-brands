
import { createServerClient } from '@/firebase/server-client';

export interface CompetitorScanResult {
    competitorName: string;
    url: string;
    priceCheck: {
        product: string;
        theirPrice: number;
        ourPrice: number;
        diff: number;
    }[];
    promotions: string[];
    lastScanned: number;
}

/**
 * Scans competitor websites (via Serper/Browsing Agent) to gather intel.
 */
export async function scanCompetitors(
    tenantId: string,
    params: {
        competitors?: string[]; // optionally override stored competitors
    }
): Promise<CompetitorScanResult[]> {
    const { firestore } = await createServerClient();

    // Retrieve configured competitors from tenant settings or knowledge base
    const settingsDoc = await firestore.doc(`tenants/${tenantId}/settings/intel`).get();
    const configuredCompetitors = settingsDoc.data()?.competitors || ['Competitor A', 'Competitor B'];

    const targets = params.competitors || configuredCompetitors;

    // Stubbed response simulating a live web scan
    return targets.map((comp: string) => ({
        competitorName: comp,
        url: `https://www.${comp.toLowerCase().replace(/\s+/g, '')}.com`,
        priceCheck: [
            { product: 'Blue Dream 1/8th', theirPrice: 45, ourPrice: 40, diff: -5 },
            { product: 'Wana Gummies', theirPrice: 22, ourPrice: 25, diff: 3 }
        ],
        promotions: ['First Time Patient Deal', 'Wax Wednesday'],
        lastScanned: Date.now()
    }));
}
