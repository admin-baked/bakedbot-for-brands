import priorsData from './data/priors.json';

export interface EffectPrior {
    tag: string;
    weight: number;
}

export type PriorCategory = 'flower' | 'vapes' | 'edibles' | 'extracts' | 'prerolls';

export class GlobalIntelligenceService {

    /**
     * Get effect associations for a user need (Global Prior)
     * e.g. "sleep" -> [{tag: "indica", weight: 0.8}, ...]
     */
    static getEffectPriors(need: string): EffectPrior[] {
        const key = need.toLowerCase() as keyof typeof priorsData.effects;
        return priorsData.effects[key] || [];
    }

    /**
     * Get baseline price elasticity for a category
     * e.g. "flower" -> -1.2 (Elastic)
     */
    static getElasticityBaseline(category: string): number {
        const normalized = category.toLowerCase();
        // Simple mapping to keys
        let key: keyof typeof priorsData.elasticity = 'default';

        if (normalized.includes('flower')) key = 'flower';
        else if (normalized.includes('vape') || normalized.includes('cart')) key = 'vapes';
        else if (normalized.includes('edible') || normalized.includes('gummy')) key = 'edibles';
        else if (normalized.includes('extract') || normalized.includes('wax')) key = 'extracts';
        else if (normalized.includes('roll') || normalized.includes('joint')) key = 'prerolls';

        return priorsData.elasticity[key];
    }
}
