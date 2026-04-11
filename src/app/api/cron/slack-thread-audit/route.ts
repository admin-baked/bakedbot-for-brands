import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

function getAuthToken(req: NextRequest): string | null {
    const header = req.headers.get('authorization') || '';
    if (header.toLowerCase().startsWith('bearer ')) {
        return header.slice(7).trim();
    }
    return req.nextUrl.searchParams.get('token');
}

async function fetchThreadCollection(collection: string, channel: string, threadTs: string) {
    const db = getAdminFirestore();
    try {
        let query = db.collection(collection).where('threadTs', '==', threadTs);
        if (channel) {
            query = query.where('channel', '==', channel);
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        logger.warn('[SlackThreadAudit] Primary query failed, falling back to thread-only filter', {
            collection,
            error: error instanceof Error ? error.message : String(error),
        });
        const snapshot = await db.collection(collection).where('threadTs', '==', threadTs).get();
        return snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((row: any) => !channel || row.channel === channel);
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = getAuthToken(req);
    if (!CRON_SECRET || token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channel = req.nextUrl.searchParams.get('channel') ?? '';
    const threadTs = req.nextUrl.searchParams.get('threadTs') ?? '';
    if (!threadTs) {
        return NextResponse.json({ error: 'Missing threadTs' }, { status: 400 });
    }

    try {
        const [responses, messages, feedbackSnap] = await Promise.all([
            fetchThreadCollection('slack_responses', channel, threadTs),
            fetchThreadCollection('slack_messages', channel, threadTs),
            getAdminFirestore()
                .collection('response_feedback')
                .where('conversationId', '==', threadTs)
                .get(),
        ]);

        const feedback = feedbackSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const normalized = [
            ...messages.map((row: any) => ({
                role: 'user',
                text: row.userMessage || row.rawText || '',
                timestamp: row.timestamp?.toDate ? row.timestamp.toDate().toISOString() : row.timestamp,
                messageTs: row.messageTs ?? null,
                channel: row.channel ?? channel,
            })),
            ...responses.map((row: any) => ({
                role: 'agent',
                text: row.agentResponse || '',
                timestamp: row.timestamp?.toDate ? row.timestamp.toDate().toISOString() : row.timestamp,
                agent: row.agent,
                agentName: row.agentName,
                toolCalls: row.toolCalls ?? [],
                channel: row.channel ?? channel,
            })),
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return NextResponse.json({
            channel,
            threadTs,
            messages: normalized,
            feedback,
        });
    } catch (error) {
        logger.error('[SlackThreadAudit] Failed to build audit payload', {
            error: error instanceof Error ? error.message : String(error),
            channel,
            threadTs,
        });
        return NextResponse.json({ error: 'Failed to build audit payload' }, { status: 500 });
    }
}
