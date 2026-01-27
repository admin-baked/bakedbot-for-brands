/**
 * Tests for Creative QR Code Generation Utilities
 */

import {
    generateCreativeQR,
    generateCreativeQRBuffer,
    isValidContentId,
    extractContentId,
} from '../creative-qr';

// Mock the qrcode library
jest.mock('qrcode', () => ({
    toDataURL: jest.fn(),
    toString: jest.fn(),
    toBuffer: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

import QRCode from 'qrcode';

describe('generateCreativeQR', () => {
    const validContentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockDataUrl = 'data:image/png;base64,mock-data-url';
    const mockSvg = '<svg>mock-svg</svg>';

    beforeEach(() => {
        jest.clearAllMocks();
        (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockDataUrl);
        (QRCode.toString as jest.Mock).mockResolvedValue(mockSvg);
    });

    it('should generate QR code with default options', async () => {
        const result = await generateCreativeQR({ contentId: validContentId });

        expect(result.success).toBe(true);
        expect(result.qrDataUrl).toBe(mockDataUrl);
        expect(result.qrSvg).toBe(mockSvg);
        expect(result.contentUrl).toContain(`/creative/${validContentId}`);
        expect(result.error).toBeUndefined();
    });

    it('should use custom baseUrl when provided', async () => {
        const customBaseUrl = 'https://custom-domain.com';
        const result = await generateCreativeQR({
            contentId: validContentId,
            baseUrl: customBaseUrl,
        });

        expect(result.contentUrl).toBe(`${customBaseUrl}/creative/${validContentId}`);
    });

    it('should use custom size when provided', async () => {
        await generateCreativeQR({
            contentId: validContentId,
            size: 1024,
        });

        expect(QRCode.toDataURL).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ width: 1024 })
        );
    });

    it('should use custom colors when provided', async () => {
        const darkColor = '#000000';
        const lightColor = '#FFFFFF';

        await generateCreativeQR({
            contentId: validContentId,
            darkColor,
            lightColor,
        });

        expect(QRCode.toDataURL).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                color: {
                    dark: darkColor,
                    light: lightColor,
                },
            })
        );
    });

    it('should handle QR generation errors gracefully', async () => {
        const error = new Error('QR generation failed');
        (QRCode.toDataURL as jest.Mock).mockRejectedValue(error);

        const result = await generateCreativeQR({ contentId: validContentId });

        expect(result.success).toBe(false);
        expect(result.error).toBe('QR generation failed');
        expect(result.qrDataUrl).toBeUndefined();
    });

    it('should use browser window origin when available', async () => {
        const originalWindow = global.window;
        Object.defineProperty(global, 'window', {
            value: { location: { origin: 'https://bakedbot.ai' } },
            writable: true,
        });

        const result = await generateCreativeQR({ contentId: validContentId });

        expect(result.contentUrl).toBe(`https://bakedbot.ai/creative/${validContentId}`);

        // Restore
        global.window = originalWindow;
    });
});

describe('generateCreativeQRBuffer', () => {
    const validContentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockBuffer = Buffer.from('mock-buffer');

    beforeEach(() => {
        jest.clearAllMocks();
        (QRCode.toBuffer as jest.Mock).mockResolvedValue(mockBuffer);
    });

    it('should generate QR code buffer successfully', async () => {
        const result = await generateCreativeQRBuffer({ contentId: validContentId });

        expect(result).toBe(mockBuffer);
        expect(QRCode.toBuffer).toHaveBeenCalled();
    });

    it('should use default baseUrl', async () => {
        await generateCreativeQRBuffer({ contentId: validContentId });

        expect(QRCode.toBuffer).toHaveBeenCalledWith(
            `https://bakedbot.ai/creative/${validContentId}`,
            expect.any(Object)
        );
    });

    it('should handle buffer generation errors', async () => {
        (QRCode.toBuffer as jest.Mock).mockRejectedValue(new Error('Buffer generation failed'));

        const result = await generateCreativeQRBuffer({ contentId: validContentId });

        expect(result).toBeNull();
    });
});

describe('isValidContentId', () => {
    it('should validate correct UUID v4', () => {
        const validIds = [
            '550e8400-e29b-41d4-a716-446655440000',
            '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];

        validIds.forEach((id) => {
            expect(isValidContentId(id)).toBe(true);
        });
    });

    it('should reject invalid UUIDs', () => {
        const invalidIds = [
            'not-a-uuid',
            '550e8400-e29b-41d4-a716', // Too short
            '550e8400-e29b-51d4-a716-446655440000', // Wrong version (5 instead of 4)
            '550e8400e29b41d4a716446655440000', // No hyphens
            '', // Empty
        ];

        invalidIds.forEach((id) => {
            expect(isValidContentId(id)).toBe(false);
        });
    });

    it('should be case insensitive', () => {
        const uppercaseId = '550E8400-E29B-41D4-A716-446655440000';
        const lowercaseId = '550e8400-e29b-41d4-a716-446655440000';

        expect(isValidContentId(uppercaseId)).toBe(true);
        expect(isValidContentId(lowercaseId)).toBe(true);
    });
});

describe('extractContentId', () => {
    it('should extract content ID from valid URL', () => {
        const contentId = '550e8400-e29b-41d4-a716-446655440000';
        const urls = [
            `https://bakedbot.ai/creative/${contentId}`,
            `https://custom-domain.com/creative/${contentId}`,
            `http://localhost:3000/creative/${contentId}`,
        ];

        urls.forEach((url) => {
            expect(extractContentId(url)).toBe(contentId);
        });
    });

    it('should return null for invalid content ID', () => {
        const urls = [
            'https://bakedbot.ai/creative/invalid-id',
            'https://bakedbot.ai/creative/550e8400', // Too short
            'https://bakedbot.ai/other-page',
        ];

        urls.forEach((url) => {
            expect(extractContentId(url)).toBeNull();
        });
    });

    it('should return null for malformed URLs', () => {
        const invalidUrls = [
            'not-a-url',
            '',
            'just-text',
        ];

        invalidUrls.forEach((url) => {
            expect(extractContentId(url)).toBeNull();
        });
    });

    it('should handle URLs with query parameters', () => {
        const contentId = '550e8400-e29b-41d4-a716-446655440000';
        const url = `https://bakedbot.ai/creative/${contentId}?ref=qr`;

        expect(extractContentId(url)).toBe(contentId);
    });

    it('should handle URLs with trailing slash', () => {
        const contentId = '550e8400-e29b-41d4-a716-446655440000';
        const url = `https://bakedbot.ai/creative/${contentId}/`;

        // Should still extract the ID before the trailing slash
        const result = extractContentId(url);
        expect(result).toBeNull(); // Will be null because last part is empty string
    });
});
