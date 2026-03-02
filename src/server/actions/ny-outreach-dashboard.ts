'use server';

/**
 * Server actions for the CEO Outreach Dashboard tab.
 * All actions gated by super_user role.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getOutreachStats, sendTestOutreachBatch } from '@/server/services/ny-outreach/outreach-service';
import { researchNewLeads } from '@/server/services/ny-outreach/contact-research';
import { logger } from '@/lib/logger';

const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '5', 10);

/**
 * Load all dashboard data in a single call.
 */
export async function getOutreachDashboardData(): Promise<{
    success: boolean;
    data?: {
        stats: Awaited<ReturnType<typeof getOutreachStats>>;
        queueDepth: number;
        queueLeads: Array<{
            id: string;
            dispensaryName: string;
            email?: string;
            city: string;
            contactFormUrl?: string;
            source: string;
            createdAt: number;
        }>;
        crmContacts: Array<{
            id: string;
            dispensaryName: string;
            email: string;
            contactName?: string;
            city: string;
            status: string;
            outreachCount: number;
            lastOutreachAt: number;
            lastTemplateId: string;
        }>;
        dailyLimit: number;
        sentToday: number;
    };
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();

        // Fetch all data in parallel
        const [stats, queueSnap, leadsSnap, crmSnap, todaySentSnap] = await Promise.all([
            getOutreachStats(Date.now() - 24 * 60 * 60 * 1000),
            // Queue count
            db.collection('ny_dispensary_leads')
                .where('status', '==', 'researched')
                .where('outreachSent', '==', false)
                .count()
                .get(),
            // Queue leads (preview, max 20)
            db.collection('ny_dispensary_leads')
                .where('status', '==', 'researched')
                .where('outreachSent', '==', false)
                .orderBy('createdAt', 'asc')
                .limit(20)
                .get(),
            // CRM contacts (most recent 50)
            db.collection('crm_outreach_contacts')
                .orderBy('lastOutreachAt', 'desc')
                .limit(50)
                .get(),
            // Today's sent count
            (() => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                return db.collection('ny_outreach_log')
                    .where('timestamp', '>=', todayStart.getTime())
                    .where('emailSent', '==', true)
                    .count()
                    .get();
            })(),
        ]);

        const queueLeads = leadsSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                email: d.email || undefined,
                city: d.city || 'NY',
                contactFormUrl: d.contactFormUrl || undefined,
                source: d.source || 'research',
                createdAt: d.createdAt || d.researchedAt || Date.now(),
            };
        });

        const crmContacts = crmSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                email: d.email || '',
                contactName: d.contactName || undefined,
                city: d.city || 'NY',
                status: d.status || 'unknown',
                outreachCount: d.outreachCount || 0,
                lastOutreachAt: d.lastOutreachAt || 0,
                lastTemplateId: d.lastTemplateId || '',
            };
        });

        return {
            success: true,
            data: {
                stats,
                queueDepth: queueSnap.data().count,
                queueLeads,
                crmContacts,
                dailyLimit: DAILY_SEND_LIMIT,
                sentToday: todaySentSnap.data().count,
            },
        };
    } catch (err) {
        logger.error('[OutreachDashboard] Failed to load data', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Manually trigger the daily outreach pipeline.
 */
export async function triggerOutreachRun(): Promise<{
    success: boolean;
    summary?: {
        emailsSent: number;
        emailsFailed: number;
        newLeadsResearched: number;
    };
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        // Call the outreach runner endpoint internally
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return { success: false, error: 'CRON_SECRET not configured' };
        }

        const response = await fetch(`${baseUrl}/api/cron/ny-outreach-runner`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                summary: {
                    emailsSent: result.summary?.emailsSent || 0,
                    emailsFailed: result.summary?.emailsFailed || 0,
                    newLeadsResearched: result.summary?.newLeadsResearched || 0,
                },
            };
        }

        return { success: false, error: result.error || 'Outreach run failed' };
    } catch (err) {
        logger.error('[OutreachDashboard] Trigger outreach failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Send test batch of all 10 templates to internal recipients.
 */
export async function triggerTestBatch(): Promise<{
    success: boolean;
    count?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const recipients = ['martez@bakedbot.ai', 'jack@bakedbot.ai'];
        const results = await sendTestOutreachBatch(recipients);
        const sentCount = results.filter(r => r.emailSent).length;

        return {
            success: true,
            count: sentCount,
        };
    } catch (err) {
        logger.error('[OutreachDashboard] Test batch failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Trigger contact research to discover new dispensary leads.
 */
export async function triggerContactResearch(): Promise<{
    success: boolean;
    leadsFound?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const leads = await researchNewLeads(10);

        return {
            success: true,
            leadsFound: leads.length,
        };
    } catch (err) {
        logger.error('[OutreachDashboard] Contact research failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}
