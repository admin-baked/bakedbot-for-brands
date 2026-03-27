import { render, screen, waitFor } from '@testing-library/react';
import { InboxWorkspaceBriefing } from '@/components/inbox/inbox-workspace-briefing';
import { useUserRole } from '@/hooks/use-user-role';
import { getOrgProfileAction } from '@/server/actions/org-profile';

jest.mock('@/hooks/use-user-role');
jest.mock('@/server/actions/org-profile', () => ({
    getOrgProfileAction: jest.fn(),
}));
jest.mock('@/components/inbox/insight-cards-grid', () => ({
    InsightCardsGrid: ({ maxCards }: { maxCards: number }) => (
        <div data-testid="insight-cards-grid" data-max-cards={String(maxCards)}>
            Insight Cards
        </div>
    ),
}));

describe('InboxWorkspaceBriefing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders grower pilot briefing with org profile name', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'grower',
            orgId: 'org-grower',
            user: {
                organizationName: 'Native Black Cultivation',
            },
        });
        (getOrgProfileAction as jest.Mock).mockResolvedValue({
            success: true,
            profile: {
                brand: {
                    name: 'Native Black Cultivation',
                },
            },
        });

        render(<InboxWorkspaceBriefing />);

        await waitFor(() => {
            expect(getOrgProfileAction).toHaveBeenCalledWith('org-grower');
            expect(screen.getByText('Grower Pilot')).toBeInTheDocument();
            expect(screen.getByText('Cultivation Command Center')).toBeInTheDocument();
            expect(screen.getByText('Native Black Cultivation')).toBeInTheDocument();
        });

        expect(screen.getByTestId('insight-cards-grid')).toHaveAttribute('data-max-cards', '5');
    });

    it('renders dispensary pilot briefing with fallback org name', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'dispensary_admin',
            orgId: 'org-dispensary',
            user: {
                locationName: 'Thrive Syracuse',
            },
        });
        (getOrgProfileAction as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Unauthorized',
        });

        render(<InboxWorkspaceBriefing />);

        await waitFor(() => {
            expect(screen.getByText('Dispensary Pilot')).toBeInTheDocument();
            expect(screen.getByText('Retail Command Center')).toBeInTheDocument();
            expect(screen.getByText('Thrive Syracuse')).toBeInTheDocument();
        });
    });

    it('renders brand pilot briefing from user fallback without loading an org profile', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            orgId: null,
            user: {
                brandName: 'Ecstatic Edibles',
            },
        });

        render(<InboxWorkspaceBriefing />);

        expect(screen.getByText('Brand Pilot')).toBeInTheDocument();
        expect(screen.getByText('Brand Command Center')).toBeInTheDocument();
        expect(screen.getByText('Ecstatic Edibles')).toBeInTheDocument();
        expect(getOrgProfileAction).not.toHaveBeenCalled();
    });
});
