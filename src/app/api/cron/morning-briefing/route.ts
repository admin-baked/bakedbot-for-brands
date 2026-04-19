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
import { BAKEDBOT_OPERATOR_SENDER_NAME } from '@/lib/email/sender-branding';
import type { AnalyticsBriefing } from '@/types/inbox';

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
                // result.reason can be an Error object or string; handle both
                const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
                failed.push(errorMsg);
                logger.error('[MorningBriefingCron] Failed for org', {
                    orgId,
                    error: errorMsg,
                });
            }
        });
    }

    return { success, failed };
}

function buildMorningBriefingEmail(briefing: AnalyticsBriefing, orgsProcessed: number): string {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

    const headerBg = briefing.urgencyLevel === 'critical' ? '#dc2626'
        : briefing.urgencyLevel === 'warning' ? '#d97706'
        : '#059669';

    const alertHtml = briefing.topAlert
        ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;margin-bottom:20px;border-radius:0 6px 6px 0;font-size:14px;color:#92400e;">
            <strong>⚠️ Alert:</strong> ${briefing.topAlert}
           </div>`
        : '';

    const criticalMetrics = briefing.metrics.filter(m => m.status === 'critical' || m.status === 'warning');
    const healthyMetrics = briefing.metrics.filter(m => m.status !== 'critical' && m.status !== 'warning');

    const metricCard = (m: (typeof briefing.metrics)[0]) => {
        const statusColor = m.status === 'critical' ? '#dc2626' : m.status === 'warning' ? '#d97706' : '#059669';
        const trendIcon = m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '—';
        const trendColor = m.trend === 'up' ? '#059669' : m.trend === 'down' ? '#dc2626' : '#6b7280';
        return `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${m.title}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;color:${statusColor};font-size:14px;">${m.value}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:${trendColor};">${trendIcon} ${m.vsLabel ?? ''}</td>
            ${m.actionable ? `<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#7c3aed;">${m.actionable}</td>` : '<td style="border-bottom:1px solid #f3f4f6;"></td>'}
        </tr>`;
    };

    const criticalSectionHtml = criticalMetrics.length > 0
        ? `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;">🚨 Needs Attention</h3>
           <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #fee2e2;margin-bottom:16px;">
               <thead><tr style="background:#fef2f2;">
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Metric</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Value</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">vs Prior</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Action</th>
               </tr></thead>
               <tbody>${criticalMetrics.map(metricCard).join('')}</tbody>
           </table>`
        : '';

    const healthySectionHtml = healthyMetrics.length > 0
        ? `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">📊 Platform Metrics</h3>
           <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:16px;">
               <thead><tr style="background:#f9fafb;">
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Metric</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Value</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">vs Prior</th>
                   <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Action</th>
               </tr></thead>
               <tbody>${healthyMetrics.map(metricCard).join('')}</tbody>
           </table>`
        : '';

    const meetingsHtml = briefing.meetings && briefing.meetings.length > 0
        ? `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">📅 Today's Schedule</h3>
           <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
               ${briefing.meetings.map(m => `
               <div style="padding:10px 16px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;">
                   <span style="font-size:13px;font-weight:600;color:#111827;min-width:80px;">${m.startTime}</span>
                   <span style="font-size:13px;color:#374151;margin-left:12px;">${m.title}</span>
               </div>`).join('')}
           </div>`
        : '';

    const emailDigestHtml = briefing.emailDigest && briefing.emailDigest.unreadCount > 0
        ? `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">📬 Inbox (${briefing.emailDigest.unreadCount} unread)</h3>
           <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
               ${briefing.emailDigest.topEmails.map(e => `
               <div style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">
                   <div style="font-size:13px;font-weight:600;color:#111827;">${e.from}</div>
                   <div style="font-size:12px;color:#6b7280;margin-top:2px;">${e.subject}</div>
               </div>`).join('')}
           </div>`
        : '';

    const newsHtml = briefing.newsItems.length > 0
        ? `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">🌿 Cannabis Industry</h3>
           <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
               ${briefing.newsItems.map(n => `
               <div style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">
                   ${n.url
                    ? `<a href="${n.url}" style="font-size:13px;font-weight:500;color:#2563eb;text-decoration:none;">${n.headline}</a>`
                    : `<span style="font-size:13px;font-weight:500;color:#111827;">${n.headline}</span>`
                   }
                   <span style="font-size:12px;color:#9ca3af;margin-left:8px;">— ${n.source}</span>
               </div>`).join('')}
           </div>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:${headerBg};padding:20px 24px;border-radius:8px 8px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#fff;font-size:18px;font-weight:700;">BakedBot Morning Report</span></td>
        <td align="right"><span style="color:rgba(255,255,255,.75);font-size:13px;">${timeStr} ET · ${dateStr}</span></td>
      </tr>
      <tr><td colspan="2" style="padding-top:4px;">
        <span style="color:rgba(255,255,255,.85);font-size:13px;">${briefing.marketContext} · ${orgsProcessed} org${orgsProcessed !== 1 ? 's' : ''} updated</span>
      </td></tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    ${alertHtml}
    ${criticalSectionHtml}
    ${healthySectionHtml}
    ${meetingsHtml}
    ${emailDigestHtml}
    ${newsHtml}

    <!-- CTA -->
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
      <a href="https://bakedbot.ai/dashboard/inbox" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-right:12px;display:inline-block;">Open Inbox</a>
      <a href="https://bakedbot.ai/dashboard/ceo" style="background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">CEO Dashboard</a>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#9ca3af;">BakedBot AI · Automated morning report via AWS SES</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
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
                const sampleBriefing = await generateMorningBriefing(success[0]);
                const htmlBody = buildMorningBriefingEmail(sampleBriefing, success.length);
                const urgencyLabel = sampleBriefing.urgencyLevel === 'clean' ? '✅ All Clear'
                    : sampleBriefing.urgencyLevel === 'critical' ? '🔴 Action Required'
                    : sampleBriefing.urgencyLevel === 'warning' ? '⚠️ Needs Attention'
                    : '📊 FYI';

                for (const email of superUserEmails) {
                    sendGenericEmail({
                        to: email,
                        subject: `${urgencyLabel} — BakedBot Morning Report · ${sampleBriefing.dayOfWeek}`,
                        htmlBody,
                        fromName: BAKEDBOT_OPERATOR_SENDER_NAME,
                        communicationType: 'strategy',
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
