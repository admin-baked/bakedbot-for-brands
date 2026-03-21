import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { ProactiveCommitmentRecord } from '@/types/proactive';

export const PROACTIVE_COMMITMENTS_COLLECTION = 'proactive_commitments';

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

function toCommitmentRecord(data: Record<string, unknown>, id: string): ProactiveCommitmentRecord {
  return {
    ...(data as Omit<ProactiveCommitmentRecord, 'id' | 'createdAt' | 'updatedAt' | 'dueAt'>),
    id,
    createdAt: cloneDate(data.createdAt) ?? new Date(),
    updatedAt: cloneDate(data.updatedAt) ?? new Date(),
    dueAt: cloneDate(data.dueAt),
  };
}

export async function upsertCommitment(input: {
  tenantId: string;
  organizationId: string;
  taskId: string;
  commitmentType: 'approval_wait' | 'follow_up' | 'deadline' | 'blocked_issue';
  title: string;
  state?: 'open' | 'resolved' | 'expired' | 'dismissed';
  dueAt?: Date;
  payload: Record<string, unknown>;
}): Promise<ProactiveCommitmentRecord> {
  const { firestore } = await createServerClient();
  const snap = await firestore
    .collection(PROACTIVE_COMMITMENTS_COLLECTION)
    .where('tenantId', '==', input.tenantId)
    .where('taskId', '==', input.taskId)
    .where('commitmentType', '==', input.commitmentType)
    .get();

  const existing = snap.docs
    .map((doc) => toCommitmentRecord(doc.data() as Record<string, unknown>, doc.id))
    .find((commitment) => commitment.title === input.title && commitment.state === 'open');

  const now = new Date();
  if (existing) {
    const patch: Partial<ProactiveCommitmentRecord> = {
      organizationId: input.organizationId,
      dueAt: input.dueAt,
      payload: input.payload,
      updatedAt: now,
    };

    await firestore.collection(PROACTIVE_COMMITMENTS_COLLECTION).doc(existing.id).update(patch);

    logger.info('[ProactiveCommitmentService] Updated open commitment', {
      commitmentId: existing.id,
      taskId: input.taskId,
      commitmentType: input.commitmentType,
    });

    return {
      ...existing,
      ...patch,
    };
  }

  const docRef = firestore.collection(PROACTIVE_COMMITMENTS_COLLECTION).doc();
  const record: ProactiveCommitmentRecord = {
    id: docRef.id,
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    taskId: input.taskId,
    commitmentType: input.commitmentType,
    title: input.title,
    state: input.state ?? 'open',
    dueAt: input.dueAt,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(record);

  logger.info('[ProactiveCommitmentService] Created commitment', {
    commitmentId: record.id,
    taskId: record.taskId,
    commitmentType: record.commitmentType,
  });

  return toCommitmentRecord(record as unknown as Record<string, unknown>, record.id);
}

export async function resolveCommitment(
  commitmentId: string,
  resolution: 'resolved' | 'expired' | 'dismissed'
): Promise<void> {
  const { firestore } = await createServerClient();
  const docRef = firestore.collection(PROACTIVE_COMMITMENTS_COLLECTION).doc(commitmentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error(`Proactive commitment not found: ${commitmentId}`);
  }

  await docRef.update({
    state: resolution,
    updatedAt: new Date(),
  });

  logger.info('[ProactiveCommitmentService] Resolved commitment', {
    commitmentId,
    resolution,
  });
}

export async function listOpenCommitments(input: {
  tenantId: string;
  organizationId?: string;
  taskId?: string;
}): Promise<ProactiveCommitmentRecord[]> {
  const { firestore } = await createServerClient();
  const snap = await firestore
    .collection(PROACTIVE_COMMITMENTS_COLLECTION)
    .where('tenantId', '==', input.tenantId)
    .get();

  return snap.docs
    .map((doc) => toCommitmentRecord(doc.data() as Record<string, unknown>, doc.id))
    .filter((commitment) => commitment.state === 'open')
    .filter((commitment) => !input.organizationId || commitment.organizationId === input.organizationId)
    .filter((commitment) => !input.taskId || commitment.taskId === input.taskId)
    .sort((left, right) => {
      const leftValue = left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightValue = right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftValue - rightValue;
    });
}
