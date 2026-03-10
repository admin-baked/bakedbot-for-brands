import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

type AlleavesConfigSource = Partial<ALLeavesConfig> & {
  provider?: string;
  status?: string;
};

function buildAlleavesConfig(source: AlleavesConfigSource | null | undefined): ALLeavesConfig | null {
  if (!source || source.provider !== 'alleaves' || source.status === 'inactive') {
    return null;
  }

  const username = source.username || process.env.ALLEAVES_USERNAME || '';
  const password = source.password || process.env.ALLEAVES_PASSWORD || '';
  const storeId = source.storeId || source.locationId || process.env.ALLEAVES_LOCATION_ID || '1';
  const locationId =
    source.locationId || source.storeId || process.env.ALLEAVES_LOCATION_ID || '1';

  if (!username || !password || !storeId || !locationId) {
    return null;
  }

  return {
    apiKey: source.apiKey,
    username,
    password,
    pin: source.pin || process.env.ALLEAVES_PIN,
    storeId,
    locationId,
    partnerId: source.partnerId,
    environment: source.environment || 'production',
  };
}

async function getLocationAlleavesConfig(orgId: string): Promise<ALLeavesConfig | null> {
  const db = getAdminFirestore();

  for (const field of ['orgId', 'brandId']) {
    const locationsSnap = await db
      .collection('locations')
      .where(field, '==', orgId)
      .limit(1)
      .get();

    if (locationsSnap.empty) {
      continue;
    }

    const config = buildAlleavesConfig(
      locationsSnap.docs[0].data()?.posConfig as AlleavesConfigSource | undefined
    );
    if (config) {
      return config;
    }
  }

  return null;
}

async function getTenantAlleavesConfig(orgId: string): Promise<ALLeavesConfig | null> {
  const db = getAdminFirestore();
  const tenantDoc = await db.collection('tenants').doc(orgId).get();

  if (!tenantDoc.exists) {
    return null;
  }

  return buildAlleavesConfig(tenantDoc.data()?.pos_config as AlleavesConfigSource | undefined);
}

function getEnvAlleavesConfig(): ALLeavesConfig | null {
  return buildAlleavesConfig({
    provider: 'alleaves',
    username: process.env.ALLEAVES_USERNAME,
    password: process.env.ALLEAVES_PASSWORD,
    pin: process.env.ALLEAVES_PIN,
    storeId: process.env.ALLEAVES_LOCATION_ID || '1',
    locationId: process.env.ALLEAVES_LOCATION_ID || '1',
  });
}

export async function getAlleavesClientForOrg(orgId: string): Promise<ALLeavesClient | null> {
  const locationConfig = await getLocationAlleavesConfig(orgId);
  if (locationConfig) {
    return new ALLeavesClient(locationConfig);
  }

  const tenantConfig = await getTenantAlleavesConfig(orgId);
  if (tenantConfig) {
    return new ALLeavesClient(tenantConfig);
  }

  const envConfig = getEnvAlleavesConfig();
  if (envConfig) {
    logger.info('[Alleaves] Using environment fallback config', { orgId });
    return new ALLeavesClient(envConfig);
  }

  logger.warn('[Alleaves] No usable config found for org', { orgId });
  return null;
}
