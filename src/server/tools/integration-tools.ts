import type { ClaudeTool } from '@/ai/claude';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { INTEGRATION_METADATA, type IntegrationProvider, type IntegrationStatus } from '@/types/service-integrations';

export const integrationTools: ClaudeTool[] = [
  {
    name: 'check_integration_status',
    description: 'Check which integrations are connected',
    input_schema: {
      type: 'object' as const,
      properties: {
        provider: { type: 'string', description: 'Integration provider to check (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'request_integration',
    description: 'Request user to connect an integration',
    input_schema: {
      type: 'object' as const,
      properties: {
        provider: { type: 'string', description: 'Integration provider' },
        reason: { type: 'string', description: 'Why this integration is needed' },
        enablesAction: { type: 'string', description: 'What capability this enables (optional)' },
        threadId: { type: 'string', description: 'Current thread ID (optional; can come from context)' },
      },
      required: ['provider', 'reason'],
    },
  },
];

export type IntegrationStatusResult = {
  provider: IntegrationProvider;
  connected: boolean;
  status: IntegrationStatus;
  connectedAt?: string;
  expiresAt?: string;
};

function isExpired(expiresAtRaw: unknown, nowMs: number): boolean {
  if (!expiresAtRaw) return false;
  const date = new Date(String(expiresAtRaw));
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < nowMs;
}

function normalizeStatus(provider: IntegrationProvider, data: any, nowMs: number): IntegrationStatusResult {
  const connectedAt = typeof data?.connectedAt === 'string' ? data.connectedAt : undefined;
  const expiresAt = typeof data?.expiresAt === 'string' ? data.expiresAt : undefined;

  let status: IntegrationStatus = (data?.status as IntegrationStatus) || 'disconnected';
  let connected = status === 'connected';

  if (connected && isExpired(expiresAt, nowMs)) {
    status = 'expired';
    connected = false;
  }

  if (!['connected', 'disconnected', 'error', 'expired'].includes(status)) {
    status = 'error';
    connected = false;
  }

  return {
    provider,
    connected,
    status,
    connectedAt,
    expiresAt,
  };
}

/**
 * Check the integration status for a provider, or return a map of all integrations for a user.
 *
 * Storage: `users/{userId}/integrations/{provider}`
 */
export async function checkIntegrationStatus(
  userId: string,
  provider?: IntegrationProvider
): Promise<IntegrationStatusResult | Record<string, IntegrationStatusResult>> {
  const db = getAdminFirestore();
  const nowMs = Date.now();
  const integrationsRef = db.collection('users').doc(userId).collection('integrations');

  if (provider) {
    const doc = await integrationsRef.doc(provider).get();
    if (!doc.exists) {
      return { provider, connected: false, status: 'disconnected' };
    }

    const data = doc.data?.() ?? {};
    return normalizeStatus(provider, data, nowMs);
  }

  const snapshot = await integrationsRef.get();
  const result: Record<string, IntegrationStatusResult> = {};

  snapshot.forEach((doc: any) => {
    const id = doc.id as IntegrationProvider;
    const data = doc.data?.() ?? {};
    result[id] = normalizeStatus(id, data, nowMs);
  });

  return result;
}

export async function requestIntegration(input: {
  userId: string;
  orgId: string;
  threadId: string;
  provider: IntegrationProvider;
  reason: string;
  enablesAction?: string;
}): Promise<
  | { success: true; artifactId: string; authMethod: string; message: string }
  | { success: false; error: string }
> {
  const metadata = INTEGRATION_METADATA[input.provider];
  if (!metadata) {
    return { success: false, error: `Unknown integration provider: ${input.provider}` };
  }

  const db = getAdminFirestore();
  const artifactRef = db.collection('inbox_artifacts').doc();

  const artifactPayload = {
    id: artifactRef.id,
    threadId: input.threadId,
    orgId: input.orgId,
    type: 'integration_request',
    status: 'draft',
    data: {
      provider: input.provider,
      reason: input.reason,
      authMethod: metadata.authMethod,
      category: metadata.category,
      setupTime: metadata.setupTime,
      threadId: input.threadId,
      enablesAction: input.enablesAction,
    },
    createdBy: input.userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await artifactRef.set(artifactPayload);

  // Best-effort: attach artifact to thread for easy retrieval in UI.
  try {
    await db.collection('inbox_threads').doc(input.threadId).update({
      artifactIds: FieldValue.arrayUnion(artifactRef.id),
      status: 'draft',
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.warn('[integration-tools] Failed to attach artifact to thread', { error: e as unknown });
  }

  return {
    success: true,
    artifactId: artifactRef.id,
    authMethod: metadata.authMethod,
    message: `${metadata.name} integration request created`,
  };
}

export async function executeIntegrationTool(
  toolName: string,
  toolInput: any,
  context: { userId: string; orgId: string; threadId?: string }
): Promise<any> {
  if (toolName === 'check_integration_status') {
    const provider = (toolInput?.provider as IntegrationProvider | undefined) || undefined;

    if (provider) {
      const status = (await checkIntegrationStatus(context.userId, provider)) as IntegrationStatusResult;
      return {
        ...status,
        message: `${provider} is ${status.status}`,
      };
    }

    const statuses = (await checkIntegrationStatus(context.userId)) as Record<string, IntegrationStatusResult>;
    const values = Object.values(statuses);

    const summary = values.reduce(
      (acc, s) => {
        acc.total += 1;
        if (s.connected) acc.connected += 1;
        if (s.status === 'disconnected') acc.disconnected += 1;
        if (s.status === 'expired') acc.expired += 1;
        if (s.status === 'error') acc.error += 1;
        return acc;
      },
      { total: 0, connected: 0, disconnected: 0, expired: 0, error: 0 }
    );

    return { integrations: statuses, summary };
  }

  if (toolName === 'request_integration') {
    const provider = toolInput?.provider as IntegrationProvider;
    const reason = toolInput?.reason as string;
    const enablesAction = toolInput?.enablesAction as string | undefined;
    const threadId = (toolInput?.threadId as string | undefined) || context.threadId;

    if (!threadId) {
      throw new Error('threadId is required');
    }

    const status = (await checkIntegrationStatus(context.userId, provider)) as IntegrationStatusResult;
    if (status.connected) {
      return {
        success: false,
        alreadyConnected: true,
        provider,
        message: `${provider} is already connected`,
      };
    }

    return requestIntegration({
      userId: context.userId,
      orgId: context.orgId,
      threadId,
      provider,
      reason,
      enablesAction,
    });
  }

  throw new Error(`Unknown integration tool: ${toolName}`);
}

