import {
    createInitialCreativeApprovalState,
    getCreativeApprovalWorkflow,
    resetCreativeApprovalState,
} from '@/lib/creative-approval-workflow';

describe('creative approval workflow', () => {
    it('builds Marty and Linus lanes for super users', () => {
        const workflow = getCreativeApprovalWorkflow('super_user');

        expect(workflow.workflowType).toBe('super_user_boardroom');
        expect(workflow.levels).toHaveLength(2);
        expect(workflow.levels[0]).toMatchObject({
            name: 'Marty Strategic Review',
            reviewAgentId: 'marty',
            requiredRoles: ['super_user'],
        });
        expect(workflow.levels[1]).toMatchObject({
            name: 'Linus Mission Check',
            reviewAgentId: 'linus',
            requiredRoles: ['super_user'],
        });
    });

    it('builds a Deebo compliance lane for brand and dispensary roles', () => {
        const brandWorkflow = getCreativeApprovalWorkflow('brand_admin');
        const dispensaryWorkflow = getCreativeApprovalWorkflow('dispensary_staff');

        expect(brandWorkflow.workflowType).toBe('operational_deebo');
        expect(brandWorkflow.levels[0]).toMatchObject({
            reviewAgentId: 'deebo',
            requiredRoles: ['brand_admin', 'super_user'],
        });

        expect(dispensaryWorkflow.levels[0]).toMatchObject({
            reviewAgentId: 'deebo',
            requiredRoles: ['dispensary_admin', 'super_user'],
        });
    });

    it('resets an existing workflow back to the first lane on revision', () => {
        const initial = createInitialCreativeApprovalState('super_user', 'tenant-1');
        const mutated = {
            ...initial,
            currentLevel: 2,
            approvals: [
                {
                    id: 'a1',
                    level: 1,
                    approverId: 'user-1',
                    approverName: 'Tester',
                    approverRole: 'super_user',
                    action: 'approved' as const,
                    timestamp: Date.now(),
                    required: true,
                },
            ],
            status: 'rejected' as const,
            rejectionReason: 'Needs revision',
            nextRequiredRoles: [],
        };

        const reset = resetCreativeApprovalState(mutated, 'super_user');

        expect(reset.currentLevel).toBe(1);
        expect(reset.approvals).toEqual([]);
        expect(reset.status).toBe('pending_approval');
        expect(reset.nextRequiredRoles).toEqual(['super_user']);
    });
});
