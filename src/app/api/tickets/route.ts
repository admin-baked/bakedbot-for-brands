import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
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
        const { firestore } = await createServerClient();
        const body = await request.json();

        // Basic validation
        if (!body.description) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        const newTicket = {
            ...body,
            status: 'new',
            createdAt: new Date(),
            priority: body.priority || 'medium',
            category: body.category || 'system_error',
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
