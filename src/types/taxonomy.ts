export type EffectType = 'Mental' | 'Physical' | 'Mood';

export interface Terpene {
    name: string;
    aroma: string[];
    effects: string[]; // Associated effects (e.g. Limonene -> Energy)
    description: string;
}

export interface Cannabinoid {
    name: string;
    abbreviation: string; // THC, CBD, CBN
    type: 'Major' | 'Minor';
    psychoactive: boolean;
}

export interface StrainLineage {
    type: 'Sativa' | 'Indica' | 'Hybrid';
    dominance?: 'Sativa-Dominant' | 'Indica-Dominant';
    parents: string[]; // e.g. ["Blue Dream", "GSC"]
    breeder?: string;
}

// Master List of Terpenes
export const TERPENES: Terpene[] = [
    { name: 'Myrcene', aroma: ['Earthy', 'Musky'], effects: ['Sedation', 'Relaxation'], description: 'The "Couch Lock" terpene.' },
    { name: 'Limonene', aroma: ['Citrus', 'Lemon'], effects: ['Energy', 'Mood Elevation'], description: 'Zesty and uplifting.' },
    { name: 'Caryophyllene', aroma: ['Pepper', 'Spice'], effects: ['Pain Relief', 'Anti-Inflammatory'], description: 'The only terpene that acts as a cannabinoid.' },
    { name: 'Pinene', aroma: ['Pine', 'Forest'], effects: ['Focus', 'Alertness'], description: 'Smells like Christmas trees.' },
    { name: 'Linalool', aroma: ['Floral', 'Lavender'], effects: ['Calm', 'Anxiety Relief'], description: 'Floral and soothing.' },
    { name: 'Humulene', aroma: ['Hops', 'Earthy'], effects: ['Appetite Supression', 'Anti-Inflammatory'], description: 'Hoppy and woody.' },
    { name: 'Terpinolene', aroma: ['Floral', 'Herbal'], effects: ['Uplifting', 'Focus'], description: 'Complex and fruity.' }
];

// Master List of Effects
export const EFFECTS = [
    'Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative',
    'Energetic', 'Focused', 'Sleepy', 'Hungry', 'Talkative',
    'Tingly', 'Giggly', 'Aroused'
];
