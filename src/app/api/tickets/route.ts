import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { verifySession, verifySuperAdmin } from '@/server/utils/auth-check';

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

        return NextResponse.json({
            id: docRef.id,
            message: 'Ticket created successfully'
        });

    } catch (error) {
        logger.error('[Tickets API] Create failed', { error });
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
