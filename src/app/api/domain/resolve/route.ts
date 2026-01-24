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
    // Try headers first (set by middleware rewrite), then fall back to query params
    const hostname = request.headers.get('x-custom-domain-hostname')
        || request.nextUrl.searchParams.get('hostname');
    const originalPath = request.headers.get('x-custom-domain-path')
        || request.nextUrl.searchParams.get('originalPath')
        || '/';

    if (!hostname) {
        return NextResponse.json({ error: 'Missing hostname' }, { status: 400 });
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

        // Rewrite to the brand/dispensary page (not redirect, to keep URL in browser)
        // Use the public base URL to avoid internal server addresses
        const url = new URL(redirectPath, publicBaseUrl);
        return NextResponse.rewrite(url);
    } catch (error) {
        logger.error('[Domain] Resolution error', { hostname: normalizedHostname, error });
        return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
    }
}
