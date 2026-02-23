/**
 * Agent API — Structured Product Catalog
 *
 * GET /api/agent/{brandSlug}
 *
 * Returns a JSON-LD (schema.org) structured product catalog
 * for AI agent clients and shopping assistants.
 *
 * Content-Type: application/ld+json
 * Cache: 5 minutes (Redis + HTTP)
 * Auth: None (public data, rate-limited by middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchBrandPageData } from '@/lib/brand-data';
import { getActiveBundles } from '@/app/actions/bundles';
import { getPublicMenuSettings } from '@/server/actions/loyalty-settings';
import { buildAgentApiPayload } from '@/lib/agent-web/schema-org-builder';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ brandSlug: string }> }
): Promise<NextResponse> {
    try {
        const { brandSlug } = await params;

        if (!brandSlug) {
            return NextResponse.json(
                { error: 'Brand slug is required' },
                { status: 400 }
            );
        }

        const payload = await withCache(
            CachePrefix.AGENT,
            `api-${brandSlug}`,
            async () => {
                // Reuse the existing brand resolution chain
                const { brand, products } = await fetchBrandPageData(brandSlug);

                if (!brand) {
                    return null;
                }

                // Fetch bundles and loyalty settings in parallel
                const [bundles, loyaltySettings] = await Promise.all([
                    getActiveBundles(brand.id).catch(() => []),
                    getPublicMenuSettings(brand.id).catch(() => null),
                ]);

                return buildAgentApiPayload(
                    brand,
                    products,
                    bundles,
                    loyaltySettings,
                    brandSlug
                );
            },
            CacheTTL.AGENT
        );

        if (!payload) {
            return NextResponse.json(
                { error: 'Brand not found' },
                { status: 404 }
            );
        }

        return new NextResponse(JSON.stringify(payload, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/ld+json; charset=utf-8',
                'Cache-Control': 'public, max-age=300, s-maxage=300',
                'X-BakedBot-Agent-Version': '1.0',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            },
        });
    } catch (error) {
        logger.error('[Agent API] Failed to generate payload', { error });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
