import { NextRequest, NextResponse } from 'next/server';
import { trackQRCodeScan } from '@/server/actions/qr-code';
import { headers } from 'next/headers';

/**
 * QR Code Redirect & Tracking Route
 *
 * When a user scans a QR code, they hit this route which:
 * 1. Tracks the scan event
 * 2. Redirects to the target URL
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ shortCode: string }> }
) {
    const { shortCode } = await params;

    // Get tracking context from headers
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const referer = headersList.get('referer') || undefined;
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] :
                     headersList.get('x-real-ip') || undefined;

    // Track the scan
    const result = await trackQRCodeScan(shortCode, {
        userAgent,
        ipAddress,
        referer,
    });

    if (!result.success || !result.targetUrl) {
        // QR code not found or expired
        return NextResponse.json(
            { error: result.error || 'QR code not found' },
            { status: 404 }
        );
    }

    // Ensure target URL has protocol for redirect
    let targetUrl = result.targetUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
    }

    // Redirect to target URL
    return NextResponse.redirect(targetUrl, 307);
}
