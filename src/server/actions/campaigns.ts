'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getActorOrgId, isSuperRole } from '@/server/auth/org-context';
import { logger } from '@/lib/logger';
import type {
    Campaign,
    CampaignStatus,
    CampaignGoal,
    CampaignChannel,
    CampaignAudience,
    CampaignContent,
    CampaignPerformance,
    CampaignRecipient,
} from '@/types/campaign';
import type { InboxAgentPersona } from '@/types/inbox';
import type { CustomerSegment } from '@/types/customers';

type CampaignActionUser = {
    uid: string;
    role?: string;
    orgId?: string;
    brandId?: string;
    currentOrgId?: string;
};

// Platform org used for super_user campaigns (outreach, platform-level sends)
const PLATFORM_ORG_ID = 'org_bakedbot_platform';
const CAMPAIGN_ALLOWED_ROLES = [
    'dispensary',
    'dispensary_admin',
    'dispensary_staff',
    'brand',
    'brand_admin',
    'brand_member',
    'super_user',
    'super_admin',
] as const;

// Detects Firestore Timestamp objects specifically (not plain strings/numbers).
function isFirestoreTimestamp(v: unknown): v is { toDate(): Date } {
    return (
        typeof v === 'object' &&
        v !== null &&
        'toDate' in v &&
        typeof (v as { toDate: unknown }).toDate === 'function'
    );
}

// Recursively convert Firestore Timestamps to Date so the server action response
// is always JSON-serializable. Handles any unknown Timestamp fields in documents.
function sanitizeDoc(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (isFirestoreTimestamp(v)) {
            out[k] = v.toDate();
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = sanitizeDoc(v as Record<string, unknown>);
        } else {
            out[k] = v;
        }
    }
    return out;
}

function getCampaignOrgId(user: CampaignActionUser): string | null {
    const orgId = getActorOrgId(user);
    if (!orgId && isSuperRole(user.role)) return PLATFORM_ORG_ID;
    return orgId;
}

function isValidDocId(id: string): boolean {
    return !!id && !id.includes('/');
}

function isValidOrgId(orgId: string): boolean {
    return !!orgId && !orgId.includes('/');
}

function canAccessOrg(user: CampaignActionUser, targetOrgId: string): boolean {
    if (isSuperRole(user.role)) return true;
    const actorOrgId = getCampaignOrgId(user);
    return !!actorOrgId && actorOrgId === targetOrgId;
}

async function userCanAccessCampaign(
    firestore: FirebaseFirestore.Firestore,
    campaignId: string,
    user: CampaignActionUser,
): Promise<boolean> {
    if (!isValidDocId(campaignId)) return false;
    const snap = await firestore.collection('campaigns').doc(campaignId).get();
    if (!snap.exists) return false;
    const campaignOrgId = snap.data()?.orgId;
    return typeof campaignOrgId === 'string' && isValidOrgId(campaignOrgId) && canAccessOrg(user, campaignOrgId);
}

// =============================================================================
// CREATE
// =============================================================================

export async function createCampaign(params: {
    orgId?: string;
    createdBy?: string;
    createdByAgent?: InboxAgentPersona;
    threadId?: string;
    name: string;
    description?: string;
    goal: CampaignGoal;
    channels: CampaignChannel[];
    audience?: CampaignAudience;
    content?: Partial<Record<CampaignChannel, CampaignContent>>;
    tags?: string[];
}): Promise<Campaign | null> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const userOrgId = getCampaignOrgId(user);
        const orgId = params.orgId || userOrgId;

        if (!orgId || !isValidOrgId(orgId)) {
            logger.warn('[CAMPAIGNS] Missing or invalid org context for campaign create', {
                actor: user.uid,
                actorRole: user.role,
                requestedOrgId: params.orgId,
            });
            return null;
        }

        if (!canAccessOrg(user, orgId)) {
            logger.warn('[CAMPAIGNS] Blocked cross-org create attempt', {
                actor: user.uid,
                actorRole: user.role,
                actorOrgId: userOrgId,
                targetOrgId: orgId,
            });
            return null;
        }

        const now = new Date();

        const campaignData = {
            orgId,
            createdBy: params.createdBy || user.uid,
            createdByAgent: params.createdByAgent || null,
            threadId: params.threadId || null,
            name: params.name,
            description: params.description || null,
            goal: params.goal,
            status: 'draft' as CampaignStatus,
            channels: params.channels,
            audience: params.audience || { type: 'all' as const, estimatedCount: 0 },
            content: params.content || {},
            tags: params.tags || [],
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await firestore.collection('campaigns').add(campaignData);

        logger.info('[CAMPAIGNS] Campaign created', {
            id: docRef.id,
            name: params.name,
            goal: params.goal,
            orgId: params.orgId,
        });

        return {
            id: docRef.id,
            ...campaignData,
        } as Campaign;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to create campaign', {
            error: (error as Error).message,
            name: params.name,
        });
        return null;
    }
}

// =============================================================================
// UPDATE
// =============================================================================

export async function updateCampaign(
    campaignId: string,
    updates: Partial<Pick<Campaign,
        'name' | 'description' | 'goal' | 'channels' | 'audience' | 'content' |
        'status' | 'scheduledAt' | 'complianceStatus' | 'tags'
    >>
): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);

        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized update attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        await firestore.collection('campaigns').doc(campaignId).update({
            ...updates,
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign updated', {
            id: campaignId,
            fields: Object.keys(updates),
        });

        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to update campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

// =============================================================================
// GET SINGLE
// =============================================================================

export async function getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
        if (!isValidDocId(campaignId)) return null;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const doc = await firestore.collection('campaigns').doc(campaignId).get();

        if (!doc.exists) return null;

        const data = doc.data()!;
        if (typeof data.orgId !== 'string' || !canAccessOrg(user, data.orgId)) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized getCampaign attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return null;
        }

        return {
            id: doc.id,
            ...data,
            scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt || undefined,
            sentAt: data.sentAt?.toDate?.() || data.sentAt || undefined,
            completedAt: data.completedAt?.toDate?.() || data.completedAt || undefined,
            complianceReviewedAt: data.complianceReviewedAt?.toDate?.() || undefined,
            approvedAt: data.approvedAt?.toDate?.() || undefined,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            performance: data.performance ? {
                ...data.performance,
                lastUpdated: data.performance.lastUpdated?.toDate?.() || new Date(),
            } : undefined,
        } as Campaign;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to get campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return null;
    }
}

// =============================================================================
// LIST (with filters)
// =============================================================================

export async function getCampaigns(
    orgIdParam?: string,
    options?: {
        status?: CampaignStatus;
        goal?: CampaignGoal;
        limit?: number;
    }
): Promise<Campaign[]> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const userOrgId = getCampaignOrgId(user);
        const orgId = orgIdParam || userOrgId;

        if (!orgId || !isValidOrgId(orgId)) {
            logger.warn('[CAMPAIGNS] Missing or invalid org context for getCampaigns', {
                actor: user.uid,
                actorRole: user.role,
                requestedOrgId: orgIdParam,
            });
            return [];
        }

        if (!canAccessOrg(user, orgId)) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized getCampaigns query', {
                actor: user.uid,
                actorRole: user.role,
                actorOrgId: userOrgId,
                requestedOrgId: orgId,
            });
            return [];
        }

        let query: FirebaseFirestore.Query = firestore.collection('campaigns')
            .where('orgId', '==', orgId);

        if (options?.status) {
            query = query.where('status', '==', options.status);
        }

        query = query.orderBy('createdAt', 'desc');

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const snap = await query.get();

        return snap.docs
            .map(doc => {
                const data = doc.data();
                // sanitizeDoc converts ALL Firestore Timestamps recursively, so
                // ...safe is always JSON-serializable regardless of unknown fields.
                const safe = sanitizeDoc(data);
                return {
                    id: doc.id,
                    ...safe,
                } as Campaign;
            })
            .filter(c => !options?.goal || c.goal === options.goal);
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to list campaigns', {
            error: (error as Error).message,
            orgId: orgIdParam,
        });
        return [];
    }
}

// =============================================================================
// AGGREGATE STATS
// =============================================================================

export interface CampaignStats {
    total: number;
    active: number;
    scheduled: number;
    sent: number;
    drafts: number;
    avgOpenRate: number;
    avgClickRate: number;
    totalRevenue: number;
}

export async function getCampaignStats(orgIdParam?: string): Promise<CampaignStats> {
    try {
        const campaigns = await getCampaigns(orgIdParam);

        const stats: CampaignStats = {
            total: campaigns.length,
            active: campaigns.filter(c => ['sending', 'scheduled', 'compliance_review', 'pending_approval', 'approved'].includes(c.status)).length,
            scheduled: campaigns.filter(c => c.status === 'scheduled').length,
            sent: campaigns.filter(c => c.status === 'sent').length,
            drafts: campaigns.filter(c => c.status === 'draft').length,
            avgOpenRate: 0,
            avgClickRate: 0,
            totalRevenue: 0,
        };

        const sentCampaigns = campaigns.filter(c => c.performance && c.performance.sent > 0);
        if (sentCampaigns.length > 0) {
            stats.avgOpenRate = sentCampaigns.reduce((sum, c) => sum + (c.performance?.openRate || 0), 0) / sentCampaigns.length;
            stats.avgClickRate = sentCampaigns.reduce((sum, c) => sum + (c.performance?.clickRate || 0), 0) / sentCampaigns.length;
            stats.totalRevenue = sentCampaigns.reduce((sum, c) => sum + (c.performance?.revenue || 0), 0);
        }

        return stats;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to get campaign stats', {
            error: (error as Error).message,
            orgId: orgIdParam,
        });
        return { total: 0, active: 0, scheduled: 0, sent: 0, drafts: 0, avgOpenRate: 0, avgClickRate: 0, totalRevenue: 0 };
    }
}

// =============================================================================
// LIFECYCLE ACTIONS
// =============================================================================

export async function submitForComplianceReview(campaignId: string): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);

        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized compliance submit attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        // Import compliance check dynamically to avoid circular deps
        const { runComplianceCheck } = await import('@/server/services/campaign-compliance');

        const campaign = await getCampaign(campaignId);
        if (!campaign) return false;

        // Update status to compliance_review
        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'compliance_review',
            updatedAt: new Date(),
        });

        // Run compliance asynchronously (fire-and-forget)
        runComplianceCheck(campaign).catch(err => {
            logger.error('[CAMPAIGNS] Compliance check failed', {
                campaignId,
                error: (err as Error).message,
            });
        });

        logger.info('[CAMPAIGNS] Submitted for compliance review', { campaignId });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to submit for compliance review', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function approveCampaign(
    campaignId: string,
    approvedBy: string,
): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized approve attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }
        const now = new Date();

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'approved',
            approvedAt: now,
            approvedBy,
            updatedAt: now,
        });

        logger.info('[CAMPAIGNS] Campaign approved', { campaignId, approvedBy });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to approve campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function scheduleCampaign(
    campaignId: string,
    scheduledAt: Date,
): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized schedule attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'scheduled',
            scheduledAt,
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign scheduled', {
            campaignId,
            scheduledAt: scheduledAt.toISOString(),
        });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to schedule campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function cancelCampaign(campaignId: string): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized cancel attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'cancelled',
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign cancelled', { campaignId });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to cancel campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function pauseCampaign(campaignId: string): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized pause attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'paused',
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign paused', { campaignId });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to pause campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

// =============================================================================
// RESUME / DUPLICATE / RETRY
// =============================================================================

export async function resumeCampaign(campaignId: string): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized resume attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        const doc = await firestore.collection('campaigns').doc(campaignId).get();
        if (!doc.exists || doc.data()?.status !== 'paused') return false;

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'scheduled',
            scheduledAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign resumed', { campaignId });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to resume campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function duplicateCampaign(
    campaignId: string,
    newName?: string,
): Promise<Campaign | null> {
    try {
        if (!isValidDocId(campaignId)) return null;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) return null;

        const doc = await firestore.collection('campaigns').doc(campaignId).get();
        if (!doc.exists) return null;

        const source = doc.data()!;
        const now = new Date();

        const clone = {
            orgId: source.orgId,
            createdBy: user.uid,
            createdByAgent: source.createdByAgent || null,
            threadId: undefined,
            name: newName || `${source.name} (Copy)`,
            description: source.description || null,
            goal: source.goal,
            status: 'draft' as CampaignStatus,
            channels: source.channels,
            audience: source.audience,
            content: source.content || {},
            tags: source.tags || [],
            createdAt: now,
            updatedAt: now,
        };

        const ref = await firestore.collection('campaigns').add(clone);
        logger.info('[CAMPAIGNS] Campaign duplicated', { sourceId: campaignId, newId: ref.id });

        return { id: ref.id, ...clone } as Campaign;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to duplicate campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return null;
    }
}

export async function retryCampaign(campaignId: string): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) return false;

        const doc = await firestore.collection('campaigns').doc(campaignId).get();
        if (!doc.exists || doc.data()?.status !== 'failed') return false;

        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'draft',
            updatedAt: new Date(),
        });

        logger.info('[CAMPAIGNS] Campaign retried (reset to draft)', { campaignId });
        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to retry campaign', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

export async function getCampaignRecipients(
    campaignId: string,
    options?: { limit?: number; offset?: number; status?: string },
): Promise<{ recipients: CampaignRecipient[]; total: number } | null> {
    try {
        if (!isValidDocId(campaignId)) return null;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) return null;

        let query: FirebaseFirestore.Query = firestore
            .collection('campaigns')
            .doc(campaignId)
            .collection('recipients');

        if (options?.status) {
            query = query.where('status', '==', options.status);
        }

        const countSnap = await query.count().get();
        const total = countSnap.data().count;

        query = query.orderBy('sentAt', 'desc').limit(options?.limit ?? 50);
        if (options?.offset) {
            const skipSnap = await firestore
                .collection('campaigns')
                .doc(campaignId)
                .collection('recipients')
                .orderBy('sentAt', 'desc')
                .limit(options.offset)
                .get();
            const lastDoc = skipSnap.docs[skipSnap.docs.length - 1];
            if (lastDoc) query = query.startAfter(lastDoc);
        }

        const snap = await query.get();
        const recipients = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            sentAt: d.data().sentAt?.toDate?.() ?? null,
            deliveredAt: d.data().deliveredAt?.toDate?.() ?? null,
            openedAt: d.data().openedAt?.toDate?.() ?? null,
            clickedAt: d.data().clickedAt?.toDate?.() ?? null,
            bouncedAt: d.data().bouncedAt?.toDate?.() ?? null,
        })) as CampaignRecipient[];

        return { recipients, total };
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to get recipients', {
            error: (error as Error).message,
            campaignId,
        });
        return null;
    }
}

// =============================================================================
// UPDATE PERFORMANCE (called by campaign sender)
// =============================================================================

export async function updateCampaignPerformance(
    campaignId: string,
    performance: Partial<CampaignPerformance>,
): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);

        const allowed = await userCanAccessCampaign(firestore, campaignId, user);
        if (!allowed) {
            logger.warn('[CAMPAIGNS] Blocked unauthorized performance update attempt', {
                actor: user.uid,
                actorRole: user.role,
                campaignId,
            });
            return false;
        }

        // Merge with existing performance
        const doc = await firestore.collection('campaigns').doc(campaignId).get();
        if (!doc.exists) return false;

        const existing = doc.data()?.performance || {};
        const updated = {
            ...existing,
            ...performance,
            lastUpdated: new Date(),
        };

        // Recompute rates
        const sent = Number(updated.sent) || 0;
        const opened = Number(updated.opened) || 0;
        const clicked = Number(updated.clicked) || 0;
        const bounced = Number(updated.bounced) || 0;

        if (sent > 0) {
            updated.openRate = (opened / sent) * 100;
            updated.clickRate = (clicked / sent) * 100;
            updated.bounceRate = (bounced / sent) * 100;
        } else {
            updated.openRate = 0;
            updated.clickRate = 0;
            updated.bounceRate = 0;
        }
        updated.conversionRate = opened > 0 ? (clicked / opened) * 100 : 0;

        await firestore.collection('campaigns').doc(campaignId).update({
            performance: updated,
            updatedAt: new Date(),
        });

        return true;
    } catch (error) {
        logger.error('[CAMPAIGNS] Failed to update performance', {
            error: (error as Error).message,
            campaignId,
        });
        return false;
    }
}

// =============================================================================
// SEGMENT COUNTS
// =============================================================================

export type SegmentCounts = Record<CustomerSegment, number>;

const EMPTY_SEGMENT_COUNTS: SegmentCounts = {
    vip: 0, loyal: 0, frequent: 0, high_value: 0,
    new: 0, slipping: 0, at_risk: 0, churned: 0, regular: 0,
};

export async function getSegmentCounts(orgId: string): Promise<SegmentCounts> {
    try {
        if (!isValidOrgId(orgId)) return { ...EMPTY_SEGMENT_COUNTS };
        const { firestore } = await createServerClient();
        const user = await requireUser([...CAMPAIGN_ALLOWED_ROLES]);
        if (!canAccessOrg(user, orgId)) return { ...EMPTY_SEGMENT_COUNTS };

        const snap = await firestore.collection('customers')
            .where('orgId', '==', orgId)
            .select('segment')
            .get();

        const counts = { ...EMPTY_SEGMENT_COUNTS };
        for (const doc of snap.docs) {
            const seg = doc.data().segment as CustomerSegment | undefined;
            if (seg && seg in counts) counts[seg]++;
        }
        return counts;
    } catch (error) {
        logger.error('[CAMPAIGNS] getSegmentCounts failed', { orgId, error: error instanceof Error ? error.message : String(error) });
        return { ...EMPTY_SEGMENT_COUNTS };
    }
}
