import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LinusApprovalsPage from '../page';

const mockGetPendingApprovals = jest.fn();
const mockGetApprovalDetails = jest.fn();
const mockApproveApprovalRequest = jest.fn();
const mockRejectApprovalRequest = jest.fn();
const mockGetApprovalHistoryAction = jest.fn();
const mockGetApprovalStatsAction = jest.fn();

jest.mock('@/app/actions/approvals', () => ({
    getPendingApprovals: (...args: unknown[]) => mockGetPendingApprovals(...args),
    getApprovalDetails: (...args: unknown[]) => mockGetApprovalDetails(...args),
    approveApprovalRequest: (...args: unknown[]) => mockApproveApprovalRequest(...args),
    rejectApprovalRequest: (...args: unknown[]) => mockRejectApprovalRequest(...args),
    getApprovalHistoryAction: (...args: unknown[]) => mockGetApprovalHistoryAction(...args),
    getApprovalStatsAction: (...args: unknown[]) => mockGetApprovalStatsAction(...args),
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, onClick, className }: any) => (
        <div onClick={onClick} className={className} data-testid="card">
            {children}
        </div>
    ),
    CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children }: any) => <button>{children}</button>,
    TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
    CheckCircle: () => <span>check</span>,
    XCircle: () => <span>x</span>,
    AlertTriangle: () => <span>alert</span>,
    Zap: () => <span>zap</span>,
    Loader2: () => <span data-testid="loader">loading</span>,
    ExternalLink: () => <span>ext</span>,
    Clock: () => <span>clock</span>,
}));

const ts = (dateString: string) => ({
    toDate: () => new Date(dateString),
});

const pendingApproval = {
    id: 'req-1',
    createdAt: ts('2026-02-21T08:00:00Z'),
    requestedBy: 'linus-agent',
    operationType: 'cloud_scheduler_create',
    operationDetails: {
        targetResource: 'nightly-sync',
        action: 'create',
        reason: 'Nightly sync automation',
        riskLevel: 'medium',
    },
    status: 'pending',
    auditLog: [
        {
            actor: 'linus-agent',
            action: 'created',
            timestamp: ts('2026-02-21T08:00:00Z'),
            details: 'Created request',
        },
    ],
};

const historyApproval = {
    ...pendingApproval,
    id: 'req-2',
    status: 'approved',
    approvedBy: 'admin@bakedbot.ai',
    approvalTimestamp: ts('2026-02-21T09:00:00Z'),
};

describe('LinusApprovalsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPendingApprovals.mockResolvedValue({ success: true, data: [pendingApproval] });
        mockGetApprovalHistoryAction.mockResolvedValue({ success: true, data: [historyApproval] });
        mockGetApprovalStatsAction.mockResolvedValue({
            success: true,
            data: {
                pending: 1,
                approved: 5,
                rejected: 2,
                executed: 3,
                failed: 0,
            },
        });
        mockApproveApprovalRequest.mockResolvedValue({ success: true });
        mockRejectApprovalRequest.mockResolvedValue({ success: true });
    });

    it('loads and renders pending/history approvals with stats', async () => {
        render(<LinusApprovalsPage />);

        await waitFor(() => {
        expect(screen.getByText('Linus Operation Approvals')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('History (1)')).toBeInTheDocument();
    expect(screen.getAllByText('cloud_scheduler_create').length).toBeGreaterThan(0);
    expect(screen.getAllByText('nightly-sync').length).toBeGreaterThan(0);
});

    it('approves a selected pending request from the detail modal', async () => {
    render(<LinusApprovalsPage />);

    await waitFor(() => {
        expect(screen.getAllByText('cloud_scheduler_create').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('cloud_scheduler_create')[0]);
    fireEvent.click(screen.getByText('Approve'));

        await waitFor(() => {
            expect(mockApproveApprovalRequest).toHaveBeenCalledWith('req-1', undefined);
        });
    });
});
