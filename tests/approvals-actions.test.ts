import { Timestamp } from 'firebase-admin/firestore';
import {
    approveApprovalRequest,
    getApprovalDetails,
    getApprovalStatsAction,
    getPendingApprovals,
    rejectApprovalRequest,
} from '@/app/actions/approvals';

const mockRequireSuperUser = jest.fn();
const mockListPendingApprovals = jest.fn();
const mockGetApprovalRequest = jest.fn();
const mockApproveRequest = jest.fn();
const mockRejectRequest = jest.fn();
const mockGetApprovalStats = jest.fn();

jest.mock('@/server/auth/auth', () => ({
    requireSuperUser: (...args: unknown[]) => mockRequireSuperUser(...args),
}));

jest.mock('@/server/services/approval-queue', () => ({
    listPendingApprovals: (...args: unknown[]) => mockListPendingApprovals(...args),
    listAllApprovals: jest.fn(),
    getApprovalRequest: (...args: unknown[]) => mockGetApprovalRequest(...args),
    approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
    rejectRequest: (...args: unknown[]) => mockRejectRequest(...args),
    getApprovalHistory: jest.fn(),
    getApprovalStats: (...args: unknown[]) => mockGetApprovalStats(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

function makePendingApproval() {
    return {
        id: 'req-1',
        status: 'pending' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
            targetResource: 'nightly-job',
            action: 'create' as const,
            reason: 'nightly sync',
            riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'linus@example.com',
        auditLog: [],
    };
}

describe('Approvals server actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('blocks non-super-users from pending approvals', async () => {
        mockRequireSuperUser.mockRejectedValue(new Error('Unauthorized'));

        const result = await getPendingApprovals();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only Super Users can access approvals');
    });

    it('returns filtered pending approvals for super users', async () => {
        mockRequireSuperUser.mockResolvedValue({ email: 'admin@example.com' });
        mockListPendingApprovals.mockResolvedValue([makePendingApproval()]);

        const result = await getPendingApprovals({ riskLevel: 'medium' });

        expect(result.success).toBe(true);
        expect(mockListPendingApprovals).toHaveBeenCalledWith({ riskLevel: 'medium' });
        expect(result.data).toHaveLength(1);
    });

    it('returns not found when approval details are missing', async () => {
        mockRequireSuperUser.mockResolvedValue({ email: 'admin@example.com' });
        mockGetApprovalRequest.mockResolvedValue(null);

        const result = await getApprovalDetails('missing-id');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Approval request not found');
    });

    it('prevents approving requests that are not pending', async () => {
        mockRequireSuperUser.mockResolvedValue({ email: 'admin@example.com' });
        mockGetApprovalRequest.mockResolvedValue({
            ...makePendingApproval(),
            status: 'approved',
        });

        const result = await approveApprovalRequest('req-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot approve a approved request');
        expect(mockApproveRequest).not.toHaveBeenCalled();
    });

    it('requires a rejection reason for pending requests', async () => {
        mockRequireSuperUser.mockResolvedValue({ email: 'admin@example.com' });
        mockGetApprovalRequest.mockResolvedValue(makePendingApproval());

        const result = await rejectApprovalRequest('req-1', '');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Rejection reason is required');
        expect(mockRejectRequest).not.toHaveBeenCalled();
    });

    it('returns approval stats for super users', async () => {
        const stats = {
            pending: 1,
            approved: 2,
            rejected: 3,
            executed: 4,
            failed: 0,
            totalByRiskLevel: {
                low: 0,
                medium: 1,
                high: 2,
                critical: 0,
            },
        };

        mockRequireSuperUser.mockResolvedValue({ email: 'admin@example.com' });
        mockGetApprovalStats.mockResolvedValue(stats);

        const result = await getApprovalStatsAction();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(stats);
    });
});
