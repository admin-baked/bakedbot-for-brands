import { render, screen, fireEvent } from '@testing-library/react';
import { ApprovalChain } from '@/components/creative/approval-chain';
import { EngagementAnalytics } from '@/components/creative/engagement-analytics';
import { CampaignPerformanceDashboard } from '@/components/creative/campaign-performance';
import { QRScanTracker } from '@/components/creative/qr-scan-tracker';
import type { ApprovalState, EngagementMetrics, CampaignPerformance as CampaignPerformanceType, CampaignMetricSnapshot, TopPerformingContent } from '@/types/creative-content';


describe('ApprovalChain Component', () => {
    const mockApprovalState: ApprovalState = {
        status: 'pending_approval',
        currentLevel: 1,
        approvals: [],
        nextRequiredRoles: ['brand_manager'],
        rejectionReason: '',
    };

    it('should render approval levels correctly', () => {
        render(<ApprovalChain approvalState={mockApprovalState} />);
        expect(screen.getByText('Approval Workflow')).toBeInTheDocument();
        expect(screen.getByText('Level 1 Review')).toBeInTheDocument();
        expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument();
    });

    it('should show action buttons when user can approve', () => {
        render(
            <ApprovalChain
                approvalState={mockApprovalState}
                currentUserRole="brand_manager"
            />
        );
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should call onApprove when approve button is clicked', async () => {
        const onApprove = jest.fn().mockResolvedValue(undefined);
        render(
            <ApprovalChain
                approvalState={mockApprovalState}
                currentUserRole="brand_manager"
                onApprove={onApprove}
            />
        );

        const approveButton = screen.getByText('Approve');
        fireEvent.click(approveButton);

        expect(onApprove).toHaveBeenCalled();
    });
});

describe('EngagementAnalytics Component', () => {
    const mockMetrics: EngagementMetrics = {
        impressions: 10000,
        reach: 8000,
        likes: 500,
        comments: 50,
        shares: 20,
        saves: 10,
        engagementRate: 7.2,
        clickThroughRate: 2.5,
    };

    it('should render metrics correctly', () => {
        render(<EngagementAnalytics metrics={mockMetrics} platform="instagram" />);
        expect(screen.getByText('Engagement Analytics')).toBeInTheDocument();
        expect(screen.getByText('10.0K')).toBeInTheDocument(); // Impressions
        expect(screen.getByText('7.2%')).toBeInTheDocument(); // Engagement Rate
        expect(screen.getByText('2.5%')).toBeInTheDocument(); // CTR
    });

    it('should display platform icon and name', () => {
        render(<EngagementAnalytics metrics={mockMetrics} platform="instagram" />);
        expect(screen.getByText('instagram')).toBeInTheDocument();
    });
});

describe('CampaignPerformanceDashboard Component', () => {
    const mockPerformance: CampaignPerformanceType = {
        campaignId: 'test-camp',
        campaignName: 'Test Campaign',
        totalContent: 10,
        lastUpdated: new Date().toISOString(),
        aggregatedMetrics: {
            totalImpressions: 50000,
            totalReach: 40000,
            avgEngagementRate: 5.5,
            totalQRScans: 1200,
        },
        conversionFunnel: {
            impressions: 50000,
            clicks: 2500,
            qrScans: 1200,
            conversions: 300,
            rates: {
                clickRate: 5.0,
                scanRate: 2.4,
                conversionRate: 0.6,
            }
        },
        contentByPlatform: {
            instagram: 5,
            tiktok: 3,
            linkedin: 2,
            twitter: 0,
            facebook: 0,
        },
        contentByStatus: {
            published: 8,
            scheduled: 2,
            approved: 0,
            pending: 0,
            revision: 0,
            draft: 0,
            failed: 0,
        }
    };

    const mockTimeSeries: CampaignMetricSnapshot[] = [];
    const mockTopContent: TopPerformingContent[] = [];

    it('should render campaign name and total content count', () => {
        render(
            <CampaignPerformanceDashboard
                campaignId="test"
                performance={mockPerformance}
                timeSeries={mockTimeSeries}
                topPerformingContent={mockTopContent}
            />
        );
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
        expect(screen.getByText(/10 content items/)).toBeInTheDocument();
    });

    it('should render aggregated metrics', () => {
        render(
            <CampaignPerformanceDashboard
                campaignId="test"
                performance={mockPerformance}
                timeSeries={mockTimeSeries}
                topPerformingContent={mockTopContent}
            />
        );
        expect(screen.getAllByText('50.0K').length).toBeGreaterThan(0); // Impressions
        expect(screen.getAllByText('40.0K').length).toBeGreaterThan(0); // Reach
        expect(screen.getByText('5.5%')).toBeInTheDocument(); // Eng Rate
        expect(screen.getAllByText('1.2K').length).toBeGreaterThan(0); // QR Scans

    });
});

describe('QRScanTracker Component', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, scans: 43 })
            })
        ) as jest.Mock;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call fetch on mount for scan tracking', () => {
        render(<QRScanTracker contentId="test-id" />);
        expect(global.fetch).toHaveBeenCalledWith('/api/creative/qr-scan', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ contentId: 'test-id' })
        }));
    });
});


