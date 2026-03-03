/**
 * NY Dispensary Contact Research Pipeline
 *
 * Automated discovery of NY dispensary contact information:
 * 1. Search for NY dispensaries via Jina web search
 * 2. Scrape individual dispensary websites for contact info
 * 3. Extract email addresses and contact form URLs
 * 4. Save researched leads to Firestore
 * 5. Sync results to BakedBot Drive spreadsheet
 *
 * Uses Jina Search + Reader (not Firecrawl) for cannabis-friendly scraping.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { jinaSearch } from '@/server/tools/jina-tools';
import { callClaude } from '@/ai/claude';
import { saveResearchedLeads, syncToDriverSpreadsheet, type ResearchedLead } from './lead-research';

const JINA_READER_BASE = 'https://r.jina.ai/';

/**
 * Fetch page content via Jina Reader API.
 */
async function jinaReadPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${JINA_READER_BASE}${url}`, {
            headers: {
                'Accept': 'text/plain',
                ...(process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {}),
            },
            signal: controller.signal,
        });

        if (!response.ok) return '';
        const text = await response.text();
        return text.slice(0, 5000); // Cap content length
    } catch {
        return '';
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Extract contact info from page content using Claude.
 */
async function extractContactInfo(pageContent: string, dispensaryName: string, websiteUrl: string): Promise<{
    email?: string;
    contactFormUrl?: string;
    phone?: string;
    contactName?: string;
    city?: string;
    address?: string;
}> {
    if (!pageContent || pageContent.length < 15) return {};

    try {
        const result = await callClaude({
            systemPrompt: `You are a data extraction assistant. Extract contact information from the provided website content for a cannabis dispensary. Return ONLY a JSON object with the following fields (omit any that are not found):
- email: the primary business email (NOT info@example.com or noreply@)
- contactFormUrl: URL of the contact us form (if found)
- phone: business phone number
- contactName: owner or manager name (if mentioned)
- city: city name
- address: full street address

Return valid JSON only. No markdown, no explanation.`,
            userMessage: `Dispensary: ${dispensaryName}
Website: ${websiteUrl}

Page content:
${pageContent}`,
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 300,
        });

        // Parse JSON from response
        const text = typeof result === 'string' ? result : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return {};
    } catch (err) {
        logger.warn('[ContactResearch] Claude extraction failed', {
            dispensary: dispensaryName,
            error: String(err),
        });
        return {};
    }
}

/**
 * Check if a dispensary has already been researched.
 */
async function isAlreadyResearched(websiteUrl: string): Promise<boolean> {
    const db = getAdminFirestore();
    const domain = new URL(websiteUrl).hostname.replace('www.', '');

    const snap = await db.collection('ny_dispensary_leads')
        .where('websiteUrl', '>=', domain)
        .where('websiteUrl', '<=', domain + '\uf8ff')
        .limit(1)
        .get();

    if (!snap.empty) return true;

    // Also check by normalized URL
    const snap2 = await db.collection('ny_dispensary_leads')
        .where('websiteUrl', '==', websiteUrl)
        .limit(1)
        .get();

    return !snap2.empty;
}

// NY State Cannabis License API (Socrata)
const NY_LICENSE_API = 'https://data.ny.gov/resource/jskf-tt3q.json';

interface NYLicenseRecord {
    entity_name?: string;
    dba?: string;
    address_line_1?: string;
    city?: string;
    zip_code?: string;
    county?: string;
    region?: string;
    primary_contact_name?: string;
    license_number?: string;
    operational_status?: string;
    license_status?: string;
}

/**
 * Bulk import ALL active NY licensed dispensaries in one shot — no enrichment.
 * Fast (~5s): 1 API call + 1 Firestore dedup check + batch write.
 * Run this first, then use importNYLicensedLeads() to enrich batches for email.
 *
 * @returns { total, imported, skipped }
 */
export async function bulkImportAllNYLeads(): Promise<{
    total: number;
    imported: number;
    skipped: number;
}> {
    logger.info('[ContactResearch] Starting bulk NY API import (no enrichment)');

    const db = getAdminFirestore();

    // Fetch all active adult-use retail licenses (up to 500)
    let nyRecords: NYLicenseRecord[] = [];
    try {
        const params = new URLSearchParams({
            '$limit': '500',
            '$offset': '0',
            'license_status': 'Active',
            'license_type_code': 'OCMRETL',
            '$order': 'issued_date DESC',
        });
        const res = await fetch(`${NY_LICENSE_API}?${params.toString()}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`NY API responded ${res.status}`);
        nyRecords = await res.json() as NYLicenseRecord[];
    } catch (err) {
        logger.error('[ContactResearch] NY API bulk fetch failed', { error: String(err) });
        throw err;
    }

    logger.info('[ContactResearch] NY API returned records', { count: nyRecords.length });

    // Fetch all existing license numbers from Firestore in one query
    const existingSnap = await db.collection('ny_dispensary_leads')
        .where('source', '==', 'ny-state-api')
        .select('licenseNumber')
        .get();
    const existingLicenses = new Set(
        existingSnap.docs.map(d => d.data().licenseNumber as string).filter(Boolean)
    );

    logger.info('[ContactResearch] Existing NY API leads in Firestore', { count: existingLicenses.size });

    // Filter to only new records
    const newRecords = nyRecords.filter(r => {
        if (!r.license_number) return true; // Save if no license number
        return !existingLicenses.has(r.license_number);
    });

    if (newRecords.length === 0) {
        logger.info('[ContactResearch] All NY API records already imported');
        return { total: nyRecords.length, imported: 0, skipped: nyRecords.length };
    }

    // Batch write all new leads (Firestore max 500/batch)
    const BATCH_SIZE = 400;
    let imported = 0;

    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
        const chunk = newRecords.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const record of chunk) {
            const dispensaryName = (record.dba || record.entity_name || '').trim();
            if (!dispensaryName) continue;

            const licenseNumber = record.license_number || '';
            const domain = dispensaryName.toLowerCase().replace(/[^a-z0-9]/g, '-');

            const docRef = db.collection('ny_dispensary_leads').doc();
            batch.set(docRef, {
                dispensaryName,
                contactName: record.primary_contact_name || null,
                email: null,
                phone: null,
                city: record.city || 'New York',
                state: 'NY',
                address: record.address_line_1 || null,
                websiteUrl: null,
                contactFormUrl: null,
                licenseNumber,
                licenseType: 'Adult-Use Retail',
                posSystem: null,
                source: 'ny-state-api',
                researchedAt: Date.now(),
                status: 'researched',
                emailVerified: false,
                outreachSent: false,
                enriched: false,
                notes: `License: ${licenseNumber} | Contact: ${record.primary_contact_name || 'unknown'} | Not yet enriched`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            imported++;
        }

        await batch.commit();
        logger.info('[ContactResearch] Batch committed', { batch: Math.floor(i / BATCH_SIZE) + 1, count: chunk.length });
    }

    // Sync Drive spreadsheet
    try {
        await syncToDriverSpreadsheet();
    } catch (err) {
        logger.warn('[ContactResearch] Drive sync failed (non-fatal)', { error: String(err) });
    }

    logger.info('[ContactResearch] Bulk NY import complete', {
        total: nyRecords.length,
        imported,
        skipped: nyRecords.length - imported,
    });

    return { total: nyRecords.length, imported, skipped: nyRecords.length - imported };
}

/**
 * Import leads from NY State official cannabis license database.
 * Uses data.ny.gov Socrata API — 471 active adult-use retail dispensaries.
 * Enriches each with a targeted Jina search to find website/email.
 *
 * @param targetCount Number of new leads to import per run (default 20)
 * @param offset Pagination offset for spreading across multiple runs
 */
export async function importNYLicensedLeads(targetCount: number = 20, offset: number = 0): Promise<ResearchedLead[]> {
    logger.info('[ContactResearch] Starting NY API import', { targetCount, offset });

    const db = getAdminFirestore();

    // Fetch from NY State API — active adult-use retail only
    let nyRecords: NYLicenseRecord[] = [];
    try {
        const params = new URLSearchParams({
            '$limit': String(targetCount * 3), // Fetch extra to account for already-imported
            '$offset': String(offset),
            'license_status': 'Active',
            'license_type_code': 'OCMRETL',
            '$order': 'issued_date DESC',
        });
        const res = await fetch(`${NY_LICENSE_API}?${params.toString()}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`NY API responded ${res.status}`);
        nyRecords = await res.json() as NYLicenseRecord[];
    } catch (err) {
        logger.error('[ContactResearch] NY API fetch failed', { error: String(err) });
        return [];
    }

    logger.info('[ContactResearch] NY API records fetched', { count: nyRecords.length });

    const researchedLeads: ResearchedLead[] = [];

    for (const record of nyRecords) {
        if (researchedLeads.length >= targetCount) break;

        const licenseNumber = record.license_number || '';
        const dispensaryName = (record.dba || record.entity_name || '').trim();
        if (!dispensaryName) continue;

        const city = record.city || 'New York';

        // Skip if already imported (by license number)
        if (licenseNumber) {
            const existing = await db.collection('ny_dispensary_leads')
                .where('licenseNumber', '==', licenseNumber)
                .limit(1)
                .get();
            if (!existing.empty) {
                logger.info('[ContactResearch] Skipping existing license', { licenseNumber, dispensaryName });
                continue;
            }
        }

        // Targeted search to find website + email
        let email: string | undefined;
        let websiteUrl: string | undefined;
        let contactFormUrl: string | undefined;
        let phone: string | undefined;

        try {
            const searchQuery = `"${dispensaryName}" ${city} NY cannabis dispensary contact email`;
            const searchResults = await jinaSearch(searchQuery);

            // Find the dispensary's own site (skip directories)
            const skipDomains = ['leafly', 'weedmaps', 'yelp', 'google', 'facebook', 'instagram', 'twitter', 'reddit'];
            const ownSite = searchResults.find(r => {
                try {
                    const domain = new URL(r.url).hostname;
                    return !skipDomains.some(d => domain.includes(d));
                } catch { return false; }
            });

            if (ownSite) {
                websiteUrl = ownSite.url;
                const domain = new URL(ownSite.url).origin;

                // Try to scrape homepage + contact page
                const [pageContent, contactContent] = await Promise.all([
                    jinaReadPage(ownSite.url),
                    jinaReadPage(`${domain}/contact`),
                ]);

                const scrapedContent = [pageContent, contactContent].filter(c => c.length > 50).join('\n\n---\n\n');
                const content = scrapedContent.length >= 100 ? scrapedContent : (ownSite.snippet || '');

                if (content.length >= 20) {
                    const contactInfo = await extractContactInfo(content, dispensaryName, ownSite.url);
                    email = contactInfo.email;
                    phone = contactInfo.phone;
                    contactFormUrl = contactInfo.contactFormUrl || (!contactInfo.email ? `${domain}/contact` : undefined);
                }
            }
        } catch (err) {
            logger.warn('[ContactResearch] Enrichment failed for NY lead', { dispensaryName, error: String(err) });
        }

        const lead: ResearchedLead = {
            dispensaryName,
            contactName: record.primary_contact_name,
            email,
            phone,
            city,
            state: 'NY',
            address: record.address_line_1,
            websiteUrl,
            contactFormUrl,
            licenseNumber,
            licenseType: 'Adult-Use Retail',
            source: 'ny-state-api',
            researchedAt: Date.now(),
            notes: email
                ? `Email found: ${email} | License: ${licenseNumber}`
                : `License: ${licenseNumber} | Contact: ${record.primary_contact_name || 'unknown'}`,
        };

        researchedLeads.push(lead);

        // Rate limit between enrichment calls
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Save to Firestore + sync Drive
    if (researchedLeads.length > 0) {
        await saveResearchedLeads(researchedLeads);
        try {
            await syncToDriverSpreadsheet();
        } catch (err) {
            logger.warn('[ContactResearch] Drive sync failed (non-fatal)', { error: String(err) });
        }
    }

    const withEmail = researchedLeads.filter(l => l.email).length;
    logger.info('[ContactResearch] NY API import complete', {
        total: researchedLeads.length,
        withEmail,
        withForm: researchedLeads.filter(l => l.contactFormUrl).length,
    });

    return researchedLeads;
}

/**
 * Research new NY dispensary leads.
 * Searches for dispensaries, visits their websites, and extracts contact info.
 *
 * @param targetCount Number of new leads to try to find (default 10)
 * @returns Array of successfully researched leads
 */
export async function researchNewLeads(targetCount: number = 10): Promise<ResearchedLead[]> {
    logger.info('[ContactResearch] Starting lead research', { targetCount });

    const searchQueries = [
        'New York cannabis dispensary contact',
        'NYC dispensary email address',
        'NY licensed dispensary website',
        'Brooklyn cannabis dispensary',
        'Queens cannabis dispensary contact',
        'Manhattan dispensary email',
        'Bronx dispensary cannabis',
        'Long Island dispensary contact',
        'Buffalo cannabis dispensary',
        'Rochester NY dispensary',
        'Albany cannabis dispensary contact',
        'Syracuse dispensary cannabis',
    ];

    // Pick a random subset of queries to vary results
    const shuffled = searchQueries.sort(() => Math.random() - 0.5);
    const queriesToRun = shuffled.slice(0, 3);

    const allResults: Array<{ title: string; url: string; snippet?: string }> = [];

    // Step 1: Search for dispensary websites
    for (const query of queriesToRun) {
        try {
            const results = await jinaSearch(query);
            allResults.push(...results.slice(0, 5));
        } catch (err) {
            logger.warn('[ContactResearch] Jina search failed', { query, error: String(err) });
        }
    }

    // Deduplicate by domain
    const seenDomains = new Set<string>();
    const uniqueResults = allResults.filter(r => {
        try {
            const domain = new URL(r.url).hostname.replace('www.', '');
            if (seenDomains.has(domain)) return false;
            // Skip non-dispensary sites
            if (domain.includes('leafly.com') || domain.includes('weedmaps.com') ||
                domain.includes('yelp.com') || domain.includes('google.com') ||
                domain.includes('instagram.com') || domain.includes('facebook.com') ||
                domain.includes('twitter.com') || domain.includes('reddit.com') ||
                domain.includes('bakedbot.ai') || domain.includes('cannmenus.com')) {
                return false;
            }
            seenDomains.add(domain);
            return true;
        } catch {
            return false;
        }
    });

    logger.info('[ContactResearch] Unique dispensary URLs found', {
        total: allResults.length,
        unique: uniqueResults.length,
    });

    // Step 2: Research each dispensary
    const researchedLeads: ResearchedLead[] = [];

    for (const result of uniqueResults.slice(0, targetCount)) {
        try {
            // Skip if already researched
            const alreadyDone = await isAlreadyResearched(result.url).catch(() => false);
            if (alreadyDone) {
                logger.info('[ContactResearch] Skipping already-researched URL', { url: result.url });
                continue;
            }

            // Fetch page content
            const pageContent = await jinaReadPage(result.url);

            // Also try /about and /contact pages
            const domain = new URL(result.url).origin;
            const aboutContent = await jinaReadPage(`${domain}/about`);
            const contactContent = await jinaReadPage(`${domain}/contact`);

            const scrapedContent = [pageContent, aboutContent, contactContent]
                .filter(c => c.length > 50)
                .join('\n\n---\n\n');

            // Fall back to Jina search snippet when scraping fails (site blocks bots)
            const combinedContent = scrapedContent.length >= 100
                ? scrapedContent
                : (result.snippet || '');

            if (combinedContent.length < 20) {
                logger.info('[ContactResearch] Insufficient page content', { url: result.url });
                continue;
            }

            // Extract contact info via Claude
            const contactInfo = await extractContactInfo(combinedContent, result.title, result.url);

            // Fall back to /contact page URL when Claude couldn't find a contact form
            const contactFormUrl = contactInfo.contactFormUrl
                || (!contactInfo.email ? `${domain}/contact` : undefined);

            const lead: ResearchedLead = {
                dispensaryName: result.title.split(' - ')[0].split(' | ')[0].trim(),
                contactName: contactInfo.contactName,
                email: contactInfo.email,
                phone: contactInfo.phone,
                city: contactInfo.city || 'New York',
                state: 'NY',
                address: contactInfo.address,
                websiteUrl: result.url,
                contactFormUrl,
                source: 'jina-research',
                researchedAt: Date.now(),
                notes: contactInfo.email
                    ? `Email found: ${contactInfo.email}`
                    : contactFormUrl
                        ? `Contact form: ${contactFormUrl}`
                        : 'No direct contact info found',
            };

            researchedLeads.push(lead);

            // Rate limit: 1 second between scrapes
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            logger.warn('[ContactResearch] Failed to research URL', {
                url: result.url,
                error: String(err),
            });
        }
    }

    // Step 3: Save to Firestore
    if (researchedLeads.length > 0) {
        await saveResearchedLeads(researchedLeads);

        // Sync to Drive spreadsheet
        try {
            await syncToDriverSpreadsheet();
        } catch (err) {
            logger.warn('[ContactResearch] Drive sync failed (non-fatal)', { error: String(err) });
        }
    }

    const withEmail = researchedLeads.filter(l => l.email).length;
    const withForm = researchedLeads.filter(l => l.contactFormUrl).length;

    logger.info('[ContactResearch] Research complete', {
        total: researchedLeads.length,
        withEmail,
        withForm,
        noContact: researchedLeads.length - withEmail - withForm,
    });

    return researchedLeads;
}
