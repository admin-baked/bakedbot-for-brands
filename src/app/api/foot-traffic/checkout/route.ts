// src/app/api/foot-traffic/checkout/route.ts
/**
 * Checkout Router API
 * Find nearest checkout for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNearestCheckout, trackCheckoutRedirect } from '@/lib/foot-traffic/checkout-router';
import { geocodeZipCode } from '@/lib/cannmenus-api';
import { logger } from '@/lib/logger';

// GET - Find nearest checkout for a product
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('product');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const zip = searchParams.get('zip');
        const affiliateId = searchParams.get('affiliate');
        const source = searchParams.get('source') || 'api';

        if (!productId) {
            return NextResponse.json(
                { error: 'product ID is required' },
                { status: 400 }
            );
        }

        // Get coordinates from lat/lng or ZIP
        let coordinates: { lat: number; lng: number } | null = null;

        if (lat && lng) {
            coordinates = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            };
        } else if (zip) {
            coordinates = await geocodeZipCode(zip);
        }

        if (!coordinates) {
            return NextResponse.json(
                { error: 'Location required. Provide lat/lng or zip.' },
                { status: 400 }
            );
        }

        const result = await getNearestCheckout(
            productId,
            coordinates.lat,
            coordinates.lng,
            {
                affiliateId: affiliateId || undefined,
                source,
            }
        );

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('[FootTraffic] Checkout router error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to find checkout options' },
            { status: 500 }
        );
    }
}

// POST - Track a checkout redirect
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, retailerId, affiliateId, source } = body;

        if (!productId || !retailerId) {
            return NextResponse.json(
                { error: 'productId and retailerId are required' },
                { status: 400 }
            );
        }

        await trackCheckoutRedirect(productId, retailerId, affiliateId, source);

        return NextResponse.json({
            success: true,
            message: 'Redirect tracked',
        });
    } catch (error) {
        logger.error('[FootTraffic] Track redirect error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to track redirect' },
            { status: 500 }
        );
    }
}
