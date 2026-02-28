// src/app/api/checkout/cannpay/route.ts
/**
 * Deprecated CannPay endpoint.
 *
 * Security note:
 * This legacy route previously accepted client-provided amounts and created
 * unbound payment intents. To prevent spoofed/rogue authorizations, CannPay
 * must now flow through /api/checkout/cannpay/authorize with an orderId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring';
import { requireUser } from '@/server/auth/auth';

export async function POST(_request: NextRequest) {
    try {
        try {
            await requireUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        logger.warn('[P0-PAY-CANNPAY] Blocked request to deprecated /api/checkout/cannpay endpoint');
        return NextResponse.json(
            {
                success: false,
                error: 'Deprecated endpoint. Use /api/checkout/cannpay/authorize with an orderId-bound payment flow.',
            },
            { status: 410 },
        );
    } catch (error: any) {
        logger.error('Deprecated CanPay endpoint failed unexpectedly:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}

