/**
 * Approvals Page Tests
 *
 * Tests for the ApprovalsPage component including loading state,
 * empty state, campaign display, and approve/reject actions.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ApprovalsPage from '../page';
import type { Campaign } from '@/types/campaign';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

const mockGetCampaigns = jest.fn();
const mockApproveCampaign = jest.fn();
const mockCancelCampaign = jest.fn();
const mockSubmitForComplianceReview = jest.fn();

jest.mock('@/server/actions/campaigns', () => ({
    getCampaigns: (...args: unknown[]) => mockGetCampaigns(...args),
    approveCampaign: (...args: unknown[]) => mockApproveCampaign(...args),
    cancelCampaign: (...args: unknown[]) => mockCancelCampaign(...args),
    submitForComplianceReview: (...args: unknown[]) => mockSubmitForComplianceReview(...args),
}));

// Mock UI components to avoid JSDOM / Radix issues
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
    CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-value={defaultValue}>{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>,
    TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

jest.mock('lucide-react', () => ({
    CheckCircle: ({ ...props }: any) => <span data-testid="check-circle-icon" {...props} />,
    XCircle: ({ ...props }: any) => <span data-testid="x-circle-icon" {...props} />,
    Megaphone: ({ ...props }: any) => <span data-testid="megaphone-icon" {...props} />,
    FileText: ({ ...props }: any) => <span {...props} />,
    Shield: ({ ...props }: any) => <span data-testid="shield-icon" {...props} />,
    Loader2: ({ ...props }: any) => <span data-testid="loader" {...props} />,
    ExternalLink: ({ ...props }: any) => <span {...props} />,
    Clock: ({ ...props }: any) => <span data-testid="clock-icon" {...props} />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCampaign(overrides: Partial<Campaign>): Campaign {
    return {
        id: 'camp-1',
        orgId: 'org-1',
        createdBy: 'user-1',
        name: 'Test Campaign',
        goal: 'drive_sales',
        status: 'draft',
        channels: ['sms'],
        audience: { type: 'all', estimatedCount: 50 },
        content: {},
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApprovalsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCampaigns.mockResolvedValue([]);
        mockApproveCampaign.mockResolvedValue(true);
        mockCancelCampaign.mockResolvedValue(true);
    });

    it('renders loading state initially', () => {
        // Never resolve so we stay in loading
        mockGetCampaigns.mockReturnValue(new Promise(() => {}));

        render(<ApprovalsPage />);

        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('shows "All Clear" when no pending campaigns', async () => {
        mockGetCampaigns.mockResolvedValue([]);

        render(<ApprovalsPage />);

        await waitFor(() => {
            // All three tab contents render empty states, so multiple "All Clear" appear
            const allClear = screen.getAllByText('All Clear');
            expect(allClear.length).toBeGreaterThan(0);
        });
    });

    it('displays pending approval count', async () => {
        const campaigns = [
            makeCampaign({ id: 'p1', name: 'Pending 1', status: 'pending_approval' }),
            makeCampaign({ id: 'p2', name: 'Pending 2', status: 'pending_approval' }),
            makeCampaign({ id: 'd1', name: 'Draft 1', status: 'draft' }),
        ];
        mockGetCampaigns.mockResolvedValue(campaigns);

        render(<ApprovalsPage />);

        await waitFor(() => {
            // The stats card label "Pending Approval" appears along with tab triggers
            const pendingLabels = screen.getAllByText(/Pending Approval/);
            expect(pendingLabels.length).toBeGreaterThan(0);
            // The count "2" should appear in the stats card and/or tab trigger
            const countElements = screen.getAllByText('2');
            expect(countElements.length).toBeGreaterThan(0);
        });
    });

    it('displays compliance review count', async () => {
        const campaigns = [
            makeCampaign({ id: 'c1', name: 'Compliance 1', status: 'compliance_review' }),
            makeCampaign({ id: 'c2', name: 'Compliance 2', status: 'compliance_review' }),
            makeCampaign({ id: 'c3', name: 'Compliance 3', status: 'compliance_review' }),
        ];
        mockGetCampaigns.mockResolvedValue(campaigns);

        render(<ApprovalsPage />);

        await waitFor(() => {
            // "Compliance Review" appears in stats card, tab trigger, and badges
            const complianceLabels = screen.getAllByText(/Compliance Review/);
            expect(complianceLabels.length).toBeGreaterThan(0);
            // The count "3" should appear in the stats card and/or tab triggers
            const countElements = screen.getAllByText('3');
            expect(countElements.length).toBeGreaterThan(0);
        });
    });

    it('shows campaign name and status badge in card', async () => {
        const campaigns = [
            makeCampaign({ id: 'vis-1', name: 'Weekly Promo', status: 'pending_approval' }),
        ];
        mockGetCampaigns.mockResolvedValue(campaigns);

        render(<ApprovalsPage />);

        await waitFor(() => {
            // Campaign appears in both "pending" and "all" tab contents (both rendered),
            // so use getAllByText
            const nameElements = screen.getAllByText('Weekly Promo');
            expect(nameElements.length).toBeGreaterThan(0);
            // "Pending Approval" appears in stats, tabs, and badges
            const badges = screen.getAllByText('Pending Approval');
            expect(badges.length).toBeGreaterThan(0);
        });
    });

    it('approve button calls approveCampaign', async () => {
        const campaigns = [
            makeCampaign({ id: 'approve-me', name: 'Approve Me', status: 'pending_approval' }),
        ];
        mockGetCampaigns.mockResolvedValue(campaigns);

        render(<ApprovalsPage />);

        await waitFor(() => {
            expect(screen.getAllByText('Approve').length).toBeGreaterThan(0);
        });

        // Click the first Approve button found
        const approveButtons = screen.getAllByText('Approve');
        fireEvent.click(approveButtons[0]);

        await waitFor(() => {
            expect(mockApproveCampaign).toHaveBeenCalledWith('approve-me', 'manual');
        });
    });

    it('reject button calls cancelCampaign', async () => {
        const campaigns = [
            makeCampaign({ id: 'reject-me', name: 'Reject Me', status: 'pending_approval' }),
        ];
        mockGetCampaigns.mockResolvedValue(campaigns);

        render(<ApprovalsPage />);

        await waitFor(() => {
            expect(screen.getAllByText('Reject').length).toBeGreaterThan(0);
        });

        const rejectButtons = screen.getAllByText('Reject');
        fireEvent.click(rejectButtons[0]);

        await waitFor(() => {
            expect(mockCancelCampaign).toHaveBeenCalledWith('reject-me');
        });
    });
});
