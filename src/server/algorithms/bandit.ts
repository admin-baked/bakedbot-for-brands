/**
 * Multi-Armed Bandit Implementation
 * 
 * Supports Thompson Sampling and UCB (Upper Confidence Bound).
 * Used for:
 * - Smokey: Exploring recommendations (top-N slots)
 * - Craig: Subject line / creative A/B testing
 * 
 * State is persisted per brand in domain memory.
 */

import { logger } from '@/lib/logger';

// --- Types ---

export interface BanditArm {
    arm_id: string;
    successes: number; // Alpha for Beta distribution
    failures: number;  // Beta for Beta distribution
    pulls: number;
    last_pulled?: string;
}

export interface BanditState {
    bandit_id: string;
    arms: BanditArm[];
    strategy: 'thompson' | 'ucb' | 'epsilon_greedy';
    epsilon?: number; // For epsilon-greedy
    created_at: string;
    updated_at: string;
}

export interface BanditSelection {
    arm_id: string;
    exploration_bonus: number;
    is_exploration: boolean;
}

// --- Thompson Sampling ---

/**
 * Samples from a Beta distribution using Box-Muller approximation.
 * Returns a value between 0 and 1.
 */
function sampleBeta(alpha: number, beta: number): number {
    // Use gamma distribution sampling for Beta
    // Beta(a, b) = Gamma(a) / (Gamma(a) + Gamma(b))
    const gammaA = sampleGamma(alpha);
    const gammaB = sampleGamma(beta);
    return gammaA / (gammaA + gammaB);
}

/**
 * Samples from a Gamma distribution using Marsaglia's method.
 */
function sampleGamma(shape: number): number {
    if (shape < 1) {
        return sampleGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x, v;
        do {
            x = randomNormal();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * (x * x) * (x * x)) {
            return d * v;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v;
        }
    }
}

function randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Selects an arm using Thompson Sampling.
 */
export function thompsonSample(arms: BanditArm[]): BanditSelection {
    let bestArm: BanditArm | null = null;
    let bestSample = -Infinity;

    const samples: Record<string, number> = {};

    for (const arm of arms) {
        // Prior: Beta(1, 1) = Uniform
        const alpha = arm.successes + 1;
        const beta = arm.failures + 1;
        const sample = sampleBeta(alpha, beta);
        samples[arm.arm_id] = sample;

        if (sample > bestSample) {
            bestSample = sample;
            bestArm = arm;
        }
    }

    if (!bestArm) {
        // Fallback: random selection
        bestArm = arms[Math.floor(Math.random() * arms.length)];
    }

    // Determine if this was exploration
    const empiricalBest = arms.reduce((best, arm) =>
        (arm.successes / Math.max(1, arm.pulls)) > (best.successes / Math.max(1, best.pulls)) ? arm : best
        , arms[0]);

    const isExploration = bestArm.arm_id !== empiricalBest.arm_id;

    return {
        arm_id: bestArm.arm_id,
        exploration_bonus: bestSample,
        is_exploration: isExploration,
    };
}

// --- UCB (Upper Confidence Bound) ---

/**
 * Selects an arm using UCB1 algorithm.
 */
export function ucbSelect(arms: BanditArm[], totalPulls: number): BanditSelection {
    let bestArm: BanditArm | null = null;
    let bestUcb = -Infinity;

    for (const arm of arms) {
        // If arm never pulled, prioritize it (infinite UCB)
        if (arm.pulls === 0) {
            return {
                arm_id: arm.arm_id,
                exploration_bonus: Infinity,
                is_exploration: true,
            };
        }

        const mean = arm.successes / arm.pulls;
        const exploration = Math.sqrt((2 * Math.log(totalPulls)) / arm.pulls);
        const ucbValue = mean + exploration;

        if (ucbValue > bestUcb) {
            bestUcb = ucbValue;
            bestArm = arm;
        }
    }

    if (!bestArm) {
        bestArm = arms[0];
    }

    // Check if exploration term dominated
    const empiricalBest = arms.reduce((best, arm) =>
        (arm.successes / Math.max(1, arm.pulls)) > (best.successes / Math.max(1, best.pulls)) ? arm : best
        , arms[0]);

    return {
        arm_id: bestArm.arm_id,
        exploration_bonus: bestUcb,
        is_exploration: bestArm.arm_id !== empiricalBest.arm_id,
    };
}

// --- Epsilon Greedy ---

/**
 * Selects an arm using epsilon-greedy strategy.
 */
export function epsilonGreedySelect(arms: BanditArm[], epsilon: number = 0.1): BanditSelection {
    const explore = Math.random() < epsilon;

    if (explore) {
        // Random selection
        const randomArm = arms[Math.floor(Math.random() * arms.length)];
        return {
            arm_id: randomArm.arm_id,
            exploration_bonus: 0,
            is_exploration: true,
        };
    }

    // Exploit: pick best empirical arm
    const bestArm = arms.reduce((best, arm) => {
        const bestRate = best.successes / Math.max(1, best.pulls);
        const armRate = arm.successes / Math.max(1, arm.pulls);
        return armRate > bestRate ? arm : best;
    }, arms[0]);

    return {
        arm_id: bestArm.arm_id,
        exploration_bonus: bestArm.successes / Math.max(1, bestArm.pulls),
        is_exploration: false,
    };
}

// --- State Management ---

/**
 * Creates a new bandit state.
 */
export function createBandit(
    banditId: string,
    armIds: string[],
    strategy: BanditState['strategy'] = 'thompson'
): BanditState {
    const now = new Date().toISOString();

    return {
        bandit_id: banditId,
        arms: armIds.map(id => ({
            arm_id: id,
            successes: 0,
            failures: 0,
            pulls: 0,
        })),
        strategy,
        created_at: now,
        updated_at: now,
    };
}

/**
 * Selects an arm from the bandit based on strategy.
 */
export function selectArm(state: BanditState): BanditSelection {
    switch (state.strategy) {
        case 'thompson':
            return thompsonSample(state.arms);
        case 'ucb':
            const totalPulls = state.arms.reduce((sum, arm) => sum + arm.pulls, 0);
            return ucbSelect(state.arms, Math.max(1, totalPulls));
        case 'epsilon_greedy':
            return epsilonGreedySelect(state.arms, state.epsilon || 0.1);
        default:
            return thompsonSample(state.arms);
    }
}

/**
 * Updates bandit state after observing a reward.
 */
export function updateArm(
    state: BanditState,
    armId: string,
    reward: boolean
): BanditState {
    const armIndex = state.arms.findIndex(a => a.arm_id === armId);

    if (armIndex === -1) {
        logger.warn(`[Bandit] Arm ${armId} not found in bandit ${state.bandit_id}`);
        return state;
    }

    const arm = state.arms[armIndex];

    return {
        ...state,
        arms: [
            ...state.arms.slice(0, armIndex),
            {
                ...arm,
                successes: arm.successes + (reward ? 1 : 0),
                failures: arm.failures + (reward ? 0 : 1),
                pulls: arm.pulls + 1,
                last_pulled: new Date().toISOString(),
            },
            ...state.arms.slice(armIndex + 1),
        ],
        updated_at: new Date().toISOString(),
    };
}

/**
 * Gets the current best arm based on empirical success rate.
 */
export function getBestArm(state: BanditState): BanditArm {
    return state.arms.reduce((best, arm) => {
        const bestRate = best.successes / Math.max(1, best.pulls);
        const armRate = arm.successes / Math.max(1, arm.pulls);
        return armRate > bestRate ? arm : best;
    }, state.arms[0]);
}

/**
 * Gets statistics for reporting.
 */
export function getBanditStats(state: BanditState): {
    total_pulls: number;
    best_arm: string;
    best_rate: number;
    exploration_rate: number;
} {
    const totalPulls = state.arms.reduce((sum, arm) => sum + arm.pulls, 0);
    const best = getBestArm(state);

    // Estimate exploration rate (arms with < 10% of pulls)
    const underexplored = state.arms.filter(a => a.pulls < totalPulls * 0.1).length;
    const explorationRate = underexplored / state.arms.length;

    return {
        total_pulls: totalPulls,
        best_arm: best.arm_id,
        best_rate: best.successes / Math.max(1, best.pulls),
        exploration_rate: explorationRate,
    };
}
