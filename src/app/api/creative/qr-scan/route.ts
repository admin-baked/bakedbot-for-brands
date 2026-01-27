import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ScanRequest {
    contentId: string;
    platform?: string;
    location?: string;
}

interface ScanResponse {
    success: boolean;
    scans?: number;
    error?: string;
}

/**
 * POST /api/creative/qr-scan
 * Track QR code scans for creative content
 */
export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse>> {
    try {
        const body = await request.json() as ScanRequest;
        const { contentId, platform, location } = body;

        if (!contentId) {
            return NextResponse.json(
                { success: false, error: 'contentId is required' },
                { status: 400 }
            );
        }

        // Detect platform from User-Agent if not provided
        const userAgent = request.headers.get('user-agent') || '';
        const detectedPlatform = platform || detectPlatform(userAgent);

        // Get IP for rate limiting (optional)
        const ip = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

        // Check rate limiting (max 1 scan per IP per content per minute)
        const rateLimitKey = `${contentId}:${ip}`;
        const isRateLimited = await checkRateLimit(rateLimitKey);

        if (isRateLimited) {
            logger.warn('[qr-scan] Rate limit exceeded', { contentId, ip });
            return NextResponse.json(
                { success: false, error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        const { firestore } = await createServerClient();

        // Find the content document across all tenants
        const tenantsSnapshot = await firestore
            .collection('tenants')
            .listDocuments();

        let updated = false;
        let scans = 0;

        for (const tenantRef of tenantsSnapshot) {
            const contentRef = firestore.doc(`${tenantRef.path}/creative_content/${contentId}`);
            const contentDoc = await contentRef.get();

            if (contentDoc.exists) {
                // Update scan stats using transaction for atomicity
                await firestore.runTransaction(async (transaction) => {
                    const doc = await transaction.get(contentRef);

                    if (!doc.exists) return;

                    const data = doc.data();
                    const currentStats = data?.qrStats || { scans: 0, scansByPlatform: {}, scansByLocation: {} };

                    // Increment total scans
                    scans = (currentStats.scans || 0) + 1;

                    // Update platform distribution
                    const platformStats = currentStats.scansByPlatform || {};
                    platformStats[detectedPlatform] = (platformStats[detectedPlatform] || 0) + 1;

                    // Update location distribution if provided
                    const locationStats = currentStats.scansByLocation || {};
                    if (location) {
                        locationStats[location] = (locationStats[location] || 0) + 1;
                    }

                    transaction.update(contentRef, {
                        'qrStats.scans': FieldValue.increment(1),
                        'qrStats.lastScanned': FieldValue.serverTimestamp(),
                        'qrStats.scansByPlatform': platformStats,
                        'qrStats.scansByLocation': locationStats,
                    });
                });

                updated = true;
                logger.info('[qr-scan] Scan tracked', {
                    contentId,
                    scans,
                    platform: detectedPlatform,
                    location
                });
                break;
            }
        }

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Content not found' },
                { status: 404 }
            );
        }

        // Set rate limit (expires in 1 minute)
        await setRateLimit(rateLimitKey);

        return NextResponse.json({
            success: true,
            scans
        });
    } catch (error) {
        logger.error('[qr-scan] Failed to track scan', { error });
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Detect platform from User-Agent string
 */
function detectPlatform(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('instagram')) return 'instagram';
    if (ua.includes('tiktok')) return 'tiktok';
    if (ua.includes('linkedin')) return 'linkedin';
    if (ua.includes('twitter')) return 'twitter';
    if (ua.includes('facebook') || ua.includes('fb')) return 'facebook';
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('mobile')) return 'mobile';

    return 'desktop';
}

/**
 * Simple in-memory rate limiting
 * In production, use Redis or similar distributed cache
 */
const rateLimitCache = new Map<string, number>();

async function checkRateLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const lastScan = rateLimitCache.get(key);

    if (lastScan && now - lastScan < 60000) { // 60 seconds
        return true; // Rate limited
    }

    return false; // Not rate limited
}

async function setRateLimit(key: string): Promise<void> {
    const now = Date.now();
    rateLimitCache.set(key, now);

    // Clean up old entries every 100 requests
    if (rateLimitCache.size > 1000) {
        const cutoff = now - 60000;
        for (const [k, v] of rateLimitCache.entries()) {
            if (v < cutoff) {
                rateLimitCache.delete(k);
            }
        }
    }
}
