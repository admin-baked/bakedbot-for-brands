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
