// src/app/api/foot-traffic/zones/route.ts
/**
 * Geo Zones API
 * CRUD operations for foot traffic geo zones (Super Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getGeoZones,
    createGeoZone,
    updateGeoZone,
    deleteGeoZone,
} from '@/server/services/geo-discovery';
import { GeoZone } from '@/types/foot-traffic';
import { logger } from '@/lib/logger';

// GET - List all geo zones
export async function GET() {
    try {
        const zones = await getGeoZones();

        return NextResponse.json({
            success: true,
            data: zones,
        });
    } catch (error) {
        logger.error('[FootTraffic] Get zones error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to fetch geo zones' },
            { status: 500 }
        );
    }
}

// POST - Create new geo zone
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.zipCodes || !body.state) {
            return NextResponse.json(
                { error: 'name, zipCodes, and state are required' },
                { status: 400 }
            );
        }

        // Validate zipCodes is an array
        if (!Array.isArray(body.zipCodes)) {
            return NextResponse.json(
                { error: 'zipCodes must be an array' },
                { status: 400 }
            );
        }

        const zoneData: Omit<GeoZone, 'id' | 'createdAt' | 'updatedAt'> = {
            name: body.name,
            description: body.description || '',
            zipCodes: body.zipCodes,
            radiusMiles: body.radiusMiles || 15,
            centerLat: body.centerLat || 0,
            centerLng: body.centerLng || 0,
            state: body.state,
            city: body.city || '',
            priority: body.priority || 5,
            enabled: body.enabled ?? true,
            features: body.features || {
                seoPages: true,
                dropAlerts: true,
                localOffers: true,
                geoDiscovery: true,
            },
            createdBy: body.createdBy || 'system',
        };

        const zone = await createGeoZone(zoneData);

        logger.info('[FootTraffic] Zone created:', { zoneId: zone.id, name: zone.name });

        return NextResponse.json({
            success: true,
            data: zone,
        });
    } catch (error) {
        logger.error('[FootTraffic] Create zone error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to create geo zone' },
            { status: 500 }
        );
    }
}

// PUT - Update geo zone
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: 'Zone id is required' },
                { status: 400 }
            );
        }

        const { id, ...updates } = body;
        const zone = await updateGeoZone(id, updates);

        if (!zone) {
            return NextResponse.json(
                { error: 'Zone not found' },
                { status: 404 }
            );
        }

        logger.info('[FootTraffic] Zone updated:', { zoneId: id });

        return NextResponse.json({
            success: true,
            data: zone,
        });
    } catch (error) {
        logger.error('[FootTraffic] Update zone error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to update geo zone' },
            { status: 500 }
        );
    }
}

// DELETE - Delete geo zone
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const zoneId = searchParams.get('id');

        if (!zoneId) {
            return NextResponse.json(
                { error: 'Zone id is required' },
                { status: 400 }
            );
        }

        await deleteGeoZone(zoneId);

        logger.info('[FootTraffic] Zone deleted:', { zoneId });

        return NextResponse.json({
            success: true,
            message: 'Zone deleted successfully',
        });
    } catch (error) {
        logger.error('[FootTraffic] Delete zone error:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to delete geo zone' },
            { status: 500 }
        );
    }
}
