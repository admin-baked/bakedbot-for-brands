/**
 * Unit Tests: Multi-Armed Bandit Algorithms
 */

import {
    createBandit,
    selectArm,
    updateArm,
    thompsonSample,
    ucbSelect,
    epsilonGreedySelect,
    getBestArm,
    getBanditStats,
    BanditArm,
    BanditState,
} from '@/server/algorithms/bandit';

describe('Multi-Armed Bandit', () => {
    describe('createBandit', () => {
        it('should create a bandit with given arms', () => {
            const bandit = createBandit('test_bandit', ['arm_a', 'arm_b', 'arm_c']);

            expect(bandit.bandit_id).toBe('test_bandit');
            expect(bandit.arms).toHaveLength(3);
            expect(bandit.strategy).toBe('thompson');
        });

        it('should initialize arms with zero stats', () => {
            const bandit = createBandit('test', ['arm_1']);
            const arm = bandit.arms[0];

            expect(arm.successes).toBe(0);
            expect(arm.failures).toBe(0);
            expect(arm.pulls).toBe(0);
        });
    });

    describe('thompsonSample', () => {
        it('should select an arm', () => {
            const arms: BanditArm[] = [
                { arm_id: 'a', successes: 5, failures: 5, pulls: 10 },
                { arm_id: 'b', successes: 8, failures: 2, pulls: 10 },
            ];

            const selection = thompsonSample(arms);

            expect(['a', 'b']).toContain(selection.arm_id);
        });

        it('should favor arms with higher success rate over time', () => {
            const arms: BanditArm[] = [
                { arm_id: 'loser', successes: 1, failures: 99, pulls: 100 },
                { arm_id: 'winner', successes: 90, failures: 10, pulls: 100 },
            ];

            // Run multiple samples
            let winnerCount = 0;
            for (let i = 0; i < 100; i++) {
                const selection = thompsonSample(arms);
                if (selection.arm_id === 'winner') winnerCount++;
            }

            // Winner should be selected most of the time
            expect(winnerCount).toBeGreaterThan(80);
        });
    });

    describe('ucbSelect', () => {
        it('should prioritize unexplored arms', () => {
            const arms: BanditArm[] = [
                { arm_id: 'explored', successes: 10, failures: 10, pulls: 20 },
                { arm_id: 'unexplored', successes: 0, failures: 0, pulls: 0 },
            ];

            const selection = ucbSelect(arms, 20);

            expect(selection.arm_id).toBe('unexplored');
            expect(selection.is_exploration).toBe(true);
        });

        it('should balance exploration and exploitation', () => {
            const arms: BanditArm[] = [
                { arm_id: 'good', successes: 8, failures: 2, pulls: 10 },
                { arm_id: 'bad', successes: 2, failures: 8, pulls: 10 },
            ];

            const selection = ucbSelect(arms, 20);

            // Good arm should be selected (higher mean + UCB)
            expect(selection.arm_id).toBe('good');
        });
    });

    describe('epsilonGreedySelect', () => {
        it('should mostly exploit best arm with low epsilon', () => {
            const arms: BanditArm[] = [
                { arm_id: 'best', successes: 90, failures: 10, pulls: 100 },
                { arm_id: 'worst', successes: 10, failures: 90, pulls: 100 },
            ];

            let bestCount = 0;
            for (let i = 0; i < 100; i++) {
                const selection = epsilonGreedySelect(arms, 0.1);
                if (selection.arm_id === 'best') bestCount++;
            }

            // Should exploit best ~90% of time (epsilon = 0.1)
            expect(bestCount).toBeGreaterThan(80);
        });
    });

    describe('updateArm', () => {
        it('should increment successes on positive reward', () => {
            const bandit = createBandit('test', ['arm_1']);
            const updated = updateArm(bandit, 'arm_1', true);

            expect(updated.arms[0].successes).toBe(1);
            expect(updated.arms[0].failures).toBe(0);
            expect(updated.arms[0].pulls).toBe(1);
        });

        it('should increment failures on negative reward', () => {
            const bandit = createBandit('test', ['arm_1']);
            const updated = updateArm(bandit, 'arm_1', false);

            expect(updated.arms[0].successes).toBe(0);
            expect(updated.arms[0].failures).toBe(1);
            expect(updated.arms[0].pulls).toBe(1);
        });
    });

    describe('getBestArm', () => {
        it('should return arm with highest success rate', () => {
            const bandit = createBandit('test', ['a', 'b', 'c']);
            let state = bandit;

            // Simulate: a=50%, b=80%, c=30%
            for (let i = 0; i < 5; i++) state = updateArm(state, 'a', true);
            for (let i = 0; i < 5; i++) state = updateArm(state, 'a', false);

            for (let i = 0; i < 8; i++) state = updateArm(state, 'b', true);
            for (let i = 0; i < 2; i++) state = updateArm(state, 'b', false);

            for (let i = 0; i < 3; i++) state = updateArm(state, 'c', true);
            for (let i = 0; i < 7; i++) state = updateArm(state, 'c', false);

            const best = getBestArm(state);
            expect(best.arm_id).toBe('b');
        });
    });

    describe('getBanditStats', () => {
        it('should return correct statistics', () => {
            const bandit = createBandit('test', ['a', 'b']);
            let state = bandit;

            state = updateArm(state, 'a', true);
            state = updateArm(state, 'a', true);
            state = updateArm(state, 'b', false);

            const stats = getBanditStats(state);

            expect(stats.total_pulls).toBe(3);
            expect(stats.best_arm).toBe('a');
            expect(stats.best_rate).toBe(1); // 2/2 = 100%
        });
    });

    describe('selectArm (strategy dispatch)', () => {
        it('should use thompson strategy by default', () => {
            const bandit = createBandit('test', ['a', 'b'], 'thompson');
            const selection = selectArm(bandit);

            expect(['a', 'b']).toContain(selection.arm_id);
        });

        it('should use ucb strategy when specified', () => {
            const bandit = createBandit('test', ['a', 'b'], 'ucb');
            // With no pulls, should select first unexplored
            const selection = selectArm(bandit);

            expect(selection.arm_id).toBe('a');
            expect(selection.is_exploration).toBe(true);
        });
    });
});
