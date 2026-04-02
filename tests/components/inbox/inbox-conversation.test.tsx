/**
 * Tests for InboxConversation job polling integration
 *
 * These tests verify that the component correctly uses useJobPoller
 * instead of HTTP polling for job status updates.
 */

// The InboxConversation component has many dependencies that make full
// render testing complex. Instead, we verify the key architectural change:
// that useJobPoller is imported and would be used for job status polling.

describe('InboxConversation Job Polling', () => {
    describe('architecture verification', () => {
        it('should import useJobPoller from the correct module', async () => {
            // Dynamically import the module to check its imports
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify useJobPoller is imported
            expect(content).toContain("from '@/hooks/use-job-poller'");
            expect(content).toContain('useJobPoller');
        });

        it('should call useJobPoller hook in the component', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify useJobPoller is called with currentJobId
            expect(content).toContain('useJobPoller(currentJobId');
        });

        it('should NOT use HTTP fetch polling for jobs', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify the old HTTP polling pattern is removed
            expect(content).not.toContain("fetch(`/api/jobs/");
            expect(content).not.toContain('setInterval(pollJob');
        });

        it('should handle job completion via useEffect', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify job completion is handled via useEffect watching isComplete
            expect(content).toContain('isComplete');
            expect(content).toContain("job.status === 'completed'");
            expect(content).toContain("job.status === 'failed'");
        });

        it('should handle job polling errors', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify jobError handling is present
            expect(content).toContain('jobError');
            expect(content).toContain('Job polling error');
        });

        it('should create an assistant placeholder immediately and update it in place', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('thinkingMessage');
            expect(content).toContain('addMessageToThread(thread.id, thinkingMessage);');
            expect(content).toContain('setCurrentThinkingMessageId(thinkingMessage.id);');
            expect(content).toContain('setIsSubmitting(true)');
            expect(content).toContain('syncPreview: true');
        });

        it('should keep stop-response behavior scoped to inbox actions', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('cancelInboxAgentJob');
            expect(content).not.toContain("from '@/app/dashboard/ceo/agents/actions'");
        });

        it('should stream draft content into the placeholder while the job is running', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain("job?.draftContent");
            expect(content).toContain("content: job?.draftContent");
            expect(content).toContain("id: `job-${job.id}`");
            expect(content).toContain("id: job.status === 'cancelled' ? `job-cancelled-${job.id}` : `job-error-${job.id}`");
        });

        it('should reset inline generators on thread change instead of auto-closing manual launches', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            expect(content).toContain('const resetInlineGenerators = React.useCallback(() => {');
            expect(content).toContain('resetInlineGenerators();');
            expect(content).toContain('}, [thread.id, resetInlineGenerators]);');
        });

        it('should only show the Bundle Creator button for bundle threads', async () => {
            const fs = require('fs');
            const path = require('path');

            const componentPath = path.join(
                process.cwd(),
                'src/components/inbox/inbox-conversation.tsx'
            );
            const content = fs.readFileSync(componentPath, 'utf-8');

            // Verify the corrected condition for the Bundle Creator button
            expect(content).toContain("thread.type === 'bundle'");
            expect(content).toContain('Show Bundle Creator');
        });
    });

    describe('useJobPoller hook behavior', () => {
        it('should use Firestore real-time listeners', async () => {
            const fs = require('fs');
            const path = require('path');

            const hookPath = path.join(
                process.cwd(),
                'src/hooks/use-job-poller.ts'
            );
            const content = fs.readFileSync(hookPath, 'utf-8');

            // Verify Firestore onSnapshot is used (real-time)
            expect(content).toContain('onSnapshot');
            expect(content).toContain("doc(db, 'jobs', jobId)");
            expect(content).toContain('draftContent');
            expect(content).toContain('draftState');
        });

        it('should not use HTTP fetch for job status', async () => {
            const fs = require('fs');
            const path = require('path');

            const hookPath = path.join(
                process.cwd(),
                'src/hooks/use-job-poller.ts'
            );
            const content = fs.readFileSync(hookPath, 'utf-8');

            // Verify no HTTP polling
            expect(content).not.toContain('fetch(');
            expect(content).not.toContain('/api/jobs');
        });
    });

    describe('async worker pipeline', () => {
        it('should publish throttled draft content through the job stream helper', async () => {
            const fs = require('fs');
            const path = require('path');

            const routePath = path.join(
                process.cwd(),
                'src/app/api/jobs/agent/route.ts'
            );
            const routeContent = fs.readFileSync(routePath, 'utf-8');

            expect(routeContent).toContain('JobDraftPublisher');
            expect(routeContent).toContain('markJobRunning');
            expect(routeContent).toContain('finalizeJobSuccess');
            expect(routeContent).toContain('finalizeJobFailure');
            expect(routeContent).toContain('draftPublisher.push');
        });

        it('should centralize terminal guards in the canonical job stream module', async () => {
            const fs = require('fs');
            const path = require('path');

            const helperPath = path.join(
                process.cwd(),
                'src/server/jobs/job-stream.ts'
            );
            const helperContent = fs.readFileSync(helperPath, 'utf-8');

            expect(helperContent).toContain('isTerminalJobStatus');
            expect(helperContent).toContain('JobDraftPublisher');
            expect(helperContent).toContain('finalizeJobSuccess');
            expect(helperContent).toContain('finalizeJobFailure');
            expect(helperContent).toContain('cancelJob');
        });
    });
});
