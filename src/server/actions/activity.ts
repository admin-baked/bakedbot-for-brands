'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { ActivityEvent, UsageSummary } from '@/types/events';
import { FieldValue } from 'firebase-admin/firestore';

export async function getRecentActivity(orgId: string): Promise<ActivityEvent[]> {
    await requireUser();
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
    await requireUser();
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
    // Internal usage, doesn't need auth check if called by other server actions
    const { firestore } = await createServerClient();

    await firestore.collection('organizations').doc(orgId).collection('activity_feed').add({
        orgId,
        userId,
        userName,
        type,
        description,
        createdAt: FieldValue.serverTimestamp()
    });
}
