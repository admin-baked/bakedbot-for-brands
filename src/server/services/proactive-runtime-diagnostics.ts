import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { isProactiveDiagnosticsEnabled } from '@/server/services/proactive-settings';
import type { ProactiveRuntimeDiagnosticRecord } from '@/types/proactive';

export const PROACTIVE_RUNTIME_DIAGNOSTICS_COLLECTION = 'proactive_runtime_diagnostics';

function toDate(value: unknown): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return value;
    }

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

function toDiagnosticRecord(data: Record<string, unknown>, id: string): ProactiveRuntimeDiagnosticRecord {
    return {
        ...(data as Omit<ProactiveRuntimeDiagnosticRecord, 'id' | 'createdAt'>),
        id,
        createdAt: toDate(data.createdAt) ?? new Date(),
    };
}

export async function recordProactiveRuntimeDiagnostic(
    input: Omit<ProactiveRuntimeDiagnosticRecord, 'id' | 'createdAt'>
): Promise<ProactiveRuntimeDiagnosticRecord | null> {
    if (!(await isProactiveDiagnosticsEnabled(input.organizationId))) {
        return null;
    }

    const { firestore } = await createServerClient();
    const docRef = firestore.collection(PROACTIVE_RUNTIME_DIAGNOSTICS_COLLECTION).doc();
    const record: ProactiveRuntimeDiagnosticRecord = {
        id: docRef.id,
        ...input,
        createdAt: new Date(),
    };

    await docRef.set(record);

    logger.info('[ProactiveRuntimeDiagnostics] Recorded runtime diagnostic', {
        diagnosticId: record.id,
        organizationId: record.organizationId,
        workflowKey: record.workflowKey,
        source: record.source,
        mode: record.mode,
    });

    return toDiagnosticRecord(record as unknown as Record<string, unknown>, record.id);
}

export async function listRecentProactiveRuntimeDiagnostics(input: {
    organizationId?: string;
    limit?: number;
}): Promise<ProactiveRuntimeDiagnosticRecord[]> {
    const { firestore } = await createServerClient();
    const limit = input.limit ?? 20;
    const snap = await firestore.collection(PROACTIVE_RUNTIME_DIAGNOSTICS_COLLECTION).get();

    return snap.docs
        .map((doc) => toDiagnosticRecord(doc.data() as Record<string, unknown>, doc.id))
        .filter((record) => !input.organizationId || record.organizationId === input.organizationId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit);
}
