/**
 * Creative Content QR Code Generation
 *
 * Generates trackable QR codes for creative content pieces.
 * QR codes link to public landing pages where users can view the content
 * and analytics can track engagement.
 */

import QRCode from 'qrcode';
import { logger } from '@/lib/logger';

export interface CreativeQROptions {
    contentId: string;
    size?: number;
    baseUrl?: string;
    darkColor?: string;
    lightColor?: string;
}

export interface GenerateQRResult {
    success: boolean;
    qrDataUrl?: string;
    qrSvg?: string;
    contentUrl?: string;
    error?: string;
}

/**
 * Generate QR code data URL (PNG) for creative content
 */
export async function generateCreativeQR({
    contentId,
    size = 512,
    baseUrl,
    darkColor = '#166534', // green-800 (brand color)
    lightColor = '#ffffff',
}: CreativeQROptions): Promise<GenerateQRResult> {
    try {
        // Construct content landing page URL
        const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://bakedbot.ai');
        const contentUrl = `${origin}/creative/${contentId}`;

        // Generate PNG data URL
        const qrDataUrl = await QRCode.toDataURL(contentUrl, {
            width: size,
            margin: 2,
            color: {
                dark: darkColor,
                light: lightColor,
            },
            errorCorrectionLevel: 'M', // Medium error correction
        });

        // Generate SVG for vector graphics
        const qrSvg = await QRCode.toString(contentUrl, {
            type: 'svg',
            width: size,
            margin: 2,
            color: {
                dark: darkColor,
                light: lightColor,
            },
            errorCorrectionLevel: 'M',
        });

        return {
            success: true,
            qrDataUrl,
            qrSvg,
            contentUrl,
        };
    } catch (error) {
        logger.error('[CreativeQR] Generation failed', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate QR code',
        };
    }
}

/**
 * Generate QR code as buffer for server-side storage
 */
export async function generateCreativeQRBuffer({
    contentId,
    size = 512,
    baseUrl = 'https://bakedbot.ai',
}: Omit<CreativeQROptions, 'darkColor' | 'lightColor'>): Promise<Buffer | null> {
    try {
        const contentUrl = `${baseUrl}/creative/${contentId}`;

        const buffer = await QRCode.toBuffer(contentUrl, {
            width: size,
            margin: 2,
            color: {
                dark: '#166534',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
        });

        return buffer;
    } catch (error) {
        logger.error('[CreativeQR] Buffer generation failed', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Validate QR code content ID format
 */
export function isValidContentId(contentId: string): boolean {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(contentId);
}

/**
 * Extract content ID from QR scan URL
 */
export function extractContentId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const contentId = pathParts[pathParts.length - 1];

        return isValidContentId(contentId) ? contentId : null;
    } catch {
        return null;
    }
}
