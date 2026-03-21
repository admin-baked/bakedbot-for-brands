import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { ProactiveEventRecord } from '@/types/proactive';

export const PROACTIVE_EVENTS_COLLECTION = 'proactive_events';

function cloneDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }
    return undefined;
}

function toEventRecord(data: Record<string, unknown>, id: string): ProactiveEventRecord {
    return {
        ...(data as Omit<ProactiveEventRecord, 'id' | 'createdAt'>),
        id,
        createdAt: cloneDate(data.createdAt) ?? new Date(),
    };
}

export async function appendProactiveEvent(
    input: Omit<ProactiveEventRecord, 'id' | 'createdAt'>
): Promise<ProactiveEventRecord> {
    const { firestore } = await createServerClient();
    const docRef = firestore.collection(PROACTIVE_EVENTS_COLLECTION).doc();
    const record: ProactiveEventRecord = {
        id: docRef.id,
        ...input,
        createdAt: new Date(),
    };

    await docRef.set(record);

    logger.info('[ProactiveEventLog] Appended proactive event', {
        eventId: record.id,
        tenantId: record.tenantId,
        eventType: record.eventType,
        taskId: record.taskId,
    });

    return toEventRecord(record as unknown as Record<string, unknown>, record.id);
}

export async function listRecentProactiveEvents(input: {
    tenantId: string;
    taskId?: string;
    limit?: number;
}): Promise<ProactiveEventRecord[]> {
    const { firestore } = await createServerClient();
    const limit = input.limit ?? 20;
    const snap = await firestore
        .collection(PROACTIVE_EVENTS_COLLECTION)
        .where('tenantId', '==', input.tenantId)
        .get();

    return snap.docs
        .map((doc) => toEventRecord(doc.data() as Record<string, unknown>, doc.id))
        .filter((event) => !input.taskId || event.taskId === input.taskId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit);
}
