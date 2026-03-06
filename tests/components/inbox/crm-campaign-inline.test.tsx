import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CrmCampaignInline } from '@/components/inbox/crm-campaign-inline';

const mockToast = jest.fn();
const mockGenerateInboxCrmInsight = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/server/actions/inbox-crm', () => ({
    generateInboxCrmInsight: (...args: unknown[]) => mockGenerateInboxCrmInsight(...args),
}));

describe('CrmCampaignInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateInboxCrmInsight.mockResolvedValue({
            success: true,
            insight: {
                workflow: 'winback',
                title: 'Win-Back Opportunity',
                summary: 'Three high-value at-risk customers need follow-up.',
                metrics: [
                    { label: 'Customers', value: '3' },
                    { label: 'LTV At Risk', value: '$12,000' },
                    { label: 'Most Inactive', value: '46d' },
                ],
                customers: [
                    {
                        id: 'cust-1',
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                        segment: 'at_risk',
                        totalSpent: 5200,
                        daysSinceLastOrder: 46,
                    },
                ],
                actions: [
                    {
                        kind: 'campaign',
                        label: 'Open Win-Back Campaign',
                        prompt: 'Plan a win-back campaign for our highest-value at-risk customers.',
                    },
                    {
                        kind: 'outreach',
                        label: 'Draft Personalized Outreach',
                        prompt: 'Draft personalized outreach for the top at-risk customers.',
                    },
                ],
            },
        });
    });

    it('loads CRM insight and renders customer data', async () => {
        render(<CrmCampaignInline orgId="org-1" initialPrompt="Win back slipping customers" />);

        fireEvent.click(screen.getByRole('button', { name: /load crm insight/i }));

        await waitFor(() => {
            expect(mockGenerateInboxCrmInsight).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgId: 'org-1',
                    workflow: 'winback',
                    prompt: 'Win back slipping customers',
                })
            );
        });

        expect(await screen.findByText('Win-Back Opportunity')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('$12,000')).toBeInTheDocument();
    });

    it('opens a downstream workflow with the recommended prompt', async () => {
        const onOpenAction = jest.fn();
        render(<CrmCampaignInline orgId="org-1" onOpenAction={onOpenAction} />);

        fireEvent.change(screen.getByLabelText(/context or goal/i), {
            target: { value: 'We need a premium win-back push.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /load crm insight/i }));

        await waitFor(() => {
            expect(screen.getAllByRole('button', { name: /open workflow/i }).length).toBeGreaterThan(0);
        });
        fireEvent.click(screen.getAllByRole('button', { name: /open workflow/i })[0]);

        expect(onOpenAction).toHaveBeenCalledWith(
            'campaign',
            'Plan a win-back campaign for our highest-value at-risk customers.',
            expect.objectContaining({
                workflow: 'winback',
                title: 'Win-Back Opportunity',
            })
        );
    });
});
