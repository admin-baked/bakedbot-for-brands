'use server';

import { requireUser } from '@/server/auth/auth';
import { LoyaltySettings, LoyaltyCampaign, CampaignType } from '@/types/customers';

// Mock Data for MVP
let mockSettings: LoyaltySettings = {
    pointsPerDollar: 1,
    equityMultiplier: 1.5,
    tiers: [
        { id: 'bronze', name: 'Bronze', threshold: 0, color: 'bg-orange-100 text-orange-800', benefits: ['Earn Points'] },
        { id: 'silver', name: 'Silver', threshold: 500, color: 'bg-gray-100 text-gray-800', benefits: ['1.2x Points', 'Free Delivery'] },
        { id: 'gold', name: 'Gold', threshold: 2000, color: 'bg-yellow-100 text-yellow-800', benefits: ['1.5x Points', 'Priority Access', 'Quarterly Gift'] }
    ]
};

let mockCampaigns: LoyaltyCampaign[] = [
    {
        id: 'camp_bday',
        type: 'birthday',
        name: 'Birthday Blast',
        enabled: true,
        description: 'Send a "Free Pre-roll" offer on their birthday.',
        stats: { sent: 142, converted: 89 }
    },
    {
        id: 'camp_vip',
        type: 'vip_welcome',
        name: 'VIP Welcome',
        enabled: true,
        description: 'Welcome new Gold tier members with a $20 credit.',
        stats: { sent: 34, converted: 30 }
    },
    {
        id: 'camp_winback',
        type: 'winback',
        name: 'Slipping Winback',
        enabled: false,
        description: 'Offer 10% off if no visit in 60 days.',
        stats: { sent: 0, converted: 0 }
    }
];

export async function getLoyaltySettings() {
    await requireUser(['brand', 'owner']);
    return mockSettings;
}

export async function getLoyaltyCampaigns() {
    await requireUser(['brand', 'owner']);
    return mockCampaigns;
}

export async function toggleLoyaltyCampaign(id: string) {
    await requireUser(['brand', 'owner']);
    const camp = mockCampaigns.find(c => c.id === id);
    if (camp) {
        camp.enabled = !camp.enabled;
        return camp;
    }
    throw new Error('Campaign not found');
}

export async function triggerCampaignTest(type: CampaignType) {
    await requireUser(['brand', 'owner']);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, message: `Successfully simulated ${type} trigger for 5 random customers.` };
}

export async function updateLoyaltySettings(settings: Partial<LoyaltySettings>) {
    await requireUser(['brand', 'owner']);
    mockSettings = { ...mockSettings, ...settings };
    return mockSettings;
}
