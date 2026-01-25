/**
 * Domain Resolution API
 *
 * Resolves custom domains to tenant IDs and returns appropriate redirect.
 * Called by middleware when a custom domain hits the root path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { getCachedTenant, setCachedTenant } from '@/lib/domain-cache';
import type { DomainMapping } from '@/types/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Parse URL to get query params - try headers first (from middleware), then query params
    const url = new URL(request.url);
    const hostname = request.headers.get('x-resolve-hostname')
        || url.searchParams.get('hostname')
        || request.nextUrl.searchParams.get('hostname');

    const originalPath = request.headers.get('x-resolve-path')
        || url.searchParams.get('originalPath')
        || request.nextUrl.searchParams.get('originalPath')
        || '/';

    // Debug logging for troubleshooting
    logger.info('[Domain] Resolve request', {
        requestUrl: request.url,
        hostname,
        originalPath,
        method: request.method,
    });

    if (!hostname) {
        // Return more helpful error for debugging
        return NextResponse.json({
            error: 'Missing hostname',
            debug: {
                url: request.url,
                searchParams: Object.fromEntries(url.searchParams),
            }
        }, { status: 400 });
    }

    const normalizedHostname = hostname.toLowerCase();

    // Build a proper base URL using the original hostname, not internal server URL
    // This prevents redirects to 0.0.0.0:8080 or other internal addresses in production
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const publicBaseUrl = `${protocol}://${hostname}`;

    try {
        // Check cache first
        let tenantId = getCachedTenant(normalizedHostname);

        if (tenantId === undefined) {
            // Not in cache, look up in Firestore
            const { firestore } = await createServerClient();

            const mappingDoc = await firestore
                .collection('domain_mappings')
                .doc(normalizedHostname)
                .get();

            if (mappingDoc.exists) {
                const mapping = mappingDoc.data() as DomainMapping;
                tenantId = mapping.tenantId;
            } else {
                tenantId = null;
            }

            // Cache the result (including null for not found)
            setCachedTenant(normalizedHostname, tenantId);
        }

        if (!tenantId) {
            // Domain not found - redirect to main site's 404
            logger.info('[Domain] Custom domain not found', { hostname: normalizedHostname });
            return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
        }

        // Get tenant to determine if it's a brand or dispensary
        const { firestore } = await createServerClient();
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            logger.warn('[Domain] Tenant not found for custom domain', { hostname: normalizedHostname, tenantId });
            return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
        }

        const tenant = tenantDoc.data();
        const tenantType = tenant?.type || 'brand';

        // Build the redirect URL based on tenant type
        let redirectPath: string;
        if (tenantType === 'dispensary') {
            redirectPath = `/dispensaries/${tenantId}${originalPath === '/' ? '' : originalPath}`;
        } else {
            redirectPath = `/${tenantId}${originalPath === '/' ? '' : originalPath}`;
        }

        logger.info('[Domain] Resolved custom domain', {
            hostname: normalizedHostname,
            tenantId,
            type: tenantType,
            redirect: redirectPath,
        });

        // Return JSON with resolved path - middleware will handle the actual rewrite
        // We can't chain rewrites (middleware rewrite -> API rewrite), so return data instead
        return NextResponse.json({
            success: true,
            tenantId,
            type: tenantType,
            path: redirectPath,
        });
    } catch (error) {
        logger.error('[Domain] Resolution error', { hostname: normalizedHostname, error });
        return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
    }
}
