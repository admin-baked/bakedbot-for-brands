'use server';

import { createServerClient } from '@/firebase/server-client';
import type { WidgetInstance, UserRole } from '@/lib/dashboard/widget-registry';
import { LAYOUT_VERSION } from '@/lib/dashboard/widget-registry';

/**
 * Save dashboard layout for a specific role
 */
export async function saveDashboardLayout(role: UserRole, widgets: WidgetInstance[]) {
    try {
        const { firestore, auth } = await createServerClient();
        const user = auth.currentUser;

        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const layoutId = `${user.uid}_${role}`;

        await firestore.collection('dashboard_layouts').doc(layoutId).set({
            role,
            widgets,
            userId: user.uid,
            version: LAYOUT_VERSION,
            updatedAt: new Date()
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to save dashboard layout:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * Get dashboard layout for a specific role
 */
export async function getDashboardLayout(role: UserRole) {
    try {
        const { firestore, auth } = await createServerClient();
        const user = auth.currentUser;

        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const layoutId = `${user.uid}_${role}`;
        const doc = await firestore.collection('dashboard_layouts').doc(layoutId).get();

        if (!doc.exists) {
            return { success: true, layout: null }; // No layout saved yet
        }

        const data = doc.data();

        // Basic version check
        if (data?.version !== LAYOUT_VERSION) {
            return { success: true, layout: null }; // Reset if version mismatch
        }

        return { success: true, layout: data.widgets as WidgetInstance[] };
    } catch (error) {
        console.error('Failed to get dashboard layout:', error);
        return { success: false, error: 'Internal server error' };
    }
}
