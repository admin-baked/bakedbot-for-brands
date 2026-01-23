import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { verifySession, verifySuperAdmin } from '@/server/utils/auth-check';
import { createTicketSchema } from '@/app/api/schemas';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { sanitizeForPrompt, wrapUserData, buildSystemDirectives } from '@/server/security';

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
        if (data.priority === 'high' && data.category === 'system_error') {
            try {
                // SECURITY: Build structured prompt with sanitized user data
                const directives = buildSystemDirectives([
                    'Analyze the error and stack trace.',
                    'Search the codebase for the affected file/function.',
                    'Determine root cause.',
                    'If fix is safe and obvious, propose a patch.',
                    'Update the ticket with your findings.'
                ]);

                const linusPrompt = `CRITICAL INTERRUPT: A production error has been reported via support ticket.

TICKET ID: ${docRef.id}

${wrapUserData(String(data.title || ''), 'title', true, 200)}

${wrapUserData(String(data.description || 'No description provided'), 'description', true, 1000)}

${wrapUserData(String(data.pageUrl || 'Unknown'), 'page_url', true, 200)}

${wrapUserData(String(data.errorStack || 'No stack trace available'), 'stack_trace', true, 2000)}

${wrapUserData(String(data.errorDigest || 'N/A'), 'error_digest', true, 100)}

${directives}`;

                // Fire-and-forget dispatch to Linus (don't block ticket creation)
                runAgentChat(linusPrompt, 'linus', { source: 'interrupt', priority: 'high' })
                    .then(result => logger.info('[Tickets API] Linus dispatched', { ticketId: docRef.id, result: result.metadata }))
                    .catch(err => logger.warn('[Tickets API] Linus dispatch failed (non-blocking)', { error: err }));

                logger.info(`[Tickets API] Linus interrupt triggered for ticket ${docRef.id}`);
            } catch (linusError) {
                // Don't fail ticket creation if Linus dispatch fails
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
