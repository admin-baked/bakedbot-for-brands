'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { Timestamp } from 'firebase-admin/firestore';

export interface Lead {
    id: string;
    email: string;
    brandId: string;
    source: string;
    createdAt: Date;
    status: 'new' | 'contacted' | 'converted';
}

export async function captureLead(brandId: string, email: string, source: string = 'web') {
    const { firestore } = await createServerClient();

    // Basic validation
    if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
    }

    const leadData = {
        email,
        brandId,
        source,
        createdAt: new Date(),
        status: 'new'
    };

    await firestore.collection('leads').add(leadData);
    return { success: true };
}

export async function getLeads(brandId: string): Promise<Lead[]> {
    const user = await requireUser(['brand', 'owner']);
    // Ensure user accesses their own brand data (unless owner/admin logic overrides)
    const targetBrandId = user.brandId || brandId;

    const { firestore } = await createServerClient();

    const snap = await firestore.collection('leads')
        .where('brandId', '==', targetBrandId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

    if (snap.empty) {
        return [];
    }

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            email: data.email,
            brandId: data.brandId,
            source: data.source,
            createdAt: (data.createdAt as Timestamp).toDate(),
            status: data.status as Lead['status']
        };
    });
}
