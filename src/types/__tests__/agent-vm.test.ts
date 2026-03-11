import {
    createVmRunArtifactData,
    extractVmApprovalsFromToolCalls,
    resolveVmRunApproval,
} from '@/types/agent-vm';

describe('agent-vm approvals', () => {
    it('extracts tool approvals and preserves approval ids', () => {
        const approvals = extractVmApprovalsFromToolCalls([
            {
                name: 'marketing.sendCampaign',
                result: JSON.stringify({
                    blocked: true,
                    approvalId: 'approval-123',
                    error: 'Approval required. Request ID: approval-123',
                }),
            },
            {
                name: 'catalog.publishMenu',
                result: 'Approval required. Request ID: approval-456',
            },
        ]);

        expect(approvals).toEqual([
            expect.objectContaining({
                type: 'tool',
                status: 'pending',
                approvalId: 'approval-123',
                label: 'Tool approval: marketing.sendCampaign',
            }),
            expect.objectContaining({
                type: 'tool',
                status: 'pending',
                approvalId: 'approval-456',
                label: 'Tool approval: catalog.publishMenu',
            }),
        ]);
    });

    it('keeps approved tool runs resumable instead of marking them completed', () => {
        const vmRun = createVmRunArtifactData({
            runId: 'vm-1',
            agentId: 'linus',
            roleScope: 'super_user',
            runtimeBackend: 'terminal',
            title: 'Linus VM Run',
            approvals: [
                {
                    type: 'tool',
                    status: 'pending',
                    requestedAt: new Date().toISOString(),
                    approvalId: 'approval-123',
                    label: 'Tool approval: terminal.execute',
                },
            ],
            outputs: [
                {
                    kind: 'markdown',
                    title: 'Final Output',
                    content: 'Awaiting approval before side effects run.',
                },
            ],
            status: 'awaiting_approval',
        });

        const resolved = resolveVmRunApproval(vmRun, 0, 'approved');

        expect(resolved.approvals[0]).toEqual(expect.objectContaining({
            status: 'approved',
            approvalId: 'approval-123',
        }));
        expect(resolved.status).toBe('running');
        expect(resolved.summary).toBe('Approval recorded. Re-run to continue.');
        expect(resolved.completedAt).toBeUndefined();
    });
});
