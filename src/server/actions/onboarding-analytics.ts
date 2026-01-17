'use server';

/**
 * Onboarding Analytics Events
 * 
 * Tracks the onboarding funnel for Pops analytics.
 * Events follow naming convention: onboarding_*
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

type OnboardingEventType = 
    | 'onboarding_start'
    | 'role_selected'
    | 'auth_success'
    | 'claim_search'
    | 'claim_success'
    | 'create_new_entity'
    | 'onboarding_complete'
    | 'checklist_item_completed'
    | 'onboarding_abandon'
    | 'claim_no_results'
    | 'claim_already_claimed'
    | 'permission_denied_superuser';

interface OnboardingEventData {
    eventType: OnboardingEventType;
    userId?: string;
    role?: 'brand' | 'dispensary' | 'customer' | 'super_user';
    entryPoint?: string;
    provider?: 'google' | 'email';
    queryType?: 'name' | 'domain';
    entityType?: 'brand' | 'dispensary';
    entityId?: string;
    timeToValueSeconds?: number;
    itemId?: string;
    lastStepId?: string;
    sessionId?: string;
    timestamp?: Date;
}

/**
 * Logs an onboarding event to Firestore for Pops analytics
 */
export async function trackOnboardingEvent(data: OnboardingEventData): Promise<void> {
    try {
        const db = getAdminFirestore();
        const eventDoc = {
            ...data,
            timestamp: FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        await db.collection('analytics_events').add(eventDoc);
    } catch (error) {
        console.error('[Onboarding Analytics] Failed to track event:', error);
        // Don't throw - analytics failures shouldn't break onboarding
    }
}

/**
 * Convenience functions for common events
 */
export async function trackOnboardingStart(userId: string, role: string, entryPoint: string) {
    return trackOnboardingEvent({
        eventType: 'onboarding_start',
        userId,
        role: role as OnboardingEventData['role'],
        entryPoint
    });
}

export async function trackRoleSelected(userId: string | undefined, role: string) {
    return trackOnboardingEvent({
        eventType: 'role_selected',
        userId,
        role: role as OnboardingEventData['role']
    });
}

export async function trackAuthSuccess(userId: string, provider: 'google' | 'email') {
    return trackOnboardingEvent({
        eventType: 'auth_success',
        userId,
        provider
    });
}

export async function trackClaimSuccess(userId: string, entityType: 'brand' | 'dispensary', entityId: string) {
    return trackOnboardingEvent({
        eventType: 'claim_success',
        userId,
        entityType,
        entityId
    });
}

export async function trackOnboardingComplete(userId: string, role: string, timeToValueSeconds: number) {
    return trackOnboardingEvent({
        eventType: 'onboarding_complete',
        userId,
        role: role as OnboardingEventData['role'],
        timeToValueSeconds
    });
}

export async function trackChecklistItemCompleted(userId: string, itemId: string) {
    return trackOnboardingEvent({
        eventType: 'checklist_item_completed',
        userId,
        itemId
    });
}
