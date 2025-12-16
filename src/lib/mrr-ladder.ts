/**
 * MRR Ladder Calculation - Client-Safe
 * 
 * Pure function that calculates MRR tier progress.
 * This file has NO server dependencies and is safe for client components.
 */

export interface MrrLadder {
    currentTier: string;
    nextMilestone: number;
    progress: number;
    claimsNeeded: number;
}

/**
 * Calculate MRR ladder progress
 */
export function calculateMrrLadder(currentMrr: number): MrrLadder {
    const tiers = [
        { name: '$10K MRR', target: 10000, claimsEstimate: 100 },
        { name: '$25K MRR', target: 25000, claimsEstimate: 250 },
        { name: '$50K MRR', target: 50000, claimsEstimate: 500 }
    ];

    let currentTier = 'Pre-Launch';
    let nextMilestone = 10000;
    let progress = 0;
    let claimsNeeded = 100;

    for (const tier of tiers) {
        if (currentMrr >= tier.target) {
            currentTier = tier.name;
        } else {
            nextMilestone = tier.target;
            progress = Math.round((currentMrr / tier.target) * 100);
            claimsNeeded = Math.max(0, tier.claimsEstimate - Math.floor(currentMrr / 99));
            break;
        }
    }

    if (currentMrr >= 50000) {
        currentTier = '$50K MRR';
        nextMilestone = 100000;
        progress = Math.round((currentMrr / 100000) * 100);
        claimsNeeded = 0;
    }

    return { currentTier, nextMilestone, progress, claimsNeeded };
}
