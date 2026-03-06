import React from 'react';
import { render, screen } from '@testing-library/react';
import { CreativeMediaPreview } from '@/components/inbox/artifacts/creative-media-preview';
import type { CreativeContent } from '@/types/creative-content';

describe('CreativeMediaPreview', () => {
    it('renders an image preview for image content', () => {
        const content = {
            id: 'creative-1',
            tenantId: 'org-1',
            brandId: 'org-1',
            platform: 'instagram',
            status: 'draft',
            complianceStatus: 'review_needed',
            caption: 'Image caption',
            mediaUrls: ['https://cdn.example.com/image.png'],
            mediaType: 'image',
            generatedBy: 'flux-schnell',
            createdBy: 'user-1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        } as CreativeContent;

        render(<CreativeMediaPreview content={content} />);

        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/image.png');
    });

    it('renders a video player for video content', () => {
        const content = {
            id: 'creative-2',
            tenantId: 'org-1',
            brandId: 'org-1',
            platform: 'instagram',
            status: 'draft',
            complianceStatus: 'review_needed',
            caption: 'Video caption',
            mediaUrls: ['https://cdn.example.com/video.mp4'],
            mediaType: 'video',
            generatedBy: 'veo',
            createdBy: 'user-1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        } as CreativeContent;

        const { container } = render(<CreativeMediaPreview content={content} />);

        expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.example.com/video.mp4');
    });
});
