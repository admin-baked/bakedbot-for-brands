import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { verifySession, verifySuperAdmin } from '@/server/utils/auth-check';
import { createTicketSchema } from '@/app/api/schemas';
import { dispatchLinusIncidentResponse } from '@/server/services/linus-incident-response';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { wrapUserData, buildSystemDirectives } from '@/server/security';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

const CEO_TICKETS_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/dashboard/ceo?tab=admin&section=users&subtab=tickets';

function truncateSlackText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
}

export async function GET(request: NextRequest) {
    try {
        if (!await verifySuperAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { firestore } = await createServerClient();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const snapshot = await firestore
            .collection('tickets')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        return NextResponse.json(tickets);
    } catch (error) {
        logger.error('[Tickets API] Get failed', { error });
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Manual validation since withProtection is strict on auth
        const validation = createTicketSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid request', details: validation.error }, { status: 400 });
        }

        const data = validation.data;
        const user = await verifySession(request);
        // Note: We allow unauthenticated users (e.g. signup errors) to report tickets

        const { firestore } = await createServerClient();

        // Dedup: if an identical error was already reported in the last 5 minutes, skip
        if (data.errorDigest && data.category === 'system_error') {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const dedupSnap = await firestore
                .collection('tickets')
                .where('errorDigest', '==', data.errorDigest)
                .where('createdAt', '>=', fiveMinutesAgo)
                .limit(1)
                .get();
            if (!dedupSnap.empty) {
                logger.info('[Tickets API] Duplicate error suppressed', { errorDigest: data.errorDigest, existingId: dedupSnap.docs[0].id });
                return NextResponse.json({ id: dedupSnap.docs[0].id, message: 'Duplicate suppressed' });
            }
        }

        const newTicket = {
            ...data,
            status: 'new',
            createdAt: new Date(),
            priority: data.priority || 'medium',
            category: data.category || 'system_error',
            reporterId: user ? user.uid : 'guest',
            reporterEmail: data.reporterEmail || (user ? user.email : 'anonymous'),
        };

        const docRef = await firestore.collection('tickets').add(newTicket);

        // === LINUS INTERRUPT: Auto-dispatch for high-priority system errors ===
        if (newTicket.priority === 'high' && newTicket.category === 'system_error') {
            try {
                // SECURITY: Build structured prompt with sanitized user data
                const directives = buildSystemDirectives([
                    'Analyze the error and stack trace.',
                    'Search the codebase for the affected file/function.',
                    'Determine root cause.',
                    'If the fix is safe and obvious, implement it, verify it, and push the repair.',
                    'If you cannot safely repair it, explain the blocker and next action.',
                    'Report back to Slack with a concise status: MISSION_READY, NEEDS_REVIEW, or BLOCKED. If you fixed it, say so explicitly in the summary.'
                ]);

                const linusPrompt = `CRITICAL INTERRUPT: A production error has been reported via support ticket.

TICKET ID: ${docRef.id}

${wrapUserData(String(data.title || ''), 'title', true, 200)}

${wrapUserData(String(data.description || 'No description provided'), 'description', true, 1000)}

${wrapUserData(String(data.pageUrl || 'Unknown'), 'page_url', true, 200)}

${wrapUserData(String(data.errorStack || 'No stack trace available'), 'stack_trace', true, 2000)}

                ${wrapUserData(String(data.errorDigest || 'N/A'), 'error_digest', true, 100)}

                ${directives}`;

                const ticketTitle = String(data.title || 'System Error');
                const pageUrl = String(data.pageUrl || 'Unknown');
                const errorDigest = String(data.errorDigest || 'N/A');
                const reporterEmail = String(newTicket.reporterEmail || 'anonymous');
                const descriptionPreview = truncateSlackText(String(data.description || 'No description provided'), 500);
                const stackPreview = String(data.errorStack || '').trim();

                try {
                    await postLinusIncidentSlack({
                        source: 'support-ticket',
                        incidentId: docRef.id,
                        fallbackText: `🔴 High system error: ${truncateSlackText(ticketTitle, 100)}`,
                        blocks: [
                            {
                                type: 'header',
                                text: { type: 'plain_text', text: '🔴 Linus Incident — System Error', emoji: true },
                            },
                            {
                                type: 'section',
                                text: { type: 'mrkdwn', text: `*${truncateSlackText(ticketTitle, 140)}*` },
                            },
                            {
                                type: 'section',
                                fields: [
                                    { type: 'mrkdwn', text: `*Ticket*\n\`${docRef.id}\`` },
                                    { type: 'mrkdwn', text: `*Page*\n${truncateSlackText(pageUrl, 150)}` },
                                    { type: 'mrkdwn', text: `*Digest*\n\`${truncateSlackText(errorDigest, 120)}\`` },
                                    { type: 'mrkdwn', text: `*Reporter*\n${truncateSlackText(reporterEmail, 80)}` },
                                ],
                            },
                            {
                                type: 'section',
                                text: { type: 'mrkdwn', text: `*What happened*\n${descriptionPreview}` },
                            },
                            ...(stackPreview
                                ? [{
                                    type: 'section',
                                    text: {
                                        type: 'mrkdwn',
                                        text: `*Stack Preview*\n\`\`\`${truncateSlackText(stackPreview, 500)}\`\`\``,
                                    },
                                }]
                                : []),
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: '🛠️ Linus has been dispatched and is fixing this. You can discuss the incident with him in Slack by DMing Linus or using `/ask linus ...`.',
                                },
                            },
                            {
                                type: 'actions',
                                elements: [
                                    {
                                        type: 'button',
                                        text: { type: 'plain_text', text: 'Open Ticket Queue', emoji: true },
                                        url: CEO_TICKETS_URL,
                                        action_id: 'open_ticket_queue',
                                        style: 'danger',
                                    },
                                ],
                            },
                        ],
                    });

                    logger.info('[Tickets API] Incident posted to Slack', {
                        ticketId: docRef.id,
                        pageUrl,
                        reporterEmail,
                    });
                } catch (slackError) {
                    logger.warn('[Tickets API] Failed to post incident to Slack', {
                        ticketId: docRef.id,
                        error: slackError,
                    });
                }

                // Fire-and-forget dispatch to Linus (don't block ticket creation)
                void dispatchLinusIncidentResponse({
                    prompt: linusPrompt,
                    source: 'support-ticket',
                    incidentId: docRef.id,
                    incidentLink: `<${CEO_TICKETS_URL}|Open Ticket Queue> • Ticket \`${docRef.id}\``,
                    maxIterations: 10,
                    analysisHeader: '🛠️ Linus — Repair Report',
                    analysisFallbackPrefix: '🛠️ Linus repair report',
                });

                logger.info('[Tickets API] Linus repair loop triggered', { ticketId: docRef.id });
            } catch (linusError) {
                // Don't fail ticket creation if Linus dispatch bootstrapping fails
                logger.warn('[Tickets API] Failed to dispatch to Linus', { error: linusError });
            }
        }

        return NextResponse.json({
            id: docRef.id,
            message: 'Ticket created successfully'
        });

    } catch (error) {
        logger.error('[Tickets API] Create failed', { error });
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
