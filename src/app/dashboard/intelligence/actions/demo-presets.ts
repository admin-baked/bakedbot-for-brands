'use server';

/**
 * Live Demo Actions for Preset Prompts
 * Server Actions wrapper - actual logic in service file
 */

import {
    getDemoProductRecommendations as getProductRecommendations,
    getDemoCampaignDraft as getCampaignDraft,
    getDemoBrandFootprint as getBrandFootprint,
    getDemoPricingPlans as getPricingPlans,
} from '@/server/services/demo-presets';

// Re-export service functions as Server Actions
export async function getDemoProductRecommendations(locationOrQuery: string) {
    return getProductRecommendations(locationOrQuery);
}

export async function getDemoCampaignDraft(campaignType: string = 'New Drop') {
    return getCampaignDraft(campaignType);
}

export async function getDemoBrandFootprint(brandName: string = 'Your Brand') {
    return getBrandFootprint(brandName);
}

export async function getDemoPricingPlans() {
    return getPricingPlans();
}
