import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    EmailThread,
    EmailMessage,
    EmailThreadScope,
    EmailThreadStatus,
} from '@/types/email-thread';

const COLLECTION = 'email_threads';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function threadId(): string {
    return `et-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function messageId(): string {
    return `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function deriveScope(bakedBotEmail: string): EmailThreadScope {
    if (bakedBotEmail.includes('@outreach.bakedbot.ai')) return 'outreach';
    if (bakedBotEmail.endsWith('@bakedbot.ai') && !bakedBotEmail.includes('.')) return 'platform';
    return 'org';
}

// ─────────────────────────────────────────────────────────────
// Write — outbound
// ─────────────────────────────────────────────────────────────

export interface CreateOutboundThreadOptions {
    sesMessageId: string;
    from: string;           // BakedBot-side address
    to: string;             // Customer / dispensary address
    subject: string;
    htmlBody: string;
    orgId?: string;
    agentName?: string;
    campaignId?: string;
    dispensaryName?: string;
    customerName?: string;
}

export async function createOutboundThread(opts: CreateOutboundThreadOptions): Promise<string> {
    const db = getAdminFirestore();
    const id = threadId();
    const now = new Date();
    const scope = deriveScope(opts.from);

    const message: EmailMessage = {
        id: messageId(),
        direction: 'outbound',
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        preview: stripHtml(opts.htmlBody),
        htmlBody: opts.htmlBody,
        sesMessageId: opts.sesMessageId,
        sentAt: now,
    };

    const thread: Omit<EmailThread, 'id'> = {
        scope,
        orgId: opts.orgId,
        counterpartEmail: opts.to,
        bakedBotEmail: opts.from,
        subject: opts.subject,
        status: 'open',
        agentName: opts.agentName,
        campaignId: opts.campaignId,
        dispensaryName: opts.dispensaryName,
        customerName: opts.customerName,
        messages: [message],
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
    };

    await db.collection(COLLECTION).doc(id).set({ ...thread, id, _sesMessageIds: [opts.sesMessageId] });
    logger.info('[EmailThread] Created outbound thread', { id, to: opts.to, scope });
    return id;
}

// ─────────────────────────────────────────────────────────────
// Write — inbound reply
// ─────────────────────────────────────────────────────────────

export interface AppendInboundOptions {
    threadId: string;
    sesMessageId: string;
    inReplyTo: string;
    from: string;
    to: string;
    subject: string;
    bodyText: string;
}

export async function appendInboundMessage(opts: AppendInboundOptions): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date();

    const message: EmailMessage = {
        id: messageId(),
        direction: 'inbound',
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        preview: opts.bodyText.slice(0, 500),
        sesMessageId: opts.sesMessageId,
        inReplyTo: opts.inReplyTo,
        sentAt: now,
    };

    const ref = db.collection(COLLECTION).doc(opts.threadId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            logger.warn('[EmailThread] appendInbound: thread not found', { threadId: opts.threadId });
            return;
        }
        const existing = snap.data() as EmailThread;
        const existingIds: string[] = (snap.data() as Record<string, unknown>)._sesMessageIds as string[] ?? [];
        tx.update(ref, {
            messages: [...existing.messages, message],
            _sesMessageIds: [...existingIds, opts.sesMessageId],
            status: 'replied' as EmailThreadStatus,
            unreadCount: (existing.unreadCount ?? 0) + 1,
            updatedAt: now,
            lastActivityAt: now,
        });
    });

    logger.info('[EmailThread] Appended inbound message', { threadId: opts.threadId, from: opts.from });
}

/** Create a brand-new thread from an inbound email that has no prior outbound thread */
export async function createInboundThread(opts: {
    sesMessageId: string;
    inReplyTo?: string;
    from: string;
    to: string;
    subject: string;
    bodyText: string;
    orgId?: string;
}): Promise<string> {
    const db = getAdminFirestore();
    const id = threadId();
    const now = new Date();
    const scope = deriveScope(opts.to);

    const message: EmailMessage = {
        id: messageId(),
        direction: 'inbound',
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        preview: opts.bodyText.slice(0, 500),
        sesMessageId: opts.sesMessageId,
        inReplyTo: opts.inReplyTo,
        sentAt: now,
    };

    const thread: Omit<EmailThread, 'id'> = {
        scope,
        orgId: opts.orgId,
        counterpartEmail: opts.from,
        bakedBotEmail: opts.to,
        subject: opts.subject,
        status: 'replied',
        messages: [message],
        unreadCount: 1,
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
    };

    await db.collection(COLLECTION).doc(id).set({ ...thread, id });
    logger.info('[EmailThread] Created inbound thread (no prior outbound)', { id, from: opts.from, scope });
    return id;
}

// ─────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────

export async function getThreadBySesMessageId(sesMessageId: string): Promise<{ threadId: string } | null> {
    const db = getAdminFirestore();
    // Search messages array for sesMessageId — stored as a flat field index
    const snap = await db.collection(COLLECTION)
        .where('_sesMessageIds', 'array-contains', sesMessageId)
        .limit(1)
        .get();
    if (!snap.empty) return { threadId: snap.docs[0].id };
    return null;
}

export interface GetThreadsOptions {
    scope?: EmailThreadScope;
    orgId?: string;
    status?: EmailThreadStatus;
    limit?: number;
    /** ISO string for cursor-based pagination */
    before?: string;
}

export async function getEmailThreads(opts: GetThreadsOptions = {}): Promise<EmailThread[]> {
    const db = getAdminFirestore();
    let query = db.collection(COLLECTION).orderBy('lastActivityAt', 'desc');

    // Firestore type narrowing requires casts when chaining conditionally
    if (opts.scope) query = query.where('scope', '==', opts.scope) as typeof query;
    if (opts.orgId) query = query.where('orgId', '==', opts.orgId) as typeof query;
    if (opts.status) query = query.where('status', '==', opts.status) as typeof query;
    if (opts.before) query = query.startAfter(new Date(opts.before)) as typeof query;

    const snap = await query.limit(opts.limit ?? 50).get();
    return snap.docs.map(d => {
        const data = d.data() as EmailThread & { createdAt: { toDate?: () => Date }; updatedAt: { toDate?: () => Date }; lastActivityAt: { toDate?: () => Date } };
        return {
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt as unknown as string),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt as unknown as string),
            lastActivityAt: data.lastActivityAt?.toDate?.() ?? new Date(data.lastActivityAt as unknown as string),
        } as EmailThread;
    });
}

/** Returns thread metadata without the messages array — use for list views to avoid fetching full payload. */
export async function getEmailThreadHeaders(opts: GetThreadsOptions = {}): Promise<EmailThread[]> {
    const db = getAdminFirestore();
    let query = db.collection(COLLECTION)
        .select(
            'scope', 'orgId', 'counterpartEmail', 'bakedBotEmail', 'subject', 'status',
            'unreadCount', 'lastActivityAt', 'createdAt', 'updatedAt',
            'agentName', 'dispensaryName', 'customerName', 'campaignId'
        )
        .orderBy('lastActivityAt', 'desc');

    if (opts.scope) query = query.where('scope', '==', opts.scope) as typeof query;
    if (opts.orgId) query = query.where('orgId', '==', opts.orgId) as typeof query;
    if (opts.status) query = query.where('status', '==', opts.status) as typeof query;
    if (opts.before) query = query.startAfter(new Date(opts.before)) as typeof query;

    const snap = await query.limit(opts.limit ?? 100).get();
    return snap.docs.map(d => {
        const data = d.data() as Omit<EmailThread, 'id' | 'messages'> & {
            createdAt: { toDate?: () => Date };
            updatedAt: { toDate?: () => Date };
            lastActivityAt: { toDate?: () => Date };
        };
        return {
            ...data,
            id: d.id,
            messages: [],
            createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt as unknown as string),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt as unknown as string),
            lastActivityAt: data.lastActivityAt?.toDate?.() ?? new Date(data.lastActivityAt as unknown as string),
        } as EmailThread;
    });
}

/** Returns a single thread with full messages — use when opening a thread. */
export async function getEmailThreadById(id: string): Promise<EmailThread | null> {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as EmailThread & {
        createdAt: { toDate?: () => Date };
        updatedAt: { toDate?: () => Date };
        lastActivityAt: { toDate?: () => Date };
        messages: Array<EmailMessage & { sentAt: { toDate?: () => Date } }>;
    };
    return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt as unknown as string),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt as unknown as string),
        lastActivityAt: data.lastActivityAt?.toDate?.() ?? new Date(data.lastActivityAt as unknown as string),
        messages: (data.messages ?? []).map(m => ({
            ...m,
            sentAt: (m.sentAt as any)?.toDate?.() ?? new Date(m.sentAt as unknown as string),
        })),
    } as EmailThread;
}

export async function appendOutboundMessage(opts: {
    threadId: string;
    from: string;
    to: string;
    subject: string;
    htmlBody: string;
}): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date();
    const message: EmailMessage = {
        id: messageId(),
        direction: 'outbound',
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        preview: stripHtml(opts.htmlBody),
        htmlBody: opts.htmlBody,
        sentAt: now,
    };
    const ref = db.collection(COLLECTION).doc(opts.threadId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            logger.warn('[EmailThread] appendOutbound: thread not found', { threadId: opts.threadId });
            return;
        }
        const existing = snap.data() as EmailThread;
        tx.update(ref, {
            messages: [...existing.messages, message],
            status: 'open' as EmailThreadStatus,
            updatedAt: now,
            lastActivityAt: now,
        });
    });
    logger.info('[EmailThread] Appended outbound reply', { threadId: opts.threadId });
}

export async function markThreadRead(id: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(COLLECTION).doc(id).update({ unreadCount: 0, updatedAt: new Date() });
}

export async function closeThread(id: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(COLLECTION).doc(id).update({
        status: 'closed' as EmailThreadStatus,
        updatedAt: new Date(),
    });
}
