import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

const DEFAULT_SYNC_LIMIT = 30;
export const DEFAULT_OUTREACH_TARGET_STATES = ['NY', 'MI', 'IL'] as const;

type CRMDispensarySeed = {
    name?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    phone?: string | null;
    source?: 'discovery' | 'claim' | 'import' | 'system';
    claimStatus?: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    claimedOrgId?: string | null;
    discoveredAt?: unknown;
    updatedAt?: unknown;
};

type ExistingLeadRecord = {
    id: string;
    ref: FirebaseFirestore.DocumentReference;
    data: FirebaseFirestore.DocumentData;
};

export interface CRMQueueSyncOptions {
    limit?: number;
    states?: string[];
}

export interface CRMQueueSyncResult {
    states: string[];
    scanned: number;
    created: number;
    updated: number;
    skipped: number;
    createdLeadIds: string[];
}

function normalizeState(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length === 2 ? normalized : null;
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildIdentityKey(name: unknown, city: unknown, state: unknown): string | null {
    const normalizedName = normalizeText(name);
    const normalizedCity = normalizeText(city);
    const normalizedState = normalizeState(state);

    if (!normalizedName || !normalizedCity || !normalizedState) {
        return null;
    }

    return `${normalizedName}|${normalizedCity}|${normalizedState}`;
}

function toMillis(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        try {
            return ((value as { toDate: () => Date }).toDate()).getTime();
        } catch {
            return 0;
        }
    }
    return 0;
}

function getCRMSourceLabel(source: CRMDispensarySeed['source'] | undefined): string {
    return source ? `crm:${source}` : 'crm-dispensary';
}

export function getOutreachTargetStates(): string[] {
    const configuredStates = (process.env.OUTREACH_TARGET_STATES || '')
        .split(',')
        .map(state => normalizeState(state))
        .filter((state): state is string => Boolean(state));

    return configuredStates.length > 0
        ? Array.from(new Set(configuredStates))
        : [...DEFAULT_OUTREACH_TARGET_STATES];
}

export async function syncCRMDispensariesToOutreachQueue(
    options: CRMQueueSyncOptions = {}
): Promise<CRMQueueSyncResult> {
    const db = getAdminFirestore();
    const states = Array.from(new Set(
        (options.states || getOutreachTargetStates())
            .map(state => normalizeState(state))
            .filter((state): state is string => Boolean(state))
    ));
    const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_SYNC_LIMIT, 100));

    if (states.length === 0) {
        return {
            states: [],
            scanned: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            createdLeadIds: [],
        };
    }

    const now = Date.now();
    const [existingSnapshots, crmSnapshots] = await Promise.all([
        Promise.all(states.map(state => db.collection('ny_dispensary_leads').where('state', '==', state).get())),
        Promise.all(states.map(state => db.collection('crm_dispensaries').where('state', '==', state).get())),
    ]);

    const existingByCRMId = new Map<string, ExistingLeadRecord>();
    const existingByIdentity = new Map<string, ExistingLeadRecord>();

    for (const snapshot of existingSnapshots) {
        for (const doc of snapshot.docs) {
            const lead = { id: doc.id, ref: doc.ref, data: doc.data() };
            const crmDispensaryId = typeof lead.data.crmDispensaryId === 'string' ? lead.data.crmDispensaryId : null;
            const identityKey = buildIdentityKey(lead.data.dispensaryName, lead.data.city, lead.data.state);

            if (crmDispensaryId) {
                existingByCRMId.set(crmDispensaryId, lead);
            }
            if (identityKey) {
                existingByIdentity.set(identityKey, lead);
            }
        }
    }

    const crmCandidates = crmSnapshots
        .flatMap(snapshot => snapshot.docs)
        .map(doc => ({
            id: doc.id,
            data: doc.data() as CRMDispensarySeed,
        }))
        .sort((left, right) => {
            const rightTs = toMillis(right.data.updatedAt) || toMillis(right.data.discoveredAt);
            const leftTs = toMillis(left.data.updatedAt) || toMillis(left.data.discoveredAt);
            return rightTs - leftTs;
        });

    let scanned = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const createdLeadIds: string[] = [];
    let writeCount = 0;
    let batch = db.batch();

    const commitBatch = async (): Promise<void> => {
        if (writeCount === 0) return;
        await batch.commit();
        batch = db.batch();
        writeCount = 0;
    };

    for (const candidate of crmCandidates) {
        if (created + updated >= limit) {
            break;
        }

        scanned++;

        const state = normalizeState(candidate.data.state);
        const name = typeof candidate.data.name === 'string' ? candidate.data.name.trim() : '';
        const city = typeof candidate.data.city === 'string' ? candidate.data.city.trim() : '';

        if (!state || !name || !city) {
            skipped++;
            continue;
        }

        if (candidate.data.claimStatus === 'claimed' || candidate.data.claimedOrgId) {
            skipped++;
            continue;
        }

        const identityKey = buildIdentityKey(name, city, state);
        const existingLead = existingByCRMId.get(candidate.id) || (identityKey ? existingByIdentity.get(identityKey) : undefined);

        if (existingLead) {
            const patch: Record<string, unknown> = {};

            if (!existingLead.data.crmDispensaryId) {
                patch.crmDispensaryId = candidate.id;
            }
            if ((existingLead.data.crmClaimStatus || null) !== (candidate.data.claimStatus || 'unclaimed')) {
                patch.crmClaimStatus = candidate.data.claimStatus || 'unclaimed';
            }
            if (!existingLead.data.email && candidate.data.email) {
                patch.email = candidate.data.email;
                patch.enriched = true;
            }
            if (!existingLead.data.phone && candidate.data.phone) {
                patch.phone = candidate.data.phone;
            }
            if (!existingLead.data.websiteUrl && candidate.data.website) {
                patch.websiteUrl = candidate.data.website;
            }
            if (!existingLead.data.address && candidate.data.address) {
                patch.address = candidate.data.address;
            }
            if (!existingLead.data.notes) {
                patch.notes = 'Seeded from CRM dispensary directory';
            }

            if (Object.keys(patch).length === 0) {
                skipped++;
                continue;
            }

            patch.updatedAt = now;
            batch.update(existingLead.ref, patch);
            writeCount++;
            existingLead.data = { ...existingLead.data, ...patch };
            existingByCRMId.set(candidate.id, existingLead);
            if (identityKey) {
                existingByIdentity.set(identityKey, existingLead);
            }
            updated++;
        } else {
            const leadRef = db.collection('ny_dispensary_leads').doc();
            const hasEmail = typeof candidate.data.email === 'string' && candidate.data.email.trim().length > 0;

            const leadDoc = {
                dispensaryName: name,
                contactName: null,
                email: candidate.data.email || null,
                phone: candidate.data.phone || null,
                city,
                state,
                address: candidate.data.address || null,
                websiteUrl: candidate.data.website || null,
                contactFormUrl: null,
                posSystem: null,
                licenseType: null,
                licenseNumber: null,
                source: getCRMSourceLabel(candidate.data.source),
                crmDispensaryId: candidate.id,
                crmClaimStatus: candidate.data.claimStatus || 'unclaimed',
                researchedAt: now,
                notes: 'Seeded from CRM dispensary directory',
                status: 'researched',
                emailVerified: false,
                outreachSent: false,
                enriched: hasEmail,
                createdAt: now,
                updatedAt: now,
            };

            batch.set(leadRef, leadDoc);
            writeCount++;
            created++;
            createdLeadIds.push(leadRef.id);

            const createdLead: ExistingLeadRecord = {
                id: leadRef.id,
                ref: leadRef,
                data: leadDoc,
            };

            existingByCRMId.set(candidate.id, createdLead);
            if (identityKey) {
                existingByIdentity.set(identityKey, createdLead);
            }
        }

        if (writeCount >= 400) {
            await commitBatch();
        }
    }

    await commitBatch();

    logger.info('[CRMQueueSync] Synced CRM dispensaries into outreach queue', {
        states,
        limit,
        scanned,
        created,
        updated,
        skipped,
    });

    return {
        states,
        scanned,
        created,
        updated,
        skipped,
        createdLeadIds,
    };
}
