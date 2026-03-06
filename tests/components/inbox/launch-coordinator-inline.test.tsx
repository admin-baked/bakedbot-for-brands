import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LaunchCoordinatorInline } from '@/components/inbox/launch-coordinator-inline';

const mockToast = jest.fn();
const mockGenerateInboxLaunchPlan = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        user: { uid: 'user-1' },
    }),
}));

jest.mock('@/server/actions/inbox-launch', () => ({
    generateInboxLaunchPlan: (...args: unknown[]) => mockGenerateInboxLaunchPlan(...args),
}));

describe('LaunchCoordinatorInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateInboxLaunchPlan.mockResolvedValue({
            success: true,
            plan: {
                title: 'Weekend Solventless Drop',
                summary: 'VIP-first launch for the new solventless gummies line.',
                launchTypeLabel: 'New Drop',
                audienceLabel: 'VIP / Loyalty',
                launchWindow: 'Friday afternoon through Sunday close',
                offer: 'VIP early access with a limited-time loyalty perk',
                heroMessage: 'Fresh solventless gummies are here for your weekend reset.',
                recommendedChannels: ['Email', 'SMS', 'Instagram', 'Menu'],
                timeline: [
                    'Tease the drop 24 hours before launch.',
                    'Open VIP access first with menu placement and SMS.',
                    'Follow with Instagram creative and weekend reminder.',
                ],
                complianceNotes: [
                    'Avoid medical claims and keep copy age-gated.',
                    'Keep offers factual and avoid unsupported potency promises.',
                ],
                assetPrompts: {
                    carousel: 'Create a carousel for the weekend solventless gummies launch.',
                    bundle: 'Create a VIP weekend bundle pairing the new gummies with complementary SKUs.',
                    image: 'Generate a premium studio product image for the solventless gummies launch.',
                    video: 'Create a short-form reel announcing the solventless gummies weekend drop.',
                    campaign: 'Plan an email + SMS + social launch campaign for the gummies drop.',
                },
            },
        });
    });

    it('validates that a prompt is required', async () => {
        render(<LaunchCoordinatorInline orgId="org-1" />);

        fireEvent.keyDown(screen.getByLabelText(/what are you launching/i), {
            key: 'Enter',
            metaKey: true,
        });

        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Prompt required',
                variant: 'destructive',
            })
        );
    });

    it('renders the generated launch brief', async () => {
        render(<LaunchCoordinatorInline orgId="org-1" />);

        fireEvent.change(screen.getByLabelText(/what are you launching/i), {
            target: { value: 'Launch our solventless gummies for VIP shoppers this weekend.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate launch plan/i }));

        await waitFor(() => {
            expect(mockGenerateInboxLaunchPlan).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org-1',
                    brandId: 'org-1',
                    createdBy: 'user-1',
                    prompt: 'Launch our solventless gummies for VIP shoppers this weekend.',
                })
            );
        });

        expect(await screen.findByText('Weekend Solventless Drop')).toBeInTheDocument();
        expect(screen.getByText(/vip-first launch/i)).toBeInTheDocument();
    });

    it('opens downstream tools with the coordinated asset prompt', async () => {
        const onOpenAsset = jest.fn();
        render(<LaunchCoordinatorInline orgId="org-1" onOpenAsset={onOpenAsset} />);

        fireEvent.change(screen.getByLabelText(/what are you launching/i), {
            target: { value: 'Launch our solventless gummies for VIP shoppers this weekend.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate launch plan/i }));

        await screen.findByRole('button', { name: /open image/i });
        fireEvent.click(screen.getByRole('button', { name: /open image/i }));

        expect(onOpenAsset).toHaveBeenCalledWith(
            'image',
            'Generate a premium studio product image for the solventless gummies launch.',
            expect.objectContaining({
                title: 'Weekend Solventless Drop',
                assetPrompts: expect.objectContaining({
                    image: 'Generate a premium studio product image for the solventless gummies launch.',
                }),
            })
        );
    });
});
