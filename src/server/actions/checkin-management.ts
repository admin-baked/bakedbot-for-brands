'use server';

/**
 * Check-In Management Server Actions
 *
 * Provides CRUD for checkin config + stats/visit queries for the
 * /dashboard/dispensary/checkin page and the inbox checkin_briefing artifact.
 *
 * Firestore paths:
 *   Config:  tenants/{orgId}/settings/checkinConfig  (settings sub-doc)
 *   Visits:  checkin_visits  (orgId, visitedAt indexed)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { z } from 'zod';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CheckinConfig {
    checkInEnabled: boolean;
    publicFlowEnabled: boolean;
    gmapsPlaceId: string;
    inStoreOffer: string;
    welcomeHeadline: string;
    tabletIdleTimeoutSec: number;
    updatedAt?: string | null;
}

export const DEFAULT_CHECKIN_CONFIG: CheckinConfig = {
    checkInEnabled: true,
    publicFlowEnabled: true,
    gmapsPlaceId: '',
    inStoreOffer: '1¢ pre-roll exchange — trade one detail for a staff-honored in-store offer',
    welcomeHeadline: 'Check in faster. Give your budtender a better head start.',
    tabletIdleTimeoutSec: 20,
    updatedAt: null,
};

const checkinConfigSchema = z.object({
    checkInEnabled: z.boolean(),
    publicFlowEnabled: z.boolean(),
    gmapsPlaceId: z.string().max(200),
    inStoreOffer: z.string().max(300),
    welcomeHeadline: z.string().max(200),
    tabletIdleTimeoutSec: z.number().int().min(5).max(120),
});

export interface MoodCount {
    mood: string;
    count: number;
}

export interface CheckinStats {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    todayNew: number;
    todayReturning: number;
    smsConsentRate: number;   // 0–100
    emailConsentRate: number; // 0–100
    reviewPendingCount: number;
    topMood: string | null;
    moodBreakdown: MoodCount[];
    periodLabel: string;
}

export interface CheckinVisitRow {
    visitId: string;
    firstName: string;
    phoneLast4: string;
    visitedAt: string;
    source: string;
    isReturning: boolean;
    mood: string | null;
    smsConsent: boolean;
    emailConsent: boolean;
    reviewStatus: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function configDocPath(orgId: string) {
    return `tenants/${orgId}/settings/checkinConfig`;
}

function daysBefore(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

function todayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// ── Config actions ─────────────────────────────────────────────────────────

export async function getCheckinConfig(orgId: string): Promise<{ success: boolean; config: CheckinConfig; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.doc(configDocPath(orgId)).get();
        if (!snap.exists) {
            return { success: true, config: DEFAULT_CHECKIN_CONFIG };
        }
        const data = snap.data() ?? {};
        const config: CheckinConfig = {
            checkInEnabled: data.checkInEnabled ?? DEFAULT_CHECKIN_CONFIG.checkInEnabled,
            publicFlowEnabled: data.publicFlowEnabled ?? DEFAULT_CHECKIN_CONFIG.publicFlowEnabled,
            gmapsPlaceId: data.gmapsPlaceId ?? DEFAULT_CHECKIN_CONFIG.gmapsPlaceId,
            inStoreOffer: data.inStoreOffer ?? DEFAULT_CHECKIN_CONFIG.inStoreOffer,
            welcomeHeadline: data.welcomeHeadline ?? DEFAULT_CHECKIN_CONFIG.welcomeHeadline,
            tabletIdleTimeoutSec: data.tabletIdleTimeoutSec ?? DEFAULT_CHECKIN_CONFIG.tabletIdleTimeoutSec,
            updatedAt: firestoreTimestampToDate(data.updatedAt)?.toISOString() ?? null,
        };
        return { success: true, config };
    } catch (error) {
        logger.error('[CheckinConfig] Failed to load config', { orgId, error: String(error) });
        return { success: false, config: DEFAULT_CHECKIN_CONFIG, error: 'Failed to load config' };
    }
}

export async function saveCheckinConfig(orgId: string, updates: Partial<CheckinConfig>): Promise<{ success: boolean; error?: string }> {
    const user = await requireUser([]);
    if (!user || (user.orgId !== orgId && user.role !== 'super_user')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const validated = checkinConfigSchema.partial().parse(updates);
        const db = getAdminFirestore();
        await db.doc(configDocPath(orgId)).set(
            { ...validated, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
        );
        logger.info('[CheckinConfig] Saved config', { orgId, fields: Object.keys(validated) });
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0]?.message || 'Invalid config' };
        }
        logger.error('[CheckinConfig] Failed to save config', { orgId, error: String(error) });
        return { success: false, error: 'Failed to save config' };
    }
}

// ── Stats action ───────────────────────────────────────────────────────────

export async function getCheckinStats(orgId: string): Promise<{ success: boolean; stats?: CheckinStats; error?: string }> {
    try {
        const db = getAdminFirestore();
        const col = db.collection('checkin_visits');

        const [todaySnap, weekSnap, monthSnap, reviewSnap] = await Promise.all([
            col.where('orgId', '==', orgId).where('visitedAt', '>=', todayStart()).get(),
            col.where('orgId', '==', orgId).where('visitedAt', '>=', daysBefore(7)).get(),
            col.where('orgId', '==', orgId).where('visitedAt', '>=', daysBefore(30)).count().get(),
            col.where('orgId', '==', orgId).where('reviewSequence.status', '==', 'pending').count().get(),
        ]);

        const todayDocs = todaySnap.docs.map(d => d.data());
        const weekDocs = weekSnap.docs.map(d => d.data());

        // new vs returning (today) — uses isReturning field written at capture time
        let todayNew = 0;
        let todayReturning = 0;
        let smsTotal = 0;
        let emailTotal = 0;
        for (const doc of todayDocs) {
            if (doc.isReturning) todayReturning++; else todayNew++;
            if (doc.smsConsent) smsTotal++;
            if (doc.emailConsent) emailTotal++;
        }

        const todayCount = todayDocs.length;
        const smsConsentRate = todayCount > 0 ? Math.round((smsTotal / todayCount) * 100) : 0;
        const emailConsentRate = todayCount > 0 ? Math.round((emailTotal / todayCount) * 100) : 0;

        // Mood breakdown from this week
        const moodMap = new Map<string, number>();
        for (const doc of weekDocs) {
            if (doc.mood) {
                moodMap.set(doc.mood, (moodMap.get(doc.mood) ?? 0) + 1);
            }
        }
        const moodBreakdown: MoodCount[] = Array.from(moodMap.entries())
            .map(([mood, count]) => ({ mood, count }))
            .sort((a, b) => b.count - a.count);
        const topMood = moodBreakdown[0]?.mood ?? null;

        const now = new Date();
        const periodLabel = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} update`;

        return {
            success: true,
            stats: {
                todayCount,
                weekCount: weekDocs.length,
                monthCount: monthSnap.data().count,
                todayNew,
                todayReturning,
                smsConsentRate,
                emailConsentRate,
                reviewPendingCount: reviewSnap.data().count,
                topMood,
                moodBreakdown,
                periodLabel,
            },
        };
    } catch (error) {
        logger.error('[CheckinStats] Failed to load stats', { orgId, error: String(error) });
        return { success: false, error: 'Failed to load stats' };
    }
}

// ── Visit feed action ──────────────────────────────────────────────────────

export async function getRecentCheckinVisits(orgId: string, limit = 25): Promise<{ success: boolean; visits?: CheckinVisitRow[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('checkin_visits')
            .where('orgId', '==', orgId)
            .orderBy('visitedAt', 'desc')
            .limit(limit)
            .get();

        const visits: CheckinVisitRow[] = snap.docs.map(doc => {
            const d = doc.data();
            const phone = typeof d.phone === 'string' ? d.phone : '';
            const phoneLast4 = phone.replace(/\D/g, '').slice(-4) || '????';
            const visitedAt = firestoreTimestampToDate(d.visitedAt)?.toISOString() ?? new Date().toISOString();
            return {
                visitId: doc.id,
                firstName: d.firstName ?? 'Unknown',
                phoneLast4,
                visitedAt,
                source: d.source ?? 'unknown',
                isReturning: d.isReturning ?? false,
                mood: d.mood ?? null,
                smsConsent: Boolean(d.smsConsent),
                emailConsent: Boolean(d.emailConsent),
                reviewStatus: d.reviewSequence?.status ?? 'unknown',
            };
        });

        return { success: true, visits };
    } catch (error) {
        logger.error('[CheckinVisits] Failed to load visits', { orgId, error: String(error) });
        return { success: false, error: 'Failed to load visits' };
    }
}

// ── Inbox briefing ─────────────────────────────────────────────────────────

export interface CheckinBriefingData {
    orgId: string;
    periodLabel: string;
    generatedAt: string;
    todayCount: number;
    weekCount: number;
    monthCount: number;
    todayNew: number;
    todayReturning: number;
    smsConsentRate: number;
    emailConsentRate: number;
    reviewPendingCount: number;
    topMood: string | null;
    moodBreakdown: MoodCount[];
    insight: string;
}

// ── Public brand logo ──────────────────────────────────────────────────────

/**
 * Returns just the logo URL for a given org — no auth required.
 * Used by the public loyalty tablet page.
 */
export async function getPublicBrandLogo(orgId: string): Promise<{ logoUrl: string | null }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('brandGuides').doc(orgId).get();
        if (!snap.exists) return { logoUrl: null };
        const data = snap.data() ?? {};
        const logoUrl: string | null =
            data.visualIdentity?.logo?.primary ||
            data.visualIdentity?.logo?.wordmark ||
            data.logo?.primary ||
            null;
        return { logoUrl };
    } catch {
        return { logoUrl: null };
    }
}

export async function postCheckinBriefingToInbox(orgId: string): Promise<{ success: boolean; artifactId?: string; error?: string }> {
    const statsResult = await getCheckinStats(orgId);
    if (!statsResult.success || !statsResult.stats) {
        return { success: false, error: statsResult.error ?? 'Failed to compute stats' };
    }

    const stats = statsResult.stats;
    const db = getAdminFirestore();
    const THREADS = 'inbox_threads';
    const ARTIFACTS = 'inbox_artifacts';

    // Find or create the Daily Briefing thread (singleton per org)
    let threadId: string;
    const existing = await db
        .collection(THREADS)
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    if (!existing.empty) {
        threadId = existing.docs[0].id;
    } else {
        threadId = createInboxThreadId();
        await db.collection(THREADS).doc(threadId).set({
            id: threadId,
            orgId,
            userId: 'system',
            type: 'analytics',
            status: 'active',
            title: '📊 Daily Briefing',
            preview: 'Proactive daily analytics briefing',
            primaryAgent: 'pops',
            assignedAgents: ['pops'],
            artifactIds: [],
            messages: [],
            metadata: { isBriefingThread: true },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    // Build insight line
    const insight = buildInsight(stats);

    const data: CheckinBriefingData = {
        orgId,
        periodLabel: stats.periodLabel,
        generatedAt: new Date().toISOString(),
        todayCount: stats.todayCount,
        weekCount: stats.weekCount,
        monthCount: stats.monthCount,
        todayNew: stats.todayNew,
        todayReturning: stats.todayReturning,
        smsConsentRate: stats.smsConsentRate,
        emailConsentRate: stats.emailConsentRate,
        reviewPendingCount: stats.reviewPendingCount,
        topMood: stats.topMood,
        moodBreakdown: stats.moodBreakdown,
        insight,
    };

    const artifactId = createInboxArtifactId();
    await db.collection(ARTIFACTS).doc(artifactId).set({
        id: artifactId,
        threadId,
        orgId,
        type: 'checkin_briefing',
        status: 'approved',
        data,
        rationale: `Check-in briefing — ${stats.todayCount} today, ${stats.weekCount} this week`,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(THREADS).doc(threadId).update({
        artifactIds: FieldValue.arrayUnion(artifactId),
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preview: `Check-in update — ${stats.todayCount} today, ${stats.smsConsentRate}% SMS opt-in`,
    });

    logger.info('[CheckinBriefing] Posted to inbox', { orgId, artifactId, todayCount: stats.todayCount });
    return { success: true, artifactId };
}

function buildInsight(stats: CheckinStats): string {
    const parts: string[] = [];

    if (stats.todayCount === 0) {
        parts.push('No check-ins yet today.');
    } else {
        parts.push(`${stats.todayCount} check-in${stats.todayCount !== 1 ? 's' : ''} today`);
        if (stats.todayNew > 0) parts.push(`${stats.todayNew} new`);
        if (stats.todayReturning > 0) parts.push(`${stats.todayReturning} returning`);
    }

    if (stats.smsConsentRate >= 60) {
        parts.push(`Strong SMS opt-in rate (${stats.smsConsentRate}%).`);
    } else if (stats.smsConsentRate > 0) {
        parts.push(`SMS opt-in at ${stats.smsConsentRate}% — room to improve with offer framing.`);
    }

    if (stats.reviewPendingCount > 0) {
        parts.push(`${stats.reviewPendingCount} customer${stats.reviewPendingCount !== 1 ? 's' : ''} in review sequence.`);
    }

    if (stats.topMood) {
        parts.push(`Top mood this week: ${stats.topMood}.`);
    }

    return parts.join(' ');
}
