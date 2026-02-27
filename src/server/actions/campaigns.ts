'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type {
    Campaign,
    CampaignStatus,
    CampaignGoal,
    CampaignChannel,
    CampaignAudience,
    CampaignContent,
    CampaignPerformance,
} from '@/types/campaign';
import type { InboxAgentPersona } from '@/types/inbox';

type CampaignActionUser = {
    uid: string;
    role?: string;
    orgId?: string;
    brandId?: string;
    currentOrgId?: string;
};

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getOrgId(user: CampaignActionUser): string | null {
    return user.orgId || user.brandId || user.currentOrgId || null;
}

function isValidDocId(id: string): boolean {
    return !!id && !id.includes('/');
}

function isValidOrgId(orgId: string): boolean {
    return !!orgId && !orgId.includes('/');
}

function canAccessOrg(user: CampaignActionUser, targetOrgId: string): boolean {
    if (isSuperRole(user.role)) return true;
    const actorOrgId = getOrgId(user);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
        const userOrgId = getOrgId(user);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);

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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
        const userOrgId = getOrgId(user);
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
                return {
                    id: doc.id,
                    ...data,
                    scheduledAt: data.scheduledAt?.toDate?.() || undefined,
                    sentAt: data.sentAt?.toDate?.() || undefined,
                    completedAt: data.completedAt?.toDate?.() || undefined,
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    updatedAt: data.updatedAt?.toDate?.() || new Date(),
                    performance: data.performance ? {
                        ...data.performance,
                        lastUpdated: data.performance.lastUpdated?.toDate?.() || new Date(),
                    } : undefined,
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);

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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
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
        const user = await requireUser(['dispensary', 'brand', 'super_user']);
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
// UPDATE PERFORMANCE (called by campaign sender)
// =============================================================================

export async function updateCampaignPerformance(
    campaignId: string,
    performance: Partial<CampaignPerformance>,
): Promise<boolean> {
    try {
        if (!isValidDocId(campaignId)) return false;
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'brand', 'super_user']);

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
        if (updated.sent > 0) {
            updated.openRate = (updated.opened / updated.sent) * 100;
            updated.clickRate = (updated.clicked / updated.sent) * 100;
            updated.bounceRate = (updated.bounced / updated.sent) * 100;
        }
        if (updated.opened > 0) {
            updated.conversionRate = (updated.clicked / updated.opened) * 100;
        }

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
