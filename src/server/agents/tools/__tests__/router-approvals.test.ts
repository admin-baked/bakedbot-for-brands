
jest.mock('uuid', () => ({ v4: () => 'mock' }));
jest.mock('@/server/auth/rbac', () => ({ hasRolePermission: jest.fn().mockReturnValue(true) }));
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
    checkIdempotency: jest.fn().mockResolvedValue(null),
    saveIdempotency: jest.fn()
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
};

describe('Router Side-Effects', () => {
    beforeEach(() => {
        approvalsService.createApprovalRequest.mockClear();
        approvalsService.getApprovalRequest.mockReset();
        approvalsService.getApprovalRequest.mockResolvedValue(null);
    });

    it('should block side-effect tools and create approval request', async () => {
        const req: ToolRequest = {
            toolName: 'side.effect.tool',
            tenantId: 'tenant-123',
            actor: { userId: 'user-1', role: 'brand' },
            inputs: { foo: 'bar' }
        };

        const result = await routeToolCall(req);

        expect(result.status).toBe('blocked');
        expect(result.error).toContain('Approval required');
        expect(result.data).toHaveProperty('approvalId', 'mock-approval-id');
    });

    it('allows an approved tool retry to pass the approval gate', async () => {
        approvalsService.getApprovalRequest.mockResolvedValue({
            id: 'approved-1',
            tenantId: 'tenant-123',
            status: 'approved',
            toolName: 'side.effect.tool',
        });

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
        expect(approvalsService.createApprovalRequest).not.toHaveBeenCalled();
    });
});
