/**
 * NY Lead Enrichment Service
 *
 * Core Jina + Apollo enrichment logic, shared by:
 *  - triggerNYLeadEnrichment (server action, user-triggered via CEO dashboard)
 *  - ny-outreach-pre-enrich cron (automated, runs at 6 AM EST daily)
 *
 * No auth check — callers are responsible for authentication.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { apolloSearchPeople, apolloEnrichByDomain } from './apollo-enrichment';
import { enrichLinkedInProfile } from './proxycurl-enrichment';

// =============================================================================
// Types
// =============================================================================

export interface LeadEnrichmentResult {
    leadId: string;
    dispensaryName: string;
    emailFound: boolean;
    email?: string;
    source: 'jina' | 'apollo' | 'none';
}

export interface LeadEnrichmentBatchResult {
    enriched: number;
    withEmail: number;
    results: LeadEnrichmentResult[];
}

// =============================================================================
// Core Enrichment
// =============================================================================

/**
 * Enrich up to `limit` unenriched outreach leads with email/website data.
 *
 * Strategy:
 *   1. Jina web search to find the dispensary's own website
 *   2. Jina reader scrapes homepage + /contact for email/phone
 *   3. Apollo.io fallback if Jina didn't find an email
 *
 * Processes leads in sequence with 1s delay between calls to respect rate limits.
 */
export async function enrichLeadBatch(limit: number = 20): Promise<LeadEnrichmentBatchResult> {
    const db = getAdminFirestore();

    const snap = await db.collection('ny_dispensary_leads')
        .where('enriched', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();

    if (snap.empty) {
        return { enriched: 0, withEmail: 0, results: [] };
    }

    let enriched = 0;
    let withEmail = 0;
    const results: LeadEnrichmentResult[] = [];

    for (const doc of snap.docs) {
        const data = doc.data();
        const dispensaryName = data.dispensaryName as string;
        const city = (data.city as string) || 'local market';
        const state = (data.state as string) || 'NY';

        let email: string | undefined;
        let websiteUrl = typeof data.websiteUrl === 'string' && data.websiteUrl.trim().length > 0
            ? data.websiteUrl
            : undefined;
        let contactFormUrl: string | undefined;
        let phone: string | undefined;
        let linkedinUrl: string | undefined;
        let contactTitle: string | undefined;
        let source: LeadEnrichmentResult['source'] = 'none';

        // --- Step 1: Apollo.io — structured contact data (email, name, title, LinkedIn) ---
        let apolloContactName: string | undefined;
        try {
            const apolloResult = websiteUrl
                ? await apolloEnrichByDomain(websiteUrl, dispensaryName, city, state)
                : await apolloSearchPeople(
                    dispensaryName,
                    city,
                    state,
                    data.contactName as string | undefined
                );

            if (apolloResult.email) {
                email = apolloResult.email;
                source = 'apollo';
                logger.info('[LeadEnrichment] Apollo found email', {
                    dispensaryName,
                    source: apolloResult.source,
                    creditSpent: apolloResult.creditSpent,
                });
            }
            if (!data.contactName && apolloResult.contactName) apolloContactName = apolloResult.contactName;
            if (apolloResult.linkedinUrl) linkedinUrl = apolloResult.linkedinUrl;
            if (apolloResult.title) contactTitle = apolloResult.title;
        } catch (err) {
            logger.warn('[LeadEnrichment] Apollo search failed', { dispensaryName, error: String(err) });
        }

        // --- Step 2: Proxycurl — LinkedIn profile enrichment (if Apollo returned a URL) ---
        let linkedinProfile: Record<string, unknown> | undefined;
        if (linkedinUrl) {
            const profile = await enrichLinkedInProfile(linkedinUrl);
            if (profile) {
                linkedinProfile = profile as unknown as Record<string, unknown>;
                // Fill in gaps from Apollo if profile has better data
                if (!apolloContactName && profile.fullName) apolloContactName = profile.fullName;
                if (!contactTitle && profile.currentTitle) contactTitle = profile.currentTitle;
            }
        }

        // --- Step 3: Jina web scrape — additional context (website, phone, contact form) ---
        // Always runs to enrich website/phone even when Apollo found an email
        try {
            let siteUrl = websiteUrl;
            let ownSiteSnippet = '';

            if (!siteUrl) {
                const { jinaSearch } = await import('@/server/tools/jina-tools');
                const searchQuery = `"${dispensaryName}" ${city} ${state} cannabis dispensary contact email`;
                const searchResults = await jinaSearch(searchQuery);

                const skipDomains = ['leafly', 'weedmaps', 'yelp', 'google', 'facebook', 'instagram', 'twitter', 'reddit'];
                const ownSite = searchResults.find(r => {
                    try {
                        const domain = new URL(r.url).hostname;
                        return !skipDomains.some(d => domain.includes(d));
                    } catch { return false; }
                });
                siteUrl = ownSite?.url;
                ownSiteSnippet = ownSite?.snippet || '';
            }

            if (siteUrl) {
                websiteUrl = siteUrl;
                const domain = new URL(siteUrl).origin;

                const jinaHeaders: Record<string, string> = { Accept: 'text/plain' };
                if (process.env.JINA_API_KEY) jinaHeaders['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;

                const [pc, cc] = await Promise.all([
                    globalThis.fetch(`https://r.jina.ai/${siteUrl}`, {
                        headers: jinaHeaders,
                        signal: AbortSignal.timeout(10000),
                    }).then(r => r.ok ? r.text() : '').catch(() => ''),
                    globalThis.fetch(`https://r.jina.ai/${domain}/contact`, {
                        headers: jinaHeaders,
                        signal: AbortSignal.timeout(10000),
                    }).then(r => r.ok ? r.text() : '').catch(() => ''),
                ]);

                const content = [pc, cc].filter(c => c.length > 50).join('\n\n') || ownSiteSnippet;

                if (content.length >= 20) {
                    // Only use Jina email if Apollo didn't find one
                    if (!email) {
                        const emailMatch = content.match(/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i);
                        if (emailMatch) { email = emailMatch[0]; source = 'jina'; }
                    }
                    const phoneMatch = content.match(/\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4}/);
                    if (phoneMatch) phone = phoneMatch[0];
                    contactFormUrl = !email ? `${domain}/contact` : undefined;
                }
            }
        } catch (err) {
            logger.warn('[LeadEnrichment] Jina scrape failed', { dispensaryName, error: String(err) });
        }

        // --- Step 3: Persist results ---
        const updates: Record<string, unknown> = {
            enriched: true,
            updatedAt: Date.now(),
            notes: email
                ? `Email found: ${email} | License: ${data.licenseNumber || ''}`
                : `No email found | License: ${data.licenseNumber || ''}`,
        };
        if (email) { updates.email = email; updates.emailSource = source; withEmail++; }
        if (phone) updates.phone = phone;
        if (websiteUrl) updates.websiteUrl = websiteUrl;
        if (contactFormUrl) updates.contactFormUrl = contactFormUrl;
        if (apolloContactName) updates.contactName = apolloContactName;
        if (linkedinUrl) updates.linkedinUrl = linkedinUrl;
        if (contactTitle) updates.contactTitle = contactTitle;
        if (linkedinProfile) updates.linkedinProfile = linkedinProfile;

        await doc.ref.update(updates);
        enriched++;

        results.push({ leadId: doc.id, dispensaryName, emailFound: !!email, email, source });

        // Rate limiting: 1s between leads to avoid Jina/Apollo throttle
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('[LeadEnrichment] Batch complete', { enriched, withEmail, limit });
    return { enriched, withEmail, results };
}
