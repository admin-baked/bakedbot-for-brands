export interface CompetitorSeed {
    name: string;
    city?: string;
    state?: string;
    address?: string;
    menuUrl?: string;
}

const COMPETITOR_PRESETS: Record<string, CompetitorSeed[]> = {
    simplypuretrenton: [
        { name: 'Zenleaf', city: 'Linden', state: 'NJ', menuUrl: 'https://zenleafmj.com' },
        { name: 'Bloc Ewing', city: 'Ewing', state: 'NJ', menuUrl: 'https://blocewing.com' },
        { name: 'Moja Life', city: 'New Jersey', state: 'NJ' },
        { name: 'Theory Wellness', city: 'Hamilton', state: 'NJ', menuUrl: 'https://theorywellness.com' },
        { name: 'Northeast Alternatives', city: 'New Jersey', state: 'NJ', menuUrl: 'https://northeastalternatives.com' },
        { name: 'Toka Lane Trenton', city: 'Trenton', state: 'NJ' },
        { name: 'Pure Blossom', city: 'New Jersey', state: 'NJ' },
        { name: 'Jersey Meds', city: 'New Jersey', state: 'NJ' },
        { name: 'Sky Cannabis', city: 'New Jersey', state: 'NJ' },
        { name: 'Got Your Six', city: 'New Jersey', state: 'NJ' },
    ],
};

export function getCompetitorPreset(orgId: string): CompetitorSeed[] {
    return COMPETITOR_PRESETS[orgId] ?? [];
}
