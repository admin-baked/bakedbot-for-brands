'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { productConverter, type Product } from '@/firebase/converters';

export interface AmbassadorProduct {
    id: string;
    name: string;
    imageUrl: string;
    category?: string;
}

export async function getAmbassadorProducts(brandId: string): Promise<AmbassadorProduct[]> {
    const { firestore } = await createServerClient();

    // Only fetch active products
    const productsQuery = firestore.collection('products')
        .where('brandId', '==', brandId)
        .where('active', '==', true)
        .orderBy('name', 'asc');

    const snap = await productsQuery.get();

    // If no real products, return some mocks for the demo if synthetic data isn't enough
    if (snap.empty) {
        return [
            { id: 'mock-1', name: 'Blue Dream Preroll', imageUrl: '', category: 'Flower' },
            { id: 'mock-2', name: 'Cosmic Gummies', imageUrl: '', category: 'Edibles' },
            { id: 'mock-3', name: 'Relax Tincture', imageUrl: '', category: 'Tinctures' },
        ];
    }

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            imageUrl: data.imageUrl || '',
            category: data.category
        };
    });
}

export async function generateAmbassadorLink(productId: string): Promise<string> {
    const user = await requireUser();
    // In a real app, we might create a shortlink or a tracking record in DB
    // For now, we return the direct URL with ref params
    // Base URL should be dynamic in prod, using localhost for dev default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/find/${productId}?ref=${user.uid}`;
}
