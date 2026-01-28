'use server';

/**
 * QR Code Server Actions
 *
 * Generate, track, and manage QR codes for marketing campaigns.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import QRCode from 'qrcode';
import type { QRCode as QRCodeType, QRCodeScan, QRCodeAnalytics } from '@/types/qr-code';
import { generateQRShortCode, buildTrackingUrl } from '@/types/qr-code';

// ============ Firestore Collections ============

const QR_CODES_COLLECTION = 'qr_codes';
const QR_SCANS_COLLECTION = 'qr_scans';

function getDb() {
    return getFirestore();
}

// ============ QR Code Generation ============

/**
 * Generate a new QR code with tracking
 */
export async function generateQRCode(input: {
    type: QRCodeType['type'];
    title: string;
    description?: string;
    targetUrl: string;
    style?: QRCodeType['style'];
    primaryColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    campaign?: string;
    tags?: string[];
    expiresAt?: Date;
}): Promise<{ success: boolean; qrCode?: QRCodeType; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        const qrCodeId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const shortCode = generateQRShortCode();

        // Build tracking URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
        const trackingUrl = buildTrackingUrl(baseUrl, shortCode);

        // Generate QR code image
        const qrOptions = {
            errorCorrectionLevel: 'H' as const,
            type: 'image/png' as const,
            quality: 0.95,
            margin: 1,
            color: {
                dark: input.primaryColor || '#000000',
                light: input.backgroundColor || '#FFFFFF',
            },
            width: 1024, // High resolution for printing
        };

        const qrImageDataUrl = await QRCode.toDataURL(trackingUrl, qrOptions);

        // Create QR code record
        const qrCode: QRCodeType = {
            id: qrCodeId,
            orgId: user.uid, // TODO: Get actual orgId from user context
            type: input.type,
            title: input.title,
            description: input.description,
            targetUrl: input.targetUrl,
            shortCode,
            style: input.style || 'standard',
            primaryColor: input.primaryColor,
            backgroundColor: input.backgroundColor,
            logoUrl: input.logoUrl,
            trackClicks: true,
            totalScans: 0,
            uniqueScans: 0,
            campaign: input.campaign,
            tags: input.tags,
            expiresAt: input.expiresAt,
            imageUrl: qrImageDataUrl, // Data URL for now, TODO: Upload to storage
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.uid,
        };

        // Save to Firestore
        await db.collection(QR_CODES_COLLECTION).doc(qrCodeId).set({
            ...qrCode,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('QR code generated', { qrCodeId, shortCode, userId: user.uid });

        return { success: true, qrCode };
    } catch (error) {
        logger.error('Failed to generate QR code', { error });
        return { success: false, error: 'Failed to generate QR code' };
    }
}

// ============ QR Code Tracking ============

/**
 * Track a QR code scan
 */
export async function trackQRCodeScan(
    shortCode: string,
    context?: {
        userAgent?: string;
        ipAddress?: string;
        referer?: string;
    }
): Promise<{ success: boolean; targetUrl?: string; error?: string }> {
    try {
        const db = getDb();

        // Find QR code by short code
        const qrCodesSnapshot = await db
            .collection(QR_CODES_COLLECTION)
            .where('shortCode', '==', shortCode)
            .limit(1)
            .get();

        if (qrCodesSnapshot.empty) {
            return { success: false, error: 'QR code not found' };
        }

        const qrCodeDoc = qrCodesSnapshot.docs[0];
        const qrCode = qrCodeDoc.data() as QRCodeType;

        // Check expiration
        if (qrCode.expiresAt && new Date(qrCode.expiresAt) < new Date()) {
            return { success: false, error: 'QR code expired' };
        }

        // Record scan event
        const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const scan: QRCodeScan = {
            id: scanId,
            qrCodeId: qrCode.id,
            orgId: qrCode.orgId,
            scannedAt: new Date(),
            userAgent: context?.userAgent,
            ipAddress: context?.ipAddress,
            referer: context?.referer,
        };

        await db.collection(QR_SCANS_COLLECTION).doc(scanId).set({
            ...scan,
            scannedAt: FieldValue.serverTimestamp(),
        });

        // Update QR code scan counts
        await db.collection(QR_CODES_COLLECTION).doc(qrCode.id).update({
            totalScans: FieldValue.increment(1),
            lastScannedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('QR code scan tracked', {
            qrCodeId: qrCode.id,
            shortCode,
            scanId,
        });

        return { success: true, targetUrl: qrCode.targetUrl };
    } catch (error) {
        logger.error('Failed to track QR code scan', { error, shortCode });
        return { success: false, error: 'Failed to track scan' };
    }
}

// ============ QR Code Queries ============

/**
 * Get QR codes for an organization
 */
export async function getQRCodes(params?: {
    orgId?: string;
    campaign?: string;
    type?: QRCodeType['type'];
    limit?: number;
}): Promise<{ success: boolean; qrCodes?: QRCodeType[]; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();
        let query = db.collection(QR_CODES_COLLECTION)
            .where('orgId', '==', params?.orgId || user.uid);

        if (params?.campaign) {
            query = query.where('campaign', '==', params.campaign);
        }

        if (params?.type) {
            query = query.where('type', '==', params.type);
        }

        query = query.orderBy('createdAt', 'desc').limit(params?.limit || 50);

        const snapshot = await query.get();
        const qrCodes = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            lastScannedAt: doc.data().lastScannedAt?.toDate(),
            expiresAt: doc.data().expiresAt?.toDate(),
        })) as QRCodeType[];

        return { success: true, qrCodes };
    } catch (error) {
        logger.error('Failed to get QR codes', { error });
        return { success: false, error: 'Failed to retrieve QR codes' };
    }
}

/**
 * Get QR code analytics
 */
export async function getQRCodeAnalytics(
    qrCodeId: string
): Promise<{ success: boolean; analytics?: QRCodeAnalytics; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();

        // Get QR code
        const qrCodeDoc = await db.collection(QR_CODES_COLLECTION).doc(qrCodeId).get();
        if (!qrCodeDoc.exists) {
            return { success: false, error: 'QR code not found' };
        }

        const qrCode = qrCodeDoc.data() as QRCodeType;

        // Verify ownership
        if (qrCode.orgId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get scan events
        const scansSnapshot = await db
            .collection(QR_SCANS_COLLECTION)
            .where('qrCodeId', '==', qrCodeId)
            .orderBy('scannedAt', 'desc')
            .limit(1000) // Last 1000 scans
            .get();

        const scans = scansSnapshot.docs.map((doc) => doc.data() as QRCodeScan);

        // Calculate analytics
        const scansByDate: Record<string, number> = {};
        const scansByDevice = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
        const scansByLocation: Record<string, number> = {};

        scans.forEach((scan) => {
            // Group by date
            const dateKey = new Date(scan.scannedAt).toISOString().split('T')[0];
            scansByDate[dateKey] = (scansByDate[dateKey] || 0) + 1;

            // Detect device type from user agent
            const ua = scan.userAgent?.toLowerCase() || '';
            if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
                scansByDevice.mobile++;
            } else if (ua.includes('tablet') || ua.includes('ipad')) {
                scansByDevice.tablet++;
            } else if (ua.includes('mozilla')) {
                scansByDevice.desktop++;
            } else {
                scansByDevice.other++;
            }

            // Group by location (if available)
            if (scan.location?.country) {
                const country = scan.location.country;
                scansByLocation[country] = (scansByLocation[country] || 0) + 1;
            }
        });

        const analytics: QRCodeAnalytics = {
            qrCodeId,
            totalScans: qrCode.totalScans,
            uniqueScans: qrCode.uniqueScans,
            scansByDate,
            scansByDevice,
            scansByLocation,
        };

        return { success: true, analytics };
    } catch (error) {
        logger.error('Failed to get QR code analytics', { error, qrCodeId });
        return { success: false, error: 'Failed to retrieve analytics' };
    }
}

/**
 * Delete a QR code
 */
export async function deleteQRCode(
    qrCodeId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getDb();

        // Get QR code to verify ownership
        const qrCodeDoc = await db.collection(QR_CODES_COLLECTION).doc(qrCodeId).get();
        if (!qrCodeDoc.exists) {
            return { success: false, error: 'QR code not found' };
        }

        const qrCode = qrCodeDoc.data() as QRCodeType;
        if (qrCode.orgId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Delete QR code
        await db.collection(QR_CODES_COLLECTION).doc(qrCodeId).delete();

        logger.info('QR code deleted', { qrCodeId, userId: user.uid });

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete QR code', { error, qrCodeId });
        return { success: false, error: 'Failed to delete QR code' };
    }
}

export default {
    generateQRCode,
    trackQRCodeScan,
    getQRCodes,
    getQRCodeAnalytics,
    deleteQRCode,
};
