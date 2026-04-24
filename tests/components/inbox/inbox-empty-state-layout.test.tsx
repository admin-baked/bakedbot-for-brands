import { render, screen, waitFor } from '@testing-library/react';
import { InboxEmptyState } from '@/components/inbox/inbox-empty-state';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useContextualPresets } from '@/hooks/use-contextual-presets';
import { useUserRole } from '@/hooks/use-user-role';
import { getInboxOwnerBriefingSummary } from '@/server/actions/inbox';
import { useIsMobile } from '@/hooks/use-mobile';

jest.mock('@/components/inbox/research-query-dialog', () => ({
    ResearchQueryDialog: () => null,
}));
jest.mock('@/components/inbox/inbox-conversation', () => ({
    _pendingInputs: new Map<string, string>(),
}));
jest.mock('@/lib/store/inbox-store');
jest.mock('@/hooks/use-contextual-presets');
jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));
jest.mock('@/hooks/use-user-role');
jest.mock('@/server/actions/inbox', () => ({
    createInboxThread: jest.fn(),
    getInboxOwnerBriefingSummary: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(),
}));
jest.mock('@/components/inbox/insight-cards-grid', () => ({
    InsightCardsGrid: () => <div data-testid="insight-cards-grid">Insight Grid</div>,
}));

describe('InboxEmptyState layout', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (useInboxStore as unknown as jest.Mock).mockReturnValue({
            createThread: jest.fn(),
            deleteThread: jest.fn(),
            markThreadPending: jest.fn(),
            markThreadPersisted: jest.fn(),
            currentOrgId: 'org-1',
            setActiveThread: jest.fn(),
        });

        (useContextualPresets as jest.Mock).mockReturnValue({
            presets: [
                {
                    id: 'preset-1',
                    label: 'Review Sales',
                    icon: 'TrendingUp',
                    threadType: 'performance',
                    defaultAgent: 'pops',
                    promptTemplate: 'Review sales for today.',
                },
                {
                    id: 'preset-2',
                    label: 'Build Campaign',
                    icon: 'Megaphone',
                    threadType: 'campaign',
                    defaultAgent: 'craig',
                    promptTemplate: 'Build a campaign for this week.',
                },
            ],
            greeting: 'Good afternoon',
            suggestion: 'Start with your most important inbox task.',
            refresh: jest.fn(),
            isLoading: false,
        });

        (useUserRole as jest.Mock).mockReturnValue({
            role: 'dispensary_admin',
            hasBrandAdminAccess: false,
            hasDispensaryAdminAccess: true,
            isSuperUser: false,
        });

        (getInboxOwnerBriefingSummary as jest.Mock).mockResolvedValue({
            success: true,
            summary: {
                happenedYesterday: 'Yesterday sales settled higher than forecast.',
                happenedYesterdayDetail: 'Edibles and vapes carried the afternoon basket.',
                workOnToday: 'Focus on the revenue trend review first.',
                priorities: ['Recheck revenue trends after recent order history refresh'],
            },
        });
    });

    it('renders a composer-first desktop layout', async () => {
        (useIsMobile as jest.Mock).mockReturnValue(false);

        render(<InboxEmptyState />);

        await waitFor(() => {
            expect(screen.getByTestId('inbox-empty-state-desktop')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/What would you like to work on/i)).toBeInTheDocument();
            expect(screen.getByText('What Happened Yesterday')).toBeInTheDocument();
        });
    });

    it('keeps the mobile briefing-first layout on small screens', async () => {
        (useIsMobile as jest.Mock).mockReturnValue(true);

        render(<InboxEmptyState />);

        await waitFor(() => {
            expect(screen.getByTestId('inbox-empty-state-mobile')).toBeInTheDocument();
            expect(screen.getByTestId('insight-cards-grid')).toBeInTheDocument();
            expect(screen.getByText('Quick Suggestions')).toBeInTheDocument();
        });
    });
});
