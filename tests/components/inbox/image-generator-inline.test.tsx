import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImageGeneratorInline } from '@/components/inbox/image-generator-inline';

const mockToast = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        user: { uid: 'user-1' },
    }),
}));

const mockGenerateInboxImageDraft = jest.fn();
jest.mock('@/server/actions/inbox-media', () => ({
    generateInboxImageDraft: (...args: unknown[]) => mockGenerateInboxImageDraft(...args),
}));

jest.mock('@/components/chat/chat-media-preview', () => ({
    ChatMediaPreview: ({ url }: { url: string }) => <div data-testid="media-preview">{url}</div>,
}));

describe('ImageGeneratorInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateInboxImageDraft.mockResolvedValue({
            success: true,
            draft: {
                id: 'draft-1',
                tenantId: 'org-1',
                brandId: 'org-1',
                platform: 'instagram',
                status: 'draft',
                complianceStatus: 'review_needed',
                caption: '',
                hashtags: [],
                mediaUrls: ['https://cdn.example.com/image.png'],
                thumbnailUrl: 'https://cdn.example.com/image.png',
                mediaType: 'image',
                generatedBy: 'flux-schnell',
                createdBy: 'user-1',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            media: {
                type: 'image',
                url: 'https://cdn.example.com/image.png',
                prompt: 'generated prompt',
                model: 'flux-schnell',
            },
        });
    });

    it('validates that a prompt is required', async () => {
        render(<ImageGeneratorInline orgId="org-1" />);

        fireEvent.keyDown(screen.getByLabelText(/what image do you need/i), {
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

    it('shows a generated preview after a successful request', async () => {
        render(<ImageGeneratorInline orgId="org-1" />);

        fireEvent.change(screen.getByLabelText(/what image do you need/i), {
            target: { value: 'Premium product image' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate image/i }));

        await waitFor(() => {
            expect(mockGenerateInboxImageDraft).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org-1',
                    brandId: 'org-1',
                    createdBy: 'user-1',
                    prompt: 'Premium product image',
                })
            );
        });

        expect(screen.getByTestId('media-preview')).toHaveTextContent('https://cdn.example.com/image.png');
    });

    it('regenerates when the Regenerate button is clicked', async () => {
        render(<ImageGeneratorInline orgId="org-1" />);

        fireEvent.change(screen.getByLabelText(/what image do you need/i), {
            target: { value: 'Premium product image' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate image/i }));

        const regenerateButtons = await screen.findAllByRole('button', { name: /regenerate/i });
        fireEvent.click(regenerateButtons[0]);

        await waitFor(() => {
            expect(mockGenerateInboxImageDraft).toHaveBeenCalledTimes(2);
        });
    });

    it('calls onComplete when Save Draft is pressed', async () => {
        const onComplete = jest.fn();
        render(<ImageGeneratorInline orgId="org-1" onComplete={onComplete} />);

        fireEvent.change(screen.getByLabelText(/what image do you need/i), {
            target: { value: 'Premium product image' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate image/i }));

        await screen.findByRole('button', { name: /save draft/i });
        fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    draft: expect.objectContaining({ mediaType: 'image' }),
                    media: expect.objectContaining({ type: 'image' }),
                })
            );
        });
    });
});
