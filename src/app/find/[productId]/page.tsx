import { createServerClient } from '@/firebase/server-client';
import { notFound } from 'next/navigation';
import ProductFinderClient from './page-client';
import type { Product } from '@/firebase/converters';

interface PageProps {
    params: {
        productId: string;
    }
}
// This page is public/unauthed
export default async function ProductFinderPage({ params }: PageProps) {
    const { firestore } = await createServerClient();

    // Check for synthetic/mock ID first (for demo purposes)
    if (params.productId.startsWith('mock-')) {
        // Return mock data for demo
        const mockProduct: Product & { id: string } = {
            id: params.productId,
            name: params.productId === 'mock-1' ? 'Blue Dream Preroll' : 'Cosmic Gummies',
            description: 'A premium cannabis experience.',
            category: 'Flower',
            brandId: 'demo-brand',
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
            price: 15,
            active: true,
            imageUrl: '',
            variants: []
        } as unknown as Product & { id: string };
        return <ProductFinderClient product={mockProduct} />;
    }

    const doc = await firestore.collection('products').doc(params.productId).get();

    if (!doc.exists) {
        return notFound();
    }

    const product = { id: doc.id, ...doc.data() } as Product & { id: string };

    return <ProductFinderClient product={product} />;
}
