'use server';

/**
 * Dispensary Playbook Assignments — Server Actions
 *
 * Manages playbook_assignments for dispensary orgs.
 * Uses orgId-based queries (composite index on orgId + status).
 */

import { createHash } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
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

type AssignmentDoc = QueryDocumentSnapshot<DocumentData>;

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

function getAssignmentUpdatedAt(doc: AssignmentDoc): number {
    const data = doc.data();
    const updatedAt = data.updatedAt?.toDate?.() ?? data.createdAt?.toDate?.();
    return updatedAt instanceof Date ? updatedAt.getTime() : 0;
}

function chooseCanonicalAssignment(
    docs: AssignmentDoc[],
    activeSubscriptionId?: string,
): AssignmentDoc | undefined {
    return [...docs].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aSubMatch = activeSubscriptionId && aData.subscriptionId === activeSubscriptionId ? 1 : 0;
        const bSubMatch = activeSubscriptionId && bData.subscriptionId === activeSubscriptionId ? 1 : 0;
        if (aSubMatch !== bSubMatch) return bSubMatch - aSubMatch;

        const aActive = aData.status === 'active' ? 1 : 0;
        const bActive = bData.status === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;

        const updatedDelta = getAssignmentUpdatedAt(b) - getAssignmentUpdatedAt(a);
        if (updatedDelta !== 0) return updatedDelta;

        return a.id.localeCompare(b.id);
    })[0];
}

function groupAssignmentsByPlaybook(docs: AssignmentDoc[]): Map<string, AssignmentDoc[]> {
    const grouped = new Map<string, AssignmentDoc[]>();
    for (const doc of docs) {
        const playbookId = doc.data().playbookId;
        if (typeof playbookId !== 'string' || !playbookId) continue;
        const group = grouped.get(playbookId) ?? [];
        group.push(doc);
        grouped.set(playbookId, group);
    }
    return grouped;
}

function latestAssignmentDate(docs: AssignmentDoc[]): string | null {
    const latest = docs
        .map((doc) => doc.data().lastTriggered?.toDate?.() ?? doc.data().lastRunAt?.toDate?.())
        .filter((date): date is Date => date instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];

    return latest?.toISOString?.() ?? null;
}

function isActiveSubscription(data: DocumentData | undefined): boolean {
    return data?.status === 'active' || data?.status === 'trialing';
}

async function resolveActiveSubscriptionId(
    db: Firestore,
    orgId: string,
): Promise<string> {
    const byOrgSnap = await db
        .collection('subscriptions')
        .where('orgId', '==', orgId)
        .limit(10)
        .get();
    const byOrg = byOrgSnap.docs.find((doc) => isActiveSubscription(doc.data()));
    if (byOrg) return byOrg.id;

    const byCustomerSnap = await db
        .collection('subscriptions')
        .where('customerId', '==', orgId)
        .limit(10)
        .get();
    const byCustomer = byCustomerSnap.docs.find((doc) => isActiveSubscription(doc.data()));
    if (byCustomer) return byCustomer.id;

    logger.warn('[DispensaryPlaybooks] No active subscription doc found, falling back to orgId', { orgId });
    return orgId;
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

    const activeSubscriptionId = await resolveActiveSubscriptionId(db, orgId);
    const groupedAssignments = groupAssignmentsByPlaybook(snap.docs);

    const assignments: PlaybookAssignmentStatus[] = [...groupedAssignments.entries()].map(([playbookId, docs]) => {
        const canonical = chooseCanonicalAssignment(docs, activeSubscriptionId);
        const data = canonical?.data() ?? {};
        return {
            playbookId,
            status: (data.status || 'paused') as 'active' | 'paused' | 'completed',
            triggerCount: docs.reduce((sum, doc) => sum + (Number(doc.data().triggerCount) || 0), 0),
            lastTriggered: latestAssignmentDate(docs),
        };
    });

    // Collect customConfig overrides keyed by playbookId
    const customConfigs: Record<string, PlaybookCustomConfig> = {};
    groupedAssignments.forEach((docs, playbookId) => {
        const canonicalWithConfig = chooseCanonicalAssignment(
            docs.filter((doc) => doc.data().customConfig),
            activeSubscriptionId,
        );
        if (canonicalWithConfig) {
            customConfigs[playbookId] = canonicalWithConfig.data().customConfig as PlaybookCustomConfig;
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

    const activeIds = [...new Set(assignments.filter((a) => a.status === 'active').map((a) => a.playbookId))];
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
        const activeSubscriptionId = await resolveActiveSubscriptionId(db, orgId);
        const existing = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .where('playbookId', '==', playbookId)
            .get();

        if (!existing.empty) {
            const canonical = chooseCanonicalAssignment(existing.docs, activeSubscriptionId) ?? existing.docs[0];
            await canonical.ref.update({
                customConfig: sanitizedConfig,
                subscriptionId: canonical.data().subscriptionId || activeSubscriptionId,
                updatedAt: Timestamp.now(),
            });
        } else {
            // Create the assignment document with the config (paused by default)
            await db.collection('playbook_assignments').add({
                subscriptionId: activeSubscriptionId,
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
        const activeSubscriptionId = await resolveActiveSubscriptionId(db, orgId);
        const existing = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .where('playbookId', '==', playbookId)
            .get();

        if (!existing.empty) {
            const batch = db.batch();
            const canonical = chooseCanonicalAssignment(existing.docs, activeSubscriptionId) ?? existing.docs[0];

            if (active) {
                batch.update(canonical.ref, {
                    status: 'active',
                    subscriptionId: activeSubscriptionId,
                    updatedAt: Timestamp.now(),
                });
                existing.docs
                    .filter((doc) => doc.id !== canonical.id)
                    .forEach((doc) => {
                        batch.update(doc.ref, {
                            status: 'paused',
                            updatedAt: Timestamp.now(),
                        });
                    });
            } else {
                existing.docs.forEach((doc) => {
                    batch.update(doc.ref, {
                        status: 'paused',
                        updatedAt: Timestamp.now(),
                    });
                });
            }

            await batch.commit();
        } else if (active) {
            await db.collection('playbook_assignments').add({
                subscriptionId: activeSubscriptionId,
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
        const activeSubscriptionId = await resolveActiveSubscriptionId(db, orgId);

        // Get existing assignments for this org
        const existingSnap = await db
            .collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .get();

        const existingMap = groupAssignmentsByPlaybook(existingSnap.docs);

        const batch = db.batch();
        let activated = 0;

        for (const playbookId of playbookIds) {
            const existingDocs = existingMap.get(playbookId) ?? [];
            const existingDoc = chooseCanonicalAssignment(existingDocs, activeSubscriptionId);
            if (existingDoc) {
                const wasActive = existingDoc.data().status === 'active';
                if (!wasActive || existingDoc.data().subscriptionId !== activeSubscriptionId) {
                    batch.update(existingDoc.ref, {
                        status: 'active',
                        subscriptionId: activeSubscriptionId,
                        updatedAt: Timestamp.now(),
                    });
                    if (!wasActive) activated++;
                }

                existingDocs
                    .filter((doc) => doc.id !== existingDoc.id)
                    .forEach((doc) => {
                        batch.update(doc.ref, {
                            status: 'paused',
                            updatedAt: Timestamp.now(),
                        });
                    });

                if (existingDocs.length > 1) {
                    logger.info('[DispensaryPlaybooks] Canonicalized duplicate assignments', {
                        orgId,
                        playbookId,
                        kept: existingDoc.id,
                        paused: existingDocs.length - 1,
                    });
                }
            } else {
                const ref = db.collection('playbook_assignments').doc();
                batch.set(ref, {
                    subscriptionId: activeSubscriptionId,
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

        logger.info('[DispensaryPlaybooks] Activated all tier playbooks', {
            orgId,
            tierId,
            activated,
            subscriptionId: activeSubscriptionId,
        });
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

// ─── Audience Counts ────────────────────────────────────────────────────────

export interface PlaybookAudienceCounts {
    emailCustomers: number;
    weeklySubscribers: number;
    totalCustomers: number;
}

export async function getPlaybookAudienceCounts(orgId: string): Promise<PlaybookAudienceCounts> {
    try {
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'brand', 'brand_admin', 'super_user']);
        if (!isUserAuthorizedForOrg(user as unknown as Record<string, unknown>, orgId)) {
            return { emailCustomers: 0, weeklySubscribers: 0, totalCustomers: 0 };
        }

        const db = getAdminFirestore();

        const [totalSnap, emailSnap, weeklySnap] = await Promise.all([
            db.collection('customers')
                .where('orgId', '==', orgId)
                .select()
                .get(),
            db.collection('customers')
                .where('orgId', '==', orgId)
                .where('email', '!=', null)
                .select()
                .get(),
            db.collection('weekly_campaign_subscribers')
                .where('orgId', '==', orgId)
                .where('status', '==', 'active')
                .select()
                .get(),
        ]);

        return {
            totalCustomers: totalSnap.size,
            emailCustomers: emailSnap.size,
            weeklySubscribers: weeklySnap.size,
        };
    } catch (error) {
        logger.warn('[PlaybookAudience] Failed to get counts', {
            orgId,
            err: error instanceof Error ? error.message : String(error),
        });
        return { emailCustomers: 0, weeklySubscribers: 0, totalCustomers: 0 };
    }
}

// =============================================================================
// MANUAL RUN
// =============================================================================

/**
 * Immediately invoke a custom playbook's handler for this org, without
 * waiting for the next scheduled dispatcher cycle.
 *
 * Accepts the playbook doc ID (from `playbooks` collection). Finds the
 * matching assignment by querying all org assignments and filtering client-side
 * to avoid needing a composite index.
 */
export async function runPlaybookNow(orgId: string, playbookId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user', 'super_admin', 'dispensary', 'dispensary_admin']);
        if (!isUserAuthorizedForOrg(user as unknown as Record<string, unknown>, orgId)) {
            return { success: false, error: 'Not authorized' };
        }

        const db = getAdminFirestore();

        // Find the assignment for this playbook — filter client-side to avoid composite index
        const allSnap = await db.collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .get();

        const assignmentDoc = allSnap.docs.find(d => {
            const data = d.data();
            return data.playbookId === playbookId || data.config?.customPlaybookId === playbookId;
        });

        if (!assignmentDoc) return { success: false, error: 'No active assignment found for this playbook' };

        const data = assignmentDoc.data();
        const { runHandler } = await import('@/server/playbooks/handler-registry');

        await runHandler(data.handler as string, {
            assignmentId: assignmentDoc.id,
            orgId,
            playbookId,
            config: (data.config ?? {}) as Record<string, unknown>,
            firestore: db,
        });

        logger.info('[PlaybookManualRun] Completed', { orgId, playbookId, handler: data.handler });
        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[PlaybookManualRun] Failed', { orgId, playbookId, error: msg });
        return { success: false, error: msg };
    }
}

// =============================================================================
// WEEKLY EMAIL SETUP
// =============================================================================

/**
 * Backfill all existing org customers (who have emails) into weekly_campaign_subscribers,
 * then configure the matching custom playbook assignment to use audienceType:
 * 'all_email_customers' so the custom-report handler sends to all of them.
 *
 * Safe to run multiple times — all writes are idempotent.
 */
export async function setupWeeklyEmailForOrg(orgId: string): Promise<{
    enrolled: number;
    alreadyEnrolled: number;
    playbookUpdated: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user', 'super_admin', 'dispensary', 'dispensary_admin']);
        if (!isUserAuthorizedForOrg(user as unknown as Record<string, unknown>, orgId)) {
            return { enrolled: 0, alreadyEnrolled: 0, playbookUpdated: false, error: 'Not authorized' };
        }

        const db = getAdminFirestore();

        // 1. Fetch all customers — filter by email client-side to avoid needing
        //    a composite index on (orgId, email).
        const customersSnap = await db.collection('customers')
            .where('orgId', '==', orgId)
            .select('email', 'firstName')
            .get();

        let enrolled = 0;
        let alreadyEnrolled = 0;

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of customersSnap.docs) {
            const data = doc.data();
            const email = (data.email as string | undefined)?.trim().toLowerCase();
            if (!email || !email.includes('@')) continue;

            const subId = `wsub_${createHash('sha256').update(email + orgId).digest('hex').slice(0, 16)}`;
            const subRef = db.collection('weekly_campaign_subscribers').doc(subId);
            const existing = await subRef.get();

            if (existing.exists) {
                alreadyEnrolled++;
            } else {
                batch.set(subRef, {
                    orgId,
                    customerId: doc.id,
                    email,
                    firstName: (data.firstName as string | null) ?? null,
                    enrolledAt: new Date(),
                    lastSentAt: null,
                    status: 'active',
                    source: 'backfill',
                });
                enrolled++;
                batchCount++;

                // Firestore batch limit is 500
                if (batchCount >= 490) {
                    await batch.commit();
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) await batch.commit();

        // 2. Find the weekly campaign playbook assignment and update audienceType
        const assignmentsSnap = await db.collection('playbook_assignments')
            .where('orgId', '==', orgId)
            .where('status', '==', 'active')
            .get();

        let playbookUpdated = false;
        for (const doc of assignmentsSnap.docs) {
            const data = doc.data();
            const name: string = ((data.config?.playbookName ?? data.name ?? '') as string).toLowerCase();
            if (name.includes('weekly') && (name.includes('campaign') || name.includes('email'))) {
                await doc.ref.update({ 'config.audienceType': 'all_email_customers' });
                playbookUpdated = true;
                logger.info('[WeeklyEmailSetup] Updated audienceType on assignment', {
                    orgId,
                    assignmentId: doc.id,
                    playbookName: data.config?.playbookName,
                });
            }
        }

        logger.info('[WeeklyEmailSetup] Complete', { orgId, enrolled, alreadyEnrolled, playbookUpdated });
        return { enrolled, alreadyEnrolled, playbookUpdated };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[WeeklyEmailSetup] Failed', { orgId, error: msg });
        return { enrolled: 0, alreadyEnrolled: 0, playbookUpdated: false, error: msg };
    }
}
