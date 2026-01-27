/**
 * Tests for Image Variations Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageVariations } from '../image-variations';
import type { CreativeContent } from '@/types/creative-content';

describe('ImageVariations', () => {
    const mockContent: CreativeContent = {
        id: 'content-1',
        tenantId: 'test-tenant',
        brandId: 'test-brand',
        platform: 'instagram',
        status: 'approved',
        complianceStatus: 'active',
        caption: 'Original content',
        mediaUrls: ['https://example.com/image1.jpg'],
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        mediaType: 'image',
        generatedBy: 'nano-banana',
        createdBy: 'user-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        hashtags: [],
    };

    const mockVariations: CreativeContent[] = [
        {
            ...mockContent,
            id: 'variation-1',
            thumbnailUrl: 'https://example.com/thumb2.jpg',
        },
        {
            ...mockContent,
            id: 'variation-2',
            thumbnailUrl: 'https://example.com/thumb3.jpg',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('should render main content and variations', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        // Should show "Variation 1", "Variation 2", "Variation 3"
        expect(screen.getByText('Variation 1')).toBeInTheDocument();
        expect(screen.getByText('Variation 2')).toBeInTheDocument();
        expect(screen.getByText('Variation 3')).toBeInTheDocument();
    });

    it('should show "Original" badge on first variation', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        expect(screen.getByText('Original')).toBeInTheDocument();
    });

    it('should mark main content as selected by default', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('should call onSelectVariation when variation clicked', () => {
        const onSelectVariation = jest.fn();

        render(
            <ImageVariations
                content={mockContent}
                variations={mockVariations}
                onSelectVariation={onSelectVariation}
            />
        );

        const variation2 = screen.getByText('Variation 2').closest('div')?.parentElement;
        if (variation2) {
            fireEvent.click(variation2);
        }

        expect(onSelectVariation).toHaveBeenCalledWith('variation-1');
    });

    it('should update selected state when variation clicked', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        const variation2 = screen.getByText('Variation 2').closest('div')?.parentElement;
        if (variation2) {
            fireEvent.click(variation2);
        }

        // Should show selected notice
        expect(
            screen.getByText(/You've selected a variation/i)
        ).toBeInTheDocument();
    });

    it('should show regenerate button when onRegenerate provided', () => {
        const onRegenerate = jest.fn();

        render(
            <ImageVariations
                content={mockContent}
                variations={mockVariations}
                onRegenerate={onRegenerate}
            />
        );

        const regenerateButton = screen.getByText('Regenerate');
        expect(regenerateButton).toBeInTheDocument();

        fireEvent.click(regenerateButton);
        expect(onRegenerate).toHaveBeenCalled();
    });

    it('should hide regenerate button while generating', () => {
        const onRegenerate = jest.fn();

        render(
            <ImageVariations
                content={mockContent}
                variations={mockVariations}
                isGenerating={true}
                onRegenerate={onRegenerate}
            />
        );

        expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
    });

    it('should show loading placeholders while generating', () => {
        render(
            <ImageVariations
                content={mockContent}
                variations={[]}
                isGenerating={true}
                maxVariations={4}
            />
        );

        const generatingText = screen.getAllByText('Generating...');
        expect(generatingText.length).toBeGreaterThan(0);
    });

    it('should show prompt to generate when no variations', () => {
        const onRegenerate = jest.fn();

        render(
            <ImageVariations
                content={mockContent}
                variations={[]}
                onRegenerate={onRegenerate}
            />
        );

        expect(screen.getByText(/Generate multiple variations/i)).toBeInTheDocument();
        expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('should respect maxVariations limit', () => {
        const manyVariations: CreativeContent[] = Array.from({ length: 10 }, (_, i) => ({
            ...mockContent,
            id: `variation-${i}`,
            thumbnailUrl: `https://example.com/thumb${i}.jpg`,
        }));

        render(
            <ImageVariations
                content={mockContent}
                variations={manyVariations}
                maxVariations={4}
            />
        );

        // Should show main content + 4 variations = 5 total
        const variations = screen.getAllByText(/Variation \d+/);
        expect(variations.length).toBeLessThanOrEqual(5);
    });

    it('should show download button on hover', async () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        const variationCards = screen.getAllByText(/Variation \d+/);
        const firstCard = variationCards[0].closest('div')?.parentElement;

        if (firstCard) {
            fireEvent.mouseEnter(firstCard);

            await waitFor(() => {
                expect(screen.getByText('Download')).toBeInTheDocument();
            });
        }
    });

    it('should handle image download', async () => {
        const mockBlob = new Blob(['image data'], { type: 'image/png' });
        const mockUrl = 'blob:test-url';

        (global.fetch as jest.Mock).mockResolvedValue({
            blob: () => Promise.resolve(mockBlob),
        });

        global.URL.createObjectURL = jest.fn(() => mockUrl);
        global.URL.revokeObjectURL = jest.fn();

        const mockClick = jest.fn();
        const originalCreateElement = document.createElement;
        document.createElement = jest.fn((tag) => {
            if (tag === 'a') {
                return { click: mockClick } as any;
            }
            return originalCreateElement.call(document, tag);
        }) as any;

        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        const downloadButton = screen.getByText('Download');
        fireEvent.click(downloadButton);

        await waitFor(() => {
            expect(mockClick).toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
        });

        document.createElement = originalCreateElement;
    });

    it('should show count of available options', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        expect(screen.getByText(/3 options/i)).toBeInTheDocument();
    });

    it('should display images correctly', () => {
        render(<ImageVariations content={mockContent} variations={mockVariations} />);

        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);

        // First image should be the main content
        expect(images[0]).toHaveAttribute('src', mockContent.thumbnailUrl);
    });

    it('should handle selectedVariationId prop', () => {
        render(
            <ImageVariations
                content={mockContent}
                variations={mockVariations}
                selectedVariationId="variation-1"
            />
        );

        // Should show the selected badge on variation-1
        expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('should show loading spinner for images without URL', () => {
        const contentWithoutImage = { ...mockContent, thumbnailUrl: undefined, mediaUrls: [] };

        render(<ImageVariations content={contentWithoutImage} variations={[]} />);

        // Should show loading spinner
        const spinner = screen.getByRole('img', { hidden: true });
        expect(spinner).toBeInTheDocument();
    });

    it('should prevent selection when clicking download button', async () => {
        const onSelectVariation = jest.fn();

        render(
            <ImageVariations
                content={mockContent}
                variations={mockVariations}
                onSelectVariation={onSelectVariation}
            />
        );

        const downloadButton = screen.getByText('Download');
        fireEvent.click(downloadButton);

        // onSelectVariation should not be called when clicking download
        expect(onSelectVariation).not.toHaveBeenCalled();
    });
});
