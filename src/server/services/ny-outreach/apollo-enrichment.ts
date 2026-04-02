/**
 * Apollo.io Contact Enrichment Service
 *
 * Finds emails for NY dispensary leads using Apollo's people/organization APIs.
 * Free tier: 195 credits/month (Mar 03 – Apr 03, 2026).
 * Credits are spent when Apollo reveals a verified email.
 * Work emails are returned for free — only personal/mobile cost credits.
 *
 * Credit tracking: Firestore `system_config/apollo_credits`
 * Strategy:
 *   1. People search by organization name + city (free — no credit spend)
 *   2. Extract any free work emails from response (e.g. owner@dispensary.com)
 *   3. Track all API calls and email hits in Firestore
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

const APOLLO_BASE = 'https://api.apollo.io/v1';

// Firestore document that tracks Apollo credit usage
const CREDITS_DOC_PATH = 'system_config/apollo_credits';

// Cycle info (free tier resets monthly ~31 days after account creation date)
const CYCLE_DURATION_MS = 31 * 24 * 60 * 60 * 1000; // 31 days
const CYCLE_START = new Date('2026-04-04T00:45:00Z').getTime(); // Updated: new cycle start
const CYCLE_END = new Date('2026-05-05T00:45:00Z').getTime();   // Updated: new cycle end
const MONTHLY_LIMIT = 195;

// =============================================================================
// Types
// =============================================================================

export interface ApolloContact {
    firstName?: string;
    lastName?: string;
    name?: string;
    title?: string;
    email?: string;
    emailStatus?: string; // 'verified' | 'likely to engage' | 'unavailable' etc.
    linkedinUrl?: string;
    organizationName?: string;
    city?: string;
    state?: string;
}

export interface ApolloEnrichResult {
    email?: string;
    contactName?: string;
    title?: string;
    linkedinUrl?: string;
    source: 'apollo_people_search' | 'apollo_org_search' | 'not_found';
    creditSpent: boolean;
}

export interface ApolloCreditStatus {
    used: number;
    limit: number;
    remaining: number;
    cycleStart: number;
    cycleEnd: number;
    lastUpdated: number;
    percentUsed: number;
}

// =============================================================================
// Credit Tracking
// =============================================================================

/**
 * Read current Apollo credit usage from Firestore.
 */
export async function getApolloCreditStatus(): Promise<ApolloCreditStatus> {
    try {
        const db = getAdminFirestore();
        const doc = await db.doc(CREDITS_DOC_PATH).get();

        if (!doc.exists) {
            // First call — initialize the doc
            const initial: ApolloCreditStatus = {
                used: 0,
                limit: MONTHLY_LIMIT,
                remaining: MONTHLY_LIMIT,
                cycleStart: CYCLE_START,
                cycleEnd: CYCLE_END,
                lastUpdated: Date.now(),
                percentUsed: 0,
            };
            await db.doc(CREDITS_DOC_PATH).set(initial);
            return initial;
        }

        const data = doc.data()!;
        const now = Date.now();
        const storedCycleEnd = data.cycleEnd ?? CYCLE_END;
        const limit = data.limit ?? MONTHLY_LIMIT;

        // Auto-reset: if we're past cycle end, advance to new cycle
        if (now > storedCycleEnd) {
            const newCycleStart = storedCycleEnd;
            const newCycleEnd = storedCycleEnd + CYCLE_DURATION_MS;
            const reset = { used: 0, limit, cycleStart: newCycleStart, cycleEnd: newCycleEnd, lastUpdated: now };
            await doc.ref.set(reset);
            logger.info('[Apollo] Monthly cycle reset', { newCycleEnd: new Date(newCycleEnd).toISOString() });
            return { used: 0, limit, remaining: limit, cycleStart: newCycleStart, cycleEnd: newCycleEnd, lastUpdated: now, percentUsed: 0 };
        }

        const used = data.used ?? 0;
        return {
            used,
            limit,
            remaining: Math.max(0, limit - used),
            cycleStart: data.cycleStart ?? CYCLE_START,
            cycleEnd: storedCycleEnd,
            lastUpdated: data.lastUpdated ?? now,
            percentUsed: Math.round((used / limit) * 100),
        };
    } catch (err) {
        logger.error('[Apollo] Failed to read credit status', { error: String(err) });
        // Return a safe default — don't block enrichment
        return {
            used: 0,
            limit: MONTHLY_LIMIT,
            remaining: MONTHLY_LIMIT,
            cycleStart: CYCLE_START,
            cycleEnd: CYCLE_END,
            lastUpdated: Date.now(),
            percentUsed: 0,
        };
    }
}

/**
 * Increment the credit usage counter in Firestore.
 * Called after a successful email reveal (1 credit per email).
 */
async function incrementCreditUsage(count: number = 1): Promise<void> {
    try {
        const db = getAdminFirestore();
        const ref = db.doc(CREDITS_DOC_PATH);
        const doc = await ref.get();

        if (!doc.exists) {
            await ref.set({
                used: count,
                limit: MONTHLY_LIMIT,
                cycleStart: CYCLE_START,
                cycleEnd: CYCLE_END,
                lastUpdated: Date.now(),
            });
        } else {
            const current = (doc.data()?.used ?? 0) + count;
            await ref.update({ used: current, lastUpdated: Date.now() });
        }

        logger.info('[Apollo] Credit usage incremented', { count, newTotal: (doc.data()?.used ?? 0) + count });
    } catch (err) {
        logger.error('[Apollo] Failed to increment credit usage', { error: String(err) });
    }
}

/**
 * Log an Apollo API call to Firestore for audit trail.
 */
async function logApolloCall(params: {
    dispensaryName: string;
    endpoint: string;
    emailFound: boolean;
    creditSpent: boolean;
    email?: string;
}): Promise<void> {
    try {
        const db = getAdminFirestore();
        await db.collection('apollo_usage_log').add({
            ...params,
            timestamp: Date.now(),
        });
    } catch {
        // Non-blocking
    }
}

// =============================================================================
// Apollo API Calls
// =============================================================================

/**
 * Search for people at a dispensary by organization name + location.
 * Free call — Apollo returns basic contact info including work emails without spending credits.
 * Work emails (e.g. owner@greens.com) are visible for free.
 * Personal/mobile emails require credits; we skip those to conserve the 195/mo budget.
 */
export async function apolloSearchPeople(
    dispensaryName: string,
    city: string,
    state: string = 'NY',
    contactName?: string
): Promise<ApolloEnrichResult> {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
        logger.warn('[Apollo] APOLLO_API_KEY not set — skipping enrichment');
        return { source: 'not_found', creditSpent: false };
    }

    // Check credits before spending
    const credits = await getApolloCreditStatus();
    if (credits.remaining <= 5) {
        logger.warn('[Apollo] Credit limit nearly exhausted — skipping', { remaining: credits.remaining });
        return { source: 'not_found', creditSpent: false };
    }

    try {
        // Build search payload — api_key goes in X-Api-Key header (body key deprecated Apr 2026)
        const payload: Record<string, unknown> = {
            q_organization_name: dispensaryName,
            person_locations: [`${city}, ${state}, United States`],
            person_titles: ['owner', 'co-owner', 'ceo', 'president', 'general manager', 'manager', 'director', 'operations'],
            contact_email_status: ['verified', 'likely to engage'],
            per_page: 5,
            page: 1,
        };

        // If we have a contact name from NY OCM, add it to narrow the search
        if (contactName) {
            const parts = contactName.trim().split(' ');
            if (parts.length >= 2) {
                payload.first_name = parts[0];
                payload.last_name = parts.slice(1).join(' ');
            }
        }

        const response = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json',
                'X-Api-Key': apiKey,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            logger.warn('[Apollo] People search failed', {
                dispensaryName,
                status: response.status,
                error: errorText.slice(0, 200),
            });
            return { source: 'not_found', creditSpent: false };
        }

        const data = await response.json() as {
            people?: Array<{
                first_name?: string;
                last_name?: string;
                name?: string;
                title?: string;
                email?: string;
                email_status?: string;
                linkedin_url?: string;
            }>;
            contacts?: Array<{
                first_name?: string;
                last_name?: string;
                name?: string;
                title?: string;
                email?: string;
                email_status?: string;
                linkedin_url?: string;
            }>;
        };

        const people = data.people ?? data.contacts ?? [];

        if (people.length === 0) {
            await logApolloCall({ dispensaryName, endpoint: 'mixed_people/search', emailFound: false, creditSpent: false });
            return { source: 'not_found', creditSpent: false };
        }

        // Find the best contact — prefer verified email + owner/manager title
        const withEmail = people.filter(p => !!p.email);
        const best = withEmail[0] ?? people[0];

        const email = best.email;
        const emailStatus = best.email_status ?? '';
        // Apollo charges credits for revealed personal emails — work emails are shown freely
        // We treat 'verified' status emails as potentially credit-costing; track conservatively
        const creditSpent = !!email && ['verified', 'likely to engage'].includes(emailStatus);

        if (creditSpent) {
            await incrementCreditUsage(1);
        }

        await logApolloCall({
            dispensaryName,
            endpoint: 'mixed_people/search',
            emailFound: !!email,
            creditSpent,
            email,
        });

        return {
            email,
            contactName: best.name ?? ([best.first_name, best.last_name].filter(Boolean).join(' ') || undefined),
            title: best.title,
            linkedinUrl: best.linkedin_url,
            source: 'apollo_people_search',
            creditSpent,
        };
    } catch (err) {
        logger.warn('[Apollo] People search error', { dispensaryName, error: String(err) });
        return { source: 'not_found', creditSpent: false };
    }
}

/**
 * Enrich a dispensary by domain (if website URL is known).
 * Uses Apollo organization enrichment to find company email pattern + contacts.
 * More accurate than name search when domain is available.
 */
export async function apolloEnrichByDomain(
    domain: string,
    dispensaryName: string,
    city: string = '',
    state: string = 'NY'
): Promise<ApolloEnrichResult> {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) return { source: 'not_found', creditSpent: false };

    const credits = await getApolloCreditStatus();
    if (credits.remaining <= 5) {
        return { source: 'not_found', creditSpent: false };
    }

    try {
        // Extract clean domain from URL
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

        const payload = {
            domain: cleanDomain,
            reveal_personal_emails: false, // Don't spend credits on personal emails
        };

        const response = await fetch(`${APOLLO_BASE}/organizations/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Api-Key': apiKey },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            return { source: 'not_found', creditSpent: false };
        }

        const data = await response.json() as {
            organization?: {
                primary_phone?: { number?: string };
                sanitized_phone?: string;
                linkedin_url?: string;
            };
        };

        // Organization enrich doesn't give contacts directly — just company meta
        // Useful for phone + linkedin but not email
        if (!data.organization) {
            await logApolloCall({ dispensaryName, endpoint: 'organizations/enrich', emailFound: false, creditSpent: false });
            return { source: 'not_found', creditSpent: false };
        }

        // If org found, do a follow-up people search with the confirmed domain
        return await apolloSearchPeople(dispensaryName, city, state);
    } catch (err) {
        logger.warn('[Apollo] Domain enrich error', { domain, error: String(err) });
        return { source: 'not_found', creditSpent: false };
    }
}
