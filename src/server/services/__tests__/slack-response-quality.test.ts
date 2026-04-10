const { detectMartySlackResponseIssues, detectSlackResponseIssues } = require('../slack-response-quality');

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

    it('flags blocked replies with no next step for other Slack agents too', () => {
        const issues = detectSlackResponseIssues('elroy', {
            userMessage: 'can you update the site?',
            agentResponse: "I'm blocked on WordPress access right now.",
        });

        expect(issues.map((issue: { key: string }) => issue.key)).toContain('blocked_no_next_step');
    });

    it('does not flag blockers when a next step is offered', () => {
        const issues = detectSlackResponseIssues('linus', {
            userMessage: 'check the build',
            agentResponse: "I'm blocked by GitHub auth right now. Want me to request access and rerun the check?",
        });

        expect(issues.map((issue: { key: string }) => issue.key)).not.toContain('blocked_no_next_step');
    });

    it('flags Elroy sales lookups that fall back to generic no-data language', () => {
        const issues = detectSlackResponseIssues('elroy', {
            userMessage: "what's our top seller yesterday?",
            agentResponse: 'No product sales data available.',
        });

        expect(issues.map((issue: { key: string }) => issue.key)).toContain('sales_lookup_miss');
    });

    it('flags Elroy when a past month is treated like a future lookup', () => {
        const issues = detectSlackResponseIssues('elroy', {
            userMessage: "what's our gross sales for February 2026?",
            agentResponse: "I can't look up that far in the future right now.",
        });

        expect(issues.map((issue: { key: string }) => issue.key)).toContain('past_date_future_confusion');
    });
});
