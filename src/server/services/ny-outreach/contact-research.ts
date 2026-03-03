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
    if (!pageContent || pageContent.length < 50) return {};

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

    const allResults: Array<{ title: string; url: string; description?: string }> = [];

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

            const combinedContent = [pageContent, aboutContent, contactContent]
                .filter(c => c.length > 50)
                .join('\n\n---\n\n');

            if (combinedContent.length < 100) {
                logger.info('[ContactResearch] Insufficient page content', { url: result.url });
                continue;
            }

            // Extract contact info via Claude
            const contactInfo = await extractContactInfo(combinedContent, result.title, result.url);

            const lead: ResearchedLead = {
                dispensaryName: result.title.split(' - ')[0].split(' | ')[0].trim(),
                contactName: contactInfo.contactName,
                email: contactInfo.email,
                phone: contactInfo.phone,
                city: contactInfo.city || 'New York',
                state: 'NY',
                address: contactInfo.address,
                websiteUrl: result.url,
                contactFormUrl: contactInfo.contactFormUrl,
                source: 'jina-research',
                researchedAt: Date.now(),
                notes: contactInfo.email
                    ? `Email found: ${contactInfo.email}`
                    : contactInfo.contactFormUrl
                        ? `Contact form: ${contactInfo.contactFormUrl}`
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
