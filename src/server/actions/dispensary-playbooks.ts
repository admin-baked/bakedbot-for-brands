'use server';

/**
 * Dispensary Playbook Assignments — Server Actions
 *
 * Manages playbook_assignments for dispensary orgs.
 * Uses orgId-based queries (composite index on orgId + status).
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';
import { PLAYBOOKS, getPlaybookIdsForTier } from '@/config/playbooks';
import type { TierId } from '@/config/tiers';
import { logger } from '@/lib/logger';
import { normalizePlanIdToTierId } from '@/lib/get-org-tier';
import { isUserAuthorizedForOrg } from '@/server/actions/dispensary-playbooks-auth';

export interface PlaybookAssignmentStatus {
    playbookId: string;
    status: 'active' | 'paused' | 'completed';
    triggerCount: number;
    lastTriggered: string | null;
}

/** Per-playbook schedule/delivery overrides stored in playbook_assignments.customConfig */
export interface PlaybookCustomConfig {
    schedule?: {
        cron: string;
        timezone: string;
    };
    delivery?: {
        channels: ('email' | 'sms' | 'inbox')[];
        emailTo?: string;
        phoneNumber?: string;
        reportFormat?: 'brief' | 'detailed';
    };
}

export interface DispensaryPlaybookData {
    assignments: PlaybookAssignmentStatus[];
    activeIds: string[];
    tierId: TierId;
    totalAvailable: number;
    totalActive: number;
    /** Custom schedule/delivery overrides keyed by playbookId */
    customConfigs: Record<string, PlaybookCustomConfig>;
}

function sanitizePlaybookCustomConfig(config: PlaybookCustomConfig): PlaybookCustomConfig {
    const sanitized: PlaybookCustomConfig = {};

    if (config.schedule?.cron && config.schedule?.timezone) {
        sanitized.schedule = {
            cron: config.schedule.cron,
            timezone: config.schedule.timezone,
        };
    }

    if (config.delivery?.channels?.length) {
        sanitized.delivery = {
            channels: config.delivery.channels,
            reportFormat: config.delivery.reportFormat,
            ...(config.delivery.emailTo ? { emailTo: config.delivery.emailTo.trim() } : {}),
            ...(config.delivery.phoneNumber ? { phoneNumber: config.delivery.phoneNumber.trim() } : {}),
        };
    }

    return sanitized;
}

/**
 * Get all playbook assignment statuses for an org.
 */
export async function getDispensaryPlaybookAssignments(orgId: string): Promise<DispensaryPlaybookData> {
    const session = await requireUser();
    const authorized = isUserAuthorizedForOrg(session as unknown as Record<string, unknown>, orgId);

    const db = getAdminFirestore();

    if (!authorized) {
        // JWT claims may be stale (e.g. after admin reset) — try Firestore user profile as fallback
        const uid = (session as any)?.uid as string | undefined;
        let profileAuthorized = false;
        if (uid) {
            try {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const profile = userDoc.data();
                    const profileOrgId = profile?.orgId || profile?.currentOrgId || profile?.locationId;
                    profileAuthorized = profileOrgId === orgId;
                    if (profileAuthorized) {
                        logger.info('[DispensaryPlaybooks] Auth via Firestore profile (stale JWT claims)', { orgId, uid });
                    }
                }
            } catch (e) {
                logger.warn('[DispensaryPlaybooks] Failed to read user profile for fallback auth', { uid });
            }
        }

        if (!profileAuthorized) {
            logger.warn('[DispensaryPlaybooks] Forbidden org access', {
                orgId,
                role: (session as any)?.role ?? null,
                uid: uid ?? null,
            });
            throw new Error('Forbidden: You do not have access to this organization');
        }
    }

    // Query by orgId (composite index: orgId ASC, status ASC)
    const snap = await db
        .collection('playbook_assignments')
        .where('orgId', '==', orgId)
        .get();

    const assignments: PlaybookAssignmentStatus[] = snap.docs.map((d) => {
        const data = d.data();
        return {
            playbookId: data.playbookId as string,
            status: (data.status || 'paused') as 'active' | 'paused' | 'completed',
            triggerCount: data.triggerCount || 0,
            lastTriggered: data.lastTriggered?.toDate?.()?.toISOString?.() || null,
        };
    });

    // Collect customConfig overrides keyed by playbookId
    const customConfigs: Record<string, PlaybookCustomConfig> = {};
    snap.docs.forEach((d) => {
        const data = d.data();
        if (data.customConfig && data.playbookId) {
            customConfigs[data.playbookId as string] = data.customConfig as PlaybookCustomConfig;
        }
    });

    // Determine org tier (default empire if not found)
    let tierId: TierId = 'empire';
    try {
        const orgSnap = await db.collection('organizations').doc(orgId).get();
        const orgTier = orgSnap.data()?.subscription?.tierId || orgSnap.data()?.planId;
        if (orgTier) tierId = normalizePlanIdToTierId(orgTier);
    } catch {
        // Fallback: check locations collection
        try {
            const locSnap = await db.collection('locations').where('orgId', '==', orgId).limit(1).get();
            if (!locSnap.empty) {
                const planId = locSnap.docs[0].data()?.planId;
                if (planId) tierId = normalizePlanIdToTierId(planId);
            }
        } catch {
            logger.info('[DispensaryPlaybooks] Could not determine tier, defaulting to empire', { orgId });
        }
    }

    const activeIds = assignments.filter((a) => a.status === 'active').map((a) => a.playbookId);
    const tierPlaybookIds = getPlaybookIdsForTier(tierId);

    return {
        assignments,
        activeIds,
        tierId,
        totalAvailable: tierPlaybookIds.length,
        totalActive: activeIds.length,
        customConfigs,
    };
}

/**
 * Update custom schedule and/or delivery config for a single playbook assignment.
 * Creates the assignment document if it doesn't exist yet.
 */
export async function updatePlaybookAssignmentConfig(
    orgId: string,
    playbookId: string,
    config: PlaybookCustomConfig
): Promise<{ success: boolean; error?: string }> {
    const session = await requireUser();
    if (!isUserAuthorizedForOrg(session as unknown as Record<string, unknown>, orgId)) {
        logger.warn('[DispensaryPlaybooks] Forbidden org mutation', {
            orgId,
            role: (session as any)?.role ?? null,
            uid: (session as any)?.uid ?? null,
        });
        return { success: false, error: 'Forbidden: You do not have access to this organization' };
    }

    const db = getAdminFirestore();

    try {
        const sanitizedConfig = sanitizePlaybookCustomConfig(config);
        const existing = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .where('playbookId', '==', playbookId)
            .limit(1)
            .get();

        if (!existing.empty) {
            await existing.docs[0].ref.update({
                customConfig: sanitizedConfig,
                updatedAt: Timestamp.now(),
            });
        } else {
            // Create the assignment document with the config (paused by default)
            await db.collection('playbook_assignments').add({
                subscriptionId: orgId,
                orgId,
                playbookId,
                status: 'paused',
                customConfig: sanitizedConfig,
                lastTriggered: null,
                triggerCount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        logger.info('[DispensaryPlaybooks] Updated playbook config', { orgId, playbookId });
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[DispensaryPlaybooks] Config update failed', { orgId, playbookId, error: message });
        return { success: false, error: message };
    }
}

/**
 * Toggle a single playbook assignment for an org.
 */
export async function toggleDispensaryPlaybookAssignment(
    orgId: string,
    playbookId: string,
    active: boolean
): Promise<{ success: boolean; error?: string }> {
    const session = await requireUser();
    if (!isUserAuthorizedForOrg(session as unknown as Record<string, unknown>, orgId)) {
        logger.warn('[DispensaryPlaybooks] Forbidden org mutation', {
            orgId,
            role: (session as any)?.role ?? null,
            uid: (session as any)?.uid ?? null,
        });
        return { success: false, error: 'Forbidden: You do not have access to this organization' };
    }

    const db = getAdminFirestore();

    try {
        const existing = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .where('playbookId', '==', playbookId)
            .limit(1)
            .get();

        if (!existing.empty) {
            await existing.docs[0].ref.update({
                status: active ? 'active' : 'paused',
                updatedAt: Timestamp.now(),
            });
        } else if (active) {
            // Create new assignment (subscriptionId = orgId as fallback)
            await db.collection('playbook_assignments').add({
                subscriptionId: orgId,
                orgId,
                playbookId,
                status: 'active',
                lastTriggered: null,
                triggerCount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        logger.info('[DispensaryPlaybooks] Toggled playbook', { orgId, playbookId, active });
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[DispensaryPlaybooks] Toggle failed', { orgId, playbookId, error: message });
        return { success: false, error: message };
    }
}

/**
 * Activate all playbooks for a tier in one batch operation.
 * Safe to re-run — skips already-active assignments.
 */
export async function activateAllTierPlaybooks(
    orgId: string,
    tierId: TierId = 'empire'
): Promise<{ success: boolean; activated: number; error?: string }> {
    const session = await requireUser();
    if (!isUserAuthorizedForOrg(session as unknown as Record<string, unknown>, orgId)) {
        return { success: false, activated: 0, error: 'Forbidden: You do not have access to this organization' };
    }

    const db = getAdminFirestore();

    try {
        const playbookIds = getPlaybookIdsForTier(tierId);

        // Get existing assignments for this org
        const existingSnap = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .get();

        const existingMap = new Map(
            existingSnap.docs.map((d) => [d.data().playbookId as string, d])
        );

        const batch = db.batch();
        let activated = 0;

        for (const playbookId of playbookIds) {
            const existingDoc = existingMap.get(playbookId);
            if (existingDoc) {
                if (existingDoc.data().status !== 'active') {
                    batch.update(existingDoc.ref, {
                        status: 'active',
                        updatedAt: Timestamp.now(),
                    });
                    activated++;
                }
            } else {
                const ref = db.collection('playbook_assignments').doc();
                batch.set(ref, {
                    subscriptionId: orgId,
                    orgId,
                    playbookId,
                    status: 'active',
                    lastTriggered: null,
                    triggerCount: 0,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                activated++;
            }
        }

        await batch.commit();

        logger.info('[DispensaryPlaybooks] Activated all tier playbooks', { orgId, tierId, activated });
        return { success: true, activated };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[DispensaryPlaybooks] Activate all failed', { orgId, tierId, error: message });
        return { success: false, activated: 0, error: message };
    }
}

/**
 * Get the playbook definitions for a tier with their assignment status.
 * Used for rendering the dispensary playbooks view.
 */
export async function getTierPlaybooksWithStatus(orgId: string) {
    const { activeIds, tierId } = await getDispensaryPlaybookAssignments(orgId);
    const activeSet = new Set(activeIds);

    const tierPlaybookIds = new Set(getPlaybookIdsForTier(tierId));

    const playbooksWithStatus = Object.values(PLAYBOOKS)
        .filter((p) => tierPlaybookIds.has(p.id))
        .map((p) => ({
            ...p,
            isActive: activeSet.has(p.id),
        }));

    return { playbooks: playbooksWithStatus, tierId, activeCount: activeIds.length };
}
