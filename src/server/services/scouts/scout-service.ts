'use server';

/**
 * Scouts Service - Automated Competitive Monitoring
 * 
 * Adapted from Firecrawl Open-Scouts pattern for Firebase.
 * Provides scheduled web monitoring with multi-channel notifications.
 * 
 * Features:
 * - Create monitoring scouts with custom queries
 * - Run on schedule (hourly, daily, weekly)
 * - Multi-channel alerts: Email, In-App, Push, SMS
 * - AI summaries of findings
 */

import { createServerClient } from '@/firebase/server-client';
import { discovery } from '@/server/services/firecrawl';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Scout {
    id: string;
    tenantId: string;
    userId: string;

    // What to monitor
    query: string;
    targetUrls?: string[]; // Optional specific URLs to watch

    // Schedule
    frequency: 'hourly' | 'daily' | 'weekly';
    lastRunAt?: Date;
    nextRunAt: Date;

    // Notifications
    notifications: {
        email: boolean;
        inApp: boolean;
        push: boolean;
        sms: boolean;
    };
    notifyEmail?: string;
    notifyPhone?: string;

    // Status
    status: 'active' | 'paused' | 'error';
    lastError?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

export interface ScoutResult {
    id: string;
    scoutId: string;
    tenantId: string;

    query: string;
    resultCount: number;
    results: Array<{
        title: string;
        url: string;
        snippet: string;
    }>;

    // AI Summary
    summary: string;
    isNew: boolean; // True if different from last run

    executedAt: Date;
}

// ============================================================================
// SCOUT CRUD
// ============================================================================

export async function createScout(
    tenantId: string,
    userId: string,
    query: string,
    options: {
        frequency?: 'hourly' | 'daily' | 'weekly';
        targetUrls?: string[];
        notifications?: Partial<Scout['notifications']>;
        notifyEmail?: string;
        notifyPhone?: string;
    } = {}
): Promise<Scout> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const frequency = options.frequency || 'daily';

    // Calculate next run
    const nextRunAt = calculateNextRun(frequency);

    const scout: Omit<Scout, 'id'> = {
        tenantId,
        userId,
        query,
        targetUrls: options.targetUrls,
        frequency,
        nextRunAt,
        notifications: {
            email: options.notifications?.email ?? true,
            inApp: options.notifications?.inApp ?? true,
            push: options.notifications?.push ?? false,
            sms: options.notifications?.sms ?? false,
        },
        notifyEmail: options.notifyEmail,
        notifyPhone: options.notifyPhone,
        status: 'active',
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await firestore.collection(`tenants/${tenantId}/scouts`).add(scout);

    logger.info(`[Scouts] Created scout ${docRef.id} for query: ${query}`);

    return { id: docRef.id, ...scout };
}

export async function getScouts(tenantId: string, userId?: string): Promise<Scout[]> {
    const { firestore } = await createServerClient();

    let query = firestore.collection(`tenants/${tenantId}/scouts`);

    if (userId) {
        query = query.where('userId', '==', userId) as any;
    }

    const snap = await query.orderBy('createdAt', 'desc').get();

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        nextRunAt: doc.data().nextRunAt?.toDate?.() || new Date(),
        lastRunAt: doc.data().lastRunAt?.toDate?.(),
    } as Scout));
}

export async function deleteScout(tenantId: string, scoutId: string): Promise<void> {
    const { firestore } = await createServerClient();
    await firestore.doc(`tenants/${tenantId}/scouts/${scoutId}`).delete();
}

// ============================================================================
// SCOUT EXECUTION
// ============================================================================

export async function runScout(scout: Scout): Promise<ScoutResult> {
    const { firestore } = await createServerClient();
    const now = new Date();

    logger.info(`[Scouts] Running scout ${scout.id}: ${scout.query}`);

    try {
        // 1. Execute search
        let results: any[] = [];

        if (scout.targetUrls && scout.targetUrls.length > 0) {
            // Scrape specific URLs
            for (const url of scout.targetUrls.slice(0, 5)) {
                try {
                    const scraped = await discovery.discoverUrl(url, ['markdown']);
                    results.push({
                        title: url,
                        url,
                        snippet: scraped.markdown?.substring(0, 200) || ''
                    });
                } catch (e: any) {
                    logger.warn(`[Scouts] Failed to scrape ${url}`);
                }
            }
        } else {
            // Web search
            const searchResults = await discovery.search(scout.query);
            results = (searchResults || []).slice(0, 5).map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.description || r.snippet || ''
            }));
        }

        // 2. Generate AI Summary
        const summary = await generateSummary(scout.query, results);

        // 3. Check if results are new (compare to last result)
        const lastResultSnap = await firestore
            .collection(`tenants/${scout.tenantId}/scout_results`)
            .where('scoutId', '==', scout.id)
            .orderBy('executedAt', 'desc')
            .limit(1)
            .get();

        const lastResult = lastResultSnap.empty ? null : lastResultSnap.docs[0].data();
        const isNew = !lastResult || hasNewResults(lastResult.results, results);

        // 4. Save result
        const scoutResult: Omit<ScoutResult, 'id'> = {
            scoutId: scout.id,
            tenantId: scout.tenantId,
            query: scout.query,
            resultCount: results.length,
            results,
            summary,
            isNew,
            executedAt: now,
        };

        const resultRef = await firestore
            .collection(`tenants/${scout.tenantId}/scout_results`)
            .add(scoutResult);

        // 5. Update scout status
        await firestore.doc(`tenants/${scout.tenantId}/scouts/${scout.id}`).update({
            lastRunAt: now,
            nextRunAt: calculateNextRun(scout.frequency),
            status: 'active',
            lastError: null,
            updatedAt: now,
        });

        // 6. Send notifications if new results
        if (isNew && results.length > 0) {
            await sendScoutNotifications(scout, scoutResult);
        }

        logger.info(`[Scouts] Scout ${scout.id} completed. Found ${results.length} results. New: ${isNew}`);

        return { id: resultRef.id, ...scoutResult };

    } catch (error: any) {
        logger.error(`[Scouts] Scout ${scout.id} failed:`, error);

        // Update error status
        await firestore.doc(`tenants/${scout.tenantId}/scouts/${scout.id}`).update({
            status: 'error',
            lastError: error.message,
            updatedAt: now,
        });

        throw error;
    }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function sendScoutNotifications(
    scout: Scout,
    result: Omit<ScoutResult, 'id'>
): Promise<void> {
    const { firestore } = await createServerClient();

    // 1. In-App Notification (always)
    if (scout.notifications.inApp) {
        await firestore.collection(`tenants/${scout.tenantId}/notifications`).add({
            userId: scout.userId,
            type: 'scout_alert',
            title: `Scout Found Results: ${scout.query}`,
            body: result.summary,
            data: { scoutId: scout.id },
            read: false,
            createdAt: new Date(),
        });
    }

    // 2. Email
    if (scout.notifications.email && scout.notifyEmail) {
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        await sendGenericEmail({
            to: scout.notifyEmail,
            subject: `🔍 Scout Alert: ${scout.query}`,
            htmlBody: `
                <h2>Your Scout Found New Results</h2>
                <p><strong>Query:</strong> ${scout.query}</p>
                <p><strong>Summary:</strong> ${result.summary}</p>
                <h3>Results (${result.resultCount})</h3>
                <ul>
                    ${result.results.map(r => `<li><a href="${r.url}">${r.title}</a></li>`).join('')}
                </ul>
            `,
            textBody: `Scout Alert: ${scout.query}\n\n${result.summary}`,
            fromName: 'BakedBot Scouts',
        });
    }

    // 3. SMS (if configured)
    if (scout.notifications.sms && scout.notifyPhone) {
        try {
            const { twilioService } = await import('@/server/services/twilio');
            await twilioService.sendSms(
                scout.notifyPhone,
                `🔍 Scout Alert: ${scout.query}\n${result.summary.substring(0, 100)}...`
            );
        } catch (e) {
            logger.warn('[Scouts] SMS notification failed:', { error: e instanceof Error ? e.message : String(e) });
        }
    }

    // 4. Push Notification (if user has FCM token)
    if (scout.notifications.push) {
        try {
            const { sendPushNotification } = await import('@/server/services/push');
            await sendPushNotification(scout.userId, {
                title: `Scout: ${scout.query}`,
                body: result.summary,
                data: { scoutId: scout.id },
            });
        } catch (e) {
            logger.warn('[Scouts] Push notification failed:', { error: e instanceof Error ? e.message : String(e) });
        }
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateNextRun(frequency: 'hourly' | 'daily' | 'weekly'): Date {
    const now = new Date();
    switch (frequency) {
        case 'hourly':
            return new Date(now.getTime() + 60 * 60 * 1000);
        case 'daily':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
}

function hasNewResults(oldResults: any[], newResults: any[]): boolean {
    if (!oldResults || oldResults.length === 0) return true;
    if (newResults.length !== oldResults.length) return true;

    // Check if any URLs are different
    const oldUrls = new Set(oldResults.map(r => r.url));
    return newResults.some(r => !oldUrls.has(r.url));
}

async function generateSummary(query: string, results: any[]): Promise<string> {
    if (results.length === 0) {
        return 'No results found for this query.';
    }

    try {
        const { ai } = await import('@/ai/genkit');
        const response = await ai.generate({
            prompt: `Summarize these search results for the query "${query}" in one concise sentence:\n\n${results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`,
        });
        return response.text || `Found ${results.length} results for "${query}".`;
    } catch (e: any) {
        return `Found ${results.length} results for "${query}".`;
    }
}

// ============================================================================
// DISPATCHER (Called by Cloud Scheduler)
// ============================================================================

export async function dispatchDueScouts(): Promise<{ dispatched: number }> {
    const { firestore } = await createServerClient();
    const now = new Date();

    // Find all tenants with active scouts due to run
    // Note: In production, this should be optimized with a collection group query
    const tenantsSnap = await firestore.collection('tenants').get();

    let dispatched = 0;

    for (const tenantDoc of tenantsSnap.docs) {
        const scoutsSnap = await firestore
            .collection(`tenants/${tenantDoc.id}/scouts`)
            .where('status', '==', 'active')
            .where('nextRunAt', '<=', now)
            .get();

        for (const scoutDoc of scoutsSnap.docs) {
            const scout = { id: scoutDoc.id, ...scoutDoc.data() } as Scout;

            try {
                await runScout(scout);
                dispatched++;
            } catch (e) {
                logger.error(`[Scouts] Dispatch failed for ${scout.id}:`, { error: e instanceof Error ? e.message : String(e) });
            }
        }
    }

    logger.info(`[Scouts] Dispatcher completed. Ran ${dispatched} scouts.`);
    return { dispatched };
}
