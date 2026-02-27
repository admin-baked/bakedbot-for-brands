'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { ActivityEvent, UsageSummary } from '@/types/events';
import { FieldValue } from 'firebase-admin/firestore';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        dispensaryId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.dispensaryId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function getUserUid(user: unknown): string {
    if (typeof user === 'string') return user;
    if (user && typeof user === 'object' && 'uid' in user && typeof (user as { uid?: unknown }).uid === 'string') {
        return (user as { uid: string }).uid;
    }
    throw new Error('Unauthorized');
}

function validateOrgId(orgId: string): void {
    if (!orgId || orgId.includes('/')) {
        throw new Error('Invalid orgId');
    }
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

export async function getRecentActivity(orgId: string): Promise<ActivityEvent[]> {
    validateOrgId(orgId);
    const user = await requireUser();
    assertOrgAccess(user, orgId);

    const { firestore } = await createServerClient();

    // In real app, complex queries might need indexes
    const snap = await firestore.collection('organizations').doc(orgId).collection('activity_feed')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as ActivityEvent));
}

export async function getUsageStats(orgId: string): Promise<UsageSummary> {
    validateOrgId(orgId);
    const user = await requireUser();
    assertOrgAccess(user, orgId);

    const { firestore } = await createServerClient();
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    const snap = await firestore.collection('organizations').doc(orgId).collection('usage').doc(period).get();
    const data = snap.data() || {};

    return {
        messages: data.messages || 0,
        recommendations: data.recommendations || 0,
        apiCalls: data.api_calls || 0,
        limitMessages: 1000 // Hardcoded limit for demo
    };
}

export async function logActivity(orgId: string, userId: string, userName: string, type: string, description: string) {
    validateOrgId(orgId);
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    const isSuperUser = isSuperRole(role);

    const actorUid = getUserUid(user);
    const { firestore } = await createServerClient();

    await firestore.collection('organizations').doc(orgId).collection('activity_feed').add({
        orgId,
        userId: isSuperUser ? userId : actorUid,
        userName,
        type,
        description,
        createdAt: FieldValue.serverTimestamp()
    });
}
