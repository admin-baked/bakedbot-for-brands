/**
 * QR Code Types
 *
 * Trackable QR codes for marketing campaigns, products, events, etc.
 */

import { z } from 'zod';

// ============ QR Code Types ============

export type QRCodeType =
    | 'product'      // Links to product page
    | 'menu'         // Links to full menu
    | 'promotion'    // Links to promotional landing page
    | 'event'        // Links to event details
    | 'loyalty'      // Links to loyalty program signup
    | 'custom';      // Custom URL

export type QRCodeStyle =
    | 'standard'     // Basic black & white
    | 'branded'      // Brand colors + logo
    | 'artistic';    // Artistic/creative design

// ============ QR Code Data ============

export interface QRCode {
    id: string;
    orgId: string;

    // QR Code Configuration
    type: QRCodeType;
    title: string;
    description?: string;

    // Destination
    targetUrl: string;
    shortCode?: string; // Short code for tracking (e.g., /qr/abc123)

    // Visual Customization
    style: QRCodeStyle;
    primaryColor?: string;   // Hex color for QR code
    backgroundColor?: string; // Background color
    logoUrl?: string;        // Brand logo to embed in center

    // Tracking & Analytics
    trackClicks: boolean;
    totalScans: number;
    uniqueScans: number;
    lastScannedAt?: Date;

    // Metadata
    campaign?: string;       // Campaign name
    tags?: string[];         // Categorization tags
    expiresAt?: Date;        // Optional expiration

    // Generated Assets
    imageUrl?: string;       // URL to generated QR code image
    downloadUrl?: string;    // URL for high-res download

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// ============ QR Code Scan Event ============

export interface QRCodeScan {
    id: string;
    qrCodeId: string;
    orgId: string;

    // Scan details
    scannedAt: Date;
    userAgent?: string;
    ipAddress?: string;
    location?: {
        city?: string;
        region?: string;
        country?: string;
    };
    referer?: string;

    // User context (if logged in)
    userId?: string;
    sessionId?: string;
}

// ============ QR Code Analytics ============

export interface QRCodeAnalytics {
    qrCodeId: string;
    totalScans: number;
    uniqueScans: number;
    scansByDate: Record<string, number>; // ISO date string → count
    scansByDevice: {
        mobile: number;
        desktop: number;
        tablet: number;
        other: number;
    };
    scansByLocation: Record<string, number>; // Country → count
    conversionRate?: number; // If tracking downstream conversions
}

// ============ Zod Schemas ============

export const QRCodeTypeSchema = z.enum([
    'product',
    'menu',
    'promotion',
    'event',
    'loyalty',
    'custom'
]);

export const QRCodeStyleSchema = z.enum([
    'standard',
    'branded',
    'artistic'
]);

export const CreateQRCodeSchema = z.object({
    type: QRCodeTypeSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    targetUrl: z.string().url(),
    style: QRCodeStyleSchema.default('standard'),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    logoUrl: z.string().url().optional(),
    trackClicks: z.boolean().default(true),
    campaign: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    expiresAt: z.date().optional(),
});

export const UpdateQRCodeSchema = CreateQRCodeSchema.partial();

// ============ Helper Functions ============

/**
 * Generate a short code for QR code tracking
 */
export function generateQRShortCode(): string {
    return Math.random().toString(36).substr(2, 8);
}

/**
 * Get QR code type display name
 */
export function getQRCodeTypeLabel(type: QRCodeType): string {
    const labels: Record<QRCodeType, string> = {
        product: 'Product Link',
        menu: 'Full Menu',
        promotion: 'Promotion',
        event: 'Event',
        loyalty: 'Loyalty Program',
        custom: 'Custom URL',
    };
    return labels[type] || type;
}

/**
 * Get QR code style display name
 */
export function getQRCodeStyleLabel(style: QRCodeStyle): string {
    const labels: Record<QRCodeStyle, string> = {
        standard: 'Standard (B&W)',
        branded: 'Branded',
        artistic: 'Artistic',
    };
    return labels[style] || style;
}

/**
 * Build tracking URL with short code
 */
export function buildTrackingUrl(baseUrl: string, shortCode: string): string {
    return `${baseUrl}/qr/${shortCode}`;
}

export default QRCode;
