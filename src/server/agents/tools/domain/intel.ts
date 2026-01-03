
import { createServerClient } from '@/firebase/server-client';
import { searchWeb } from '@/server/tools/web-search';

export interface CompetitorDiscoveryResult {
    competitorName: string;
    url: string;
    priceCheck: {
        product: string;
        theirPrice: number;
        ourPrice: number;
        diff: number;
    }[];
    promotions: string[];
    rawSnippets?: string[]; // Added to store search evidence
    lastDiscoveredAt: number;
}

// Type alias for backward compatibility
export type CompetitorScanResult = CompetitorDiscoveryResult;

/**
 * Discovers competitor pricing (via Serper) to gather intel.
 * Uses Google Search to find recent pricing and promotions.
 */
export async function scanCompetitors(
    tenantId: string,
    params: {
        competitors?: string[]; // optionally override stored competitors
    }
): Promise<CompetitorDiscoveryResult[]> {
    const { firestore } = await createServerClient();

    // Retrieve configured competitors from tenant settings or knowledge base
    const settingsDoc = await firestore.doc(`tenants/${tenantId}/settings/intel`).get();
    // Default to some known brands if none configured
    const configuredCompetitors = settingsDoc.data()?.competitors || ['MedMen', 'Cookies', 'Stiiizy'];
    
    const targets = params.competitors || configuredCompetitors;
    const results: CompetitorScanResult[] = [];

    // Scan each competitor
    for (const comp of targets) {
        try {
            // 1. Find Pricing/Menu
            const priceQuery = `${comp} dispensary menu prices`;
            const searchResults = await searchWeb(priceQuery, 3);
            
            // Extract snippets (searchResults.results is the array)
            const snippets = searchResults.results ? searchResults.results.map(r => r.snippet).filter(s => s) : [];
            const urls = searchResults.results ? searchResults.results.map(r => r.link) : [];
            const primaryUrl = urls[0] || '';

            // 2. Simple Heuristic Parse (Extract dollar amounts)
            // In a full implementation, we would feed 'snippets' to an LLM to structure this data.
            // For now, we look for simple patterns like "$50" or "50 dollars".
            const priceChecks: any[] = [];
            const promotions: string[] = [];

            snippets.forEach(snippet => {
                if (snippet.toLowerCase().includes('deal') || snippet.toLowerCase().includes('% off')) {
                    promotions.push(snippet);
                }
                
                // Regex for price: $XX.XX or $XX
                const priceMatch = snippet.match(/\$(\d+(\.\d{2})?)/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1]);
                    // Associate with a dummy product for now, or assume generic "Average Item"
                    priceChecks.push({
                        product: 'Observed Item',
                        theirPrice: price,
                        ourPrice: 0, // Need to lookup comparable
                        diff: 0
                    });
                }
            });

            results.push({
                competitorName: comp,
                url: primaryUrl,
                priceCheck: priceChecks.slice(0, 3), // Top 3 findings
                promotions: promotions.slice(0, 3),
                rawSnippets: snippets.slice(0, 5),
                lastDiscoveredAt: Date.now()
            });

        } catch (error) {
            console.error(`[Intel] Failed to scan ${comp}:`, error);
            results.push({
                competitorName: comp,
                url: '',
                priceCheck: [],
                promotions: ['Scan failed'],
                lastDiscoveredAt: Date.now()
            });
        }
    }

    return results;
}
