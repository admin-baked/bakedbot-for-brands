/**
 * Revenue Goal — high-level target set by the user, decomposed by Marty
 * into agent_tasks that are dispatched to business agents.
 *
 * Collection: revenue_goals
 */

export type RevenueGoalStatus = 'active' | 'achieved' | 'missed' | 'draft';

export interface RevenueGoal {
    id: string;
    title: string;             // "Grow MRR to $50k by June 1"
    targetMRR: number;         // 50000
    currentMRR: number;        // snapshot at creation time
    deadline: string;          // ISO date string "2026-06-01"
    status: RevenueGoalStatus;

    /** Task IDs Marty created when decomposing this goal */
    taskIds: string[];

    /** Total estimated USD impact across all decomposed tasks */
    estimatedTotalImpactUSD?: number;

    /** How this goal was created */
    createdBy: 'marty_auto' | 'user';

    /** Marty's reasoning for the decomposition (stored for transparency) */
    decompositionReasoning?: string;

    createdAt: string;  // ISO
    updatedAt: string;  // ISO
    achievedAt?: string; // ISO — set when currentMRR >= targetMRR
}

export interface CreateRevenueGoalInput {
    title: string;
    targetMRR: number;
    currentMRR: number;
    deadline: string;
}

/** One task item as returned by Marty's decomposition Claude call */
export interface MartyDecompTask {
    title: string;
    body: string;
    businessAgent: string;   // 'marty' | 'craig' | 'smokey' | 'linus' | 'mrs_parker'
    playbookId?: string;
    estimatedImpactUSD: number;
    priority: 'critical' | 'high' | 'normal' | 'low';
    category: string;
    rationale: string;       // Marty's one-line reason for this task
}

export interface MartyDecompResult {
    tasks: MartyDecompTask[];
    reasoning: string;       // Overall strategy summary
    estimatedTotalImpactUSD: number;
    weeklyTarget: number;    // $/week needed to hit goal on time
}
