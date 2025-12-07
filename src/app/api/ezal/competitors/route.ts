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
import { verifySuperAdmin } from '@/server/utils/auth-check';
import { CompetitorType } from '@/types/ezal-scraper';

import { withProtection } from '@/server/middleware/with-protection';
import { ezalCreateCompetitorSchema, type EzalCreateCompetitorRequest } from '@/app/api/schemas';

export const POST = withProtection(
    async (request: NextRequest, data?: EzalCreateCompetitorRequest) => {
        if (!await verifySuperAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            // Data is validated by Zod
            const { tenantId, quickSetup, ...competitorData } = data!;


            // Quick setup creates competitor + data source together
            if (quickSetup) {
                if (!competitorData.name || !competitorData.menuUrl) {
                    return NextResponse.json(
                        { error: 'name and menuUrl are required for quick setup' },
                        { status: 400 }
                    );
                }

                const result = await quickSetupCompetitor(tenantId, {
                    name: competitorData.name,
                    type: (competitorData.type || 'dispensary') as CompetitorType,
                    state: competitorData.state || '',
                    city: competitorData.city || '',
                    zip: competitorData.zip || '',
                    menuUrl: competitorData.menuUrl as string,
                    parserProfileId: competitorData.parserProfileId || 'generic_html_v1',
                    brandsFocus: competitorData.brandsFocus || [],
                    frequencyMinutes: competitorData.frequencyMinutes || 60,
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
            if (!competitorData.name || !competitorData.state || !competitorData.city) {
                return NextResponse.json(
                    { error: 'name, state, and city are required' },
                    { status: 400 }
                );
            }

            const competitor = await createCompetitor(tenantId, {
                name: competitorData.name,
                type: (competitorData.type || 'dispensary') as CompetitorType,
                state: competitorData.state,
                city: competitorData.city,
                zip: competitorData.zip || '',
                primaryDomain: competitorData.primaryDomain || '',
                brandsFocus: competitorData.brandsFocus || [],
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
    },
    { schema: ezalCreateCompetitorSchema }
);

export async function GET(request: NextRequest) {
    if (!await verifySuperAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
