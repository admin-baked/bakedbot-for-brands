/**
 * Global Platform LLM.txt Route
 *
 * GET /llm.txt
 *
 * Returns a platform-level machine-readable summary of BakedBot AI,
 * including a directory of all dispensary/brand llm.txt endpoints
 * and API access instructions for AI agent clients.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { generateGlobalLlmTxt } from '@/lib/agent-web/llm-txt-generator';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        const brands = await withCache(
            CachePrefix.AGENT,
            'global-llm-txt-brands',
            async () => {
                const { firestore } = await createServerClient();

                // Fetch brands with slugs
                const brandsSnapshot = await firestore
                    .collection('brands')
                    .select('slug', 'name')
                    .limit(500)
                    .get();

                const brandList: Array<{ name: string; slug: string }> = [];
                const seenSlugs = new Set<string>();

                for (const doc of brandsSnapshot.docs) {
                    const data = doc.data();
                    if (data.slug && !seenSlugs.has(data.slug)) {
                        seenSlugs.add(data.slug);
                        brandList.push({ name: data.name || data.slug, slug: data.slug });
                    }
                }

                // Also check organizations for tenant-based brands
                const orgsSnapshot = await firestore
                    .collection('organizations')
                    .select('slug', 'name')
                    .limit(500)
                    .get();

                for (const doc of orgsSnapshot.docs) {
                    const data = doc.data();
                    if (data.slug && !seenSlugs.has(data.slug)) {
                        seenSlugs.add(data.slug);
                        brandList.push({ name: data.name || data.slug, slug: data.slug });
                    }
                }

                // Sort alphabetically
                brandList.sort((a, b) => a.name.localeCompare(b.name));

                return brandList;
            },
            CacheTTL.AGENT * 2 // 10 minutes for global directory
        );

        const content = generateGlobalLlmTxt(brands);

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=600, s-maxage=600',
                'X-Robots-Tag': 'all',
            },
        });
    } catch (error) {
        logger.error('[llm.txt] Failed to generate global llm.txt', { error });
        return new NextResponse('Internal server error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}
