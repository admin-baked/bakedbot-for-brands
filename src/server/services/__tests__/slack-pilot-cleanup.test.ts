const {
    buildPilotCleanupPlan,
    isPilotCleanupCandidate,
} = require('../slack-pilot-cleanup');

describe('slack-pilot-cleanup helpers', () => {
    it('matches pilot messages authored by the bot user or bot id', () => {
        const actor = { key: 'elroy', userId: 'U_ELROY', botId: 'B_ELROY' };

        expect(isPilotCleanupCandidate({ ts: '1.0', text: 'hello', user: 'U_ELROY' }, actor)).toBe(true);
        expect(isPilotCleanupCandidate({ ts: '1.1', text: 'hello', botId: 'B_ELROY' }, actor)).toBe(true);
        expect(isPilotCleanupCandidate({ ts: '1.2', text: 'hello', user: 'U_OTHER' }, actor)).toBe(false);
    });

    it('respects the beforeTs cutoff when planning cleanup', () => {
        const plan = buildPilotCleanupPlan(
            [
                { ts: '100.0', text: 'old', user: 'U_ELROY' },
                { ts: '200.0', text: 'new', user: 'U_ELROY' },
            ],
            [{ key: 'elroy', userId: 'U_ELROY' }],
            '150.0'
        );

        expect(plan).toEqual([
            { ts: '100.0', text: 'old', user: 'U_ELROY', actorKey: 'elroy' },
        ]);
    });

    it('deduplicates messages even when shared and persona tokens map to the same post', () => {
        const plan = buildPilotCleanupPlan(
            [{ ts: '123.45', text: 'same message', user: 'U_SHARED' }],
            [
                { key: 'shared', userId: 'U_SHARED' },
                { key: 'elroy', userId: 'U_SHARED' },
            ]
        );

        expect(plan).toHaveLength(1);
        expect(plan[0].actorKey).toBe('shared');
    });
});
