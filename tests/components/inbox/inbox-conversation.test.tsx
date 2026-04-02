/**
 * Tests for InboxConversation job polling integration
 *
 * These tests verify that the component correctly uses useJobPoller
 * instead of HTTP polling for job status updates.
 */

// The InboxConversation component has many dependencies that make full
// render testing complex. Instead, we verify the key architectural change:
// that useJobPoller is imported and would be used for job status polling.

function readSource(relativePath: string) {
    const fs = require('fs');
    const path = require('path');

    return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
}

function readInboxConversationSource() {
    return readSource('src/components/inbox/inbox-conversation.tsx');
}

function readJobPollerSource() {
    return readSource('src/hooks/use-job-poller.ts');
}

function readAgentJobRouteSource() {
    return readSource('src/app/api/jobs/agent/route.ts');
}

function readJobStreamSource() {
    return readSource('src/server/jobs/job-stream.ts');
}

describe('InboxConversation Job Polling', () => {
    describe('architecture verification', () => {
        it('should import useJobPoller from the correct module', async () => {
            const content = readInboxConversationSource();

            // Verify useJobPoller is imported
            expect(content).toContain("from '@/hooks/use-job-poller'");
            expect(content).toContain('useJobPoller');
        });

        it('should call useJobPoller hook in the component', async () => {
            const content = readInboxConversationSource();

            // Verify useJobPoller is called with currentJobId
            expect(content).toContain('useJobPoller(currentJobId');
        });

        it('should NOT use HTTP fetch polling for jobs', async () => {
            const content = readInboxConversationSource();

            // Verify the old HTTP polling pattern is removed
            expect(content).not.toContain("fetch(`/api/jobs/");
            expect(content).not.toContain('setInterval(pollJob');
        });

        it('should handle job completion via useEffect', async () => {
            const content = readInboxConversationSource();

            // Verify job completion is handled via useEffect watching isComplete
            expect(content).toContain('isComplete');
            expect(content).toContain("job.status === 'completed'");
            expect(content).toContain("job.status === 'failed'");
        });

        it('should handle job polling errors', async () => {
            const content = readInboxConversationSource();

            // Verify jobError handling is present
            expect(content).toContain('jobError');
            expect(content).toContain('Job polling error');
        });

        it('should create an assistant placeholder immediately and update it in place', async () => {
            const content = readInboxConversationSource();

            expect(content).toContain('thinkingMessage');
            expect(content).toContain('addMessageToThread(thread.id, thinkingMessage);');
            expect(content).toContain('setCurrentThinkingMessageId(thinkingMessage.id);');
            expect(content).toContain('setIsSubmitting(true)');
            expect(content).toContain('syncPreview: true');
        });

        it('should wait for pending thread setup before auto-submitting seeded prompts', async () => {
            const content = readInboxConversationSource();

            expect(content).toContain('hasPendingAutoSubmit.current && !isPending && !isSubmitting');
            expect(content).toContain('void handleSubmit();');
        });

        it('should keep stop-response behavior scoped to inbox actions', async () => {
            const content = readInboxConversationSource();

            expect(content).toContain('cancelInboxAgentJob');
            expect(content).not.toContain("from '@/app/dashboard/ceo/agents/actions'");
        });

        it('should stream draft content into the placeholder while the job is running', async () => {
            const content = readInboxConversationSource();

            expect(content).toContain("job?.draftContent");
            expect(content).toContain("content: job?.draftContent");
            expect(content).toContain("id: `job-${job.id}`");
            expect(content).toContain("id: job.status === 'cancelled' ? `job-cancelled-${job.id}` : `job-error-${job.id}`");
        });

        it('should reset inline generators on thread change instead of auto-closing manual launches', async () => {
            const content = readInboxConversationSource();

            expect(content).toContain('const resetInlineGenerators = React.useCallback(() => {');
            expect(content).toContain('resetInlineGenerators();');
            expect(content).toContain('}, [thread.id, resetInlineGenerators]);');
        });

        it('should only show the Bundle Creator button for bundle threads', async () => {
            const content = readInboxConversationSource();

            // Verify the corrected condition for the Bundle Creator button
            expect(content).toContain("thread.type === 'bundle'");
            expect(content).toContain('Show Bundle Creator');
        });
    });

    describe('useJobPoller hook behavior', () => {
        it('should use Firestore real-time listeners', async () => {
            const content = readJobPollerSource();

            // Verify Firestore onSnapshot is used (real-time)
            expect(content).toContain('onSnapshot');
            expect(content).toContain("doc(db, 'jobs', jobId)");
            expect(content).toContain('draftContent');
            expect(content).toContain('draftState');
        });

        it('should not use HTTP fetch for job status', async () => {
            const content = readJobPollerSource();

            // Verify no HTTP polling
            expect(content).not.toContain('fetch(');
            expect(content).not.toContain('/api/jobs');
        });
    });

    describe('async worker pipeline', () => {
        it('should publish throttled draft content through the job stream helper', async () => {
            const routeContent = readAgentJobRouteSource();

            expect(routeContent).toContain('JobDraftPublisher');
            expect(routeContent).toContain('markJobRunning');
            expect(routeContent).toContain('finalizeJobSuccess');
            expect(routeContent).toContain('finalizeJobFailure');
            expect(routeContent).toContain('draftPublisher.push');
        });

        it('should centralize terminal guards in the canonical job stream module', async () => {
            const helperContent = readJobStreamSource();

            expect(helperContent).toContain('isTerminalJobStatus');
            expect(helperContent).toContain('JobDraftPublisher');
            expect(helperContent).toContain('finalizeJobSuccess');
            expect(helperContent).toContain('finalizeJobFailure');
            expect(helperContent).toContain('cancelJob');
        });
    });
});
