/**
 * Craig Campaign Priority Algorithm
 * 
 * Computes priority for campaigns using the formula:
 *   priority = (impact_score * urgency_score) / (1 + fatigue_score)
 * 
 * This ensures:
 * - High-impact campaigns get priority
 * - Urgent campaigns (expiring offers, holidays) get boosted
 * - Over-contacted segments get deprioritized
 */

import { CampaignPriorityInput } from './schema';

// --- Types ---

export interface Campaign extends CampaignPriorityInput {
    name: string;
    segment_id: string;
    status: 'queued' | 'running' | 'paused' | 'completed';
    start_date?: string;
    end_date?: string;
    variants?: string[]; // Subject line variants
}

export interface PrioritizedCampaign extends Campaign {
    priority: number;
    priority_rank: number;
}

// --- Priority Computation ---

/**
 * Computes priority score for a single campaign.
 * All input scores should be 0-100.
 */
export function computeCampaignPriority(input: CampaignPriorityInput): number {
    const { impact_score, urgency_score, fatigue_score } = input;

    // Normalize to 0-1 range
    const impactNorm = Math.min(100, Math.max(0, impact_score)) / 100;
    const urgencyNorm = Math.min(100, Math.max(0, urgency_score)) / 100;
    const fatigueNorm = Math.min(100, Math.max(0, fatigue_score)) / 100;

    // Core formula
    const priority = (impactNorm * urgencyNorm) / (1 + fatigueNorm);

    // Scale to 0-100 for readability
    return Math.round(priority * 100 * 100) / 100;
}

/**
 * Selects the top campaign from a list of eligible campaigns.
 * Returns null if no eligible campaigns exist.
 */
export function selectTopCampaign(campaigns: Campaign[]): PrioritizedCampaign | null {
    // Filter to only queued campaigns
    const eligible = campaigns.filter(c => c.status === 'queued');

    if (eligible.length === 0) {
        return null;
    }

    // Compute priorities
    const prioritized: PrioritizedCampaign[] = eligible.map(campaign => ({
        ...campaign,
        priority: computeCampaignPriority(campaign),
        priority_rank: 0,
    }));

    // Sort by priority descending
    prioritized.sort((a, b) => b.priority - a.priority);

    // Assign ranks
    prioritized.forEach((p, idx) => {
        p.priority_rank = idx + 1;
    });

    return prioritized[0];
}

/**
 * Ranks all campaigns by priority.
 * Useful for displaying backlog in dashboard.
 */
export function rankCampaigns(campaigns: Campaign[]): PrioritizedCampaign[] {
    const prioritized: PrioritizedCampaign[] = campaigns.map(campaign => ({
        ...campaign,
        priority: computeCampaignPriority(campaign),
        priority_rank: 0,
    }));

    // Sort by priority descending
    prioritized.sort((a, b) => b.priority - a.priority);

    // Assign ranks
    prioritized.forEach((p, idx) => {
        p.priority_rank = idx + 1;
    });

    return prioritized;
}

// --- Send Time Optimization (Phase 1 - Simple Heuristic) ---

/**
 * Simple send-time heuristic.
 * Returns best hours to send for a segment based on historical patterns.
 * Phase 2 will replace this with learned histograms.
 */
export function getSendTimeHeuristic(segmentType: string): { bestHours: number[]; bestDays: number[] } {
    // Default heuristics based on common patterns
    const heuristics: Record<string, { bestHours: number[]; bestDays: number[] }> = {
        recreational: {
            bestHours: [17, 18, 19, 20], // Evening
            bestDays: [4, 5, 6], // Thu-Sat
        },
        medical: {
            bestHours: [9, 10, 11, 14, 15], // Business hours
            bestDays: [1, 2, 3, 4], // Mon-Thu
        },
        default: {
            bestHours: [10, 11, 17, 18],
            bestDays: [2, 3, 4], // Tue-Thu
        },
    };

    return heuristics[segmentType] || heuristics.default;
}

/**
 * Picks a send time from the heuristic with slight randomization.
 * This provides basic exploration for learning in Phase 2.
 */
export function pickSendTime(segmentType: string): Date {
    const { bestHours, bestDays } = getSendTimeHeuristic(segmentType);

    // Pick random from best options
    const hour = bestHours[Math.floor(Math.random() * bestHours.length)];
    const targetDay = bestDays[Math.floor(Math.random() * bestDays.length)];

    const now = new Date();
    const currentDay = now.getDay();

    // Calculate days until target day
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    const sendDate = new Date(now);
    sendDate.setDate(sendDate.getDate() + daysUntil);
    sendDate.setHours(hour, 0, 0, 0);

    return sendDate;
}
