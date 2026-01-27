'use client';

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface QRScanTrackerProps {
    contentId: string;
}

/**
 * Client component that tracks QR code scans on mount
 * Place this component in the QR landing page to track scans
 */
export function QRScanTracker({ contentId }: QRScanTrackerProps) {
    const hasTracked = useRef(false);

    useEffect(() => {
        // Only track once per page load
        if (hasTracked.current) return;
        hasTracked.current = true;

        // Track the scan (fire and forget)
        fetch('/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contentId }),
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    logger.info('[QRScanTracker] Scan tracked', { contentId, scans: data.scans });
                }
            })
            .catch((error) => {
                // Silently fail - don't block the user experience
                logger.warn('[QRScanTracker] Failed to track scan', { contentId, error });
            });
    }, [contentId]);

    // This component renders nothing
    return null;
}
