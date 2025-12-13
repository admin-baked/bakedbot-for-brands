export interface CampaignCandidate {
    id: string;
    objective: string;
    impact_score: number;  // 1-10 normalized
    urgency_score: number; // 1-10 normalized
    fatigue_score: number; // 0-10 normalized (how spammed is the segment)
    status: string;
}

/**
 * Calculates priority for a campaign execution.
 * Formula: priority = (impact * urgency) / (1 + fatigue)
 */
export function calculateCampaignPriority(campaign: CampaignCandidate): number {
    // Ensure inputs are numbers
    const impact = campaign.impact_score || 1;
    const urgency = campaign.urgency_score || 1;
    const fatigue = campaign.fatigue_score || 0;


    return (impact * urgency) / (1 + fatigue);
}

export interface CampaignVariant {
    id: string;
    impressions: number;
    conversions: number;
}

/**
 * Multi-Armed Bandit Selector (Epsilon-Greedy).
 * 
 * @param variants List of variants to choose from
 * @param epsilon Exploration rate (0.0 - 1.0). 0.1 means 10% random exploration.
 */
export function selectVariant(variants: CampaignVariant[], epsilon: number = 0.1): CampaignVariant {
    if (!variants || variants.length === 0) {
        throw new Error("No variants provided to selectVariant");
    }

    // 1. Explore?
    if (Math.random() < epsilon) {
        const randomIndex = Math.floor(Math.random() * variants.length);
        return variants[randomIndex];
    }

    // 2. Exploit (Find best CTR)
    let bestVariant = variants[0];
    let bestCtr = -1;

    for (const v of variants) {
        // Handle cold start (0 impressions) -> Treat as maybe infinity or just 0?
        // Standard UCB would give bonus, but for Epsilon-Greedy, we usually just estimate mean.
        // If impressions 0, CTR is undefined. Let's assume 0, relying on Epsilon cover to explore it.
        const ctr = v.impressions > 0 ? v.conversions / v.impressions : 0;

        if (ctr > bestCtr) {
            bestCtr = ctr;
            bestVariant = v;
        }
    }

    return bestVariant;
}
