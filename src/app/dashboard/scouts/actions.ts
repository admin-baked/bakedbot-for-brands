'use server';

/**
 * Scout Server Actions - API for Scout UI
 * 
 * Provides actions for creating, managing, and running scouts from UI.
 */

import { requireUser } from '@/server/auth/auth';
import { 
    createScout, 
    getScouts, 
    deleteScout, 
    runScout,
    Scout
} from '@/server/services/scouts/scout-service';

export interface CreateScoutInput {
    query: string;
    frequency?: 'hourly' | 'daily' | 'weekly';
    targetUrls?: string[];
    notifyEmail?: string;
    notifications?: {
        email?: boolean;
        inApp?: boolean;
        push?: boolean;
        sms?: boolean;
    };
}

export async function createScoutAction(input: CreateScoutInput) {
    const user = await requireUser();
    const tenantId = user.tenantId || user.orgId || user.uid;
    
    const scout = await createScout(tenantId, user.uid, input.query, {
        frequency: input.frequency,
        targetUrls: input.targetUrls,
        notifyEmail: input.notifyEmail || user.email,
        notifications: input.notifications,
    });
    
    return { success: true, scout };
}

export async function getScoutsAction() {
    const user = await requireUser();
    const tenantId = user.tenantId || user.orgId || user.uid;
    
    const scouts = await getScouts(tenantId, user.uid);
    return { success: true, scouts };
}

export async function deleteScoutAction(scoutId: string) {
    const user = await requireUser();
    const tenantId = user.tenantId || user.orgId || user.uid;
    
    await deleteScout(tenantId, scoutId);
    return { success: true };
}

export async function runScoutNowAction(scoutId: string) {
    const user = await requireUser();
    const tenantId = user.tenantId || user.orgId || user.uid;
    
    // Fetch the scout first
    const scouts = await getScouts(tenantId, user.uid);
    const scout = scouts.find(s => s.id === scoutId);
    
    if (!scout) {
        return { success: false, error: 'Scout not found' };
    }
    
    const result = await runScout(scout);
    return { success: true, result };
}
