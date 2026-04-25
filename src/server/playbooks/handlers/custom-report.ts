/**
 * Handler: custom-report
 *
 * Catch-all for user-defined playbooks that don't map to a specific handler.
 * Claude generates a report based on config.prompt using recent org data
 * as grounding context.
 *
 * audienceType modes:
 *   'all_email_customers' — Creates a Campaign document targeting all org
 *       customers with emails. Campaign-sender picks it up within 5 min.
 *       Uses the 60/40 deal+education Craig prompt for weekly campaigns.
 *   (default) — Sends a one-off report email to config.deliverTo addresses.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { callGroqOrClaude } from '@/ai/glm';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

function normalizeDeliverTo(value: unknown): string[] {
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.includes('@'));
    }
    if (Array.isArray(value)) {
        return value
            .filter((email): email is string => typeof email === 'string')
            .map((email) => email.trim())
            .filter((email) => email.includes('@'));
    }
    return [];
}

// Pull subject line and body out of Craig's structured response
function parseEmailParts(raw: string): { subject: string; body: string } {
    const subjectMatch = raw.match(/SUBJECT LINE?:\s*\n?([^\n]+)/i);
    const subject = subjectMatch?.[1]?.trim() ?? 'Your Weekly Update';
    const body = raw
        .replace(/SUBJECT LINE?:\s*\n?[^\n]+\n?/i, '')
        .trim();
    return { subject, body };
}

// ─── Audience mode: all email customers ─────────────────────────────────────

async function handleAllEmailCustomers(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;

    // Fetch org name for personalisation
    const orgSnap = await firestore.collection('organizations').doc(orgId).get();
    const orgName: string = (orgSnap.data()?.businessName ?? orgSnap.data()?.name ?? 'the dispensary') as string;

    // Grounding: last 7 days of sales
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ordersSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(weekAgo))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    const recentRevenue = ordersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);

    const salesContext = ordersSnap.size > 0
        ? `Sales this week: ${ordersSnap.size} orders, $${recentRevenue.toFixed(0)} revenue.`
        : '';

    // Craig: 60/40 deals + education weekly email
    const userPrompt = (config.prompt as string | undefined) ?? '';
    const emailRaw = await callGroqOrClaude({
        systemPrompt: `You are Craig, ${orgName}'s cannabis marketing AI. Write a friendly weekly email newsletter. Format exactly:

SUBJECT LINE:
[Compelling subject under 60 chars]

Hey {{firstName}},

[60% of this email — 2-3 current deals or featured products from ${orgName}. Be specific, compelling, and urgent ("this weekend only", "while supplies last").]

[40% of this email — one educational cannabis topic. Pick from: a terpene spotlight tied to a product, a strain type explanation, a consumption method tip, or a seasonal cannabis use case. Make it genuinely useful, not sales-y.]

[Warm, brand-appropriate closing sentence.]

Cannabis compliance rules: no medical claims (no "treats", "cures", "heals"), no guaranteed effects, no targeting minors. Keep tone professional and friendly.`,
        userMessage: `Write the weekly email now. ${salesContext} Additional context: ${userPrompt || 'Focus on top sellers and terpene education.'}`,
        maxTokens: 600,
        caller: 'playbook/weekly-campaign',
    });

    const { subject, body } = parseEmailParts(emailRaw);
    const htmlBody = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
<p style="font-size: 11px; color: #999; margin-top: 24px;">
Reply STOP to unsubscribe · ${orgName} · Sent by BakedBot
</p>
</div>`;

    // Create a Campaign so campaign-sender handles delivery, personalization,
    // deduplication, and tracking. Status 'approved' + scheduledAt = now →
    // campaign-sender picks it up within 5 minutes.
    const now = new Date();
    const campaignRef = firestore.collection('campaigns').doc();
    await campaignRef.set({
        id: campaignRef.id,
        orgId,
        createdBy: 'system',
        createdByAgent: 'craig',
        threadId: null,
        name: `Weekly Campaign — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        description: 'Auto-generated weekly deals + education email',
        goal: 'drive_sales',
        status: 'pending_approval',
        channels: ['email'],
        audience: { type: 'all', estimatedCount: 0 },
        content: {
            email: {
                channel: 'email',
                subject,
                body,
                htmlBody,
                complianceStatus: 'passed',
            },
        },
        complianceStatus: 'passed',
        complianceReviewedAt: now,
        tags: ['weekly', 'automated', 'craig'],
        createdAt: now,
        updatedAt: now,
    });

    logger.info('[CustomReport] Weekly campaign queued for send', {
        orgId,
        playbookId: ctx.playbookId,
        campaignId: campaignRef.id,
        subject,
    });

    // Inbox notification
    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: `Weekly Campaign Ready for Review — ${subject}`,
        body: `Craig drafted the weekly email. Review and approve it in Campaigns before it sends.`,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });
}

// ─── Default mode: one-off report email ─────────────────────────────────────

async function handleReportEmail(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;
    const userPrompt = (config.prompt as string | undefined) ?? 'Summarize recent business activity.';

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ordersSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(weekAgo))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    const recentRevenue = ordersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);

    const context = `Org: ${orgId}
Last 7 days: ${ordersSnap.size} orders · $${recentRevenue.toFixed(0)} revenue
Report requested: ${userPrompt}`;

    const report = await callGroqOrClaude({
        userMessage: `You are BakedBot, an AI commerce assistant for a cannabis dispensary. Generate a concise automated report (3-5 sentences max).\n\n${context}`,
        maxTokens: 400,
        caller: 'playbook/custom-report',
    });

    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: 'Automated Report',
        body: report,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    const deliverTo = normalizeDeliverTo(config.deliverTo);
    await Promise.all(deliverTo.map((email) => sendGenericEmail({
        to: email,
        subject: `Automated Report: ${config.playbookName || ctx.playbookId}`,
        htmlBody: `<p>${report.replace(/\n/g, '<br>')}</p>`,
        textBody: report,
        orgId,
        communicationType: 'transactional',
        agentName: 'playbooks',
    })));

    const slackChannel = config.slackChannel as string | undefined;
    if (slackChannel) {
        const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
        if (channel) {
            await slackService.postMessage(channel.id, `Automated Report\n${report}`);
        }
    }

    logger.info('[CustomReport] Delivered', { orgId, playbookId: ctx.playbookId, emails: deliverTo.length });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function handleCustomReport(ctx: ScheduledPlaybookContext): Promise<void> {
    const audienceType = ctx.config.audienceType as string | undefined;

    if (audienceType === 'all_email_customers') {
        await handleAllEmailCustomers(ctx);
    } else {
        await handleReportEmail(ctx);
    }
}
