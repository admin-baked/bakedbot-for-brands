/**
 * Per-Brand LLM.txt Route
 *
 * GET /{brandSlug}/llm.txt
 *
 * Returns a machine-readable markdown summary of the brand/dispensary
 * for AI agent crawlers and LLM discovery.
 */

import { NextResponse } from 'next/server';
import { fetchBrandPageData } from '@/lib/brand-data';
import { getActiveBundles } from '@/app/actions/bundles';
import { getPublicMenuSettings } from '@/server/actions/loyalty-settings';
import { generateBrandLlmTxt } from '@/lib/agent-web/llm-txt-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ brand: string }> }
): Promise<NextResponse> {
    try {
        const { brand: brandSlug } = await params;

        // Reuse the existing brand resolution chain
        const { brand, products } = await fetchBrandPageData(brandSlug);

        if (!brand) {
            return new NextResponse('Brand not found', {
                status: 404,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }

        // Fetch bundles and loyalty settings in parallel
        const [bundles, loyaltySettings] = await Promise.all([
            getActiveBundles(brand.id).catch(() => []),
            getPublicMenuSettings(brand.id).catch(() => null),
        ]);

        const content = generateBrandLlmTxt(
            brand,
            products,
            bundles,
            loyaltySettings,
            brandSlug
        );

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=300, s-maxage=300',
                'X-Robots-Tag': 'all',
            },
        });
    } catch (error) {
        logger.error('[llm.txt] Failed to generate brand llm.txt', { error });
        return new NextResponse('Internal server error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}
