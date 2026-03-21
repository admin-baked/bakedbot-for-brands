import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { ProactiveOutcomeRecord } from '@/types/proactive';

export const PROACTIVE_OUTCOMES_COLLECTION = 'proactive_outcomes';

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

function toOutcomeRecord(data: Record<string, unknown>, id: string): ProactiveOutcomeRecord {
  return {
    ...(data as Omit<ProactiveOutcomeRecord, 'id' | 'createdAt'>),
    id,
    createdAt: cloneDate(data.createdAt) ?? new Date(),
  };
}

export async function recordProactiveOutcome(
  input: Omit<ProactiveOutcomeRecord, 'id' | 'createdAt'>
): Promise<ProactiveOutcomeRecord> {
  const { firestore } = await createServerClient();
  const docRef = firestore.collection(PROACTIVE_OUTCOMES_COLLECTION).doc();
  const record: ProactiveOutcomeRecord = {
    id: docRef.id,
    ...input,
    createdAt: new Date(),
  };

  await docRef.set(record);

  logger.info('[ProactiveOutcomeService] Recorded proactive outcome', {
    outcomeId: record.id,
    tenantId: record.tenantId,
    workflowKey: record.workflowKey,
    outcomeType: record.outcomeType,
    taskId: record.taskId,
  });

  return toOutcomeRecord(record as unknown as Record<string, unknown>, record.id);
}
