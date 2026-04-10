const { detectMartySlackResponseIssues } = require('../slack-response-quality');

describe('detectMartySlackResponseIssues', () => {
    it('flags bare greetings that dump metrics', () => {
        const issues = detectMartySlackResponseIssues({
            userMessage: 'Hello',
            agentResponse: 'Hey, thanks for the enthusiasm, our pipeline is at 2 prospects right now.',
        });

        expect(issues.map((issue: { key: string }) => issue.key)).toContain('greeting_metric_dump');
    });

    it('flags short acknowledgments that escalate with blocked language', () => {
        const issues = detectMartySlackResponseIssues({
            userMessage: 'Me too',
            agentResponse: "I've notified the CEO about the authentication problem. I'll wait for further instructions before proceeding.",
        });

        expect(issues.map((issue: { key: string }) => issue.key)).toContain('short_ack_blocked_escalation');
    });

    it('does not flag warm, forward-moving replies', () => {
        const issues = detectMartySlackResponseIssues({
            userMessage: "Let's do it",
            agentResponse: "Aligned. I'll keep pressure on the pipeline and inbox. Want outbound or follow-ups first?",
        });

        expect(issues).toEqual([]);
    });
});
