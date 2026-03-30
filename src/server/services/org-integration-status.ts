import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
  buildIntegrationStatusSummary,
  KNOWN_INTEGRATIONS,
  type IntegrationStatus,
} from '@/server/agents/agent-definitions';

type PosConfigLike = {
  provider?: string;
  status?: string;
};

function cloneKnownIntegrations(): IntegrationStatus[] {
  return KNOWN_INTEGRATIONS.map((integration) => ({ ...integration }));
}

function setIntegrationStatus(
  integrations: IntegrationStatus[],
  integrationId: string,
  patch: Partial<IntegrationStatus>,
): boolean {
  const index = integrations.findIndex((integration) => integration.id === integrationId);
  if (index === -1) {
    return false;
  }

  integrations[index] = {
    ...integrations[index],
    ...patch,
  };

  return true;
}

function formatLastSync(lastSyncAt: unknown): string | null {
  if (!lastSyncAt) {
    return null;
  }

  try {
    const maybeDate =
      typeof (lastSyncAt as { toDate?: () => Date }).toDate === 'function'
        ? (lastSyncAt as { toDate: () => Date }).toDate()
        : new Date(lastSyncAt as string | number | Date);

    if (Number.isNaN(maybeDate.getTime())) {
      return null;
    }

    return maybeDate.toISOString();
  } catch {
    return null;
  }
}

async function getLocationData(
  firestore: FirebaseFirestore.Firestore,
  orgId: string,
): Promise<FirebaseFirestore.DocumentData | null> {
  let locationsSnap = await firestore
    .collection('locations')
    .where('orgId', '==', orgId)
    .limit(1)
    .get();

  if (locationsSnap.empty) {
    locationsSnap = await firestore
      .collection('locations')
      .where('brandId', '==', orgId)
      .limit(1)
      .get();
  }

  return locationsSnap.empty ? null : locationsSnap.docs[0].data();
}

function buildPosDescription(provider: string, lastSyncIso: string | null): string {
  const providerName = provider === 'alleaves'
    ? 'Alleaves'
    : provider.charAt(0).toUpperCase() + provider.slice(1);
  const syncSuffix = lastSyncIso ? ` Last sync: ${lastSyncIso}.` : '';

  return `${providerName} POS sync for menu, orders, and customer records.${syncSuffix}`;
}

export async function resolveIntegrationStatusesForOrg(
  orgId: string,
): Promise<IntegrationStatus[]> {
  const integrations = cloneKnownIntegrations();

  if (!orgId || ['general', 'demo-brand-123', 'unknown'].includes(orgId)) {
    return integrations;
  }

  try {
    const { firestore } = await createServerClient();

    const [brandDoc, locationData, posIntegrationDoc] = await Promise.all([
      firestore.collection('brands').doc(orgId).get(),
      getLocationData(firestore, orgId),
      firestore.collection('tenants').doc(orgId).collection('integrations').doc('pos').get(),
    ]);

    const brandPosConfig = (brandDoc.exists ? brandDoc.data()?.posConfig : null) as PosConfigLike | null;
    const locationPosConfig = (locationData?.posConfig || null) as PosConfigLike | null;
    const posConfig = locationPosConfig?.provider
      ? locationPosConfig
      : brandPosConfig?.provider
        ? brandPosConfig
        : locationPosConfig || brandPosConfig;

    const provider = typeof posConfig?.provider === 'string'
      ? posConfig.provider.toLowerCase()
      : null;

    if (!provider) {
      return integrations;
    }

    const syncData = posIntegrationDoc.exists ? posIntegrationDoc.data() : null;
    const lastSyncIso = formatLastSync(syncData?.lastSyncAt);
    const integrationStatus: IntegrationStatus['status'] =
      posConfig?.status === 'active' || syncData?.status === 'active' || Boolean(lastSyncIso)
        ? 'active'
        : 'configured';

    const updated = setIntegrationStatus(integrations, provider, {
      status: integrationStatus,
      description: buildPosDescription(provider, lastSyncIso),
      setupRequired: undefined,
    });

    if (!updated) {
      logger.warn('[org-integration-status] Unsupported POS provider in tenant config', {
        orgId,
        provider,
      });
      return integrations;
    }

    logger.info('[org-integration-status] Resolved tenant POS integration', {
      orgId,
      provider,
      integrationStatus,
      lastSyncAt: lastSyncIso,
    });

    return integrations;
  } catch (error) {
    logger.warn('[org-integration-status] Failed to resolve tenant integrations', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return integrations;
  }
}

export async function buildIntegrationStatusSummaryForOrg(
  orgId?: string | null,
): Promise<string> {
  const integrations = await resolveIntegrationStatusesForOrg(orgId ?? '');
  return buildIntegrationStatusSummary(integrations);
}
