'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export interface AppDefinition {
    id: string;
    name: string;
    description: string;
    category: 'pos' | 'marketing' | 'compliance' | 'utility';
    icon: string;
    installed: boolean;
    configUrl?: string;
    status?: 'active' | 'inactive' | 'error';
}

export async function getApps(): Promise<AppDefinition[]> {
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // In a real system, we'd fetch from a 'marketplace_apps' collection
    // and join with 'dispensaries/{id}/installed_apps'.

    // For now, we return our static supported list, checking the dispensary config for installation status.

    let posConfig: any = {};

    try {
        // Only try to fetch dispensary config if user is a dispensary role
        if (user.role === 'dispensary') {
            const doc = await firestore.collection('dispensaries').doc(user.uid).get();
            const data = doc.data() || {};
            posConfig = data.posConfig || {};
        }
    } catch (error) {
        console.error('Error fetching dispensary config:', error);
        // Continue with empty posConfig
    }

    return [
        {
            id: 'dutchie',
            name: 'Dutchie POS',
            description: 'Sync your inventory and orders with Dutchie.',
            category: 'pos',
            icon: 'Store',
            installed: posConfig.provider === 'dutchie',
            configUrl: '/dashboard/apps/dutchie',
            status: posConfig.provider === 'dutchie' ? 'active' : 'inactive'
        },
        {
            id: 'jane',
            name: 'iHeartJane',
            description: 'Connect to the Jane marketplace ecosystem.',
            category: 'pos',
            icon: 'Heart',
            installed: posConfig.provider === 'jane',
            configUrl: '/dashboard/apps/jane',
            status: posConfig.provider === 'jane' ? 'active' : 'inactive'
        },
        {
            id: 'klaviyo',
            name: 'Klaviyo',
            description: 'Email marketing automation (Coming Soon).',
            category: 'marketing',
            icon: 'Mail',
            installed: false
        },
        {
            id: 'metrc',
            name: 'Metrc',
            description: 'Compliance tracking (Coming Soon).',
            category: 'compliance',
            icon: 'FileCheck',
            installed: false
        }
    ];
}
