import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Plus: () => <span data-testid="icon-plus" />,
    Mail: () => <span data-testid="icon-mail" />,
    MessageSquare: () => <span data-testid="icon-message-square" />,
    BarChart3: () => <span data-testid="icon-bar-chart" />,
    History: () => <span data-testid="icon-history" />
}));

// Mock requireUser to avoid auth issues in tests
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', role: 'brand' })
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    redirect: jest.fn()
}));

// Since this is an async server component, we need to test it differently
// We'll test the rendered output by mocking the component behavior

describe('CraigDashboardPage', () => {
    describe('Stats display - Data consistency fix', () => {
        it('displays 0 active campaigns when no campaigns exist', async () => {
            // Import after mocks are set up
            const { default: CraigDashboardPage } = await import('../page');

            // For server components, we test the rendered JSX
            const page = await CraigDashboardPage();
            const { container } = render(page);

            // Find the Active Campaigns card and verify it shows 0
            const activeCampaignsCard = screen.getByText('Active Campaigns').closest('.rounded-lg');
            expect(activeCampaignsCard).toBeInTheDocument();

            // The value should be 0, not 3 (there are multiple 0s now - campaigns and emails)
            const zeroValues = screen.getAllByText('0');
            expect(zeroValues.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Create your first campaign')).toBeInTheDocument();
        });

        it('displays 0 emails sent when no emails have been sent', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Emails Sent')).toBeInTheDocument();
            expect(screen.getByText('No emails sent yet')).toBeInTheDocument();
        });

        it('displays "--" for open rate when no data available', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Avg. Open Rate')).toBeInTheDocument();
            expect(screen.getByText('--')).toBeInTheDocument();
            expect(screen.getByText('Not enough data')).toBeInTheDocument();
        });

        it('displays consistent empty state in campaigns list', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Recent Campaigns')).toBeInTheDocument();
            expect(screen.getByText('No campaigns yet. Start one today!')).toBeInTheDocument();
        });
    });

    describe('Page structure', () => {
        it('renders the page header with title', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Craig (Marketer)')).toBeInTheDocument();
            expect(screen.getByText('Automate your marketing campaigns with AI-generated content.')).toBeInTheDocument();
        });

        it('renders the Create Campaign button', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Create Campaign')).toBeInTheDocument();
        });

        it('renders three stat cards', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
            expect(screen.getByText('Emails Sent')).toBeInTheDocument();
            expect(screen.getByText('Avg. Open Rate')).toBeInTheDocument();
        });
    });

    describe('Data consistency between stats and list', () => {
        it('ensures stats match the empty campaign list state', async () => {
            const { default: CraigDashboardPage } = await import('../page');

            const page = await CraigDashboardPage();
            render(page);

            // Verify stats show zeros/empty state
            const zeroValues = screen.getAllByText('0');
            expect(zeroValues.length).toBeGreaterThanOrEqual(2); // At least 2 zeros (campaigns and emails)

            // Verify campaign list shows empty state
            expect(screen.getByText('No campaigns yet. Start one today!')).toBeInTheDocument();

            // This test validates the fix for Issue #4:
            // Previously stats showed "3" active campaigns while list showed "No campaigns yet"
            // Now both show consistent empty state
        });
    });
});
