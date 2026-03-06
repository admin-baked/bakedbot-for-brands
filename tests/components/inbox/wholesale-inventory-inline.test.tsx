import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WholesaleInventoryInline } from '@/components/inbox/wholesale-inventory-inline';

const mockToast = jest.fn();
const mockGenerateInboxWholesaleInventoryInsight = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/server/actions/inbox-wholesale', () => ({
    generateInboxWholesaleInventoryInsight: (...args: unknown[]) => mockGenerateInboxWholesaleInventoryInsight(...args),
}));

describe('WholesaleInventoryInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateInboxWholesaleInventoryInsight.mockResolvedValue({
            success: true,
            insight: {
                title: 'Live Wholesale Inventory Snapshot',
                summary: 'Loaded 2 live SKUs from LeafLink.',
                totalSkus: 2,
                totalUnits: 140,
                lowStockCount: 0,
                strongAvailabilityCount: 1,
                products: [
                    {
                        id: 'prod-1',
                        name: 'Top Shelf Flower',
                        brand: 'Grow House',
                        sku: 'TSF-3.5',
                        inventory: 80,
                        stockStatus: 'strong',
                    },
                ],
                actions: [
                    {
                        kind: 'outreach',
                        label: 'Open Outreach Draft',
                        prompt: 'Draft a wholesale availability outreach note for retail buyers.',
                    },
                ],
            },
        });
    });

    it('loads the live wholesale inventory snapshot', async () => {
        render(<WholesaleInventoryInline orgId="org-1" initialPrompt="Focus on premium flower buyers." />);

        fireEvent.click(screen.getByRole('button', { name: /load inventory snapshot/i }));

        await waitFor(() => {
            expect(mockGenerateInboxWholesaleInventoryInsight).toHaveBeenCalledWith({
                orgId: 'org-1',
                prompt: 'Focus on premium flower buyers.',
            });
        });

        expect(await screen.findByText('Live Wholesale Inventory Snapshot')).toBeInTheDocument();
        expect(screen.getByText('Top Shelf Flower')).toBeInTheDocument();
    });

    it('opens the outreach workflow with the generated prompt', async () => {
        const onOpenAction = jest.fn();
        render(<WholesaleInventoryInline orgId="org-1" onOpenAction={onOpenAction} />);

        fireEvent.click(screen.getByRole('button', { name: /load inventory snapshot/i }));

        await screen.findByText('Live Wholesale Inventory Snapshot');
        fireEvent.click(screen.getByRole('button', { name: /open workflow/i }));

        expect(onOpenAction).toHaveBeenCalledWith(
            'outreach',
            'Draft a wholesale availability outreach note for retail buyers.',
            expect.objectContaining({
                title: 'Live Wholesale Inventory Snapshot',
                totalSkus: 2,
            })
        );
    });
});
