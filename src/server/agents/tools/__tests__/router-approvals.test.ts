
jest.mock('uuid', () => ({ v4: () => 'mock' }));
jest.mock('@/server/auth/rbac', () => ({ hasRolePermission: jest.fn().mockReturnValue(true) }));
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/server/agents/tools/registry', () => ({
    getToolDefinition: jest.fn((name) => {
        if (name === 'side.effect.tool') {
            return {
                name: 'side.effect.tool',
                description: 'Dangerous tool',
                category: 'side-effect',
                inputSchema: {},
                requiredPermission: 'manage:system'
            };
        }
        return null;
    })
}));
jest.mock('@/server/agents/persistence', () => ({ persistence: { appendLog: jest.fn() } }));
jest.mock('@/server/agents/approvals/service', () => ({
    createApprovalRequest: jest.fn().mockResolvedValue({ id: 'mock-approval-id' }),
    getApprovalRequest: jest.fn().mockResolvedValue(null),
    getApprovalPayload: jest.fn().mockResolvedValue(null),
    checkIdempotency: jest.fn().mockResolvedValue(null),
    saveIdempotency: jest.fn()
}));
jest.mock('@/server/services/proactive-task-service', () => ({
    linkTaskToInbox: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/server/agents/tools/universal/context-tools', () => ({}));
jest.mock('@/server/agents/tools/domain/catalog', () => ({}));
jest.mock('@/server/agents/tools/domain/marketing', () => ({}));
jest.mock('@/server/agents/tools/domain/analytics', () => ({}));
jest.mock('@/server/agents/tools/domain/intel', () => ({}));
// Dynamic mocks
jest.mock('@/server/tools/web-search', () => ({}));
jest.mock('@/lib/email/dispatcher', () => ({}));
jest.mock('@/server/actions/knowledge-base', () => ({}));
jest.mock('@/server/agents/deebo', () => ({}));

import { routeToolCall } from '../router';
import { ToolRequest } from '@/types/agent-toolkit';

const approvalsService = jest.requireMock('@/server/agents/approvals/service') as {
    createApprovalRequest: jest.Mock;
    getApprovalRequest: jest.Mock;
    getApprovalPayload: jest.Mock;
};
const proactiveTaskService = jest.requireMock('@/server/services/proactive-task-service') as {
    linkTaskToInbox: jest.Mock;
};

describe('Router Side-Effects', () => {
    beforeEach(() => {
        approvalsService.createApprovalRequest.mockClear();
        approvalsService.getApprovalRequest.mockReset();
        approvalsService.getApprovalRequest.mockResolvedValue(null);
        approvalsService.getApprovalPayload.mockReset();
        approvalsService.getApprovalPayload.mockResolvedValue(null);
        proactiveTaskService.linkTaskToInbox.mockClear();
    });

    it('should block side-effect tools and create approval request', async () => {
        const req: ToolRequest = {
            toolName: 'side.effect.tool',
            tenantId: 'tenant-123',
            actor: { userId: 'user-1', role: 'brand' },
            taskId: 'task-1',
            requestedByAgent: 'craig',
            approvalRationale: 'Send the updated retention email.',
            riskClass: 'medium',
            evidenceRefs: ['inbox://artifact-1'],
            inputs: { foo: 'bar' }
        };

        const result = await routeToolCall(req);

        expect(result.status).toBe('blocked');
        expect(result.error).toContain('Approval required');
        expect(result.data).toHaveProperty('approvalId', 'mock-approval-id');
        expect(result.data).toHaveProperty('taskId', 'task-1');
        expect(approvalsService.createApprovalRequest).toHaveBeenCalledWith({
            tenantId: 'tenant-123',
            toolName: 'side.effect.tool',
            inputs: { foo: 'bar' },
            actorId: 'user-1',
            actorRole: 'brand',
            options: {
                taskId: 'task-1',
                requestedByAgent: 'craig',
                rationale: 'Send the updated retention email.',
                riskClass: 'medium',
                evidenceRefs: ['inbox://artifact-1'],
                expiresAt: undefined,
            },
        });
        expect(proactiveTaskService.linkTaskToInbox).toHaveBeenCalledWith('task-1', {
            approvalId: 'mock-approval-id',
        });
    });

    it('allows an approved tool retry to pass the approval gate', async () => {
        approvalsService.getApprovalRequest.mockResolvedValue({
            id: 'approved-1',
            tenantId: 'tenant-123',
            status: 'approved',
            toolName: 'side.effect.tool',
        });
        approvalsService.getApprovalPayload.mockResolvedValue({ foo: 'bar' });

        const req: ToolRequest = {
            toolName: 'side.effect.tool',
            tenantId: 'tenant-123',
            actor: { userId: 'user-1', role: 'brand' },
            approvedApprovalId: 'approved-1',
            inputs: { foo: 'bar' },
        };

        const result = await routeToolCall(req);

        expect(result.status).not.toBe('blocked');
        expect(approvalsService.getApprovalRequest).toHaveBeenCalledWith('tenant-123', 'approved-1');
        expect(approvalsService.getApprovalPayload).toHaveBeenCalledWith('tenant-123', 'approved-1');
        expect(approvalsService.createApprovalRequest).not.toHaveBeenCalled();
    });

    it('creates a fresh approval when the approved payload does not match the retry inputs', async () => {
        approvalsService.getApprovalRequest.mockResolvedValue({
            id: 'approved-1',
            tenantId: 'tenant-123',
            status: 'approved',
            toolName: 'side.effect.tool',
        });
        approvalsService.getApprovalPayload.mockResolvedValue({ foo: 'old-value' });

        const req: ToolRequest = {
            toolName: 'side.effect.tool',
            tenantId: 'tenant-123',
            actor: { userId: 'user-1', role: 'brand' },
            approvedApprovalId: 'approved-1',
            inputs: { foo: 'new-value' },
        };

        const result = await routeToolCall(req);

        expect(result.status).toBe('blocked');
        expect(result.error).toContain('did not match the exact tool payload');
        expect(approvalsService.createApprovalRequest).toHaveBeenCalled();
    });
});
