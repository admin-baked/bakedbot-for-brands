/**
 * Tests for CreativeQRCode Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreativeQRCode } from '../creative-qr-code';
import { generateCreativeQR } from '@/lib/qr/creative-qr';
import type { CreativeContent } from '@/types/creative-content';

// Mock the QR generation utility
jest.mock('@/lib/qr/creative-qr');

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: jest.fn(),
    },
});

describe('CreativeQRCode', () => {
    const mockContent: CreativeContent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: 'test-tenant',
        brandId: 'test-brand',
        platform: 'instagram',
        status: 'approved',
        complianceStatus: 'active',
        caption: 'Test caption for QR code',
        hashtags: ['#cannabis', '#test'],
        mediaUrls: ['https://example.com/image.jpg'],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        mediaType: 'image',
        generatedBy: 'nano-banana',
        createdBy: 'user-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        qrDataUrl: 'data:image/png;base64,test-qr',
        qrSvg: '<svg>test</svg>',
        contentUrl: 'https://bakedbot.ai/creative/550e8400-e29b-41d4-a716-446655440000',
        qrStats: {
            scans: 42,
            lastScanned: new Date('2026-01-27'),
            scansByPlatform: { mobile: 30, desktop: 12 },
            scansByLocation: {},
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render QR code when data is provided', () => {
        render(<CreativeQRCode content={mockContent} />);

        expect(screen.getByAltText(/QR code for instagram content/i)).toBeInTheDocument();
        expect(screen.getByText('Trackable QR Code')).toBeInTheDocument();
    });

    it('should display scan statistics', () => {
        render(<CreativeQRCode content={mockContent} showStats={true} />);

        expect(screen.getByText('42')).toBeInTheDocument(); // Scan count
        expect(screen.getByText(/1\/27\/2026/)).toBeInTheDocument(); // Last scanned date
    });

    it('should hide statistics when showStats is false', () => {
        render(<CreativeQRCode content={mockContent} showStats={false} />);

        expect(screen.queryByText('Total Scans')).not.toBeInTheDocument();
    });

    it('should display platform badge', () => {
        render(<CreativeQRCode content={mockContent} />);

        expect(screen.getByText('instagram')).toBeInTheDocument();
    });

    it('should show loading skeleton when generating', async () => {
        const contentWithoutQR = { ...mockContent, qrDataUrl: undefined };
        (generateCreativeQR as jest.Mock).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<CreativeQRCode content={contentWithoutQR} />);

        expect(screen.getByText('Generating QR code...')).toBeInTheDocument();
    });

    it('should generate QR code if not provided', async () => {
        const contentWithoutQR = { ...mockContent, qrDataUrl: undefined };
        (generateCreativeQR as jest.Mock).mockResolvedValue({
            success: true,
            qrDataUrl: 'data:image/png;base64,generated-qr',
            qrSvg: '<svg>generated</svg>',
        });

        render(<CreativeQRCode content={contentWithoutQR} />);

        await waitFor(() => {
            expect(generateCreativeQR).toHaveBeenCalledWith({
                contentId: mockContent.id,
                size: 256, // default size
            });
        });
    });

    it('should handle QR generation failure gracefully', async () => {
        const contentWithoutQR = { ...mockContent, qrDataUrl: undefined };
        (generateCreativeQR as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Generation failed',
        });

        const { container } = render(<CreativeQRCode content={contentWithoutQR} />);

        await waitFor(() => {
            // Component should render nothing on failure
            expect(container.firstChild).toBeNull();
        });
    });

    it('should copy URL to clipboard', async () => {
        render(<CreativeQRCode content={mockContent} />);

        const copyButton = screen.getByText('Copy URL');
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockContent.contentUrl);
            expect(screen.getByText('Copied!')).toBeInTheDocument();
        });

        // Should reset after 2 seconds
        await waitFor(() => {
            expect(screen.getByText('Copy URL')).toBeInTheDocument();
        }, { timeout: 2500 });
    });

    it('should open landing page in new tab', () => {
        const originalOpen = window.open;
        window.open = jest.fn();

        render(<CreativeQRCode content={mockContent} />);

        const viewPageButton = screen.getByText('View Page');
        fireEvent.click(viewPageButton);

        expect(window.open).toHaveBeenCalledWith(mockContent.contentUrl, '_blank');

        window.open = originalOpen;
    });

    it('should download PNG at specified size', async () => {
        (generateCreativeQR as jest.Mock).mockResolvedValue({
            success: true,
            qrDataUrl: 'data:image/png;base64,download-qr',
        });

        const originalCreateElement = document.createElement;
        const mockClick = jest.fn();
        document.createElement = jest.fn((tag) => {
            if (tag === 'a') {
                return { click: mockClick } as any;
            }
            return originalCreateElement.call(document, tag);
        });

        render(<CreativeQRCode content={mockContent} showDownload={true} />);

        const png256Button = screen.getByText('PNG 256');
        fireEvent.click(png256Button);

        await waitFor(() => {
            expect(generateCreativeQR).toHaveBeenCalledWith({
                contentId: mockContent.id,
                size: 256,
            });
            expect(mockClick).toHaveBeenCalled();
        });

        document.createElement = originalCreateElement;
    });

    it('should download SVG', async () => {
        const originalCreateElement = document.createElement;
        const mockClick = jest.fn();
        const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
        const mockRevokeObjectURL = jest.fn();

        document.createElement = jest.fn((tag) => {
            if (tag === 'a') {
                return { click: mockClick } as any;
            }
            return originalCreateElement.call(document, tag);
        });

        global.URL.createObjectURL = mockCreateObjectURL;
        global.URL.revokeObjectURL = mockRevokeObjectURL;

        render(<CreativeQRCode content={mockContent} showDownload={true} />);

        const svgButton = screen.getByText('SVG');
        fireEvent.click(svgButton);

        await waitFor(() => {
            expect(mockClick).toHaveBeenCalled();
            expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
        });

        document.createElement = originalCreateElement;
    });

    it('should hide download options when showDownload is false', () => {
        render(<CreativeQRCode content={mockContent} showDownload={false} />);

        expect(screen.queryByText('Download Options:')).not.toBeInTheDocument();
        expect(screen.queryByText('PNG 256')).not.toBeInTheDocument();
    });

    it('should render with custom size', () => {
        render(<CreativeQRCode content={mockContent} size={512} />);

        const img = screen.getByAltText(/QR code for instagram content/i);
        expect(img).toHaveAttribute('width', '512');
        expect(img).toHaveAttribute('height', '512');
    });

    it('should display caption preview', () => {
        render(<CreativeQRCode content={mockContent} />);

        expect(screen.getByText('Caption Preview:')).toBeInTheDocument();
        expect(screen.getByText(mockContent.caption)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const { container } = render(
            <CreativeQRCode content={mockContent} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should format content ID preview', () => {
        render(<CreativeQRCode content={mockContent} />);

        // Should show first 8 characters of content ID
        const shortId = mockContent.id.substring(0, 8);
        expect(screen.getByText(`${shortId}...`)).toBeInTheDocument();
    });
});
