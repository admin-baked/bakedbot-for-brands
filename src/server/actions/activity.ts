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
        uid?: string;
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.uid || null;
}

function getUserUid(user: unknown): string {
    if (typeof user === 'string') return user;
    if (user && typeof user === 'object' && 'uid' in user && typeof (user as { uid?: unknown }).uid === 'string') {
        return (user as { uid: string }).uid;
    }
    throw new Error('Unauthorized');
}

export async function getRecentActivity(orgId: string): Promise<ActivityEvent[]> {
    const user = await requireUser();
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    const isSuperUser = isSuperRole(role);
    const actorOrgId = getActorOrgId(user);
    if (!isSuperUser && actorOrgId && orgId !== actorOrgId) {
        throw new Error('Unauthorized');
    }

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
    const user = await requireUser();
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    const isSuperUser = isSuperRole(role);
    const actorOrgId = getActorOrgId(user);
    if (!isSuperUser && actorOrgId && orgId !== actorOrgId) {
        throw new Error('Unauthorized');
    }

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
    const user = await requireUser();
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    const isSuperUser = isSuperRole(role);
    const actorOrgId = getActorOrgId(user);
    if (!isSuperUser && actorOrgId && orgId !== actorOrgId) {
        throw new Error('Unauthorized');
    }

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
