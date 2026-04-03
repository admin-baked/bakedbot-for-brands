import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { InboxWorkspaceBriefing } from '@/components/inbox/inbox-workspace-briefing';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { getOrgProfileAction } from '@/server/actions/org-profile';

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href }: { children: ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

jest.mock('@/hooks/use-user-role');
jest.mock('@/hooks/use-user', () => ({
    useUser: jest.fn(),
}));
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
        (useUser as jest.Mock).mockReturnValue({
            userData: null,
            isLoading: false,
            user: { uid: 'user-1' },
            isAuthenticated: true,
        });
    });

    it('renders grower pilot briefing with a creative-center first win', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'grower',
            orgId: 'org-grower',
            user: {
                organizationName: 'Native Black Cultivation',
            },
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {
                onboarding: {
                    primaryGoal: 'creative_center',
                },
            },
            isLoading: false,
            user: { uid: 'user-1' },
            isAuthenticated: true,
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

        expect(screen.getByText('Start Here')).toBeInTheDocument();
        expect(screen.getByText('Creative Center')).toBeInTheDocument();
        expect(screen.getByText('Craig')).toBeInTheDocument();
        expect(screen.getByText('Where work lands')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open Brand Guide' })).toHaveAttribute(
            'href',
            '/dashboard/settings/brand-guide',
        );
        expect(screen.getByRole('link', { name: 'Open Creative Center' })).toHaveAttribute(
            'href',
            '/dashboard/creative',
        );
        expect(screen.getByTestId('insight-cards-grid')).toHaveAttribute('data-max-cards', '5');
    });

    it('renders dispensary pilot briefing with a welcome-playbook first win', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'dispensary_admin',
            orgId: 'org-dispensary',
            user: {
                locationName: 'Thrive Syracuse',
            },
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {
                onboarding: {
                    primaryGoal: 'welcome_playbook',
                },
            },
            isLoading: false,
            user: { uid: 'user-1' },
            isAuthenticated: true,
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

        expect(screen.getByText('Email Personalization')).toBeInTheDocument();
        expect(screen.getByText('Mrs. Parker')).toBeInTheDocument();
        expect(screen.getByText('What repeats automatically')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open Playbooks' })).toHaveAttribute(
            'href',
            '/dashboard/playbooks',
        );
    });

    it('renders brand pilot briefing from user fallback without loading an org profile', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            orgId: null,
            user: {
                brandName: 'Ecstatic Edibles',
            },
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {},
            isLoading: false,
            user: { uid: 'user-1' },
            isAuthenticated: true,
        });

        render(<InboxWorkspaceBriefing />);

        expect(screen.getByText('Brand Pilot')).toBeInTheDocument();
        expect(screen.getByText('Brand Command Center')).toBeInTheDocument();
        expect(screen.getByText('Ecstatic Edibles')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
        expect(getOrgProfileAction).not.toHaveBeenCalled();
    });
});
