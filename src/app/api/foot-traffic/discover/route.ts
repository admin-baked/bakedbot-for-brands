// src/app/api/foot-traffic/discover/route.ts
/**
 * Foot Traffic Discovery API
 * Provides geo-aware product discovery using CannMenus data
 */

import { NextRequest, NextResponse } from 'next/server';
import { discoverNearbyProducts } from '@/server/services/geo-discovery';
import { DiscoveryOptions } from '@/types/foot-traffic';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
            return NextResponse.json(
                { error: 'lat and lng are required numbers' },
                { status: 400 }
            );
        }

        // Build discovery options
        const options: DiscoveryOptions = {
            lat: body.lat,
            lng: body.lng,
            radiusMiles: body.radiusMiles || 10,
            category: body.category,
            brand: body.brand,
            minPrice: body.minPrice,
            maxPrice: body.maxPrice,
            inStockOnly: body.inStockOnly ?? true,
            limit: Math.min(body.limit || 50, 100), // Cap at 100
            sortBy: body.sortBy || 'distance',
        };

        logger.info('[FootTraffic] Discovery request', {
            lat: options.lat,
            lng: options.lng,
            radius: options.radiusMiles,
        });

        const result = await discoverNearbyProducts(options);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('[FootTraffic] Discovery error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to discover nearby products' },
            { status: 500 }
        );
    }
}

// GET endpoint for simple queries by ZIP
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const zipCode = searchParams.get('zip');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const category = searchParams.get('category');
        const limit = searchParams.get('limit');

        // Need either ZIP or lat/lng
        if (!zipCode && (!lat || !lng)) {
            return NextResponse.json(
                { error: 'Either zip or lat/lng coordinates are required' },
                { status: 400 }
            );
        }

        let coordinates: { lat: number; lng: number };

        if (lat && lng) {
            coordinates = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            };
        } else {
            // Would need to geocode ZIP - for now return error
            return NextResponse.json(
                { error: 'ZIP geocoding not implemented in GET, use POST' },
                { status: 400 }
            );
        }

        const options: DiscoveryOptions = {
            lat: coordinates.lat,
            lng: coordinates.lng,
            radiusMiles: 10,
            category: category || undefined,
            limit: limit ? Math.min(parseInt(limit), 50) : 20,
            sortBy: 'distance',
        };

        const result = await discoverNearbyProducts(options);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('[FootTraffic] Discovery GET error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to discover nearby products' },
            { status: 500 }
        );
    }
}
