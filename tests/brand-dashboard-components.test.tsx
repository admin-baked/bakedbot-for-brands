import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrandKPIs } from '@/app/dashboard/brand/components/brand-kpi-grid';
import { BrandPlaybooksList } from '@/app/dashboard/brand/components/brand-playbooks-list';
import { BrandChatWidget } from '@/app/dashboard/brand/components/brand-chat-widget';
import { BrandRightRail } from '@/app/dashboard/brand/components/brand-right-sidebar';

const mockListBrandPlaybooks = jest.fn();
const mockTogglePlaybookStatus = jest.fn();
const mockRunPlaybookTest = jest.fn();
const mockUpdatePlaybook = jest.fn();
const mockToast = jest.fn();
const mockUseUser = jest.fn();
const mockPuffChat = jest.fn();

jest.mock('@/server/actions/playbooks', () => ({
    listBrandPlaybooks: (...args: any[]) => mockListBrandPlaybooks(...args),
    togglePlaybookStatus: (...args: any[]) => mockTogglePlaybookStatus(...args),
    runPlaybookTest: (...args: any[]) => mockRunPlaybookTest(...args),
    updatePlaybook: (...args: any[]) => mockUpdatePlaybook(...args),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => mockUseUser(),
}));

jest.mock('@/hooks/use-dynamic-prompts', () => ({
    useDynamicPrompts: () => ({
        prompts: [
            'Create a loyalty re-engagement SMS sequence',
            'Draft a campaign in 30 seconds',
            'Get my SEO visibility report',
            'What is their brand voice compared to ours?',
        ],
        loading: false,
    }),
}));

jest.mock('@/lib/chat/role-chat-config', () => ({
    BRAND_CHAT_CONFIG: { promptSuggestions: [] },
}));

jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: (props: any) => {
        mockPuffChat(props);
        return <div data-testid="mock-puff-chat">PuffChat</div>;
    },
}));

jest.mock('@/components/dashboard/ezal-snapshot-card', () => ({
    EzalSnapshotCard: ({ userState }: { userState: string }) => (
        <div data-testid="ezal-snapshot-card">{userState}</div>
    ),
}));

jest.mock('@/app/dashboard/playbooks/components/playbook-editor', () => ({
    PlaybookEditor: () => <div data-testid="playbook-editor">PlaybookEditor</div>,
}));

jest.mock('@/app/dashboard/playbooks/components/playbook-edit-sheet', () => ({
    PlaybookEditSheet: () => <div data-testid="playbook-edit-sheet">PlaybookEditSheet</div>,
}));

describe('Brand Dashboard Components', () => {
    const brandId = 'brand_test';
    const mockPlaybooks = [
        {
            id: 'pb-1',
            name: 'Email Campaign',
            description: 'Send weekly email to customers',
            status: 'active',
            category: 'marketing',
            runCount: 52,
            triggers: [{ type: 'manual' }],
            steps: [],
            metadata: {},
        },
        {
            id: 'pb-2',
            name: 'SMS Alert',
            description: 'Send SMS to high-value customers',
            status: 'paused',
            category: 'outreach',
            runCount: 128,
            triggers: [{ type: 'manual' }],
            steps: [],
            metadata: {},
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockListBrandPlaybooks.mockResolvedValue(mockPlaybooks);
        mockTogglePlaybookStatus.mockResolvedValue(undefined);
        mockRunPlaybookTest.mockResolvedValue(undefined);
        mockUpdatePlaybook.mockResolvedValue({ success: true });
        mockUseUser.mockReturnValue({
            user: { uid: 'user-123', orgId: brandId },
            isUserLoading: false,
        });
    });

    it('renders the current KPI cards with live/fallback values', () => {
        render(
            <BrandKPIs
                data={{
                    coverage: { value: 24, trend: '+6%', label: 'Stores Carrying', lastUpdated: 'Live' },
                    velocity: { value: 12, unit: 'units/wk', trend: '+2%', label: 'Avg per Store', lastUpdated: 'Live' },
                    priceIndex: { value: '1.08x', status: 'good', label: 'vs. Market Avg', lastUpdated: 'Live' },
                    compliance: { approved: 9, blocked: 1, label: 'Active Campaigns', lastUpdated: 'Real-time' },
                    competitiveIntel: { shelfShareTrend: { delta: 4 } },
                }}
            />
        );

        expect(screen.getByText('Retail Coverage')).toBeInTheDocument();
        expect(screen.getByText('Velocity')).toBeInTheDocument();
        expect(screen.getByText('Price Index')).toBeInTheDocument();
        expect(screen.getByText('Share of Shelf')).toBeInTheDocument();
        expect(screen.getByText('Compliance')).toBeInTheDocument();
        expect(screen.getByText('24')).toBeInTheDocument();
        expect(screen.getByText('1.08x')).toBeInTheDocument();
    });

    it('loads, renders, and filters brand playbooks via the server action boundary', async () => {
        render(<BrandPlaybooksList brandId={brandId} />);

        await waitFor(() => {
            expect(mockListBrandPlaybooks).toHaveBeenCalledWith(brandId);
            expect(screen.getByText('Email Campaign')).toBeInTheDocument();
            expect(screen.getByText('SMS Alert')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search playbooks...');
        fireEvent.change(searchInput, { target: { value: 'Email' } });

        await waitFor(() => {
            expect(screen.getByText('Email Campaign')).toBeInTheDocument();
            expect(screen.queryByText('SMS Alert')).not.toBeInTheDocument();
        });

        expect(screen.getByText('52 runs')).toBeInTheDocument();
        expect(screen.getByText('MARKETING')).toBeInTheDocument();
    });

    it('renders the authenticated brand chat widget with the current assistant title', () => {
        render(<BrandChatWidget />);

        expect(screen.getByTestId('mock-puff-chat')).toBeInTheDocument();
        expect(mockPuffChat).toHaveBeenCalledWith(
            expect.objectContaining({
                initialTitle: 'Revenue Ops Assistant',
                hideHeader: true,
                isAuthenticated: true,
            })
        );
    });

    it('renders the right rail and triggers quick-action toasts', async () => {
        render(<BrandRightRail userState="Illinois" />);

        expect(screen.getByText('Brand Alerts')).toBeInTheDocument();
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Run Agents')).toBeInTheDocument();
        expect(screen.getByText('Brand Toolkit')).toBeInTheDocument();
        expect(screen.getByTestId('ezal-snapshot-card')).toHaveTextContent('Illinois');

        fireEvent.click(screen.getByText('Launch Compliant Campaign'));

        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Action Triggered',
                description: 'Started: Launch Compliant Campaign',
            })
        );
    });
});
