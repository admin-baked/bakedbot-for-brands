export type CustomerSegment = 'VIP' | 'Loyal' | 'New' | 'Slipping' | 'Risk' | 'Churned';

export interface CustomerProfile {
    id: string; // Email as ID
    name: string;
    email: string;
    phone?: string;
    visits: number;
    lastVisit: string; // ISO date
    totalSpent: number;
    segment: CustomerSegment;
    tier: string; // Bronze, Silver, Gold
    points: number;
    lifetimeValue: number;
    birthDate?: string;
    equityStatus?: boolean; // For equity-first programs
}

export interface LoyaltyTier {
    id: string;
    name: string;
    threshold: number; // Spend required
    color: string;
    benefits: string[];
}

export interface LoyaltySettings {
    pointsPerDollar: number;
    tiers: LoyaltyTier[];
    equityMultiplier: number; // e.g. 1.2x points for equity applicants
}

export type CampaignType = 'birthday' | 'winback' | 'vip_welcome';

export interface LoyaltyCampaign {
    id: string;
    type: CampaignType;
    name: string;
    enabled: boolean;
    description: string;
    stats: {
        sent: number;
        converted: number;
    };
}
