/**
 * Morning Briefing Cron Endpoint
 *
 * Cloud Scheduler job (manual creation):
 *   Name:     morning-briefing
 *   Schedule: 0 13 * * *  (8 AM EST = 1 PM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/morning-briefing
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Generates an AnalyticsBriefing for every active org and posts it to their
 * dedicated Daily Briefing inbox thread as an `analytics_briefing` artifact.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { postMorningBriefingToInbox, generateMorningBriefing } from '@/server/services/morning-briefing';
import { sendGenericEmail } from '@/lib/email/dispatcher';

export const dynamic = 'force-dynamic';

/**
 * Collect unique orgIds from active dispensary/brand admin AND super_user users.
 * Returns at most 50 distinct orgIds (rate-limit safety).
 */
async function getActiveOrgIds(): Promise<string[]> {
    const db = getAdminFirestore();
    const orgIds = new Set<string>();

    for (const role of ['dispensary_admin', 'brand_admin', 'super_user']) {
        try {
            // super_users don't have a status field — query without it
            const query = role === 'super_user'
                ? db.collection('users').where('role', '==', role).limit(50)
                : db.collection('users').where('role', '==', role).where('status', '==', 'active').limit(50);
            const snap = await query.get();
            for (const doc of snap.docs) {
                const data = doc.data();
                const orgId = data.orgId || data.currentOrgId;
                if (orgId && typeof orgId === 'string') {
                    orgIds.add(orgId);
                }
                // For super users, also check orgMemberships for all their orgs
                if (role === 'super_user' && data.orgMemberships) {
                    for (const memberOrgId of Object.keys(data.orgMemberships)) {
                        orgIds.add(memberOrgId);
                        if (orgIds.size >= 50) break;
                    }
                }
                if (orgIds.size >= 50) break;
            }
        } catch (err) {
            logger.warn('[MorningBriefingCron] Failed to fetch users for role', {
                role,
                error: String(err),
            });
        }
        if (orgIds.size >= 50) break;
    }

    return Array.from(orgIds);
}

/**
 * Collect email addresses for super users who should receive briefing emails.
 */
async function getSuperUserEmails(): Promise<string[]> {
    const db = getAdminFirestore();
    const emails: string[] = [];

    try {
        const snap = await db
            .collection('users')
            .where('role', '==', 'super_user')
            .where('status', '==', 'active')
            .limit(10)
            .get();
        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.email && typeof data.email === 'string') {
                emails.push(data.email);
            }
        }
    } catch (err) {
        logger.warn('[MorningBriefingCron] Failed to fetch super user emails', {
            error: String(err),
        });
    }

    return emails;
}

/**
 * Process orgs in batches of 10 using Promise.allSettled.
 */
async function processBatch(orgIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < orgIds.length; i += 10) {
        const batch = orgIds.slice(i, i + 10);
        const results = await Promise.allSettled(
            batch.map(orgId => postMorningBriefingToInbox(orgId))
        );
        results.forEach((result, idx) => {
            const orgId = batch[idx];
            if (result.status === 'fulfilled') {
                success.push(orgId);
            } else {
                failed.push(orgId);
                logger.error('[MorningBriefingCron] Failed for org', {
                    orgId,
                    error: String(result.reason),
                });
            }
        });
    }

    return { success, failed };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'morning-briefing');
    if (authError) return authError;

    logger.info('[MorningBriefingCron] Starting morning briefing job');

    try {
        const orgIds = await getActiveOrgIds();
        logger.info('[MorningBriefingCron] Processing orgs', { count: orgIds.length });

        if (orgIds.length === 0) {
            return NextResponse.json({
                success: true,
                orgsProcessed: 0,
                errors: [],
                message: 'No active orgs found',
            });
        }

        const { success, failed } = await processBatch(orgIds);

        // Send email summary to super users (non-blocking)
        try {
            const superUserEmails = await getSuperUserEmails();
            if (superUserEmails.length > 0 && success.length > 0) {
                // Generate a summary briefing from the first successful org for the email
                const sampleBriefing = await generateMorningBriefing(success[0]);
                const metricsHtml = sampleBriefing.metrics
                    .map(m => {
                        const trendIcon = m.trend === 'up' ? '&#9650;' : m.trend === 'down' ? '&#9660;' : '&#8212;';
                        const statusColor = m.status === 'critical' ? '#dc2626' : m.status === 'warning' ? '#f59e0b' : '#16a34a';
                        return `<tr>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${m.title}</td>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:${statusColor}">${m.value}</td>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${trendIcon} ${m.vsLabel || ''}</td>
                        </tr>`;
                    })
                    .join('');

                const newsHtml = sampleBriefing.newsItems.length > 0
                    ? sampleBriefing.newsItems.map(n =>
                        `<li><a href="${n.url}" style="color:#2563eb;">${n.headline}</a> — ${n.source}</li>`
                    ).join('')
                    : '<li>No cannabis news today</li>';

                const htmlBody = `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                        <h2 style="color:#16a34a;">&#128202; ${sampleBriefing.dayOfWeek}'s Briefing</h2>
                        ${sampleBriefing.topAlert ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin-bottom:16px;border-radius:4px;">${sampleBriefing.topAlert}</div>` : ''}
                        <p style="color:#6b7280;font-size:14px;">Market: ${sampleBriefing.marketContext} | Orgs processed: ${success.length}</p>
                        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                            <thead><tr style="background:#f3f4f6;">
                                <th style="padding:8px;text-align:left;">Metric</th>
                                <th style="padding:8px;text-align:left;">Value</th>
                                <th style="padding:8px;text-align:left;">Trend</th>
                            </tr></thead>
                            <tbody>${metricsHtml}</tbody>
                        </table>
                        <h3 style="color:#374151;">Industry News</h3>
                        <ul style="padding-left:20px;">${newsHtml}</ul>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                        <p style="color:#9ca3af;font-size:12px;">
                            <a href="https://bakedbot.ai/dashboard/ceo?tab=ny-pilot" style="color:#2563eb;">View NY10 Pilot Dashboard</a> |
                            <a href="https://bakedbot.ai/dashboard/inbox" style="color:#2563eb;">Open Inbox</a>
                        </p>
                    </div>
                `;

                for (const email of superUserEmails) {
                    sendGenericEmail({
                        to: email,
                        subject: `${sampleBriefing.dayOfWeek}'s Briefing — ${sampleBriefing.urgencyLevel === 'clean' ? 'All Clear' : sampleBriefing.urgencyLevel.toUpperCase()}`,
                        htmlBody,
                        fromName: 'BakedBot Daily Briefing',
                        communicationType: 'transactional',
                        agentName: 'pops',
                    }).catch(err => {
                        logger.warn('[MorningBriefingCron] Failed to send email', {
                            email,
                            error: String(err),
                        });
                    });
                }

                logger.info('[MorningBriefingCron] Sent email briefings', {
                    recipients: superUserEmails.length,
                });
            }
        } catch (emailErr) {
            logger.warn('[MorningBriefingCron] Email delivery failed (non-fatal)', {
                error: String(emailErr),
            });
        }

        logger.info('[MorningBriefingCron] Completed', {
            orgsProcessed: success.length,
            failed: failed.length,
        });

        return NextResponse.json({
            success: true,
            orgsProcessed: success.length,
            errors: failed,
        });
    } catch (error) {
        logger.error('[MorningBriefingCron] Unexpected error', { error: String(error) });
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
