import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductDiscoveryInline } from '@/components/inbox/product-discovery-inline';

const mockToast = jest.fn();
const mockGenerateInboxProductDiscoveryInsight = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/server/actions/inbox-product-discovery', () => ({
    generateInboxProductDiscoveryInsight: (...args: unknown[]) => mockGenerateInboxProductDiscoveryInsight(...args),
}));

describe('ProductDiscoveryInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('validates that a prompt is required for product recommendations', async () => {
        render(<ProductDiscoveryInline orgId="org-1" />);

        fireEvent.click(screen.getByRole('button', { name: /find matches/i }));

        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Prompt required',
                variant: 'destructive',
            })
        );
    });

    it('renders grounded product recommendations', async () => {
        mockGenerateInboxProductDiscoveryInsight.mockResolvedValue({
            success: true,
            insight: {
                mode: 'recommend_products',
                title: 'Recommended Product Matches',
                summary: 'These three products line up with the shopper brief.',
                overallReasoning: 'These three products line up with the shopper brief.',
                recommendedProducts: [
                    {
                        productId: 'prod-1',
                        productName: 'Citrus Haze Cart',
                        reasoning: 'Bright citrus terpenes and an upbeat profile make it a strong daytime fit.',
                    },
                ],
            },
        });

        render(<ProductDiscoveryInline orgId="org-1" initialPrompt="Recommend a daytime vape with citrus notes." />);

        fireEvent.click(screen.getByRole('button', { name: /find matches/i }));

        await waitFor(() => {
            expect(mockGenerateInboxProductDiscoveryInsight).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgId: 'org-1',
                    mode: 'recommend_products',
                    prompt: 'Recommend a daytime vape with citrus notes.',
                })
            );
        });

        expect(await screen.findByText('Recommended Product Matches')).toBeInTheDocument();
        expect(screen.getByText('Citrus Haze Cart')).toBeInTheDocument();
    });

    it('opens the bundle workflow with grounded bundle ideas', async () => {
        const onOpenAction = jest.fn();
        mockGenerateInboxProductDiscoveryInsight.mockResolvedValue({
            success: true,
            insight: {
                mode: 'bundle_ideas',
                title: 'Grounded Bundle Ideas',
                summary: 'These bundle ideas are grounded in the current catalog.',
                overallReasoning: 'These bundle ideas are grounded in the current catalog.',
                bundleIdeas: [
                    {
                        name: 'Weekend Lift Kit',
                        description: 'A bright daytime pairing for weekend shoppers.',
                        savingsPercent: 15,
                        products: [
                            { id: 'p1', name: 'Lemon Mint Cart', category: 'Vape', price: 42 },
                        ],
                    },
                ],
                actions: [
                    {
                        kind: 'bundle',
                        label: 'Open Bundle Builder',
                        prompt: 'Create draft bundles using these grounded concepts from the current menu.',
                    },
                ],
            },
        });

        render(
            <ProductDiscoveryInline
                orgId="org-1"
                initialPrompt="Suggest bundle ideas for citrus-forward weekend shoppers."
                onOpenAction={onOpenAction}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /load bundle ideas/i }));

        await screen.findByText('Grounded Bundle Ideas');
        fireEvent.click(screen.getByRole('button', { name: /open workflow/i }));

        expect(onOpenAction).toHaveBeenCalledWith(
            'bundle',
            'Create draft bundles using these grounded concepts from the current menu.',
            expect.objectContaining({
                mode: 'bundle_ideas',
                title: 'Grounded Bundle Ideas',
            })
        );
    });
});
