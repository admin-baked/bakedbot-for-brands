// src/app/api/ezal/competitors/route.ts
/**
 * Competitors Management API
 * POST - Create a competitor
 * GET - List competitors
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createCompetitor,
    listCompetitors,
    quickSetupCompetitor,
    searchCompetitors
} from '@/server/services/ezal';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, quickSetup, ...data } = body;

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        // Quick setup creates competitor + data source together
        if (quickSetup) {
            if (!data.name || !data.menuUrl) {
                return NextResponse.json(
                    { error: 'name and menuUrl are required for quick setup' },
                    { status: 400 }
                );
            }

            const result = await quickSetupCompetitor(tenantId, {
                name: data.name,
                type: data.type || 'dispensary',
                state: data.state || '',
                city: data.city || '',
                zip: data.zip || '',
                menuUrl: data.menuUrl,
                parserProfileId: data.parserProfileId || 'generic_html_v1',
                brandsFocus: data.brandsFocus || [],
                frequencyMinutes: data.frequencyMinutes || 60,
            });

            return NextResponse.json({
                success: true,
                data: {
                    competitor: result.competitor,
                    dataSource: result.dataSource,
                },
            });
        }

        // Standard competitor creation
        if (!data.name || !data.state || !data.city) {
            return NextResponse.json(
                { error: 'name, state, and city are required' },
                { status: 400 }
            );
        }

        const competitor = await createCompetitor(tenantId, {
            name: data.name,
            type: data.type || 'dispensary',
            state: data.state,
            city: data.city,
            zip: data.zip || '',
            primaryDomain: data.primaryDomain || '',
            brandsFocus: data.brandsFocus || [],
            active: true,
        });

        return NextResponse.json({
            success: true,
            data: competitor,
        });

    } catch (error) {
        logger.error('[Ezal API] Create competitor failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to create competitor' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const state = searchParams.get('state');
        const brandName = searchParams.get('brandName');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        // Search mode
        if (brandName) {
            const results = await searchCompetitors({
                tenantId,
                brandName,
                state: state || undefined,
            });

            return NextResponse.json({
                success: true,
                data: results,
            });
        }

        // List mode
        const competitors = await listCompetitors(tenantId, {
            state: state || undefined,
            active: true,
        });

        return NextResponse.json({
            success: true,
            data: competitors,
        });

    } catch (error) {
        logger.error('[Ezal API] List competitors failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to list competitors' },
            { status: 500 }
        );
    }
}
