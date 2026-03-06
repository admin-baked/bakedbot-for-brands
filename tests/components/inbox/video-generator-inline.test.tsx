import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoGeneratorInline } from '@/components/inbox/video-generator-inline';

const mockToast = jest.fn();
const mockGenerateInboxVideoConcept = jest.fn();
const mockGenerateInboxVideoDraft = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        user: { uid: 'user-1' },
    }),
}));

jest.mock('@/server/actions/inbox-media', () => ({
    generateInboxVideoConcept: (...args: unknown[]) => mockGenerateInboxVideoConcept(...args),
    generateInboxVideoDraft: (...args: unknown[]) => mockGenerateInboxVideoDraft(...args),
}));

jest.mock('@/components/chat/chat-media-preview', () => ({
    ChatMediaPreview: ({ url }: { url: string }) => <div data-testid="video-preview">{url}</div>,
}));

describe('VideoGeneratorInline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateInboxVideoConcept.mockResolvedValue({
            success: true,
            concept: {
                title: 'Launch reel',
                hook: 'Fresh drop just landed.',
                visuals: 'Close-up product shots.',
                audio: 'Upbeat beat',
                script: 'Hook, product, CTA.',
                caption: 'Fresh drop on deck.',
                hashtags: ['#FreshDrop'],
                generationPrompt: 'Vertical retail reel prompt',
            },
        });
        mockGenerateInboxVideoDraft.mockResolvedValue({
            success: true,
            draft: {
                id: 'draft-1',
                tenantId: 'org-1',
                brandId: 'org-1',
                platform: 'instagram',
                status: 'draft',
                complianceStatus: 'review_needed',
                caption: 'Fresh drop on deck.',
                hashtags: ['#FreshDrop'],
                mediaUrls: ['https://cdn.example.com/video.mp4'],
                thumbnailUrl: 'https://cdn.example.com/video.jpg',
                mediaType: 'video',
                generatedBy: 'veo',
                createdBy: 'user-1',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            media: {
                type: 'video',
                url: 'https://cdn.example.com/video.mp4',
                prompt: 'Vertical retail reel prompt',
                duration: 5,
                model: 'veo-3.1-generate-preview',
            },
        });
    });

    it('generates and displays a structured concept', async () => {
        render(<VideoGeneratorInline orgId="org-1" />);

        fireEvent.change(screen.getByLabelText(/what's the video about/i), {
            target: { value: 'Launch a new product reel' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate concept/i }));

        await waitFor(() => {
            expect(mockGenerateInboxVideoConcept).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org-1',
                    brandId: 'org-1',
                    createdBy: 'user-1',
                    prompt: 'Launch a new product reel',
                })
            );
        });

        expect(await screen.findByText('Launch reel')).toBeInTheDocument();
    });

    it('renders a video preview after generating the MP4', async () => {
        render(<VideoGeneratorInline orgId="org-1" />);

        fireEvent.change(screen.getByLabelText(/what's the video about/i), {
            target: { value: 'Launch a new product reel' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate video/i }));

        await waitFor(() => {
            expect(mockGenerateInboxVideoDraft).toHaveBeenCalled();
        });

        expect(await screen.findByTestId('video-preview')).toHaveTextContent('https://cdn.example.com/video.mp4');
    });

    it('calls onComplete when Save Draft is pressed', async () => {
        const onComplete = jest.fn();
        render(<VideoGeneratorInline orgId="org-1" onComplete={onComplete} />);

        fireEvent.change(screen.getByLabelText(/what's the video about/i), {
            target: { value: 'Launch a new product reel' },
        });
        fireEvent.click(screen.getByRole('button', { name: /generate video/i }));

        await screen.findByRole('button', { name: /save draft/i });
        fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    draft: expect.objectContaining({ mediaType: 'video' }),
                    media: expect.objectContaining({ type: 'video' }),
                })
            );
        });
    });
});
