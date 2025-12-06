import { ChatbotProduct } from '@/types/cannmenus';

// A mock database of strain profiles
// In a real system, this would come from a lab data API or a larger strain database
const STRAIN_PROFILES: Record<string, { chemotype: string; terpenes: Record<string, number> }> = {
    'Blue Dream': {
        chemotype: 'Myrcene-Dominant Hybrid',
        terpenes: { myrcene: 0.8, pinene: 0.3, caryophyllene: 0.2 }
    },
    'Jack Herer': {
        chemotype: 'Terpinolene-Dominant Sativa',
        terpenes: { terpinolene: 0.9, caryophyllene: 0.3, pinene: 0.2 }
    },
    'OG Kush': {
        chemotype: 'Myrcene-Limonene Hybrid',
        terpenes: { myrcene: 0.6, limonene: 0.5, caryophyllene: 0.4 }
    },
    'Granddaddy Purple': {
        chemotype: 'Myrcene-Dominant Indica',
        terpenes: { myrcene: 1.1, caryophyllene: 0.3, pinene: 0.1 }
    },
    'Sour Diesel': {
        chemotype: 'Caryophyllene-Limonene Sativa',
        terpenes: { caryophyllene: 0.6, limonene: 0.5, myrcene: 0.3 }
    },
    'Super Lemon Haze': {
        chemotype: 'Limonene-Dominant Sativa',
        terpenes: { limonene: 1.2, terpinolene: 0.4, caryophyllene: 0.2 }
    }
};

const DEFAULT_TERPENES: Record<string, number> = { myrcene: 0.3, caryophyllene: 0.3, limonene: 0.3 };

/**
 * Enriches a list of products with simulated or determined chemotype data.
 */
export function enrichProductsWithChemotypes(products: ChatbotProduct[]): ChatbotProduct[] {
    return products.map(product => {
        // Simple fuzzy match for simulating data
        const matchedStrain = Object.keys(STRAIN_PROFILES).find(strain =>
            product.name.toLowerCase().includes(strain.toLowerCase())
        );

        if (matchedStrain) {
            const profile = STRAIN_PROFILES[matchedStrain];
            return {
                ...product,
                terpenes: profile.terpenes,
                chemotype: profile.chemotype
            };
        }

        // Fallback simulation based on Category/Name hints
        if (product.name.toLowerCase().includes('lemon') || product.name.toLowerCase().includes('sour')) {
            return {
                ...product,
                chemotype: 'Limonene-Rich (Guessed)',
                terpenes: { limonene: 0.8, caryophyllene: 0.2, myrcene: 0.1 }
            };
        }

        if (product.name.toLowerCase().includes('purple') || product.name.toLowerCase().includes('kush')) {
            return {
                ...product,
                chemotype: 'Myrcene-Rich (Guessed)',
                terpenes: { myrcene: 0.9, pinene: 0.1, caryophyllene: 0.2 }
            };
        }

        return {
            ...product,
            chemotype: 'Unknown Profile',
            terpenes: DEFAULT_TERPENES
        };
    });
}

/**
 * Ranks products based on how well their terpene profile matches the desired intent.
 * 
 * Intents mapping (simplified):
 * - Sleep/Relax -> Myrcene, Linalool
 * - Energy/Focus -> Limonene, Pinene, Terpinolene
 * - Pain -> Caryophyllene, Myrcene
 */
export function rankByChemotype(products: ChatbotProduct[], intent: string): ChatbotProduct[] {
    const scores = products.map(p => {
        let score = 0;
        const terps = p.terpenes || DEFAULT_TERPENES;

        // Scoring logic
        const lowerIntent = intent.toLowerCase();

        if (lowerIntent.includes('sleep') || lowerIntent.includes('relax') || lowerIntent.includes('calm')) {
            score += (terps.myrcene || 0) * 2;
            score += (terps.linalool || 0) * 3; // Linalool is rare but potent for sleep
        } else if (lowerIntent.includes('energy') || lowerIntent.includes('focus') || lowerIntent.includes('uplift')) {
            score += (terps.limonene || 0) * 2;
            score += (terps.pinene || 0) * 1.5;
            score += (terps.terpinolene || 0) * 2.5;
        } else if (lowerIntent.includes('pain') || lowerIntent.includes('relief')) {
            score += (terps.caryophyllene || 0) * 2;
            score += (terps.myrcene || 0) * 1;
        }

        return { product: p, score };
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score).map(s => s.product);
}
