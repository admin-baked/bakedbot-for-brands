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

    let posConfig: any = {};

    try {
        // Resolve location from claims or user profile to get POS config
        const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;
        let locationData: any = null;

        // Try locationId as document ID
        if (user.locationId) {
            const locDoc = await firestore.collection('locations').doc(user.locationId).get();
            if (locDoc.exists) locationData = locDoc.data();
        }

        // Fallback: query by orgId
        if (!locationData && orgId) {
            let locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get();
            if (locSnap.empty) {
                locSnap = await firestore.collection('locations').where('brandId', '==', orgId).limit(1).get();
            }
            if (!locSnap.empty) locationData = locSnap.docs[0].data();
        }

        // Fallback: check user Firestore profile for orgId
        if (!locationData) {
            const userDoc = await firestore.collection('users').doc(user.uid).get();
            const profileOrgId = userDoc.data()?.orgId || userDoc.data()?.currentOrgId || userDoc.data()?.dispensaryId;
            if (profileOrgId) {
                let locSnap = await firestore.collection('locations').where('orgId', '==', profileOrgId).limit(1).get();
                if (locSnap.empty) {
                    locSnap = await firestore.collection('locations').where('brandId', '==', profileOrgId).limit(1).get();
                }
                if (!locSnap.empty) locationData = locSnap.docs[0].data();
            }
        }

        posConfig = locationData?.posConfig || {};
    } catch (error) {
        console.error('Error fetching POS config:', error);
    }

    const provider = posConfig.provider;
    const isActive = posConfig.status === 'active';

    return [
        {
            id: 'alleaves',
            name: 'Alleaves POS',
            description: 'Sync inventory and orders with Alleaves.',
            category: 'pos',
            icon: 'Store',
            installed: provider === 'alleaves' && isActive,
            configUrl: '/dashboard/admin/pos-config',
            status: provider === 'alleaves' && isActive ? 'active' : 'inactive'
        },
        {
            id: 'dutchie',
            name: 'Dutchie POS',
            description: 'Sync your inventory and orders with Dutchie.',
            category: 'pos',
            icon: 'Store',
            installed: provider === 'dutchie' && isActive,
            configUrl: '/dashboard/apps/dutchie',
            status: provider === 'dutchie' && isActive ? 'active' : 'inactive'
        },
        {
            id: 'jane',
            name: 'iHeartJane',
            description: 'Connect to the Jane marketplace ecosystem.',
            category: 'pos',
            icon: 'Heart',
            installed: provider === 'jane' && isActive,
            configUrl: '/dashboard/apps/jane',
            status: provider === 'jane' && isActive ? 'active' : 'inactive'
        },
        {
            id: 'klaviyo',
            name: 'Klaviyo',
            description: 'Email marketing automation.',
            category: 'marketing',
            icon: 'Mail',
            installed: false,
            status: 'inactive'
        },
        {
            id: 'metrc',
            name: 'Metrc',
            description: 'Compliance tracking.',
            category: 'compliance',
            icon: 'FileCheck',
            installed: false,
            status: 'inactive'
        }
    ];
}
