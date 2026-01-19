'use server';

/**
 * Scheduler Tool
 * 
 * Allows agents to create, list, and delete recurring tasks.
 * Stores schedules in Firestore 'schedules' collection.
 * Note: Actual execution requires an external ticker.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export type ScheduleAction = 'create' | 'list' | 'delete';

export interface ScheduleParams {
    action: ScheduleAction;
    scheduleId?: string;
    cron?: string;     // e.g. "0 9 * * *"
    task?: string;     // e.g. "Check competitor prices"
    agentId?: string;  // e.g. "smokey"
    enabled?: boolean;
}

export interface ScheduleResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface ScheduleDoc {
    id: string;
    cron: string;
    task: string;
    agentId?: string;
    enabled: boolean;
    createdAt: any;
}

export async function scheduleTask(params: ScheduleParams): Promise<ScheduleResult> {
    const db = getAdminFirestore();
    const collection = db.collection('schedules');

    try {
        switch (params.action) {
            case 'create':
                if (!params.cron || !params.task) {
                    return { success: false, error: 'Missing cron or task for creation' };
                }
                const docRef = await collection.add({
                    cron: params.cron,
                    task: params.task,
                    agentId: params.agentId || 'general',
                    enabled: params.enabled ?? true,
                    params: params.params || {}, // Save the params!
                    createdAt: FieldValue.serverTimestamp(),
                });
                return {
                    success: true,
                    data: { id: docRef.id, message: `Scheduled: "${params.task}" (${params.cron})` }
                };

            case 'list':
                const snapshot = await collection.orderBy('createdAt', 'desc').get();
                const schedules = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ScheduleDoc[];

                return { success: true, data: schedules };

            case 'delete':
                if (!params.scheduleId) {
                    return { success: false, error: 'Missing scheduleId for deletion' };
                }
                await collection.doc(params.scheduleId).delete();
                return { success: true, data: { message: `Deleted schedule ${params.scheduleId}` } };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[scheduleTask] Error:', error);
        return { success: false, error: error.message };
    }
}
